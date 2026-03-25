import { type ChangeEvent, type FormEvent, type ReactNode, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Shield, Trash2, User as UserIcon } from 'lucide-react';

import { DataFilterField, DataToolbar } from '../../components/layout/DataToolbar';
import PageHeader from '../../components/layout/PageHeader';
import { PaginationControls } from '../../components/layout/PaginationControls';
import { SortableTableHeader } from '../../components/layout/SortableTableHeader';
import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDateTime, formatRoleLabel, humanizeEnum } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import { compareSortValues, getNextSortDirection, type SortDirection } from '../../lib/tableSort';
import type {
  ApiProject,
  ApiUser,
  AssignmentAuthority,
  BackendRole,
  BackendSupportLevel,
  BackendUserStatus,
  PaginatedResponse,
  ScopeMode,
} from '../../lib/types';

type UserFormPayload = {
  name: string;
  email: string;
  role: BackendRole;
  supportLevel?: BackendSupportLevel | null;
  scopeMode?: ScopeMode;
  assignmentAuthority?: AssignmentAuthority;
  projectIds?: number[];
  status: BackendUserStatus;
  password?: string;
};

type UserSortColumn = 'user' | 'profile' | 'scope' | 'status' | 'created';

const PAGE_SIZE = 10;
const supportLevelPresets: Record<BackendSupportLevel, { scopeMode: ScopeMode; assignmentAuthority: AssignmentAuthority }> = {
  SE1: { scopeMode: 'GLOBAL', assignmentAuthority: 'SELF_AND_OTHERS' },
  SE2: { scopeMode: 'GLOBAL', assignmentAuthority: 'SELF_ONLY' },
  SE3: { scopeMode: 'PROJECT_SCOPED', assignmentAuthority: 'SELF_ONLY' },
};

export default function UserManagement() {
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const { permissions, user: currentUser, refreshSession } = useRole();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | BackendRole>('ALL');
  const [supportLevelFilter, setSupportLevelFilter] = useState<'ALL' | BackendSupportLevel>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BackendUserStatus>('ALL');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<UserSortColumn>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const deferredSearch = useDeferredValue(search);
  const canManageUsers = permissions?.canManageUsers ?? false;

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, roleFilter, supportLevelFilter, statusFilter]);

  const usersQuery = useAsyncData(async () => {
    const searchParams = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (deferredSearch.trim()) searchParams.set('search', deferredSearch.trim());
    if (roleFilter !== 'ALL') searchParams.set('role', roleFilter);
    if (supportLevelFilter !== 'ALL') searchParams.set('supportLevel', supportLevelFilter);
    if (statusFilter !== 'ALL') searchParams.set('status', statusFilter);
    return apiFetch<PaginatedResponse<ApiUser>>(`/users?${searchParams.toString()}`);
  }, [page, deferredSearch, roleFilter, supportLevelFilter, statusFilter]);

  const visibleUsers = useMemo(() => {
    const users = [...(usersQuery.data?.items || [])];
    return users.sort((left, right) => {
      switch (sortColumn) {
        case 'user':
          return compareSortValues(`${left.name} ${left.displayId}`, `${right.name} ${right.displayId}`, sortDirection);
        case 'profile':
          return compareSortValues(formatRoleLabel(left.role, left.supportLevel), formatRoleLabel(right.role, right.supportLevel), sortDirection);
        case 'scope':
          return compareSortValues(
            `${left.scopeMode}-${left.assignmentAuthority}-${left.projectMemberships?.length || 0}`,
            `${right.scopeMode}-${right.assignmentAuthority}-${right.projectMemberships?.length || 0}`,
            sortDirection,
          );
        case 'status':
          return compareSortValues(left.status, right.status, sortDirection);
        case 'created':
        default:
          return compareSortValues(new Date(left.createdAt).getTime(), new Date(right.createdAt).getTime(), sortDirection);
      }
    });
  }, [sortColumn, sortDirection, usersQuery.data?.items]);

  const activeFilterCount = [roleFilter !== 'ALL', supportLevelFilter !== 'ALL', statusFilter !== 'ALL'].filter(Boolean).length;

  const handleSort = (column: UserSortColumn) => {
    const isActive = sortColumn === column;
    setSortColumn(column);
    setSortDirection(getNextSortDirection(isActive, sortDirection));
  };

  const handleCreate = async (payload: UserFormPayload) => {
    await apiFetch<ApiUser>('/users', { method: 'POST', body: payload });
    showToast('success', 'User created successfully.');
    usersQuery.reload();
  };

  const handleUpdate = async (targetUser: ApiUser, payload: UserFormPayload) => {
    await apiFetch<ApiUser>(`/users/${targetUser.id}`, { method: 'PATCH', body: payload });
    showToast('success', 'User updated successfully.');
    usersQuery.reload();
    if (currentUser?.id === targetUser.id) await refreshSession();
  };

  const handleDelete = async (targetUser: ApiUser) => {
    if (!window.confirm(`Delete ${targetUser.name}? This cannot be undone.`)) return;
    await apiFetch<void>(`/users/${targetUser.id}`, { method: 'DELETE' });
    showToast('success', 'User deleted successfully.');
    usersQuery.reload();
    if (currentUser?.id === targetUser.id) await refreshSession();
  };

  const openCreateModal = () =>
    openModal({
      title: 'Add User',
      size: 'xl',
      content: <UserFormPanel mode="create" onSubmit={async (payload) => { await handleCreate(payload); closeModal(); }} />,
    });

  const openEditModal = (targetUser: ApiUser) =>
    openModal({
      title: `Edit ${targetUser.name}`,
      size: 'xl',
      content: (
        <UserFormPanel
          mode="edit"
          user={targetUser}
          allowDelete={canManageUsers && currentUser?.id !== targetUser.id}
          onDelete={canManageUsers ? async () => { await handleDelete(targetUser); closeModal(); } : undefined}
          onSubmit={async (payload) => { await handleUpdate(targetUser, payload); closeModal(); }}
        />
      ),
    });

  if (usersQuery.isLoading) return <PageState title="Loading users" description="Pulling the current user directory from the backend." />;
  if (usersQuery.error || !usersQuery.data) return <ErrorState message={usersQuery.error || 'Unable to load users.'} onRetry={usersQuery.reload} />;

  const userPage = usersQuery.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <PageHeader
        title="Users"
        description="Manage PM and SE accounts, support levels, scope, assignment authority, and project membership."
        breadcrumbs={[
          { label: 'Administration', to: appPaths.admin.usersAccess },
          { label: 'Users & Access', to: appPaths.admin.usersAccess },
          { label: 'Users' },
        ]}
        actions={
          canManageUsers ? (
            <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700">
              <Plus className="h-4 w-4" />
              Add User
            </button>
          ) : undefined
        }
      />

      {!canManageUsers ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          This area is read-only for your account. Only Project Managers can create or edit users.
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <DataToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name, email, or user ID..."
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((current) => !current)}
            activeFilterCount={activeFilterCount}
            className="border-none shadow-none"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <DataFilterField label="Role">
                  <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'ALL' | BackendRole)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500">
                    <option value="ALL">All Roles</option>
                    <option value="PM">Project Manager</option>
                    <option value="SE">Support Engineer</option>
                  </select>
                </DataFilterField>
                <DataFilterField label="Support Level">
                  <select value={supportLevelFilter} onChange={(event) => setSupportLevelFilter(event.target.value as 'ALL' | BackendSupportLevel)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500">
                    <option value="ALL">All Levels</option>
                    <option value="SE1">SE1</option>
                    <option value="SE2">SE2</option>
                    <option value="SE3">SE3</option>
                  </select>
                </DataFilterField>
                <DataFilterField label="Status">
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | BackendUserStatus)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500">
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </DataFilterField>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => { setRoleFilter('ALL'); setSupportLevelFilter('ALL'); setStatusFilter('ALL'); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                  Clear Filters
                </button>
              </div>
            </div>
          </DataToolbar>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] whitespace-nowrap text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500"><SortableTableHeader label="User" active={sortColumn === 'user'} direction={sortDirection} onClick={() => handleSort('user')} /></th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500"><SortableTableHeader label="Access Profile" active={sortColumn === 'profile'} direction={sortDirection} onClick={() => handleSort('profile')} /></th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500"><SortableTableHeader label="Scope" active={sortColumn === 'scope'} direction={sortDirection} onClick={() => handleSort('scope')} /></th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500"><SortableTableHeader label="Status" active={sortColumn === 'status'} direction={sortDirection} onClick={() => handleSort('status')} /></th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500"><SortableTableHeader label="Created" active={sortColumn === 'created'} direction={sortDirection} onClick={() => handleSort('created')} /></th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">No users matched the current filters.</td></tr>
              ) : visibleUsers.map((listedUser) => {
                const membershipCount = listedUser.projectMemberships?.length || 0;
                return (
                  <tr key={listedUser.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                          {listedUser.name.split(' ').map((segment) => segment[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{listedUser.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{listedUser.displayId} - {listedUser.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        {listedUser.role === 'PM' ? <Shield className="h-4 w-4 text-purple-600" /> : <UserIcon className="h-4 w-4 text-slate-400" />}
                        <div>
                          <p className="font-medium">{formatRoleLabel(listedUser.role, listedUser.supportLevel)}</p>
                          <p className="mt-1 text-xs text-slate-500">{listedUser.role === 'PM' ? 'Admin access' : `${humanizeEnum(listedUser.assignmentAuthority)} assignment`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-700">{humanizeEnum(listedUser.scopeMode)}</p>
                        <p className="text-xs text-slate-500">
                          {listedUser.role === 'PM' ? 'All projects' : listedUser.scopeMode === 'PROJECT_SCOPED' ? `${membershipCount} linked project${membershipCount === 1 ? '' : 's'}` : 'All projects and clients'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-widest ${listedUser.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{listedUser.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(listedUser.createdAt)}</td>
                    <td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => openEditModal(listedUser)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" />{canManageUsers ? 'Edit' : 'View'}</button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationControls page={userPage.page} totalPages={userPage.totalPages} totalItems={userPage.total} itemLabel="users" pageSize={userPage.pageSize} onPageChange={setPage} />
      </div>
    </div>
  );
}

function UserFormPanel({
  mode,
  user,
  onSubmit,
  onDelete,
  allowDelete = false,
}: {
  mode: 'create' | 'edit';
  user?: ApiUser;
  onSubmit: (payload: UserFormPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  allowDelete?: boolean;
}) {
  const { closeModal } = useModal();
  const projectsQuery = useAsyncData(() => apiFetch<ApiProject[]>('/projects'), []);
  const [formState, setFormState] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: (user?.role || 'SE') as BackendRole,
    supportLevel: (user?.supportLevel || 'SE2') as BackendSupportLevel,
    scopeMode: (user?.scopeMode || 'GLOBAL') as ScopeMode,
    assignmentAuthority: (user?.assignmentAuthority || 'SELF_ONLY') as AssignmentAuthority,
    status: (user?.status || 'ACTIVE') as BackendUserStatus,
    password: '',
    projectIds: (user?.projectMemberships || []).map((membership) => membership.projectId),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTextField =
    (field: 'name' | 'email' | 'password') =>
    (event: ChangeEvent<HTMLInputElement>) =>
      setFormState((current) => ({
        ...current,
        [field]: event.target.value,
      }));

  const applySupportLevelPreset = (supportLevel: BackendSupportLevel) => {
    const preset = supportLevelPresets[supportLevel];
    setFormState((current) => ({
      ...current,
      supportLevel,
      scopeMode: preset.scopeMode,
      assignmentAuthority: preset.assignmentAuthority,
    }));
  };

  const updateRole = (event: ChangeEvent<HTMLSelectElement>) => {
    const role = event.target.value as BackendRole;
    setFormState((current) =>
      role === 'PM'
        ? {
            ...current,
            role,
            supportLevel: current.supportLevel,
            scopeMode: 'GLOBAL',
            assignmentAuthority: 'SELF_AND_OTHERS',
            projectIds: [],
          }
        : {
            ...current,
            role,
            scopeMode: supportLevelPresets[current.supportLevel].scopeMode,
            assignmentAuthority: supportLevelPresets[current.supportLevel].assignmentAuthority,
          },
    );
  };

  const updateSelectField =
    (field: 'status' | 'scopeMode' | 'assignmentAuthority') =>
    (event: ChangeEvent<HTMLSelectElement>) =>
      setFormState((current) => ({
        ...current,
        [field]: event.target.value,
      }));

  const toggleProject = (projectId: number) =>
    setFormState((current) => ({
      ...current,
      projectIds: current.projectIds.includes(projectId)
        ? current.projectIds.filter((currentProjectId) => currentProjectId !== projectId)
        : [...current.projectIds, projectId],
    }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === 'create' && formState.password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!formState.name.trim() || !formState.email.trim()) {
      setError('Name and email are required.');
      return;
    }

    if (formState.role === 'SE' && formState.scopeMode === 'PROJECT_SCOPED' && formState.projectIds.length === 0) {
      setError('Assign at least one project for project-scoped support engineers.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: UserFormPayload = {
        name: formState.name.trim(),
        email: formState.email.trim(),
        role: formState.role,
        supportLevel: formState.role === 'SE' ? formState.supportLevel : null,
        scopeMode: formState.role === 'SE' ? formState.scopeMode : 'GLOBAL',
        assignmentAuthority: formState.role === 'SE' ? formState.assignmentAuthority : 'SELF_AND_OTHERS',
        projectIds: formState.role === 'SE' ? formState.projectIds : [],
        status: formState.status,
      };

      if (formState.password.trim()) {
        payload.password = formState.password.trim();
      }

      await onSubmit(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save this user right now.');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsSubmitting(true);

    try {
      await onDelete();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this user right now.');
      setIsSubmitting(false);
    }
  };

  if (projectsQuery.isLoading) return <PageState title="Loading projects" description="Fetching project membership options." />;
  if (projectsQuery.error || !projectsQuery.data) return <ErrorState message={projectsQuery.error || 'Unable to load projects.'} onRetry={projectsQuery.reload} />;

  const showEngineerFields = formState.role === 'SE';
  const availableProjects = [...projectsQuery.data].sort((left, right) => `${left.client?.name || ''} ${left.name}`.localeCompare(`${right.client?.name || ''} ${right.name}`));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Full Name">
          <input type="text" value={formState.name} onChange={updateTextField('name')} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500" />
        </Field>
        <Field label="Email Address">
          <input type="email" value={formState.email} onChange={updateTextField('email')} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Base Role">
          <select value={formState.role} onChange={updateRole} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500">
            <option value="PM">Project Manager</option>
            <option value="SE">Support Engineer</option>
          </select>
        </Field>
        <Field label="Status">
          <select value={formState.status} onChange={updateSelectField('status')} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500">
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
        <Field label={mode === 'create' ? 'Password' : 'Reset Password (Optional)'}>
          <input type="password" value={formState.password} onChange={updateTextField('password')} placeholder={mode === 'create' ? 'At least 6 characters' : 'Leave blank to keep the current password'} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500" />
        </Field>
      </div>

      {showEngineerFields ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Support Level">
              <select value={formState.supportLevel} onChange={(event) => applySupportLevelPreset(event.target.value as BackendSupportLevel)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500">
                <option value="SE1">SE1</option>
                <option value="SE2">SE2</option>
                <option value="SE3">SE3</option>
              </select>
            </Field>
            <Field label="Scope Mode">
              <select value={formState.scopeMode} onChange={updateSelectField('scopeMode')} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500">
                <option value="GLOBAL">Global</option>
                <option value="PROJECT_SCOPED">Project Scoped</option>
              </select>
            </Field>
            <Field label="Assignment Authority">
              <select value={formState.assignmentAuthority} onChange={updateSelectField('assignmentAuthority')} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500">
                <option value="SELF_ONLY">Self Only</option>
                <option value="SELF_AND_OTHERS">Self And Others</option>
              </select>
            </Field>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Project Membership</p>
                <p className="mt-1 text-xs text-slate-500">Project-scoped engineers only see linked projects, clients, and tickets. Global engineers can still be linked for responsibility mapping.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{formState.projectIds.length} selected</span>
            </div>
            <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4">
              {availableProjects.length === 0 ? (
                <p className="text-sm text-slate-500">No projects available yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {availableProjects.map((project) => {
                    const checked = formState.projectIds.includes(project.id);
                    return (
                      <label key={project.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${checked ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleProject(project.id)} className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{project.name}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{project.client?.name || 'No client'} - {project.displayId}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          {allowDelete && onDelete ? (
            <button type="button" onClick={handleDelete} disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70">
              <Trash2 className="h-4 w-4" />
              Delete User
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300">
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function PageState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">User directory unavailable</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
        Retry
      </button>
    </div>
  );
}

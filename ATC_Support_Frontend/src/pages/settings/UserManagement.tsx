import { useDeferredValue, useEffect, useState } from 'react';
import { Pencil, Plus, Search, Shield, Trash2, User as UserIcon } from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import { PaginationControls } from '../../components/layout/PaginationControls';
import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDateTime, formatRoleLabel } from '../../lib/format';
import type { ApiUser, BackendRole, BackendUserStatus, PaginatedResponse } from '../../lib/types';

type UserFormPayload = {
  name: string;
  email: string;
  role: BackendRole;
  status: BackendUserStatus;
  password?: string;
};

const PAGE_SIZE = 10;

export default function UserManagement() {
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const { backendRole, user: currentUser, refreshSession } = useRole();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | BackendRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BackendUserStatus>('ALL');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, roleFilter, statusFilter]);

  const usersQuery = useAsyncData(async () => {
    const searchParams = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });

    if (deferredSearch.trim()) {
      searchParams.set('search', deferredSearch.trim());
    }

    if (roleFilter !== 'ALL') {
      searchParams.set('role', roleFilter);
    }

    if (statusFilter !== 'ALL') {
      searchParams.set('status', statusFilter);
    }

    return apiFetch<PaginatedResponse<ApiUser>>(`/users?${searchParams.toString()}`);
  }, [page, deferredSearch, roleFilter, statusFilter]);
  const canManageUsers = backendRole === 'PM';

  const handleCreate = async (payload: UserFormPayload) => {
    await apiFetch<ApiUser>('/users', {
      method: 'POST',
      body: payload,
    });

    showToast('success', 'User created successfully.');
    usersQuery.reload();
  };

  const handleUpdate = async (targetUser: ApiUser, payload: UserFormPayload) => {
    await apiFetch<ApiUser>(`/users/${targetUser.id}`, {
      method: 'PATCH',
      body: payload,
    });

    showToast('success', 'User updated successfully.');
    usersQuery.reload();

    if (currentUser?.id === targetUser.id) {
      await refreshSession();
    }
  };

  const handleDelete = async (targetUser: ApiUser) => {
    const shouldDelete = window.confirm(`Delete ${targetUser.name}? This cannot be undone.`);

    if (!shouldDelete) {
      return;
    }

    await apiFetch<void>(`/users/${targetUser.id}`, {
      method: 'DELETE',
    });

    showToast('success', 'User deleted successfully.');
    usersQuery.reload();

    if (currentUser?.id === targetUser.id) {
      await refreshSession();
    }
  };

  const openCreateModal = () => {
    openModal({
      title: 'Add User',
      size: 'lg',
      content: (
        <UserFormPanel
          mode="create"
          onSubmit={async (payload) => {
            await handleCreate(payload);
            closeModal();
          }}
        />
      ),
    });
  };

  const openEditModal = (targetUser: ApiUser) => {
    openModal({
      title: `Edit ${targetUser.name}`,
      size: 'lg',
      content: (
        <UserFormPanel
          mode="edit"
          user={targetUser}
          allowDelete={canManageUsers && currentUser?.id !== targetUser.id}
          onDelete={
            canManageUsers
              ? async () => {
                  await handleDelete(targetUser);
                  closeModal();
                }
              : undefined
          }
          onSubmit={async (payload) => {
            await handleUpdate(targetUser, payload);
            closeModal();
          }}
        />
      ),
    });
  };

  if (usersQuery.isLoading) {
    return <PageState title="Loading users" description="Pulling the current user directory from the backend." />;
  }

  if (usersQuery.error) {
    return <ErrorState message={usersQuery.error} onRetry={usersQuery.reload} />;
  }

  const userPage = usersQuery.data!;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <PageHeader
        title="Users"
        description="Live user directory with PM-only create, update, and delete controls."
        actions={
          <button
            onClick={openCreateModal}
            disabled={!canManageUsers}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        }
      />

      {!canManageUsers ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          This area is read-only for your account. Only Project Managers can create or edit users.
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr),180px,180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or user ID..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as 'ALL' | BackendRole)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="ALL">All Roles</option>
            <option value="PM">Project Manager</option>
            <option value="PL">Project Lead</option>
            <option value="SE">Support Engineer</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | BackendUserStatus)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">User</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Role</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Created</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userPage.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                    No users matched the current filters.
                  </td>
                </tr>
              ) : (
                userPage.items.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                          {user.name
                            .split(' ')
                            .map((segment) => segment[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {user.displayId} • {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        {user.role === 'PM' ? <Shield className="h-4 w-4 text-purple-600" /> : <UserIcon className="h-4 w-4 text-slate-400" />}
                        <span className="font-medium">{formatRoleLabel(user.role)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-widest ${
                          user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(user.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {canManageUsers ? 'Edit' : 'View'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={userPage.page}
          totalPages={userPage.totalPages}
          totalItems={userPage.total}
          itemLabel="users"
          pageSize={userPage.pageSize}
          onPageChange={setPage}
        />
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
  const [formState, setFormState] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: (user?.role || 'SE') as BackendRole,
    status: (user?.status || 'ACTIVE') as BackendUserStatus,
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField =
    (field: keyof typeof formState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setFormState((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
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

    setIsSubmitting(true);

    try {
      const payload: UserFormPayload = {
        name: formState.name.trim(),
        email: formState.email.trim(),
        role: formState.role,
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
    if (!onDelete) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onDelete();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this user right now.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Full Name">
          <input
            type="text"
            value={formState.name}
            onChange={updateField('name')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <Field label="Email Address">
          <input
            type="email"
            value={formState.email}
            onChange={updateField('email')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Role">
          <select
            value={formState.role}
            onChange={updateField('role')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="PM">Project Manager</option>
            <option value="PL">Project Lead</option>
            <option value="SE">Support Engineer</option>
          </select>
        </Field>
        <Field label="Status">
          <select
            value={formState.status}
            onChange={updateField('status')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
      </div>

      <Field label={mode === 'create' ? 'Password' : 'Reset Password (Optional)'}>
        <input
          type="password"
          value={formState.password}
          onChange={updateField('password')}
          placeholder={mode === 'create' ? 'At least 6 characters' : 'Leave blank to keep the current password'}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          {allowDelete && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Trash2 className="h-4 w-4" />
              Delete User
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create User' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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

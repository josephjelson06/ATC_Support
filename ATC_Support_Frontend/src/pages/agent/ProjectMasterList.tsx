import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, KeyRound, Plus, Ticket, UserRoundCog } from 'lucide-react';

import { ProjectCrudPanel } from '../../components/entities/ProjectCrudPanel';
import { DataFilterField, DataToolbar } from '../../components/layout/DataToolbar';
import PageHeader from '../../components/layout/PageHeader';
import { PaginationControls } from '../../components/layout/PaginationControls';
import { SortableTableHeader } from '../../components/layout/SortableTableHeader';
import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDate, humanizeEnum } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import { compareSortValues, getNextSortDirection } from '../../lib/tableSort';
import type { ApiProject, ApiTicket, PaginatedResponse, ProjectStatus } from '../../lib/types';

const PAGE_SIZE = 8;

export default function ProjectMasterList() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { role, permissions } = useRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProjectStatus>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<'project' | 'client' | 'specialist' | 'status' | 'openTickets' | 'created'>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(searchQuery);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, statusFilter]);

  const projectsQuery = useAsyncData(
    async () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });

      if (deferredSearch.trim()) {
        searchParams.set('search', deferredSearch.trim());
      }

      if (statusFilter !== 'ALL') {
        searchParams.set('status', statusFilter);
      }

      const [projects, tickets] = await Promise.all([
        apiFetch<PaginatedResponse<ApiProject>>(`/projects?${searchParams.toString()}`),
        apiFetch<ApiTicket[]>('/tickets'),
      ]);

      return { projects, tickets };
    },
    [page, deferredSearch, statusFilter],
  );

  const canManageProjects = permissions?.canManageProjects ?? false;
  const projectPage = projectsQuery.data?.projects;
  const tickets = projectsQuery.data?.tickets || [];
  const projectItems = projectPage?.items || [];
  const openTicketCountByProject = tickets.reduce<Record<number, number>>((counts, ticket) => {
    if (!ticket.projectId || ticket.status === 'RESOLVED') {
      return counts;
    }

    counts[ticket.projectId] = (counts[ticket.projectId] || 0) + 1;
    return counts;
  }, {});
  const visibleProjects = useMemo(() => {
    const items = [...projectItems];

    items.sort((left, right) => {
      switch (sortColumn) {
        case 'project':
          return compareSortValues(left.name, right.name, sortDirection);
        case 'client':
          return compareSortValues(left.client?.name || '', right.client?.name || '', sortDirection);
        case 'specialist':
          return compareSortValues(left.assignedTo?.name || '', right.assignedTo?.name || '', sortDirection);
        case 'status':
          return compareSortValues(left.status, right.status, sortDirection);
        case 'openTickets':
          return compareSortValues(openTicketCountByProject[left.id] || 0, openTicketCountByProject[right.id] || 0, sortDirection);
        case 'created':
          return compareSortValues(new Date(left.createdAt).getTime(), new Date(right.createdAt).getTime(), sortDirection);
      }
    });

    return items;
  }, [openTicketCountByProject, projectItems, sortColumn, sortDirection]);

  const openCreateModal = () => {
    openModal({
      title: 'Create Project',
      size: 'lg',
      content: (
        <ProjectCrudPanel
          mode="create"
          onCompleted={async (project) => {
            projectsQuery.reload();
            navigate(appPaths.projects.detail(project.id));
          }}
        />
      ),
    });
  };

  if (projectsQuery.isLoading) {
    return <ProjectsSkeleton />;
  }

  if (projectsQuery.error || !projectsQuery.data) {
    return <ProjectsError message={projectsQuery.error || 'Unable to load projects.'} onRetry={projectsQuery.reload} />;
  }

  const resolvedProjectPage = projectsQuery.data.projects;
  const activeProjectsOnPage = resolvedProjectPage.items.filter((project) => project.status === 'ACTIVE').length;
  const widgetEnabledProjectsOnPage = resolvedProjectPage.items.filter((project) => project.widgetEnabled).length;
  const totalOpenTicketsOnPage = resolvedProjectPage.items.reduce((sum, project) => sum + (openTicketCountByProject[project.id] || 0), 0);
  const activeFilterCount = statusFilter !== 'ALL' ? 1 : 0;

  const handleSort = (column: typeof sortColumn) => {
    setSortDirection((currentDirection) => getNextSortDirection(sortColumn === column, currentDirection));
    setSortColumn(column);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <PageHeader
        title={role === 'Project Manager' ? 'Projects' : 'Accessible Projects'}
        description="Projects are server-filtered and paginated with live client, widget, and ticket metadata."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Projects' }]}
        actions={
          canManageProjects ? (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <ProjectStat icon={Briefcase} label="Projects" value={String(resolvedProjectPage.total)} accent="orange" />
        <ProjectStat icon={Ticket} label="Open Tickets on Page" value={String(totalOpenTicketsOnPage)} accent="blue" />
        <ProjectStat icon={UserRoundCog} label="Active on Page" value={String(activeProjectsOnPage)} accent="green" />
        <ProjectStat icon={KeyRound} label="Widget Enabled on Page" value={String(widgetEnabledProjectsOnPage)} accent="blue" />
      </div>

      <DataToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by project, client, specialist, or widget key..."
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        activeFilterCount={activeFilterCount}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:max-w-[220px]">
            <DataFilterField label="Status">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | ProjectStatus)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </DataFilterField>
          </div>
          {activeFilterCount > 0 ? (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>
      </DataToolbar>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Project" active={sortColumn === 'project'} direction={sortDirection} onClick={() => handleSort('project')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Client" active={sortColumn === 'client'} direction={sortDirection} onClick={() => handleSort('client')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Project Specialist" active={sortColumn === 'specialist'} direction={sortDirection} onClick={() => handleSort('specialist')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Status" active={sortColumn === 'status'} direction={sortDirection} onClick={() => handleSort('status')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Open Tickets" active={sortColumn === 'openTickets'} direction={sortDirection} onClick={() => handleSort('openTickets')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Created" active={sortColumn === 'created'} direction={sortDirection} onClick={() => handleSort('created')} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    No projects matched that search.
                  </td>
                </tr>
              ) : (
                visibleProjects.map((project) => (
                  <tr key={project.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link to={appPaths.projects.detail(project.id)} className="block group">
                        <p className="font-bold text-slate-900 transition-colors group-hover:text-orange-600">{project.name}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">{project.displayId}</p>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{project.client?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{project.assignedTo?.name || 'Unassigned'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
                        {humanizeEnum(project.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${(openTicketCountByProject[project.id] || 0) > 0 ? 'text-orange-600' : 'text-slate-500'}`}>
                        {openTicketCountByProject[project.id] || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(project.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={resolvedProjectPage.page}
          totalPages={resolvedProjectPage.totalPages}
          totalItems={resolvedProjectPage.total}
          itemLabel="projects"
          pageSize={resolvedProjectPage.pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

function ProjectStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
  accent: 'orange' | 'blue' | 'green';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
        : 'bg-orange-50 text-orange-600';

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-12 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      <div className="h-[28rem] rounded-2xl border border-slate-200 bg-white shadow-sm" />
    </div>
  );
}

function ProjectsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Projects unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}

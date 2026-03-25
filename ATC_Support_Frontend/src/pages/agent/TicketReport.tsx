import { useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';

import { DataFilterField, DataToolbar } from '../../components/layout/DataToolbar';
import PageHeader from '../../components/layout/PageHeader';
import { SortableTableHeader } from '../../components/layout/SortableTableHeader';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDateTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import { compareSortValues, getNextSortDirection, type SortDirection } from '../../lib/tableSort';
import type { ApiProject, ApiTicket, TicketStatus } from '../../lib/types';

type Filters = {
  projectId: string;
  status: '' | TicketStatus;
  fromDate: string;
  toDate: string;
  search: string;
};

type ReportSortColumn = 'ticket' | 'client' | 'project' | 'priority' | 'status' | 'assignee' | 'created' | 'resolved';

const defaultFilters: Filters = {
  projectId: '',
  status: '',
  fromDate: '',
  toDate: '',
  search: '',
};

const ticketStatuses: TicketStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'ESCALATED', 'REOPENED', 'RESOLVED'];

const priorityRank = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

const statusRank = {
  NEW: 1,
  ASSIGNED: 2,
  IN_PROGRESS: 3,
  WAITING_ON_CUSTOMER: 4,
  ESCALATED: 5,
  REOPENED: 6,
  RESOLVED: 7,
} as const;

const buildReportPath = (filters: Filters) => {
  const params = new URLSearchParams();

  if (filters.projectId) {
    params.set('projectId', filters.projectId);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.fromDate) {
    params.set('from', filters.fromDate);
  }

  if (filters.toDate) {
    params.set('to', filters.toDate);
  }

  const query = params.toString();
  return `/reports/tickets${query ? `?${query}` : ''}`;
};

const downloadCsv = (tickets: ApiTicket[]) => {
  const headers = ['Ticket ID', 'Title', 'Client', 'Project', 'Priority', 'Status', 'Assignee', 'Created At', 'Resolved At'];
  const rows = tickets.map((ticket) => [
    ticket.displayId,
    ticket.title,
    ticket.project?.client?.name || '',
    ticket.project?.name || '',
    humanizeEnum(ticket.priority),
    humanizeEnum(ticket.status),
    ticket.assignedTo?.name || '',
    formatDateTime(ticket.createdAt),
    ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ticket-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default function TicketReport() {
  const { showToast } = useToast();
  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<ReportSortColumn>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const projectsQuery = useAsyncData(() => apiFetch<ApiProject[]>('/projects'), []);
  const reportQuery = useAsyncData(() => apiFetch<ApiTicket[]>(buildReportPath(appliedFilters)), [appliedFilters]);

  const activeFilterCount = [draftFilters.projectId, draftFilters.status, draftFilters.fromDate, draftFilters.toDate].filter(Boolean).length;

  const visibleTickets = useMemo(() => {
    const tickets = [...(reportQuery.data || [])];
    const search = draftFilters.search.trim().toLowerCase();

    const filteredTickets = search
      ? tickets.filter((ticket) =>
          `${ticket.displayId} ${ticket.title} ${ticket.project?.name || ''} ${ticket.project?.client?.name || ''} ${ticket.assignedTo?.name || ''}`
            .toLowerCase()
            .includes(search),
        )
      : tickets;

    return filteredTickets.sort((left, right) => {
      switch (sortColumn) {
        case 'ticket':
          return compareSortValues(`${left.title} ${left.displayId}`, `${right.title} ${right.displayId}`, sortDirection);
        case 'client':
          return compareSortValues(left.project?.client?.name, right.project?.client?.name, sortDirection);
        case 'project':
          return compareSortValues(left.project?.name, right.project?.name, sortDirection);
        case 'priority':
          return compareSortValues(priorityRank[left.priority], priorityRank[right.priority], sortDirection);
        case 'status':
          return compareSortValues(statusRank[left.status], statusRank[right.status], sortDirection);
        case 'assignee':
          return compareSortValues(left.assignedTo?.name || 'Unassigned', right.assignedTo?.name || 'Unassigned', sortDirection);
        case 'resolved':
          return compareSortValues(left.resolvedAt ? new Date(left.resolvedAt).getTime() : null, right.resolvedAt ? new Date(right.resolvedAt).getTime() : null, sortDirection);
        case 'created':
        default:
          return compareSortValues(new Date(left.createdAt).getTime(), new Date(right.createdAt).getTime(), sortDirection);
      }
    });
  }, [draftFilters.search, reportQuery.data, sortColumn, sortDirection]);

  const handleSort = (column: ReportSortColumn) => {
    const isActive = sortColumn === column;
    setSortColumn(column);
    setSortDirection(getNextSortDirection(isActive, sortDirection));
  };

  const handleApplyFilters = () => {
    setAppliedFilters((current) => ({
      ...current,
      projectId: draftFilters.projectId,
      status: draftFilters.status,
      fromDate: draftFilters.fromDate,
      toDate: draftFilters.toDate,
    }));
  };

  const handleResetFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const handleExportCsv = () => {
    if (visibleTickets.length === 0) {
      showToast('warning', 'There are no report rows to export.');
      return;
    }

    downloadCsv(visibleTickets);
    showToast('success', 'Ticket report exported as CSV.');
  };

  const averageResolutionHours = (() => {
    const resolvedTickets = visibleTickets.filter((ticket) => ticket.resolvedAt);

    if (resolvedTickets.length === 0) {
      return null;
    }

    const totalMs = resolvedTickets.reduce((sum, ticket) => {
      const createdAt = new Date(ticket.createdAt).getTime();
      const resolvedAt = new Date(ticket.resolvedAt!).getTime();
      return sum + (resolvedAt - createdAt);
    }, 0);

    return (totalMs / resolvedTickets.length / 3_600_000).toFixed(1);
  })();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <PageHeader
        title="Ticket Reports"
        description="Filter and export live ticket data from the backend report endpoint."
        breadcrumbs={[
          { label: 'Insights', to: appPaths.reports.overview },
          { label: 'Reports', to: appPaths.reports.overview },
          { label: 'Ticket Reports' },
        ]}
        actions={
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Visible Tickets" value={String(visibleTickets.length)} />
        <SummaryCard label="Resolved" value={String(visibleTickets.filter((ticket) => ticket.status === 'RESOLVED').length)} />
        <SummaryCard label="Open" value={String(visibleTickets.filter((ticket) => ticket.status !== 'RESOLVED').length)} />
        <SummaryCard label="Avg Resolution" value={averageResolutionHours ? `${averageResolutionHours}h` : '--'} />
      </div>

      <DataToolbar
        searchValue={draftFilters.search}
        onSearchChange={(value) => setDraftFilters((current) => ({ ...current, search: value }))}
        searchPlaceholder="Search ticket, client, project, or assignee..."
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        activeFilterCount={activeFilterCount}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DataFilterField label="Project">
              <select
                value={draftFilters.projectId}
                onChange={(event) => setDraftFilters((current) => ({ ...current, projectId: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All projects</option>
                {(projectsQuery.data || []).map((project) => (
                  <option key={project.id} value={String(project.id)}>
                    {project.name}
                  </option>
                ))}
              </select>
            </DataFilterField>

            <DataFilterField label="Status">
              <select
                value={draftFilters.status}
                onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value as Filters['status'] }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All statuses</option>
                {ticketStatuses.map((status) => (
                  <option key={status} value={status}>
                    {humanizeEnum(status)}
                  </option>
                ))}
              </select>
            </DataFilterField>

            <DataFilterField label="From">
              <input
                type="date"
                value={draftFilters.fromDate}
                onChange={(event) => setDraftFilters((current) => ({ ...current, fromDate: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
              />
            </DataFilterField>

            <DataFilterField label="To">
              <input
                type="date"
                value={draftFilters.toDate}
                onChange={(event) => setDraftFilters((current) => ({ ...current, toDate: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
              />
            </DataFilterField>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleApplyFilters}
              className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
            >
              Apply Filters
            </button>
            <button
              onClick={handleResetFilters}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              onClick={reportQuery.reload}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </DataToolbar>

      {reportQuery.isLoading ? (
        <ReportSkeleton />
      ) : reportQuery.error ? (
        <ReportError message={reportQuery.error} onRetry={reportQuery.reload} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] whitespace-nowrap text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <SortableTableHeader label="Ticket" active={sortColumn === 'ticket'} direction={sortDirection} onClick={() => handleSort('ticket')} />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <SortableTableHeader label="Client" active={sortColumn === 'client'} direction={sortDirection} onClick={() => handleSort('client')} />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <SortableTableHeader label="Project" active={sortColumn === 'project'} direction={sortDirection} onClick={() => handleSort('project')} />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <SortableTableHeader label="Priority" active={sortColumn === 'priority'} direction={sortDirection} onClick={() => handleSort('priority')} />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <SortableTableHeader label="Status" active={sortColumn === 'status'} direction={sortDirection} onClick={() => handleSort('status')} />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <SortableTableHeader label="Assignee" active={sortColumn === 'assignee'} direction={sortDirection} onClick={() => handleSort('assignee')} />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <SortableTableHeader label="Created" active={sortColumn === 'created'} direction={sortDirection} onClick={() => handleSort('created')} />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <SortableTableHeader label="Resolved" active={sortColumn === 'resolved'} direction={sortDirection} onClick={() => handleSort('resolved')} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                      No tickets matched the selected filters.
                    </td>
                  </tr>
                ) : (
                  visibleTickets.map((ticket) => (
                    <tr key={ticket.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900">{ticket.title}</p>
                          <p className="mt-1 font-mono text-xs font-bold text-orange-600">{ticket.displayId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{ticket.project?.client?.name || '--'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{ticket.project?.name || '--'}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${getTicketPriorityClasses(ticket.priority)}`}>
                          {humanizeEnum(ticket.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${getTicketStatusClasses(ticket.status)}`}>
                          {humanizeEnum(ticket.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{ticket.assignedTo?.name || 'Unassigned'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(ticket.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : '--'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function ReportSkeleton() {
  return <div className="h-[28rem] animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />;
}

function ReportError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Report unavailable</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
        Retry
      </button>
    </div>
  );
}

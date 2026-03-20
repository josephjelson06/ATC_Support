import { useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDateTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
import type { ApiProject, ApiTicket, TicketStatus } from '../../lib/types';

type Filters = {
  projectId: string;
  status: '' | TicketStatus;
  fromDate: string;
  toDate: string;
  search: string;
};

const defaultFilters: Filters = {
  projectId: '',
  status: '',
  fromDate: '',
  toDate: '',
  search: '',
};

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

  const projectsQuery = useAsyncData(() => apiFetch<ApiProject[]>('/projects'), []);
  const reportQuery = useAsyncData(() => apiFetch<ApiTicket[]>(buildReportPath(appliedFilters)), [appliedFilters]);

  const visibleTickets = useMemo(() => {
    const tickets = reportQuery.data || [];

    if (!draftFilters.search.trim()) {
      return tickets;
    }

    const search = draftFilters.search.toLowerCase();

    return tickets.filter((ticket) =>
      `${ticket.displayId} ${ticket.title} ${ticket.project?.name || ''} ${ticket.project?.client?.name || ''} ${ticket.assignedTo?.name || ''}`
        .toLowerCase()
        .includes(search),
    );
  }, [draftFilters.search, reportQuery.data]);

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Ticket Reports"
        description="Filter and export live ticket data from the backend report endpoint."
        actions={
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard label="Visible Tickets" value={String(visibleTickets.length)} />
        <SummaryCard label="Resolved" value={String(visibleTickets.filter((ticket) => ticket.status === 'RESOLVED').length)} />
        <SummaryCard label="Open" value={String(visibleTickets.filter((ticket) => ticket.status !== 'RESOLVED').length)} />
        <SummaryCard label="Avg Resolution" value={averageResolutionHours ? `${averageResolutionHours}h` : '—'} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={draftFilters.search}
                onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search ticket, client, project, or assignee…"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project</label>
            <select
              value={draftFilters.projectId}
              onChange={(event) => setDraftFilters((current) => ({ ...current, projectId: event.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
            >
              <option value="">All projects</option>
              {(projectsQuery.data || []).map((project) => (
                <option key={project.id} value={String(project.id)}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
            <select
              value={draftFilters.status}
              onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value as Filters['status'] }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
            >
              <option value="">All statuses</option>
              {(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'ESCALATED', 'REOPENED', 'RESOLVED'] as TicketStatus[]).map((status) => (
                <option key={status} value={status}>
                  {humanizeEnum(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">From</label>
            <input
              type="date"
              value={draftFilters.fromDate}
              onChange={(event) => setDraftFilters((current) => ({ ...current, fromDate: event.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">To</label>
            <input
              type="date"
              value={draftFilters.toDate}
              onChange={(event) => setDraftFilters((current) => ({ ...current, toDate: event.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleApplyFilters}
            className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={reportQuery.reload}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {reportQuery.isLoading ? (
        <ReportSkeleton />
      ) : reportQuery.error ? (
        <ReportError message={reportQuery.error} onRetry={reportQuery.reload} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assignee</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Resolved</th>
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
                    <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900">{ticket.title}</p>
                          <p className="text-xs text-orange-600 font-mono font-bold mt-1">{ticket.displayId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{ticket.project?.client?.name || '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{ticket.project?.name || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getTicketPriorityClasses(ticket.priority)}`}>
                          {humanizeEnum(ticket.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getTicketStatusClasses(ticket.status)}`}>
                          {humanizeEnum(ticket.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{ticket.assignedTo?.name || 'Unassigned'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(ticket.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : '—'}</td>
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
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-slate-900 mt-2">{value}</p>
    </div>
  );
}

function ReportSkeleton() {
  return <div className="h-[28rem] bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse" />;
}

function ReportError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
      <h2 className="text-lg font-bold text-slate-900">Report unavailable</h2>
      <p className="text-sm text-slate-500 mt-2">{message}</p>
      <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
        Retry
      </button>
    </div>
  );
}

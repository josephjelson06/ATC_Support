import { useDeferredValue, useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2, Plus, Search, Ticket, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { TicketCreatePanel } from '../../components/entities/TicketCreatePanel';
import PageHeader from '../../components/layout/PageHeader';
import { PaginationControls } from '../../components/layout/PaginationControls';
import { useModal } from '../../contexts/ModalContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import type { ApiClient, ApiProject, ApiTicket, PaginatedResponse, TicketPriority, TicketStatus } from '../../lib/types';

const PAGE_SIZE = 10;

const ticketViewConfig: Record<
  string,
  {
    title: string;
    description: string;
    fixedStatus?: TicketStatus;
    assignedToMe?: boolean;
  }
> = {
  queue: {
    title: 'Tickets Queue',
    description: 'Live operational queue across all accessible tickets.',
  },
  mine: {
    title: 'My Tickets',
    description: 'Tickets currently assigned to you, optimized for fast engineer turnaround.',
    assignedToMe: true,
  },
  escalated: {
    title: 'Escalated Tickets',
    description: 'High-attention escalations awaiting project-lead visibility or action.',
    fixedStatus: 'ESCALATED',
  },
  waiting: {
    title: 'Waiting on Customer',
    description: 'Tickets paused until the requester sends the next update or confirmation.',
    fixedStatus: 'WAITING_ON_CUSTOMER',
  },
  resolved: {
    title: 'Resolved Tickets',
    description: 'Closed work for review, reporting, and knowledge capture.',
    fixedStatus: 'RESOLVED',
  },
};

export default function InboundQueue() {
  const { view = 'queue' } = useParams();
  const navigate = useNavigate();
  const { openModal } = useModal();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TicketStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TicketPriority>('ALL');
  const [clientFilter, setClientFilter] = useState<'ALL' | string>('ALL');
  const [projectFilter, setProjectFilter] = useState<'ALL' | string>('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'ME' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');
  const [createdWithinDays, setCreatedWithinDays] = useState<'ALL' | '1' | '7' | '30'>('ALL');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(searchQuery);
  const currentView = ticketViewConfig[view] || ticketViewConfig.queue;

  const filterOptionsQuery = useAsyncData(async () => {
    const [clients, projects] = await Promise.all([apiFetch<ApiClient[]>('/clients'), apiFetch<ApiProject[]>('/projects')]);
    return { clients, projects };
  }, []);

  const openCreateTicketModal = () => {
    const projects = filterOptionsQuery.data?.projects || [];

    openModal({
      title: 'Create Ticket',
      size: 'lg',
      content: (
        <TicketCreatePanel
          projects={projects}
          onCompleted={async (ticket) => {
            ticketsQuery.reload();
            navigate(appPaths.tickets.detail(ticket.id, 'summary'));
          }}
        />
      ),
    });
  };

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, statusFilter, priorityFilter, clientFilter, projectFilter, assignmentFilter, createdWithinDays]);

  useEffect(() => {
    setSearchQuery('');
    setPriorityFilter('ALL');
    setClientFilter('ALL');
    setProjectFilter('ALL');
    setCreatedWithinDays('ALL');
    setStatusFilter(currentView.fixedStatus || 'ALL');
    setAssignmentFilter(currentView.assignedToMe ? 'ME' : 'ALL');
    setPage(1);
  }, [currentView.assignedToMe, currentView.fixedStatus, view]);

  const ticketsQuery = useAsyncData(async () => {
    const searchParams = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });

    if (deferredSearch.trim()) {
      searchParams.set('search', deferredSearch.trim());
    }

    const effectiveStatus = currentView.fixedStatus || (statusFilter !== 'ALL' ? statusFilter : undefined);
    const effectiveAssignment = currentView.assignedToMe ? 'me' : assignmentFilter !== 'ALL' ? assignmentFilter.toLowerCase() : undefined;

    if (effectiveStatus) {
      searchParams.set('status', effectiveStatus);
    }

    if (priorityFilter !== 'ALL') {
      searchParams.set('priority', priorityFilter);
    }

    if (clientFilter !== 'ALL') {
      searchParams.set('clientId', clientFilter);
    }

    if (projectFilter !== 'ALL') {
      searchParams.set('projectId', projectFilter);
    }

    if (effectiveAssignment) {
      searchParams.set('assignedTo', effectiveAssignment);
    }

    if (createdWithinDays !== 'ALL') {
      searchParams.set('createdWithinDays', createdWithinDays);
    }

    return apiFetch<PaginatedResponse<ApiTicket>>(`/tickets?${searchParams.toString()}`);
  }, [assignmentFilter, clientFilter, createdWithinDays, currentView.assignedToMe, currentView.fixedStatus, deferredSearch, page, priorityFilter, projectFilter, statusFilter]);

  if (ticketsQuery.isLoading) {
    return <QueueSkeleton />;
  }

  if (ticketsQuery.error || !ticketsQuery.data) {
    return <QueueError message={ticketsQuery.error || 'Unable to load the inbound queue.'} onRetry={ticketsQuery.reload} />;
  }

  const ticketPage = ticketsQuery.data;
  const visibleTickets = ticketPage.items;
  const unassignedVisibleTickets = visibleTickets.filter((ticket) => !ticket.assignedTo && ticket.status !== 'RESOLVED').length;
  const resolvedVisibleTickets = visibleTickets.filter((ticket) => ticket.status === 'RESOLVED').length;
  const clientOptions = filterOptionsQuery.data?.clients || [];
  const projectOptions = filterOptionsQuery.data?.projects || [];
  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    clientFilter !== 'ALL' ||
    projectFilter !== 'ALL' ||
    assignmentFilter !== 'ALL' ||
    createdWithinDays !== 'ALL';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter(currentView.fixedStatus || 'ALL');
    setPriorityFilter('ALL');
    setClientFilter('ALL');
    setProjectFilter('ALL');
    setAssignmentFilter(currentView.assignedToMe ? 'ME' : 'ALL');
    setCreatedWithinDays('ALL');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <PageHeader
        title={currentView.title}
        description={currentView.description}
        actions={
          <button
            type="button"
            onClick={openCreateTicketModal}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
          >
            <Plus className="h-4 w-4" />
            New Ticket
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard icon={Ticket} label="Total Tickets" value={String(ticketPage.total)} accent="orange" />
        <SummaryCard icon={Users} label="Unassigned on Page" value={String(unassignedVisibleTickets)} accent="blue" />
        <SummaryCard icon={CheckCircle2} label="Resolved on Page" value={String(resolvedVisibleTickets)} accent="green" />
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Filters</p>
            <p className="mt-1 text-sm text-slate-500">Slice the queue by ownership, urgency, client context, and ticket age.</p>
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by title, client, project, or description..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition-all focus:border-orange-200 focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <FilterSelect label="Status" value={statusFilter} onChange={(value) => setStatusFilter(value as 'ALL' | TicketStatus)} disabled={Boolean(currentView.fixedStatus)}>
            <option value="ALL">All statuses</option>
            <option value="NEW">New</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_ON_CUSTOMER">Waiting</option>
            <option value="ESCALATED">Escalated</option>
            <option value="REOPENED">Reopened</option>
            <option value="RESOLVED">Resolved</option>
          </FilterSelect>

          <FilterSelect label="Priority" value={priorityFilter} onChange={(value) => setPriorityFilter(value as 'ALL' | TicketPriority)}>
            <option value="ALL">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </FilterSelect>

          <FilterSelect label="Client" value={clientFilter} onChange={setClientFilter}>
            <option value="ALL">All clients</option>
            {clientOptions.map((client) => (
              <option key={client.id} value={String(client.id)}>
                {client.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect label="Project" value={projectFilter} onChange={setProjectFilter}>
            <option value="ALL">All projects</option>
            {projectOptions
              .filter((project) => clientFilter === 'ALL' || String(project.clientId) === clientFilter)
              .map((project) => (
                <option key={project.id} value={String(project.id)}>
                  {project.name}
                </option>
              ))}
          </FilterSelect>

          <FilterSelect label="Assignment" value={assignmentFilter} onChange={(value) => setAssignmentFilter(value as 'ALL' | 'ME' | 'UNASSIGNED' | 'ASSIGNED')} disabled={Boolean(currentView.assignedToMe)}>
            <option value="ALL">All ownership</option>
            <option value="ME">Assigned to me</option>
            <option value="UNASSIGNED">Unassigned</option>
            <option value="ASSIGNED">Assigned</option>
          </FilterSelect>

          <FilterSelect label="Created" value={createdWithinDays} onChange={(value) => setCreatedWithinDays(value as 'ALL' | '1' | '7' | '30')}>
            <option value="ALL">Any time</option>
            <option value="1">Last 24h</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </FilterSelect>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Ticket', 'Client', 'Project', 'Priority', 'Status', 'Assigned To', 'Created'].map((heading) => (
                  <th key={heading} className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                    No tickets match your current filters.
                  </td>
                </tr>
              ) : (
                visibleTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => navigate(appPaths.tickets.detail(ticket.id))}
                    className="group cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <Ticket className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900 transition-colors group-hover:text-orange-600">{ticket.title}</p>
                          <p className="mt-1 font-mono text-xs text-slate-500">{ticket.displayId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{ticket.project?.client?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{ticket.project?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getTicketPriorityClasses(ticket.priority)}`}>
                        {humanizeEnum(ticket.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getTicketStatusClasses(ticket.status)}`}>
                        {humanizeEnum(ticket.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{ticket.assignedTo?.name || 'Unassigned'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatRelativeTime(ticket.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={ticketPage.page}
          totalPages={ticketPage.totalPages}
          totalItems={ticketPage.total}
          itemLabel="tickets"
          pageSize={ticketPage.pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
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

function QueueSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <div className="h-8 w-56 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 rounded-xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-slate-200" />
      <div className="h-[480px] rounded-xl border border-slate-200 bg-white shadow-sm" />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        {children}
      </select>
    </label>
  );
}

function QueueError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6">
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Queue unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2, Plus, Ticket, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { TicketCreatePanel } from '../../components/entities/TicketCreatePanel';
import { DataFilterField, DataToolbar } from '../../components/layout/DataToolbar';
import PageHeader from '../../components/layout/PageHeader';
import { PaginationControls } from '../../components/layout/PaginationControls';
import { SortableTableHeader } from '../../components/layout/SortableTableHeader';
import { useModal } from '../../contexts/ModalContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import { compareSortValues, getNextSortDirection } from '../../lib/tableSort';
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<'ticket' | 'client' | 'project' | 'priority' | 'status' | 'assignedTo' | 'created'>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
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

  const ticketItems = ticketsQuery.data?.items || [];
  const visibleTickets = useMemo(() => {
    const items = [...ticketItems];
    const priorityRank: Record<TicketPriority, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };
    const statusRank: Record<TicketStatus, number> = {
      NEW: 1,
      ASSIGNED: 2,
      IN_PROGRESS: 3,
      WAITING_ON_CUSTOMER: 4,
      ESCALATED: 5,
      REOPENED: 6,
      RESOLVED: 7,
    };

    items.sort((left, right) => {
      switch (sortColumn) {
        case 'ticket':
          return compareSortValues(left.title, right.title, sortDirection);
        case 'client':
          return compareSortValues(left.project?.client?.name || '', right.project?.client?.name || '', sortDirection);
        case 'project':
          return compareSortValues(left.project?.name || '', right.project?.name || '', sortDirection);
        case 'priority':
          return compareSortValues(priorityRank[left.priority], priorityRank[right.priority], sortDirection);
        case 'status':
          return compareSortValues(statusRank[left.status], statusRank[right.status], sortDirection);
        case 'assignedTo':
          return compareSortValues(left.assignedTo?.name || '', right.assignedTo?.name || '', sortDirection);
        case 'created':
          return compareSortValues(new Date(left.createdAt).getTime(), new Date(right.createdAt).getTime(), sortDirection);
      }
    });

    return items;
  }, [sortColumn, sortDirection, ticketItems]);

  if (ticketsQuery.isLoading) {
    return <QueueSkeleton />;
  }

  if (ticketsQuery.error || !ticketsQuery.data) {
    return <QueueError message={ticketsQuery.error || 'Unable to load the inbound queue.'} onRetry={ticketsQuery.reload} />;
  }

  const ticketPage = ticketsQuery.data;
  const clientOptions = filterOptionsQuery.data?.clients || [];
  const projectOptions = filterOptionsQuery.data?.projects || [];
  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    clientFilter !== 'ALL' ||
    projectFilter !== 'ALL' ||
    assignmentFilter !== 'ALL' ||
    createdWithinDays !== 'ALL';
  const activeFilterCount =
    Number(!currentView.fixedStatus && statusFilter !== 'ALL') +
    Number(priorityFilter !== 'ALL') +
    Number(clientFilter !== 'ALL') +
    Number(projectFilter !== 'ALL') +
    Number(!currentView.assignedToMe && assignmentFilter !== 'ALL') +
    Number(createdWithinDays !== 'ALL');

  const unassignedVisibleTickets = visibleTickets.filter((ticket) => !ticket.assignedTo && ticket.status !== 'RESOLVED').length;
  const resolvedVisibleTickets = visibleTickets.filter((ticket) => ticket.status === 'RESOLVED').length;

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter(currentView.fixedStatus || 'ALL');
    setPriorityFilter('ALL');
    setClientFilter('ALL');
    setProjectFilter('ALL');
    setAssignmentFilter(currentView.assignedToMe ? 'ME' : 'ALL');
    setCreatedWithinDays('ALL');
  };

  const handleSort = (column: typeof sortColumn) => {
    setSortDirection((currentDirection) => getNextSortDirection(sortColumn === column, currentDirection));
    setSortColumn(column);
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

      <DataToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by title, client, project, or description..."
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        activeFilterCount={activeFilterCount}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <DataFilterField label="Status">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | TicketStatus)}
                disabled={Boolean(currentView.fixedStatus)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="ALL">All statuses</option>
                <option value="NEW">New</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_ON_CUSTOMER">Waiting</option>
                <option value="ESCALATED">Escalated</option>
                <option value="REOPENED">Reopened</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </DataFilterField>

            <DataFilterField label="Priority">
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as 'ALL' | TicketPriority)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="ALL">All priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </DataFilterField>

            <DataFilterField label="Client">
              <select
                value={clientFilter}
                onChange={(event) => setClientFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="ALL">All clients</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={String(client.id)}>
                    {client.name}
                  </option>
                ))}
              </select>
            </DataFilterField>

            <DataFilterField label="Project">
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="ALL">All projects</option>
                {projectOptions
                  .filter((project) => clientFilter === 'ALL' || String(project.clientId) === clientFilter)
                  .map((project) => (
                    <option key={project.id} value={String(project.id)}>
                      {project.name}
                    </option>
                  ))}
              </select>
            </DataFilterField>

            <DataFilterField label="Assignment">
              <select
                value={assignmentFilter}
                onChange={(event) => setAssignmentFilter(event.target.value as 'ALL' | 'ME' | 'UNASSIGNED' | 'ASSIGNED')}
                disabled={Boolean(currentView.assignedToMe)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="ALL">All ownership</option>
                <option value="ME">Assigned to me</option>
                <option value="UNASSIGNED">Unassigned</option>
                <option value="ASSIGNED">Assigned</option>
              </select>
            </DataFilterField>

            <DataFilterField label="Created">
              <select
                value={createdWithinDays}
                onChange={(event) => setCreatedWithinDays(event.target.value as 'ALL' | '1' | '7' | '30')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="ALL">Any time</option>
                <option value="1">Last 24h</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </DataFilterField>
          </div>

          {hasActiveFilters ? (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={clearFilters}
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
          <table className="w-full min-w-[860px] text-left whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Ticket" active={sortColumn === 'ticket'} direction={sortDirection} onClick={() => handleSort('ticket')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Client" active={sortColumn === 'client'} direction={sortDirection} onClick={() => handleSort('client')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Project" active={sortColumn === 'project'} direction={sortDirection} onClick={() => handleSort('project')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Priority" active={sortColumn === 'priority'} direction={sortDirection} onClick={() => handleSort('priority')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Status" active={sortColumn === 'status'} direction={sortDirection} onClick={() => handleSort('status')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Assigned To" active={sortColumn === 'assignedTo'} direction={sortDirection} onClick={() => handleSort('assignedTo')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Created" active={sortColumn === 'created'} direction={sortDirection} onClick={() => handleSort('created')} /></th>
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

import { useDeferredValue, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Search, UserPlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { clsx } from 'clsx';

import { PaginationControls } from '../../components/layout/PaginationControls';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
import type { ApiTicket, PaginatedResponse, TicketStatus } from '../../lib/types';

const PAGE_SIZE = 10;

export default function InboundQueue() {
  const { role, user } = useRole();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TicketStatus>('ALL');
  const [page, setPage] = useState(1);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const deferredSearch = useDeferredValue(searchQuery);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, statusFilter]);

  const ticketsQuery = useAsyncData(async () => {
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

    return apiFetch<PaginatedResponse<ApiTicket>>(`/tickets?${searchParams.toString()}`);
  }, [page, deferredSearch, statusFilter]);

  useEffect(() => {
    if (!selectedTicketId || !ticketsQuery.data) {
      return;
    }

    const isSelectedVisible = ticketsQuery.data.items.some((ticket) => ticket.id === selectedTicketId);

    if (!isSelectedVisible) {
      setSelectedTicketId(null);
    }
  }, [selectedTicketId, ticketsQuery.data]);

  const handleAssignToMe = async (ticketId: number) => {
    if (!user || role === 'Project Manager') {
      return;
    }

    setIsAssigning(true);

    try {
      await apiFetch<ApiTicket>(`/tickets/${ticketId}/assign`, {
        method: 'POST',
        body: {
          assignedToId: user.id,
        },
      });

      showToast('success', 'Ticket assigned successfully.');
      ticketsQuery.reload();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsAssigning(false);
    }
  };

  if (ticketsQuery.isLoading) {
    return <QueueSkeleton />;
  }

  if (ticketsQuery.error || !ticketsQuery.data) {
    return <QueueError message={ticketsQuery.error || 'Unable to load the inbound queue.'} onRetry={ticketsQuery.reload} />;
  }

  const ticketPage = ticketsQuery.data;
  const visibleTickets = ticketPage.items;
  const selectedTicket = visibleTickets.find((ticket) => ticket.id === selectedTicketId) || null;
  const unassignedVisibleTickets = visibleTickets.filter((ticket) => !ticket.assignedTo && ticket.status !== 'RESOLVED').length;
  const resolvedVisibleTickets = visibleTickets.filter((ticket) => ticket.status === 'RESOLVED').length;

  return (
    <div className="relative flex h-[calc(100vh-64px)] flex-col overflow-hidden">
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inbound Queue</h1>
            <p className="mt-1 text-sm text-slate-500">Live ticket queue from the ATC Support backend.</p>
          </div>
          <div className="flex max-w-xl items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Tickets are created only through widget escalation. Manual internal ticket creation stays disabled.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard label="Total Tickets" value={String(ticketPage.total)} />
          <SummaryCard label="Unassigned on Page" value={String(unassignedVisibleTickets)} />
          <SummaryCard label="Resolved on Page" value={String(resolvedVisibleTickets)} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr),220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title, client, project, or description..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | TicketStatus)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_ON_CUSTOMER">Waiting on Customer</option>
            <option value="ESCALATED">Escalated</option>
            <option value="REOPENED">Reopened</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Ticket', 'Client', 'Project', 'Priority', 'Status', 'Assigned To', 'Created'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No tickets match your current filters.
                  </td>
                </tr>
              ) : (
                visibleTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={clsx('cursor-pointer transition-colors hover:bg-slate-50', selectedTicketId === ticket.id && 'bg-orange-50/60')}
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-bold text-slate-900">{ticket.title}</p>
                        <p className="mt-1 font-mono text-xs text-orange-600">{ticket.displayId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{ticket.project?.client?.name || '-'}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{ticket.project?.name || '-'}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${getTicketPriorityClasses(ticket.priority)}`}>
                        {humanizeEnum(ticket.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${getTicketStatusClasses(ticket.status)}`}>
                        {humanizeEnum(ticket.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{ticket.assignedTo?.name || 'Unassigned'}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{formatRelativeTime(ticket.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

      <AnimatePresence>
        {selectedTicket ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicketId(null)}
              className="absolute inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 z-50 flex h-full w-[500px] flex-col border-l border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/50 p-6">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-600">{selectedTicket.displayId}</span>
                    <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${getTicketPriorityClasses(selectedTicket.priority)}`}>
                      {humanizeEnum(selectedTicket.priority)}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedTicket.title}</h2>
                </div>
                <button onClick={() => setSelectedTicketId(null)} className="rounded-full p-2 transition-colors hover:bg-slate-200">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Description</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                    {selectedTicket.description || 'No description provided.'}
                  </p>
                </section>

                <section className="grid grid-cols-2 gap-4">
                  <DetailStat label="Client" value={selectedTicket.project?.client?.name || '-'} />
                  <DetailStat label="Project" value={selectedTicket.project?.name || '-'} />
                  <DetailStat label="Status" value={humanizeEnum(selectedTicket.status)} />
                  <DetailStat label="Assigned To" value={selectedTicket.assignedTo?.name || 'Unassigned'} />
                </section>

                {selectedTicket.chatSessionId ? <DetailStat label="Chat Session" value={`#${selectedTicket.chatSessionId}`} /> : null}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-4">
                <Link to={`/agent/ticket/${selectedTicket.id}`} className="flex items-center gap-2 text-sm font-bold text-orange-600 hover:underline">
                  Open full detail
                  <ArrowRight className="h-4 w-4" />
                </Link>

                {role !== 'Project Manager' ? (
                  <button
                    onClick={() => void handleAssignToMe(selectedTicket.id)}
                    disabled={isAssigning}
                    className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
                  >
                    <UserPlus className="h-4 w-4" />
                    Assign to me
                  </button>
                ) : null}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr),220px]">
        <div className="h-12 rounded-xl bg-slate-200" />
        <div className="h-12 rounded-xl bg-slate-200" />
      </div>
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

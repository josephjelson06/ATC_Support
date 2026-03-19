import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Clock3, Search, UserPlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { clsx } from 'clsx';

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../lib/format';
import type { ApiTicket } from '../../lib/types';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';

export default function InboundQueue() {
  const { role, user } = useRole();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const ticketsQuery = useAsyncData(() => apiFetch<ApiTicket[]>('/tickets'), []);

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return ticketsQuery.data || [];
    }

    return (ticketsQuery.data || []).filter((ticket) =>
      [ticket.displayId, ticket.title, ticket.project?.name, ticket.project?.client?.name, ticket.status, ticket.priority]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [searchQuery, ticketsQuery.data]);

  const selectedTicket = filteredTickets.find((ticket) => ticket.id === selectedTicketId) || (ticketsQuery.data || []).find((ticket) => ticket.id === selectedTicketId) || null;

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

  if (ticketsQuery.error) {
    return <QueueError message={ticketsQuery.error} onRetry={ticketsQuery.reload} />;
  }

  return (
    <div className="relative h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inbound Queue</h1>
            <p className="text-sm text-slate-500 mt-1">Live ticket queue from the ATC Support backend.</p>
          </div>
          <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-3 max-w-xl">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>Tickets are created only through widget escalation. Manual internal ticket creation stays disabled.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard label="Visible Tickets" value={String(ticketsQuery.data?.length ?? 0)} />
          <SummaryCard label="Unassigned" value={String((ticketsQuery.data || []).filter((ticket) => !ticket.assignedTo && ticket.status !== 'RESOLVED').length)} />
          <SummaryCard label="Resolved" value={String((ticketsQuery.data || []).filter((ticket) => ticket.status === 'RESOLVED').length)} />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by ticket, client, project, status..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Ticket', 'Client', 'Project', 'Priority', 'Status', 'Assigned To', 'Created'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No tickets match your current search.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={clsx(
                      'hover:bg-slate-50 transition-colors cursor-pointer',
                      selectedTicketId === ticket.id && 'bg-orange-50/60',
                    )}
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-bold text-slate-900">{ticket.title}</p>
                        <p className="text-xs text-orange-600 font-mono mt-1">{ticket.displayId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{ticket.project?.client?.name || '—'}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{ticket.project?.name || '—'}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getTicketPriorityClasses(ticket.priority)}`}>
                        {humanizeEnum(ticket.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getTicketStatusClasses(ticket.status)}`}>
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
        </div>
      </div>

      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicketId(null)}
              className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute top-0 right-0 w-[500px] h-full bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">{selectedTicket.displayId}</span>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getTicketPriorityClasses(selectedTicket.priority)}`}>
                      {humanizeEnum(selectedTicket.priority)}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedTicket.title}</h2>
                </div>
                <button onClick={() => setSelectedTicketId(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.description || 'No description provided.'}
                  </p>
                </section>

                <section className="grid grid-cols-2 gap-4">
                  <DetailStat label="Client" value={selectedTicket.project?.client?.name || '—'} />
                  <DetailStat label="Project" value={selectedTicket.project?.name || '—'} />
                  <DetailStat label="Status" value={humanizeEnum(selectedTicket.status)} />
                  <DetailStat label="Assigned To" value={selectedTicket.assignedTo?.name || 'Unassigned'} />
                </section>

                {selectedTicket.chatSessionId && <DetailStat label="Chat Session" value={`#${selectedTicket.chatSessionId}`} />}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <Link
                  to={`/agent/ticket/${selectedTicket.id}`}
                  className="flex items-center gap-2 text-sm font-bold text-orange-600 hover:underline"
                >
                  Open full detail
                  <ArrowRight className="w-4 h-4" />
                </Link>

                {role !== 'Project Manager' && (
                  <button
                    onClick={() => void handleAssignToMe(selectedTicket.id)}
                    disabled={isAssigning}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 transition-colors disabled:opacity-60"
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign to me
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-3xl font-black text-slate-900 mt-2">{value}</p>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 bg-white border border-slate-200 rounded-xl shadow-sm" />
        ))}
      </div>
      <div className="h-12 w-full max-w-md bg-slate-200 rounded-xl" />
      <div className="h-[480px] bg-white border border-slate-200 rounded-xl shadow-sm" />
    </div>
  );
}

function QueueError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Queue unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}

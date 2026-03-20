import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, Ticket } from 'lucide-react';

import PageHeader from '../../../components/layout/PageHeader';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { apiFetch } from '../../../lib/api';
import { formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../../lib/format';
import { appPaths } from '../../../lib/navigation';
import type { ApiTicket, DashboardStats } from '../../../lib/types';
import { useRole } from '../../../contexts/RoleContext';

export default function SupportEngineerDashboard() {
  const { user } = useRole();
  const statsQuery = useAsyncData(() => apiFetch<DashboardStats>('/dashboard/stats'), []);
  const ticketsQuery = useAsyncData(() => apiFetch<ApiTicket[]>('/tickets'), []);

  const assignedTickets = (ticketsQuery.data || [])
    .filter((ticket) => ticket.assignedTo?.id === user?.id && ticket.status !== 'RESOLVED')
    .slice(0, 5);
  const unassignedTickets = (ticketsQuery.data || [])
    .filter((ticket) => !ticket.assignedTo && ticket.status !== 'RESOLVED')
    .slice(0, 5);

  if (statsQuery.isLoading || ticketsQuery.isLoading) {
    return <DashboardSkeleton title="Support Engineer Dashboard" />;
  }

  if (statsQuery.error || ticketsQuery.error) {
    return <DashboardError message={statsQuery.error || ticketsQuery.error || 'Unable to load dashboard.'} onRetry={() => { statsQuery.reload(); ticketsQuery.reload(); }} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Support Engineer Dashboard"
        description="Your working view of unassigned work, owned tickets, and the next queue actions."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Unassigned Tickets" value={String(statsQuery.data?.unassignedTickets ?? 0)} icon={AlertTriangle} accent="orange" />
        <StatCard label="My Open Tickets" value={String(statsQuery.data?.myOpenTickets ?? 0)} icon={Ticket} accent="blue" />
        <StatCard label="My Resolved Tickets" value={String(statsQuery.data?.myResolvedTickets ?? 0)} icon={CheckCircle2} accent="green" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TicketListCard title="Assigned To Me" emptyText="No active assigned tickets." tickets={assignedTickets} />
        <TicketListCard title="Needs Assignment" emptyText="No unassigned tickets right now." tickets={unassignedTickets} />
      </div>
    </div>
  );
}

function TicketListCard({ title, tickets, emptyText }: { title: string; tickets: ApiTicket[]; emptyText: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <Link to={appPaths.tickets.queue} className="text-sm font-bold text-orange-600 hover:text-orange-700">
          Open Queue
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {tickets.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{emptyText}</div>
        ) : (
          tickets.map((ticket) => (
            <Link key={ticket.id} to={appPaths.tickets.detail(ticket.id)} className="block p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900">{ticket.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-orange-600">{ticket.displayId}</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${getTicketPriorityClasses(ticket.priority)}`}>
                      {humanizeEnum(ticket.priority)}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${getTicketStatusClasses(ticket.status)}`}>
                      {humanizeEnum(ticket.status)}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                  <Clock3 className="w-3 h-3" />
                  {formatRelativeTime(ticket.createdAt)}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof Ticket;
  accent: 'orange' | 'blue' | 'green';
}) {
  const theme =
    accent === 'blue'
      ? 'bg-blue-50 text-blue-600'
      : accent === 'green'
        ? 'bg-green-50 text-green-600'
        : 'bg-orange-50 text-orange-600';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${theme}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton({ title }: { title: string }) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-72 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-80 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        <div className="h-80 bg-white rounded-2xl border border-slate-200 shadow-sm" />
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Dashboard unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}

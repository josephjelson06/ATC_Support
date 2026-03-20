import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, Ticket, Users } from 'lucide-react';

import PageHeader from '../../../components/layout/PageHeader';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { apiFetch } from '../../../lib/api';
import { formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../../lib/format';
import { appPaths } from '../../../lib/navigation';
import type { ApiClient, ApiTicket, DashboardStats } from '../../../lib/types';

export default function ProjectManagerDashboard() {
  const statsQuery = useAsyncData(() => apiFetch<DashboardStats>('/dashboard/stats'), []);
  const ticketsQuery = useAsyncData(() => apiFetch<ApiTicket[]>('/tickets'), []);
  const clientsQuery = useAsyncData(() => apiFetch<ApiClient[]>('/clients'), []);

  if (statsQuery.isLoading || ticketsQuery.isLoading || clientsQuery.isLoading) {
    return <DashboardSkeleton title="Project Manager Dashboard" />;
  }

  if (statsQuery.error || ticketsQuery.error || clientsQuery.error) {
    return <DashboardError message={statsQuery.error || ticketsQuery.error || clientsQuery.error || 'Unable to load dashboard.'} onRetry={() => { statsQuery.reload(); ticketsQuery.reload(); clientsQuery.reload(); }} />;
  }

  const openTickets = (ticketsQuery.data || []).filter((ticket) => ticket.status !== 'RESOLVED').slice(0, 5);
  const activeClients = (clientsQuery.data || []).slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Project Manager Dashboard"
        description="Portfolio-level overview of clients, projects, and the live support queue."
      />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard label="Clients" value={String(statsQuery.data?.totalClients ?? 0)} icon={Users} accent="blue" />
        <StatCard label="Projects" value={String(statsQuery.data?.totalProjects ?? 0)} icon={Briefcase} accent="orange" />
        <StatCard label="Open Tickets" value={String(statsQuery.data?.totalOpenTickets ?? 0)} icon={Ticket} accent="orange" />
        <StatCard label="Resolved Tickets" value={String(statsQuery.data?.totalResolvedTickets ?? 0)} icon={CheckCircle2} accent="green" />
        <StatCard label="Runbooks" value={String(statsQuery.data?.totalRunbooks ?? 0)} icon={Briefcase} accent="blue" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Open Ticket Queue</h2>
            <Link to={appPaths.tickets.queue} className="text-sm font-bold text-orange-600 hover:text-orange-700">
              Open Queue
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {openTickets.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No open tickets right now.</div>
            ) : (
              openTickets.map((ticket) => (
                <Link key={ticket.id} to={appPaths.tickets.detail(ticket.id)} className="block p-4 hover:bg-slate-50 transition-colors">
                  <p className="font-bold text-slate-900">{ticket.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-orange-600">{ticket.displayId}</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${getTicketPriorityClasses(ticket.priority)}`}>
                      {humanizeEnum(ticket.priority)}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${getTicketStatusClasses(ticket.status)}`}>
                      {humanizeEnum(ticket.status)}
                    </span>
                    <span>{ticket.project?.name}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(ticket.createdAt)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Active Clients</h2>
            <Link to={appPaths.clients.list} className="text-sm font-bold text-orange-600 hover:text-orange-700">
              View Clients
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {activeClients.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No clients found.</div>
            ) : (
              activeClients.map((client) => (
                <Link key={client.id} to={appPaths.clients.detail(client.id)} className="block p-4 hover:bg-slate-50 transition-colors">
                  <p className="font-bold text-slate-900">{client.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-orange-600">{client.displayId}</span>
                    {client.industry && <span>{client.industry}</span>}
                    <span>{humanizeEnum(client.status)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, index) => (
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

import { AlertTriangle, CheckCircle2, Clock3, Ticket, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import PageHeader from '../../../components/layout/PageHeader';
import { useRole } from '../../../contexts/RoleContext';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { apiFetch } from '../../../lib/api';
import { formatRelativeTime, getTicketPriorityClasses, getTicketStatusClasses, humanizeEnum } from '../../../lib/format';
import { appPaths } from '../../../lib/navigation';
import type { ApiTicket } from '../../../lib/types';

const DAY_WINDOW = 7;

type TicketOpsDashboardProps = {
  title: string;
  description: string;
  tableTitle: string;
};

export default function TicketOpsDashboard({ title, description, tableTitle }: TicketOpsDashboardProps) {
  const { user } = useRole();
  const ticketsQuery = useAsyncData(() => apiFetch<ApiTicket[]>('/tickets'), []);

  if (ticketsQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (ticketsQuery.error || !ticketsQuery.data) {
    return <DashboardError message={ticketsQuery.error || 'Unable to load dashboard.'} onRetry={ticketsQuery.reload} />;
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - (DAY_WINDOW - 1));
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const tickets = ticketsQuery.data;
  const assignedToMe = tickets.filter((ticket) => ticket.assignedTo?.id === user?.id && ticket.status !== 'RESOLVED').length;
  const newToday = tickets.filter((ticket) => new Date(ticket.createdAt) >= todayStart).length;
  const inProgress = tickets.filter((ticket) => ticket.status === 'IN_PROGRESS' || ticket.status === 'ASSIGNED' || ticket.status === 'REOPENED').length;
  const waiting = tickets.filter((ticket) => ticket.status === 'WAITING_ON_CUSTOMER' || ticket.status === 'ESCALATED').length;
  const resolvedThisWeek = tickets.filter((ticket) => ticket.status === 'RESOLVED' && ticket.resolvedAt && new Date(ticket.resolvedAt) >= sevenDaysAgo).length;

  const briefTickets = [...tickets]
    .filter(
      (ticket) =>
        ticket.assignedTo?.id === user?.id ||
        ticket.status === 'NEW' ||
        ticket.status === 'ESCALATED' ||
        ticket.status === 'WAITING_ON_CUSTOMER' ||
        !ticket.assignedTo,
    )
    .sort((left, right) => {
      const priorityRank = priorityWeight(right.priority) - priorityWeight(left.priority);
      if (priorityRank !== 0) {
        return priorityRank;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    })
    .slice(0, 8);

  const weeklyStackedData = Array.from({ length: DAY_WINDOW }, (_, index) => {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + index);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);

    const dayTickets = tickets.filter((ticket) => {
      const createdAt = new Date(ticket.createdAt);
      return createdAt >= date && createdAt < nextDate;
    });

    return {
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      newTickets: dayTickets.filter((ticket) => ticket.status === 'NEW').length,
      activeTickets: dayTickets.filter((ticket) => ['ASSIGNED', 'IN_PROGRESS', 'REOPENED'].includes(ticket.status)).length,
      waitingTickets: dayTickets.filter((ticket) => ['WAITING_ON_CUSTOMER', 'ESCALATED'].includes(ticket.status)).length,
      resolvedTickets: dayTickets.filter((ticket) => ticket.status === 'RESOLVED').length,
    };
  });

  return (
    <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <PageHeader title={title} description={description} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Assigned" value={String(assignedToMe)} note="Owned by you" icon={Ticket} accent="orange" />
        <KpiCard label="New Today" value={String(newToday)} note={todayStart.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} icon={AlertTriangle} accent="amber" />
        <KpiCard label="In Progress" value={String(inProgress)} note="Active workflow" icon={Workflow} accent="blue" />
        <KpiCard label="Waiting" value={String(waiting)} note="Customer or escalation hold" icon={Clock3} accent="slate" />
        <KpiCard label="Resolved" value={String(resolvedThisWeek)} note="Last 7 days" icon={CheckCircle2} accent="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr),minmax(0,1fr)]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-xl font-black text-slate-900">{tableTitle}</h2>
              <p className="mt-1 text-sm text-slate-500">Brief view for fast triage before opening full ticket detail.</p>
            </div>
            <Link
              to={appPaths.tickets.queue}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Open list
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50/80">
                <tr>
                  {['Ticket', 'Project', 'Priority', 'Status', 'Updated'].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {briefTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-sm text-slate-500">
                      No tickets match the brief triage view right now.
                    </td>
                  </tr>
                ) : (
                  briefTickets.map((ticket) => (
                    <tr key={ticket.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <Link to={appPaths.tickets.detail(ticket.id)} className="block">
                          <p className="font-bold text-slate-900">{ticket.title}</p>
                          <p className="mt-1 font-mono text-xs text-orange-600">{ticket.displayId}</p>
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{ticket.project?.name || '-'}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${getTicketPriorityClasses(ticket.priority)}`}>
                          {humanizeEnum(ticket.priority)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${getTicketStatusClasses(ticket.status)}`}>
                          {humanizeEnum(ticket.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{formatRelativeTime(ticket.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-400">Weekly Status Mix</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Stacked ticket flow (7 days)</h2>
          <p className="mt-1 text-sm text-slate-500">Created tickets split by current workflow state for quick trend reading.</p>

          <div className="mt-6 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyStackedData} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={12} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-12} />
                <Tooltip content={<StackedTooltip />} />
                <Bar dataKey="newTickets" stackId="tickets" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="activeTickets" stackId="tickets" fill="#2563eb" />
                <Bar dataKey="waitingTickets" stackId="tickets" fill="#a855f7" />
                <Bar dataKey="resolvedTickets" stackId="tickets" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  note,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Ticket;
  accent: 'orange' | 'amber' | 'blue' | 'slate' | 'green';
}) {
  const tone =
    accent === 'green'
      ? 'border-green-200 bg-green-50 text-green-700'
      : accent === 'blue'
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : accent === 'slate'
          ? 'border-slate-200 bg-slate-100 text-slate-700'
          : accent === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-orange-200 bg-orange-50 text-orange-700';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
          <p className="mt-3 text-4xl font-black text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{note}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function StackedTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color?: string; dataKey?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const labels: Record<string, string> = {
    newTickets: 'New',
    activeTickets: 'Active',
    waitingTickets: 'Waiting / Escalated',
    resolvedTickets: 'Resolved',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <div className="mt-2 space-y-2">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center justify-between gap-6 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color || '#cbd5e1' }} />
              <span className="font-semibold">{labels[String(entry.dataKey)] || String(entry.dataKey)}</span>
            </div>
            <span className="font-black text-slate-900">{entry.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function priorityWeight(priority: ApiTicket['priority']) {
  switch (priority) {
    case 'CRITICAL':
      return 4;
    case 'HIGH':
      return 3;
    case 'MEDIUM':
      return 2;
    default:
      return 1;
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      <div className="h-8 w-64 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-36 rounded-3xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr),minmax(0,1fr)]">
        <div className="h-96 rounded-3xl border border-slate-200 bg-white shadow-sm" />
        <div className="h-96 rounded-3xl border border-slate-200 bg-white shadow-sm" />
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-3xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-black text-slate-900">Dashboard unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}

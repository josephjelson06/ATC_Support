import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  analyticsPeriodOptions,
  buildTimeBuckets,
  calculateAverageResolutionHours,
  countItemsInBuckets,
  downloadCsvFile,
  filterItemsByPeriod,
  formatAnalyticsHours,
  formatAnalyticsPercent,
  type AnalyticsPeriod,
} from '../../lib/analytics';
import { apiFetch } from '../../lib/api';
import { formatDateTime, humanizeEnum } from '../../lib/format';
import type { ApiProject, ApiTicket, TicketPriority, TicketStatus } from '../../lib/types';

const priorityOrder: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const priorityColors: Record<TicketPriority, string> = {
  LOW: '#94a3b8',
  MEDIUM: '#f59e0b',
  HIGH: '#ea580c',
  CRITICAL: '#ef4444',
};

const statusOrder: TicketStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'ESCALATED', 'REOPENED', 'RESOLVED'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number }>; label?: string }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      {label ? <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={`${entry.name}-${entry.color}`} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-bold text-slate-500">{entry.name}</span>
            <span className="ml-auto font-black text-slate-900">{entry.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function TicketAnalytics() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<AnalyticsPeriod>('90d');
  const [projectId, setProjectId] = useState('');

  const analyticsQuery = useAsyncData(
    async () => {
      const [tickets, projects] = await Promise.all([apiFetch<ApiTicket[]>('/reports/tickets'), apiFetch<ApiProject[]>('/projects')]);
      return { tickets, projects };
    },
    [],
  );

  const tickets = analyticsQuery.data?.tickets || [];
  const projects = analyticsQuery.data?.projects || [];

  const filteredTickets = useMemo(() => {
    const ticketsInPeriod = filterItemsByPeriod(tickets, (ticket) => ticket.createdAt, period);
    return projectId ? ticketsInPeriod.filter((ticket) => String(ticket.project?.id || '') === projectId) : ticketsInPeriod;
  }, [period, projectId, tickets]);

  const trendData = useMemo(() => {
    const buckets = buildTimeBuckets(period);
    const openedCounts = countItemsInBuckets(filteredTickets, (ticket) => ticket.createdAt, buckets);
    const resolvedCounts = countItemsInBuckets(
      filteredTickets.filter((ticket) => ticket.resolvedAt),
      (ticket) => ticket.resolvedAt,
      buckets,
    );

    return buckets.map((bucket, index) => ({
      name: bucket.label,
      opened: openedCounts[index],
      resolved: resolvedCounts[index],
    }));
  }, [filteredTickets, period]);

  const priorityData = useMemo(
    () =>
      priorityOrder.map((priority) => ({
        name: humanizeEnum(priority),
        value: filteredTickets.filter((ticket) => ticket.priority === priority).length,
        fill: priorityColors[priority],
      })),
    [filteredTickets],
  );

  const statusRows = useMemo(
    () =>
      statusOrder.map((status) => ({
        status,
        count: filteredTickets.filter((ticket) => ticket.status === status).length,
      })),
    [filteredTickets],
  );

  const resolvedCount = filteredTickets.filter((ticket) => ticket.status === 'RESOLVED').length;
  const openCount = filteredTickets.filter((ticket) => ticket.status !== 'RESOLVED').length;
  const escalatedCount = filteredTickets.filter((ticket) => ticket.status === 'ESCALATED').length;
  const resolutionRate = filteredTickets.length ? (resolvedCount / filteredTickets.length) * 100 : null;
  const escalationRate = filteredTickets.length ? (escalatedCount / filteredTickets.length) * 100 : null;
  const averageResolution = calculateAverageResolutionHours(filteredTickets);

  const handleExport = () => {
    downloadCsvFile(
      `ticket-analytics-${period}.csv`,
      ['Ticket ID', 'Title', 'Client', 'Project', 'Priority', 'Status', 'Assignee', 'Created At', 'Resolved At'],
      filteredTickets.map((ticket) => [
        ticket.displayId,
        ticket.title,
        ticket.project?.client?.name || '—',
        ticket.project?.name || '—',
        humanizeEnum(ticket.priority),
        humanizeEnum(ticket.status),
        ticket.assignedTo?.name || 'Unassigned',
        formatDateTime(ticket.createdAt),
        ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : '—',
      ]),
    );
    showToast('success', 'Ticket analytics exported as CSV.');
  };

  if (analyticsQuery.isLoading) {
    return <PageState title="Loading ticket analytics" description="Pulling the latest ticket and project data from the backend." />;
  }

  if (analyticsQuery.error) {
    return <ErrorState message={analyticsQuery.error} onRetry={analyticsQuery.reload} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <Link to="/agent/analytics" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-orange-600">
        <ArrowLeft className="h-4 w-4" />
        Back To Overview
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Ticket Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Resolution speed, backlog health, and priority distribution from live tickets.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as AnalyticsPeriod)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            {analyticsPeriodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={String(project.id)}>
                {project.name}
              </option>
            ))}
          </select>
          <button
            onClick={analyticsQuery.reload}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Avg Resolution" value={formatAnalyticsHours(averageResolution)} hint="Resolved tickets only" />
        <SummaryCard label="Resolution Rate" value={formatAnalyticsPercent(resolutionRate)} hint={`${resolvedCount} resolved tickets`} />
        <SummaryCard label="Escalation Rate" value={formatAnalyticsPercent(escalationRate)} hint={`${escalatedCount} escalated tickets`} />
        <SummaryCard label="Open Backlog" value={String(openCount)} hint="Tickets not yet resolved" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Opened vs Resolved</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Trend across the selected time range</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="openedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={12} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-12} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="opened" name="Opened" stroke="#ea580c" fill="url(#openedGradient)" strokeWidth={3} />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" fill="url(#resolvedGradient)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Priority Mix</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Distribution by urgency</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={12} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-12} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Tickets" radius={[8, 8, 0, 0]}>
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-black tracking-tight text-slate-900">Status Breakdown</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">A quick view of where work is sitting right now</p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-5">
          {statusRows.map((row) => (
            <div key={row.status} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{humanizeEnum(row.status)}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{row.count}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-xs font-bold text-slate-500">{hint}</p>
    </div>
  );
}

function PageState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Ticket analytics unavailable</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
        Retry
      </button>
    </div>
  );
}

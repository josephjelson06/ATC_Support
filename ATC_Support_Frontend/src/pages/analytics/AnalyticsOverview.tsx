import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BookOpen, Copy, FolderKanban, RefreshCw, Ticket, TrendingUp, Users } from 'lucide-react';

import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  analyticsPeriodOptions,
  buildTimeBuckets,
  calculateAverageResolutionHours,
  copyTextToClipboard,
  countItemsInBuckets,
  downloadCsvFile,
  filterItemsByPeriod,
  formatAnalyticsHours,
  formatAnalyticsPercent,
  type AnalyticsPeriod,
} from '../../lib/analytics';
import { apiFetch } from '../../lib/api';
import { humanizeEnum } from '../../lib/format';
import type { ApiProject, ApiRunbook, ApiTicket, ApiUser, TicketStatus } from '../../lib/types';

const ticketStatusOrder: TicketStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED'];

const statusColors: Record<TicketStatus, string> = {
  NEW: '#94a3b8',
  ASSIGNED: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
  ESCALATED: '#8b5cf6',
  RESOLVED: '#10b981',
};

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

export default function AnalyticsOverview() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  const overviewQuery = useAsyncData(
    async () => {
      const [tickets, projects, runbooks, users] = await Promise.all([
        apiFetch<ApiTicket[]>('/reports/tickets'),
        apiFetch<ApiProject[]>('/projects'),
        apiFetch<ApiRunbook[]>('/runbooks'),
        apiFetch<ApiUser[]>('/users'),
      ]);

      return { tickets, projects, runbooks, users };
    },
    [],
  );

  const tickets = overviewQuery.data?.tickets || [];
  const projects = overviewQuery.data?.projects || [];
  const runbooks = overviewQuery.data?.runbooks || [];
  const users = overviewQuery.data?.users || [];

  const filteredTickets = useMemo(() => filterItemsByPeriod(tickets, (ticket) => ticket.createdAt, period), [period, tickets]);
  const filteredRunbooks = useMemo(() => filterItemsByPeriod(runbooks, (runbook) => runbook.createdAt, period), [period, runbooks]);

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

  const statusData = useMemo(
    () =>
      ticketStatusOrder
        .map((status) => ({
          name: humanizeEnum(status),
          value: filteredTickets.filter((ticket) => ticket.status === status).length,
          color: statusColors[status],
        }))
        .filter((entry) => entry.value > 0),
    [filteredTickets],
  );

  const resolvedTickets = filteredTickets.filter((ticket) => ticket.status === 'RESOLVED').length;
  const resolutionRate = filteredTickets.length ? (resolvedTickets / filteredTickets.length) * 100 : null;
  const averageResolution = calculateAverageResolutionHours(filteredTickets);
  const activeContributors = users.filter((user) => user.status === 'ACTIVE' && user.role !== 'PM').length;

  const summaryText = useMemo(
    () =>
      [
        `ATC Support overview (${analyticsPeriodOptions.find((option) => option.value === period)?.label})`,
        `Tickets in range: ${filteredTickets.length}`,
        `Resolved tickets: ${resolvedTickets}`,
        `Resolution rate: ${formatAnalyticsPercent(resolutionRate)}`,
        `Average resolution time: ${formatAnalyticsHours(averageResolution)}`,
        `Projects covered: ${projects.length}`,
        `Runbooks available: ${runbooks.length} (${filteredRunbooks.length} created in range)`,
        `Active contributors: ${activeContributors}`,
      ].join('\n'),
    [activeContributors, averageResolution, filteredRunbooks.length, filteredTickets.length, period, projects.length, resolvedTickets, resolutionRate, runbooks.length],
  );

  const handleCopySummary = async () => {
    try {
      await copyTextToClipboard(summaryText);
      showToast('success', 'Analytics summary copied to the clipboard.');
    } catch {
      showToast('error', 'Unable to copy the analytics summary right now.');
    }
  };

  const handleExport = () => {
    downloadCsvFile(
      `analytics-overview-${period}.csv`,
      ['Period', 'New Tickets', 'Resolved Tickets'],
      trendData.map((row) => [row.name, row.opened, row.resolved]),
    );
    showToast('success', 'Overview trend exported as CSV.');
  };

  if (overviewQuery.isLoading) {
    return <PageState title="Loading analytics" description="Pulling live ticket, project, and runbook data from the backend." />;
  }

  if (overviewQuery.error) {
    return <ErrorState message={overviewQuery.error} onRetry={overviewQuery.reload} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Analytics Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Live roll-up of ticket throughput, knowledge assets, and team capacity.</p>
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
          <button
            onClick={overviewQuery.reload}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" />
            Copy Summary
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            <TrendingUp className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Ticket} label="Tickets In Range" value={String(filteredTickets.length)} hint={`${resolvedTickets} resolved`} iconClasses="bg-orange-50 text-orange-600 border-orange-100" />
        <SummaryCard icon={TrendingUp} label="Resolution Rate" value={formatAnalyticsPercent(resolutionRate)} hint="Based on live ticket statuses" iconClasses="bg-emerald-50 text-emerald-600 border-emerald-100" />
        <SummaryCard icon={FolderKanban} label="Projects Covered" value={String(projects.length)} hint={`${activeContributors} active contributors`} iconClasses="bg-blue-50 text-blue-600 border-blue-100" />
        <SummaryCard icon={BookOpen} label="Runbooks Available" value={String(runbooks.length)} hint={`${filteredRunbooks.length} created in range`} iconClasses="bg-purple-50 text-purple-600 border-purple-100" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">Ticket Trend</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Opened versus resolved over time</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Avg resolution {formatAnalyticsHours(averageResolution)}
            </span>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={12} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-12} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="opened" name="Opened" stroke="#ea580c" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Status Mix</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Current distribution in the selected range</p>
          </div>
          {statusData.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">No ticket activity in this period.</div>
          ) : (
            <>
              <div className="relative h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={90} paddingAngle={4} stroke="none">
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-3">
                {statusData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="font-bold text-slate-600">{entry.name}</span>
                    </div>
                    <span className="font-black text-slate-900">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <AnalyticsLink to="/agent/analytics/tickets" title="Ticket Analytics" description="Drill into resolution time, backlog, and priority patterns." />
        <AnalyticsLink to="/agent/analytics/kb" title="KB Analytics" description="Track runbook growth, draft opportunities, and category coverage." />
        <AnalyticsLink to="/agent/analytics/performance" title="Engineer Performance" description="Compare resolved workload and live ownership across the team." />
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  iconClasses,
}: {
  icon: typeof Ticket;
  label: string;
  value: string;
  hint: string;
  iconClasses: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${iconClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-xs font-bold text-slate-500">{hint}</p>
    </div>
  );
}

function AnalyticsLink({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
    >
      <p className="text-xs font-black uppercase tracking-widest text-orange-600">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
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
      <h2 className="text-lg font-black text-slate-900">Analytics unavailable</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
        Retry
      </button>
    </div>
  );
}

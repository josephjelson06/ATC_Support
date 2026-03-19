import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Download, RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  analyticsPeriodOptions,
  calculateAverageResolutionHours,
  copyTextToClipboard,
  downloadCsvFile,
  filterItemsByPeriod,
  formatAnalyticsHours,
  type AnalyticsPeriod,
} from '../../lib/analytics';
import { apiFetch } from '../../lib/api';
import { formatDateTime, formatRoleLabel } from '../../lib/format';
import type { ApiTicket, ApiUser, BackendRole } from '../../lib/types';

const performerColors = ['#ea580c', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#14b8a6'];

type PerformanceRow = {
  user: ApiUser;
  resolved: number;
  open: number;
  totalAssigned: number;
  criticalOwned: number;
  averageResolutionHours: number | null;
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

export default function EngineerPerformance() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [roleFilter, setRoleFilter] = useState<'ALL' | BackendRole>('ALL');

  const performanceQuery = useAsyncData(
    async () => {
      const [tickets, users] = await Promise.all([apiFetch<ApiTicket[]>('/reports/tickets'), apiFetch<ApiUser[]>('/users')]);
      return { tickets, users };
    },
    [],
  );

  const periodTickets = useMemo(() => filterItemsByPeriod(performanceQuery.data?.tickets || [], (ticket) => ticket.createdAt, period), [performanceQuery.data?.tickets, period]);
  const engineers = useMemo(() => {
    const baseUsers = (performanceQuery.data?.users || []).filter((user) => user.role !== 'PM');
    return roleFilter === 'ALL' ? baseUsers : baseUsers.filter((user) => user.role === roleFilter);
  }, [performanceQuery.data?.users, roleFilter]);

  const performanceRows = useMemo<PerformanceRow[]>(() => {
    return engineers
      .map((user) => {
        const assignedTickets = periodTickets.filter((ticket) => ticket.assignedTo?.id === user.id);
        const resolvedTickets = assignedTickets.filter((ticket) => ticket.status === 'RESOLVED');
        const openTickets = assignedTickets.filter((ticket) => ticket.status !== 'RESOLVED');

        return {
          user,
          resolved: resolvedTickets.length,
          open: openTickets.length,
          totalAssigned: assignedTickets.length,
          criticalOwned: assignedTickets.filter((ticket) => ticket.priority === 'CRITICAL').length,
          averageResolutionHours: calculateAverageResolutionHours(resolvedTickets),
        };
      })
      .sort((left, right) => right.resolved - left.resolved || right.totalAssigned - left.totalAssigned);
  }, [engineers, periodTickets]);

  const chartData = performanceRows.slice(0, 8).map((row, index) => ({
    name: row.user.name,
    resolved: row.resolved,
    open: row.open,
    fill: performerColors[index % performerColors.length],
  }));

  const activeContributors = engineers.filter((user) => user.status === 'ACTIVE').length;
  const resolvedTickets = performanceRows.reduce((total, row) => total + row.resolved, 0);
  const openTickets = performanceRows.reduce((total, row) => total + row.open, 0);
  const criticalTickets = performanceRows.reduce((total, row) => total + row.criticalOwned, 0);
  const averageResolution = calculateAverageResolutionHours(periodTickets.filter((ticket) => ticket.assignedTo));
  const averageOpenLoad = activeContributors ? (openTickets / activeContributors).toFixed(1) : '0.0';

  const summaryText = useMemo(
    () =>
      [
        `Engineer performance (${analyticsPeriodOptions.find((option) => option.value === period)?.label})`,
        `Active contributors: ${activeContributors}`,
        `Resolved tickets: ${resolvedTickets}`,
        `Open tickets: ${openTickets}`,
        `Critical tickets owned: ${criticalTickets}`,
        `Average resolution time: ${formatAnalyticsHours(averageResolution)}`,
      ].join('\n'),
    [activeContributors, averageResolution, criticalTickets, openTickets, period, resolvedTickets],
  );

  const handleCopySummary = async () => {
    try {
      await copyTextToClipboard(summaryText);
      showToast('success', 'Performance summary copied to the clipboard.');
    } catch {
      showToast('error', 'Unable to copy the performance summary right now.');
    }
  };

  const handleExport = () => {
    downloadCsvFile(
      `engineer-performance-${period}.csv`,
      ['User ID', 'Name', 'Role', 'Status', 'Resolved', 'Open', 'Critical Owned', 'Avg Resolution', 'Created At'],
      performanceRows.map((row) => [
        row.user.displayId,
        row.user.name,
        formatRoleLabel(row.user.role),
        row.user.status,
        row.resolved,
        row.open,
        row.criticalOwned,
        row.averageResolutionHours === null ? '—' : `${row.averageResolutionHours.toFixed(1)}h`,
        formatDateTime(row.user.createdAt),
      ]),
    );
    showToast('success', 'Engineer performance exported as CSV.');
  };

  if (performanceQuery.isLoading) {
    return <PageState title="Loading engineer performance" description="Pulling users and ticket ownership data from the backend." />;
  }

  if (performanceQuery.error) {
    return <ErrorState message={performanceQuery.error} onRetry={performanceQuery.reload} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <Link to="/agent/analytics" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-orange-600">
        <ArrowLeft className="h-4 w-4" />
        Back To Overview
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Engineer Performance</h1>
          <p className="mt-1 text-sm text-slate-500">Resolved load, active backlog, and ownership across support contributors.</p>
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
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as 'ALL' | BackendRole)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="ALL">All Roles</option>
            <option value="SE">Support Engineers</option>
            <option value="PL">Project Leads</option>
          </select>
          <button
            onClick={performanceQuery.reload}
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
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Active Contributors" value={String(activeContributors)} hint="Users with active status" />
        <SummaryCard label="Resolved Tickets" value={String(resolvedTickets)} hint="Within the selected period" />
        <SummaryCard label="Avg Open Load" value={averageOpenLoad} hint="Open tickets per active contributor" />
        <SummaryCard label="Critical Owned" value={String(criticalTickets)} hint="Critical tickets currently assigned" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Resolved Leaderboard</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Top contributors by resolved tickets</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={12} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-12} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="resolved" name="Resolved" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Contributor Details</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Live ownership snapshot for the selected filters</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Contributor</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Role</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Resolved</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Open</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Avg Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {performanceRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                      No contributors match the selected filters.
                    </td>
                  </tr>
                ) : (
                  performanceRows.map((row) => (
                    <tr key={row.user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900">{row.user.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatRoleLabel(row.user.role)}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-900">{row.resolved}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-900">{row.open}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatAnalyticsHours(row.averageResolutionHours)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
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
      <h2 className="text-lg font-black text-slate-900">Performance analytics unavailable</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
        Retry
      </button>
    </div>
  );
}

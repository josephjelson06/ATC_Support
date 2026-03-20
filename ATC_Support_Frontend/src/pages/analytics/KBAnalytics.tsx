import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Download, RefreshCw, Sparkles } from 'lucide-react';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import PageHeader from '../../components/layout/PageHeader';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  analyticsPeriodOptions,
  buildTimeBuckets,
  countItemsInBuckets,
  downloadCsvFile,
  filterItemsByPeriod,
  type AnalyticsPeriod,
} from '../../lib/analytics';
import { apiFetch } from '../../lib/api';
import { buildDraftQueue } from '../../lib/drafts';
import { formatDateTime } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import type { ApiRunbook, ApiTicket } from '../../lib/types';

const categoryPalette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6'];

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

export default function KBAnalytics() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<AnalyticsPeriod>('90d');

  const kbQuery = useAsyncData(
    async () => {
      const [runbooks, tickets] = await Promise.all([apiFetch<ApiRunbook[]>('/runbooks'), apiFetch<ApiTicket[]>('/reports/tickets')]);
      return { runbooks, tickets };
    },
    [],
  );

  const runbooks = kbQuery.data?.runbooks || [];
  const resolvedTickets = useMemo(
    () => filterItemsByPeriod((kbQuery.data?.tickets || []).filter((ticket) => ticket.status === 'RESOLVED'), (ticket) => ticket.createdAt, period),
    [kbQuery.data?.tickets, period],
  );
  const runbooksInPeriod = useMemo(() => filterItemsByPeriod(runbooks, (runbook) => runbook.createdAt, period), [period, runbooks]);

  const draftSuggestions = useMemo(() => buildDraftQueue(resolvedTickets, runbooks), [resolvedTickets, runbooks]);

  const coverageTrend = useMemo(() => {
    const buckets = buildTimeBuckets(period);
    const newRunbooks = countItemsInBuckets(runbooksInPeriod, (runbook) => runbook.createdAt, buckets);
    const resolvedCounts = countItemsInBuckets(resolvedTickets, (ticket) => ticket.createdAt, buckets);

    return buckets.map((bucket, index) => ({
      name: bucket.label,
      runbooks: newRunbooks[index],
      resolved: resolvedCounts[index],
    }));
  }, [period, resolvedTickets, runbooksInPeriod]);

  const categoryData = useMemo(() => {
    const counts = runbooks.reduce<Record<string, number>>((accumulator, runbook) => {
      const key = runbook.category?.trim() || 'Uncategorized';
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts)
      .map(([name, value], index) => ({
        name,
        value,
        color: categoryPalette[index % categoryPalette.length],
      }))
      .sort((left, right) => right.value - left.value);
  }, [runbooks]);

  const recentRunbooks = useMemo(
    () => [...runbooks].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()).slice(0, 5),
    [runbooks],
  );

  const handleExport = () => {
    downloadCsvFile(
      `kb-analytics-${period}.csv`,
      ['Runbook ID', 'Title', 'Category', 'Created At', 'Updated At', 'Author'],
      runbooks.map((runbook) => [
        runbook.displayId,
        runbook.title,
        runbook.category || 'Uncategorized',
        formatDateTime(runbook.createdAt),
        formatDateTime(runbook.updatedAt),
        runbook.createdBy?.name || 'Unknown',
      ]),
    );
    showToast('success', 'Knowledge-base analytics exported as CSV.');
  };

  if (kbQuery.isLoading) {
    return <PageState title="Loading KB analytics" description="Pulling runbooks and resolved tickets from the backend." />;
  }

  if (kbQuery.error) {
    return <ErrorState message={kbQuery.error} onRetry={kbQuery.reload} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        title="Knowledge Base Analytics"
        description="Live visibility into runbook growth and unresolved documentation opportunities."
        actions={
          <>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as AnalyticsPeriod)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:ring-2 focus:ring-purple-500"
            >
              {analyticsPeriodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={kbQuery.reload}
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
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={BookOpen} label="Total Runbooks" value={String(runbooks.length)} hint={`${runbooksInPeriod.length} created in range`} iconClasses="bg-blue-50 text-blue-600 border-blue-100" />
        <SummaryCard icon={Sparkles} label="Draft Opportunities" value={String(draftSuggestions.length)} hint="Derived from resolved tickets" iconClasses="bg-purple-50 text-purple-600 border-purple-100" />
        <SummaryCard icon={BookOpen} label="Resolved Tickets" value={String(resolvedTickets.length)} hint="Potential KB sources" iconClasses="bg-emerald-50 text-emerald-600 border-emerald-100" />
        <SummaryCard icon={Sparkles} label="Categories" value={String(categoryData.length)} hint="Distinct runbook groupings" iconClasses="bg-orange-50 text-orange-600 border-orange-100" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Runbook Creation vs Resolved Tickets</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Shows how quickly the KB is keeping pace with solved work</p>
          </div>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={coverageTrend} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={12} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-12} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="runbooks" name="Runbooks Added" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="resolved" name="Resolved Tickets" stroke="#10b981" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Category Spread</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">How the knowledge base is distributed</p>
          </div>
          {categoryData.length === 0 ? (
            <div className="flex h-[340px] items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">No runbooks available yet.</div>
          ) : (
            <>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={90} paddingAngle={4} stroke="none">
                      {categoryData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-3">
                {categoryData.slice(0, 6).map((entry) => (
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Recent Runbooks</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Latest updated entries</p>
          </div>
          <div className="divide-y divide-slate-100">
            {recentRunbooks.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">No runbooks have been created yet.</div>
            ) : (
              recentRunbooks.map((runbook) => (
                <div key={runbook.id} className="px-6 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{runbook.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {runbook.displayId} | {runbook.category || 'Uncategorized'} | Updated {formatDateTime(runbook.updatedAt)}
                      </p>
                    </div>
                    <Link to={appPaths.kb.edit(runbook.id)} className="text-xs font-black uppercase tracking-widest text-orange-600 transition-colors hover:text-orange-700">
                      Open
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900">Draft Queue Signals</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Resolved tickets that still need documentation</p>
              </div>
              <Link to={appPaths.kb.review} className="text-xs font-black uppercase tracking-widest text-orange-600 transition-colors hover:text-orange-700">
                Review Queue
              </Link>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {draftSuggestions.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">No pending draft opportunities in the selected time range.</div>
            ) : (
              draftSuggestions.slice(0, 5).map((draft) => (
                <div key={draft.ticketId} className="px-6 py-4">
                  <p className="font-bold text-slate-900">{draft.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ticket {draft.ticketDisplayId} | Confidence {Math.round(draft.confidence * 100)}% | {draft.category}
                  </p>
                  <Link to={appPaths.kb.autoDraft(draft.ticketId)} className="mt-2 inline-block text-xs font-black uppercase tracking-widest text-orange-600 transition-colors hover:text-orange-700">
                    Open Draft
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
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
  icon: typeof BookOpen;
  label: string;
  value: string;
  hint: string;
  iconClasses: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${iconClasses}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
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
      <h2 className="text-lg font-black text-slate-900">KB analytics unavailable</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
        Retry
      </button>
    </div>
  );
}

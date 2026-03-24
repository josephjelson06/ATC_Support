import { Link } from 'react-router-dom';
import { BarChart3, Briefcase, Ticket } from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { humanizeEnum } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import type { ApiProject, ApiTicket } from '../../lib/types';

export default function Reports() {
  const reportsQuery = useAsyncData(
    async () => {
      const [tickets, projects] = await Promise.all([apiFetch<ApiTicket[]>('/tickets'), apiFetch<ApiProject[]>('/projects')]);

      return { tickets, projects };
    },
    [],
  );

  if (reportsQuery.isLoading) {
    return <ReportsSkeleton />;
  }

  if (reportsQuery.error || !reportsQuery.data) {
    return <ReportsError message={reportsQuery.error || 'Unable to load report summaries.'} onRetry={reportsQuery.reload} />;
  }

  const openTickets = reportsQuery.data.tickets.filter((ticket) => ticket.status !== 'RESOLVED').length;
  const resolvedTickets = reportsQuery.data.tickets.filter((ticket) => ticket.status === 'RESOLVED').length;
  const activeProjects = reportsQuery.data.projects.filter((project) => project.status === 'ACTIVE').length;
  const topPriority =
    reportsQuery.data.tickets.find((ticket) => ticket.status !== 'RESOLVED')?.priority ||
    reportsQuery.data.tickets[0]?.priority ||
    null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <PageHeader
        title="Reports Overview"
        description="Live summaries from the backend to help you jump into reporting workflows."
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={Ticket} label="Open Tickets" value={String(openTickets)} accent="orange" />
        <MetricCard icon={BarChart3} label="Resolved Tickets" value={String(resolvedTickets)} accent="green" />
        <MetricCard icon={Briefcase} label="Active Projects" value={String(activeProjects)} accent="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Link
          to={appPaths.reports.tickets}
          className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:border-orange-300 transition-all group"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <BarChart3 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
              Operations
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-5 group-hover:text-orange-600 transition-colors">Ticket Report Builder</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Filter by status, project, and date range using the live `/api/reports/tickets` endpoint.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">{reportsQuery.data.tickets.length} tickets available</span>
            {topPriority && (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">
                Highest active priority: {humanizeEnum(topPriority)}
              </span>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Ticket;
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

function ReportsSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        <div className="h-64 bg-white rounded-2xl border border-slate-200 shadow-sm" />
      </div>
    </div>
  );
}

function ReportsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Reports unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}

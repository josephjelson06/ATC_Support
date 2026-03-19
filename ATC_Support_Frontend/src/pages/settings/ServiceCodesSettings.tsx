import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, RefreshCw, Search } from 'lucide-react';

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/format';
import type { ApiAmc, ApiClient, ApiClientDetail } from '../../lib/types';

type CoverageRow = ApiAmc & {
  clientId: number;
  clientName: string;
  clientDisplayId: string;
  projectName: string;
};

export default function ServiceCodesSettings() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');

  const coverageQuery = useAsyncData(
    async () => {
      const clients = await apiFetch<ApiClient[]>('/clients');
      const clientDetails = await Promise.all(clients.map((client) => apiFetch<ApiClientDetail>(`/clients/${client.id}`)));

      const rows = clientDetails.flatMap<CoverageRow>((client) =>
        client.amcs.map((amc) => ({
          ...amc,
          clientId: client.id,
          clientName: client.name,
          clientDisplayId: client.displayId,
          projectName: amc.project?.name || client.projects.find((project) => project.id === amc.projectId)?.name || 'Unassigned',
        })),
      );

      return rows;
    },
    [],
  );

  const rows = coverageQuery.data || [];
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch = `${row.displayId} ${row.clientName} ${row.projectName}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const activeCount = rows.filter((row) => row.status === 'ACTIVE').length;
  const totalHoursRemaining = rows.reduce((total, row) => total + Math.max(row.hoursIncluded - row.hoursUsed, 0), 0);
  const expiringSoon = rows.filter((row) => {
    const endDate = new Date(row.endDate).getTime();
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1_000;
    return endDate >= now && endDate <= now + thirtyDays;
  }).length;

  if (coverageQuery.isLoading) {
    return <PageState title="Loading AMC coverage" description="Gathering live contract coverage records from each client." />;
  }

  if (coverageQuery.error) {
    return <ErrorState message={coverageQuery.error} onRetry={coverageQuery.reload} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">AMC Coverage</h2>
          <p className="mt-1 text-sm text-slate-500">Live AMC records from the backend, used as a practical stand-in until billing/service codes are added.</p>
        </div>
        <button
          onClick={coverageQuery.reload}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">Why this replaced service codes</p>
            <p className="mt-1 text-blue-800">
              Service-code billing is out of scope in the current backend spec. We are showing real AMC coverage here instead so the page still provides useful operational data.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SummaryCard label="Total AMCs" value={String(rows.length)} hint={`${activeCount} active`} />
        <SummaryCard label="Hours Remaining" value={String(totalHoursRemaining)} hint="Across all visible contracts" />
        <SummaryCard label="Expiring Soon" value={String(expiringSoon)} hint="Ending in the next 30 days" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr),180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by AMC, client, or project…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="ALL">All Statuses</option>
            {[...new Set(rows.map((row) => row.status))].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">AMC</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Client</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Project</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Hours</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Utilization</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">End Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                    No AMC records matched the current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const utilization = row.hoursIncluded ? Math.round((row.hoursUsed / row.hoursIncluded) * 100) : 0;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900">{row.displayId}</p>
                          <p className="mt-1 text-xs text-slate-500">Updated {formatDateTime(row.endDate)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900">{row.clientName}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.clientDisplayId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{row.projectName}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {row.hoursUsed} / {row.hoursIncluded}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.min(utilization, 100)}%` }} />
                          </div>
                          <p className="mt-2 text-xs font-bold text-slate-500">{utilization}% used</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(row.endDate)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-widest ${
                            row.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/agent/clients/${row.clientId}`}
                          className="text-xs font-black uppercase tracking-widest text-orange-600 transition-colors hover:text-orange-700"
                        >
                          View Client
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
      <h2 className="text-lg font-black text-slate-900">AMC coverage unavailable</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
        Retry
      </button>
    </div>
  );
}

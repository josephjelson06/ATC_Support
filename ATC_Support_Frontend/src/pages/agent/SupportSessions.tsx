import { Link } from 'react-router-dom';
import { Bot, Cpu, MessageSquare, Ticket } from 'lucide-react';
import { useState } from 'react';

import { DataFilterField, DataToolbar } from '../../components/layout/DataToolbar';
import PageHeader from '../../components/layout/PageHeader';
import { PaginationControls } from '../../components/layout/PaginationControls';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDateTime, formatRelativeTime, humanizeEnum } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import type { ApiSupportSession, PaginatedResponse, SupportSessionStatus, SupportType } from '../../lib/types';

const pageSize = 10;

export default function SupportSessions() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [supportType, setSupportType] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const sessionQuery = useAsyncData(
    async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (search.trim()) {
        params.set('search', search.trim());
      }

      if (status) {
        params.set('status', status);
      }

      if (supportType) {
        params.set('supportType', supportType);
      }

      return apiFetch<PaginatedResponse<ApiSupportSession>>(`/support-sessions?${params.toString()}`);
    },
    [page, search, status, supportType],
  );

  const sessions = sessionQuery.data?.items || [];
  const activeFilterCount = [status, supportType].filter(Boolean).length;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <PageHeader
        title="Support Sessions"
        description="All chatbot and workflow sessions, whether or not they became tickets."
        breadcrumbs={[
          { label: 'Operations', to: appPaths.tickets.queue },
          { label: 'Tickets', to: appPaths.tickets.queue },
          { label: 'Support Sessions' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SessionStat icon={MessageSquare} label="Visible Sessions" value={String(sessionQuery.data?.total || 0)} accent="orange" />
        <SessionStat icon={Ticket} label="Escalated On Page" value={String(sessions.filter((session) => session.status === 'ESCALATED').length)} accent="blue" />
        <SessionStat icon={Cpu} label="Hardware On Page" value={String(sessions.filter((session) => session.supportType === 'HARDWARE').length)} accent="green" />
      </div>

      <DataToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search sessions by requester, client, project, hardware, or ID..."
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        activeFilterCount={activeFilterCount}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DataFilterField label="Status">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All statuses</option>
              {(['ACTIVE', 'ENDED', 'ESCALATED'] as SupportSessionStatus[]).map((option) => (
                <option key={option} value={option}>
                  {humanizeEnum(option)}
                </option>
              ))}
            </select>
          </DataFilterField>
          <DataFilterField label="Support Type">
            <select
              value={supportType}
              onChange={(event) => {
                setSupportType(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All support types</option>
              {(['GENERAL', 'SOFTWARE', 'HARDWARE'] as SupportType[]).map((option) => (
                <option key={option} value={option}>
                  {humanizeEnum(option)}
                </option>
              ))}
            </select>
          </DataFilterField>
        </div>
      </DataToolbar>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Session</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Context</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Ticket</th>
                <th className="px-6 py-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessionQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                    Loading support sessions...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                    No support sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                          <Bot className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{session.requesterName || 'Visitor'}</p>
                          <p className="text-xs font-mono font-bold text-orange-600">{session.displayId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">{session.client?.name || 'Unknown client'}</td>
                    <td className="px-6 py-5 text-sm text-slate-600">
                      <div className="space-y-1">
                        {session.project ? <p>{session.project.name}</p> : null}
                        {session.hardwareAsset ? (
                          <p className="text-xs text-slate-500">
                            {[session.hardwareAsset.category, session.hardwareAsset.brand, session.hardwareAsset.model].filter(Boolean).join(' | ')}
                          </p>
                        ) : null}
                        {!session.project && !session.hardwareAsset ? <p>General support</p> : null}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-slate-700">
                        {humanizeEnum(session.supportType)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={getSessionStatusClasses(session.status)}>{humanizeEnum(session.status)}</span>
                    </td>
                    <td className="px-6 py-5 text-sm">
                      {session.ticket ? (
                        <Link to={appPaths.tickets.detail(session.ticket.id)} className="font-bold text-orange-600 hover:text-orange-700">
                          {session.ticket.displayId}
                        </Link>
                      ) : (
                        <span className="text-slate-400">No ticket</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500" title={formatDateTime(session.createdAt)}>
                      {formatRelativeTime(session.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {sessionQuery.data ? (
          <PaginationControls
            page={sessionQuery.data.page}
            totalPages={sessionQuery.data.totalPages}
            totalItems={sessionQuery.data.total}
            itemLabel="sessions"
            pageSize={sessionQuery.data.pageSize}
            onPageChange={setPage}
          />
        ) : null}
      </section>
    </div>
  );
}

function SessionStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof MessageSquare;
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
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

const getSessionStatusClasses = (status: SupportSessionStatus) => {
  const base = 'rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wider';

  if (status === 'ESCALATED') {
    return `${base} bg-orange-100 text-orange-700`;
  }

  if (status === 'ENDED') {
    return `${base} bg-green-100 text-green-700`;
  }

  return `${base} bg-blue-100 text-blue-700`;
};

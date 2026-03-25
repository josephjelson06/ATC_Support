import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Building2, Plus, ShieldCheck, Ticket } from 'lucide-react';

import { ClientCrudPanel } from '../../components/entities/ClientCrudPanel';
import { DataFilterField, DataToolbar } from '../../components/layout/DataToolbar';
import PageHeader from '../../components/layout/PageHeader';
import { PaginationControls } from '../../components/layout/PaginationControls';
import { SortableTableHeader } from '../../components/layout/SortableTableHeader';
import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDate, humanizeEnum } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import { compareSortValues, getNextSortDirection } from '../../lib/tableSort';
import type { ApiClient, ApiTicket, ClientStatus, PaginatedResponse } from '../../lib/types';

const PAGE_SIZE = 8;

export default function ClientMasterList() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { permissions } = useRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClientStatus>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<'client' | 'industry' | 'email' | 'status' | 'projects' | 'created'>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(searchQuery);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, statusFilter]);

  const clientsQuery = useAsyncData(
    async () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });

      if (deferredSearch.trim()) {
        searchParams.set('search', deferredSearch.trim());
      }

      if (statusFilter !== 'ALL') {
        searchParams.set('status', statusFilter);
      }

      const [clients, tickets] = await Promise.all([
        apiFetch<PaginatedResponse<ApiClient>>(`/clients?${searchParams.toString()}`),
        apiFetch<ApiTicket[]>('/tickets'),
      ]);

      return { clients, tickets };
    },
    [page, deferredSearch, statusFilter],
  );

  const canManageClients = permissions?.canManageClients ?? false;
  const clientPage = clientsQuery.data?.clients;
  const tickets = clientsQuery.data?.tickets || [];
  const clientItems = clientPage?.items || [];
  const openTicketCountByClient = tickets.reduce<Record<number, number>>((counts, ticket) => {
    const clientId = ticket.project?.client?.id;

    if (!clientId || ticket.status === 'RESOLVED') {
      return counts;
    }

    counts[clientId] = (counts[clientId] || 0) + 1;
    return counts;
  }, {});
  const visibleClients = useMemo(() => {
    const items = [...clientItems];

    items.sort((left, right) => {
      switch (sortColumn) {
        case 'client':
          return compareSortValues(left.name, right.name, sortDirection);
        case 'industry':
          return compareSortValues(left.industry || '', right.industry || '', sortDirection);
        case 'email':
          return compareSortValues(left.email || '', right.email || '', sortDirection);
        case 'status':
          return compareSortValues(left.status, right.status, sortDirection);
        case 'projects':
          return compareSortValues(left._count?.projects || 0, right._count?.projects || 0, sortDirection);
        case 'created':
          return compareSortValues(new Date(left.createdAt).getTime(), new Date(right.createdAt).getTime(), sortDirection);
      }
    });

    return items;
  }, [clientItems, sortColumn, sortDirection]);

  const openCreateModal = () => {
    openModal({
      title: 'Create Client',
      size: 'lg',
      content: (
        <ClientCrudPanel
          mode="create"
          onCompleted={async (client) => {
            clientsQuery.reload();
            navigate(appPaths.clients.detail(client.id));
          }}
        />
      ),
    });
  };

  if (clientsQuery.isLoading) {
    return <ClientsSkeleton />;
  }

  if (clientsQuery.error || !clientsQuery.data) {
    return <ClientsError message={clientsQuery.error || 'Unable to load clients.'} onRetry={clientsQuery.reload} />;
  }

  const resolvedClientPage = clientsQuery.data.clients;
  const totalProjectsOnPage = resolvedClientPage.items.reduce((sum, client) => sum + (client._count?.projects || 0), 0);
  const totalAmcsOnPage = resolvedClientPage.items.reduce((sum, client) => sum + (client._count?.amcs || 0), 0);
  const totalOpenTicketsOnPage = resolvedClientPage.items.reduce((sum, client) => sum + (openTicketCountByClient[client.id] || 0), 0);
  const activeFilterCount = (statusFilter !== 'ALL' ? 1 : 0);

  const handleSort = (column: typeof sortColumn) => {
    setSortDirection((currentDirection) => getNextSortDirection(sortColumn === column, currentDirection));
    setSortColumn(column);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <PageHeader
        title="Clients"
        description="Server-filtered client data with pagination, business metadata, and quick ticket context."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Clients' }]}
        actions={
          canManageClients ? (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              New Client
            </button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Building2} label="Clients" value={String(resolvedClientPage.total)} accent="blue" />
        <SummaryCard icon={Briefcase} label="Projects on Page" value={String(totalProjectsOnPage)} accent="orange" />
        <SummaryCard icon={ShieldCheck} label="AMCs on Page" value={String(totalAmcsOnPage)} accent="green" />
        <SummaryCard icon={Ticket} label="Open Tickets on Page" value={String(totalOpenTicketsOnPage)} accent="orange" />
      </div>

      <DataToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by client, city, industry, email, or ID..."
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        activeFilterCount={activeFilterCount}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:max-w-[220px]">
            <DataFilterField label="Status">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | ClientStatus)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </DataFilterField>
          </div>
          {activeFilterCount > 0 ? (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>
      </DataToolbar>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Client" active={sortColumn === 'client'} direction={sortDirection} onClick={() => handleSort('client')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Industry" active={sortColumn === 'industry'} direction={sortDirection} onClick={() => handleSort('industry')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Email" active={sortColumn === 'email'} direction={sortDirection} onClick={() => handleSort('email')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Status" active={sortColumn === 'status'} direction={sortDirection} onClick={() => handleSort('status')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Projects" active={sortColumn === 'projects'} direction={sortDirection} onClick={() => handleSort('projects')} /></th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"><SortableTableHeader label="Created" active={sortColumn === 'created'} direction={sortDirection} onClick={() => handleSort('created')} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    No clients matched that search.
                  </td>
                </tr>
              ) : (
                visibleClients.map((client) => (
                  <tr key={client.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link to={appPaths.clients.detail(client.id)} className="group flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 transition-colors group-hover:text-orange-600">{client.name}</p>
                          <p className="font-mono text-xs text-slate-500">{client.displayId}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{client.industry || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{client.email || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                          client.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {humanizeEnum(client.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{client._count?.projects || 0}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(client.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={resolvedClientPage.page}
          totalPages={resolvedClientPage.totalPages}
          totalItems={resolvedClientPage.total}
          itemLabel="clients"
          pageSize={resolvedClientPage.pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Building2;
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

function ClientsSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-12 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      <div className="h-[28rem] rounded-2xl border border-slate-200 bg-white shadow-sm" />
    </div>
  );
}

function ClientsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Clients unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}

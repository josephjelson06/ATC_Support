import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Building2, Plus, Search, ShieldCheck, Ticket } from 'lucide-react';

import { ClientCrudPanel } from '../../components/entities/ClientCrudPanel';
import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDate, humanizeEnum } from '../../lib/format';
import type { ApiClient, ApiTicket, ClientStatus } from '../../lib/types';

export default function ClientMasterList() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { backendRole } = useRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClientStatus>('ALL');
  const clientsQuery = useAsyncData(
    async () => {
      const [clients, tickets] = await Promise.all([apiFetch<ApiClient[]>('/clients'), apiFetch<ApiTicket[]>('/tickets')]);

      return { clients, tickets };
    },
    [],
  );

  const canManageClients = backendRole === 'PM';

  const filteredClients = useMemo(() => {
    const clients = clientsQuery.data?.clients || [];

    return clients.filter((client) => {
      const matchesStatus = statusFilter === 'ALL' || client.status === statusFilter;
      const matchesSearch = `${client.displayId} ${client.name} ${client.industry || ''} ${client.city || ''} ${client.email || ''} ${client.phone || ''}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [clientsQuery.data?.clients, searchQuery, statusFilter]);

  const openCreateModal = () => {
    openModal({
      title: 'Create Client',
      size: 'lg',
      content: (
        <ClientCrudPanel
          mode="create"
          onCompleted={async (client) => {
            clientsQuery.reload();
            navigate(`/agent/clients/${client.id}`);
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

  const openTicketCountByClient = clientsQuery.data.tickets.reduce<Record<number, number>>((counts, ticket) => {
    const clientId = ticket.project?.client?.id;

    if (!clientId || ticket.status === 'RESOLVED') {
      return counts;
    }

    counts[clientId] = (counts[clientId] || 0) + 1;
    return counts;
  }, {});

  const totalProjects = clientsQuery.data.clients.reduce((sum, client) => sum + (client._count?.projects || 0), 0);
  const totalAmcs = clientsQuery.data.clients.reduce((sum, client) => sum + (client._count?.amcs || 0), 0);
  const totalOpenTickets = Object.values(openTicketCountByClient).reduce((sum, value) => sum + value, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">Live client data from the backend, including business metadata and ticket activity.</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!canManageClients}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Plus className="h-4 w-4" />
          New Client
        </button>
      </div>

      {!canManageClients ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          This area is read-only for your account. Only Project Managers can create or edit client records.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <SummaryCard icon={Building2} label="Clients" value={String(clientsQuery.data.clients.length)} accent="blue" />
        <SummaryCard icon={Briefcase} label="Projects" value={String(totalProjects)} accent="orange" />
        <SummaryCard icon={ShieldCheck} label="AMCs" value={String(totalAmcs)} accent="green" />
        <SummaryCard icon={Ticket} label="Open Tickets" value={String(totalOpenTickets)} accent="orange" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr),220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by client, city, industry, email, or ID..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'ALL' | ClientStatus)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Client</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Industry</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Location</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Projects</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">AMCs</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Open Tickets</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-500">
                    No clients matched that search.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link to={`/agent/clients/${client.id}`} className="group flex items-center gap-3">
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
                    <td className="px-6 py-4 text-sm text-slate-600">{client.city || client.address || '-'}</td>
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
                    <td className="px-6 py-4 text-sm text-slate-600">{client._count?.amcs || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${(openTicketCountByClient[client.id] || 0) > 0 ? 'text-orange-600' : 'text-slate-500'}`}>
                        {openTicketCountByClient[client.id] || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(client.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

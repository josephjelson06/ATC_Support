import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Briefcase, Building2, Clock3, Globe, Mail, MapPin, Pencil, Phone, ShieldCheck, Users } from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import SectionTabs from '../../components/layout/SectionTabs';
import { ClientCrudPanel } from '../../components/entities/ClientCrudPanel';
import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDate, humanizeEnum } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import type { ApiClientDetail, ClientDetailTab } from '../../lib/types';

const detailTabs: ClientDetailTab[] = ['overview', 'projects', 'contacts', 'consignees', 'amcs'];

export default function ClientDetail() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { backendRole } = useRole();
  const { id, tab } = useParams();
  const rawTab = (tab as ClientDetailTab) || 'overview';
  const currentTab = detailTabs.includes(rawTab) ? rawTab : 'overview';

  if (!detailTabs.includes(rawTab) && id) {
    return <Navigate to={appPaths.clients.detail(id, 'overview')} replace />;
  }

  const clientQuery = useAsyncData(
    async () => {
      if (!id) {
        throw new Error('Client ID is missing.');
      }

      const client = await apiFetch<ApiClientDetail>(`/clients/${id}`);
      return { client };
    },
    [id],
  );

  if (clientQuery.isLoading) {
    return <ClientDetailSkeleton />;
  }

  if (clientQuery.error || !clientQuery.data) {
    return <ClientDetailError message={clientQuery.error || 'Unable to load client details.'} onRetry={clientQuery.reload} />;
  }

  const { client } = clientQuery.data;
  const activeAmcs = client.amcs.filter((amc) => amc.status === 'ACTIVE');
  const canManageClients = backendRole === 'PM';
  const clientTabs = [
    { label: 'Overview', to: appPaths.clients.detail(client.id, 'overview') },
    { label: 'Projects', to: appPaths.clients.detail(client.id, 'projects') },
    { label: 'Contacts', to: appPaths.clients.detail(client.id, 'contacts') },
    { label: 'Consignees', to: appPaths.clients.detail(client.id, 'consignees') },
    { label: 'AMCs', to: appPaths.clients.detail(client.id, 'amcs') },
  ];

  const openEditModal = () => {
    openModal({
      title: `Edit ${client.name}`,
      size: 'lg',
      content: (
        <ClientCrudPanel
          mode="edit"
          client={client}
          onCompleted={async () => {
            clientQuery.reload();
          }}
          onDeleted={async () => {
            navigate(appPaths.clients.list);
          }}
        />
      ),
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={client.name}
        description="Client profile, linked delivery records, and operational context."
        breadcrumbs={[
          { label: 'Operations', to: appPaths.clients.list },
          { label: 'Clients', to: appPaths.clients.list },
          { label: client.name },
          { label: humanizeEnum(currentTab) },
        ]}
        badges={
          <>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-bold text-slate-700">{client.displayId}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                client.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {humanizeEnum(client.status)}
            </span>
          </>
        }
        actions={
          canManageClients ? (
            <button
              onClick={openEditModal}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Edit Client
            </button>
          ) : null
        }
      />

      <SectionTabs tabs={clientTabs} role={backendRole} />

      {currentTab !== 'overview' ? (
        <div className="flex flex-col items-start gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:flex-row">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100">
            <Building2 className="h-10 w-10 text-slate-400" />
          </div>
          <div className="flex-1">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-bold text-slate-900">{client.name}</h2>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  {client.industry ? <span>{client.industry}</span> : null}
                  {client.city ? <span>| {client.city}</span> : null}
                  {client.email ? <span>| {client.email}</span> : null}
                  {client.phone ? <span>| {client.phone}</span> : null}
                  <span>| Created {formatDate(client.createdAt)}</span>
                  <span>
                    | {client.projects.length} project{client.projects.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-5 text-sm text-slate-500">
              This view keeps the client business profile and linked delivery records in one operational page.
            </p>
          </div>
        </div>
      ) : null}

      {currentTab !== 'overview' ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <DetailStat icon={Briefcase} label="Projects" value={String(client.projects.length)} accent="orange" />
          <DetailStat icon={Users} label="Contacts" value={String(client.contacts.length)} accent="blue" />
          <DetailStat icon={ShieldCheck} label="Active AMCs" value={String(activeAmcs.length)} accent="green" />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6">
        {currentTab === 'projects' ? (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900">Projects</h2>
              <span className="text-sm font-medium text-slate-500">{client.projects.length} linked</span>
            </div>
            <div className="divide-y divide-slate-100">
              {client.projects.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">No projects linked to this client yet.</div>
              ) : (
                client.projects.map((project) => (
                  <Link key={project.id} to={appPaths.projects.detail(project.id)} className="block p-5 transition-colors hover:bg-slate-50">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">{project.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono font-bold text-orange-600">{project.displayId}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold uppercase tracking-wider text-slate-700">
                            {humanizeEnum(project.status)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${
                              project.widgetEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {project.widgetEnabled ? 'Widget On' : 'Widget Off'}
                          </span>
                          {project.assignedTo ? <span>Lead: {project.assignedTo.name}</span> : null}
                        </div>
                      </div>
                      {project.widgetKey ? (
                        <span className="rounded-full bg-slate-900 px-3 py-1 font-mono text-[11px] text-white">{project.widgetKey}</span>
                      ) : null}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
        ) : null}

        {currentTab === 'overview' || currentTab === 'contacts' || currentTab === 'consignees' || currentTab === 'amcs' ? (
        <div className="space-y-6">
          {currentTab === 'overview' ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Business Profile</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <InfoCard icon={Mail} label="Email" value={client.email || 'Not set'} />
              <InfoCard icon={Phone} label="Phone" value={client.phone || 'Not set'} />
              <InfoCard icon={MapPin} label="City" value={client.city || 'Not set'} />
              <InfoCard icon={Globe} label="Website" value={client.website || 'Not set'} href={client.website || undefined} />
              <div className="rounded-2xl border border-slate-100 p-4 md:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Address</p>
                <p className="mt-2 text-sm text-slate-600">{client.address || 'No address recorded.'}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4 md:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Internal Notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{client.notes || 'No internal notes recorded.'}</p>
              </div>
            </div>
          </section>
          ) : null}

          {currentTab === 'contacts' ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Client Contacts</h2>
            </div>
            <div className="space-y-4 p-5">
              {client.contacts.length === 0 ? (
                <p className="text-sm text-slate-500">No contacts added yet.</p>
              ) : (
                client.contacts.map((contact) => (
                  <div key={contact.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{contact.name}</p>
                      {contact.isPrimary ? (
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-orange-700">
                          Primary
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-slate-500">
                      {contact.designation ? <p>{contact.designation}</p> : null}
                      {contact.email ? <p>{contact.email}</p> : null}
                      {contact.phone ? <p>{contact.phone}</p> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          ) : null}

          {currentTab === 'consignees' ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Consignees</h2>
            </div>
            <div className="space-y-4 p-5">
              {client.consignees.length === 0 ? (
                <p className="text-sm text-slate-500">No consignees added yet.</p>
              ) : (
                client.consignees.map((consignee) => (
                  <div key={consignee.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{consignee.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{consignee.address}</p>
                        {(consignee.contacts || []).length > 0 ? (
                          <p className="mt-2 text-xs text-slate-400">{(consignee.contacts || []).map((contact) => contact.name).join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          ) : null}

          {currentTab === 'amcs' ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">AMC Coverage</h2>
            </div>
            <div className="space-y-4 p-5">
              {client.amcs.length === 0 ? (
                <p className="text-sm text-slate-500">No AMC records linked yet.</p>
              ) : (
                client.amcs.map((amc) => {
                  const usage = amc.hoursIncluded === 0 ? 0 : Math.min(100, Math.round((amc.hoursUsed / amc.hoursIncluded) * 100));

                  return (
                    <div key={amc.id} className="rounded-2xl border border-slate-100 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-900">{amc.displayId}</p>
                          <p className="mt-1 text-sm text-slate-500">{amc.project?.name || 'Unassigned AMC'}</p>
                        </div>
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-green-700">
                          {humanizeEnum(amc.status)}
                        </span>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm font-medium text-slate-600">
                          <span>
                            {amc.hoursUsed} / {amc.hoursIncluded} hours used
                          </span>
                          <span>{usage}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-orange-500" style={{ width: `${usage}%` }} />
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span>
                            {formatDate(amc.startDate)} to {formatDate(amc.endDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
          ) : null}
        </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Briefcase;
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

function InfoCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm text-orange-600 hover:text-orange-700">
              {value}
            </a>
          ) : (
            <p className="mt-1 break-words text-sm text-slate-700">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientDetailSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-5 w-32 rounded-xl bg-slate-200" />
      <div className="h-52 rounded-3xl border border-slate-200 bg-white shadow-sm" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="h-80 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-80 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        </div>
        <div className="space-y-6">
          <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-56 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-56 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}

function ClientDetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Client unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Search, Ticket, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { appPaths } from '../../lib/navigation';
import type { ApiClient, ApiProject, ApiTicket, BackendRole, PaginatedResponse } from '../../lib/types';

const RESULT_LIMIT = 4;

type QuickLookupData = {
  tickets: ApiTicket[];
  projects: ApiProject[];
  clients: ApiClient[];
};

export default function QuickLookup({
  role,
  variant = 'desktop',
}: {
  role: BackendRole | null;
  variant?: 'desktop' | 'mobile';
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const lookupQuery = useAsyncData<QuickLookupData>(
    async () => {
      const trimmed = deferredQuery.trim();

      if (trimmed.length < 2) {
        return {
          tickets: [],
          projects: [],
          clients: [],
        };
      }

      const queryString = (path: string) => `${path}?search=${encodeURIComponent(trimmed)}&page=1&pageSize=${RESULT_LIMIT}`;
      const [tickets, projects, clients] = await Promise.all([
        apiFetch<PaginatedResponse<ApiTicket>>(queryString('/tickets')),
        apiFetch<PaginatedResponse<ApiProject>>(queryString('/projects')),
        role === 'PM' || role === 'PL' ? apiFetch<PaginatedResponse<ApiClient>>(queryString('/clients')) : Promise.resolve(null),
      ]);

      return {
        tickets: tickets.items,
        projects: projects.items,
        clients: clients?.items || [],
      };
    },
    [deferredQuery, role],
  );

  const hasQuery = deferredQuery.trim().length >= 2;
  const hasResults = useMemo(() => {
    const data = lookupQuery.data;
    return Boolean(data && (data.tickets.length || data.projects.length || data.clients.length));
  }, [lookupQuery.data]);

  const closeLookup = () => {
    setIsOpen(false);
    setQuery('');
  };

  const desktopInput = (
    <>
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        placeholder="Quick lookup: tickets, projects, clients"
        className="w-80 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-orange-200 focus:bg-white focus:ring-2 focus:ring-orange-500/40"
      />
    </>
  );

  const mobileInput = (
    <div className="border-b border-slate-100 px-4 py-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Quick lookup: tickets, projects, clients"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-orange-200 focus:bg-white focus:ring-2 focus:ring-orange-500/40"
        />
      </div>
    </div>
  );

  const resultsPanel = (
    <>
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Quick Lookup</p>
        <p className="mt-1 text-xs text-slate-500">Jump straight into the record you need without leaving the current workflow.</p>
      </div>

      <div className="max-h-[min(60dvh,28rem)] overflow-y-auto p-4 lg:max-h-[28rem]">
        {!hasQuery ? (
          <p className="text-sm text-slate-500">Type at least 2 characters to search live tickets, projects, and clients.</p>
        ) : lookupQuery.isLoading ? (
          <p className="text-sm text-slate-500">Searching live data...</p>
        ) : lookupQuery.error ? (
          <p className="text-sm text-rose-600">{lookupQuery.error}</p>
        ) : hasResults && lookupQuery.data ? (
          <div className="space-y-4">
            <LookupSection
              title="Tickets"
              icon={Ticket}
              items={lookupQuery.data.tickets.map((ticket) => ({
                id: ticket.id,
                label: ticket.title,
                meta: `${ticket.displayId} | ${ticket.project?.name || 'No project'}`,
                to: appPaths.tickets.detail(ticket.id),
              }))}
              onNavigate={closeLookup}
            />
            <LookupSection
              title="Projects"
              icon={Briefcase}
              items={lookupQuery.data.projects.map((project) => ({
                id: project.id,
                label: project.name,
                meta: `${project.displayId} | ${project.client?.name || 'No client'}`,
                to: appPaths.projects.detail(project.id),
              }))}
              onNavigate={closeLookup}
            />
            {(role === 'PM' || role === 'PL') && lookupQuery.data.clients.length > 0 ? (
              <LookupSection
                title="Clients"
                icon={Users}
                items={lookupQuery.data.clients.map((client) => ({
                  id: client.id,
                  label: client.name,
                  meta: `${client.displayId} | ${client.city || client.industry || 'No location'}`,
                  to: appPaths.clients.detail(client.id),
                }))}
                onNavigate={closeLookup}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No results matched "{deferredQuery.trim()}".</p>
        )}
      </div>
    </>
  );

  if (variant === 'mobile') {
    return (
      <div ref={wrapperRef} className="relative lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
          aria-label="Open quick lookup"
        >
          <Search className="h-4 w-4" />
        </button>

        {isOpen ? (
          <div
            className="fixed inset-0 z-[140] bg-slate-950/35 p-4 backdrop-blur-[1px]"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeLookup();
              }
            }}
          >
            <div className="mx-auto flex h-full max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              {mobileInput}
              {resultsPanel}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative hidden lg:block">
      {desktopInput}

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[26rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {resultsPanel}
        </div>
      ) : null}
    </div>
  );
}

function LookupSection({
  title,
  icon: Icon,
  items,
  onNavigate,
}: {
  title: string;
  icon: typeof Ticket;
  items: Array<{ id: number; label: string; meta: string; to: string }>;
  onNavigate: () => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{title}</p>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            onClick={onNavigate}
            className="block rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50"
          >
            <p className="truncate text-sm font-bold text-slate-900">{item.label}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{item.meta}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

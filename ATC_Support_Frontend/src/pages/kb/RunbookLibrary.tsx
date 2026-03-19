import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenText, FileText, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import Markdown from 'react-markdown';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { formatDateTime, formatRelativeTime, humanizeEnum } from '../../lib/format';
import type { ApiProject, ApiProjectDoc, ApiRunbook, KnowledgeStatus } from '../../lib/types';

type ActiveTab = 'runbooks' | 'project-docs';
type ProjectDocWithProject = ApiProjectDoc & { projectName: string };

export default function RunbookLibrary() {
  const { openModal } = useModal();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('runbooks');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | KnowledgeStatus>('ALL');

  const libraryQuery = useAsyncData(
    async () => {
      const [runbooks, projects] = await Promise.all([apiFetch<ApiRunbook[]>('/runbooks'), apiFetch<ApiProject[]>('/projects')]);

      const docsByProject = await Promise.all(
        projects.map(async (project) => ({
          project,
          docs: await apiFetch<ApiProjectDoc[]>(`/projects/${project.id}/docs`),
        })),
      );

      const projectDocs = docsByProject.flatMap(({ project, docs }) =>
        docs.map((doc) => ({
          ...doc,
          projectName: project.name,
        })),
      );

      return {
        runbooks,
        projectDocs,
        projectCount: projects.length,
      };
    },
    [],
  );

  const filteredRunbooks = useMemo(() => {
    const runbooks = libraryQuery.data?.runbooks || [];

    return runbooks.filter((runbook) => {
      const matchesStatus = statusFilter === 'ALL' || runbook.status === statusFilter;
      const matchesSearch = `${runbook.displayId} ${runbook.title} ${runbook.category || ''} ${runbook.content}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [libraryQuery.data?.runbooks, searchQuery, statusFilter]);

  const filteredDocs = useMemo(() => {
    const docs = libraryQuery.data?.projectDocs || [];

    return docs.filter((doc) => {
      const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
      const matchesSearch = `${doc.title} ${doc.projectName} ${doc.content}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [libraryQuery.data?.projectDocs, searchQuery, statusFilter]);

  const previewMarkdown = (title: string, subtitle: string, content: string) => {
    openModal({
      title,
      size: 'xl',
      content: (
        <div className="space-y-5">
          <p className="text-sm text-slate-500">{subtitle}</p>
          <div className="prose prose-slate max-w-none prose-headings:font-bold">
            <Markdown>{content}</Markdown>
          </div>
        </div>
      ),
      primaryAction: {
        label: 'Close',
        onClick: () => {},
      },
    });
  };

  const confirmDeleteRunbook = (runbook: ApiRunbook) => {
    openModal({
      title: 'Delete Runbook',
      content: (
        <p className="text-sm text-slate-600">
          Delete <span className="font-bold text-slate-900">{runbook.title}</span>? This removes it from the shared knowledge base.
        </p>
      ),
      primaryAction: {
        label: 'Delete',
        variant: 'danger',
        onClick: async () => {
          try {
            await apiFetch(`/runbooks/${runbook.id}`, { method: 'DELETE' });
            showToast('success', 'Runbook deleted.');
            libraryQuery.reload();
          } catch (error) {
            showToast('error', getErrorMessage(error));
            throw error;
          }
        },
      },
      secondaryAction: {
        label: 'Cancel',
        onClick: () => {},
      },
    });
  };

  const confirmDeleteDoc = (doc: ProjectDocWithProject) => {
    openModal({
      title: 'Delete Project Document',
      content: (
        <p className="text-sm text-slate-600">
          Delete <span className="font-bold text-slate-900">{doc.title}</span> from <span className="font-bold text-slate-900">{doc.projectName}</span>?
        </p>
      ),
      primaryAction: {
        label: 'Delete',
        variant: 'danger',
        onClick: async () => {
          try {
            await apiFetch(`/docs/${doc.id}`, { method: 'DELETE' });
            showToast('success', 'Project document deleted.');
            libraryQuery.reload();
          } catch (error) {
            showToast('error', getErrorMessage(error));
            throw error;
          }
        },
      },
      secondaryAction: {
        label: 'Cancel',
        onClick: () => {},
      },
    });
  };

  if (libraryQuery.isLoading) {
    return <LibrarySkeleton />;
  }

  if (libraryQuery.error || !libraryQuery.data) {
    return <LibraryError message={libraryQuery.error || 'Unable to load the knowledge base.'} onRetry={libraryQuery.reload} />;
  }

  const publishedRunbooks = libraryQuery.data.runbooks.filter((runbook) => runbook.status === 'PUBLISHED').length;
  const draftRunbooks = libraryQuery.data.runbooks.filter((runbook) => runbook.status === 'DRAFT').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
          <p className="mt-1 text-sm text-slate-500">Runbooks and project docs are loaded live from the backend with draft and publish state.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/agent/kb/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
          >
            <Plus className="h-4 w-4" />
            New Runbook
          </Link>
          <button
            onClick={libraryQuery.reload}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <MetricCard icon={BookOpenText} label="Runbooks" value={String(libraryQuery.data.runbooks.length)} accent="orange" />
        <MetricCard icon={FileText} label="Project Docs" value={String(libraryQuery.data.projectDocs.length)} accent="blue" />
        <MetricCard icon={BookOpenText} label="Published" value={String(publishedRunbooks)} accent="green" />
        <MetricCard icon={FileText} label="Drafts" value={String(draftRunbooks)} accent="blue" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex border-b border-slate-200">
            <TabButton label="Runbooks" active={activeTab === 'runbooks'} onClick={() => setActiveTab('runbooks')} />
            <TabButton label="Project Docs" active={activeTab === 'project-docs'} onClick={() => setActiveTab('project-docs')} />
          </div>
          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr),220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={activeTab === 'runbooks' ? 'Search runbooks...' : 'Search project docs...'}
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | KnowledgeStatus)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {activeTab === 'runbooks' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filteredRunbooks.length === 0 ? (
            <EmptyPanel title="No runbooks found" message="Try a different search or status filter, or create your first runbook." />
          ) : (
            filteredRunbooks.map((runbook) => (
              <article key={runbook.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{runbook.title}</h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700">{runbook.displayId}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-widest ${
                          runbook.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {humanizeEnum(runbook.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {runbook.category ? (
                        <span className="rounded-full bg-orange-50 px-2.5 py-1 font-bold uppercase tracking-wider text-orange-700">
                          {runbook.category}
                        </span>
                      ) : null}
                      {runbook.createdBy ? <span>{runbook.createdBy.name}</span> : null}
                      <span>|</span>
                      <span>Updated {formatRelativeTime(runbook.updatedAt)}</span>
                      {runbook.publishedAt ? (
                        <>
                          <span>|</span>
                          <span>Published {formatRelativeTime(runbook.publishedAt)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <button
                    onClick={() => confirmDeleteRunbook(runbook)}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${runbook.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-4 line-clamp-4 text-sm text-slate-500">{runbook.content}</p>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-400">Created {formatDateTime(runbook.createdAt)}</span>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/agent/kb/edit/${runbook.id}`}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => previewMarkdown(runbook.title, `Runbook ${runbook.displayId}`, runbook.content)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filteredDocs.length === 0 ? (
            <EmptyPanel title="No project docs found" message="Docs will appear here once they are created on the project-specific endpoints." />
          ) : (
            filteredDocs.map((doc) => (
              <article key={doc.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{doc.title}</h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-widest ${
                          doc.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {humanizeEnum(doc.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold uppercase tracking-wider text-blue-700">{doc.projectName}</span>
                      {doc.createdBy ? <span>{doc.createdBy.name}</span> : null}
                      <span>|</span>
                      <span>Updated {formatRelativeTime(doc.updatedAt)}</span>
                      {doc.publishedAt ? (
                        <>
                          <span>|</span>
                          <span>Published {formatRelativeTime(doc.publishedAt)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <button
                    onClick={() => confirmDeleteDoc(doc)}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${doc.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-4 line-clamp-4 text-sm text-slate-500">{doc.content}</p>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-400">Created {formatDateTime(doc.createdAt)}</span>
                  <button
                    onClick={() => previewMarkdown(doc.title, `Project document for ${doc.projectName}`, doc.content)}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                  >
                    Preview
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof BookOpenText;
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

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-5 py-3 text-sm font-bold transition-colors ${
        active ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-56 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-12 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      </div>
    </div>
  );
}

function LibraryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Knowledge base unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}

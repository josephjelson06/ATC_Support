import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { BookOpenText, Briefcase, Copy, FileQuestion, FileText, KeyRound, Pencil, Plus } from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import SectionTabs from '../../components/layout/SectionTabs';
import { FaqCrudPanel } from '../../components/entities/FaqCrudPanel';
import { ProjectDocCrudPanel } from '../../components/entities/ProjectDocCrudPanel';
import { ProjectCrudPanel } from '../../components/entities/ProjectCrudPanel';
import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch } from '../../lib/api';
import { formatDate, formatRelativeTime, humanizeEnum } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import type { ApiFaq, ApiProject, ApiProjectDoc, ProjectDetailTab } from '../../lib/types';

const detailTabs: ProjectDetailTab[] = ['overview', 'faqs', 'docs'];

export default function ProjectDetail() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { backendRole } = useRole();
  const { showToast } = useToast();
  const { id, tab } = useParams();
  const rawTab = (tab as ProjectDetailTab) || 'overview';
  const currentTab = detailTabs.includes(rawTab) ? rawTab : 'overview';

  if (!detailTabs.includes(rawTab) && id) {
    return <Navigate to={appPaths.projects.detail(id, 'overview')} replace />;
  }

  const projectQuery = useAsyncData(
    async () => {
      if (!id) {
        throw new Error('Project ID is missing.');
      }

      const project = await apiFetch<ApiProject>(`/projects/${id}`);
      const [docs, faqs] = await Promise.all([apiFetch<ApiProjectDoc[]>(`/projects/${id}/docs`), apiFetch<ApiFaq[]>(`/projects/${id}/faqs`)]);

      return {
        project,
        docs,
        faqs,
      };
    },
    [id],
  );

  if (projectQuery.isLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (projectQuery.error || !projectQuery.data) {
    return <ProjectDetailError message={projectQuery.error || 'Unable to load project details.'} onRetry={projectQuery.reload} />;
  }

  const { project, docs, faqs } = projectQuery.data;
  const canManageProjects = backendRole === 'PM';
  const canManageFaqs = backendRole === 'PM' || backendRole === 'PL';
  const canManageDocs = backendRole === 'PM' || backendRole === 'PL';
  const projectTabs = [
    { label: 'Overview', to: appPaths.projects.detail(project.id, 'overview') },
    { label: 'FAQs', to: appPaths.projects.detail(project.id, 'faqs') },
    { label: 'Project Docs', to: appPaths.projects.detail(project.id, 'docs') },
  ];

  const copyEmbedCode = async () => {
    if (!project.embedCode) {
      return;
    }

    await navigator.clipboard.writeText(project.embedCode);
    showToast('success', 'Embed snippet copied.');
  };

  const openEditModal = () => {
    openModal({
      title: `Edit ${project.name}`,
      size: 'lg',
      content: (
        <ProjectCrudPanel
          mode="edit"
          project={project}
          onCompleted={async () => {
            projectQuery.reload();
          }}
          onDeleted={async () => {
            navigate(appPaths.projects.list);
          }}
        />
      ),
    });
  };

  const openCreateDocModal = () => {
    openModal({
      title: `Add Doc to ${project.name}`,
      size: 'xl',
      content: (
        <ProjectDocCrudPanel
          mode="create"
          projectId={project.id}
          onCompleted={async () => {
            projectQuery.reload();
          }}
        />
      ),
    });
  };

  const openEditDocModal = (doc: ApiProjectDoc) => {
    openModal({
      title: 'Edit Project Doc',
      size: 'xl',
      content: (
        <ProjectDocCrudPanel
          mode="edit"
          projectId={project.id}
          doc={doc}
          onCompleted={async () => {
            projectQuery.reload();
          }}
          onDeleted={async () => {
            projectQuery.reload();
          }}
        />
      ),
    });
  };

  const openCreateFaqModal = () => {
    openModal({
      title: `Add FAQ to ${project.name}`,
      size: 'lg',
      content: (
        <FaqCrudPanel
          mode="create"
          projectId={project.id}
          onCompleted={async () => {
            projectQuery.reload();
          }}
        />
      ),
    });
  };

  const openEditFaqModal = (faq: ApiFaq) => {
    openModal({
      title: 'Edit FAQ',
      size: 'lg',
      content: (
        <FaqCrudPanel
          mode="edit"
          projectId={project.id}
          faq={faq}
          onCompleted={async () => {
            projectQuery.reload();
          }}
          onDeleted={async () => {
            projectQuery.reload();
          }}
        />
      ),
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={project.name}
        description={project.description || 'Project-level support context, widget controls, and delivery detail.'}
        breadcrumbs={[
          { label: 'Operations', to: appPaths.projects.list },
          { label: 'Projects', to: appPaths.projects.list },
          { label: project.name },
          { label: humanizeEnum(currentTab) },
        ]}
        badges={
          <>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-bold text-slate-700">{project.displayId}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
              {humanizeEnum(project.status)}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                project.widgetEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {project.widgetEnabled ? 'Widget Enabled' : 'Widget Disabled'}
            </span>
          </>
        }
      />

      <SectionTabs tabs={projectTabs} role={backendRole} />

      <div className="flex flex-col items-start gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:flex-row">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100">
          <Briefcase className="h-10 w-10 text-slate-400" />
        </div>
        <div className="flex-1">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-bold text-slate-900">{project.name}</h2>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {project.client ? <span>Client: {project.client.name}</span> : null}
                {project.assignedTo ? <span>| Lead: {project.assignedTo.name}</span> : null}
                <span>| Created {formatDate(project.createdAt)}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {project.widgetKey ? (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 font-mono text-sm text-white">
                  <KeyRound className="h-4 w-4" />
                  {project.widgetKey}
                </div>
              ) : null}
              {canManageProjects ? (
                <button
                  onClick={openEditModal}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Project
                </button>
              ) : null}
            </div>
          </div>
          {project.description ? <p className="mt-5 text-sm leading-relaxed text-slate-500">{project.description}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <ProjectDetailStat icon={KeyRound} label="Widget" value={project.widgetEnabled ? 'Enabled' : 'Disabled'} accent="green" />
        <ProjectDetailStat icon={FileText} label="Docs" value={String(docs.length)} accent="blue" />
        <ProjectDetailStat icon={FileQuestion} label="FAQs" value={String(faqs.length)} accent="orange" />
      </div>

      <div className="space-y-6">
        {currentTab === 'overview' ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Widget Status & Embed</h2>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">Widget Status</p>
                    <p className="mt-1 text-sm text-slate-500">{project.widgetEnabled ? 'The public widget is enabled for this project.' : 'The public widget is currently disabled.'}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                      project.widgetEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {project.widgetEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">Widget Key</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{project.widgetKey || 'No widget key available.'}</p>
                  </div>
                  {project.embedCode ? (
                    <button
                      onClick={() => void copyEmbedCode()}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  ) : null}
                </div>
                {project.embedCode ? (
                  <p className="mt-3 break-all rounded-xl bg-slate-50 px-3 py-3 font-mono text-[11px] text-slate-600">{project.embedCode}</p>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No embed snippet is available yet for this project.</p>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {currentTab === 'docs' ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Project Documentation</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {docs.length} document{docs.length === 1 ? '' : 's'}
                </p>
              </div>
              {canManageDocs ? (
                <button
                  onClick={openCreateDocModal}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Doc
                </button>
              ) : null}
            </div>
            <div className="divide-y divide-slate-100">
              {docs.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">No project docs are available yet.</div>
              ) : (
                docs.map((doc) => (
                  <div key={doc.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <BookOpenText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-900">{doc.title}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                                doc.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {humanizeEnum(doc.status)}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-3 text-sm text-slate-500">{doc.content}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
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
                      </div>
                      {canManageDocs ? (
                        <button
                          onClick={() => openEditDocModal(doc)}
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                          aria-label={`Edit doc ${doc.title}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}

        {currentTab === 'faqs' ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">FAQs</h2>
              {canManageFaqs ? (
                <button
                  onClick={openCreateFaqModal}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add FAQ
                </button>
              ) : null}
            </div>
            <div className="space-y-4 p-5">
              {faqs.length === 0 ? (
                <p className="text-sm text-slate-500">No FAQs configured for this project.</p>
              ) : (
                faqs.map((faq) => (
                  <div key={faq.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{faq.question}</p>
                        <p className="mt-2 text-sm text-slate-500">{faq.answer}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Order {faq.sortOrder}
                        </span>
                        {canManageFaqs ? (
                          <button
                            onClick={() => openEditFaqModal(faq)}
                            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                            aria-label={`Edit FAQ ${faq.question}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ProjectDetailStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
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

function ProjectDetailSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-5 w-36 rounded-xl bg-slate-200" />
      <div className="h-52 rounded-3xl border border-slate-200 bg-white shadow-sm" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="h-80 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-80 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        </div>
        <div className="space-y-6">
          <div className="h-60 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-60 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-56 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}

function ProjectDetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Project unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}

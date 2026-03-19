import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BookOpenText, Eye, RefreshCw, Save, Trash2 } from 'lucide-react';
import Markdown from 'react-markdown';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { createDraftSuggestion } from '../../lib/drafts';
import { formatDateTime, humanizeEnum } from '../../lib/format';
import type { ApiRunbook, ApiTicket, KnowledgeStatus } from '../../lib/types';

type FormState = {
  title: string;
  category: string;
  content: string;
  status: KnowledgeStatus;
};

const emptyForm: FormState = {
  title: '',
  category: 'Operations',
  content: '',
  status: 'DRAFT',
};

export default function RunbookEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const draftTicketId = searchParams.get('draftTicketId');
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initialForm, setInitialForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const editorQuery = useAsyncData(
    async () => {
      if (id) {
        const runbook = await apiFetch<ApiRunbook>(`/runbooks/${id}`);
        return { mode: 'runbook' as const, runbook };
      }

      if (draftTicketId) {
        const ticket = await apiFetch<ApiTicket>(`/tickets/${draftTicketId}`);
        return { mode: 'draft' as const, ticket };
      }

      return { mode: 'new' as const };
    },
    [id, draftTicketId],
  );

  useEffect(() => {
    if (!editorQuery.data) {
      return;
    }

    if (editorQuery.data.mode === 'runbook') {
      const nextForm = {
        title: editorQuery.data.runbook.title,
        category: editorQuery.data.runbook.category || 'Operations',
        content: editorQuery.data.runbook.content,
        status: editorQuery.data.runbook.status,
      };
      setForm(nextForm);
      setInitialForm(nextForm);
      return;
    }

    if (editorQuery.data.mode === 'draft') {
      const draft = createDraftSuggestion(editorQuery.data.ticket);
      const nextForm = {
        title: draft.title,
        category: draft.category,
        content: draft.content,
        status: 'DRAFT' as KnowledgeStatus,
      };
      setForm(nextForm);
      setInitialForm(nextForm);
      return;
    }

    setForm(emptyForm);
    setInitialForm(emptyForm);
  }, [editorQuery.data]);

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
  const isEditing = Boolean(id);
  const sourceTicket = editorQuery.data?.mode === 'draft' ? editorQuery.data.ticket : null;
  const existingRunbook = editorQuery.data?.mode === 'runbook' ? editorQuery.data.runbook : null;

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePreview = () => {
    openModal({
      title: form.title || 'Runbook Preview',
      size: 'xl',
      content: (
        <div className="space-y-5">
          <div>
            <p className="text-sm text-slate-500">{form.category || 'Uncategorized'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{form.title || 'Untitled Runbook'}</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-widest ${
                  form.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {humanizeEnum(form.status)}
              </span>
            </div>
          </div>
          <div className="prose prose-slate max-w-none">
            <Markdown>{form.content || '*No content yet.*'}</Markdown>
          </div>
        </div>
      ),
      primaryAction: {
        label: 'Close',
        onClick: () => {},
      },
    });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      showToast('error', 'Title and content are required.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim() || undefined,
        content: form.content.trim(),
        status: form.status,
      };

      const savedRunbook = isEditing
        ? await apiFetch<ApiRunbook>(`/runbooks/${id}`, { method: 'PATCH', body: payload })
        : await apiFetch<ApiRunbook>('/runbooks', { method: 'POST', body: payload });

      const nextForm = {
        title: savedRunbook.title,
        category: savedRunbook.category || 'Operations',
        content: savedRunbook.content,
        status: savedRunbook.status,
      };

      setForm(nextForm);
      setInitialForm(nextForm);
      showToast('success', isEditing ? 'Runbook updated successfully.' : 'Runbook created successfully.');

      if (!isEditing) {
        navigate(`/agent/kb/edit/${savedRunbook.id}`, { replace: true });
      }
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!isEditing || !id) {
      return;
    }

    openModal({
      title: 'Delete Runbook',
      content: (
        <p className="text-sm text-slate-600">
          Delete <span className="font-bold text-slate-900">{existingRunbook?.title || form.title}</span>? This cannot be undone.
        </p>
      ),
      primaryAction: {
        label: 'Delete',
        variant: 'danger',
        onClick: async () => {
          try {
            await apiFetch(`/runbooks/${id}`, { method: 'DELETE' });
            showToast('success', 'Runbook deleted.');
            navigate('/agent/kb');
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

  if (editorQuery.isLoading) {
    return <EditorSkeleton />;
  }

  if (editorQuery.error) {
    return <EditorError message={editorQuery.error} onRetry={editorQuery.reload} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <Link to="/agent/kb" className="text-sm font-medium text-slate-500 hover:text-slate-800">
            {'<-'} Back to Knowledge Base
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">{isEditing ? 'Edit Runbook' : 'Create Runbook'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {sourceTicket
              ? `This runbook is prefilled from resolved ticket ${sourceTicket.displayId}.`
              : 'Create or update a shared runbook with an explicit draft or published state.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => editorQuery.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
          <button
            onClick={handlePreview}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          {isEditing ? (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          ) : null}
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700 transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Runbook'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-5 border-b border-slate-100 p-8">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => handleChange('title', event.target.value)}
                placeholder="Runbook title"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr),220px]">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(event) => handleChange('category', event.target.value)}
                  placeholder="Operations"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => handleChange('status', event.target.value as KnowledgeStatus)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-8">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Markdown Content</label>
            <textarea
              value={form.content}
              onChange={(event) => handleChange('content', event.target.value)}
              placeholder="Write your runbook content in Markdown..."
              className="min-h-[32rem] w-full resize-y rounded-2xl border border-slate-200 px-4 py-4 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <BookOpenText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Editor State</p>
                <p className="text-lg font-bold text-slate-900">{isDirty ? 'Unsaved changes' : 'Up to date'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Publication State</p>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-widest ${
                  form.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {humanizeEnum(form.status)}
              </span>
              <span className="text-sm text-slate-500">
                {form.status === 'PUBLISHED'
                  ? 'Julia can use this content after save.'
                  : 'Draft content stays out of Julia retrieval until published.'}
              </span>
            </div>
          </div>

          {existingRunbook ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Runbook Metadata</p>
              {existingRunbook.createdBy ? <p className="text-sm text-slate-700">Author: {existingRunbook.createdBy.name}</p> : null}
              <p className="text-sm text-slate-700">Created: {formatDateTime(existingRunbook.createdAt)}</p>
              <p className="text-sm text-slate-700">Updated: {formatDateTime(existingRunbook.updatedAt)}</p>
              <p className="text-sm text-slate-700">Display ID: {existingRunbook.displayId}</p>
              <p className="text-sm text-slate-700">Published At: {existingRunbook.publishedAt ? formatDateTime(existingRunbook.publishedAt) : 'Not published yet'}</p>
            </div>
          ) : null}

          {sourceTicket ? (
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700">Draft Source Ticket</p>
              <p className="text-lg font-bold text-slate-900">{sourceTicket.title}</p>
              <p className="text-sm text-slate-600">{sourceTicket.description || 'No ticket description provided.'}</p>
              <Link to={`/agent/ticket/${sourceTicket.id}`} className="inline-flex text-sm font-bold text-purple-700 hover:text-purple-800">
                Open {sourceTicket.displayId}
              </Link>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Notes</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>- Draft runbooks stay out of Julia retrieval until they are published.</li>
              <li>- Category is optional but helps organization in the library and analytics.</li>
              <li>- Preview renders the same Markdown content you save.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="h-12 bg-white rounded-2xl border border-slate-200 shadow-sm" />
      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="h-[44rem] bg-white rounded-3xl border border-slate-200 shadow-sm" />
        <div className="space-y-6">
          <div className="h-28 bg-white rounded-2xl border border-slate-200 shadow-sm" />
          <div className="h-32 bg-white rounded-2xl border border-slate-200 shadow-sm" />
          <div className="h-48 bg-white rounded-2xl border border-slate-200 shadow-sm" />
          <div className="h-40 bg-white rounded-2xl border border-slate-200 shadow-sm" />
        </div>
      </div>
    </div>
  );
}

function EditorError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">Runbook editor unavailable</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button onClick={onRetry} className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}

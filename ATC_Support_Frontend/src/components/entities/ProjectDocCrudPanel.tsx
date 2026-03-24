import { useState } from 'react';
import { BookOpenText, RefreshCw, Trash2 } from 'lucide-react';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import type { ApiProjectDoc, KnowledgeStatus } from '../../lib/types';

type ProjectDocCrudPanelProps = {
  mode: 'create' | 'edit';
  projectId: number;
  doc?: Pick<ApiProjectDoc, 'id' | 'title' | 'content' | 'status'>;
  onCompleted?: (doc: ApiProjectDoc, mode: 'create' | 'edit') => void | Promise<void>;
  onDeleted?: (docId: number) => void | Promise<void>;
};

type FormState = {
  title: string;
  status: KnowledgeStatus;
  content: string;
};

export function ProjectDocCrudPanel({ mode, projectId, doc, onCompleted, onDeleted }: ProjectDocCrudPanelProps) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>({
    title: doc?.title || '',
    status: doc?.status || 'PUBLISHED',
    content: doc?.content || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (form.title.trim().length < 2) {
      setError('Document title must be at least 2 characters.');
      return;
    }

    if (form.content.trim().length < 10) {
      setError('Document content must be at least 10 characters.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        status: form.status,
      };

      const savedDoc =
        mode === 'create'
          ? await apiFetch<ApiProjectDoc>(`/projects/${projectId}/docs`, { method: 'POST', body: payload })
          : await apiFetch<ApiProjectDoc>(`/docs/${doc?.id}`, { method: 'PATCH', body: payload });

      await onCompleted?.(savedDoc, mode);
      showToast('success', mode === 'create' ? 'Project doc created successfully.' : 'Project doc updated successfully.');
      closeModal();
    } catch (submitError) {
      const message = getErrorMessage(submitError);
      setError(message);
      showToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!doc?.id || mode !== 'edit') {
      return;
    }

    const shouldDelete = window.confirm(`Delete the project doc "${doc.title}"?`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      await apiFetch<void>(`/docs/${doc.id}`, { method: 'DELETE' });
      await onDeleted?.(doc.id);
      showToast('success', 'Project doc deleted successfully.');
      closeModal();
    } catch (deleteError) {
      const message = getErrorMessage(deleteError);
      setError(message);
      showToast('error', message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
            <BookOpenText className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Project documentation</p>
            <p className="mt-1">Docs are internal reference material shown in the project detail view.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr),220px]">
        <Field label="Title">
          <input
            type="text"
            value={form.title}
            onChange={handleChange('title')}
            placeholder="Integration steps, deployment checklist, escalation SOP..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={handleChange('status')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </Field>
      </div>

      <Field label="Content">
        <textarea
          value={form.content}
          onChange={handleChange('content')}
          rows={10}
          placeholder="Write the steps, SOP, or notes the engineering team should follow..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting || isSaving}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Doc'}
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || isDeleting}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : mode === 'create' ? 'Create Doc' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}


import { useState } from 'react';
import { MessageCircleQuestion, RefreshCw, Trash2 } from 'lucide-react';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import type { ApiFaq } from '../../lib/types';

type FaqCrudPanelProps = {
  mode: 'create' | 'edit';
  projectId: number;
  faq?: Pick<ApiFaq, 'id' | 'question' | 'answer' | 'sortOrder'>;
  onCompleted?: (faq: ApiFaq, mode: 'create' | 'edit') => void | Promise<void>;
  onDeleted?: (faqId: number) => void | Promise<void>;
};

type FormState = {
  question: string;
  answer: string;
  sortOrder: string;
};

export function FaqCrudPanel({ mode, projectId, faq, onCompleted, onDeleted }: FaqCrudPanelProps) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>({
    question: faq?.question || '',
    answer: faq?.answer || '',
    sortOrder: faq?.sortOrder !== undefined ? String(faq.sortOrder) : '0',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (form.question.trim().length < 5) {
      setError('FAQ question must be at least 5 characters.');
      return;
    }

    if (form.answer.trim().length < 5) {
      setError('FAQ answer must be at least 5 characters.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        sortOrder: Number(form.sortOrder) || 0,
      };

      const savedFaq =
        mode === 'create'
          ? await apiFetch<ApiFaq>(`/projects/${projectId}/faqs`, { method: 'POST', body: payload })
          : await apiFetch<ApiFaq>(`/faqs/${faq?.id}`, { method: 'PATCH', body: payload });

      await onCompleted?.(savedFaq, mode);
      showToast('success', mode === 'create' ? 'FAQ created successfully.' : 'FAQ updated successfully.');
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
    if (!faq?.id || mode !== 'edit') {
      return;
    }

    const shouldDelete = window.confirm(`Delete the FAQ "${faq.question}"?`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      await apiFetch<void>(`/faqs/${faq.id}`, { method: 'DELETE' });
      await onDeleted?.(faq.id);
      showToast('success', 'FAQ deleted successfully.');
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
            <MessageCircleQuestion className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Widget FAQ Entry</p>
            <p className="mt-1">These FAQs appear in the project widget before a client asks Julia or escalates to a human.</p>
          </div>
        </div>
      </div>

      <Field label="Question">
        <input
          type="text"
          value={form.question}
          onChange={handleChange('question')}
          placeholder="How do I reset my warehouse portal password?"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      <Field label="Answer">
        <textarea
          value={form.answer}
          onChange={handleChange('answer')}
          rows={5}
          placeholder="Use the Forgot Password link on the login screen. If the email does not arrive within 5 minutes, contact support."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px,minmax(0,1fr)]">
        <Field label="Sort Order">
          <input
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={handleChange('sortOrder')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Lower sort order values appear earlier in the widget and client portal FAQ list.
        </div>
      </div>

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
              {isDeleting ? 'Deleting...' : 'Delete FAQ'}
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
            {isSaving ? 'Saving...' : mode === 'create' ? 'Create FAQ' : 'Save Changes'}
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

import { useState } from 'react';
import { Bot, RefreshCw } from 'lucide-react';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import type { ApiProject } from '../../lib/types';

type JuliaConfigPanelProps = {
  projectId: number;
  projectName: string;
  initialGreeting?: string | null;
  initialFallbackMessage?: string | null;
  initialEscalationHint?: string | null;
  initialAllowedDomains?: string[] | null;
  onCompleted?: (project: ApiProject) => void | Promise<void>;
};

type FormState = {
  juliaGreeting: string;
  juliaFallbackMessage: string;
  juliaEscalationHint: string;
  widgetAllowedDomains: string;
};

export function JuliaConfigPanel({
  projectId,
  projectName,
  initialGreeting,
  initialFallbackMessage,
  initialEscalationHint,
  initialAllowedDomains,
  onCompleted,
}: JuliaConfigPanelProps) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>({
    juliaGreeting: initialGreeting || '',
    juliaFallbackMessage: initialFallbackMessage || '',
    juliaEscalationHint: initialEscalationHint || '',
    widgetAllowedDomains: (initialAllowedDomains || []).join('\n'),
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const value = event.target.value;
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.juliaFallbackMessage.trim()) {
      setError('Julia fallback message is required for Phase A readiness.');
      return;
    }

    if (!form.juliaEscalationHint.trim()) {
      setError('Julia escalation hint is required for Phase A readiness.');
      return;
    }

    const normalizedAllowedDomains = form.widgetAllowedDomains
      .split('\n')
      .map((domain) => domain.trim())
      .filter(Boolean);

    if (normalizedAllowedDomains.length === 0) {
      setError('At least one allowed widget origin is required for packaged delivery.');
      return;
    }

    setIsSaving(true);

    try {
      const updatedProject = await apiFetch<ApiProject>(`/projects/${projectId}/julia-config`, {
        method: 'PATCH',
        body: {
          juliaGreeting: form.juliaGreeting.trim() || null,
          juliaFallbackMessage: form.juliaFallbackMessage.trim() || null,
          juliaEscalationHint: form.juliaEscalationHint.trim() || null,
          widgetAllowedDomains: normalizedAllowedDomains,
        },
      });

      await onCompleted?.(updatedProject);
      showToast('success', 'Julia configuration saved.');
      closeModal();
    } catch (submitError) {
      const message = getErrorMessage(submitError);
      setError(message);
      showToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Julia Phase A Configuration</p>
            <p className="mt-1">
              These messages control how Julia greets users, falls back when unsure, and nudges people toward escalation for{' '}
              {projectName}.
            </p>
          </div>
        </div>
      </div>

      <Field label="Julia Greeting (optional)">
        <textarea
          value={form.juliaGreeting}
          onChange={handleChange('juliaGreeting')}
          rows={3}
          placeholder="Hi, I am Julia for this project. Tell me what is blocking your work and I will check the approved project knowledge first."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      <Field label="Fallback Message">
        <textarea
          value={form.juliaFallbackMessage}
          onChange={handleChange('juliaFallbackMessage')}
          rows={4}
          placeholder="I do not have enough approved project context to answer confidently yet."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      <Field label="Escalation Hint">
        <textarea
          value={form.juliaEscalationHint}
          onChange={handleChange('juliaEscalationHint')}
          rows={4}
          placeholder="If this is affecting live work, approvals, dispatch, billing, or access, escalating to support is the safest next step."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      <Field label="Allowed Widget Origins">
        <textarea
          value={form.widgetAllowedDomains}
          onChange={handleChange('widgetAllowedDomains')}
          rows={4}
          placeholder={'http://localhost:3000\nhttps://support.client.com\nhttps://staging.client.com'}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
        <p className="mt-2 text-xs text-slate-500">
          Add one full origin per line. Julia Phase A packaged delivery only works from the origins listed here.
        </p>
      </Field>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={closeModal}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
        >
          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
          {isSaving ? 'Saving...' : 'Save Julia Config'}
        </button>
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

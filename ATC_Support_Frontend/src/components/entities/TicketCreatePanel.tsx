import { useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Ticket } from 'lucide-react';

import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import type { ApiProject, ApiTicket, TicketPriority } from '../../lib/types';

type TicketCreatePanelProps = {
  projects: ApiProject[];
  onCompleted?: (ticket: ApiTicket) => void | Promise<void>;
};

type FormState = {
  widgetKey: string;
  requesterName: string;
  requesterEmail: string;
  title: string;
  description: string;
  priority: TicketPriority;
};

export function TicketCreatePanel({ projects, onCompleted }: TicketCreatePanelProps) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const { backendRole } = useRole();

  const eligibleProjects = useMemo(
    () =>
      projects
        .filter((project) => Boolean(project.widgetKey))
        .sort((left, right) => `${left.client?.name || ''} ${left.name}`.localeCompare(`${right.client?.name || ''} ${right.name}`)),
    [projects],
  );

  const [form, setForm] = useState<FormState>(() => ({
    widgetKey: eligibleProjects.find((project) => project.widgetEnabled)?.widgetKey || eligibleProjects[0]?.widgetKey || '',
    requesterName: '',
    requesterEmail: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
  }));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

    if (!form.widgetKey) {
      setError('Select a project to link this ticket.');
      return;
    }

    if (form.requesterName.trim().length < 2) {
      setError('Requester name must be at least 2 characters.');
      return;
    }

    if (!form.requesterEmail.trim().includes('@')) {
      setError('Enter a valid requester email address.');
      return;
    }

    if (form.title.trim().length < 3) {
      setError('Ticket title must be at least 3 characters.');
      return;
    }

    setIsSaving(true);

    try {
      const created = await apiFetch<ApiTicket>('/tickets', {
        method: 'POST',
        body: {
          widgetKey: form.widgetKey,
          name: form.requesterName.trim(),
          email: form.requesterEmail.trim(),
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          priority: form.priority,
        },
      });

      // Internal staff typically logs tickets for themselves, so we immediately claim it when allowed.
      const ticket =
        backendRole === 'SE' || backendRole === 'PL'
          ? await apiFetch<ApiTicket>(`/tickets/${created.id}/assign`, { method: 'POST', body: {} })
          : created;

      await onCompleted?.(ticket);
      showToast('success', 'Ticket created successfully.');
      closeModal();
    } catch (submitError) {
      const message = getErrorMessage(submitError);
      setError(message);
      showToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedProject = eligibleProjects.find((project) => project.widgetKey === form.widgetKey) || null;
  const widgetDisabled = selectedProject ? !selectedProject.widgetEnabled : false;
  const canSubmit = Boolean(form.widgetKey) && !widgetDisabled && !isSaving;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
            <Ticket className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Log a new support ticket</p>
            <p className="mt-1">Use this to capture calls or walk-in requests when the widget is not involved.</p>
          </div>
        </div>
      </div>

      <Field label="Project">
        <select
          value={form.widgetKey}
          onChange={handleChange('widgetKey')}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Select a project</option>
          {eligibleProjects.map((project) => (
            <option key={project.id} value={project.widgetKey || ''} disabled={!project.widgetEnabled}>
              {project.client?.name ? `${project.client.name} • ` : ''}
              {project.name}
              {!project.widgetEnabled ? ' (widget disabled)' : ''}
            </option>
          ))}
        </select>
      </Field>

      {widgetDisabled ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>This project widget is disabled, so new tickets cannot be created here yet.</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Requester Name">
          <input
            type="text"
            value={form.requesterName}
            onChange={handleChange('requesterName')}
            placeholder="Client contact name"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <Field label="Requester Email">
          <input
            type="email"
            value={form.requesterEmail}
            onChange={handleChange('requesterEmail')}
            placeholder="client@example.com"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr),220px]">
        <Field label="Title">
          <input
            type="text"
            value={form.title}
            onChange={handleChange('title')}
            placeholder="Short summary of the issue"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <Field label="Priority">
          <select
            value={form.priority}
            onChange={handleChange('priority')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </Field>
      </div>

      <Field label="Description (Optional)">
        <textarea
          value={form.description}
          onChange={handleChange('description')}
          rows={5}
          placeholder="Add any context, steps to reproduce, hardware details, or urgency notes..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
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
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
        >
          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
          {isSaving ? 'Creating...' : 'Create Ticket'}
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


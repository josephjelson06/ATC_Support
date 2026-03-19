import { useMemo, useState } from 'react';
import { Info, RefreshCw, Trash2 } from 'lucide-react';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { formatRoleLabel } from '../../lib/format';
import type { ApiClient, ApiProject, ApiUser, BackendRole, ProjectStatus } from '../../lib/types';

type ProjectCrudPanelProps = {
  mode: 'create' | 'edit';
  project?: Pick<
    ApiProject,
    | 'id'
    | 'clientId'
    | 'assignedToId'
    | 'name'
    | 'description'
    | 'status'
    | 'widgetKey'
    | 'widgetEnabled'
    | 'embedCode'
    | 'juliaGreeting'
    | 'juliaFallbackMessage'
    | 'juliaEscalationHint'
  >;
  onCompleted?: (project: ApiProject, mode: 'create' | 'edit') => void | Promise<void>;
  onDeleted?: (projectId: number) => void | Promise<void>;
};

type FormState = {
  clientId: string;
  assignedToId: string;
  name: string;
  description: string;
  widgetEnabled: boolean;
  juliaGreeting: string;
  juliaFallbackMessage: string;
  juliaEscalationHint: string;
  status: ProjectStatus;
};

export function ProjectCrudPanel({ mode, project, onCompleted, onDeleted }: ProjectCrudPanelProps) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>({
    clientId: project?.clientId ? String(project.clientId) : '',
    assignedToId: project?.assignedToId ? String(project.assignedToId) : '',
    name: project?.name || '',
    description: project?.description || '',
    widgetEnabled: project?.widgetEnabled ?? true,
    juliaGreeting: project?.juliaGreeting || '',
    juliaFallbackMessage: project?.juliaFallbackMessage || '',
    juliaEscalationHint: project?.juliaEscalationHint || '',
    status: project?.status || 'ACTIVE',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const dependenciesQuery = useAsyncData(
    async () => {
      const [clients, users] = await Promise.all([apiFetch<ApiClient[]>('/clients'), apiFetch<ApiUser[]>('/users')]);
      return { clients, users };
    },
    [],
  );

  const projectLeads = useMemo(
    () => (dependenciesQuery.data?.users || []).filter((user) => user.role === 'PL'),
    [dependenciesQuery.data?.users],
  );

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleCheckboxChange =
    (field: 'widgetEnabled') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.checked;
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.clientId) {
      setError('Select a client before saving this project.');
      return;
    }

    if (form.name.trim().length < 2) {
      setError('Project name must be at least 2 characters.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        clientId: Number(form.clientId),
        assignedToId: form.assignedToId ? Number(form.assignedToId) : null,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        widgetEnabled: form.widgetEnabled,
        juliaGreeting: form.juliaGreeting.trim() || undefined,
        juliaFallbackMessage: form.juliaFallbackMessage.trim() || undefined,
        juliaEscalationHint: form.juliaEscalationHint.trim() || undefined,
        status: form.status,
      };

      const savedProject =
        mode === 'create'
          ? await apiFetch<ApiProject>('/projects', { method: 'POST', body: payload })
          : await apiFetch<ApiProject>(`/projects/${project?.id}`, { method: 'PATCH', body: payload });

      await onCompleted?.(savedProject, mode);
      showToast('success', mode === 'create' ? 'Project created successfully.' : 'Project updated successfully.');
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
    if (!project?.id || mode !== 'edit') {
      return;
    }

    const shouldDelete = window.confirm(`Delete ${project.name}? This cannot be undone.`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      await apiFetch<void>(`/projects/${project.id}`, { method: 'DELETE' });
      await onDeleted?.(project.id);
      showToast('success', 'Project deleted successfully.');
      closeModal();
    } catch (deleteError) {
      const message = getErrorMessage(deleteError);
      setError(message);
      showToast('error', message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (dependenciesQuery.isLoading) {
    return <PanelState title="Loading project options" description="Fetching clients and project leads from the backend." />;
  }

  if (dependenciesQuery.error || !dependenciesQuery.data) {
    return <PanelError message={dependenciesQuery.error || 'Unable to load clients and project leads.'} onRetry={dependenciesQuery.reload} />;
  }

  const hasClients = dependenciesQuery.data.clients.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!hasClients ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Create at least one client before creating a project.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Client">
          <select
            value={form.clientId}
            onChange={handleChange('clientId')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select a client</option>
            {dependenciesQuery.data.clients.map((client) => (
              <option key={client.id} value={String(client.id)}>
                {client.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Project Lead">
          <select
            value={form.assignedToId}
            onChange={handleChange('assignedToId')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Unassigned</option>
            {projectLeads.map((user) => (
              <option key={user.id} value={String(user.id)}>
                {user.name} ({formatRoleLabel(user.role as BackendRole)})
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Project Name">
        <input
          type="text"
          value={form.name}
          onChange={handleChange('name')}
          placeholder="Warehouse Portal Support"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      <Field label="Description">
        <textarea
          value={form.description}
          onChange={handleChange('description')}
          rows={4}
          placeholder="Short description of the project scope and support context."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr),220px]">
        <Field label="Julia Greeting">
          <textarea
            value={form.juliaGreeting}
            onChange={handleChange('juliaGreeting')}
            rows={3}
            placeholder="Welcome to Warehouse Portal support. I can help with known issues before routing you to the team."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <div className="space-y-4">
          <Field label="Status">
            <select
              value={form.status}
              onChange={handleChange('status')}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={form.widgetEnabled}
              onChange={handleCheckboxChange('widgetEnabled')}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <div>
              <p className="text-sm font-bold text-slate-900">Widget Enabled</p>
              <p className="mt-1 text-xs text-slate-500">Disable this to block FAQ, Julia chat, and escalation for this project.</p>
            </div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Julia Fallback Message">
          <textarea
            value={form.juliaFallbackMessage}
            onChange={handleChange('juliaFallbackMessage')}
            rows={4}
            placeholder="I couldn't find a confident answer in the published knowledge. Please escalate and the team will pick it up."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <Field label="Julia Escalation Hint">
          <textarea
            value={form.juliaEscalationHint}
            onChange={handleChange('juliaEscalationHint')}
            rows={4}
            placeholder="If the issue affects production, include the exact screen, user, and time of failure."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
      </div>

      {mode === 'edit' && project?.widgetKey ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div>
              <p className="font-bold">Widget key</p>
              <p className="mt-1 font-mono text-xs text-slate-600">{project.widgetKey}</p>
            </div>
          </div>
          {project.embedCode ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Embed Snippet</p>
              <p className="mt-2 break-all font-mono text-[11px] text-slate-600">{project.embedCode}</p>
            </div>
          ) : null}
        </div>
      ) : null}

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
              {isDeleting ? 'Deleting…' : 'Delete Project'}
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!hasClients || isSaving || isDeleting}
            className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {isSaving ? 'Saving…' : mode === 'create' ? 'Create Project' : 'Save Changes'}
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

function PanelState({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-lg font-black text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
      <p className="text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-50"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}

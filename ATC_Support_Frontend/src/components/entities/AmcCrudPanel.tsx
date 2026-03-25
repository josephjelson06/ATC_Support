import { CalendarRange, Link2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import type { AmcStatus, ApiAmc, ApiProject } from '../../lib/types';

type AmcCrudPanelProps = {
  mode: 'create' | 'edit';
  clientId: number;
  projects: Pick<ApiProject, 'id' | 'name' | 'displayId' | 'status'>[];
  amc?: Pick<ApiAmc, 'id' | 'projectId' | 'hoursIncluded' | 'hoursUsed' | 'startDate' | 'endDate' | 'status'>;
  onCompleted?: (amc: ApiAmc, mode: 'create' | 'edit') => void | Promise<void>;
  onDeleted?: (amcId: number) => void | Promise<void>;
};

type FormState = {
  projectId: string;
  hoursIncluded: string;
  hoursUsed: string;
  startDate: string;
  endDate: string;
  status: AmcStatus;
};

const toDateInput = (value?: string | null) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export function AmcCrudPanel({ mode, clientId, projects, amc, onCompleted, onDeleted }: AmcCrudPanelProps) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>({
    projectId: amc?.projectId ? String(amc.projectId) : '',
    hoursIncluded: amc ? String(amc.hoursIncluded) : '',
    hoursUsed: amc ? String(amc.hoursUsed) : '0',
    startDate: toDateInput(amc?.startDate),
    endDate: toDateInput(amc?.endDate),
    status: amc?.status || 'ACTIVE',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const hoursIncluded = Number(form.hoursIncluded);
    const hoursUsed = Number(form.hoursUsed);

    if (!Number.isInteger(hoursIncluded) || hoursIncluded < 0) {
      setError('Hours included must be a non-negative whole number.');
      return;
    }

    if (!Number.isInteger(hoursUsed) || hoursUsed < 0) {
      setError('Hours used must be a non-negative whole number.');
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError('Start date and end date are required.');
      return;
    }

    if (form.endDate < form.startDate) {
      setError('End date must be on or after the start date.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        projectId: form.projectId ? Number(form.projectId) : null,
        hoursIncluded,
        hoursUsed,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      };

      const savedAmc =
        mode === 'create'
          ? await apiFetch<ApiAmc>(`/clients/${clientId}/amcs`, { method: 'POST', body: payload })
          : await apiFetch<ApiAmc>(`/amcs/${amc?.id}`, { method: 'PATCH', body: payload });

      await onCompleted?.(savedAmc, mode);
      showToast('success', mode === 'create' ? 'AMC created successfully.' : 'AMC updated successfully.');
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
    if (mode !== 'edit' || !amc?.id) {
      return;
    }

    const shouldDelete = window.confirm('Delete this AMC record? This cannot be undone.');

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      await apiFetch<void>(`/amcs/${amc.id}`, { method: 'DELETE' });
      await onDeleted?.(amc.id);
      showToast('success', 'AMC deleted successfully.');
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
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900">AMC contract record</p>
            <p className="mt-1">
              AMCs belong to the client first and can optionally be linked to one project. Only one active AMC should exist per project.
            </p>
          </div>
        </div>
      </div>

      <Field label="Linked Project">
        <select
          value={form.projectId}
          onChange={handleChange('projectId')}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        >
          <option value="">General client AMC (no project link)</option>
          {projects.map((projectOption) => (
            <option key={projectOption.id} value={String(projectOption.id)}>
              {projectOption.name} ({projectOption.displayId})
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Hours Included">
          <input
            type="number"
            min={0}
            step={1}
            value={form.hoursIncluded}
            onChange={handleChange('hoursIncluded')}
            placeholder="24"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <Field label="Hours Used">
          <input
            type="number"
            min={0}
            step={1}
            value={form.hoursUsed}
            onChange={handleChange('hoursUsed')}
            placeholder="0"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={handleChange('status')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          >
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Start Date">
          <div className="relative">
            <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={form.startDate}
              onChange={handleChange('startDate')}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </Field>
        <Field label="End Date">
          <div className="relative">
            <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={form.endDate}
              onChange={handleChange('endDate')}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </Field>
      </div>

      {form.projectId ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p>
              This AMC will be linked to{' '}
              <span className="font-bold text-slate-900">
                {projects.find((projectOption) => String(projectOption.id) === form.projectId)?.name || 'the selected project'}
              </span>{' '}
              and will show up in the client AMC register as project coverage.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <p>
            This AMC will stay at the client level only. You can link it to a project later if needed.
          </p>
        </div>
      )}

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
              {isDeleting ? 'Deleting...' : 'Delete AMC'}
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
            {isSaving ? 'Saving...' : mode === 'create' ? 'Create AMC' : 'Save Changes'}
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

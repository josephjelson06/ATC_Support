import { useState } from 'react';
import { Building2, RefreshCw, Trash2 } from 'lucide-react';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import type { ApiClient, ClientStatus } from '../../lib/types';

type ClientCrudPanelProps = {
  mode: 'create' | 'edit';
  client?: Pick<ApiClient, 'id' | 'name' | 'industry' | 'address' | 'city' | 'phone' | 'email' | 'website' | 'notes' | 'status'>;
  onCompleted?: (client: ApiClient, mode: 'create' | 'edit') => void | Promise<void>;
  onDeleted?: (clientId: number) => void | Promise<void>;
};

type FormState = {
  name: string;
  industry: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  notes: string;
  status: ClientStatus;
};

export function ClientCrudPanel({ mode, client, onCompleted, onDeleted }: ClientCrudPanelProps) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>({
    name: client?.name || '',
    industry: client?.industry || '',
    address: client?.address || '',
    city: client?.city || '',
    phone: client?.phone || '',
    email: client?.email || '',
    website: client?.website || '',
    notes: client?.notes || '',
    status: client?.status || 'ACTIVE',
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

    if (form.name.trim().length < 2) {
      setError('Client name must be at least 2 characters.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        industry: form.industry.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        website: form.website.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: form.status,
      };

      const savedClient =
        mode === 'create'
          ? await apiFetch<ApiClient>('/clients', { method: 'POST', body: payload })
          : await apiFetch<ApiClient>(`/clients/${client?.id}`, { method: 'PATCH', body: payload });

      await onCompleted?.(savedClient, mode);
      showToast('success', mode === 'create' ? 'Client created successfully.' : 'Client updated successfully.');
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
    if (!client?.id || mode !== 'edit') {
      return;
    }

    const shouldDelete = window.confirm(`Delete ${client.name}? This cannot be undone.`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      await apiFetch<void>(`/clients/${client.id}`, { method: 'DELETE' });
      await onDeleted?.(client.id);
      showToast('success', 'Client deleted successfully.');
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
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Client profile</p>
            <p className="mt-1">
              Capture the client organization plus the contact metadata surfaced across PM and support-engineer workflows.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Client Name">
          <input
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            placeholder="Acme Logistics"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <Field label="Industry">
          <input
            type="text"
            value={form.industry}
            onChange={handleChange('industry')}
            placeholder="Logistics"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="support@acme.com"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <Field label="Phone">
          <input
            type="text"
            value={form.phone}
            onChange={handleChange('phone')}
            placeholder="+1 555 010 2020"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="City">
          <input
            type="text"
            value={form.city}
            onChange={handleChange('city')}
            placeholder="New York"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <Field label="Website">
          <input
            type="url"
            value={form.website}
            onChange={handleChange('website')}
            placeholder="https://acme.com"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
      </div>

      <Field label="Address">
        <textarea
          value={form.address}
          onChange={handleChange('address')}
          rows={3}
          placeholder="123 Support Street, Midtown"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr),220px]">
        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={handleChange('notes')}
            rows={4}
            placeholder="Contract notes, internal reminders, or escalation context."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
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
              {isDeleting ? 'Deleting...' : 'Delete Client'}
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
            {isSaving ? 'Saving...' : mode === 'create' ? 'Create Client' : 'Save Changes'}
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

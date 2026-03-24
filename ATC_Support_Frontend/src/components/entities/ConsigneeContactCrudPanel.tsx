import { useState } from 'react';
import { RefreshCw, Trash2, Users } from 'lucide-react';

import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import type { ApiConsigneeContact } from '../../lib/types';

type ConsigneeContactCrudPanelProps = {
  mode: 'create' | 'edit';
  consigneeId: number;
  contact?: Pick<ApiConsigneeContact, 'id' | 'name' | 'email' | 'phone' | 'designation'>;
  onCompleted?: (contact: ApiConsigneeContact, mode: 'create' | 'edit') => void | Promise<void>;
  onDeleted?: (contactId: number) => void | Promise<void>;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  designation: string;
};

export function ConsigneeContactCrudPanel({ mode, consigneeId, contact, onCompleted, onDeleted }: ConsigneeContactCrudPanelProps) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>({
    name: contact?.name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    designation: contact?.designation || '',
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

    if (form.name.trim().length < 2) {
      setError('Contact name must be at least 2 characters.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        designation: form.designation.trim() || undefined,
      };

      const saved =
        mode === 'create'
          ? await apiFetch<ApiConsigneeContact>(`/consignees/${consigneeId}/contacts`, { method: 'POST', body: payload })
          : await apiFetch<ApiConsigneeContact>(`/consignee-contacts/${contact?.id}`, { method: 'PATCH', body: payload });

      await onCompleted?.(saved, mode);
      showToast('success', mode === 'create' ? 'Contact created successfully.' : 'Contact updated successfully.');
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
    if (!contact?.id || mode !== 'edit') {
      return;
    }

    const shouldDelete = window.confirm(`Delete the contact "${contact.name}"?`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      await apiFetch<void>(`/consignee-contacts/${contact.id}`, { method: 'DELETE' });
      await onDeleted?.(contact.id);
      showToast('success', 'Contact deleted successfully.');
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
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Consignee contact</p>
            <p className="mt-1">Site-level contacts help route onsite or delivery queries faster.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Name">
          <input
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            placeholder="Contact name"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <Field label="Designation (Optional)">
          <input
            type="text"
            value={form.designation}
            onChange={handleChange('designation')}
            placeholder="Warehouse Supervisor"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Email (Optional)">
          <input
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="contact@example.com"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
        </Field>
        <Field label="Phone (Optional)">
          <input
            type="text"
            value={form.phone}
            onChange={handleChange('phone')}
            placeholder="+91 99999 99999"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
          />
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
              {isDeleting ? 'Deleting...' : 'Delete Contact'}
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
            {isSaving ? 'Saving...' : mode === 'create' ? 'Create Contact' : 'Save Changes'}
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


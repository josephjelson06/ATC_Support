import { Trash2 } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';

import { useToast } from '../../contexts/ToastContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import type { ApiHardwareBrand, HardwareCategory } from '../../lib/types';

type HardwareBrandCrudPanelProps = {
  mode: 'create' | 'edit';
  hardwareBrand?: ApiHardwareBrand;
  onCompleted: () => Promise<void> | void;
  onDeleted?: () => Promise<void> | void;
};

const categories: HardwareCategory[] = ['PRINTER', 'SCANNER', 'NETWORK_DEVICE', 'COMPUTER', 'PERIPHERAL', 'OTHER'];
const fieldInputClasses =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-orange-200 focus:ring-2 focus:ring-orange-500';

export function HardwareBrandCrudPanel({ mode, hardwareBrand, onCompleted, onDeleted }: HardwareBrandCrudPanelProps) {
  const { showToast } = useToast();
  const [category, setCategory] = useState<HardwareCategory>(hardwareBrand?.category || 'OTHER');
  const [name, setName] = useState(hardwareBrand?.name || '');
  const [vendorSupportUrl, setVendorSupportUrl] = useState(hardwareBrand?.vendorSupportUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        category,
        name: name.trim(),
        vendorSupportUrl: vendorSupportUrl.trim() || undefined,
      };

      if (mode === 'create') {
        await apiFetch('/hardware-catalog/brands', {
          method: 'POST',
          body: payload,
        });
      } else if (hardwareBrand) {
        await apiFetch(`/hardware-catalog/brands/${hardwareBrand.id}`, {
          method: 'PATCH',
          body: payload,
        });
      }

      showToast('success', mode === 'create' ? 'Hardware brand added.' : 'Hardware brand updated.');
      await onCompleted();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!hardwareBrand) {
      return;
    }

    setIsDeleting(true);

    try {
      await apiFetch(`/hardware-catalog/brands/${hardwareBrand.id}`, {
        method: 'DELETE',
      });
      showToast('success', 'Hardware brand deleted.');
      await (onDeleted || onCompleted)();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Category">
          <select value={category} onChange={(event) => setCategory(event.target.value as HardwareCategory)} className={fieldInputClasses}>
            {categories.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand Name">
          <input value={name} onChange={(event) => setName(event.target.value)} className={fieldInputClasses} placeholder="Honeywell" required />
        </Field>
        <Field label="Brand Support URL">
          <input value={vendorSupportUrl} onChange={(event) => setVendorSupportUrl(event.target.value)} className={fieldInputClasses} placeholder="https://..." />
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        {mode === 'edit' && hardwareBrand ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Brand'}
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : mode === 'create' ? 'Add Brand' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

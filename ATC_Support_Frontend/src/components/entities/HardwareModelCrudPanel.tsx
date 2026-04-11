import { Trash2 } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { useToast } from '../../contexts/ToastContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import type { ApiHardwareBrand, ApiHardwareModel, HardwareCategory } from '../../lib/types';

type HardwareModelCrudPanelProps = {
  mode: 'create' | 'edit';
  hardwareBrands: ApiHardwareBrand[];
  initialCategory?: HardwareCategory;
  hardwareModel?: ApiHardwareModel;
  onCompleted: () => Promise<void> | void;
  onDeleted?: () => Promise<void> | void;
};

const categories: HardwareCategory[] = ['PRINTER', 'SCANNER', 'NETWORK_DEVICE', 'COMPUTER', 'PERIPHERAL', 'OTHER'];
const fieldInputClasses =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-orange-200 focus:ring-2 focus:ring-orange-500';

export function HardwareModelCrudPanel({
  mode,
  hardwareBrands,
  initialCategory,
  hardwareModel,
  onCompleted,
  onDeleted,
}: HardwareModelCrudPanelProps) {
  const { showToast } = useToast();
  const [category, setCategory] = useState<HardwareCategory>(hardwareModel?.category || initialCategory || 'OTHER');
  const [hardwareBrandId, setHardwareBrandId] = useState(
    hardwareModel?.hardwareBrandId ? String(hardwareModel.hardwareBrandId) : '',
  );
  const [name, setName] = useState(hardwareModel?.name || '');
  const [vendorSupportUrl, setVendorSupportUrl] = useState(hardwareModel?.vendorSupportUrl || '');
  const [notes, setNotes] = useState(hardwareModel?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const availableBrands = useMemo(
    () => hardwareBrands.filter((hardwareBrand) => hardwareBrand.category === category),
    [category, hardwareBrands],
  );

  const handleCategoryChange = (nextCategory: HardwareCategory) => {
    setCategory(nextCategory);
    setHardwareBrandId('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (!hardwareBrandId) {
        throw new Error('Please select a hardware brand.');
      }

      const payload = {
        hardwareBrandId: Number(hardwareBrandId),
        name: name.trim(),
        vendorSupportUrl: vendorSupportUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (mode === 'create') {
        await apiFetch('/hardware-catalog/models', {
          method: 'POST',
          body: payload,
        });
      } else if (hardwareModel) {
        await apiFetch(`/hardware-catalog/models/${hardwareModel.id}`, {
          method: 'PATCH',
          body: payload,
        });
      }

      showToast('success', mode === 'create' ? 'Hardware model added.' : 'Hardware model updated.');
      await onCompleted();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!hardwareModel) {
      return;
    }

    setIsDeleting(true);

    try {
      await apiFetch(`/hardware-catalog/models/${hardwareModel.id}`, {
        method: 'DELETE',
      });
      showToast('success', 'Hardware model deleted.');
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
          <select value={category} onChange={(event) => handleCategoryChange(event.target.value as HardwareCategory)} className={fieldInputClasses}>
            {categories.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand">
          <select value={hardwareBrandId} onChange={(event) => setHardwareBrandId(event.target.value)} className={fieldInputClasses} required>
            <option value="">Select brand</option>
            {availableBrands.map((hardwareBrand) => (
              <option key={hardwareBrand.id} value={hardwareBrand.id}>
                {hardwareBrand.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Model Name">
          <input value={name} onChange={(event) => setName(event.target.value)} className={fieldInputClasses} placeholder="PC42t" required />
        </Field>
        <Field label="Model Support URL">
          <input value={vendorSupportUrl} onChange={(event) => setVendorSupportUrl(event.target.value)} className={fieldInputClasses} placeholder="https://..." />
        </Field>
      </div>

      <Field label="Notes">
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className={`${fieldInputClasses} resize-none`} placeholder="Safe frontline diagnostics, installation notes, or handoff guidance." />
      </Field>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        {mode === 'edit' && hardwareModel ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Model'}
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={isSaving || !name.trim() || !hardwareBrandId}
          className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : mode === 'create' ? 'Add Model' : 'Save Changes'}
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

import { Trash2 } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';

import { useToast } from '../../contexts/ToastContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import type { ApiAmc, ApiHardwareAsset, ApiProject, HardwareAssetStatus, HardwareCategory } from '../../lib/types';

type HardwareAssetCrudPanelProps = {
  mode: 'create' | 'edit';
  clientId: number;
  projects: ApiProject[];
  amcs: ApiAmc[];
  hardwareAsset?: ApiHardwareAsset;
  onCompleted: () => Promise<void> | void;
  onDeleted?: () => Promise<void> | void;
};

const categories: HardwareCategory[] = ['PRINTER', 'SCANNER', 'NETWORK_DEVICE', 'COMPUTER', 'PERIPHERAL', 'OTHER'];
const statuses: HardwareAssetStatus[] = ['ACTIVE', 'INACTIVE', 'RETIRED'];
const fieldInputClasses =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-orange-200 focus:ring-2 focus:ring-orange-500';

export function HardwareAssetCrudPanel({
  mode,
  clientId,
  projects,
  amcs,
  hardwareAsset,
  onCompleted,
  onDeleted,
}: HardwareAssetCrudPanelProps) {
  const { showToast } = useToast();
  const [category, setCategory] = useState<HardwareCategory>(hardwareAsset?.category || 'OTHER');
  const [brand, setBrand] = useState(hardwareAsset?.brand || '');
  const [model, setModel] = useState(hardwareAsset?.model || '');
  const [serialNumber, setSerialNumber] = useState(hardwareAsset?.serialNumber || '');
  const [location, setLocation] = useState(hardwareAsset?.location || '');
  const [projectId, setProjectId] = useState(hardwareAsset?.projectId ? String(hardwareAsset.projectId) : '');
  const [amcId, setAmcId] = useState(hardwareAsset?.amcId ? String(hardwareAsset.amcId) : '');
  const [status, setStatus] = useState<HardwareAssetStatus>(hardwareAsset?.status || 'ACTIVE');
  const [vendorSupportUrl, setVendorSupportUrl] = useState(hardwareAsset?.vendorSupportUrl || '');
  const [notes, setNotes] = useState(hardwareAsset?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        category,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        location: location.trim() || undefined,
        projectId: projectId ? Number(projectId) : null,
        amcId: amcId ? Number(amcId) : null,
        status,
        vendorSupportUrl: vendorSupportUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (mode === 'create') {
        await apiFetch(`/clients/${clientId}/hardware-assets`, {
          method: 'POST',
          body: payload,
        });
      } else if (hardwareAsset) {
        await apiFetch(`/hardware-assets/${hardwareAsset.id}`, {
          method: 'PATCH',
          body: payload,
        });
      }

      showToast('success', mode === 'create' ? 'Hardware asset added.' : 'Hardware asset updated.');
      await onCompleted();
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!hardwareAsset) {
      return;
    }

    setIsDeleting(true);

    try {
      await apiFetch(`/hardware-assets/${hardwareAsset.id}`, {
        method: 'DELETE',
      });
      showToast('success', 'Hardware asset deleted.');
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
        <Field label="Status">
          <select value={status} onChange={(event) => setStatus(event.target.value as HardwareAssetStatus)} className={fieldInputClasses}>
            {statuses.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand">
          <input value={brand} onChange={(event) => setBrand(event.target.value)} className={fieldInputClasses} placeholder="Honeywell" />
        </Field>
        <Field label="Model">
          <input value={model} onChange={(event) => setModel(event.target.value)} className={fieldInputClasses} placeholder="PC42t" />
        </Field>
        <Field label="Serial Number">
          <input value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} className={fieldInputClasses} placeholder="Optional" />
        </Field>
        <Field label="Location">
          <input value={location} onChange={(event) => setLocation(event.target.value)} className={fieldInputClasses} placeholder="Dispatch desk" />
        </Field>
        <Field label="Project Link">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={fieldInputClasses}>
            <option value="">No project link</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="AMC Link">
          <select value={amcId} onChange={(event) => setAmcId(event.target.value)} className={fieldInputClasses}>
            <option value="">No AMC link</option>
            {amcs.map((amc) => (
              <option key={amc.id} value={amc.id}>
                {amc.displayId} {amc.project ? `- ${amc.project.name}` : '- General'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vendor Support URL">
          <input value={vendorSupportUrl} onChange={(event) => setVendorSupportUrl(event.target.value)} className={fieldInputClasses} placeholder="https://..." />
        </Field>
      </div>

      <Field label="Notes">
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className={`${fieldInputClasses} resize-none`} placeholder="Known setup notes, installation context, or safe handoff guidance." />
      </Field>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        {mode === 'edit' && hardwareAsset ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Hardware'}
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : mode === 'create' ? 'Add Hardware' : 'Save Changes'}
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

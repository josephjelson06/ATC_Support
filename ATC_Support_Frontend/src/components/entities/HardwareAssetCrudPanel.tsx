import { Trash2 } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { useToast } from '../../contexts/ToastContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import type {
  ApiAmc,
  ApiClient,
  ApiHardwareAsset,
  ApiHardwareBrand,
  ApiHardwareModel,
  ApiProject,
  HardwareAssetStatus,
  HardwareCategory,
} from '../../lib/types';

type HardwareAssetCrudPanelProps = {
  mode: 'create' | 'edit';
  clientId?: number;
  clients?: ApiClient[];
  projects: ApiProject[];
  amcs: ApiAmc[];
  hardwareBrands: ApiHardwareBrand[];
  hardwareModels: ApiHardwareModel[];
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
  clients = [],
  projects,
  amcs,
  hardwareBrands,
  hardwareModels,
  hardwareAsset,
  onCompleted,
  onDeleted,
}: HardwareAssetCrudPanelProps) {
  const { showToast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState(
    clientId ? String(clientId) : hardwareAsset?.clientId ? String(hardwareAsset.clientId) : '',
  );
  const [category, setCategory] = useState<HardwareCategory>(
    hardwareAsset?.hardwareModel?.category || hardwareAsset?.category || 'OTHER',
  );
  const [selectedBrandId, setSelectedBrandId] = useState(
    hardwareAsset?.hardwareModel?.hardwareBrandId ? String(hardwareAsset.hardwareModel.hardwareBrandId) : '',
  );
  const [selectedModelId, setSelectedModelId] = useState(
    hardwareAsset?.hardwareModelId ? String(hardwareAsset.hardwareModelId) : '',
  );
  const [serialNumber, setSerialNumber] = useState(hardwareAsset?.serialNumber || '');
  const [location, setLocation] = useState(hardwareAsset?.location || '');
  const [projectId, setProjectId] = useState(hardwareAsset?.projectId ? String(hardwareAsset.projectId) : '');
  const [amcId, setAmcId] = useState(hardwareAsset?.amcId ? String(hardwareAsset.amcId) : '');
  const [status, setStatus] = useState<HardwareAssetStatus>(hardwareAsset?.status || 'ACTIVE');
  const [vendorSupportUrl, setVendorSupportUrl] = useState(
    hardwareAsset?.vendorSupportUrl || hardwareAsset?.hardwareModel?.vendorSupportUrl || '',
  );
  const [notes, setNotes] = useState(hardwareAsset?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const resolvedClientId = clientId ?? (selectedClientId ? Number(selectedClientId) : null);
  const availableProjects = resolvedClientId ? projects.filter((project) => project.clientId === resolvedClientId) : [];
  const availableAmcs = resolvedClientId ? amcs.filter((amc) => amc.clientId === resolvedClientId) : [];
  const availableBrands = useMemo(
    () => hardwareBrands.filter((hardwareBrand) => hardwareBrand.category === category),
    [category, hardwareBrands],
  );
  const availableModels = useMemo(
    () => hardwareModels.filter((hardwareModel) => hardwareModel.category === category && (!selectedBrandId || hardwareModel.hardwareBrandId === Number(selectedBrandId))),
    [category, hardwareModels, selectedBrandId],
  );
  const selectedBrand = useMemo(
    () => hardwareBrands.find((hardwareBrand) => hardwareBrand.id === Number(selectedBrandId)) || null,
    [hardwareBrands, selectedBrandId],
  );
  const selectedModel = useMemo(
    () => hardwareModels.find((hardwareModel) => hardwareModel.id === Number(selectedModelId)) || null,
    [hardwareModels, selectedModelId],
  );

  const handleCategoryChange = (nextCategory: HardwareCategory) => {
    setCategory(nextCategory);
    setSelectedBrandId('');
    setSelectedModelId('');
  };

  const handleBrandChange = (nextBrandId: string) => {
    setSelectedBrandId(nextBrandId);
    setSelectedModelId('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (!resolvedClientId) {
        throw new Error('Please select a client first.');
      }

      if (!selectedModel) {
        throw new Error('Please select a catalog model before linking hardware to a client.');
      }

      const payload = {
        category,
        hardwareModelId: selectedModel ? selectedModel.id : null,
        serialNumber: serialNumber.trim() || undefined,
        location: location.trim() || undefined,
        projectId: projectId ? Number(projectId) : null,
        amcId: amcId ? Number(amcId) : null,
        status,
        vendorSupportUrl: vendorSupportUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (mode === 'create') {
        await apiFetch(`/clients/${resolvedClientId}/hardware-assets`, {
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
        {!clientId ? (
          <Field label="Client">
            <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)} className={fieldInputClasses} required>
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Category">
          <select value={category} onChange={(event) => handleCategoryChange(event.target.value as HardwareCategory)} className={fieldInputClasses}>
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
          <select value={selectedBrandId} onChange={(event) => handleBrandChange(event.target.value)} className={fieldInputClasses}>
            <option value="">Select brand</option>
            {availableBrands.map((hardwareBrand) => (
              <option key={hardwareBrand.id} value={hardwareBrand.id}>
                {hardwareBrand.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Model">
          <select
            value={selectedModelId}
            onChange={(event) => setSelectedModelId(event.target.value)}
            className={fieldInputClasses}
            disabled={!selectedBrandId}
          >
            <option value="">{selectedBrandId ? 'Select model' : 'Select a brand first'}</option>
            {availableModels.map((hardwareModel) => (
              <option key={hardwareModel.id} value={hardwareModel.id}>
                {hardwareModel.name}
              </option>
            ))}
          </select>
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
            {availableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="AMC Link">
          <select value={amcId} onChange={(event) => setAmcId(event.target.value)} className={fieldInputClasses}>
            <option value="">No AMC link</option>
            {availableAmcs.map((amc) => (
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

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Catalog Lineage</p>
        <p className="mt-2">
          Category: <span className="font-semibold text-slate-900">{category.replaceAll('_', ' ')}</span>
          {' | '}
          Brand: <span className="font-semibold text-slate-900">{selectedBrand?.name || 'Not selected'}</span>
          {' | '}
          Model: <span className="font-semibold text-slate-900">{selectedModel?.name || 'Not selected'}</span>
        </p>
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
          disabled={isSaving || !selectedModel}
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

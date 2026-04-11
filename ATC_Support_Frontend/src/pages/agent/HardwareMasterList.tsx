import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Pencil, Plus, Tags } from 'lucide-react';

import { HardwareAssetCrudPanel } from '../../components/entities/HardwareAssetCrudPanel';
import { HardwareBrandCrudPanel } from '../../components/entities/HardwareBrandCrudPanel';
import { HardwareModelCrudPanel } from '../../components/entities/HardwareModelCrudPanel';
import { DataFilterField, DataToolbar } from '../../components/layout/DataToolbar';
import PageHeader from '../../components/layout/PageHeader';
import { SortableTableHeader } from '../../components/layout/SortableTableHeader';
import { useModal } from '../../contexts/ModalContext';
import { useRole } from '../../contexts/RoleContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { ApiError, apiFetch } from '../../lib/api';
import { formatDate, humanizeEnum } from '../../lib/format';
import { appPaths } from '../../lib/navigation';
import { compareSortValues, getNextSortDirection } from '../../lib/tableSort';
import type {
  ApiAmc,
  ApiClient,
  ApiClientDetail,
  ApiHardwareAsset,
  ApiHardwareBrand,
  ApiHardwareModel,
  ApiProject,
  HardwareAssetStatus,
  HardwareCategory,
} from '../../lib/types';

type SortColumn = 'asset' | 'category' | 'client' | 'project' | 'status' | 'created';

const hardwareCategories: HardwareCategory[] = ['PRINTER', 'SCANNER', 'NETWORK_DEVICE', 'COMPUTER', 'PERIPHERAL', 'OTHER'];

const isMissingHardwareRouteError = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || /route not found/i.test(error.message));

const loadHardwareAssets = async () => {
  try {
    return await apiFetch<ApiHardwareAsset[]>('/hardware-assets');
  } catch (error) {
    if (!isMissingHardwareRouteError(error)) {
      throw error;
    }

    const clients = await apiFetch<ApiClient[]>('/clients');
    const clientDetails = await Promise.all(clients.map((client) => apiFetch<ApiClientDetail>(`/clients/${client.id}`)));

    return clientDetails.flatMap((client) => client.hardwareAssets || []);
  }
};

export default function HardwareMasterList() {
  const { openModal } = useModal();
  const { permissions } = useRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | HardwareCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | HardwareAssetStatus>('ALL');
  const [clientFilter, setClientFilter] = useState<'ALL' | string>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const deferredSearch = useDeferredValue(searchQuery);

  const hardwareQuery = useAsyncData(
    async () => {
      const [hardwareAssets, clients, projects, amcs, hardwareBrands, hardwareModels] = await Promise.all([
        loadHardwareAssets(),
        apiFetch<ApiClient[]>('/clients'),
        apiFetch<ApiProject[]>('/projects'),
        apiFetch<ApiAmc[]>('/amcs'),
        apiFetch<ApiHardwareBrand[]>('/hardware-catalog/brands'),
        apiFetch<ApiHardwareModel[]>('/hardware-catalog/models'),
      ]);

      return { hardwareAssets, clients, projects, amcs, hardwareBrands, hardwareModels };
    },
    [],
  );

  useEffect(() => {
    setFiltersOpen(Boolean(deferredSearch.trim()) || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || clientFilter !== 'ALL');
  }, [categoryFilter, clientFilter, deferredSearch, statusFilter]);

  const canManageHardware = permissions?.canManageClients ?? false;

  const visibleHardwareAssets = useMemo(() => {
    const items = [...(hardwareQuery.data?.hardwareAssets || [])].filter((asset) => {
      if (categoryFilter !== 'ALL' && asset.category !== categoryFilter) {
        return false;
      }

      if (statusFilter !== 'ALL' && asset.status !== statusFilter) {
        return false;
      }

      if (clientFilter !== 'ALL' && String(asset.clientId) !== clientFilter) {
        return false;
      }

      if (!deferredSearch.trim()) {
        return true;
      }

      const searchValue = deferredSearch.trim().toLowerCase();
      const haystack = [
        asset.displayId,
        asset.brand,
        asset.model,
        asset.serialNumber,
        asset.location,
        asset.client?.name,
        asset.project?.name,
        asset.amc?.displayId,
        asset.hardwareModel?.displayId,
        asset.hardwareModel?.hardwareBrand?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(searchValue);
    });

    items.sort((left, right) => {
      switch (sortColumn) {
        case 'asset':
          return compareSortValues(
            [left.brand, left.model].filter(Boolean).join(' ') || left.displayId,
            [right.brand, right.model].filter(Boolean).join(' ') || right.displayId,
            sortDirection,
          );
        case 'category':
          return compareSortValues(left.category, right.category, sortDirection);
        case 'client':
          return compareSortValues(left.client?.name || '', right.client?.name || '', sortDirection);
        case 'project':
          return compareSortValues(left.project?.name || '', right.project?.name || '', sortDirection);
        case 'status':
          return compareSortValues(left.status, right.status, sortDirection);
        case 'created':
          return compareSortValues(new Date(left.createdAt).getTime(), new Date(right.createdAt).getTime(), sortDirection);
      }
    });

    return items;
  }, [categoryFilter, clientFilter, deferredSearch, hardwareQuery.data?.hardwareAssets, sortColumn, sortDirection, statusFilter]);

  const visibleBrands = useMemo(
    () =>
      (hardwareQuery.data?.hardwareBrands || []).filter((hardwareBrand) => categoryFilter === 'ALL' || hardwareBrand.category === categoryFilter),
    [categoryFilter, hardwareQuery.data?.hardwareBrands],
  );

  const visibleModels = useMemo(
    () =>
      (hardwareQuery.data?.hardwareModels || []).filter((hardwareModel) => categoryFilter === 'ALL' || hardwareModel.category === categoryFilter),
    [categoryFilter, hardwareQuery.data?.hardwareModels],
  );

  const categoryCards = useMemo(
    () =>
      hardwareCategories.map((category) => ({
        category,
        assetCount: (hardwareQuery.data?.hardwareAssets || []).filter((asset) => asset.category === category).length,
        brandCount: (hardwareQuery.data?.hardwareBrands || []).filter((hardwareBrand) => hardwareBrand.category === category).length,
        modelCount: (hardwareQuery.data?.hardwareModels || []).filter((hardwareModel) => hardwareModel.category === category).length,
      })),
    [hardwareQuery.data?.hardwareAssets, hardwareQuery.data?.hardwareBrands, hardwareQuery.data?.hardwareModels],
  );

  const openCreateAssetModal = () => {
    if (!hardwareQuery.data) {
      return;
    }

    openModal({
      title: 'Add Hardware Asset',
      size: 'lg',
      content: (
        <HardwareAssetCrudPanel
          mode="create"
          clients={hardwareQuery.data.clients}
          projects={hardwareQuery.data.projects}
          amcs={hardwareQuery.data.amcs}
          hardwareBrands={hardwareQuery.data.hardwareBrands}
          hardwareModels={hardwareQuery.data.hardwareModels}
          onCompleted={async () => {
            await hardwareQuery.reload();
          }}
        />
      ),
    });
  };

  const openEditAssetModal = (hardwareAsset: ApiHardwareAsset) => {
    if (!hardwareQuery.data) {
      return;
    }

    openModal({
      title: `Edit ${hardwareAsset.displayId}`,
      size: 'lg',
      content: (
        <HardwareAssetCrudPanel
          mode="edit"
          clientId={hardwareAsset.clientId}
          projects={hardwareQuery.data.projects}
          amcs={hardwareQuery.data.amcs}
          hardwareBrands={hardwareQuery.data.hardwareBrands}
          hardwareModels={hardwareQuery.data.hardwareModels}
          hardwareAsset={hardwareAsset}
          onCompleted={async () => {
            await hardwareQuery.reload();
          }}
          onDeleted={async () => {
            await hardwareQuery.reload();
          }}
        />
      ),
    });
  };

  const openCreateBrandModal = () => {
    openModal({
      title: 'Add Hardware Brand',
      size: 'md',
      content: (
        <HardwareBrandCrudPanel
          mode="create"
          onCompleted={async () => {
            await hardwareQuery.reload();
          }}
        />
      ),
    });
  };

  const openEditBrandModal = (hardwareBrand: ApiHardwareBrand) => {
    openModal({
      title: `Edit ${hardwareBrand.name}`,
      size: 'md',
      content: (
        <HardwareBrandCrudPanel
          mode="edit"
          hardwareBrand={hardwareBrand}
          onCompleted={async () => {
            await hardwareQuery.reload();
          }}
          onDeleted={async () => {
            await hardwareQuery.reload();
          }}
        />
      ),
    });
  };

  const openCreateModelModal = () => {
    if (!hardwareQuery.data) {
      return;
    }

    openModal({
      title: 'Add Hardware Model',
      size: 'lg',
      content: (
        <HardwareModelCrudPanel
          mode="create"
          initialCategory={categoryFilter === 'ALL' ? undefined : categoryFilter}
          hardwareBrands={hardwareQuery.data.hardwareBrands}
          onCompleted={async () => {
            await hardwareQuery.reload();
          }}
        />
      ),
    });
  };

  const openEditModelModal = (hardwareModel: ApiHardwareModel) => {
    if (!hardwareQuery.data) {
      return;
    }

    openModal({
      title: `Edit ${hardwareModel.name}`,
      size: 'lg',
      content: (
        <HardwareModelCrudPanel
          mode="edit"
          hardwareBrands={hardwareQuery.data.hardwareBrands}
          hardwareModel={hardwareModel}
          onCompleted={async () => {
            await hardwareQuery.reload();
          }}
          onDeleted={async () => {
            await hardwareQuery.reload();
          }}
        />
      ),
    });
  };

  if (hardwareQuery.isLoading) {
    return <HardwareListSkeleton />;
  }

  if (hardwareQuery.error || !hardwareQuery.data) {
    return <HardwareListError message={hardwareQuery.error || 'Unable to load hardware assets.'} onRetry={hardwareQuery.reload} />;
  }

  const { clients } = hardwareQuery.data;
  const activeFilterCount =
    (categoryFilter !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0) + (clientFilter !== 'ALL' ? 1 : 0);

  const handleSort = (column: SortColumn) => {
    setSortDirection((currentDirection) => getNextSortDirection(sortColumn === column, currentDirection));
    setSortColumn(column);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <PageHeader
        title="Hardware"
        description="ATC hardware genealogy starts with category, then brand, then model, and finally client-linked installed assets."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Hardware' }]}
        actions={
          canManageHardware ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={openCreateBrandModal}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add Brand
              </button>
              <button
                onClick={openCreateModelModal}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add Model
              </button>
              <button
                onClick={openCreateAssetModal}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700"
              >
                <Plus className="h-4 w-4" />
                Add Client Asset
              </button>
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categoryCards.map((card) => (
          <button
            key={card.category}
            type="button"
            onClick={() => setCategoryFilter((current) => (current === card.category ? 'ALL' : card.category))}
            className={`rounded-2xl border p-5 text-left shadow-sm transition-all ${
              categoryFilter === card.category ? 'border-orange-300 bg-orange-50/80' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{humanizeEnum(card.category)}</p>
                <p className="mt-3 text-2xl font-black text-slate-900">{card.assetCount}</p>
                <p className="mt-1 text-sm text-slate-500">Installed client assets</p>
              </div>
              <div className="rounded-2xl bg-white/80 px-3 py-2 text-right text-xs font-semibold text-slate-600">
                <p>{card.brandCount} brands</p>
                <p>{card.modelCount} models</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <DataToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by hardware ID, brand, model, serial, client, or project..."
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        activeFilterCount={activeFilterCount}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <DataFilterField label="Category">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as 'ALL' | HardwareCategory)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All categories</option>
              {hardwareCategories.map((category) => (
                <option key={category} value={category}>
                  {humanizeEnum(category)}
                </option>
              ))}
            </select>
          </DataFilterField>
          <DataFilterField label="Status">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | HardwareAssetStatus)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="RETIRED">Retired</option>
            </select>
          </DataFilterField>
          <DataFilterField label="Client">
            <select
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </DataFilterField>
        </div>
      </DataToolbar>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Supported Brands</h2>
              <p className="mt-1 text-sm text-slate-500">Brands grouped under each hardware category.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{visibleBrands.length} brands</span>
          </div>
          <div className="divide-y divide-slate-100">
            {visibleBrands.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">No brands found for this category.</div>
            ) : (
              visibleBrands.map((hardwareBrand) => (
                <div key={hardwareBrand.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{hardwareBrand.name}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700">
                        {humanizeEnum(hardwareBrand.category)}
                      </span>
                      <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-orange-700">
                        {hardwareBrand._count?.hardwareModels || 0} models
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="font-mono font-bold text-orange-600">{hardwareBrand.displayId}</span>
                      {hardwareBrand.vendorSupportUrl ? <span>{hardwareBrand.vendorSupportUrl}</span> : null}
                    </div>
                  </div>
                  {canManageHardware ? (
                    <button
                      type="button"
                      onClick={() => openEditBrandModal(hardwareBrand)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Supported Models</h2>
              <p className="mt-1 text-sm text-slate-500">These models are what client assets should link to.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{visibleModels.length} models</span>
          </div>
          <div className="divide-y divide-slate-100">
            {visibleModels.length === 0 ? (
              <div className="px-6 py-10 text-sm text-slate-500">No models found for this category.</div>
            ) : (
              visibleModels.map((hardwareModel) => (
                <div key={hardwareModel.id} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{hardwareModel.name}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700">
                        {hardwareModel.hardwareBrand?.name || 'Unlinked brand'}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
                        {hardwareModel._count?.hardwareAssets || 0} assets
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="font-mono font-bold text-orange-600">{hardwareModel.displayId}</span>
                      <span>{humanizeEnum(hardwareModel.category)}</span>
                      {hardwareModel.vendorSupportUrl ? <span>{hardwareModel.vendorSupportUrl}</span> : null}
                    </div>
                    {hardwareModel.notes ? <p className="mt-2 text-sm text-slate-500">{hardwareModel.notes}</p> : null}
                  </div>
                  {canManageHardware ? (
                    <button
                      type="button"
                      onClick={() => openEditModelModal(hardwareModel)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Installed Client Assets</h2>
            <p className="mt-1 text-sm text-slate-500">These are the real client-linked devices built from the ATC hardware catalog.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
              <Boxes className="h-3.5 w-3.5" />
              Assets
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
              <Tags className="h-3.5 w-3.5" />
              Catalog-linked
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <SortableTableHeader label="Asset" active={sortColumn === 'asset'} direction={sortDirection} onClick={() => handleSort('asset')} />
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <SortableTableHeader label="Category" active={sortColumn === 'category'} direction={sortDirection} onClick={() => handleSort('category')} />
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Catalog Model</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <SortableTableHeader label="Client" active={sortColumn === 'client'} direction={sortDirection} onClick={() => handleSort('client')} />
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <SortableTableHeader label="Project" active={sortColumn === 'project'} direction={sortDirection} onClick={() => handleSort('project')} />
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">AMC</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <SortableTableHeader label="Status" active={sortColumn === 'status'} direction={sortDirection} onClick={() => handleSort('status')} />
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Location</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <SortableTableHeader label="Created" active={sortColumn === 'created'} direction={sortDirection} onClick={() => handleSort('created')} />
                </th>
                {canManageHardware ? <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleHardwareAssets.length === 0 ? (
                <tr>
                  <td colSpan={canManageHardware ? 10 : 9} className="px-6 py-12 text-center text-sm text-slate-500">
                    No hardware assets matched that search.
                  </td>
                </tr>
              ) : (
                visibleHardwareAssets.map((asset) => (
                  <tr key={asset.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900">
                          {[asset.brand, asset.model].filter(Boolean).join(' ') || humanizeEnum(asset.category)}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono font-bold text-orange-600">{asset.displayId}</span>
                          {asset.serialNumber ? <span>Serial: {asset.serialNumber}</span> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
                        {humanizeEnum(asset.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {asset.hardwareModel ? (
                        <div>
                          <p className="font-semibold text-slate-800">{asset.hardwareModel.name}</p>
                          <p className="text-xs text-slate-500">{asset.hardwareModel.hardwareBrand?.name || 'Unknown brand'}</p>
                        </div>
                      ) : (
                        'Custom entry'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {asset.client ? <Link to={appPaths.clients.detail(asset.client.id)} className="hover:text-orange-600">{asset.client.name}</Link> : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {asset.project ? <Link to={appPaths.projects.detail(asset.project.id)} className="hover:text-orange-600">{asset.project.name}</Link> : 'Client-level hardware'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{asset.amc?.displayId || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                          asset.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : asset.status === 'INACTIVE'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {humanizeEnum(asset.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{asset.location || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(asset.createdAt)}</td>
                    {canManageHardware ? (
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => openEditAssetModal(asset)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function HardwareListSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-6 px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
      <div className="h-8 w-40 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-14 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      </div>
      <div className="h-[32rem] rounded-2xl border border-slate-200 bg-white shadow-sm" />
    </div>
  );
}

function HardwareListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Hardware unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <button onClick={onRetry} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700">
          Retry
        </button>
      </div>
    </div>
  );
}

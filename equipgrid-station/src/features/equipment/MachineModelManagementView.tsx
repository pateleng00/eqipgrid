import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu, Plus, Search, Edit2, Trash2, CheckCircle2,
  XCircle, AlertTriangle, ShieldAlert, Layers, Building2,
  RefreshCw, X, FileText, Hash
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../services/api';
import { MachineModel, EquipmentType, Manufacturer } from '../../types';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { SearchSelect } from '../../components/SearchSelect';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';

export const MachineModelManagementView: React.FC = () => {
  const { isDaylight } = useTheme();
  const { currentUser } = useAuth();
  const isRoot = currentUser?.role === 'root';

  const [models, setModels] = useState<MachineModel[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [mfgFilter, setMfgFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<MachineModel | null>(null);
  const [modelToDelete, setModelToDelete] = useState<MachineModel | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [typeId, setTypeId] = useState<number | ''>('');
  const [manufacturerId, setManufacturerId] = useState<number | ''>('');
  const [specs, setSpecs] = useState('');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fuzzy check state
  const [fuzzyWarning, setFuzzyWarning] = useState<{
    duplicate: boolean;
    matchedName?: string;
    similarityPercentage: number;
    message: string;
  } | null>(null);
  const [checkingFuzzy, setCheckingFuzzy] = useState(false);

  // Toast / feedback modal
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    variant: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({ isOpen: false, variant: 'success', title: '', message: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [modelsData, typesData, mfgData] = await Promise.all([
        api.fetchMachineModels(undefined, undefined, true),
        api.fetchEquipmentTypes(true),
        api.fetchManufacturers(true),
      ]);
      setModels(modelsData);
      setTypes(typesData);
      setManufacturers(mfgData);
    } catch {
      setModels(api.getMachineModels(undefined, undefined, true));
      setTypes(api.getEquipmentTypes(true));
      setManufacturers(api.getManufacturers(true));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = api.subscribe(() => {
      setModels(api.getMachineModels(undefined, undefined, true));
      setTypes(api.getEquipmentTypes(true));
      setManufacturers(api.getManufacturers(true));
    });
    return unsub;
  }, []);

  // Reset infinite scroll on search/filter changes
  useEffect(() => {
    setVisibleCount(12);
  }, [search, typeFilter, mfgFilter, statusFilter]);

  // Debounced fuzzy availability check
  useEffect(() => {
    if (!isModalOpen || !name.trim() || name.trim().length < 2) {
      setFuzzyWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingFuzzy(true);
      try {
        const res = await api.checkMachineModelAvailability(
          name.trim(),
          typeId ? Number(typeId) : undefined,
          manufacturerId ? Number(manufacturerId) : undefined,
          editingModel?.id
        );
        if (res.duplicate) {
          setFuzzyWarning(res);
        } else {
          setFuzzyWarning(null);
        }
      } catch {
        setFuzzyWarning(null);
      } finally {
        setCheckingFuzzy(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [name, typeId, manufacturerId, isModalOpen, editingModel]);

  const openCreateModal = () => {
    setEditingModel(null);
    setName('');
    setModelNumber('');
    setTypeId(types.length > 0 ? types[0].id : '');
    setManufacturerId(manufacturers.length > 0 ? manufacturers[0].id : '');
    setSpecs('');
    setActive(true);
    setFormError('');
    setFuzzyWarning(null);
    setIsModalOpen(true);
  };

  const openEditModal = (model: MachineModel) => {
    setEditingModel(model);
    setName(model.name);
    setModelNumber(model.modelNumber || '');
    setTypeId(model.typeId);
    setManufacturerId(model.manufacturerId);
    setSpecs(model.specs || '');
    setActive(model.active);
    setFormError('');
    setFuzzyWarning(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingModel(null);
    setFormError('');
    setFuzzyWarning(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Model name is required');
      return;
    }
    if (!typeId) {
      setFormError('Equipment Type is required');
      return;
    }
    if (!manufacturerId) {
      setFormError('Manufacturer (OEM) is required');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      if (editingModel) {
        await api.updateMachineModel(editingModel.id, {
          name: name.trim(),
          modelNumber: modelNumber.trim(),
          typeId: Number(typeId),
          manufacturerId: Number(manufacturerId),
          specs: specs.trim(),
          active,
        });
        setFeedback({
          isOpen: true,
          variant: 'success',
          title: 'Model Updated',
          message: `Asset model "${name.trim()}" has been updated successfully.`,
        });
      } else {
        await api.addMachineModel({
          name: name.trim(),
          modelNumber: modelNumber.trim(),
          typeId: Number(typeId),
          manufacturerId: Number(manufacturerId),
          specs: specs.trim(),
          active,
        });
        setFeedback({
          isOpen: true,
          variant: 'success',
          title: 'Model Created',
          message: `Asset model "${name.trim()}" has been cataloged successfully.`,
        });
      }
      closeModal();
      await loadData();
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to save asset model. Please verify name uniqueness and network connectivity.';
      setFormError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!modelToDelete) return;
    if (!isRoot) {
      setFeedback({
        isOpen: true,
        variant: 'error',
        title: 'Action Restricted',
        message: 'Admins cannot delete asset models. Only ROOT super-admins possess master deletion authority.',
      });
      setModelToDelete(null);
      return;
    }

    try {
      await api.deleteMachineModel(modelToDelete.id);
      setFeedback({
        isOpen: true,
        variant: 'success',
        title: 'Model Deleted',
        message: `Asset model "${modelToDelete.name}" has been removed from master records.`,
      });
      setModelToDelete(null);
      await loadData();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        variant: 'error',
        title: 'Deletion Failed',
        message: err?.message || 'Cannot delete model because active equipment units or telemetry configurations reference it.',
      });
      setModelToDelete(null);
    }
  };

  // Lookup maps
  const typeMap = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);
  const mfgMap = useMemo(() => new Map(manufacturers.map((m) => [m.id, m])), [manufacturers]);

  // Filtered models
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const q = search.toLowerCase().trim();
      const typeObj = typeMap.get(m.typeId);
      const mfgObj = mfgMap.get(m.manufacturerId);

      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.modelNumber && m.modelNumber.toLowerCase().includes(q)) ||
        (m.specs && m.specs.toLowerCase().includes(q)) ||
        (typeObj?.name && typeObj.name.toLowerCase().includes(q)) ||
        (mfgObj?.name && mfgObj.name.toLowerCase().includes(q));

      const matchesType = typeFilter === 'all' || String(m.typeId) === typeFilter;
      const matchesMfg = mfgFilter === 'all' || String(m.manufacturerId) === mfgFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && m.active) ||
        (statusFilter === 'inactive' && !m.active);

      return matchesSearch && matchesType && matchesMfg && matchesStatus;
    });
  }, [models, search, typeFilter, mfgFilter, statusFilter, typeMap, mfgMap]);

  // Infinite scroll slice
  const visibleModels = useMemo(() => {
    return filteredModels.slice(0, visibleCount);
  }, [filteredModels, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      if (visibleCount < filteredModels.length) {
        setVisibleCount((prev) => Math.min(prev + 12, filteredModels.length));
      }
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 12, filteredModels.length));
  };

  const formatCategoryName = (cat?: string) => {
    if (!cat) return '';
    if (cat === 'AGRICULTURE') return 'Agriculture';
    if (cat === 'CONSTRUCTION') return 'Construction';
    if (cat === 'MULTIPURPOSE_FLEET') return 'Multipurpose Fleet';
    return cat;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDaylight ? 'text-slate-900' : 'text-white'}`}>
            <Cpu className="h-5 w-5 text-amber-500" />
            Asset Hardware Models Registry
          </h2>
          <p className={`text-xs ${isDaylight ? 'text-slate-500' : 'text-slate-400'}`}>
            Hardware specifications, variant codes, equipment type linkages, and OEM manufacturing mappings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            title="Refresh models"
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDaylight ? 'border-slate-200 hover:bg-slate-100 text-slate-700' : 'border-slate-800 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Model</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar - Reduced search width, increased filter widths using SearchSelect */}
      <div className={`p-3 rounded-2xl border flex flex-col lg:flex-row items-center justify-between gap-3 flex-shrink-0 ${
        isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
          <input
            type="text"
            placeholder="Search model, specs, number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border transition-colors outline-none ${
              isDaylight
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
            }`}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto flex-1 justify-end">
          {/* Equipment Type Filter using SearchSelect */}
          <div className="w-full sm:w-60">
            <SearchSelect
              options={[
                { value: 'all', label: 'All Equipment Types' },
                ...types.map((t) => ({
                  value: String(t.id),
                  label: `${t.name} (${formatCategoryName(t.category)})`,
                })),
              ]}
              value={typeFilter}
              onChange={(val) => setTypeFilter(val || 'all')}
              placeholder="Equipment Type"
              isClearable={false}
            />
          </div>

          {/* Manufacturer Filter using SearchSelect */}
          <div className="w-full sm:w-60">
            <SearchSelect
              options={[
                { value: 'all', label: 'All Manufacturers (OEM)' },
                ...manufacturers.map((m) => ({
                  value: String(m.id),
                  label: `${m.name} (${m.country})`,
                })),
              ]}
              value={mfgFilter}
              onChange={(val) => setMfgFilter(val || 'all')}
              placeholder="Manufacturer OEM"
              isClearable={false}
            />
          </div>

          {/* Status Filter using SearchSelect */}
          <div className="w-full sm:w-44">
            <SearchSelect
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active Only' },
                { value: 'inactive', label: 'Inactive Only' },
              ]}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || 'all')}
              placeholder="Status"
              isClearable={false}
            />
          </div>
        </div>
      </div>

      {/* Models Table with Infinite Scroll */}
      <div
        onScroll={handleScroll}
        className={`flex-1 min-h-0 rounded-2xl border overflow-auto ${
          isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
        }`}
      >
        <table className="w-full text-left border-collapse text-xs">
          <thead className={`sticky top-0 z-10 border-b ${
            isDaylight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/90 border-slate-800 text-slate-400'
          }`}>
            <tr>
              <th className="py-2.5 px-4 font-semibold">Model &amp; Designation</th>
              <th className="py-2.5 px-4 font-semibold">Equipment Type</th>
              <th className="py-2.5 px-4 font-semibold">Manufacturer (OEM)</th>
              <th className="py-2.5 px-4 font-semibold">Specifications</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDaylight ? 'divide-slate-100' : 'divide-slate-800/60'}`}>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                  Loading asset models from cloud registry...
                </td>
              </tr>
            ) : filteredModels.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No asset models found matching your filters.
                </td>
              </tr>
            ) : (
              visibleModels.map((m) => {
                const typeObj = typeMap.get(m.typeId);
                const mfgObj = mfgMap.get(m.manufacturerId);

                return (
                  <tr
                    key={m.id}
                    className={`transition-colors hover:${isDaylight ? 'bg-slate-50/80' : 'bg-slate-800/40'}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${
                          isDaylight ? 'bg-amber-100/60 text-amber-800' : 'bg-amber-950/40 text-amber-400'
                        }`}>
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {m.name}
                          </div>
                          {m.modelNumber ? (
                            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                              <Hash className="w-3 h-3 text-slate-400" />
                              {m.modelNumber}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">No model code</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {typeObj ? (
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {typeObj.name}
                          </span>
                          <div className="text-xs">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              typeObj.category === 'AGRICULTURE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                : typeObj.category === 'CONSTRUCTION'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400'
                            }`}>
                              {formatCategoryName(typeObj.category)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Type ID: #{m.typeId}</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {mfgObj ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200">{mfgObj.name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                                {mfgObj.code}
                              </span>
                              <span>{mfgObj.country}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">OEM ID: #{m.manufacturerId}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      {m.specs ? (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2" title={m.specs}>
                          {m.specs}
                        </p>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No specs provided</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {m.active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-500/10 border border-slate-500/20 px-2.5 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(m)}
                          title="Edit Asset Model"
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isDaylight
                              ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                              : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {isRoot ? (
                          <button
                            onClick={() => setModelToDelete(m)}
                            title="Delete Asset Model (Root Only)"
                            className="p-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="relative group">
                            <button
                              disabled
                              title="Admins cannot delete master records. Only ROOT super-admins can delete."
                              className="p-1.5 rounded-lg border border-slate-700 text-slate-500 opacity-40 cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-48 p-2 rounded-lg text-[11px] bg-slate-900 text-slate-200 border border-slate-700 shadow-xl z-20 pointer-events-none">
                              <div className="flex items-center gap-1 text-amber-400 font-semibold mb-0.5">
                                <ShieldAlert className="w-3 h-3" />
                                Root Only
                              </div>
                              Admins can add &amp; update, but cannot delete master records.
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Infinite Scroll Footer */}
        {filteredModels.length > 0 && !loading && (
          <InfiniteScrollFooter
            loadedCount={visibleModels.length}
            totalCount={filteredModels.length}
            onLoadMore={handleLoadMore}
            itemName="asset models"
          />
        )}
      </div>

      {/* Add / Edit Modal - Increased Width (max-w-3xl) with React-Select (SearchSelect) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`relative w-full max-w-3xl rounded-2xl border p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${
            isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-1">
              <div className={`p-2.5 rounded-xl ${
                isDaylight ? 'bg-amber-100 text-amber-800' : 'bg-amber-950 text-amber-400'
              }`}>
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg">
                  {editingModel ? 'Update Asset Model' : 'Catalog New Asset Model'}
                </h3>
                <p className="text-xs text-slate-500">
                  Assign equipment type, manufacturer OEM, model designation, and specs. Includes automatic fuzzy match check.
                </p>
              </div>
            </div>

            {/* Fuzzy match warning banner */}
            {fuzzyWarning && (
              <div className={`my-4 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                fuzzyWarning.similarityPercentage >= 95
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              }`}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">
                    Fuzzy Duplicate Detected ({fuzzyWarning.similarityPercentage}% match):
                  </span>{' '}
                  {fuzzyWarning.message}
                </div>
              </div>
            )}

            {formError && (
              <div className="my-4 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              {/* Equipment Type & Manufacturer (both required) with React-Select (SearchSelect) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Equipment Type <span className="text-rose-500">*</span>
                  </label>
                  <SearchSelect
                    options={types.map((t) => ({
                      value: t.id,
                      label: `${t.name} (${formatCategoryName(t.category)})`,
                    }))}
                    value={typeId}
                    onChange={(val) => setTypeId(val ? Number(val) : '')}
                    placeholder="Select Equipment Type..."
                    isClearable={false}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Manufacturer (OEM) <span className="text-rose-500">*</span>
                  </label>
                  <SearchSelect
                    options={manufacturers.map((m) => ({
                      value: m.id,
                      label: `${m.name} (${m.country})`,
                    }))}
                    value={manufacturerId}
                    onChange={(val) => setManufacturerId(val ? Number(val) : '')}
                    placeholder="Select Manufacturer OEM..."
                    isClearable={false}
                  />
                </div>
              </div>

              {/* Model Name & Model Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Model Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3DX Super or 5050 D"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border transition-colors outline-none ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-amber-500'
                        : 'bg-slate-800/60 border-slate-700 text-slate-100 focus:border-amber-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Model Number / Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JCB-3DX or JD-5050D"
                    value={modelNumber}
                    onChange={(e) => setModelNumber(e.target.value)}
                    className={`w-full px-3 py-2.5 text-xs sm:text-sm font-mono border transition-colors outline-none ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-amber-500'
                        : 'bg-slate-800/60 border-slate-700 text-slate-100 focus:border-amber-400'
                    }`}
                  />
                </div>
              </div>

              {/* Technical Specifications */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Technical Specifications &amp; Dimensions
                </label>
                <textarea
                  rows={3}
                  placeholder="Engine power (HP), operating weight, bucket capacity, PTO speed, transmission type..."
                  value={specs}
                  onChange={(e) => setSpecs(e.target.value)}
                  className={`w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border transition-colors outline-none resize-none ${
                    isDaylight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-amber-500'
                      : 'bg-slate-800/60 border-slate-700 text-slate-100 focus:border-amber-400'
                  }`}
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Active Status</span>
                  <p className="text-[11px] text-slate-500">Allow this model to be selected when commissioning fleet equipment</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || checkingFuzzy}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingModel ? 'Update Model' : 'Save Model'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Root Only) */}
      <ConfirmationModal
        isOpen={!!modelToDelete}
        onClose={() => setModelToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Asset Model"
        message={`Are you sure you want to permanently delete asset model "${modelToDelete?.name}"? This action will fail if active fleet machinery or pricing configurations are linked.`}
        variant="error"
        confirmLabel="Permanently Delete"
        showCancel={true}
      />

      {/* Generic Feedback Toast/Modal */}
      <ConfirmationModal
        isOpen={feedback.isOpen}
        onClose={() => setFeedback((f) => ({ ...f, isOpen: false }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
};

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

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDaylight
          ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-200/70 shadow-sm'
          : 'bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-950 border-emerald-900/40 shadow-xl'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl border ${
              isDaylight
                ? 'bg-emerald-100/80 border-emerald-300 text-emerald-800'
                : 'bg-emerald-900/40 border-emerald-700/60 text-emerald-400'
            }`}>
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Asset Models Registry</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
                  isDaylight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}>
                  {models.length} Models
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDaylight ? 'text-slate-600' : 'text-slate-400'}`}>
                Hardware specifications, variant codes, equipment type linkages, and OEM manufacturing mappings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              title="Refresh models"
              className={`p-2.5 rounded-xl border transition-all ${
                isDaylight
                  ? 'border-slate-200 hover:bg-white text-slate-700 hover:shadow-sm'
                  : 'border-slate-800 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md hover:shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Model</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-200/50 dark:border-slate-800/60">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search model, specs, number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border transition-all outline-none ${
                isDaylight
                  ? 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500'
                  : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-emerald-500'
              }`}
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by Equipment Type"
              className={`w-full px-3 py-2 text-sm rounded-xl border transition-all outline-none ${
                isDaylight
                  ? 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500'
                  : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-emerald-500'
              }`}
            >
              <option value="all">All Equipment Types</option>
              {types.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={mfgFilter}
              onChange={(e) => setMfgFilter(e.target.value)}
              aria-label="Filter by Manufacturer OEM"
              className={`w-full px-3 py-2 text-sm rounded-xl border transition-all outline-none ${
                isDaylight
                  ? 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500'
                  : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-emerald-500'
              }`}
            >
              <option value="all">All Manufacturers (OEM)</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.name} ({m.country})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              aria-label="Filter by Active Status"
              className={`w-full px-3 py-2 text-sm rounded-xl border transition-all outline-none ${
                isDaylight
                  ? 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500'
                  : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-emerald-500'
              }`}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Models Table */}
      <div className={`rounded-2xl border overflow-hidden transition-all ${
        isDaylight
          ? 'bg-white border-slate-200/80 shadow-sm'
          : 'bg-slate-900/80 border-slate-800 shadow-xl'
      }`}>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm font-medium text-slate-400">Loading asset models from cloud registry...</p>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Cpu className="w-12 h-12 mx-auto text-slate-400 opacity-40" />
            <p className="text-sm font-medium text-slate-400">No asset models match your search criteria</p>
            {(search || typeFilter !== 'all' || mfgFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setTypeFilter('all');
                  setMfgFilter('all');
                  setStatusFilter('all');
                }}
                className="text-xs text-emerald-500 hover:underline font-semibold"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${
                  isDaylight
                    ? 'bg-slate-50/80 border-slate-200 text-slate-600'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}>
                  <th className="py-3.5 px-4">Model & Designation</th>
                  <th className="py-3.5 px-4">Equipment Type</th>
                  <th className="py-3.5 px-4">Manufacturer (OEM)</th>
                  <th className="py-3.5 px-4">Specifications</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredModels.map((m) => {
                  const typeObj = typeMap.get(m.typeId);
                  const mfgObj = mfgMap.get(m.manufacturerId);

                  return (
                    <tr
                      key={m.id}
                      className={`transition-colors ${
                        isDaylight
                          ? 'hover:bg-slate-50/70'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isDaylight ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-950/60 text-emerald-400'
                          }`}>
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              {m.name}
                            </div>
                            {m.modelNumber ? (
                              <div className="text-xs font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                                <Hash className="w-3 h-3 text-slate-400" />
                                {m.modelNumber}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400 italic">No model code</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {typeObj ? (
                          <div className="space-y-0.5">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {typeObj.name}
                            </span>
                            <div className="text-xs">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                typeObj.category === 'AGRICULTURE'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                                  : typeObj.category === 'CONSTRUCTION'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                              }`}>
                                {typeObj.category}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Type ID: #{m.typeId}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
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

                      <td className="py-3.5 px-4 max-w-xs">
                        {m.specs ? (
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2" title={m.specs}>
                            {m.specs}
                          </p>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No specs provided</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {m.active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                            <XCircle className="w-3.5 h-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(m)}
                            title="Edit Asset Model"
                            className={`p-2 rounded-lg transition-colors ${
                              isDaylight
                                ? 'hover:bg-slate-100 text-slate-600 hover:text-emerald-700'
                                : 'hover:bg-slate-800 text-slate-400 hover:text-emerald-400'
                            }`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {isRoot ? (
                            <button
                              onClick={() => setModelToDelete(m)}
                              title="Delete Asset Model (Root Only)"
                              className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="relative group">
                              <button
                                disabled
                                title="Admins cannot delete master records. Only ROOT super-admins can delete."
                                className="p-2 rounded-lg text-slate-400 opacity-40 cursor-not-allowed"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-48 p-2 rounded-lg text-[11px] bg-slate-900 text-slate-200 border border-slate-700 shadow-xl z-20 pointer-events-none">
                                <div className="flex items-center gap-1 text-amber-400 font-semibold mb-0.5">
                                  <ShieldAlert className="w-3 h-3" />
                                  Root Only
                                </div>
                                Admins can add & update, but cannot delete master records.
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden transition-all ${
            isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${
              isDaylight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${
                  isDaylight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950 text-emerald-400'
                }`}>
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingModel ? 'Update Asset Model' : 'Catalog New Asset Model'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assign equipment type, manufacturer OEM, model designation, and specs
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Equipment Type & Manufacturer (both required) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Equipment Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={typeId}
                    onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : '')}
                    required
                    aria-label="Select Equipment Type"
                    className={`w-full px-3 py-2 text-sm rounded-xl border transition-all outline-none ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-500'
                        : 'bg-slate-800/60 border-slate-700 text-slate-100 focus:border-emerald-500'
                    }`}
                  >
                    <option value="" disabled>Select Equipment Type</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Manufacturer (OEM) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={manufacturerId}
                    onChange={(e) => setManufacturerId(e.target.value ? Number(e.target.value) : '')}
                    required
                    aria-label="Select Manufacturer OEM"
                    className={`w-full px-3 py-2 text-sm rounded-xl border transition-all outline-none ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-500'
                        : 'bg-slate-800/60 border-slate-700 text-slate-100 focus:border-emerald-500'
                    }`}
                  >
                    <option value="" disabled>Select Manufacturer</option>
                    {manufacturers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.country})
                      </option>
                    ))}
                  </select>
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
                    className={`w-full px-3 py-2 text-sm rounded-xl border transition-all outline-none ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-500'
                        : 'bg-slate-800/60 border-slate-700 text-slate-100 focus:border-emerald-500'
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
                    className={`w-full px-3 py-2 text-sm rounded-xl border transition-all outline-none ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-500'
                        : 'bg-slate-800/60 border-slate-700 text-slate-100 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Fuzzy Duplicate Warning Banner */}
              {fuzzyWarning && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
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

              {/* Technical Specifications */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Technical Specifications & Dimensions
                </label>
                <textarea
                  rows={3}
                  placeholder="Engine power (HP), operating weight, bucket capacity, PTO speed, transmission type..."
                  value={specs}
                  onChange={(e) => setSpecs(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-xl border transition-all outline-none resize-none ${
                    isDaylight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-500'
                      : 'bg-slate-800/60 border-slate-700 text-slate-100 focus:border-emerald-500'
                  }`}
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
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
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    isDaylight
                      ? 'border-slate-300 hover:bg-slate-100 text-slate-700'
                      : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || checkingFuzzy}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md hover:shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
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
      {feedback.isOpen && (
        <div className="fixed bottom-5 right-5 z-50 animate-slideUp">
          <div className={`p-4 rounded-xl border shadow-xl flex items-start gap-3 max-w-md ${
            feedback.variant === 'success'
              ? 'bg-emerald-950/95 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/95 border-rose-700 text-rose-200'
          }`}>
            {feedback.variant === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">{feedback.title}</h4>
              <p className="text-xs opacity-90">{feedback.message}</p>
            </div>
            <button
              onClick={() => setFeedback((f) => ({ ...f, isOpen: false }))}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

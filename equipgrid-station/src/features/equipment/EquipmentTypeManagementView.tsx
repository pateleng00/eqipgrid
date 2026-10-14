import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench, Plus, Search, Edit2, Trash2, CheckCircle2,
  XCircle, AlertTriangle, Layers, Languages, FileText, RefreshCw, X
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../services/api';
import { EquipmentType, AssetCategory } from '../../types';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export const EquipmentTypeManagementView: React.FC = () => {
  const { isDaylight } = useTheme();
  const { currentUser } = useAuth();
  const isRoot = currentUser?.role === 'root';

  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<EquipmentType | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<EquipmentType | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<AssetCategory>('AGRICULTURE');
  const [hindiName, setHindiName] = useState('');
  const [localLanguageName, setLocalLanguageName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fuzzy checking
  const [fuzzyWarning, setFuzzyWarning] = useState<{
    duplicate: boolean;
    matchedName?: string;
    similarityPercentage: number;
    message: string;
  } | null>(null);
  const [checkingFuzzy, setCheckingFuzzy] = useState(false);

  // Feedback toast
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    variant: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({ isOpen: false, variant: 'success', title: '', message: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.fetchEquipmentTypes(true);
      setTypes(data);
    } catch {
      setTypes(api.getEquipmentTypes(true));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = api.subscribe(() => {
      setTypes(api.getEquipmentTypes(true));
    });
    return unsub;
  }, []);

  // Debounced fuzzy matching check
  useEffect(() => {
    if (!isModalOpen || !name.trim() || name.trim().length < 2) {
      setFuzzyWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingFuzzy(true);
      try {
        const res = await api.checkEquipmentTypeAvailability(name.trim(), editingType?.id);
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
  }, [name, isModalOpen, editingType]);

  const openCreateModal = () => {
    setEditingType(null);
    setName('');
    setCode('');
    setCategory('AGRICULTURE');
    setHindiName('');
    setLocalLanguageName('');
    setDescription('');
    setActive(true);
    setFormError('');
    setFuzzyWarning(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t: EquipmentType) => {
    setEditingType(t);
    setName(t.name);
    setCode(t.code);
    setCategory(t.category);
    setHindiName(t.hindiName || '');
    setLocalLanguageName(t.localLanguageName || '');
    setDescription(t.description || '');
    setActive(t.active);
    setFormError('');
    setFuzzyWarning(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingType && (!code || code.startsWith('TYPE-'))) {
      const cleanSlug = val.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').slice(0, 10);
      setCode(`TYPE-${cleanSlug}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Equipment type name is required.');
      return;
    }
    if (!category) {
      setFormError('Asset category is mandatory (Agriculture, Construction, or Multipurpose Fleet).');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (editingType) {
        await api.updateEquipmentType(editingType.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          category,
          hindiName: hindiName.trim() || undefined,
          localLanguageName: localLanguageName.trim() || undefined,
          description: description.trim() || undefined,
          active,
        });
        setFeedback({
          isOpen: true,
          variant: 'success',
          title: 'Equipment Type Updated',
          message: `Successfully updated equipment type "${name.trim()}".`,
        });
      } else {
        await api.addEquipmentType({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          category,
          hindiName: hindiName.trim() || undefined,
          localLanguageName: localLanguageName.trim() || undefined,
          description: description.trim() || undefined,
          active,
        });
        setFeedback({
          isOpen: true,
          variant: 'success',
          title: 'Equipment Type Created',
          message: `Successfully created equipment type "${name.trim()}".`,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed. Please review fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!typeToDelete) return;
    try {
      await api.deleteEquipmentType(typeToDelete.id);
      setFeedback({
        isOpen: true,
        variant: 'success',
        title: 'Equipment Type Deleted',
        message: `Equipment type "${typeToDelete.name}" has been deleted.`,
      });
      setTypeToDelete(null);
      await loadData();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        variant: 'error',
        title: 'Deletion Restricted',
        message: err.message || 'Admins can add and update, but cannot delete master records.',
      });
      setTypeToDelete(null);
    }
  };

  const filtered = useMemo(() => {
    return types.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase()) ||
        (t.hindiName && t.hindiName.toLowerCase().includes(search.toLowerCase())) ||
        (t.localLanguageName && t.localLanguageName.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (statusFilter === 'active') return t.active;
      if (statusFilter === 'inactive') return !t.active;
      return true;
    });
  }, [types, search, categoryFilter, statusFilter]);

  const getCategoryBadge = (cat: AssetCategory) => {
    if (cat === 'AGRICULTURE') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          🌾 Agriculture
        </span>
      );
    }
    if (cat === 'MULTIPURPOSE_FLEET') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
          🚜 Dual Use / Multipurpose
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
        🏗️ Construction
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDaylight ? 'text-slate-900' : 'text-white'}`}>
            <Layers className="h-5 w-5 text-amber-500" />
            Equipment Types & Categories
          </h2>
          <p className={`text-xs ${isDaylight ? 'text-slate-500' : 'text-slate-400'}`}>
            Define machine classifications, multilingual local names (Hindi/Awadhi/Bhojpuri), and required industry sector.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDaylight ? 'border-slate-200 hover:bg-slate-100 text-slate-700' : 'border-slate-800 hover:bg-slate-800 text-slate-300'
            }`}
            title="Refresh List"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Equipment Type
          </button>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className={`p-3 rounded-2xl border flex flex-col md:flex-row items-center gap-3 flex-shrink-0 ${
        isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by English name, Hindi name, or code..."
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border outline-none transition-colors ${
              isDaylight
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Category tabs */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Sector:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'AGRICULTURE', label: 'Agri' },
              { id: 'CONSTRUCTION', label: 'Const.' },
              { id: 'MULTIPURPOSE_FLEET', label: 'Dual Use' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : isDaylight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Status:</span>
            {(['all', 'active', 'inactive'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : isDaylight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Types Table */}
      <div className={`flex-1 min-h-0 rounded-2xl border overflow-auto ${
        isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
      }`}>
        <table className="w-full text-left border-collapse text-xs">
          <thead className={`sticky top-0 z-10 border-b ${
            isDaylight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/90 border-slate-800 text-slate-400'
          }`}>
            <tr>
              <th className="py-2.5 px-4 font-semibold">Type Name & Code</th>
              <th className="py-2.5 px-4 font-semibold">Industry Sector</th>
              <th className="py-2.5 px-4 font-semibold">Hindi & Local Name</th>
              <th className="py-2.5 px-4 font-semibold">Description</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDaylight ? 'divide-slate-100' : 'divide-slate-800/60'}`}>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                  Loading equipment types...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No equipment types found matching filters.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className={`transition-colors hover:${isDaylight ? 'bg-slate-50/80' : 'bg-slate-800/40'}`}>
                  <td className="py-2.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{t.name}</div>
                    <div className="font-mono text-[11px] text-amber-600 dark:text-amber-400">{t.code}</div>
                  </td>
                  <td className="py-2.5 px-4">
                    {getCategoryBadge(t.category)}
                  </td>
                  <td className="py-2.5 px-4">
                    {t.hindiName && (
                      <div className="font-medium text-slate-800 dark:text-slate-200">{t.hindiName}</div>
                    )}
                    {t.localLanguageName && (
                      <div className="text-[11px] text-slate-500 italic">{t.localLanguageName}</div>
                    )}
                    {!t.hindiName && !t.localLanguageName && (
                      <span className="text-slate-400 italic">None set</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400" title={t.description}>
                    {t.description || '—'}
                  </td>
                  <td className="py-2.5 px-4">
                    {t.active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded-full">
                        <XCircle className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(t)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isDaylight ? 'border-slate-200 hover:bg-slate-100 text-slate-700' : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                        }`}
                        title="Edit Equipment Type"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {isRoot ? (
                        <button
                          onClick={() => setTypeToDelete(t)}
                          className="p-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Delete Equipment Type (Root Authority)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="p-1.5 rounded-lg border border-slate-700 text-slate-500 opacity-40 cursor-not-allowed"
                          title="Admins can add and update, but cannot delete master data."
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full max-w-lg rounded-2xl border p-5 shadow-2xl transition-all ${
            isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className={`text-base font-bold flex items-center gap-2 mb-1 ${isDaylight ? 'text-slate-900' : 'text-white'}`}>
              <Layers className="h-5 w-5 text-amber-500" />
              {editingType ? 'Edit Equipment Type' : 'Add New Equipment Type'}
            </h3>
            <p className={`text-xs mb-4 ${isDaylight ? 'text-slate-500' : 'text-slate-400'}`}>
              Category, type name, Hindi name, and localized terminology. Includes automatic fuzzy match check.
            </p>

            {fuzzyWarning && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Fuzzy Duplicate Detected:</span> {fuzzyWarning.message}
                </div>
              </div>
            )}

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Industry Sector Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AssetCategory)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                    }`}
                  >
                    <option value="AGRICULTURE">🌾 Agriculture (कृषि उपकरण)</option>
                    <option value="CONSTRUCTION">🏗️ Construction (निर्माण उपकरण)</option>
                    <option value="MULTIPURPOSE_FLEET">🚜 Multipurpose / Dual Use (बहुउद्देशीय)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Type Code (Auto/Custom)
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="TYPE-TRACTOR"
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono border outline-none ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Equipment Type Name (English) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. 4WD Agricultural Tractor, Concrete Mixer"
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                    }`}
                  />
                  {checkingFuzzy && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-amber-500 animate-pulse">
                      Checking availability...
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Hindi Name (हिंदी नाम)
                  </label>
                  <input
                    type="text"
                    value={hindiName}
                    onChange={(e) => setHindiName(e.target.value)}
                    placeholder="उदा. 4WD कृषि ट्रैक्टर"
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Local Language Name (स्थानीय नाम)
                  </label>
                  <input
                    type="text"
                    value={localLanguageName}
                    onChange={(e) => setLocalLanguageName(e.target.value)}
                    placeholder="उदा. बड़का ट्रैक्टर / जुताई मशीन"
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Description & Operational Specifications
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Operational capacity, attachments, and use cases..."
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none resize-none ${
                    isDaylight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="typeActive"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="typeActive" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Active (available for rental catalog and booking desk)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingType ? 'Update Equipment Type' : 'Create Equipment Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(typeToDelete)}
        onClose={() => setTypeToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Type Deletion"
        message={`Are you sure you want to permanently delete equipment type "${typeToDelete?.name}"? Deletion requires ROOT authority and cannot be undone.`}
        variant="error"
        confirmLabel="Delete Equipment Type"
        showCancel={true}
      />

      {/* Feedback Toast */}
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

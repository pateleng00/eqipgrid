import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench, Plus, Search, Edit2, Trash2, CheckCircle2,
  XCircle, AlertTriangle, Layers, Languages, FileText, RefreshCw, X, ShieldAlert
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../services/api';
import { EquipmentType, AssetCategory } from '../../types';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { SearchSelect } from '../../components/SearchSelect';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';

export const EquipmentTypeManagementView: React.FC = () => {
  const { isDaylight } = useTheme();
  const { currentUser } = useAuth();
  const isRoot = currentUser?.role === 'root';

  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState<number>(12);

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

  // Reset infinite scroll when search or filters change
  useEffect(() => {
    setVisibleCount(12);
  }, [search, categoryFilter, statusFilter]);

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
    if (!editingType && (!code || code === 'TYPE-' + name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 8))) {
      setCode('TYPE-' + val.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 10));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Equipment type name is required.');
      return;
    }
    if (!category) {
      setFormError('Category is strictly required (e.g. Agriculture, Construction, Multipurpose Fleet).');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase() || undefined,
        category,
        hindiName: hindiName.trim() || undefined,
        localLanguageName: localLanguageName.trim() || undefined,
        description: description.trim() || undefined,
        active,
      };

      if (editingType) {
        await api.updateEquipmentType(editingType.id, payload);
        setFeedback({
          isOpen: true,
          variant: 'success',
          title: 'Equipment Type Updated',
          message: `Successfully updated "${name.trim()}".`,
        });
      } else {
        await api.addEquipmentType(payload);
        setFeedback({
          isOpen: true,
          variant: 'success',
          title: 'Equipment Type Created',
          message: `Successfully created "${name.trim()}".`,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed. Please verify name uniqueness.');
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
        message: err.message || 'Admins can add and update, but cannot delete master records. Super-admin ROOT authority required.',
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

  // Infinite scroll slice
  const visibleTypes = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      if (visibleCount < filtered.length) {
        setVisibleCount((prev) => Math.min(prev + 12, filtered.length));
      }
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 12, filtered.length));
  };

  const getCategoryBadge = (cat: AssetCategory) => {
    if (cat === 'AGRICULTURE') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          🌾 Agriculture
        </span>
      );
    }
    if (cat === 'MULTIPURPOSE_FLEET') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
          🚜 Multipurpose Fleet
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
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
            Equipment Types &amp; Categories
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

      {/* Search & Category Filter Toolbar - Reduced search width, increased filter widths using SearchSelect */}
      <div className={`p-3 rounded-2xl border flex flex-col lg:flex-row items-center justify-between gap-3 flex-shrink-0 ${
        isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by English, Hindi name, code..."
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none transition-colors ${
              isDaylight
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
            }`}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto flex-1 justify-end">
          {/* Sector category dropdown using SearchSelect */}
          <div className="w-full sm:w-60">
            <SearchSelect
              options={[
                { value: 'all', label: 'All Sectors' },
                { value: 'AGRICULTURE', label: '🌾 Agriculture' },
                { value: 'CONSTRUCTION', label: '🏗️ Construction' },
                { value: 'MULTIPURPOSE_FLEET', label: '🚜 Multipurpose Fleet' },
              ]}
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val || 'all')}
              placeholder="Industry Sector"
              isClearable={false}
            />
          </div>

          {/* Status filter dropdown using SearchSelect */}
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

      {/* Types Table Area with Infinite Scroll */}
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
              <th className="py-2.5 px-4 font-semibold">Type Name &amp; Code</th>
              <th className="py-2.5 px-4 font-semibold">Industry Sector</th>
              <th className="py-2.5 px-4 font-semibold">Hindi &amp; Local Name</th>
              <th className="py-2.5 px-4 font-semibold">Description</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDaylight ? 'divide-slate-100' : 'divide-slate-800/60'}`}>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-500" />
                  Loading equipment types...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No equipment types found matching filters.
                </td>
              </tr>
            ) : (
              visibleTypes.map((t) => (
                <tr key={t.id} className={`transition-colors hover:${isDaylight ? 'bg-slate-50/80' : 'bg-slate-800/40'}`}>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{t.name}</div>
                    <div className="font-mono text-[11px] text-amber-600 dark:text-amber-400">{t.code}</div>
                  </td>
                  <td className="py-3 px-4">
                    {getCategoryBadge(t.category)}
                  </td>
                  <td className="py-3 px-4">
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
                  <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400" title={t.description}>
                    {t.description || '—'}
                  </td>
                  <td className="py-3 px-4">
                    {t.active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-500/10 border border-slate-500/20 px-2.5 py-0.5 rounded-full">
                        <XCircle className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
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
                        <div className="relative group">
                          <button
                            disabled
                            className="p-1.5 rounded-lg border border-slate-700 text-slate-500 opacity-40 cursor-not-allowed"
                            title="Admins cannot delete master records. Only ROOT super-admins can delete."
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
              ))
            )}
          </tbody>
        </table>

        {/* Infinite Scroll Footer */}
        {filtered.length > 0 && !loading && (
          <InfiniteScrollFooter
            loadedCount={visibleTypes.length}
            totalCount={filtered.length}
            onLoadMore={handleLoadMore}
            itemName="equipment types"
          />
        )}
      </div>

      {/* Add / Edit Modal - Increased Width (max-w-3xl) with React-Select Category */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full max-w-3xl rounded-2xl border p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${
            isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-1">
              <div className={`p-2.5 rounded-xl ${isDaylight ? 'bg-amber-100 text-amber-800' : 'bg-amber-950 text-amber-400'}`}>
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h3 className={`text-base sm:text-lg font-bold ${isDaylight ? 'text-slate-900' : 'text-white'}`}>
                  {editingType ? 'Edit Equipment Type' : 'Register New Equipment Type'}
                </h3>
                <p className={`text-xs ${isDaylight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Category, type name, Hindi name, and localized terminology. Includes automatic fuzzy match check.
                </p>
              </div>
            </div>

            {fuzzyWarning && (
              <div className="my-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Fuzzy Duplicate Detected:</span> {fuzzyWarning.message}
                </div>
              </div>
            )}

            {formError && (
              <div className="my-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Industry Sector Category <span className="text-rose-500">*</span>
                  </label>
                  <SearchSelect
                    options={[
                      { value: 'AGRICULTURE', label: '🌾 Agriculture (कृषि उपकरण)' },
                      { value: 'CONSTRUCTION', label: '🏗️ Construction (निर्माण उपकरण)' },
                      { value: 'MULTIPURPOSE_FLEET', label: '🚜 Multipurpose Fleet (बहुउद्देशीय)' },
                    ]}
                    value={category}
                    onChange={(val) => setCategory(val as AssetCategory)}
                    placeholder="Select Sector Category..."
                    isClearable={false}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Type Code (Auto/Custom)
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="TYPE-TRACTOR"
                    className={`w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm font-mono border outline-none transition-colors ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Equipment Type Name (English) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. 4WD Agricultural Tractor, Concrete Mixer, Harvester"
                    className={`w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-colors ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                    }`}
                  />
                  {checkingFuzzy && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-amber-500 animate-pulse font-medium">
                      Checking similarity...
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Hindi Name (हिंदी नाम)
                  </label>
                  <input
                    type="text"
                    value={hindiName}
                    onChange={(e) => setHindiName(e.target.value)}
                    placeholder="उदा. 4WD कृषि ट्रैक्टर"
                    className={`w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-colors ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Local Language / Vernacular Name (क्षेत्रीय नाम)
                  </label>
                  <input
                    type="text"
                    value={localLanguageName}
                    onChange={(e) => setLocalLanguageName(e.target.value)}
                    placeholder="उदा. जोताई ट्रैक्टर, मिक्सर मशीन"
                    className={`w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-colors ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Detailed Operational Description &amp; Technical Capabilities
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Primary agricultural attachment support, construction payload limits, standard operations..."
                  className={`w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-colors resize-none ${
                    isDaylight
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                  }`}
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Active Status</span>
                  <p className="text-[11px] text-slate-500">Allow this equipment type to be selected when commissioning fleet equipment</p>
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

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md disabled:opacity-50 transition-all cursor-pointer"
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

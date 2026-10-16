import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Globe,
  Hash,
  RefreshCw,
  X,
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../services/api';
import { Manufacturer } from '../../types';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { SearchSelect } from '../../components/SearchSelect';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';

/**
 * Curated list of heavy machinery and agricultural equipment manufacturing countries.
 * Excludes non-manufacturing nations or jurisdictions without prominent industrial equipment manufacturing.
 */
export const EQUIPMENT_MANUFACTURING_COUNTRIES = [
  'India',
  'Japan',
  'United States',
  'Germany',
  'United Kingdom',
  'Sweden',
  'South Korea',
  'Italy',
  'France',
  'Austria',
  'Finland',
  'Switzerland',
  'Netherlands',
  'Canada',
  'Brazil',
  'Australia',
  'Spain',
  'Belgium',
  'Poland',
  'Czech Republic',
] as const;

export const ManufacturerManagementView: React.FC = () => {
  const { isDaylight } = useTheme();
  const { currentUser } = useAuth();
  const isRoot = currentUser?.role === 'root';

  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMfg, setEditingMfg] = useState<Manufacturer | null>(null);
  const [mfgToDelete, setMfgToDelete] = useState<Manufacturer | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [country, setCountry] = useState('India');
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
      const data = await api.fetchManufacturers(true);
      setManufacturers(data);
    } catch {
      setManufacturers(api.getManufacturers(true));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = api.subscribe(() => {
      setManufacturers(api.getManufacturers(true));
    });
    return unsub;
  }, []);

  // Reset infinite scroll on search or filter change
  useEffect(() => {
    setVisibleCount(12);
  }, [search, statusFilter]);

  // Debounced fuzzy availability check
  useEffect(() => {
    if (!isModalOpen || !name.trim() || name.trim().length < 2) {
      setFuzzyWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingFuzzy(true);
      try {
        const res = await api.checkManufacturerAvailability(name.trim(), editingMfg?.id);
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
  }, [name, isModalOpen, editingMfg]);

  const openCreateModal = () => {
    setEditingMfg(null);
    setName('');
    setCode('');
    setCountry('India');
    setActive(true);
    setFormError('');
    setFuzzyWarning(null);
    setIsModalOpen(true);
  };

  const openEditModal = (mfg: Manufacturer) => {
    setEditingMfg(mfg);
    setName(mfg.name);
    setCode(mfg.code);
    setCountry(mfg.country || 'India');
    setActive(mfg.active);
    setFormError('');
    setFuzzyWarning(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (
      !editingMfg &&
      (!code ||
        code ===
          name
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '-')
            .slice(0, 10))
    ) {
      setCode(
        val
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '-')
          .slice(0, 12),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Manufacturer name is required.');
      return;
    }
    if (!code.trim()) {
      setFormError('Manufacturer code is required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (editingMfg) {
        await api.updateManufacturer(editingMfg.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          country: country.trim() || 'India',
          active,
        });
        setFeedback({
          isOpen: true,
          variant: 'success',
          title: 'Manufacturer Updated',
          message: `Successfully updated manufacturer "${name.trim()}".`,
        });
      } else {
        await api.addManufacturer(name.trim(), code.trim().toUpperCase(), country.trim() || 'India', active);
        setFeedback({
          isOpen: true,
          variant: 'success',
          title: 'Manufacturer Added',
          message: `Successfully created manufacturer "${name.trim()}".`,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!mfgToDelete) return;
    try {
      await api.deleteManufacturer(mfgToDelete.id);
      setFeedback({
        isOpen: true,
        variant: 'success',
        title: 'Manufacturer Deleted',
        message: `Manufacturer "${mfgToDelete.name}" has been deleted.`,
      });
      setMfgToDelete(null);
      await loadData();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        variant: 'error',
        title: 'Deletion Restricted',
        message: err.message || 'Admins can add and update, but cannot delete master records.',
      });
      setMfgToDelete(null);
    }
  };

  const filtered = useMemo(() => {
    return manufacturers.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.code.toLowerCase().includes(search.toLowerCase()) ||
        (m.country && m.country.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;
      if (statusFilter === 'active') return m.active;
      if (statusFilter === 'inactive') return !m.active;
      return true;
    });
  }, [manufacturers, search, statusFilter]);

  // Infinite scroll slice
  const visibleManufacturers = useMemo(() => {
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

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDaylight ? 'text-slate-900' : 'text-white'}`}>
            <Building2 className="h-5 w-5 text-amber-500" />
            Original Equipment Manufacturers (OEM)
          </h2>
          <p className={`text-xs ${isDaylight ? 'text-slate-500' : 'text-slate-400'}`}>
            Manage machinery makers, brand codes, and global provenance. Admins can add and update; deletion is
            restricted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDaylight
                ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                : 'border-slate-800 hover:bg-slate-800 text-slate-300'
            }`}
            title="Refresh List"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Manufacturer (OEM)
          </button>
        </div>
      </div>

      {/* Filter / Search Bar with React-Select and Balanced Proportions */}
      <div
        className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 ${
          isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="relative w-full sm:w-72 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search OEM name, code, country..."
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none transition-colors ${
              isDaylight
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-48">
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

      {/* Table Area with Infinite Scroll */}
      <div
        onScroll={handleScroll}
        className={`flex-1 min-h-0 rounded-2xl border overflow-auto ${
          isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
        }`}
      >
        <table className="w-full text-left border-collapse text-xs">
          <thead
            className={`sticky top-0 z-10 border-b ${
              isDaylight
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : 'bg-slate-950/90 border-slate-800 text-slate-400'
            }`}
          >
            <tr>
              <th className="py-2.5 px-4 font-semibold">OEM Name</th>
              <th className="py-2.5 px-4 font-semibold">Brand Code</th>
              <th className="py-2.5 px-4 font-semibold">Country of Origin</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDaylight ? 'divide-slate-100' : 'divide-slate-800/60'}`}>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-500" />
                  Loading manufacturers...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  No manufacturers found matching your query.
                </td>
              </tr>
            ) : (
              visibleManufacturers.map((mfg) => (
                <tr
                  key={mfg.id}
                  className={`transition-colors hover:${isDaylight ? 'bg-slate-50/80' : 'bg-slate-800/40'}`}
                >
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg ${isDaylight ? 'bg-amber-100/60 text-amber-800' : 'bg-amber-950/40 text-amber-400'}`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span>{mfg.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-amber-600 dark:text-amber-400">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {mfg.code}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-slate-400" />
                      {mfg.country || 'India'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {mfg.active ? (
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
                        onClick={() => openEditModal(mfg)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isDaylight
                            ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                            : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                        }`}
                        title="Edit Manufacturer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {isRoot ? (
                        <button
                          onClick={() => setMfgToDelete(mfg)}
                          className="p-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Delete Manufacturer (Root Authority)"
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
            loadedCount={visibleManufacturers.length}
            totalCount={filtered.length}
            onLoadMore={handleLoadMore}
            itemName="manufacturers"
          />
        )}
      </div>

      {/* Add / Edit Modal - Increased Width (max-w-3xl) with React-Select Country List */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`relative w-full max-w-3xl rounded-2xl border p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${
              isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-1">
              <div
                className={`p-2.5 rounded-xl ${isDaylight ? 'bg-amber-100 text-amber-800' : 'bg-amber-950 text-amber-400'}`}
              >
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className={`text-base sm:text-lg font-bold ${isDaylight ? 'text-slate-900' : 'text-white'}`}>
                  {editingMfg ? 'Edit Manufacturer (OEM)' : 'Register New Manufacturer (OEM)'}
                </h3>
                <p className={`text-xs ${isDaylight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Name, brand code, and country are required. Default active status with automatic fuzzy duplicate
                  avoidance.
                </p>
              </div>
            </div>

            {/* Fuzzy match warning banner */}
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
                    Manufacturer Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Mahindra, John Deere, JCB, Kubota"
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

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Brand Code <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. MAHINDRA, DEERE, JCB"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs sm:text-sm font-mono border outline-none transition-colors ${
                        isDaylight
                          ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                          : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Country Selection using React-Select (SearchSelect) from curated equipment manufacturing countries */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Country of Origin <span className="text-rose-500">*</span>
                </label>
                <SearchSelect
                  options={EQUIPMENT_MANUFACTURING_COUNTRIES.map((c) => ({
                    value: c,
                    label: c,
                  }))}
                  value={country}
                  onChange={(val) => setCountry(val || 'India')}
                  placeholder="Select Manufacturer Country..."
                  isClearable={false}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Selected from premier global heavy machinery and agricultural equipment industrial hubs.
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Active Status</span>
                  <p className="text-[11px] text-slate-500">
                    Allow this OEM to be selected when commissioning fleet equipment and defining models
                  </p>
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
                  {submitting ? 'Saving...' : editingMfg ? 'Update Manufacturer' : 'Create Manufacturer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={Boolean(mfgToDelete)}
        onClose={() => setMfgToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Manufacturer Deletion"
        message={`Are you sure you want to permanently delete manufacturer "${mfgToDelete?.name}"? This operation requires ROOT authority.`}
        variant="error"
        confirmLabel="Delete Manufacturer"
        showCancel={true}
      />

      {/* Feedback Alert Modal */}
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

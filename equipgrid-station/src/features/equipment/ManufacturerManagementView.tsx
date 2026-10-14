import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Plus, Search, Edit2, Trash2, CheckCircle2,
  XCircle, AlertTriangle, ShieldAlert, Globe, Hash, RefreshCw, X
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../services/api';
import { Manufacturer } from '../../types';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export const ManufacturerManagementView: React.FC = () => {
  const { isDaylight } = useTheme();
  const { currentUser } = useAuth();
  const isRoot = currentUser?.role === 'root';

  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

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
    if (!editingMfg && (!code || code === name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 10))) {
      setCode(val.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 12));
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
            Manage machinery makers, brand codes, and global provenance. Admins can add and update; deletion is restricted.
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
            Add Manufacturer (OEM)
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-center gap-3 flex-shrink-0 ${
        isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search manufacturers by name, code, or country..."
            className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border outline-none transition-colors ${
              isDaylight
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Status:</span>
          {(['all', 'active', 'inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
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

      {/* Table Area */}
      <div className={`flex-1 min-h-0 rounded-2xl border overflow-auto ${
        isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
      }`}>
        <table className="w-full text-left border-collapse text-xs">
          <thead className={`sticky top-0 z-10 border-b ${
            isDaylight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/90 border-slate-800 text-slate-400'
          }`}>
            <tr>
              <th className="py-2.5 px-4 font-semibold">OEM Name</th>
              <th className="py-2.5 px-4 font-semibold">Brand Code</th>
              <th className="py-2.5 px-4 font-semibold">Country</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDaylight ? 'divide-slate-100' : 'divide-slate-800/60'}`}>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                  Loading manufacturers...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No manufacturers found matching your query.
                </td>
              </tr>
            ) : (
              filtered.map((mfg) => (
                <tr key={mfg.id} className={`transition-colors hover:${isDaylight ? 'bg-slate-50/80' : 'bg-slate-800/40'}`}>
                  <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                    {mfg.name}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-amber-600 dark:text-amber-400">
                    {mfg.code}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3 w-3 text-slate-400" />
                      {mfg.country || 'India'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    {mfg.active ? (
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
                        onClick={() => openEditModal(mfg)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isDaylight ? 'border-slate-200 hover:bg-slate-100 text-slate-700' : 'border-slate-700 hover:bg-slate-800 text-slate-300'
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
          <div className={`relative w-full max-w-md rounded-2xl border p-5 shadow-2xl transition-all ${
            isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className={`text-base font-bold flex items-center gap-2 mb-1 ${isDaylight ? 'text-slate-900' : 'text-white'}`}>
              <Building2 className="h-5 w-5 text-amber-500" />
              {editingMfg ? 'Edit Manufacturer' : 'Add New Manufacturer (OEM)'}
            </h3>
            <p className={`text-xs mb-4 ${isDaylight ? 'text-slate-500' : 'text-slate-400'}`}>
              Name, brand code, and country are required. Default active status with automatic fuzzy duplicate avoidance.
            </p>

            {/* Fuzzy match warning banner */}
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
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Manufacturer Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Mahindra, John Deere, JCB"
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

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Brand Code <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MAHINDRA, DEERE, JCB"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-mono border outline-none ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Country of Origin <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India, Japan, Germany, USA"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-none ${
                      isDaylight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mfgActive"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="mfgActive" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Active (available for model mapping and fleet onboarding)
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

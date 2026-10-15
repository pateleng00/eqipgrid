import React, { useState, useMemo } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Search,
  Filter,
  Check,
  Gauge,
  Truck,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { api, resolveAssetS3Key, sanitizeMediaUrl } from '../../services/api';
import { useTheme } from '../../lib/ThemeContext';
import { formatINR, cn } from '../../lib/utils';
import { Asset, AssetStatus } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';

interface MaintenanceDeckViewProps {
  onNavigate?: (tab: string) => void;
}

export const MaintenanceDeckView: React.FC<MaintenanceDeckViewProps> = ({ onNavigate }) => {
  const { isDaylight } = useTheme();
  const assets = api.assets || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'CRITICAL' | 'ROUTINE'>('ALL');
  const [certifyingAsset, setCertifyingAsset] = useState<Asset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simple, plain inspection checklist
  const [checklist, setChecklist] = useState({
    engineOil: true,
    cutterBlades: true,
    hydraulics: true,
    safetyGuards: true,
    batteryFuel: true,
  });

  // Assets needing repair or maintenance
  const underMaintenance = useMemo(() => {
    return assets.filter(
      (a) =>
        a.status === 'MAINTENANCE' ||
        a.status === 'INSPECTION' ||
        a.status === 'DAMAGE_ASSESSMENT' ||
        a.status === 'DAMAGED' ||
        (a.engineHours && a.engineHours >= 120),
    );
  }, [assets]);

  // Filtered list
  const filteredList = useMemo(() => {
    return underMaintenance.filter((a) => {
      if (filterMode === 'CRITICAL') {
        if (a.status !== 'DAMAGED' && a.status !== 'DAMAGE_ASSESSMENT') return false;
      } else if (filterMode === 'ROUTINE') {
        if (a.status !== 'MAINTENANCE' && a.status !== 'INSPECTION') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.assetTag.toLowerCase().includes(q) ||
          a.serialNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [underMaintenance, filterMode, searchQuery]);

  // Certify and release to yard as AVAILABLE
  const handleCertifyReady = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certifyingAsset) return;

    setIsSubmitting(true);
    try {
      await api.updateAssetStatus(certifyingAsset.id, 'AVAILABLE');
      setCertifyingAsset(null);
    } catch (err) {
      console.error('Failed to update asset status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3 overflow-hidden">
      {/* ── Top Header (Plain Language) ── */}
      <div
        className={cn(
          'p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-sm transition-colors',
          isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/80 border-slate-800 text-white',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 shrink-0">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-black tracking-tight">
                Machine Repairs & Servicing (मशीनों की मरम्मत और सर्विस)
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30">
                {underMaintenance.length} Machines Needing Work
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Check machines that need repair, oil change, or cleaning, and make them ready to rent.
            </p>
          </div>
        </div>

        {/* Quick simple counts */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-center">
            <div className="text-[10px] font-bold text-slate-500">Regular Service (नियमित सर्विस)</div>
            <div className="text-sm font-black font-mono text-amber-500">
              {underMaintenance.filter((a) => a.status === 'MAINTENANCE' || a.status === 'INSPECTION').length}
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-center">
            <div className="text-[10px] font-bold text-slate-500">Broken / Damaged (खराब मशीनें)</div>
            <div className="text-sm font-black font-mono text-rose-500">
              {underMaintenance.filter((a) => a.status === 'DAMAGED' || a.status === 'DAMAGE_ASSESSMENT').length}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div
        className={cn(
          'p-2.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 transition-colors',
          isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-800',
        )}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterMode('ALL')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border select-none shrink-0',
              filterMode === 'ALL'
                ? isDaylight
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-950 border-white font-black'
                : isDaylight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border-slate-700',
            )}
          >
            All Machines Needing Work ({underMaintenance.length})
          </button>

          <button
            onClick={() => setFilterMode('CRITICAL')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border select-none shrink-0',
              filterMode === 'CRITICAL'
                ? 'bg-rose-500 text-white border-rose-500 font-black shadow-sm'
                : isDaylight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border-slate-700',
            )}
          >
            Broken or Damaged (खराब / टूटी हुई)
          </button>

          <button
            onClick={() => setFilterMode('ROUTINE')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border select-none shrink-0',
              filterMode === 'ROUTINE'
                ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-sm'
                : isDaylight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border-slate-700',
            )}
          >
            Oil Change & Routine Service (सर्विस का समय)
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search machine name or tag..."
            className={cn(
              'w-full rounded-lg border pl-8 pr-2.5 py-1.5 text-xs transition-colors focus:outline-none',
              isDaylight
                ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-rose-500'
                : 'border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:border-rose-500',
            )}
          />
        </div>
      </div>

      {/* ── Machines List ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {filteredList.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2 border border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
            <CheckCircle className="h-10 w-10 text-emerald-500 opacity-80" />
            <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
              All Machines Are Clean and Working
            </div>
            <p className="text-[11px] text-slate-500 max-w-sm">
              No machine needs repair right now. All fleet units in the yard are ready to rent.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredList.map((asset) => {
              const s3Key = resolveAssetS3Key(asset.assetTag);
              const photoUrl = sanitizeMediaUrl(asset.imageUrl, `${s3Key}.jpg`);

              return (
                <div
                  key={asset.id}
                  className={cn(
                    'rounded-2xl border p-4 flex flex-col justify-between shadow-xs transition-all hover:shadow-md',
                    isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/70 border-slate-800/80',
                  )}
                >
                  <div>
                    {/* Machine ID Tag & Status */}
                    <div className="flex items-center justify-between gap-1 mb-2.5">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        {asset.assetTag}
                      </span>
                      <StatusBadge status={asset.status} size="sm" showFarmerLabel={true} />
                    </div>

                    {/* Machine Photo and Name */}
                    <div className="flex items-center gap-3 my-2">
                      <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={asset.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Truck className="h-6 w-6 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-black text-xs text-slate-900 dark:text-white truncate">{asset.name}</h3>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{asset.modelName}</p>
                      </div>
                    </div>

                    {/* Machine Info */}
                    <div className="my-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Hours Run (घंटे चले):</span>
                        <strong className="text-slate-900 dark:text-white">{asset.engineHours || 0} Hours</strong>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Service Due:</span>
                        <span className="text-amber-500 font-bold">Every 100 hours</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Current Area:</span>
                        <span className="text-rose-400 font-bold">Area 5: Repair Shed</span>
                      </div>
                    </div>
                  </div>

                  {/* Mark Ready Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 font-mono truncate">
                      {asset.conditionNotes || 'Needs maintenance check'}
                    </span>

                    <button
                      onClick={() => setCertifyingAsset(asset)}
                      className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Ready to Rent (तैयार करें)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Ready Checklist Modal (Plain Language) ── */}
      {certifyingAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setCertifyingAsset(null)}
        >
          <div
            className={cn(
              'w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden p-5 transition-all',
              isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                    {certifyingAsset.assetTag}
                  </span>
                  <span className="text-xs font-bold text-emerald-500">Checking Machine Condition</span>
                </div>
                <h3 className="font-black text-base mt-1">{certifyingAsset.name}</h3>
              </div>

              <button
                onClick={() => setCertifyingAsset(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCertifyReady} className="space-y-4 my-4">
              <p className="text-xs text-slate-500">
                Please check the following points. Once confirmed, this machine will be shown as{' '}
                <strong>Ready for Rent (उपलब्ध)</strong> in the yard.
              </p>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.engineOil}
                    onChange={(e) => setChecklist({ ...checklist, engineOil: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>1. Engine oil is full and clean (इंजन ऑयल चेक किया)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.cutterBlades}
                    onChange={(e) => setChecklist({ ...checklist, cutterBlades: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>2. Blades, tines, and cutting parts are sharp and tight (ब्लेड और कटर सही हैं)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.hydraulics}
                    onChange={(e) => setChecklist({ ...checklist, hydraulics: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>3. No diesel, petrol, or oil leakage (कोई लीकेज नहीं है)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.safetyGuards}
                    onChange={(e) => setChecklist({ ...checklist, safetyGuards: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>4. Safety cover and stop switch work properly (सेफ्टी स्विच और गार्ड ठीक हैं)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.batteryFuel}
                    onChange={(e) => setChecklist({ ...checklist, batteryFuel: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>5. Machine starts easily and fuel is ready (मशीन आसानी से स्टार्ट हो रही है)</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Checked by (जांच करने वाले का नाम)
                </label>
                <input
                  type="text"
                  required
                  defaultValue="Deepak Verma (Yard Technician)"
                  className={cn(
                    'w-full rounded-xl border px-3 py-2 text-xs focus:outline-none',
                    isDaylight
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500'
                      : 'border-slate-800 bg-slate-950 text-white focus:border-emerald-500',
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCertifyingAsset(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel (रद्द करें)
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Mark Ready for Rent (तैयार घोषित करें)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

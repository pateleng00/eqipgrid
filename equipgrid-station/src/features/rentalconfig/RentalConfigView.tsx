import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Truck,
  Calculator,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { RentalConfiguration, AssetCategory } from '../../types';
import { SearchSelect } from '../../components/SearchSelect';
import { formatINR } from '../../lib/utils';
import { SkeletonTable } from '../../components/SkeletonTable';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';

export const RentalConfigView: React.FC = () => {
  const { isDaylight } = useTheme();

  const [configs, setConfigs] = useState<RentalConfiguration[]>(() => api.getRentalConfigs());
  const hubs = api.getHubs();
  const cities = api.getCities();
  const states = api.getStates();
  const types = api.getEquipmentTypes();
  const models = api.getMachineModels();
  const assets = api.assets;

  React.useEffect(() => {
    setConfigs(api.getRentalConfigs());
    return api.subscribe(() => {
      setConfigs(api.getRentalConfigs());
    });
  }, []);

  // Filter state
  const [selectedStateId, setSelectedStateId] = useState<string>('ALL');
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');

  const [visibleCount, setVisibleCount] = useState<number>(7);

  const availableCities = cities.filter((c) =>
    selectedStateId === 'ALL' ? true : c.stateId === Number(selectedStateId)
  );
  const availableHubs = hubs.filter((h) => {
    if (selectedCityId !== 'ALL') return h.cityId === Number(selectedCityId);
    if (selectedStateId !== 'ALL') {
      const cityIds = new Set(availableCities.map((c) => c.id));
      return cityIds.has(h.cityId);
    }
    return true;
  });

  const filteredConfigs = configs.filter((c) => {
    const hub = hubs.find((h) => h.id === c.hubId);
    const city = cities.find((cty) => cty.id === hub?.cityId);
    if (selectedStateId !== 'ALL' && city?.stateId !== Number(selectedStateId)) return false;
    if (selectedCityId !== 'ALL' && hub?.cityId !== Number(selectedCityId)) return false;
    if (selectedHubId !== 'ALL' && c.hubId !== Number(selectedHubId)) return false;
    return true;
  });

  // Reset to initial 7 items when regional filters change
  React.useEffect(() => {
    setVisibleCount(7);
  }, [selectedStateId, selectedCityId, selectedHubId]);

  // Infinite scroll slice (default 7 items, loads +7 on scroll)
  const visibleConfigs = React.useMemo(() => {
    return filteredConfigs.slice(0, visibleCount);
  }, [filteredConfigs, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 60) {
      if (visibleCount < filteredConfigs.length) {
        setVisibleCount((prev) => Math.min(prev + 7, filteredConfigs.length));
      }
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 7, filteredConfigs.length));
  };

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RentalConfiguration | null>(null);
  const [configPendingRemoval, setConfigPendingRemoval] = useState<RentalConfiguration | null>(null);

  // Form states - Cascading selection: State -> City -> Hub -> Category -> Model -> Machine Name
  const [formStateId, setFormStateId] = useState<number | ''>('');
  const [formCityId, setFormCityId] = useState<number | ''>('');
  const [formHubId, setFormHubId] = useState<number | ''>(hubs[0]?.id || 1);
  const [formCategory, setFormCategory] = useState<AssetCategory | ''>('CONSTRUCTION');
  const [formModelId, setFormModelId] = useState<number | ''>('');
  const [formAssetId, setFormAssetId] = useState<number | ''>('');
  const [formBaseRate, setFormBaseRate] = useState<string>('');
  const [formDeposit, setFormDeposit] = useState<string>('');
  const [formOperatorRate, setFormOperatorRate] = useState<string>('');
  const [formFreeKm, setFormFreeKm] = useState<string>('');
  const [formRatePerKm, setFormRatePerKm] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Cascaded lists for form
  const formAvailableCities = React.useMemo(() => {
    if (!formStateId) return cities;
    return cities.filter((c) => c.stateId === Number(formStateId));
  }, [cities, formStateId]);

  const formAvailableHubs = React.useMemo(() => {
    if (formCityId) {
      return hubs.filter((h) => h.cityId === Number(formCityId));
    }
    if (formStateId) {
      const cityIds = new Set(formAvailableCities.map((c) => c.id));
      return hubs.filter((h) => cityIds.has(h.cityId));
    }
    return hubs;
  }, [hubs, formAvailableCities, formCityId, formStateId]);

  const formAvailableModels = React.useMemo(() => {
    let list = models;
    if (formCategory) {
      const categoryTypeIds = new Set(types.filter((t) => t.category === formCategory).map((t) => t.id));
      list = list.filter((m) => categoryTypeIds.has(m.typeId));
    }
    return list;
  }, [models, types, formCategory]);

  const formAvailableAssets = React.useMemo(() => {
    let list = assets;
    if (formHubId) {
      list = list.filter((a) => a.hubId === Number(formHubId));
    }
    if (formCategory) {
      list = list.filter((a) => a.category === formCategory);
    }
    if (formModelId) {
      list = list.filter((a) => a.modelId === Number(formModelId));
    }
    return list;
  }, [assets, formHubId, formCategory, formModelId]);

  // Interactive Live Calculation Test Bench
  const [simDistanceKm, setSimDistanceKm] = useState<number>(7.5);
  const [simDays, setSimDays] = useState<number>(3);
  const [simConfigId, setSimConfigId] = useState<number>(configs[0]?.id || 1);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleOpenAdd = () => {
    const initialHub = hubs[0];
    const initialCity = cities.find((c) => c.id === initialHub?.cityId);
    setFormStateId(initialCity?.stateId || states[0]?.id || '');
    setFormCityId(initialCity?.id || '');
    setFormHubId(initialHub?.id || 1);
    setFormCategory('CONSTRUCTION');
    setFormModelId('');
    setFormAssetId('');
    setFormBaseRate('');
    setFormDeposit('');
    setFormOperatorRate('500');
    setFormFreeKm('5.0');
    setFormRatePerKm('10.0');
    setFormNotes('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (c: RentalConfiguration) => {
    setEditingConfig(c);
    const hub = hubs.find((h) => h.id === c.hubId);
    const city = cities.find((cty) => cty.id === hub?.cityId);
    const asset = c.assetId ? assets.find((a) => a.id === c.assetId) : undefined;
    const model = asset?.modelId ? models.find((m) => m.id === asset.modelId) : (c.typeId ? models.find((m) => m.typeId === c.typeId) : undefined);
    const category = asset?.category || (c.typeId ? types.find((t) => t.id === c.typeId)?.category : 'CONSTRUCTION');

    setFormStateId(city ? city.stateId : '');
    setFormCityId(hub ? hub.cityId : '');
    setFormHubId(c.hubId);
    setFormCategory((category as AssetCategory) || 'CONSTRUCTION');
    setFormModelId(model?.id || '');
    setFormAssetId(c.assetId || '');
    setFormBaseRate(String(c.baseDailyRate));
    setFormDeposit(String(c.depositAmount));
    setFormOperatorRate(String(c.operatorDailyRate));
    setFormFreeKm(String(c.freeDeliveryDistanceKm));
    setFormRatePerKm(String(c.ratePerKmAfterFree));
    setFormNotes(c.notes || '');
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    const modelObj = formModelId ? models.find((m) => m.id === Number(formModelId)) : undefined;
    const added = api.addRentalConfig({
      hubId: Number(formHubId),
      assetId: formAssetId ? Number(formAssetId) : undefined,
      typeId: modelObj?.typeId,
      baseDailyRate: parseFloat(formBaseRate) || 1000,
      depositAmount: parseFloat(formDeposit) || 4000,
      operatorDailyRate: parseFloat(formOperatorRate) || 500,
      freeDeliveryDistanceKm: parseFloat(formFreeKm) || 5.0,
      ratePerKmAfterFree: parseFloat(formRatePerKm) || 10.0,
      notes: formNotes,
    });
    setConfigs([...api.getRentalConfigs()]);
    setShowAddModal(false);
    setToastMsg(`Rental configuration created for ${added.hubName || 'Hub'}.`);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;
    const updated = api.updateRentalConfig(editingConfig.id, {
      baseDailyRate: parseFloat(formBaseRate) || editingConfig.baseDailyRate,
      depositAmount: parseFloat(formDeposit) || editingConfig.depositAmount,
      operatorDailyRate: parseFloat(formOperatorRate) || editingConfig.operatorDailyRate,
      freeDeliveryDistanceKm: parseFloat(formFreeKm) || editingConfig.freeDeliveryDistanceKm,
      ratePerKmAfterFree: parseFloat(formRatePerKm) || editingConfig.ratePerKmAfterFree,
      notes: formNotes,
    });
    setConfigs([...api.getRentalConfigs()]);
    setEditingConfig(null);
    if (updated) {
      setToastMsg(`Rental configuration #${updated.id} successfully updated.`);
    }
  };

  const handleRemove = () => {
    if (!configPendingRemoval) return;
    const ok = api.removeRentalConfig(configPendingRemoval.id);
    if (ok) {
      setConfigs([...api.getRentalConfigs()]);
      setToastMsg('Rental configuration removed successfully.');
    }
    setConfigPendingRemoval(null);
  };

  // Compute test simulation
  const activeSimConfig = configs.find((c) => c.id === simConfigId) || configs[0];
  const simFree = activeSimConfig?.freeDeliveryDistanceKm ?? 5.0;
  const simRateKm = activeSimConfig?.ratePerKmAfterFree ?? 10.0;
  const simDeliveryFee = simDistanceKm <= simFree
    ? 0
    : Math.round((simDistanceKm - simFree) * simRateKm);
  const simRent = (activeSimConfig?.baseDailyRate || 1000) * simDays;
  const simOperator = (activeSimConfig?.operatorDailyRate || 500) * simDays;
  const simTotal = simRent + simOperator + simDeliveryFee + (activeSimConfig?.depositAmount || 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2
            className={`text-lg sm:text-xl font-black flex items-center gap-2 ${
              isDaylight ? 'text-slate-950' : 'text-white'
            }`}
          >
            <SlidersHorizontal className={`h-5 w-5 ${isDaylight ? 'text-amber-700' : 'text-slate-400'}`} />
            Rental Configuration
          </h2>
        </div>

        <button
          onClick={handleOpenAdd}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-none self-start sm:self-auto ${
            isDaylight
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>New Rental Config</span>
        </button>
      </div>

      {toastMsg && (
        <div className="flex-shrink-0 rounded-xl border border-emerald-500/60 bg-emerald-500/10 p-2.5 text-xs text-emerald-800 flex items-center justify-between font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
          <button
            onClick={() => setToastMsg(null)}
            className="text-slate-600 hover:text-slate-950 text-xs px-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Cascading Regional Filters */}
      <div
        className={`flex-shrink-0 p-2.5 rounded-xl border transition-colors space-y-1.5 ${
          isDaylight ? 'border-slate-200 bg-white text-slate-950 shadow-sm' : 'border-slate-800 bg-slate-900/40 text-slate-200'
        }`}
      >
        <div className="flex items-center justify-end">
          <button
            onClick={() => {
              setSelectedStateId('ALL');
              setSelectedCityId('ALL');
              setSelectedHubId('ALL');
            }}
            className={`text-[11px] font-medium cursor-pointer ${
              isDaylight ? 'text-amber-800 hover:text-amber-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <SearchSelect
              options={[{ value: 'ALL', label: 'All States' }, ...states.map((s) => ({ value: String(s.id), label: s.name }))]}
              value={selectedStateId}
              onChange={(val) => {
                setSelectedStateId(String(val || 'ALL'));
                setSelectedCityId('ALL');
                setSelectedHubId('ALL');
              }}
              placeholder="All States"
              isClearable={false}
            />
          </div>
          <div>
            <SearchSelect
              options={[{ value: 'ALL', label: 'All Cities' }, ...availableCities.map((c) => ({ value: String(c.id), label: c.name }))]}
              value={selectedCityId}
              onChange={(val) => {
                setSelectedCityId(String(val || 'ALL'));
                setSelectedHubId('ALL');
              }}
              placeholder="All Cities"
              isClearable={false}
            />
          </div>
          <div>
            <SearchSelect
              options={[{ value: 'ALL', label: 'All Hubs' }, ...availableHubs.map((h) => ({ value: String(h.id), label: h.name }))]}
              value={selectedHubId}
              onChange={(val) => setSelectedHubId(String(val || 'ALL'))}
              placeholder="All Hubs"
              isClearable={false}
            />
          </div>
        </div>
      </div>

      {/* Configurations Table */}
      <div
        className={`flex-1 min-h-0 rounded-2xl border overflow-hidden transition-colors flex flex-col ${
          isDaylight ? 'border-slate-200 bg-white text-slate-950 shadow-sm' : 'border-slate-800 bg-slate-900/40 text-slate-200'
        }`}
      >
        <div className={`px-3.5 py-2 border-b flex items-center justify-between flex-shrink-0 ${isDaylight ? 'border-slate-200' : 'border-slate-800/60'}`}>
          <div className="flex items-center gap-2">
            <Calculator className={`h-4 w-4 ${isDaylight ? 'text-amber-700' : 'text-purple-400'}`} />
            <h3 className={`font-black text-xs sm:text-sm ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
              Rental Rate Policies ({filteredConfigs.length})
            </h3>
          </div>
        </div>
        <div
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-x-auto overflow-y-auto"
        >
          <table className="w-full text-left text-xs">
            <thead className={`sticky top-0 z-10 border-b text-[11px] font-black uppercase tracking-wider ${isDaylight ? 'border-slate-300 bg-slate-100 text-slate-800 shadow-xs' : 'border-slate-800 bg-slate-950 text-slate-300 shadow-xs'}`}>
              <tr>
                <th className="py-3 px-4">Scope (Machine / Hub)</th>
                <th className="py-3 px-4">Stationed Yard & City</th>
                <th className="py-3 px-4">Daily Rent</th>
                <th className="py-3 px-4">Security Deposit</th>
                <th className="py-3 px-4">Free Pick & Drop</th>
                <th className="py-3 px-4">Over-Radius Rate</th>
                <th className="py-3 px-4">Operator DPR</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDaylight ? 'divide-slate-100' : 'divide-slate-800/50'}`}>
              {visibleConfigs.map((c) => (
                <tr key={c.id} className={`transition-colors ${isDaylight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/30'}`}>
                  <td className="py-3.5 px-4">
                    <div className={`font-bold text-sm ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
                      {c.assetName || (c.typeName ? `All ${c.typeName}` : 'All Hub Machines')}
                    </div>
                    {c.notes && (
                      <div className={`text-[11px] max-w-[220px] truncate ${isDaylight ? 'text-slate-600' : 'text-slate-500'}`}>{c.notes}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold">{c.hubName || 'Yard'}</div>
                    <div className={`text-[11px] ${isDaylight ? 'text-slate-600' : 'text-slate-500'}`}>{c.cityName || 'City'}</div>
                  </td>
                  <td className={`py-3.5 px-4 font-mono font-black ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
                    {formatINR(c.baseDailyRate)}/day
                  </td>
                  <td className={`py-3.5 px-4 font-mono font-bold ${isDaylight ? 'text-amber-700' : 'text-amber-400'}`}>
                    {formatINR(c.depositAmount)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`font-mono font-black px-2 py-0.5 rounded border border-emerald-400 ${isDaylight ? 'text-emerald-700 bg-emerald-500/10' : 'text-emerald-300 bg-emerald-500/10'}`}>
                      {c.freeDeliveryDistanceKm} KM (₹0)
                    </span>
                  </td>
                  <td className={`py-3.5 px-4 font-mono font-bold ${isDaylight ? 'text-slate-800' : 'text-slate-300'}`}>
                    ₹{c.ratePerKmAfterFree}/km
                  </td>
                  <td className={`py-3.5 px-4 font-mono ${isDaylight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {formatINR(c.operatorDailyRate)}/day
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Configuration"
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${isDaylight ? 'border-slate-300 hover:bg-slate-200/60 text-slate-800' : 'border-slate-700 hover:bg-slate-800 text-slate-300'}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfigPendingRemoval(c)}
                        title="Remove Configuration"
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isDaylight
                            ? 'border-rose-300 bg-rose-50/70 hover:bg-rose-100 text-rose-700'
                            : 'border-rose-500/50 hover:bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Infinite Scroll Footer */}
        {filteredConfigs.length > 0 && (
          <InfiniteScrollFooter
            loadedCount={visibleConfigs.length}
            totalCount={filteredConfigs.length}
            onLoadMore={handleLoadMore}
            itemName="policies"
          />
        )}
      </div>

      {/* --- ADD / EDIT RENTAL CONFIG MODAL --- */}
      {(showAddModal || editingConfig) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className={`w-full max-w-5xl max-h-[calc(100vh-2.5rem)] overflow-y-auto rounded-3xl border p-8 sm:p-10 shadow-2xl space-y-6 ${isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#1e1e1e] text-slate-100'}`}>
            <div className={`flex items-center justify-between border-b pb-4 ${
              isDaylight ? 'border-slate-200' : 'border-slate-700/30'
            }`}>
              <h3 className="text-base font-black flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-amber-500" />
                <span>{editingConfig ? 'Update Rental Configuration' : 'Create Machine & Hub Rental Configuration'}</span>
              </h3>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setEditingConfig(null); }}
                aria-label="Close rental configuration dialog"
                className={`rounded-lg border p-2 transition-colors cursor-pointer ${
                  isDaylight
                    ? 'border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingConfig ? handleUpdate : handleSaveNew} className="space-y-4">
              {/* Step 1: Territory Cascade: State -> City -> Hub */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
                <div className="text-xs font-black flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-[10px] flex items-center justify-center font-bold">1</span>
                  <span>Territory Location (State → City → Hub)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">State *</label>
                    <SearchSelect
                      options={states.map((s) => ({ value: s.id, label: s.name, subLabel: s.code }))}
                      value={formStateId}
                      onChange={(val) => {
                        const sid = val ? Number(val) : '';
                        setFormStateId(sid);
                        setFormCityId('');
                        setFormHubId('');
                        setFormAssetId('');
                      }}
                      placeholder="Select State..."
                      isClearable={false}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">City *</label>
                    <SearchSelect
                      options={formAvailableCities.map((c) => ({ value: c.id, label: c.name, subLabel: c.pinCode ? `PIN: ${c.pinCode}` : undefined }))}
                      value={formCityId}
                      onChange={(val) => {
                        const cid = val ? Number(val) : '';
                        setFormCityId(cid);
                        setFormHubId('');
                        setFormAssetId('');
                      }}
                      placeholder={formStateId ? 'Select City...' : 'Select State First'}
                      isClearable={false}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Stationed Hub / Yard *</label>
                    <SearchSelect
                      options={formAvailableHubs.map((h) => ({ value: h.id, label: h.name, subLabel: h.code }))}
                      value={formHubId}
                      onChange={(val) => {
                        const hid = val ? Number(val) : '';
                        setFormHubId(hid);
                        setFormAssetId('');
                      }}
                      placeholder="Select Hub..."
                      isClearable={false}
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Fleet Cascade: Category -> Model -> Machine Name */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
                <div className="text-xs font-black flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-[10px] flex items-center justify-center font-bold">2</span>
                  <span>Fleet Classification (Category → Model → Machine Name)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Category *</label>
                    <SearchSelect
                      options={[
                        { value: 'CONSTRUCTION', label: 'Construction Fleet', subLabel: 'Mixers, Vibrators, Breakers' },
                        { value: 'AGRICULTURE', label: 'Agriculture Machinery', subLabel: 'Harvesters, Weeders, Tillers' },
                      ]}
                      value={formCategory}
                      onChange={(val) => {
                        setFormCategory((val as AssetCategory) || 'CONSTRUCTION');
                        setFormModelId('');
                        setFormAssetId('');
                      }}
                      placeholder="Select Category..."
                      isClearable={false}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Machine Model *</label>
                    <SearchSelect
                      options={formAvailableModels.map((m) => ({
                        value: m.id,
                        label: m.name,
                        subLabel: m.modelNumber,
                      }))}
                      value={formModelId}
                      onChange={(val) => {
                        setFormModelId(val ? Number(val) : '');
                        setFormAssetId('');
                      }}
                      placeholder="Select Model..."
                      isClearable={true}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Target Machine Name</label>
                    <SearchSelect
                      options={[
                        { value: '', label: 'Apply to All Matching Machines in Hub' },
                        ...formAvailableAssets.map((a) => ({
                          value: a.id,
                          label: a.name,
                          subLabel: `Tag: ${a.assetTag} • SN: ${a.serialNumber}`,
                        })),
                      ]}
                      value={formAssetId}
                      onChange={(val) => setFormAssetId(val ? Number(val) : '')}
                      placeholder="All Hub Machines / Select Unit"
                      isClearable={true}
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Commercial Rates & Deposits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Base Daily Rate (₹/day) *</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    placeholder="1200"
                    value={formBaseRate}
                    onChange={(e) => setFormBaseRate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono font-bold text-slate-950 dark:text-white focus:outline-none focus:border-amber-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Security Deposit Barrier (₹) *</label>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    placeholder="5000"
                    value={formDeposit}
                    onChange={(e) => setFormDeposit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono font-bold text-slate-950 dark:text-white focus:outline-none focus:border-amber-600"
                    required
                  />
                </div>
              </div>

              {/* Delivery distance rules */}
              <div className="p-3.5 rounded-xl border border-amber-400 bg-amber-50/60 space-y-3">
                <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-amber-700" />
                  <span>Delivery Pricing Policy Provision</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-950 mb-1">
                      Free Pick & Drop Distance (KM)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      placeholder="5.0"
                      value={formFreeKm}
                      onChange={(e) => setFormFreeKm(e.target.value)}
                      className="w-full rounded border border-amber-300 bg-white p-2 text-xs font-mono font-bold text-slate-950 focus:outline-none"
                      required
                    />
                    <span className="text-[10px] text-amber-900 font-semibold mt-0.5 block">0 Rs charged till this distance</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-950 mb-1">
                      Charge Per KM (After Free KM)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="10.0"
                      value={formRatePerKm}
                      onChange={(e) => setFormRatePerKm(e.target.value)}
                      className="w-full rounded border border-amber-300 bg-white p-2 text-xs font-mono font-bold text-slate-950 focus:outline-none"
                      required
                    />
                    <span className="text-[10px] text-amber-900 font-semibold mt-0.5 block">₹10/KM standard surcharge</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Operator Daily DPR (₹/day) *</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="500"
                    value={formOperatorRate}
                    onChange={(e) => setFormOperatorRate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono font-bold text-slate-950 dark:text-white focus:outline-none focus:border-amber-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Policy Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Standard rule: 5 KM free pick & drop, ₹10/KM afterwards"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-950 dark:text-white font-medium focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingConfig(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    isDaylight ? 'border-slate-300 text-slate-700 hover:bg-slate-100 font-bold' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    isDaylight
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  }`}
                >
                  {editingConfig ? 'Save Updates' : 'Create Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!configPendingRemoval}
        onClose={() => setConfigPendingRemoval(null)}
        onConfirm={handleRemove}
        variant="error"
        title="Remove rental configuration?"
        message={`This will permanently remove the rate policy for ${configPendingRemoval?.assetName || configPendingRemoval?.hubName || 'this configuration'}.`}
        confirmLabel="Remove configuration"
        showCancel
      />
    </div>
  );
};

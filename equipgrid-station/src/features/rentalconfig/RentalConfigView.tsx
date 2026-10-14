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
  ChevronDown,
  ChevronUp,
  MapPin,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { RentalConfiguration, AssetCategory, resolveBillingUnitCode, BillingUnitCode, getBillingUnitLabel } from '../../types';
import { SearchSelect } from '../../components/SearchSelect';
import { formatINR } from '../../lib/utils';
import { SkeletonTable } from '../../components/SkeletonTable';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';
import { getUrlParam, setUrlParam } from '../../lib/navigationState';

export const RentalConfigView: React.FC = () => {
  const { isDaylight } = useTheme();

  const [configs, setConfigs] = useState<RentalConfiguration[]>(() => api.getRentalConfigs());
  const hubs = api.getHubs();
  const cities = api.getCities();
  const states = api.getStates();
  const types = api.getEquipmentTypes();
  const models = api.getMachineModels();
  const assets = api.assets;
  const billingUnits = api.getBillingUnits();
  const manufacturers = api.getManufacturers();

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
  const [showAddModal, setShowAddModal] = useState(() => getUrlParam('modal') === 'rental_config');
  const [editingConfig, setEditingConfig] = useState<RentalConfiguration | null>(null);
  const [configPendingRemoval, setConfigPendingRemoval] = useState<RentalConfiguration | null>(null);

  React.useEffect(() => {
    setUrlParam('modal', showAddModal ? 'rental_config' : null);
  }, [showAddModal]);

  // Form states - Cascading selection: State -> City -> Hub -> Category -> Type -> OEM -> Model -> Target Machine
  const [expandedSection, setExpandedSection] = useState<'SCOPE' | 'COMMERCIALS'>('SCOPE');
  const [formStateId, setFormStateId] = useState<number | ''>('');
  const [formCityId, setFormCityId] = useState<number | ''>('');
  const [formHubId, setFormHubId] = useState<number | ''>(hubs[0]?.id || 1);
  const [formCategory, setFormCategory] = useState<AssetCategory | ''>('CONSTRUCTION');
  const [formTypeId, setFormTypeId] = useState<number | ''>('');
  const [formMfgId, setFormMfgId] = useState<number | ''>('');
  const [formModelId, setFormModelId] = useState<number | ''>('');
  const [formAssetId, setFormAssetId] = useState<number | ''>('');

  // Commercial Tariff states
  const [formBaseRate, setFormBaseRate] = useState<string>('');
  const [formDeposit, setFormDeposit] = useState<string>('0');
  const [formOperatorRate, setFormOperatorRate] = useState<string>('');
  const [formFreeKm, setFormFreeKm] = useState<string>('');
  const [formRatePerKm, setFormRatePerKm] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formBillingUnit, setFormBillingUnit] = useState<BillingUnitCode>('DAILY');
  const [formWorkingHours, setFormWorkingHours] = useState<string>('');
  const [formShiftTerms, setFormShiftTerms] = useState<string>('');

  // Cascaded lists for form Step 3.1
  const formAvailableCities = React.useMemo(() => {
    if (!formStateId) return cities;
    return cities.filter((c) => c.stateId === Number(formStateId));
  }, [cities, formStateId]);

  const formAvailableHubs = React.useMemo(() => {
    if (formCityId) return hubs.filter((h) => h.cityId === Number(formCityId));
    if (formStateId) {
      const cityIds = new Set(formAvailableCities.map((c) => c.id));
      return hubs.filter((h) => cityIds.has(h.cityId));
    }
    return hubs;
  }, [hubs, formCityId, formStateId, formAvailableCities]);

  const formAvailableTypes = React.useMemo(() => {
    if (!formCategory) return types.filter((t) => t.active !== false);
    return types.filter((t) => t.category === formCategory && t.active !== false);
  }, [types, formCategory]);

  const formAvailableManufacturers = React.useMemo(() => {
    return manufacturers.filter((m) => m.active !== false);
  }, [manufacturers]);

  const formAvailableModels = React.useMemo(() => {
    let list = models.filter((m) => m.active !== false);
    if (formCategory) {
      const categoryTypeIds = new Set(types.filter((t) => t.category === formCategory).map((t) => t.id));
      list = list.filter((m) => categoryTypeIds.has(m.typeId));
    }
    if (formTypeId) {
      list = list.filter((m) => m.typeId === Number(formTypeId));
    }
    if (formMfgId) {
      list = list.filter((m) => m.manufacturerId === Number(formMfgId));
    }
    return list;
  }, [models, types, formCategory, formTypeId, formMfgId]);

  const formAvailableAssets = React.useMemo(() => {
    let list = assets;
    if (formHubId) {
      list = list.filter((a) => a.hubId === Number(formHubId));
    }
    if (formCategory) {
      list = list.filter((a) => a.category === formCategory);
    }
    if (formTypeId) {
      list = list.filter((a) => a.typeId === Number(formTypeId));
    }
    if (formModelId) {
      list = list.filter((a) => a.modelId === Number(formModelId));
    }
    return list;
  }, [assets, formHubId, formCategory, formTypeId, formModelId]);

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
    setFormTypeId('');
    setFormMfgId('');
    setFormModelId('');
    setFormAssetId('');
    setFormBaseRate('');
    setFormDeposit('0');
    setFormOperatorRate('');
    setFormFreeKm('5.0');
    setFormRatePerKm('10.0');
    setFormNotes('');
    setFormBillingUnit('DAILY');
    setFormWorkingHours('');
    setFormShiftTerms('Full 24-hr day site deployment • Flexible field usage');
    setExpandedSection('SCOPE');
    setShowAddModal(true);
  };

  const handleOpenEdit = (c: RentalConfiguration) => {
    setEditingConfig(c);
    const hub = hubs.find((h) => h.id === c.hubId);
    const city = cities.find((cty) => cty.id === hub?.cityId);
    const asset = c.assetId ? assets.find((a) => a.id === c.assetId) : undefined;
    const model = asset?.modelId ? models.find((m) => m.id === asset.modelId) : (c.typeId ? models.find((m) => m.typeId === c.typeId) : undefined);
    const resolvedTypeId = c.typeId || asset?.typeId || model?.typeId || '';
    const typeObj = resolvedTypeId ? types.find((t) => t.id === resolvedTypeId) : undefined;
    const category = asset?.category || typeObj?.category || 'CONSTRUCTION';

    setFormStateId(city ? city.stateId : '');
    setFormCityId(hub ? hub.cityId : '');
    setFormHubId(c.hubId);
    setFormCategory((category as AssetCategory) || 'CONSTRUCTION');
    setFormTypeId(resolvedTypeId);
    setFormMfgId(model?.manufacturerId || '');
    setFormModelId(model?.id || '');
    setFormAssetId(c.assetId || '');
    setFormBaseRate(String(c.baseDailyRate));
    setFormDeposit(String(c.depositAmount != null ? c.depositAmount : 0));
    setFormOperatorRate(c.operatorDailyRate != null ? String(c.operatorDailyRate) : '');
    setFormFreeKm(c.freeDeliveryDistanceKm != null ? String(c.freeDeliveryDistanceKm) : '');
    setFormRatePerKm(c.ratePerKmAfterFree != null ? String(c.ratePerKmAfterFree) : '');
    setFormNotes(c.notes || '');
    setFormBillingUnit(resolveBillingUnitCode(c.billingUnit));
    setFormWorkingHours(c.workingHoursLimit ? String(c.workingHoursLimit) : '');
    setFormShiftTerms(c.shiftTerms || '');
    setExpandedSection('COMMERCIALS');
    setShowAddModal(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBaseRate || isNaN(parseFloat(formBaseRate))) {
      setExpandedSection('COMMERCIALS');
      return;
    }
    const modelObj = formModelId ? models.find((m) => m.id === Number(formModelId)) : undefined;
    const matchingUnit = billingUnits.find((u) => u.code === formBillingUnit);
    const resolvedTypeId = formTypeId ? Number(formTypeId) : (modelObj?.typeId || undefined);

    const added = api.addRentalConfig({
      hubId: Number(formHubId),
      assetId: formAssetId ? Number(formAssetId) : undefined,
      typeId: resolvedTypeId,
      baseDailyRate: parseFloat(formBaseRate) || 1000,
      depositAmount: formDeposit !== '' && !isNaN(parseFloat(formDeposit)) ? parseFloat(formDeposit) : 0,
      operatorDailyRate: formOperatorRate !== '' && !isNaN(parseFloat(formOperatorRate)) ? parseFloat(formOperatorRate) : 0,
      freeDeliveryDistanceKm: formFreeKm !== '' && !isNaN(parseFloat(formFreeKm)) ? parseFloat(formFreeKm) : 0,
      ratePerKmAfterFree: formRatePerKm !== '' && !isNaN(parseFloat(formRatePerKm)) ? parseFloat(formRatePerKm) : 0,
      notes: formNotes,
      billingUnit: formBillingUnit || 'DAILY',
      billingUnitId: matchingUnit?.id,
      workingHoursLimit: formWorkingHours ? parseFloat(formWorkingHours) : undefined,
      shiftTerms: formShiftTerms,
    });
    setConfigs([...api.getRentalConfigs()]);
    setShowAddModal(false);
    setToastMsg(`Rental configuration created for ${added.hubName || 'Hub'}.`);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;
    const modelObj = formModelId ? models.find((m) => m.id === Number(formModelId)) : undefined;
    const matchingUnit = billingUnits.find((u) => u.code === formBillingUnit);
    const resolvedTypeId = formTypeId ? Number(formTypeId) : (modelObj?.typeId || undefined);

    const updated = api.updateRentalConfig(editingConfig.id, {
      baseDailyRate: parseFloat(formBaseRate) || editingConfig.baseDailyRate,
      depositAmount: formDeposit !== '' && !isNaN(parseFloat(formDeposit)) ? parseFloat(formDeposit) : 0,
      operatorDailyRate: formOperatorRate !== '' && !isNaN(parseFloat(formOperatorRate)) ? parseFloat(formOperatorRate) : 0,
      freeDeliveryDistanceKm: formFreeKm !== '' && !isNaN(parseFloat(formFreeKm)) ? parseFloat(formFreeKm) : 0,
      ratePerKmAfterFree: formRatePerKm !== '' && !isNaN(parseFloat(formRatePerKm)) ? parseFloat(formRatePerKm) : 0,
      notes: formNotes,
      billingUnit: formBillingUnit,
      billingUnitId: matchingUnit?.id,
      workingHoursLimit: formWorkingHours ? parseFloat(formWorkingHours) : undefined,
      shiftTerms: formShiftTerms,
      assetId: formAssetId ? Number(formAssetId) : undefined,
      typeId: resolvedTypeId,
    });
    setConfigs([...api.getRentalConfigs()]);
    setEditingConfig(null);
    setShowAddModal(false);
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
              options={
                selectedStateId !== 'ALL' && availableCities.length === 0
                  ? []
                  : [{ value: 'ALL', label: 'All Cities' }, ...availableCities.map((c) => ({ value: String(c.id), label: c.name }))]
              }
              value={selectedCityId}
              onChange={(val) => {
                setSelectedCityId(String(val || 'ALL'));
                setSelectedHubId('ALL');
              }}
              placeholder={selectedStateId !== 'ALL' && availableCities.length === 0 ? 'No cities in this State' : 'All Cities'}
              isDisabled={selectedStateId !== 'ALL' && availableCities.length === 0}
              isClearable={false}
            />
          </div>
          <div>
            <SearchSelect
              options={
                (selectedCityId !== 'ALL' && availableHubs.length === 0) || (selectedStateId !== 'ALL' && availableCities.length === 0)
                  ? []
                  : [{ value: 'ALL', label: 'All Hubs' }, ...availableHubs.map((h) => ({ value: String(h.id), label: h.name }))]
              }
              value={selectedHubId}
              onChange={(val) => setSelectedHubId(String(val || 'ALL'))}
              placeholder={
                selectedStateId !== 'ALL' && availableCities.length === 0
                  ? 'No cities in this State'
                  : selectedCityId !== 'ALL' && availableHubs.length === 0
                  ? 'No hubs in this City'
                  : 'All Hubs'
              }
              isDisabled={(selectedCityId !== 'ALL' && availableHubs.length === 0) || (selectedStateId !== 'ALL' && availableCities.length === 0)}
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
                <th className="py-2.5 px-3">Scope (Machine / Hub)</th>
                <th className="py-2.5 px-3">Yard & City</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tariff Rate / Unit</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Security Deposit</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Free Pick & Drop</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Over-Radius</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Operator DPR</th>
                <th className="py-2.5 px-3 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDaylight ? 'divide-slate-100' : 'divide-slate-800/50'}`}>
              {visibleConfigs.map((c) => (
                <tr key={c.id} className={`transition-colors ${isDaylight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/30'}`}>
                  <td className="py-2.5 px-3">
                    <div className={`font-bold text-sm ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
                      {c.assetName || (c.typeName ? `All ${c.typeName}` : 'All Hub Machines')}
                    </div>
                    {c.shiftTerms && (
                      <div className={`text-[11px] font-medium flex items-center gap-1 ${isDaylight ? 'text-amber-800' : 'text-amber-400'}`}>
                        <span>⏱️</span>
                        <span className="truncate max-w-[240px]">{c.shiftTerms}</span>
                      </div>
                    )}
                    {c.notes && (
                      <div className={`text-[11px] max-w-[200px] truncate ${isDaylight ? 'text-slate-600' : 'text-slate-500'}`}>{c.notes}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold">{c.hubName || 'Yard'}</div>
                    <div className={`text-[11px] ${isDaylight ? 'text-slate-600' : 'text-slate-500'}`}>{c.cityName || 'City'}</div>
                  </td>
                  <td className={`py-2.5 px-3 font-mono font-black whitespace-nowrap ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
                    {formatINR(c.baseDailyRate)}/{c.unitLabel || getBillingUnitLabel(c.billingUnit)}
                  </td>
                  <td className={`py-2.5 px-3 font-mono font-bold whitespace-nowrap ${isDaylight ? 'text-amber-700' : 'text-amber-400'}`}>
                    {formatINR(c.depositAmount)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {c.freeDeliveryDistanceKm === 0 && c.ratePerKmAfterFree === 0 ? (
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-500">
                        Zero / Trip Rate
                      </span>
                    ) : (
                      <span className={`font-mono font-black px-2 py-0.5 rounded border border-emerald-400 ${isDaylight ? 'text-emerald-700 bg-emerald-500/10' : 'text-emerald-300 bg-emerald-500/10'}`}>
                        {c.freeDeliveryDistanceKm} KM (₹0)
                      </span>
                    )}
                  </td>
                  <td className={`py-2.5 px-3 font-mono font-bold whitespace-nowrap ${isDaylight ? 'text-slate-800' : 'text-slate-300'}`}>
                    {c.ratePerKmAfterFree === 0 ? '—' : `₹${c.ratePerKmAfterFree}/km`}
                  </td>
                  <td className={`py-2.5 px-3 font-mono whitespace-nowrap ${isDaylight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {!c.operatorDailyRate || c.operatorDailyRate === 0 ? (
                      <span className="text-slate-500 text-[11px]">Optional / ₹0</span>
                    ) : (
                      `${formatINR(c.operatorDailyRate)}/day`
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right w-24">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        data-tooltip="Edit Configuration"
                        data-tooltip-pos="left"
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${isDaylight ? 'border-slate-300 hover:bg-slate-200/60 text-slate-800' : 'border-slate-700 hover:bg-slate-800 text-slate-300'}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfigPendingRemoval(c)}
                        data-tooltip="Remove Configuration"
                        data-tooltip-pos="left"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-3 overflow-y-auto">
          <div className={`w-full max-w-6xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border p-4 sm:p-5 shadow-2xl space-y-3.5 ${isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#1e1e1e] text-slate-100'}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
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

            <form onSubmit={editingConfig ? handleUpdate : handleSaveNew} className="space-y-3">
              {/* === STEP 3.1: Territory & Machine Target Scope (Collapsible Step 1) === */}
              <div className={`rounded-xl border transition-all ${
                expandedSection === 'SCOPE'
                  ? isDaylight ? 'border-amber-400 bg-white shadow-sm' : 'border-amber-500/60 bg-slate-900/60 shadow-lg'
                  : isDaylight ? 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70' : 'border-slate-800 bg-slate-900/30 hover:bg-slate-800/60'
              }`}>
                {/* Accordion Header 3.1 */}
                <button
                  type="button"
                  onClick={() => setExpandedSection('SCOPE')}
                  className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      expandedSection === 'SCOPE'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {expandedSection !== 'SCOPE' && formHubId ? '✓' : '1'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black tracking-tight">
                          Territory & Machine Target Scope
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          expandedSection === 'SCOPE'
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {expandedSection === 'SCOPE' ? 'Expanded' : 'Scope Set'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {hubs.find((h) => h.id === Number(formHubId))?.name || 'Yard'} • {formCategory || 'Category'} • {formTypeId ? (types.find((t) => t.id === Number(formTypeId))?.name || 'Type') : 'All Types'} • {formModelId ? (models.find((m) => m.id === Number(formModelId))?.name || 'Model') : 'All Models'} • {formAssetId ? (assets.find((a) => a.id === Number(formAssetId))?.name || 'Target Unit') : 'All Matching Machines in Hub'}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    {expandedSection === 'SCOPE' ? (
                      <ChevronUp className="h-5 w-5 text-amber-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Accordion Body 3.1 */}
                {expandedSection === 'SCOPE' && (
                  <div className="p-4 pt-1 border-t border-slate-200 dark:border-slate-800 space-y-3.5">
                    {/* Row 1: Territory Scope: State -> City -> Hub */}
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
                          placeholder={
                            !formStateId
                              ? 'Select State First'
                              : formAvailableCities.length === 0
                              ? 'No cities in this State'
                              : 'Select City *'
                          }
                          isDisabled={!formStateId || formAvailableCities.length === 0}
                          noOptionsMessage="No cities found in this State"
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
                          placeholder={
                            !formStateId
                              ? 'Select State First'
                              : !formCityId
                              ? 'Select City First'
                              : formAvailableHubs.length === 0
                              ? 'No hubs in this City'
                              : 'Select Hub *'
                          }
                          isDisabled={!formCityId || formAvailableHubs.length === 0}
                          noOptionsMessage="No hubs found in this City"
                          isClearable={false}
                        />
                      </div>
                    </div>

                    {/* Row 2: Machinery Scope: Category -> Type -> OEM -> Model */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold mb-1">Category *</label>
                        <SearchSelect
                          options={[
                            { value: 'CONSTRUCTION', label: 'Construction Fleet', subLabel: 'Mixers, Vibrators, Breakers' },
                            { value: 'AGRICULTURE', label: 'Agriculture Machinery', subLabel: 'Harvesters, Weeders, Tillers' },
                            { value: 'MULTIPURPOSE_FLEET', label: 'Multipurpose Fleet', subLabel: 'Tractors, Trailers, Haulage' },
                          ]}
                          value={formCategory}
                          onChange={(val) => {
                            setFormCategory((val as AssetCategory) || 'CONSTRUCTION');
                            setFormTypeId('');
                            setFormMfgId('');
                            setFormModelId('');
                            setFormAssetId('');
                          }}
                          placeholder="Select Category..."
                          isClearable={false}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Equipment Type</label>
                        <SearchSelect
                          options={[
                            { value: '', label: 'All Types in Category' },
                            ...formAvailableTypes.map((t) => ({
                              value: t.id,
                              label: `${t.name}${t.hindiName ? ` (${t.hindiName})` : ''}`,
                              subLabel: `Code: ${t.code}`,
                            })),
                          ]}
                          value={formTypeId}
                          onChange={(val) => {
                            setFormTypeId(val ? Number(val) : '');
                            setFormModelId('');
                            setFormAssetId('');
                          }}
                          placeholder="All / Select Type..."
                          isClearable={true}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Manufacturer</label>
                        <SearchSelect
                          options={[
                            { value: '', label: 'All Manufacturers' },
                            ...formAvailableManufacturers.map((m) => ({
                              value: m.id,
                              label: m.name,
                              subLabel: `${m.country} • ${m.code}`,
                            })),
                          ]}
                          value={formMfgId}
                          onChange={(val) => {
                            setFormMfgId(val ? Number(val) : '');
                            setFormModelId('');
                            setFormAssetId('');
                          }}
                          placeholder="All / Select OEM..."
                          isClearable={true}
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
                    </div>

                    {/* Row 3: Target Unit Scope */}
                    <div>
                      <label className="block text-xs font-bold mb-1">Target Machine Unit</label>
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
                        placeholder="All Hub Machines / Select Specific Unit"
                        isClearable={true}
                      />
                    </div>

                    {/* Section 3.1 Forward Action Button */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!formHubId) {
                            alert('Please select a Stationed Hub / Yard to proceed.');
                            return;
                          }
                          setExpandedSection('COMMERCIALS');
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          isDaylight
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        }`}
                      >
                        <span>Click to proceed</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* === STEP 3.2: Tariff Rates, Billing Unit & Delivery Policy (Collapsible Step 2) === */}
              <div className={`rounded-xl border transition-all ${
                expandedSection === 'COMMERCIALS'
                  ? isDaylight ? 'border-amber-400 bg-white shadow-sm' : 'border-amber-500/60 bg-slate-900/60 shadow-lg'
                  : isDaylight ? 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70' : 'border-slate-800 bg-slate-900/30 hover:bg-slate-800/60'
              }`}>
                {/* Accordion Header 3.2 */}
                <button
                  type="button"
                  onClick={() => setExpandedSection('COMMERCIALS')}
                  className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      expandedSection === 'COMMERCIALS'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      2
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black tracking-tight">
                          Tariff Rates & Billing Unit
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          expandedSection === 'COMMERCIALS'
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {expandedSection === 'COMMERCIALS' ? 'Expanded' : 'Tariff Details'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {formBillingUnit} • Base Rate: {formBaseRate ? `₹${formBaseRate}/${getBillingUnitLabel(formBillingUnit)}` : 'Not set'} • Deposit: ₹{formDeposit || 0} • Operator: {formOperatorRate ? `₹${formOperatorRate}/day` : 'Optional (₹0)'}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    {expandedSection === 'COMMERCIALS' ? (
                      <ChevronUp className="h-5 w-5 text-amber-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Accordion Body 3.2 */}
                {expandedSection === 'COMMERCIALS' && (
                  <div className="p-4 pt-1 border-t border-slate-200 dark:border-slate-800 space-y-3.5">
                    {/* Commercial Rates: Billing Unit, Base Rate, Deposit */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold mb-1">Billing Unit *</label>
                        <SearchSelect
                          options={billingUnits.map((opt) => ({
                            value: opt.code,
                            label: `${opt.name}${opt.hindiName ? ` (${opt.hindiName})` : ''}`,
                            subLabel: opt.defaultShiftTerms,
                            badge: (opt.unitLabel || opt.code).toUpperCase(),
                          }))}
                          value={formBillingUnit}
                          onChange={(val) => {
                            if (!val) return;
                            const selectedCode = resolveBillingUnitCode(val);
                            const opt = billingUnits.find((o) => o.code === selectedCode);
                            setFormBillingUnit(selectedCode);
                            if (opt?.defaultShiftTerms) {
                              setFormShiftTerms(opt.defaultShiftTerms);
                            }
                          }}
                          isClearable={false}
                          placeholder="Select Billing Unit..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">
                          Base Rate (₹ / {getBillingUnitLabel(formBillingUnit)}) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          placeholder="e.g. 900 for acre, 650 for trip, 2200 for day"
                          value={formBaseRate}
                          onChange={(e) => setFormBaseRate(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono font-bold text-slate-950 dark:text-white focus:outline-none focus:border-amber-600"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">
                          Security Deposit (₹) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          placeholder="0, 200, 500, etc."
                          value={formDeposit}
                          onChange={(e) => setFormDeposit(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono font-bold text-slate-950 dark:text-white focus:outline-none focus:border-amber-600"
                          required
                        />
                        {/* Quick Preset Buttons */}
                        <div className="flex items-center gap-1 mt-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setFormDeposit('0')}
                            className={`px-1.5 py-0.5 rounded font-bold transition-colors ${formDeposit === '0' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                          >
                            ₹0 (Zero)
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormDeposit('200')}
                            className={`px-1.5 py-0.5 rounded font-bold transition-colors ${formDeposit === '200' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                          >
                            ₹200
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormDeposit('500')}
                            className={`px-1.5 py-0.5 rounded font-bold transition-colors ${formDeposit === '500' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                          >
                            ₹500
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormDeposit('1000')}
                            className={`px-1.5 py-0.5 rounded font-bold transition-colors ${formDeposit === '1000' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                          >
                            ₹1k
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Operational Shift Terms Description & Working Hours */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold mb-1">
                          Shift Terms Description (Customer Facing)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Per acre ploughing, Single trip mandi haulage, 24-hr field lease"
                          value={formShiftTerms}
                          onChange={(e) => setFormShiftTerms(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-950 dark:text-white focus:outline-none focus:border-amber-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">
                          Working Hours Limit (optional, blank = no limit)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="e.g. 8, 10, 12, or leave empty"
                          value={formWorkingHours}
                          onChange={(e) => setFormWorkingHours(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-950 dark:text-white focus:outline-none focus:border-amber-600"
                        />
                      </div>
                    </div>

                    {/* Delivery Distance Rules (Optional - zeroable for per-trip haulage or self-driven) */}
                    <div className="p-3 rounded-xl border border-amber-400/80 bg-amber-50/50 dark:bg-amber-950/20 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="text-xs font-black text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
                          <Truck className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
                          <span>Delivery Pricing Policy Provision (Optional)</span>
                        </div>
                        <span className="text-[10px] text-amber-800 dark:text-amber-400 italic">
                          Per-trip haulage or self-driven tractor requires zero delivery surcharge
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-amber-950 dark:text-amber-200 mb-1">
                            Free Pick & Drop Distance (KM) (Optional)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            step="0.5"
                            placeholder="0.0 or 5.0 (leave blank or 0 for no surcharge)"
                            value={formFreeKm}
                            onChange={(e) => setFormFreeKm(e.target.value)}
                            className="w-full rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 p-2 text-xs font-mono font-bold text-slate-950 dark:text-white focus:outline-none"
                          />
                          <span className="text-[10px] text-amber-900 dark:text-amber-400 font-semibold mt-0.5 block">0 Rs charged till this distance</span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-amber-950 dark:text-amber-200 mb-1">
                            Charge Per KM (After Free KM) (Optional)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0.0 or 10.0 (leave blank or 0 for per-trip)"
                            value={formRatePerKm}
                            onChange={(e) => setFormRatePerKm(e.target.value)}
                            className="w-full rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 p-2 text-xs font-mono font-bold text-slate-950 dark:text-white focus:outline-none"
                          />
                          <span className="text-[10px] text-amber-900 dark:text-amber-400 font-semibold mt-0.5 block">Rate per excess km</span>
                        </div>
                      </div>
                    </div>

                    {/* Operator DPR & Policy Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold mb-1">
                          Operator Daily DPR (₹/day) (Optional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          placeholder="e.g. 0 or 500 (blank = not required)"
                          value={formOperatorRate}
                          onChange={(e) => setFormOperatorRate(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono font-bold text-slate-950 dark:text-white focus:outline-none focus:border-amber-600"
                        />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                          Optional — not required for jackhammer, vibrators, or when driver is part of trip rate
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Policy Notes (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Special trip tariff, includes trailer attachment"
                          value={formNotes}
                          onChange={(e) => setFormNotes(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-950 dark:text-white font-medium focus:outline-none focus:border-amber-600"
                        />
                      </div>
                    </div>

                    {/* Bottom Modal Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setExpandedSection('SCOPE')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          isDaylight ? 'border-slate-300 text-slate-700 hover:bg-slate-100 font-bold' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Back to Scope</span>
                      </button>

                      <div className="flex items-center gap-2">
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
                    </div>
                  </div>
                )}
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

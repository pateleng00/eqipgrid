import React, { useState, useMemo } from 'react';
import {
  Truck,
  Image as ImageIcon,
  Video,
  CheckCircle,
  X,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Tag,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { Asset, AssetCategory } from '../../types';
import { SearchSelect } from '../../components/SearchSelect';

interface AddMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMachineAdded: (asset: Asset) => void;
}

export const AddMachineModal: React.FC<AddMachineModalProps> = ({
  isOpen,
  onClose,
  onMachineAdded,
}) => {
  const { isDaylight } = useTheme();

  // Master Data from DB Tables
  const states = api.getStates();
  const cities = api.getCities();
  const hubs = api.getHubs();
  const types = api.getEquipmentTypes();
  const manufacturers = api.getManufacturers();

  // Step state: 1 = Details & Territory, 2 = Media & Operations
  const [step, setStep] = useState<1 | 2>(1);

  // 1. Territory selection: State -> City -> Hub
  const [selectedStateId, setSelectedStateId] = useState<number | ''>('');
  const [selectedCityId, setSelectedCityId] = useState<number | ''>('');
  const [selectedHubId, setSelectedHubId] = useState<number | ''>('');

  const availableCities = useMemo(() => {
    if (!selectedStateId) return cities;
    return cities.filter((c) => c.stateId === Number(selectedStateId));
  }, [cities, selectedStateId]);

  const availableHubs = useMemo(() => {
    if (selectedCityId) {
      return hubs.filter((h) => h.cityId === Number(selectedCityId));
    }
    if (selectedStateId) {
      const cityIds = new Set(availableCities.map((c) => c.id));
      return hubs.filter((h) => cityIds.has(h.cityId));
    }
    return hubs;
  }, [hubs, availableCities, selectedCityId, selectedStateId]);

  // 2. Category selection
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | ''>('CONSTRUCTION');

  // Filter types by selected category
  const availableTypes = useMemo(() => {
    if (!selectedCategory) return types;
    return types.filter((t) => t.category === selectedCategory);
  }, [types, selectedCategory]);

  // 3. Manufacturer selection
  const [selectedMfgId, setSelectedMfgId] = useState<number | ''>(manufacturers[0]?.id || '');

  // 4. Equipment Type selection
  const [selectedTypeId, setSelectedTypeId] = useState<number | ''>(() => availableTypes[0]?.id || '');

  // 5. Machine Model selection (driven by Manufacturer only)
  const availableModels = useMemo(() => {
    if (!selectedMfgId) return [];
    return api.getMachineModels(undefined, Number(selectedMfgId));
  }, [selectedMfgId]);

  const [selectedModelId, setSelectedModelId] = useState<number | ''>('');

  // 6. Chassis / Serial Number
  const [serialNumber, setSerialNumber] = useState<string>('');

  // 7. Machine Display Name
  const [machineName, setMachineName] = useState<string>('');
  const [assetTag, setAssetTag] = useState<string>('');

  // 8. CAPEX Purchase Cost only (Deposit and Daily Rent removed, configured in Rental Config)
  const [purchaseCost, setPurchaseCost] = useState<string>('');

  // Step 2 Fields: Media & Operations
  const [imageUrl, setImageUrl] = useState<string>(
    'https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com/asset/images/c_mix_001/photo_1.jpg'
  );
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [imageError, setImageError] = useState<boolean>(false);
  const [operatorRequired, setOperatorRequired] = useState<boolean>(false);
  const [conditionNotes, setConditionNotes] = useState<string>('');
  const [accessoriesIncluded, setAccessoriesIncluded] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);

  // Quick preset machine images
  const sampleImages = [
    { label: 'Concrete Mixer', url: 'https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com/asset/images/c_mix_001/photo_1.jpg' },
    { label: 'Concrete Vibrator', url: 'https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com/asset/images/c_vib_001/photo_1.jpg' },
    { label: 'Plate Compactor', url: 'https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com/asset/images/c_cmp_001/photo_1.jpg' },
    { label: 'Demolition Hammer', url: 'https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com/asset/images/c_jkh_001/photo_1.jpg' },
    { label: 'Water Pump', url: 'https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com/asset/images/c_pmp_001/photo_1.jpg' },
    { label: 'Generator', url: 'https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com/asset/images/c_gen_001/photo_1.jpg' },
    { label: 'Power Reaper', url: 'https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com/asset/images/a_rep_001/photo_1.jpg' },
    { label: 'Rotary Weeder', url: 'https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com/asset/images/a_wed_001/photo_1.jpg' },
    { label: 'Earth Auger', url: 'https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com/asset/images/a_aug_001/photo_1.jpg' },
  ];

  if (!isOpen) return null;

  // React to Type or Manufacturer changes
  const handleCategoryChange = (cat: AssetCategory) => {
    setSelectedCategory(cat);
    const filtered = types.filter((t) => t.category === cat);
    if (filtered.length > 0) {
      setSelectedTypeId(filtered[0].id);
    } else {
      setSelectedTypeId('');
    }
  };

  const handleTypeChange = (typeId: number) => {
    setSelectedTypeId(typeId);
  };

  const handleMfgChange = (mfgId: number) => {
    setSelectedMfgId(mfgId);
    const models = api.getMachineModels(undefined, mfgId);
    if (models.length > 0) {
      setSelectedModelId(models[0].id);
      setMachineName(models[0].name);
    } else {
      setSelectedModelId('');
    }
  };

  const handleModelChange = (modelId: number) => {
    setSelectedModelId(modelId);
    const m = api.models.find((model) => model.id === modelId);
    if (m) {
      setMachineName(m.name);
    }
  };

  // Step 1 Validation & Proceed to Step 2
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedHubId) {
      setFormError('Please select State, City, and Stationed Hub.');
      return;
    }
    if (!selectedCategory) {
      setFormError('Please select equipment category.');
      return;
    }
    if (!selectedMfgId) {
      setFormError('Please select a manufacturer.');
      return;
    }
    if (!selectedTypeId) {
      setFormError('Please select an equipment type.');
      return;
    }
    if (!selectedModelId) {
      setFormError('Please select a machine model.');
      return;
    }
    if (!machineName.trim()) {
      setFormError('Machine display name is required.');
      return;
    }

    setStep(2);
  };

  // Final Submit on Step 2
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!imageUrl || !imageUrl.trim()) {
      setFormError('Machine photo / image URL is mandatory. Upload or choose a preset.');
      return;
    }

    try {
      const selectedModel = api.models.find((m) => m.id === Number(selectedModelId));
      const newAsset = api.addAsset({
        name: machineName.trim() || selectedModel?.name || 'New Machine',
        assetTag: assetTag.trim() || undefined,
        typeId: Number(selectedTypeId),
        manufacturerId: Number(selectedMfgId),
        modelId: Number(selectedModelId),
        hubId: Number(selectedHubId),
        imageUrl: imageUrl.trim(),
        videoUrl: videoUrl.trim() || undefined,
        purchaseCost: parseFloat(purchaseCost) || 50000,
        operatorRequired,
        serialNumber: serialNumber.trim() || undefined,
        conditionNotes: conditionNotes.trim() || undefined,
        accessoriesIncluded: accessoriesIncluded.trim() || undefined,
      });

      onMachineAdded(newAsset);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add machine.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div
        className={`w-full max-w-4xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border p-7 sm:p-8 shadow-2xl space-y-6 my-6 ${
          isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#242424] text-slate-100'
        }`}
      >
        {/* Modal Header & Step Indicator */}
        <div className={`flex items-center justify-between border-b pb-4 ${isDaylight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isDaylight ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400 border border-slate-700'}`}>
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">Add New Machine to Fleet</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  Step {step} of 2: {step === 1 ? 'Details & Territory' : 'Media & Operations'}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDaylight ? 'text-slate-600' : 'text-slate-400'}`}>
                {step === 1
                  ? 'Configure territory, manufacturer specs, model, and serial details.'
                  : 'Machine photo, optional field video, and operator requirement confirmation.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Progress Pill Indicator */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
              step === 1
                ? 'border-amber-500 bg-amber-500/10 text-amber-600 shadow-sm'
                : 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
            }`}
          >
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-black ${
              step === 1 ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white'
            }`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <span>1. Territory, Model & Chassis</span>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
              step === 2
                ? 'border-amber-500 bg-amber-500/10 text-amber-600 shadow-sm'
                : isDaylight
                ? 'border-slate-200 bg-slate-50 text-slate-400'
                : 'border-slate-800 bg-slate-900/40 text-slate-500'
            }`}
          >
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-black ${
              step === 2 ? 'bg-amber-500 text-slate-950' : 'bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              2
            </div>
            <span>2. Photos, Videos & Operator</span>
          </div>
        </div>

        {formError && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2 font-bold">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* --- STEP 1 FORM: SPECIFICATIONS & TERRITORY --- */}
        {step === 1 && (
          <form onSubmit={handleProceedToStep2} className="space-y-5">
            {/* 1. Territory Row: State -> City -> Hub */}
            <div className={`rounded-xl border p-4 space-y-3 ${isDaylight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/40 border-slate-800'}`}>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-600">
                <MapPin className="h-4 w-4" />
                <span>Stationed Territory (State, City, Hub) *</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">State *</label>
                  <SearchSelect
                    options={states.map((s) => ({ value: s.id, label: s.name }))}
                    value={selectedStateId}
                    onChange={(val) => {
                      setSelectedStateId(val ? Number(val) : '');
                      setSelectedCityId('');
                      setSelectedHubId('');
                    }}
                    placeholder="Select State..."
                    isClearable={true}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">City *</label>
                  <SearchSelect
                    options={availableCities.map((c) => ({ value: c.id, label: c.name }))}
                    value={selectedCityId}
                    onChange={(val) => {
                      setSelectedCityId(val ? Number(val) : '');
                      setSelectedHubId('');
                    }}
                    placeholder="Select City..."
                    isClearable={true}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Hub / Yard *</label>
                  <SearchSelect
                    options={availableHubs.map((h) => ({
                      value: h.id,
                      label: h.name,
                      subLabel: h.address,
                      badge: h.code,
                    }))}
                    value={selectedHubId}
                    onChange={(val) => setSelectedHubId(val ? Number(val) : '')}
                    placeholder="Select Hub..."
                    isClearable={false}
                  />
                </div>
              </div>
            </div>

            {/* 2. Category & Equipment Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">Category *</label>
                <SearchSelect
                  options={[
                    { value: 'CONSTRUCTION', label: 'Construction', badge: 'HEAVY' },
                    { value: 'AGRICULTURE', label: 'Agriculture', badge: 'AGRI' },
                    { value: 'MULTIPURPOSE_FLEET', label: 'Multipurpose Fleet', badge: 'FLEET' },
                  ]}
                  value={selectedCategory}
                  onChange={(val) => val && handleCategoryChange(val as AssetCategory)}
                  isClearable={false}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Equipment Type *</label>
                <SearchSelect
                  options={availableTypes.map((t) => ({
                    value: t.id,
                    label: t.name,
                    badge: t.category,
                    subLabel: t.code,
                  }))}
                  value={selectedTypeId}
                  onChange={(val) => val && handleTypeChange(Number(val))}
                  placeholder="Select Type..."
                  isClearable={false}
                />
              </div>
            </div>

            {/* 3. Manufacturer & Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">Manufacturer (OEM) *</label>
                <SearchSelect
                  options={manufacturers.map((m) => ({
                    value: m.id,
                    label: m.name,
                    subLabel: `Origin: ${m.country} • Code: ${m.code}`,
                  }))}
                  value={selectedMfgId}
                  onChange={(val) => val && handleMfgChange(Number(val))}
                  placeholder="Select Manufacturer..."
                  isClearable={false}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Machine Model *</label>
                <SearchSelect
                  options={
                    availableModels.map((mod) => ({
                      value: mod.id,
                      label: mod.name,
                      subLabel: `Model: ${mod.modelNumber} • ${mod.specs?.slice(0, 30)}...`,
                    }))
                  }
                  value={selectedModelId}
                  onChange={(val) => val && handleModelChange(Number(val))}
                  placeholder="Select Model..."
                  isClearable={false}
                />
              </div>
            </div>

            {/* 4. Chassis Number & Machine Display Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">Chassis / Serial Number *</label>
                <input
                  type="text"
                  placeholder="e.g. SN-CM-8809"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-mono font-bold text-slate-950 focus:outline-none focus:border-amber-600 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Machine Display Name *</label>
                <input
                  type="text"
                  placeholder="e.g. 10/7 Tilting Concrete Mixer (Diesel)"
                  value={machineName}
                  onChange={(e) => setMachineName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-950 font-bold focus:outline-none focus:border-amber-600 bg-white"
                  required
                />
              </div>
            </div>

            {/* 5. CAPEX Purchase Cost Only (Rent & Deposit configured in Rental Config) */}
            <div>
              <label className="block text-xs font-bold mb-1">CAPEX Purchase Cost (₹) *</label>
              <input
                type="number"
                min="1000"
                step="1000"
                placeholder="55000"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-mono font-bold text-slate-950 focus:outline-none focus:border-amber-600 bg-white"
                required
              />
              <p className={`text-[11px] mt-1 ${isDaylight ? 'text-slate-500' : 'text-slate-400'}`}>
                ℹ️ Note: Daily rental rates and refundable security deposits are configured separately in the <strong>Rental Config</strong> desk.
              </p>
            </div>

            {/* Step 1 Actions */}
            <div className={`flex justify-end gap-3 pt-3 border-t ${isDaylight ? 'border-slate-200' : 'border-slate-800'}`}>
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                  isDaylight
                    ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-colors bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm"
              >
                <span>Next: Media & Operations</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* --- STEP 2 FORM: MEDIA & OPERATOR CONFIRMATION --- */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Image Section */}
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-amber-700" />
                  <span>1. Machine Image (Mandatory Requirement) *</span>
                </label>
                <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                  Live Preview
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-28 h-28 rounded-xl border-2 border-amber-300 bg-white overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm">
                  {imageUrl && !imageError ? (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2 text-[10px] text-slate-400">No Image</div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <input
                    type="url"
                    placeholder="https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com/..."
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImageError(false);
                    }}
                    className="w-full rounded-lg border border-amber-300 bg-white p-2.5 text-xs font-mono font-bold text-slate-950 focus:outline-none focus:border-amber-600"
                    required
                  />

                  {/* Sample Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="font-bold text-amber-950">Quick Presets:</span>
                    {sampleImages.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => {
                          setImageUrl(s.url);
                          setImageError(false);
                        }}
                        className="px-2 py-0.5 rounded bg-white border border-amber-300 font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Video Section (Optional) */}
            <div className={`rounded-xl border p-4 space-y-2 ${isDaylight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'}`}>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                <Video className="h-4 w-4 text-blue-500" />
                <span>2. Field Demonstration Video (Optional)</span>
              </div>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=... or S3 MP4 URL"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-mono bg-white text-slate-950 focus:outline-none focus:border-amber-600"
              />
              <p className={`text-[11px] ${isDaylight ? 'text-slate-500' : 'text-slate-400'}`}>
                Attach customer operation walk-through, starting instructions, or maintenance demo video.
              </p>
            </div>

            {/* Operator Confirmation */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${
              operatorRequired
                ? 'border-amber-500 bg-amber-500/10'
                : isDaylight
                ? 'border-slate-200 bg-slate-50'
                : 'border-slate-800 bg-slate-900/40'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${operatorRequired ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold">Compulsory Trained Operator Confirmation</div>
                  <div className={`text-[11px] font-medium ${isDaylight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Enforces ₹500/day operator DPR rate automatically during booking dispatch.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={operatorRequired}
                onChange={(e) => setOperatorRequired(e.target.checked)}
                className="h-5 w-5 accent-amber-600 rounded cursor-pointer"
              />
            </div>

            {/* Machine Summary Pill */}
            <div className={`p-3 rounded-xl border text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 ${
              isDaylight ? 'bg-amber-50/40 border-amber-200 text-slate-800' : 'bg-slate-900/60 border-slate-800 text-slate-300'
            }`}>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Machine Name</span>
                <span className="font-bold">{machineName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Chassis / Tag</span>
                <span className="font-mono font-bold text-amber-600">{serialNumber || 'Auto-Tag'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">CAPEX</span>
                <span className="font-bold">₹{purchaseCost || '50,000'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Operator Policy</span>
                <span className="font-bold">{operatorRequired ? 'Mandatory' : 'Optional'}</span>
              </div>
            </div>

            {/* Step 2 Actions */}
            <div className={`flex justify-between items-center pt-3 border-t ${isDaylight ? 'border-slate-200' : 'border-slate-800'}`}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                  isDaylight
                    ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Machine Details</span>
              </button>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                    isDaylight
                      ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-colors bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Confirm & Add Machine to Hub</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

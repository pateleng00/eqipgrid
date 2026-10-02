import React, { useState } from 'react';
import {
  Truck,
  Image as ImageIcon,
  CheckCircle,
  X,
  Sparkles,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { Asset } from '../../types';
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
  const types = api.getEquipmentTypes();
  const manufacturers = api.getManufacturers();
  const hubs = api.getHubs();

  // Form State
  const [selectedTypeId, setSelectedTypeId] = useState<number>(types[0]?.id || 1);
  const [selectedMfgId, setSelectedMfgId] = useState<number>(manufacturers[0]?.id || 1);

  // Dynamic Models driven by DB Table filtered by Type & Manufacturer
  const availableModels = api.getMachineModels(selectedTypeId, selectedMfgId);
  const [selectedModelId, setSelectedModelId] = useState<number>(() => availableModels[0]?.id || 1);

  // Hub Yard selection (every machine must be added to a hub)
  const [selectedHubId, setSelectedHubId] = useState<number>(hubs[0]?.id || 1);

  const [machineName, setMachineName] = useState<string>('');
  const [assetTag, setAssetTag] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [dailyRate, setDailyRate] = useState<string>('1200');
  const [depositAmount, setDepositAmount] = useState<string>('5000');
  const [purchaseCost, setPurchaseCost] = useState<string>('55000');
  const [operatorRequired, setOperatorRequired] = useState<boolean>(false);
  const [conditionNotes, setConditionNotes] = useState<string>('Factory certified, inspected at yard.');
  const [accessoriesIncluded, setAccessoriesIncluded] = useState<string>('');

  // Mandatory Image state (pointing to verified AWS S3 bucket assets)
  const [imageUrl, setImageUrl] = useState<string>(
    'https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com/asset/images/c_mix_001/photo_1.jpg'
  );
  const [imageError, setImageError] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick preset machine images from AWS S3
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

  // React to Type or Manufacturer changes by refreshing models
  const handleTypeChange = (typeId: number) => {
    setSelectedTypeId(typeId);
    const models = api.getMachineModels(typeId, selectedMfgId);
    if (models.length > 0) {
      setSelectedModelId(models[0].id);
      if (!machineName) setMachineName(models[0].name);
    }
  };

  const handleMfgChange = (mfgId: number) => {
    setSelectedMfgId(mfgId);
    const models = api.getMachineModels(selectedTypeId, mfgId);
    if (models.length > 0) {
      setSelectedModelId(models[0].id);
      if (!machineName) setMachineName(models[0].name);
    }
  };

  const handleModelChange = (modelId: number) => {
    setSelectedModelId(modelId);
    const m = api.models.find((model) => model.id === modelId);
    if (m) {
      setMachineName(m.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Strict validation: Image is required!
    if (!imageUrl || !imageUrl.trim()) {
      setFormError('Machine photo / image URL is mandatory. Upload or enter a valid URL.');
      return;
    }

    // Strict validation: DB tables selection
    if (!selectedTypeId || !selectedMfgId || !selectedModelId || !selectedHubId) {
      setFormError('Equipment Type, Manufacturer, Model, and Hub must all be selected from the database.');
      return;
    }

    try {
      const selectedModel = api.models.find((m) => m.id === selectedModelId);
      const newAsset = api.addAsset({
        name: machineName.trim() || selectedModel?.name || 'New Machine',
        assetTag: assetTag.trim() || undefined,
        typeId: selectedTypeId,
        manufacturerId: selectedMfgId,
        modelId: selectedModelId,
        hubId: selectedHubId,
        imageUrl: imageUrl.trim(),
        dailyRate: parseFloat(dailyRate) || 1000,
        depositAmount: parseFloat(depositAmount) || 3000,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className={`w-full max-w-4xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border p-7 sm:p-8 shadow-2xl space-y-6 my-6 ${
        isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#242424] text-slate-100'
      }`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${
          isDaylight ? 'border-slate-200' : 'border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${
              isDaylight ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 border border-slate-700 font-medium'
            }`}>
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Add New Machine to Fleet</h3>
              <p className={`text-xs font-medium ${isDaylight ? 'text-slate-600' : 'text-slate-400'}`}>
                Type, Manufacturer & Model driven by DB tables only. Image strictly required.
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

        {formError && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2 font-bold">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: DB Table Dropdowns (Type & Manufacturer) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">
                1. Equipment Type (DB Master Table) <span className="text-rose-600">*</span>
              </label>
              <SearchSelect
                options={types.map((t) => ({
                  value: t.id,
                  label: t.name,
                  badge: t.category,
                  subLabel: t.code,
                }))}
                value={selectedTypeId}
                onChange={(val) => val && handleTypeChange(Number(val))}
                isClearable={false}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                2. Manufacturer (DB Master Table) <span className="text-rose-600">*</span>
              </label>
              <SearchSelect
                options={manufacturers.map((m) => ({
                  value: m.id,
                  label: m.name,
                  subLabel: `Origin: ${m.country} • Code: ${m.code}`,
                }))}
                value={selectedMfgId}
                onChange={(val) => val && handleMfgChange(Number(val))}
                isClearable={false}
              />
            </div>
          </div>

          {/* Row 2: Model & Stationed Hub */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">
                3. Machine Model (DB Master Table) <span className="text-rose-600">*</span>
              </label>
              <SearchSelect
                options={
                  availableModels.length > 0
                    ? availableModels.map((mod) => ({
                        value: mod.id,
                        label: mod.name,
                        subLabel: `Model: ${mod.modelNumber} • ${mod.specs?.slice(0, 35)}...`,
                      }))
                    : api.models.map((mod) => ({
                        value: mod.id,
                        label: mod.name,
                        subLabel: mod.modelNumber,
                      }))
                }
                value={selectedModelId}
                onChange={(val) => val && handleModelChange(Number(val))}
                isClearable={false}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                4. Stationed Hub / Yard (Location Master) <span className="text-rose-600">*</span>
              </label>
              <SearchSelect
                options={hubs.map((h) => ({
                  value: h.id,
                  label: h.name,
                  subLabel: `${h.address} • Radius: ${h.operatingRadiusKm}km`,
                  badge: h.code,
                }))}
                value={selectedHubId}
                onChange={(val) => val && setSelectedHubId(Number(val))}
                isClearable={false}
              />
            </div>
          </div>

          {/* Machine Name & Serial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">
                Machine Display Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 10/7 Tilting Concrete Mixer (Diesel)"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-950 font-bold focus:outline-none focus:border-amber-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Chassis / Serial Number</label>
              <input
                type="text"
                placeholder="e.g. SN-CM-8809"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-mono font-bold text-slate-950 focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          {/* REQUIRED IMAGE SECTION */}
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-amber-700" />
                <span>Machine Image (Mandatory Requirement)</span>
                <span className="text-rose-600">*</span>
              </label>
              <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                Live Preview
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-24 rounded-xl border-2 border-amber-300 bg-white overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm">
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
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImageError(false);
                  }}
                  className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs font-mono font-bold text-slate-950 focus:outline-none focus:border-amber-600"
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

          {/* Pricing & Deposit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">
                Daily Rate (₹/day) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                min="100"
                step="50"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold text-slate-950 focus:outline-none focus:border-amber-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                Security Deposit (₹) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                min="500"
                step="100"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold text-slate-950 focus:outline-none focus:border-amber-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">CAPEX Purchase Cost (₹)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold text-slate-950 focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          {/* Operator Checkbox */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-300 bg-slate-50">
            <div>
              <div className="text-xs font-bold text-slate-950">Compulsory Trained Operator</div>
              <div className="text-[11px] text-slate-600 font-medium">
                Enforces ₹500/day operator DPR rate automatically during booking
              </div>
            </div>
            <input
              type="checkbox"
              checked={operatorRequired}
              onChange={(e) => setOperatorRequired(e.target.checked)}
              className="h-4 w-4 accent-amber-600 rounded cursor-pointer"
            />
          </div>

          {/* Form Actions */}
          <div className={`flex justify-end gap-2.5 pt-3 border-t ${
            isDaylight ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                isDaylight
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100 font-bold'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                isDaylight
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Confirm & Add Machine to Hub</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

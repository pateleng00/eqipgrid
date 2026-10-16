import React, { useState, useMemo, useRef } from 'react';
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
  UserCheck,
  UploadCloud,
  Trash2,
  Loader2,
  Plus,
  Film,
  Star,
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { api, uploadTemporaryMedia } from '../../services/api';
import { Asset, AssetCategory } from '../../types';
import { SearchSelect } from '../../components/SearchSelect';

interface AddMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMachineAdded: (asset: Asset) => void;
}

export const AddMachineModal: React.FC<AddMachineModalProps> = ({ isOpen, onClose, onMachineAdded }) => {
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
    if (!selectedStateId) return [];
    return cities.filter((c) => c.stateId === Number(selectedStateId));
  }, [cities, selectedStateId]);

  const availableHubs = useMemo(() => {
    if (!selectedCityId) return [];
    return hubs.filter((h) => h.cityId === Number(selectedCityId));
  }, [hubs, selectedCityId]);

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

  // 8. CAPEX Purchase Cost only (Deposit and Tariffs configured under Rental Configuration)
  const [purchaseCost, setPurchaseCost] = useState<string>('');

  // Step 2 Fields: Media & Operations
  interface UploadedMediaItem {
    id: string;
    url: string;
    previewUrl?: string;
    fileName: string;
    fileSizeBytes?: number;
    isUploading?: boolean;
    error?: string;
  }

  const [galleryImages, setGalleryImages] = useState<UploadedMediaItem[]>([]);

  const [videoItem, setVideoItem] = useState<UploadedMediaItem | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState<boolean>(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [operatorRequired, setOperatorRequired] = useState<boolean>(false);
  const [conditionNotes, setConditionNotes] = useState<string>('');
  const [accessoriesIncluded, setAccessoriesIncluded] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleImageFiles = async (files: FileList | File[]) => {
    setFormError(null);
    setUploadNotice(null);
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      setFormError('Please select valid image files (JPEG, PNG, WebP, GIF).');
      return;
    }

    const currentCount = galleryImages.length;
    if (currentCount + fileArray.length > 10) {
      setFormError(`Maximum 10 images allowed. You can only add ${10 - currentCount} more photo(s).`);
      return;
    }

    setIsUploadingImages(true);
    setUploadNotice(`Uploading ${fileArray.length} photo(s) to temporary staging bucket...`);

    const newItems: UploadedMediaItem[] = fileArray.map((file, i) => {
      const localBlob = URL.createObjectURL(file);
      return {
        id: `upload_${Date.now()}_${i}`,
        url: localBlob,
        previewUrl: localBlob,
        fileName: file.name,
        fileSizeBytes: file.size,
        isUploading: true,
      };
    });

    setGalleryImages((prev) => [...prev, ...newItems]);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const targetId = newItems[i].id;
      try {
        const res = await uploadTemporaryMedia(file);
        setGalleryImages((prev) =>
          prev.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  url: res.url,
                  previewUrl: item.previewUrl || res.url,
                  fileName: res.fileName || file.name,
                  isUploading: false,
                }
              : item,
          ),
        );
      } catch (err: any) {
        setGalleryImages((prev) =>
          prev.map((item) =>
            item.id === targetId ? { ...item, isUploading: false, error: err.message || 'Upload failed' } : item,
          ),
        );
      }
    }

    setIsUploadingImages(false);
    setUploadNotice(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleRemoveImage = (id: string) => {
    setGalleryImages((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSetPrimaryImage = (id: string) => {
    setGalleryImages((prev) => {
      const selected = prev.find((item) => item.id === id);
      if (!selected) return prev;
      const rest = prev.filter((item) => item.id !== id);
      return [selected, ...rest];
    });
  };

  const handleClearAllImages = () => {
    setGalleryImages([]);
  };

  const handleVideoFile = async (file: File) => {
    setFormError(null);
    if (!file.type.startsWith('video/')) {
      setFormError('Please select a valid video file (MP4, WebM, MOV).');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setFormError('Video exceeds maximum size of 100 MB.');
      return;
    }

    setIsUploadingVideo(true);
    const localPreview = URL.createObjectURL(file);
    const tempItem: UploadedMediaItem = {
      id: `vid_${Date.now()}`,
      url: localPreview,
      previewUrl: localPreview,
      fileName: file.name,
      fileSizeBytes: file.size,
      isUploading: true,
    };
    setVideoItem(tempItem);

    try {
      const res = await uploadTemporaryMedia(file);
      setVideoItem({
        id: tempItem.id,
        url: res.url,
        previewUrl: localPreview,
        fileName: res.fileName || file.name,
        fileSizeBytes: file.size,
        isUploading: false,
      });
      setVideoUrlInput(res.url);
    } catch (err: any) {
      setVideoItem(null);
      setFormError(err.message || 'Failed to upload video to staging bucket.');
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleRemoveVideo = () => {
    setVideoItem(null);
    setVideoUrlInput('');
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  if (!isOpen) return null;

  // React to Type or Manufacturer changes
  const handleCategoryChange = (cat: AssetCategory) => {
    setSelectedCategory(cat);
    const filtered = types.filter((t) => t.category === cat);
    if (filtered.length > 0) {
      handleTypeChange(filtered[0].id);
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validImages = galleryImages.filter((img) => !img.error && img.url);

    if (validImages.length < 4) {
      setFormError(
        `At least 4 machine photos are mandatory (currently ${validImages.length} / 4 uploaded). Please upload at least 4 photos from your device.`,
      );
      return;
    }

    if (validImages.length > 10) {
      setFormError(`Maximum 10 photos allowed (currently ${validImages.length}). Please remove extra photos.`);
      return;
    }

    if (galleryImages.some((img) => img.isUploading) || isUploadingVideo) {
      setFormError('Please wait for media uploads to finish before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedModel = api.models.find((m) => m.id === Number(selectedModelId));
      const effectiveVideoUrl = videoItem?.url || videoUrlInput.trim() || undefined;

      const newAsset = await api.addAsset({
        name: machineName.trim() || selectedModel?.name || 'New Machine',
        category: (selectedCategory as AssetCategory) || undefined,
        assetTag: assetTag.trim() || undefined,
        typeId: Number(selectedTypeId),
        manufacturerId: Number(selectedMfgId),
        modelId: Number(selectedModelId),
        hubId: Number(selectedHubId),
        imageUrl: validImages[0].url,
        galleryImageUrls: validImages.map((img) => img.url),
        videoUrl: effectiveVideoUrl,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-3 overflow-y-auto">
      <div
        className={`w-full max-w-4xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border p-4 sm:p-5 shadow-2xl space-y-4 my-2 ${
          isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#242424] text-slate-100'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between border-b pb-3.5 ${isDaylight ? 'border-slate-200' : 'border-slate-800'}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${isDaylight ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400 border border-slate-700'}`}
            >
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Add New Machine to Fleet</h3>
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
            <div
              className={`rounded-xl border p-4 space-y-3 ${isDaylight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/40 border-slate-800'}`}
            >
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
                    placeholder={
                      !selectedStateId
                        ? 'Select State First'
                        : availableCities.length === 0
                          ? 'No cities in this State'
                          : 'Select City *'
                    }
                    isDisabled={!selectedStateId || availableCities.length === 0}
                    noOptionsMessage="No cities found in this State"
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
                    placeholder={
                      !selectedStateId
                        ? 'Select State First'
                        : !selectedCityId
                          ? 'Select City First'
                          : availableHubs.length === 0
                            ? 'No hubs in this City'
                            : 'Select Hub *'
                    }
                    isDisabled={!selectedCityId || availableHubs.length === 0}
                    noOptionsMessage="No hubs found in this City"
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
                  options={availableModels.map((mod) => ({
                    value: mod.id,
                    label: mod.name,
                    subLabel: `Model: ${mod.modelNumber} • ${mod.specs?.slice(0, 30)}...`,
                  }))}
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

            {/* 5. CAPEX Purchase Cost */}
            <div>
              <label className="block text-xs font-bold mb-1">CAPEX Purchase Cost (₹) *</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="55000"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-mono font-bold text-slate-950 focus:outline-none focus:border-amber-600 bg-white"
                required
              />
              <p className={`text-[11px] mt-1 ${isDaylight ? 'text-slate-500' : 'text-slate-400'}`}>
                Capital expenditure for inventory asset tracking. Multi-rate tariffs, variable billing units (per day,
                acre, trip, shift), deposits, and shift terms are managed flexibly under{' '}
                <strong>Rental Configuration</strong>.
              </p>
            </div>

            {/* Step 1 Actions */}
            <div
              className={`flex justify-end gap-3 pt-3 border-t ${isDaylight ? 'border-slate-200' : 'border-slate-800'}`}
            >
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
            {/* Upload Notification */}
            {uploadNotice && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin shrink-0 text-blue-600" />
                <span>{uploadNotice}</span>
              </div>
            )}

            {/* Hidden File Inputs */}
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleVideoFile(e.target.files[0])}
            />

            {/* 1. Multi-Image Gallery Section */}
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-amber-700" />
                  <span>1. Machine Photos (कम से कम 4 तस्वीरें जरूरी, अधिकतम 10) *</span>
                </label>

                {galleryImages.length < 4 ? (
                  <span className="text-[10px] font-bold text-amber-950 bg-amber-200/90 border border-amber-400 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-amber-800" />
                    Need {4 - galleryImages.length} more (कम से कम 4 जरूरी)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-950 bg-emerald-200/90 border border-emerald-400 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-emerald-700" />
                    {galleryImages.length} / 10 Photos Ready
                  </span>
                )}
              </div>

              {/* Upload Controls Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={galleryImages.length >= 10 || isUploadingImages}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingImages ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="h-3.5 w-3.5" />
                    )}
                    <span>Upload from Device</span>
                  </button>

                  <span className="text-[11px] text-amber-900 font-medium">
                    (JPEG, PNG, WebP up to 15 MB)
                  </span>
                </div>

                {galleryImages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllImages}
                    className="text-[11px] font-bold text-rose-700 hover:text-rose-900 hover:underline cursor-pointer"
                  >
                    Clear All Photos
                  </button>
                )}
              </div>

              {/* Photo Area: Empty State Dropzone OR Thumbnail Grid */}
              {galleryImages.length === 0 ? (
                <div
                  onClick={() => imageInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) handleImageFiles(e.dataTransfer.files);
                  }}
                  className="rounded-xl border-2 border-dashed border-amber-400 hover:border-amber-500 bg-white hover:bg-amber-50/60 p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group shadow-xs"
                >
                  <div className="p-3.5 rounded-full bg-amber-100 text-amber-800 mb-2.5 group-hover:scale-110 transition-transform">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <div className="text-xs font-bold text-slate-900 mb-0.5">
                    Click to select or drag & drop machine photos from your device
                  </div>
                  <div className="text-[11px] text-amber-900 font-semibold">
                    Mandatory requirement: Upload at least 4 photos (up to 10 max)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Supports JPEG, PNG, WebP up to 15 MB per photo • Staged directly to temporary S3 bucket
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                  {galleryImages.map((img, idx) => (
                    <div
                      key={img.id}
                      className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        idx === 0
                          ? 'border-amber-500 ring-2 ring-amber-400/40 shadow-md'
                          : 'border-amber-200/80 bg-white shadow-xs'
                      }`}
                    >
                      <img
                        src={img.previewUrl || img.url}
                        alt={`Machine photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Order / Primary Badge */}
                      <div className="absolute top-1.5 left-1.5">
                        {idx === 0 ? (
                          <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-current" /> Primary
                          </span>
                        ) : (
                          <span className="bg-black/60 backdrop-blur-xs text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow">
                            #{idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>

                      {/* Set Primary Hover Action */}
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryImage(img.id)}
                          className="absolute inset-x-1 bottom-1 py-1 rounded bg-black/75 hover:bg-amber-500 hover:text-slate-950 text-white text-[9px] font-bold transition-all opacity-0 group-hover:opacity-100 cursor-pointer text-center"
                        >
                          Set as Primary
                        </button>
                      )}

                      {/* Uploading Spinner Overlay */}
                      {img.isUploading && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                          <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                          <span>Staging S3...</span>
                        </div>
                      )}

                      {/* Error Overlay */}
                      {img.error && (
                        <div className="absolute inset-0 bg-rose-950/80 p-1 flex flex-col items-center justify-center text-rose-200 text-[10px] text-center font-bold">
                          <span>{img.error}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Photo Dropzone Tile */}
                  {galleryImages.length < 10 && (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isUploadingImages}
                      className="aspect-square rounded-xl border-2 border-dashed border-amber-400 hover:border-amber-600 bg-amber-100/40 hover:bg-amber-100/80 flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer group"
                    >
                      <Plus className="h-6 w-6 text-amber-700 group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-[11px] font-bold text-amber-950">Add Photo</span>
                      <span className="text-[9px] text-amber-800">
                        ({galleryImages.length}/10 uploaded)
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Video Section (Optional) */}
            <div
              className={`rounded-xl border p-4 space-y-3 ${
                isDaylight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <Video className="h-4 w-4 text-blue-500" />
                  <span>2. Field Demonstration Video (Optional, अधिकतम 1 वीडियो)</span>
                </div>
                <span className="text-[10px] font-bold text-blue-900 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                  Max 1 Video • MP4 / WebM (Max 100 MB)
                </span>
              </div>

              {videoItem ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-black max-h-56">
                    <video
                      src={videoItem.previewUrl || videoItem.url}
                      controls
                      className="w-full max-h-56 object-contain"
                    />
                    {videoItem.isUploading && (
                      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-xs font-bold gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                        <span>Uploading video to temporary staging bucket...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 truncate max-w-sm">
                      <Film className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="font-mono text-[11px] truncate">
                        {videoItem.fileName}
                      </span>
                      {videoItem.fileSizeBytes && (
                        <span className="text-[10px] text-slate-400">
                          ({(videoItem.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={isUploadingVideo}
                        className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Change Video
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold hover:bg-rose-100 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isUploadingVideo}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-blue-400/80 hover:border-blue-600 bg-blue-50/50 hover:bg-blue-100/50 text-blue-900 dark:text-blue-100 transition-all cursor-pointer font-bold text-xs"
                  >
                    {isUploadingVideo ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    ) : (
                      <UploadCloud className="h-4 w-4 text-blue-600" />
                    )}
                    <span>Upload Video from Device (Max 100 MB)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0">
                      Or URL:
                    </span>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=... or direct S3 MP4 URL"
                      value={videoUrlInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVideoUrlInput(val);
                        if (val.trim()) {
                          setVideoItem({
                            id: 'manual_vid',
                            url: val.trim(),
                            fileName: 'External Video URL',
                          });
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono bg-white text-slate-950 focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              )}

              <p className={`text-[11px] ${isDaylight ? 'text-slate-500' : 'text-slate-400'}`}>
                Attach customer operation walk-through, starting instructions, or maintenance demo video.
              </p>
            </div>

            {/* Operator Confirmation */}
            <div
              className={`flex items-center justify-between p-4 rounded-xl border ${
                operatorRequired
                  ? 'border-amber-500 bg-amber-500/10'
                  : isDaylight
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    operatorRequired
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold">Compulsory Trained Operator Confirmation</div>
                  <div
                    className={`text-[11px] font-medium ${
                      isDaylight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
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
            <div
              className={`p-3 rounded-xl border text-xs grid grid-cols-2 sm:grid-cols-5 gap-2 ${
                isDaylight
                  ? 'bg-amber-50/40 border-amber-200 text-slate-800'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Machine Name
                </span>
                <span className="font-bold truncate block">{machineName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Chassis / Tag
                </span>
                <span className="font-mono font-bold text-amber-600">
                  {serialNumber || 'Auto-Tag'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Photos
                </span>
                <span
                  className={`font-bold ${
                    galleryImages.length >= 4 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {galleryImages.length} / 10 ({galleryImages.length >= 4 ? 'Valid' : 'Need 4+'})
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Video
                </span>
                <span className="font-bold">{videoItem ? '1 Video Attached' : 'None'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Operator Policy
                </span>
                <span className="font-bold">{operatorRequired ? 'Mandatory' : 'Optional'}</span>
              </div>
            </div>

            {/* Step 2 Actions */}
            <div
              className={`flex justify-between items-center pt-3 border-t ${
                isDaylight ? 'border-slate-200' : 'border-slate-800'
              }`}
            >
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
                  disabled={galleryImages.length < 4 || isUploadingImages || isUploadingVideo || isSubmitting}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-colors bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving & Adding Machine to Hub...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>
                        {galleryImages.length < 4
                          ? `Add ${4 - galleryImages.length} More Photo(s)`
                          : 'Confirm & Add Machine to Hub'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

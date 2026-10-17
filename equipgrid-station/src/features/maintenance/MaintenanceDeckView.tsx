import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Building2,
  PhoneCall,
  MapPin,
  UploadCloud,
  FileText,
  ExternalLink,
  Eye,
  X,
  ChevronRight,
  DollarSign,
  Calendar,
  Layers,
  History,
  Camera,
  Image as ImageIcon,
  Tag,
  Info,
  CheckSquare,
  Square,
} from 'lucide-react';
import { api, resolveAssetS3Key, sanitizeMediaUrl } from '../../services/api';
import { useTheme } from '../../lib/ThemeContext';
import { formatINR, cn } from '../../lib/utils';
import {
  Asset,
  AssetStatus,
  MaintenanceTicket,
  MaintenanceServiceType,
  MaintenanceDamageComponent,
  MaintenanceLocationType,
  MaintenancePriority,
  CreateMaintenanceTicketPayload,
  CompleteMaintenancePayload,
} from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { SearchSelect } from '../../components/SearchSelect';

interface MaintenanceDeckViewProps {
  onNavigate?: (tab: string) => void;
}

export const MaintenanceDeckView: React.FC<MaintenanceDeckViewProps> = ({ onNavigate }) => {
  const { isDaylight } = useTheme();

  // Fleet assets from ApiStore
  const assets = api.assets || [];

  // Maintenance tickets state
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'IN_HOUSE' | 'EXTERNAL' | 'COMPLETED'>('ACTIVE');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [completingTicket, setCompletingTicket] = useState<MaintenanceTicket | null>(null);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  const [assetHistoryTickets, setAssetHistoryTickets] = useState<MaintenanceTicket[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Damage Components Master from DB
  const [damageComponents, setDamageComponents] = useState<MaintenanceDamageComponent[]>([]);
  const [loadingComponents, setLoadingComponents] = useState(false);

  // Create Ticket Form State
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');
  const [serviceType, setServiceType] = useState<MaintenanceServiceType>('PERIODIC_SERVICE');
  const [locationType, setLocationType] = useState<MaintenanceLocationType>('IN_HOUSE');
  const [serviceCenterName, setServiceCenterName] = useState('');
  const [serviceCenterContact, setServiceCenterContact] = useState('');
  const [serviceCenterAddress, setServiceCenterAddress] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('NORMAL');
  const [issueDescription, setIssueDescription] = useState('');
  const [workScope, setWorkScope] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState<string>('');
  const [meterHoursAtService, setMeterHoursAtService] = useState<string>('');
  const [assignedTechnician, setAssignedTechnician] = useState('');

  // Cascading Machine Filter State: City -> Hub -> Equipment Type -> OEM -> Model -> Asset Unit
  const [selectedCityId, setSelectedCityId] = useState<number | ''>('');
  const [selectedHubId, setSelectedHubId] = useState<number | ''>('');
  const [selectedTypeId, setSelectedTypeId] = useState<number | ''>('');
  const [selectedOemId, setSelectedOemId] = useState<number | ''>('');
  const [selectedModelId, setSelectedModelId] = useState<number | ''>('');

  // Inline custom component creation state
  const [isAddingNewComponent, setIsAddingNewComponent] = useState(false);
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentHindiName, setNewComponentHindiName] = useState('');
  const [newComponentCategory, setNewComponentCategory] = useState('');
  const [isSavingNewComponent, setIsSavingNewComponent] = useState(false);

  // Periodic Service specific fields
  const [serviceNumber, setServiceNumber] = useState<string>('1st Service (50 Hours)');
  const [isFreeService, setIsFreeService] = useState<boolean>(true);
  const [periodicServiceNotes, setPeriodicServiceNotes] = useState<string>(
    'Engine oil renewal, oil & fuel filter replacement, air cleaner blowout, battery check, full chassis lubrication & torque inspection.',
  );

  // Repair Work specific fields
  const [selectedDamagedComponents, setSelectedDamagedComponents] = useState<string[]>([]);
  const [otherDamageDescription, setOtherDamageDescription] = useState<string>('');
  const [damageImageUrls, setDamageImageUrls] = useState<string[]>([]);
  const [uploadingDamagePhoto, setUploadingDamagePhoto] = useState(false);
  const damageFileInputRef = useRef<HTMLInputElement | null>(null);

  // Lightbox preview for damage photos
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Complete Ticket Form State
  const [actualPartsCost, setActualPartsCost] = useState<string>('');
  const [actualLaborCost, setActualLaborCost] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [meterHoursAfterService, setMeterHoursAfterService] = useState<string>('');
  const [nextServiceDueHours, setNextServiceDueHours] = useState<string>('');
  const [checklist, setChecklist] = useState({
    engineOil: true,
    cutterBlades: true,
    hydraulics: true,
    safetyGuards: true,
    testRun: true,
  });

  // Invoice file upload state inside Complete modal
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceUploadProgress, setInvoiceUploadProgress] = useState(false);
  const [uploadedInvoiceUrl, setUploadedInvoiceUrl] = useState<string>('');
  const [uploadedInvoiceFileName, setUploadedInvoiceFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch tickets & damage components from backend
  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const data = await api.fetchMaintenanceTickets(undefined, undefined, false);
      setTickets(data);
    } catch (err) {
      console.error('Failed to load maintenance tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadDamageComponents = async (typeId?: number) => {
    setLoadingComponents(true);
    try {
      const data = await api.fetchDamageComponents(typeId);
      setDamageComponents(data || []);
    } catch (err) {
      console.error('Failed to load damage components:', err);
    } finally {
      setLoadingComponents(false);
    }
  };

  useEffect(() => {
    loadTickets();
    loadDamageComponents();
  }, []);

  // Filtered tickets based on active tab and search
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Tab filter
      if (activeTab === 'ACTIVE') {
        if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
      } else if (activeTab === 'IN_HOUSE') {
        if (t.locationType !== 'IN_HOUSE' || t.status === 'COMPLETED' || t.status === 'CANCELLED')
          return false;
      } else if (activeTab === 'EXTERNAL') {
        if (
          t.locationType !== 'EXTERNAL_SERVICE_CENTER' ||
          t.status === 'COMPLETED' ||
          t.status === 'CANCELLED'
        )
          return false;
      } else if (activeTab === 'COMPLETED') {
        if (t.status !== 'COMPLETED') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.ticketNumber?.toLowerCase().includes(q) ||
          t.assetName?.toLowerCase().includes(q) ||
          t.assetSerialNumber?.toLowerCase().includes(q) ||
          t.serviceCenterName?.toLowerCase().includes(q) ||
          t.issueDescription?.toLowerCase().includes(q) ||
          t.assignedTechnician?.toLowerCase().includes(q) ||
          t.serviceNumber?.toLowerCase().includes(q) ||
          (t.damagedComponents && t.damagedComponents.some((c) => c.toLowerCase().includes(q)))
        );
      }
      return true;
    });
  }, [tickets, activeTab, searchQuery]);

  // Summary counts
  const activeCount = useMemo(
    () => tickets.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length,
    [tickets],
  );
  const inHouseCount = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.locationType === 'IN_HOUSE' &&
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED',
      ).length,
    [tickets],
  );
  const externalCount = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.locationType === 'EXTERNAL_SERVICE_CENTER' &&
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED',
      ).length,
    [tickets],
  );
  const totalCostRecorded = useMemo(
    () =>
      tickets.reduce((sum, t) => sum + (t.totalCost || t.actualPartsCost || t.estimatedCost || 0), 0),
    [tickets],
  );

  // Eligible assets for moving into maintenance (Available, Damaged, Inspection, etc.)
  const eligibleAssets = useMemo(() => {
    return assets.filter(
      (a) =>
        a.status === 'AVAILABLE' ||
        a.status === 'DAMAGED' ||
        a.status === 'INSPECTION' ||
        a.status === 'DAMAGE_ASSESSMENT',
    );
  }, [assets]);

  // 1. Available Cities (from api.cities or derived from hubs)
  const availableCities = useMemo(() => {
    if (api.cities && api.cities.length > 0) return api.cities;
    const cityMap = new Map<number, string>();
    api.hubs.forEach((h) => {
      if (h.cityId) {
        cityMap.set(h.cityId, h.cityName || `City #${h.cityId}`);
      }
    });
    return Array.from(cityMap.entries()).map(([id, name]) => ({
      id,
      name,
      stateId: 0,
      active: true,
    }));
  }, [api.cities, api.hubs]);

  // 2. Hubs filtered by selectedCityId
  const availableHubs = useMemo(() => {
    return api.hubs.filter((h) => !selectedCityId || h.cityId === Number(selectedCityId));
  }, [api.hubs, selectedCityId]);

  // 3. Equipment Types list
  const availableTypes = useMemo(() => {
    return api.types.filter((t) => t.active !== false);
  }, [api.types]);

  // 4. OEMs / Manufacturers filtered by selectedTypeId
  const availableOems = useMemo(() => {
    if (!selectedTypeId) return api.manufacturers.filter((m) => m.active !== false);
    const matchingModelOemIds = new Set(
      api.models.filter((m) => m.typeId === Number(selectedTypeId)).map((m) => m.manufacturerId),
    );
    eligibleAssets
      .filter((a) => a.typeId === Number(selectedTypeId))
      .forEach((a) => {
        if (a.manufacturerId) matchingModelOemIds.add(a.manufacturerId);
      });
    return api.manufacturers.filter(
      (m) => matchingModelOemIds.size === 0 || matchingModelOemIds.has(m.id),
    );
  }, [api.manufacturers, api.models, eligibleAssets, selectedTypeId]);

  // 5. Models filtered by selectedTypeId and selectedOemId
  const availableModels = useMemo(() => {
    return api.models.filter((m) => {
      if (selectedTypeId && m.typeId !== Number(selectedTypeId)) return false;
      if (selectedOemId && m.manufacturerId !== Number(selectedOemId)) return false;
      return true;
    });
  }, [api.models, selectedTypeId, selectedOemId]);

  // 6. Matching Machine Units (Assets)
  const matchingAssets = useMemo(() => {
    return eligibleAssets.filter((a) => {
      if (selectedHubId && a.hubId !== Number(selectedHubId)) return false;
      if (selectedTypeId && a.typeId !== Number(selectedTypeId)) return false;
      if (selectedOemId && a.manufacturerId !== Number(selectedOemId)) return false;
      if (selectedModelId && a.modelId !== Number(selectedModelId)) return false;
      return true;
    });
  }, [eligibleAssets, selectedHubId, selectedTypeId, selectedOemId, selectedModelId]);

  // Cascading Selection Handlers
  const handleCityChange = (cityId: number | '') => {
    setSelectedCityId(cityId);
    setSelectedHubId('');
    setSelectedAssetId('');
  };

  const handleHubChange = (hubId: number | '') => {
    setSelectedHubId(hubId);
    setSelectedAssetId('');
  };

  const handleTypeChange = (typeId: number | '') => {
    setSelectedTypeId(typeId);
    setSelectedOemId('');
    setSelectedModelId('');
    setSelectedAssetId('');
    setSelectedDamagedComponents([]);
    loadDamageComponents(typeId ? Number(typeId) : undefined);
  };

  const handleOemChange = (oemId: number | '') => {
    setSelectedOemId(oemId);
    setSelectedModelId('');
    setSelectedAssetId('');
  };

  const handleModelChange = (modelId: number | '') => {
    setSelectedModelId(modelId);
    setSelectedAssetId('');
  };

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAssetId(asset.id);
    if (asset.engineHours) {
      setMeterHoursAtService(String(asset.engineHours));
    }
  };

  // Open Create Modal (with cascading pre-population if preselectedAssetId)
  const handleOpenCreateModal = (preselectedAssetId?: number) => {
    const matched = preselectedAssetId ? assets.find((a) => a.id === preselectedAssetId) : undefined;
    const initialAsset = matched || (eligibleAssets.length > 0 ? eligibleAssets[0] : undefined);

    if (initialAsset) {
      setSelectedAssetId(initialAsset.id);
      setSelectedHubId(initialAsset.hubId || '');
      const hubObj = api.hubs.find((h) => h.id === initialAsset.hubId);
      setSelectedCityId(hubObj?.cityId || '');
      setSelectedTypeId(initialAsset.typeId || '');
      setSelectedOemId(initialAsset.manufacturerId || '');
      setSelectedModelId(initialAsset.modelId || '');
      setMeterHoursAtService(initialAsset.engineHours ? String(initialAsset.engineHours) : '');
      loadDamageComponents(initialAsset.typeId || undefined);
    } else {
      setSelectedAssetId('');
      setSelectedCityId('');
      setSelectedHubId('');
      setSelectedTypeId('');
      setSelectedOemId('');
      setSelectedModelId('');
      setMeterHoursAtService('');
      loadDamageComponents(undefined);
    }

    setServiceType('PERIODIC_SERVICE');
    setLocationType('IN_HOUSE');
    setServiceCenterName('');
    setServiceCenterContact('');
    setServiceCenterAddress('');
    setPriority('NORMAL');
    setIssueDescription('');
    setWorkScope('');
    setEstimatedCost('');
    setExpectedCompletionDate('');
    setAssignedTechnician('');
    setServiceNumber('1st Service (50 Hours)');
    setIsFreeService(true);
    setPeriodicServiceNotes(
      'Engine oil renewal, oil & fuel filter replacement, air cleaner blowout, battery check, full chassis lubrication & torque inspection.',
    );
    setSelectedDamagedComponents([]);
    setOtherDamageDescription('');
    setDamageImageUrls([]);
    setIsAddingNewComponent(false);
    setNewComponentName('');
    setNewComponentHindiName('');
    setIsCreateModalOpen(true);
  };

  // Save new custom damage component to database
  const handleSaveCustomComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComponentName.trim()) {
      alert('Please enter component name (पुर्जे का नाम लिखें).');
      return;
    }
    setIsSavingNewComponent(true);
    try {
      const created = await api.createDamageComponent({
        equipmentTypeId: selectedTypeId ? Number(selectedTypeId) : undefined,
        name: newComponentName.trim(),
        hindiName: newComponentHindiName.trim() || undefined,
        category: newComponentCategory.trim() || 'CUSTOM_PARTS',
        isUniversal: !selectedTypeId,
      });

      // Reload damage components for this equipment type
      await loadDamageComponents(selectedTypeId ? Number(selectedTypeId) : undefined);
      // Auto-select newly created component
      setSelectedDamagedComponents((prev) => [...prev, created.partCode]);
      setNewComponentName('');
      setNewComponentHindiName('');
      setIsAddingNewComponent(false);
    } catch (err: any) {
      alert(`Error saving custom component: ${err?.message || 'Server error'}`);
    } finally {
      setIsSavingNewComponent(false);
    }
  };

  // Toggle damaged component selection
  const handleToggleDamagedComponent = (code: string) => {
    setSelectedDamagedComponents((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  // Upload external damaged part photo to S3
  const handleDamagePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDamagePhoto(true);
    try {
      const url = await api.uploadDamagePhoto(file);
      setDamageImageUrls((prev) => [...prev, url]);
    } catch (err: any) {
      alert(`Damage photo upload failed: ${err?.message || 'Server error'}`);
    } finally {
      setUploadingDamagePhoto(false);
      if (damageFileInputRef.current) {
        damageFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveDamagePhoto = (index: number) => {
    setDamageImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Create Ticket
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      alert('Please select an asset (कृपया मशीन चुनें).');
      return;
    }

    // Validation for Repair Work / Service & Repair
    const isRepair = serviceType === 'REPAIR_WORK' || serviceType === 'SERVICE_AND_REPAIR';
    const isService = serviceType === 'PERIODIC_SERVICE' || serviceType === 'SERVICE_AND_REPAIR';

    if (isRepair) {
      if (selectedDamagedComponents.length === 0) {
        alert('Please select at least one damaged component (कम से कम एक क्षतिग्रस्त कंपोनेंट चुनें).');
        return;
      }
      if (selectedDamagedComponents.includes('OTHER') && !otherDamageDescription.trim()) {
        alert(
          "Please provide a description/explanation for 'Other' damaged component ('Other' विकल्प चुनने पर विवरण अनिवार्य है).",
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const defaultDesc = isService && !isRepair
        ? `${serviceNumber} - Scheduled Periodic Maintenance`
        : isRepair && !isService
        ? `Repair Work: ${selectedDamagedComponents.join(', ')}`
        : `${serviceNumber} & Repair Work: ${selectedDamagedComponents.join(', ')}`;

      const payload: CreateMaintenanceTicketPayload = {
        assetId: Number(selectedAssetId),
        serviceType,
        locationType,
        serviceCenterName: locationType === 'EXTERNAL_SERVICE_CENTER' ? serviceCenterName : undefined,
        serviceCenterContact:
          locationType === 'EXTERNAL_SERVICE_CENTER' ? serviceCenterContact : undefined,
        serviceCenterAddress:
          locationType === 'EXTERNAL_SERVICE_CENTER' ? serviceCenterAddress : undefined,
        priority,
        issueDescription: issueDescription.trim() ? issueDescription.trim() : defaultDesc,
        workScope: workScope.trim() ? workScope : undefined,
        serviceNumber: isService ? serviceNumber : undefined,
        isFreeService: isService ? isFreeService : undefined,
        periodicServiceNotes: isService ? periodicServiceNotes : undefined,
        damagedComponents: isRepair ? selectedDamagedComponents : undefined,
        otherDamageDescription:
          isRepair && selectedDamagedComponents.includes('OTHER')
            ? otherDamageDescription.trim()
            : undefined,
        damageImageUrls: isRepair && damageImageUrls.length > 0 ? damageImageUrls : undefined,
        estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
        expectedCompletionDate: expectedCompletionDate || undefined,
        meterHoursAtService: meterHoursAtService ? Number(meterHoursAtService) : undefined,
        assignedTechnician: assignedTechnician.trim() ? assignedTechnician : undefined,
      };

      await api.createMaintenanceTicket(payload);
      await loadTickets();
      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert(`Error creating maintenance order: ${err?.message || 'Check inputs and retry'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Complete Modal
  const handleOpenCompleteModal = (ticket: MaintenanceTicket) => {
    setCompletingTicket(ticket);
    setActualPartsCost('');
    setActualLaborCost('');
    setInvoiceNumber(ticket.invoiceNumber || '');
    setCompletionNotes('');
    setMeterHoursAfterService(ticket.meterHoursAtService ? String(ticket.meterHoursAtService) : '');
    setNextServiceDueHours(ticket.meterHoursAtService ? String(ticket.meterHoursAtService + 150) : '');
    setInvoiceFile(null);
    setUploadedInvoiceUrl(ticket.invoiceDocumentUrl || '');
    setUploadedInvoiceFileName(ticket.invoiceFileName || '');
  };

  // Handle invoice file selection & direct upload
  const handleInvoiceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !completingTicket) return;

    setInvoiceFile(file);
    setInvoiceUploadProgress(true);
    try {
      const updated = await api.uploadMaintenanceInvoice(completingTicket.id, file);
      setUploadedInvoiceUrl(updated.invoiceDocumentUrl || '');
      setUploadedInvoiceFileName(updated.invoiceFileName || file.name);
    } catch (err: any) {
      alert(`Invoice upload failed: ${err?.message || 'Server error'}`);
    } finally {
      setInvoiceUploadProgress(false);
    }
  };

  // Submit Complete Ticket
  const handleCompleteTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTicket) return;

    setIsSubmitting(true);
    try {
      const parts = actualPartsCost ? Number(actualPartsCost) : 0;
      const labor = actualLaborCost ? Number(actualLaborCost) : 0;
      const total = parts + labor;

      const payload: CompleteMaintenancePayload = {
        actualPartsCost: parts,
        actualLaborCost: labor,
        totalCost: total,
        invoiceNumber: invoiceNumber.trim() ? invoiceNumber : undefined,
        invoiceDocumentUrl: uploadedInvoiceUrl || undefined,
        invoiceFileName: uploadedInvoiceFileName || undefined,
        invoiceFileType: invoiceFile?.type || undefined,
        completionNotes: completionNotes.trim() ? completionNotes : undefined,
        meterHoursAfterService: meterHoursAfterService ? Number(meterHoursAfterService) : undefined,
        nextServiceDueHours: nextServiceDueHours ? Number(nextServiceDueHours) : undefined,
      };

      await api.completeMaintenanceTicket(completingTicket.id, payload);
      await loadTickets();
      setCompletingTicket(null);
    } catch (err: any) {
      alert(`Error releasing machine: ${err?.message || 'Check inputs and retry'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // View Machine Maintenance History
  const handleViewAssetHistory = async (asset: Asset) => {
    setHistoryAsset(asset);
    setLoadingHistory(true);
    try {
      const history = await api.fetchAssetMaintenanceHistory(asset.id);
      setAssetHistoryTickets(history);
    } catch (err) {
      console.error('Failed to load asset service history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3 overflow-hidden">
      {/* ── Top Header ── */}
      <div
        className={cn(
          'p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-xs transition-colors',
          isDaylight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-slate-900/80 border-slate-800 text-white',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shrink-0">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-black tracking-tight">
                Machine Repairs & Servicing (मरम्मत और सर्विस डेक)
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                {activeCount} Active in Service
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Move machines to In-House Bay or External Service Centers, upload bills, and lock inventory out of bookings.
            </p>
          </div>
        </div>

        {/* Action Button & Metric Counters */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => handleOpenCreateModal()}
            className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Move Machine to Repair (मरम्मत में भेजें)</span>
          </button>

          <button
            onClick={() => loadTickets()}
            disabled={loadingTickets}
            title="Refresh tickets"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={cn('h-4 w-4', loadingTickets && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── Metric Summary Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
        <div
          className={cn(
            'p-3 rounded-xl border flex items-center justify-between transition-colors',
            isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800',
          )}
        >
          <div>
            <div className="text-[10px] font-bold text-slate-500">In-House Bay (यार्ड शेड)</div>
            <div className="text-lg font-black font-mono text-amber-500">{inHouseCount}</div>
          </div>
          <Building2 className="h-6 w-6 text-amber-500/30" />
        </div>

        <div
          className={cn(
            'p-3 rounded-xl border flex items-center justify-between transition-colors',
            isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800',
          )}
        >
          <div>
            <div className="text-[10px] font-bold text-slate-500">External Workshop (बाहरी सेंटर)</div>
            <div className="text-lg font-black font-mono text-indigo-500">{externalCount}</div>
          </div>
          <Truck className="h-6 w-6 text-indigo-500/30" />
        </div>

        <div
          className={cn(
            'p-3 rounded-xl border flex items-center justify-between transition-colors',
            isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800',
          )}
        >
          <div>
            <div className="text-[10px] font-bold text-slate-500">Total in Service (कुल मरम्मत में)</div>
            <div className="text-lg font-black font-mono text-rose-500">{activeCount}</div>
          </div>
          <Wrench className="h-6 w-6 text-rose-500/30" />
        </div>

        <div
          className={cn(
            'p-3 rounded-xl border flex items-center justify-between transition-colors',
            isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800',
          )}
        >
          <div>
            <div className="text-[10px] font-bold text-slate-500">Recorded Spend (सर्विस खर्च)</div>
            <div className="text-lg font-black font-mono text-emerald-500">{formatINR(totalCostRecorded)}</div>
          </div>
          <DollarSign className="h-6 w-6 text-emerald-500/30" />
        </div>
      </div>

      {/* ── Filters & Tabs Bar ── */}
      <div
        className={cn(
          'p-2.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 transition-colors',
          isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-800',
        )}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border select-none shrink-0',
              activeTab === 'ACTIVE'
                ? isDaylight
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-950 border-white font-black'
                : isDaylight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border-slate-700',
            )}
          >
            Active Repairs ({activeCount})
          </button>

          <button
            onClick={() => setActiveTab('IN_HOUSE')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border select-none shrink-0',
              activeTab === 'IN_HOUSE'
                ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-xs'
                : isDaylight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border-slate-700',
            )}
          >
            In-House Yard Bay ({inHouseCount})
          </button>

          <button
            onClick={() => setActiveTab('EXTERNAL')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border select-none shrink-0',
              activeTab === 'EXTERNAL'
                ? 'bg-indigo-600 text-white border-indigo-600 font-black shadow-xs'
                : isDaylight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border-slate-700',
            )}
          >
            External Service Centers ({externalCount})
          </button>

          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border select-none shrink-0',
              activeTab === 'COMPLETED'
                ? 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs'
                : isDaylight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border-slate-700',
            )}
          >
            Completed & Invoices ({tickets.filter((t) => t.status === 'COMPLETED').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticket #, machine, workshop..."
            className={cn(
              'w-full rounded-lg border pl-8 pr-2.5 py-1.5 text-xs transition-colors focus:outline-none',
              isDaylight
                ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-amber-500'
                : 'border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:border-amber-500',
            )}
          />
        </div>
      </div>

      {/* ── Active Service Orders Cards Grid ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {filteredTickets.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3 border border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
            <CheckCircle className="h-12 w-12 text-emerald-500 opacity-80" />
            <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
              No Maintenance Orders in this View
            </div>
            <p className="text-[11px] text-slate-500 max-w-sm">
              All machines in this category are operating smoothly or ready to rent in the yard.
            </p>
            <button
              onClick={() => handleOpenCreateModal()}
              className="mt-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Create New Maintenance Order</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTickets.map((ticket) => {
              const matchedAsset = assets.find((a) => a.id === ticket.assetId);
              const s3Key = resolveAssetS3Key(ticket.assetSerialNumber || ticket.ticketNumber);
              const photoUrl = sanitizeMediaUrl(ticket.assetImageUrl || matchedAsset?.imageUrl, `${s3Key}.jpg`);

              const isCompleted = ticket.status === 'COMPLETED';
              const isExternal = ticket.locationType === 'EXTERNAL_SERVICE_CENTER';

              return (
                <div
                  key={ticket.id}
                  className={cn(
                    'rounded-2xl border p-4 flex flex-col justify-between shadow-xs transition-all hover:shadow-md relative overflow-hidden',
                    isDaylight ? 'bg-white border-slate-200' : 'bg-slate-900/70 border-slate-800/80',
                  )}
                >
                  {/* Top Header: Ticket Number & Status */}
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {ticket.ticketNumber}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                            ticket.priority === 'URGENT'
                              ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                              : ticket.priority === 'HIGH'
                                ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700',
                          )}
                        >
                          {ticket.priority}
                        </span>
                      </div>

                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                          isCompleted
                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-600 border-amber-500/30',
                        )}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    {/* Machine Photo and Name */}
                    <div className="flex items-center gap-3 my-2">
                      <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={ticket.assetName}
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
                        <h3 className="font-black text-xs text-slate-900 dark:text-white truncate">
                          {ticket.assetName}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-mono truncate">
                          {ticket.assetModelName || ticket.assetSerialNumber || 'Machinery'}
                        </p>
                      </div>
                    </div>

                    {/* Location Badge */}
                    <div className="mb-2.5">
                      {isExternal ? (
                        <div className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-[11px] flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-bold truncate">
                              {ticket.serviceCenterName || 'Authorized Workshop'}
                            </span>
                          </div>
                          {ticket.serviceCenterContact && (
                            <span className="text-[10px] font-mono shrink-0">{ticket.serviceCenterContact}</span>
                          )}
                        </div>
                      ) : (
                        <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
                          <Wrench className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-bold">In-House Hub Bay (यार्ड मरम्मत शेड)</span>
                        </div>
                      )}
                    </div>

                    {/* Issue Description & Work Scope */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5 font-mono mb-3">
                      <div className="text-[11px] text-slate-700 dark:text-slate-300">
                        <strong className="text-slate-500 block text-[10px] uppercase tracking-wider font-sans">
                          Reported Malfunction:
                        </strong>
                        {ticket.issueDescription}
                      </div>

                      {ticket.workScope && (
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-800/80">
                          Scope: {ticket.workScope}
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-200/50 dark:border-slate-800/80">
                        <span className="text-slate-500">Service Type:</span>
                        <span
                          className={cn(
                            'font-black px-1.5 py-0.5 rounded border text-[10px]',
                            ticket.serviceType === 'PERIODIC_SERVICE'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              : ticket.serviceType === 'REPAIR_WORK'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
                          )}
                        >
                          {ticket.serviceType === 'PERIODIC_SERVICE'
                            ? 'Periodic Service (आवधिक सर्विस)'
                            : ticket.serviceType === 'REPAIR_WORK'
                            ? 'Repair Work (मरम्मत कार्य)'
                            : 'Service & Repair (सर्विस व मरम्मत दोनों)'}
                        </span>
                      </div>

                      {/* Periodic Service Info (Service Number & Free/Paid) */}
                      {(ticket.serviceNumber || ticket.isFreeService !== undefined) && (
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/40 dark:border-slate-800/60">
                          <span className="text-slate-500">Service Plan:</span>
                          <div className="flex items-center gap-1 font-mono">
                            {ticket.serviceNumber && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 text-[9px]">
                                {ticket.serviceNumber}
                              </span>
                            )}
                            {ticket.isFreeService !== undefined && (
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[9px] font-black border',
                                  ticket.isFreeService
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700',
                                )}
                              >
                                {ticket.isFreeService ? 'FREE (फ्री)' : 'PAID (सशुल्क)'}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Periodic Service Notes snippet */}
                      {ticket.periodicServiceNotes && (
                        <div className="text-[10px] text-slate-500 pt-0.5">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">Service Scope: </span>
                          <span className="line-clamp-2">{ticket.periodicServiceNotes}</span>
                        </div>
                      )}

                      {/* Damaged Components Badges */}
                      {ticket.damagedComponents && ticket.damagedComponents.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-200/40 dark:border-slate-800/60 text-[10px] space-y-1">
                          <span className="text-slate-500 font-semibold block">Damaged Parts (क्षतिग्रस्त पुर्जे):</span>
                          <div className="flex flex-wrap gap-1">
                            {ticket.damagedComponents.map((code, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[9px] font-bold"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                          {ticket.otherDamageDescription && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 italic bg-rose-50/50 dark:bg-rose-950/30 p-1.5 rounded border border-rose-200/40 dark:border-rose-900/40">
                              <strong>Other Note:</strong> {ticket.otherDamageDescription}
                            </div>
                          )}
                        </div>
                      )}

                      {/* External Damage Photos Strip */}
                      {ticket.damageImageUrls && ticket.damageImageUrls.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-200/40 dark:border-slate-800/60 text-[10px] space-y-1">
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                              <Camera className="h-3 w-3 text-amber-500" />
                              External Damage Photos:
                            </span>
                            <span className="font-mono text-[9px]">
                              {ticket.damageImageUrls.length} photo{ticket.damageImageUrls.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                            {ticket.damageImageUrls.map((imgUrl, imgIdx) => (
                              <button
                                key={imgIdx}
                                type="button"
                                onClick={() => setLightboxImageUrl(imgUrl)}
                                className="h-11 w-11 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 hover:scale-105 transition-transform cursor-pointer relative group"
                                title="Click to view full photo"
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Damage ${imgIdx + 1}`}
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="h-3.5 w-3.5 text-white" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {ticket.expectedCompletionDate && (
                        <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-200/50 dark:border-slate-800/80">
                          <span className="text-slate-500">Expected Delivery:</span>
                          <span className="text-amber-500 font-bold">{ticket.expectedCompletionDate}</span>
                        </div>
                      )}

                      {/* Invoice Link if uploaded */}
                      {ticket.invoiceDocumentUrl && (
                        <div className="pt-1.5 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5 text-emerald-500" />
                            Bill Attached:
                          </span>
                          <a
                            href={ticket.invoiceDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                          >
                            <span>{ticket.invoiceNumber || 'View Bill'}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-500">
                        {isCompleted ? 'Total Cost:' : 'Estimated:'}
                      </div>
                      <div className="text-xs font-black font-mono text-slate-900 dark:text-white">
                        {formatINR(ticket.totalCost || ticket.estimatedCost || 0)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {matchedAsset && (
                        <button
                          onClick={() => handleViewAssetHistory(matchedAsset)}
                          title="View Maintenance History"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {!isCompleted ? (
                        <button
                          onClick={() => handleOpenCompleteModal(ticket)}
                          className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Complete & Release (उपलब्ध करें)</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Service Complete</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: MOVE MACHINE TO REPAIR (CREATE TICKET)
          ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className={cn(
              'w-full max-w-6xl rounded-2xl border shadow-2xl p-5 sm:p-6 transition-all my-auto',
              isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white',
            )}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Move Machine to Repair (मरम्मत / सर्विस में भेजें)</h3>
                  <p className="text-[11px] text-slate-500">Locks machine out of website and booking desk until certified ready.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="mt-4 space-y-4 text-xs">
              {/* ── 6-Step Cascading Machine Selector ── */}
              <div
                className={cn(
                  'p-3.5 rounded-xl border space-y-3',
                  isDaylight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/40 border-slate-800',
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                    <Layers className="h-4 w-4 text-amber-500" />
                    <span>Select Machine via Cascading Filter (मशीन चयन: शहर → हब → प्रकार → OEM → मॉडल)</span>
                  </div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                    {matchingAssets.length} unit{matchingAssets.length !== 1 ? 's' : ''} available
                  </span>
                </div>

                {/* Step 1, 2, 3: City, Hub, Equipment Type */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      1. City (शहर)
                    </label>
                    <SearchSelect
                      options={[
                        { value: '', label: '-- All Cities (सभी शहर) --' },
                        ...availableCities.map((c) => ({
                          value: c.id,
                          label: c.name,
                        })),
                      ]}
                      value={selectedCityId === '' ? '' : selectedCityId}
                      onChange={(val) =>
                        handleCityChange(val !== '' && val !== null && val !== undefined ? Number(val) : '')
                      }
                      placeholder="-- All Cities (सभी शहर) --"
                      isClearable={false}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      2. Hub / Yard (हब / यार्ड)
                    </label>
                    <SearchSelect
                      options={[
                        { value: '', label: '-- All Hubs (सभी हब) --' },
                        ...availableHubs.map((h) => ({
                          value: h.id,
                          label: h.name,
                          subLabel: h.cityName,
                        })),
                      ]}
                      value={selectedHubId === '' ? '' : selectedHubId}
                      onChange={(val) =>
                        handleHubChange(val !== '' && val !== null && val !== undefined ? Number(val) : '')
                      }
                      placeholder="-- All Hubs (सभी हब) --"
                      isClearable={false}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center justify-between">
                      <span>3. Machine Type (प्रकार) *</span>
                      <span className="text-[9px] text-amber-500 font-mono">Filters Parts</span>
                    </label>
                    <SearchSelect
                      options={[
                        { value: '', label: '-- All Machine Types --' },
                        ...availableTypes.map((t) => ({
                          value: t.id,
                          label: t.hindiName ? `${t.name} (${t.hindiName})` : t.name,
                        })),
                      ]}
                      value={selectedTypeId === '' ? '' : selectedTypeId}
                      onChange={(val) =>
                        handleTypeChange(val !== '' && val !== null && val !== undefined ? Number(val) : '')
                      }
                      placeholder="-- Select Equipment Type --"
                      isClearable={false}
                    />
                  </div>
                </div>

                {/* Step 4 & 5: OEM & Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      4. OEM / Manufacturer (कंपनी / ब्रांड)
                    </label>
                    <SearchSelect
                      options={[
                        { value: '', label: '-- All OEMs / Brands --' },
                        ...availableOems.map((m) => ({
                          value: m.id,
                          label: m.country ? `${m.name} (${m.country})` : m.name,
                        })),
                      ]}
                      value={selectedOemId === '' ? '' : selectedOemId}
                      onChange={(val) =>
                        handleOemChange(val !== '' && val !== null && val !== undefined ? Number(val) : '')
                      }
                      placeholder="-- All OEMs / Brands --"
                      isClearable={false}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      5. Model (मॉडल)
                    </label>
                    <SearchSelect
                      options={[
                        { value: '', label: '-- All Models (सभी मॉडल) --' },
                        ...availableModels.map((m) => ({
                          value: m.id,
                          label: m.modelNumber ? `${m.name} (${m.modelNumber})` : m.name,
                        })),
                      ]}
                      value={selectedModelId === '' ? '' : selectedModelId}
                      onChange={(val) =>
                        handleModelChange(val !== '' && val !== null && val !== undefined ? Number(val) : '')
                      }
                      placeholder="-- All Models (सभी मॉडल) --"
                      isClearable={false}
                    />
                  </div>
                </div>

                {/* Step 6: Specific Physical Machine Unit Selection */}
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1">
                    6. Select Specific Machine Unit (मशीन यूनिट / टैग / सीरियल नंबर) *
                  </label>
                  <SearchSelect
                    options={matchingAssets.map((a) => ({
                      value: a.id,
                      label: `[${a.assetTag}] ${a.name}`,
                      subLabel: `S/N: ${a.serialNumber || 'N/A'} • ${a.engineHours || 0}h • Hub: ${a.hubName || 'Yard'}`,
                      badge: a.status,
                      badgeColor:
                        a.status === 'DAMAGED'
                          ? '#ef4444'
                          : a.status === 'AVAILABLE'
                          ? '#10b981'
                          : '#f59e0b',
                    }))}
                    value={selectedAssetId === '' ? '' : selectedAssetId}
                    onChange={(val) => {
                      const assetId =
                        val !== '' && val !== null && val !== undefined ? Number(val) : '';
                      const matched = assets.find((a) => a.id === assetId);
                      if (matched) handleAssetSelect(matched);
                      else setSelectedAssetId(assetId);
                    }}
                    placeholder={
                      matchingAssets.length === 0
                        ? '-- No Available/Damaged Units Match this Filter --'
                        : `Choose Unit from ${matchingAssets.length} Matching Machines...`
                    }
                    isClearable={true}
                    noOptionsMessage="No matching machine units available"
                  />

                  {/* Selected Asset Mini Card */}
                  {selectedAssetId && (() => {
                    const selAsset = assets.find((a) => a.id === Number(selectedAssetId));
                    if (!selAsset) return null;
                    return (
                      <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-amber-500" />
                          <div>
                            <span className="font-black text-slate-900 dark:text-white">
                              {selAsset.name}
                            </span>{' '}
                            <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                              [{selAsset.assetTag}]
                            </span>
                            <div className="text-[10px] text-slate-500">
                              Hub: {selAsset.hubName || 'Yard'} • S/N: {selAsset.serialNumber || 'N/A'} • Meter: {selAsset.engineHours || 0} Hours
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border">
                          {selAsset.status}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Service Location Type Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Service Location (मरम्मत कहाँ होगी?) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocationType('IN_HOUSE')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all',
                      locationType === 'IN_HOUSE'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-bold'
                        : isDaylight
                          ? 'border-slate-200 hover:bg-slate-50'
                          : 'border-slate-800 hover:bg-slate-800/60 text-slate-400',
                    )}
                  >
                    <Wrench className="h-4 w-4 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">In-House Bay</div>
                      <div className="text-[10px] text-slate-500">यार्ड शेड में मिस्त्री</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocationType('EXTERNAL_SERVICE_CENTER')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all',
                      locationType === 'EXTERNAL_SERVICE_CENTER'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 font-bold'
                        : isDaylight
                          ? 'border-slate-200 hover:bg-slate-50'
                          : 'border-slate-800 hover:bg-slate-800/60 text-slate-400',
                    )}
                  >
                    <Building2 className="h-4 w-4 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">External Center</div>
                      <div className="text-[10px] text-slate-500">अधिकृत वर्कशॉप / डीलर</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* External Service Center Fields */}
              {locationType === 'EXTERNAL_SERVICE_CENTER' && (
                <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5 animate-fadeIn">
                  <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>External Workshop Details (सर्विस सेंटर विवरण)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Workshop / Dealer Name *
                      </label>
                      <input
                        type="text"
                        required={locationType === 'EXTERNAL_SERVICE_CENTER'}
                        value={serviceCenterName}
                        onChange={(e) => setServiceCenterName(e.target.value)}
                        placeholder="e.g. John Deere Authorized Hub / महिंद्रा वर्कशॉप"
                        className={cn(
                          'w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none',
                          isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                        )}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Contact Phone / Advisor
                      </label>
                      <input
                        type="text"
                        value={serviceCenterContact}
                        onChange={(e) => setServiceCenterContact(e.target.value)}
                        placeholder="e.g. 9876543210 (Rajesh Sharma)"
                        className={cn(
                          'w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none',
                          isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Workshop Address / Location
                    </label>
                    <input
                      type="text"
                      value={serviceCenterAddress}
                      onChange={(e) => setServiceCenterAddress(e.target.value)}
                      placeholder="e.g. Industrial Area Phase 2, Hardoi Bypass"
                      className={cn(
                        'w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none',
                        isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Service Type & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Service Type (रखरखाव का प्रकार) *
                  </label>
                  <SearchSelect
                    options={[
                      {
                        value: 'PERIODIC_SERVICE',
                        label: 'आवधिक / नियमित सर्विस (Periodic Service)',
                        subLabel: 'Scheduled oil change, filters, hours threshold',
                      },
                      {
                        value: 'REPAIR_WORK',
                        label: 'मरम्मत का काम (Repair Work)',
                        subLabel: 'Component replacement, breakdown fixes, damage parts',
                      },
                      {
                        value: 'SERVICE_AND_REPAIR',
                        label: 'सर्विस और मरम्मत दोनों (Service & Repair)',
                        subLabel: 'Periodic overhaul along with damaged part repair',
                      },
                    ]}
                    value={serviceType}
                    onChange={(val) => setServiceType(val as MaintenanceServiceType)}
                    placeholder="Select Service Type..."
                    isClearable={false}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Priority (प्राथमिकता)</label>
                  <SearchSelect
                    options={[
                      { value: 'NORMAL', label: 'NORMAL (सामान्य)', badge: 'NORMAL', badgeColor: '#64748b' },
                      { value: 'HIGH', label: 'HIGH (उच्च)', badge: 'HIGH', badgeColor: '#f59e0b' },
                      { value: 'URGENT', label: 'URGENT (अत्यंत आवश्यक)', badge: 'URGENT', badgeColor: '#ef4444' },
                      { value: 'LOW', label: 'LOW (कम प्राथमिकता)', badge: 'LOW', badgeColor: '#94a3b8' },
                    ]}
                    value={priority}
                    onChange={(val) => setPriority(val as MaintenancePriority)}
                    placeholder="Select Priority..."
                    isClearable={false}
                  />
                </div>
              </div>

              {/* ── Section A: Periodic Service Details ── */}
              {(serviceType === 'PERIODIC_SERVICE' || serviceType === 'SERVICE_AND_REPAIR') && (
                <div
                  className={cn(
                    'p-3.5 rounded-xl border space-y-3 transition-all',
                    isDaylight ? 'bg-blue-50/60 border-blue-200' : 'bg-blue-950/20 border-blue-900/40',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-black text-xs">
                      <Sparkles className="h-4 w-4" />
                      <span>Periodic Service Details (आवधिक सर्विस विवरण)</span>
                    </div>
                    <span className="text-[10px] text-blue-500 font-semibold">नियमित रखरखाव</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Service Number (सर्विस संख्या) *
                      </label>
                      <SearchSelect
                        options={[
                          { value: '1st Service (50 Hours)', label: '1st Service (50 Hours / 50 घंटे)' },
                          { value: '2nd Service (150 Hours)', label: '2nd Service (150 Hours / 150 घंटे)' },
                          { value: '3rd Service (300 Hours)', label: '3rd Service (300 Hours / 300 घंटे)' },
                          { value: '4th Service (500 Hours)', label: '4th Service (500 Hours / 500 घंटे)' },
                          { value: '5th Service (750 Hours)', label: '5th Service (750 Hours / 750 घंटे)' },
                          { value: '6th Service (1000 Hours)', label: '6th Service (1000 Hours / 1000 घंटे)' },
                          { value: '7th Service (1250 Hours)', label: '7th Service (1250 Hours / 1250 घंटे)' },
                          { value: '8th Service (1500 Hours)', label: '8th Service (1500 Hours / 1500 घंटे)' },
                          { value: 'Custom Periodic Service', label: 'Custom Periodic Service (अन्य नियमित सर्विस)' },
                        ]}
                        value={serviceNumber}
                        onChange={(val) => setServiceNumber(String(val))}
                        placeholder="Select Service Stage..."
                        isClearable={false}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Billing Type (फ्री या सशुल्क) *
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setIsFreeService(true)}
                          className={cn(
                            'py-1.5 px-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer',
                            isFreeService
                              ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-xs font-black'
                              : isDaylight
                              ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900',
                          )}
                        >
                          <Check className={cn('h-3.5 w-3.5', isFreeService ? 'opacity-100' : 'opacity-0')} />
                          <span>Free Service (फ्री)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsFreeService(false)}
                          className={cn(
                            'py-1.5 px-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer',
                            !isFreeService
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-black'
                              : isDaylight
                              ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900',
                          )}
                        >
                          <DollarSign className={cn('h-3.5 w-3.5', !isFreeService ? 'opacity-100' : 'opacity-0')} />
                          <span>Paid Service (सशुल्क)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Standard Periodic Checklist & Scope (सर्विस कार्य विवरण)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Editable standard scope</span>
                    </label>
                    <textarea
                      rows={2}
                      value={periodicServiceNotes}
                      onChange={(e) => setPeriodicServiceNotes(e.target.value)}
                      placeholder="Oil filter replacement, fuel filter change, air filter cleaning, battery inspection..."
                      className={cn(
                        'w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none resize-none font-mono',
                        isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                      )}
                    />
                  </div>
                </div>
              )}

              {/* ── Section B: Repair Work & Damaged Components ── */}
              {(serviceType === 'REPAIR_WORK' || serviceType === 'SERVICE_AND_REPAIR') && (
                <div
                  className={cn(
                    'p-3.5 rounded-xl border space-y-3 transition-all',
                    isDaylight ? 'bg-amber-50/60 border-amber-200' : 'bg-amber-950/20 border-amber-900/40',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black text-xs">
                      <Wrench className="h-4 w-4" />
                      <span>Damaged Components & External Photos (क्षतिग्रस्त पार्ट्स व फ़ोटो)</span>
                    </div>
                    <span className="text-[10px] text-amber-500 font-semibold">खराबी व मरम्मत</span>
                  </div>

                  {/* Equipment Type scoping context */}
                  {selectedTypeId ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-amber-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          Type Scope:{' '}
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {api.types.find((t) => t.id === Number(selectedTypeId))?.name || 'Selected Equipment Type'}
                          </span>
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        {damageComponents.length} Type-Specific & Universal Parts Loaded
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/40 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
                        <Info className="h-4 w-4 shrink-0 text-sky-500" />
                        <span>
                          <strong>Step 3 Hint:</strong> Select Equipment Type in Step 3 above to automatically load exact components for that machine class (Tractor, Rotavator, Harvester, etc.).
                        </span>
                      </div>
                      <span className="text-[10px] text-sky-600 dark:text-sky-400 shrink-0 font-semibold">
                        Universal Parts Only
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <span>Select Damaged Machine / Vehicle Components (क्षतिग्रस्त पुर्जे चुनें) *</span>
                        {selectedDamagedComponents.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                            {selectedDamagedComponents.length} selected
                          </span>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewComponent(!isAddingNewComponent)}
                        className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="h-3 w-3" />
                        <span>{isAddingNewComponent ? 'Close Add Part' : '+ Add New Part (नया पुर्जा जोड़ें)'}</span>
                      </button>
                    </div>

                    {/* Inline Form to add custom component to this equipment type */}
                    {isAddingNewComponent && (
                      <div className="mb-2.5 p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                        <div className="flex items-center justify-between border-b pb-1.5 border-slate-100 dark:border-slate-800">
                          <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <PlusCircle className="h-3.5 w-3.5 text-amber-500" />
                            <span>Add New Component to {api.types.find((t) => t.id === Number(selectedTypeId))?.name || 'All Types'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAddingNewComponent(false)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Part Name (English) *</label>
                            <input
                              type="text"
                              value={newComponentName}
                              onChange={(e) => setNewComponentName(e.target.value)}
                              placeholder="e.g. PTO Yoke, Tine Holder"
                              className={cn(
                                'w-full rounded-lg border px-2 py-1 text-xs focus:outline-none font-semibold',
                                isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                              )}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Hindi Name (हिंदी नाम - ऐच्छिक)</label>
                            <input
                              type="text"
                              value={newComponentHindiName}
                              onChange={(e) => setNewComponentHindiName(e.target.value)}
                              placeholder="जैसे पी.टी.ओ. योक, ब्लेड होल्डर"
                              className={cn(
                                'w-full rounded-lg border px-2 py-1 text-xs focus:outline-none',
                                isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                              )}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Category (श्रेणी)</label>
                            <SearchSelect
                              options={[
                                { value: 'ATTACHMENT', label: 'ATTACHMENT (उपकरण/अटैचमेंट)' },
                                { value: 'HYDRAULIC', label: 'HYDRAULIC (हाइड्रोलिक)' },
                                { value: 'TRANSMISSION', label: 'TRANSMISSION (ट्रांसमिशन)' },
                                { value: 'ENGINE', label: 'ENGINE (इंजन)' },
                                { value: 'ELECTRICAL', label: 'ELECTRICAL (इलेक्ट्रिकल)' },
                                { value: 'CHASSIS', label: 'CHASSIS / BODY (चेसिस)' },
                                { value: 'CUSTOM_PARTS', label: 'CUSTOM_PARTS (अन्य विशिष्ट)' },
                              ]}
                              value={newComponentCategory || 'ATTACHMENT'}
                              onChange={(val) => setNewComponentCategory(String(val))}
                              placeholder="Select Category..."
                              isClearable={false}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingNewComponent(false)}
                            className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isSavingNewComponent || !newComponentName.trim()}
                            onClick={handleSaveCustomComponent}
                            className="px-3 py-1 text-[11px] font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            {isSavingNewComponent ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            <span>{isSavingNewComponent ? 'Saving...' : 'Save Part to DB (पुर्जा सेव करें)'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {loadingComponents ? (
                      <div className="text-xs text-slate-400 py-2 flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
                        <span>Loading {selectedTypeId ? 'type-specific' : 'generic'} components list...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                        {damageComponents.map((comp) => {
                          const isSelected = selectedDamagedComponents.includes(comp.partCode);
                          return (
                            <button
                              key={comp.id}
                              type="button"
                              onClick={() => handleToggleDamagedComponent(comp.partCode)}
                              className={cn(
                                'text-left px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-between gap-1 cursor-pointer select-none',
                                isSelected
                                  ? comp.partCode === 'OTHER'
                                    ? 'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 font-black'
                                    : 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-black'
                                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900',
                              )}
                            >
                              <div className="truncate">
                                <span>{comp.name}</span>
                                {comp.hindiName && (
                                  <span className="text-[10px] opacity-75 ml-1">({comp.hindiName})</span>
                                )}
                              </div>
                              {isSelected ? (
                                <CheckSquare className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                              ) : (
                                <Square className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Mandatory explanation if OTHER is selected */}
                  {selectedDamagedComponents.includes('OTHER') && (
                    <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-1">
                      <label className="block text-[11px] font-black text-rose-700 dark:text-rose-300">
                        Explain Specific Machine Repair Requirement (अन्य खराबी का अनिवार्य विवरण) *
                      </label>
                      <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80">
                        चूंकि आपने 'Other' चुना है, इस मशीन के विशेष खराबी या बदलाव का विवरण अनिवार्य रूप से दर्ज करें।
                      </p>
                      <textarea
                        required
                        rows={2}
                        value={otherDamageDescription}
                        onChange={(e) => setOtherDamageDescription(e.target.value)}
                        placeholder="e.g. Starter motor solenoid burnt, radiator fan blade cracked, clutch pressure plate slipping..."
                        className={cn(
                          'w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none resize-none font-mono',
                          isDaylight
                            ? 'border-rose-300 bg-white text-slate-900'
                            : 'border-rose-800 bg-slate-950 text-white',
                        )}
                      />
                    </div>
                  )}

                  {/* External Damaged Part Photos Upload */}
                  <div className="space-y-1.5 pt-1 border-t border-amber-200/50 dark:border-amber-900/40">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Camera className="h-3.5 w-3.5 text-amber-500" />
                        <span>External Damaged Part Images (बाहरी टूटे/क्षतिग्रस्त पार्ट्स की फ़ोटो - ऐच्छिक)</span>
                      </label>
                      <span className="text-[10px] text-slate-400">S3 Permanent Folder</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      आंतरिक पार्ट्स नहीं दिखते इसलिए केवल बाहरी दिखने वाले टूटे या घिसे पुर्जों (जैसे टायर, ब्लेड, चेसिस, लीकेज) की स्थिति हेतु फ़ोटो अपलोड करें।
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {/* Hidden file input */}
                      <input
                        ref={damageFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleDamagePhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={uploadingDamagePhoto}
                        onClick={() => damageFileInputRef.current?.click()}
                        className={cn(
                          'px-3 py-2 rounded-xl text-xs font-bold border border-dashed flex items-center gap-1.5 transition-all cursor-pointer',
                          uploadingDamagePhoto
                            ? 'opacity-60 cursor-not-allowed'
                            : isDaylight
                            ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800'
                            : 'border-amber-700 bg-amber-950/40 hover:bg-amber-950/70 text-amber-300',
                        )}
                      >
                        <UploadCloud className="h-4 w-4" />
                        <span>{uploadingDamagePhoto ? 'Uploading to S3...' : '+ Upload Damage Photo (फ़ोटो जोड़ें)'}</span>
                      </button>

                      {/* Thumbnails of uploaded damage photos */}
                      {damageImageUrls.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative h-14 w-14 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden group shrink-0"
                        >
                          <img
                            src={url}
                            alt={`Damage part ${idx + 1}`}
                            className="h-full w-full object-cover cursor-pointer"
                            onClick={() => setLightboxImageUrl(url)}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveDamagePhoto(idx)}
                            className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-slate-950/80 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                            title="Remove Photo"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Issue Description & Work Scope */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Reported Malfunction / Issue (खराबी का विवरण) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="e.g. Engine overheating, hydraulic seal leaking, rotavator blade bent..."
                  className={cn(
                    'w-full rounded-xl border px-3 py-2 text-xs focus:outline-none resize-none',
                    isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                  )}
                />
              </div>

              {/* Work Scope, Costs, Expected Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Estimated Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    placeholder="e.g. 4500"
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-xs focus:outline-none',
                      isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                    )}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Expected Ready Date
                  </label>
                  <input
                    type="date"
                    value={expectedCompletionDate}
                    onChange={(e) => setExpectedCompletionDate(e.target.value)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-xs focus:outline-none',
                      isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                    )}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Technician / Mechanic
                  </label>
                  <input
                    type="text"
                    value={assignedTechnician}
                    onChange={(e) => setAssignedTechnician(e.target.value)}
                    placeholder="e.g. Deepak / Ramesh Mistri"
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-xs focus:outline-none',
                      isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                    )}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel (रद्द करें)
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Wrench className="h-4 w-4" />
                  <span>{isSubmitting ? 'Creating...' : 'Confirm & Move to Service (मरम्मत में भेजें)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: COMPLETE SERVICE & RELEASE TO FLEET (WITH INVOICE UPLOAD)
          ========================================================================= */}
      {completingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className={cn(
              'w-full max-w-6xl rounded-2xl border shadow-2xl p-5 sm:p-6 transition-all my-auto',
              isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white',
            )}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black">
                    Complete Service & Release (मरम्मत पूरी करें व उपलब्ध करें)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ticket: {completingTicket.ticketNumber} • {completingTicket.assetName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompletingTicket(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCompleteTicketSubmit} className="mt-4 space-y-4 text-xs">
              {/* Cost Breakdown */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Cost & Billing Summary (खर्च और बिलिंग)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Parts Cost (पार्ट्स खर्च ₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={actualPartsCost}
                      onChange={(e) => setActualPartsCost(e.target.value)}
                      placeholder="e.g. 2400"
                      className={cn(
                        'w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none',
                        isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Labor Fee (मिस्त्री मजदूरी ₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={actualLaborCost}
                      onChange={(e) => setActualLaborCost(e.target.value)}
                      placeholder="e.g. 600"
                      className={cn(
                        'w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none',
                        isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Bill / Invoice No.
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. INV-98210"
                      className={cn(
                        'w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none',
                        isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                      )}
                    />
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                  Total Maintenance Cost: <strong className="text-emerald-500 font-mono text-xs">{formatINR((Number(actualPartsCost) || 0) + (Number(actualLaborCost) || 0))}</strong>
                </div>
              </div>

              {/* ── EXTERNAL SERVICE INVOICE UPLOAD WIDGET ── */}
              <div
                className={cn(
                  'p-3.5 rounded-xl border space-y-2 transition-colors',
                  completingTicket.locationType === 'EXTERNAL_SERVICE_CENTER'
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/80'
                    : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800',
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                    <FileText className="h-4 w-4" />
                    <span>Upload External Workshop Bill / Invoice (सर्विस सेंटर बिल अपलोड करें)</span>
                  </div>
                  {completingTicket.locationType === 'EXTERNAL_SERVICE_CENTER' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-bold">
                      Recommended
                    </span>
                  )}
                </div>

                {/* Uploaded state or Dropzone */}
                {uploadedInvoiceUrl ? (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 truncate">
                          {uploadedInvoiceFileName || 'Invoice Document Attached'}
                        </div>
                        <div className="text-[10px] text-emerald-600/80">S3 Cloud Stored</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={uploadedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[11px] font-bold flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white text-[11px] font-bold"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 rounded-xl p-4 text-center cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all flex flex-col items-center justify-center gap-1.5"
                  >
                    <UploadCloud className="h-6 w-6 text-indigo-500" />
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {invoiceUploadProgress ? 'Uploading to S3...' : 'Click to select Bill / Invoice (PDF, JPG, PNG)'}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Supports service center bills up to 25 MB. Linked permanently to this ticket.
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleInvoiceFileChange}
                  className="hidden"
                />
              </div>

              {/* 5-Point Quality Checklist */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Pre-Release Quality Checklist (तैयारी जांच सूची)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.engineOil}
                      onChange={(e) => setChecklist({ ...checklist, engineOil: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>1. Engine oil checked (ऑयल स्तर सही)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.cutterBlades}
                      onChange={(e) => setChecklist({ ...checklist, cutterBlades: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>2. Blades & fasteners tight (कटर/बोल्ट टाइट)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.hydraulics}
                      onChange={(e) => setChecklist({ ...checklist, hydraulics: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>3. Hydraulics leak-free (लीकेज नहीं है)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist.testRun}
                      onChange={(e) => setChecklist({ ...checklist, testRun: e.target.checked })}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>4. Engine test run passed (चालू कर देखा)</span>
                  </label>
                </div>
              </div>

              {/* Meter readings & completion report */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Updated Meter Hours (घंटे मीटर)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={meterHoursAfterService}
                    onChange={(e) => setMeterHoursAfterService(e.target.value)}
                    placeholder="e.g. 145"
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-xs focus:outline-none',
                      isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                    )}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Next Service Due (घंटे)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={nextServiceDueHours}
                    onChange={(e) => setNextServiceDueHours(e.target.value)}
                    placeholder="e.g. 250"
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-xs focus:outline-none',
                      isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                    )}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Mechanic Completion Notes (सर्विस रिपोर्ट)
                </label>
                <input
                  type="text"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Replaced oil filter, adjusted belt tension, machine washed and tested ready."
                  className={cn(
                    'w-full rounded-xl border px-3 py-2 text-xs focus:outline-none',
                    isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                  )}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCompletingTicket(null)}
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
                  <span>
                    {isSubmitting ? 'Certifying...' : 'Certify Ready & Restore to AVAILABLE (फ्लीट में उपलब्ध करें)'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAWER / MODAL 3: MACHINE SERVICE HISTORY & INVOICE VIEWER
          ========================================================================= */}
      {historyAsset && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className={cn(
              'w-full max-w-2xl rounded-2xl border shadow-2xl p-5 sm:p-6 transition-all my-auto max-h-[85vh] flex flex-col',
              isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white',
            )}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-500">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black">
                    Machine Service History & Invoices (सर्विस व बिल इतिहास)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    [{historyAsset.assetTag}] {historyAsset.name} • {historyAsset.modelName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryAsset(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Lifetime stats */}
            <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">Total Lifetime Spend</div>
                <div className="text-sm font-black font-mono text-emerald-500">
                  {formatINR(assetHistoryTickets.reduce((sum, t) => sum + (t.totalCost || 0), 0))}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">Total Service Visits</div>
                <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
                  {assetHistoryTickets.length} Visits
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">Current Status</div>
                <StatusBadge status={historyAsset.status} size="sm" showFarmerLabel={true} />
              </div>
            </div>

            {/* Timeline list */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading machine service history...</span>
                </div>
              ) : assetHistoryTickets.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                  No previous service tickets recorded for this machine.
                </div>
              ) : (
                assetHistoryTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{t.ticketNumber}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {t.completedAt ? new Date(t.completedAt).toLocaleDateString() : 'In Progress'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-700 dark:text-slate-300">
                      <strong>Issue:</strong> {t.issueDescription}
                    </div>

                    {/* Service Type & Plan Details */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span
                        className={cn(
                          'font-bold px-1.5 py-0.5 rounded border',
                          t.serviceType === 'PERIODIC_SERVICE'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            : t.serviceType === 'REPAIR_WORK'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
                        )}
                      >
                        {t.serviceType === 'PERIODIC_SERVICE'
                          ? 'Periodic Service'
                          : t.serviceType === 'REPAIR_WORK'
                          ? 'Repair Work'
                          : 'Service & Repair'}
                      </span>

                      {t.serviceNumber && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold border border-blue-500/20">
                          {t.serviceNumber}
                        </span>
                      )}

                      {t.isFreeService !== undefined && (
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[9px] font-black border',
                            t.isFreeService
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700',
                          )}
                        >
                          {t.isFreeService ? 'FREE' : 'PAID'}
                        </span>
                      )}
                    </div>

                    {/* Damaged Components */}
                    {t.damagedComponents && t.damagedComponents.length > 0 && (
                      <div className="space-y-1 text-[10px]">
                        <span className="text-slate-500 font-semibold block">Damaged Parts:</span>
                        <div className="flex flex-wrap gap-1">
                          {t.damagedComponents.map((c, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[9px] font-bold"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                        {t.otherDamageDescription && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 italic">
                            Other: {t.otherDamageDescription}
                          </div>
                        )}
                      </div>
                    )}

                    {/* External Damage Photos */}
                    {t.damageImageUrls && t.damageImageUrls.length > 0 && (
                      <div className="space-y-1 text-[10px]">
                        <span className="text-slate-500 font-semibold block">External Damage Photos:</span>
                        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                          {t.damageImageUrls.map((imgUrl, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              onClick={() => setLightboxImageUrl(imgUrl)}
                              className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 hover:scale-105 transition-transform cursor-pointer"
                              title="Click to view full photo"
                            >
                              <img
                                src={imgUrl}
                                alt="Damage detail"
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {t.completionNotes && (
                      <div className="text-[10px] text-slate-500">
                        <strong>Notes:</strong> {t.completionNotes}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800/80 text-[11px]">
                      <span className="text-slate-500 font-mono">
                        Cost: {formatINR(t.totalCost || t.actualPartsCost || 0)}
                      </span>

                      {t.invoiceDocumentUrl && (
                        <a
                          href={t.invoiceDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline text-[10px]"
                        >
                          <FileText className="h-3 w-3" />
                          <span>View Invoice ({t.invoiceNumber || 'Bill'})</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-right shrink-0">
              <button
                onClick={() => setHistoryAsset(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close (बंद करें)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LIGHTBOX MODAL: FULL PREVIEW OF EXTERNAL DAMAGED PART IMAGE
          ========================================================================= */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImageUrl(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white cursor-pointer transition-colors"
              title="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightboxImageUrl}
              alt="External Damaged Part Full View"
              className="rounded-2xl max-w-full max-h-[80vh] object-contain shadow-2xl border border-slate-700"
            />
            <div className="mt-2 text-xs text-slate-300 font-mono flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-amber-500" />
              <span>External Damaged Component Photo (Permanent S3 Storage)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
} from 'lucide-react';
import { api, resolveAssetS3Key, sanitizeMediaUrl } from '../../services/api';
import { useTheme } from '../../lib/ThemeContext';
import { formatINR, cn } from '../../lib/utils';
import {
  Asset,
  AssetStatus,
  MaintenanceTicket,
  MaintenanceServiceType,
  MaintenanceLocationType,
  MaintenancePriority,
  CreateMaintenanceTicketPayload,
  CompleteMaintenancePayload,
} from '../../types';
import { StatusBadge } from '../../components/StatusBadge';

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

  // Create Ticket Form State
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');
  const [serviceType, setServiceType] = useState<MaintenanceServiceType>('ROUTINE_SERVICE');
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

  // Fetch tickets from backend
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

  useEffect(() => {
    loadTickets();
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
          t.assignedTechnician?.toLowerCase().includes(q)
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

  // Open Create Modal
  const handleOpenCreateModal = (preselectedAssetId?: number) => {
    setSelectedAssetId(preselectedAssetId || (eligibleAssets[0]?.id ?? ''));
    setServiceType('ROUTINE_SERVICE');
    setLocationType('IN_HOUSE');
    setServiceCenterName('');
    setServiceCenterContact('');
    setServiceCenterAddress('');
    setPriority('NORMAL');
    setIssueDescription('');
    setWorkScope('');
    setEstimatedCost('');
    setExpectedCompletionDate('');
    setMeterHoursAtService('');
    setAssignedTechnician('');
    setIsCreateModalOpen(true);
  };

  // Submit Create Ticket
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;

    setIsSubmitting(true);
    try {
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
        issueDescription,
        workScope: workScope.trim() ? workScope : undefined,
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
                        <strong className="text-slate-900 dark:text-white">{ticket.serviceType}</strong>
                      </div>

                      {ticket.expectedCompletionDate && (
                        <div className="flex justify-between items-center text-[10px]">
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
              'w-full max-w-xl rounded-2xl border shadow-2xl p-5 sm:p-6 transition-all my-auto',
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
              {/* Asset Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Select Yard Machine (मशीन चुनें) *
                </label>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(Number(e.target.value))}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2 text-xs focus:outline-none',
                    isDaylight
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                      : 'border-slate-800 bg-slate-950 text-white focus:border-amber-500',
                  )}
                >
                  <option value="" disabled>-- Select Available / Damaged Machine --</option>
                  {eligibleAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.assetTag}] {a.name} — Status: {a.status} (Hub: {a.hubName || 'Main Yard'})
                    </option>
                  ))}
                </select>
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
                    Service Type (काम का प्रकार) *
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as MaintenanceServiceType)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-xs focus:outline-none',
                      isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                    )}
                  >
                    <option value="ROUTINE_SERVICE">ROUTINE_SERVICE (नियमित सर्विस / ऑइल बदलाव)</option>
                    <option value="BREAKDOWN_REPAIR">BREAKDOWN_REPAIR (अचानक ब्रेकडाउन / खराबी)</option>
                    <option value="MAJOR_OVERHAUL">MAJOR_OVERHAUL (बड़ा ओवरहाल / इंजन मरम्मत)</option>
                    <option value="PREVENTIVE_CHECK">PREVENTIVE_CHECK (प्रिवेंटिव सुरक्षा जांच)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Priority (प्राथमिकता)</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-xs focus:outline-none',
                      isDaylight ? 'border-slate-300 bg-white' : 'border-slate-800 bg-slate-950',
                    )}
                  >
                    <option value="NORMAL">NORMAL (सामान्य)</option>
                    <option value="HIGH">HIGH (उच्च)</option>
                    <option value="URGENT">URGENT (अत्यंत आवश्यक)</option>
                    <option value="LOW">LOW (कम प्राथमिकता)</option>
                  </select>
                </div>
              </div>

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
              'w-full max-w-xl rounded-2xl border shadow-2xl p-5 sm:p-6 transition-all my-auto',
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
    </div>
  );
};

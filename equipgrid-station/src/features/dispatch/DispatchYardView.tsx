import React, { useState, useMemo, useEffect } from 'react';
import {
  Send,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Printer,
  AlertTriangle,
  Truck,
  MapPin,
  Calendar,
  RotateCcw,
  Clock,
  MessageSquare,
  ExternalLink,
  X,
  Phone,
  User,
  Navigation,
  CalendarClock,
  Check,
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { SearchSelect } from '../../components/SearchSelect';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { CollectPaymentModal } from '../../components/CollectPaymentModal';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';
import { WhatsAppCirculationModal } from '../../components/WhatsAppCirculationModal';
import { formatINR, formatDate } from '../../lib/utils';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { Booking, DispatchRecord, DeliveryJob, ReturnPickupJob, FulfillmentJobStatus } from '../../types';
import { cn } from '../../lib/utils';
import { printDispatchChallanPdf } from '../../services/voucherPdfService';
import { getDispatchWhatsAppMessage, openWhatsAppCirculation } from '../../services/whatsappCirculation';

interface DispatchYardViewProps {
  onNavigateToPayment: () => void;
}

type DispatchTab = 'deliveries' | 'returns' | 'handover';

const TODAY = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

// Statuses eligible for handover
const PENDING_STATUSES = new Set(['CONFIRMED', 'ALLOCATED', 'DISPATCH_READY']);

export const DispatchYardView: React.FC<DispatchYardViewProps> = ({ onNavigateToPayment }) => {
  const { isDaylight } = useTheme();
  const allBookings = api.bookings;
  const states = api.getStates();
  const cities = api.getCities();
  const hubs = api.getHubs();

  const [selectedStateId, setSelectedStateId] = useState<string>('ALL');
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<DispatchTab>('deliveries');

  // Fulfillment Data State
  const [deliveryJobs, setDeliveryJobs] = useState<DeliveryJob[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [returnPickupJobs, setReturnPickupJobs] = useState<ReturnPickupJob[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);

  // Delivery Job Modal State
  const [selectedDeliveryJob, setSelectedDeliveryJob] = useState<{ job?: DeliveryJob; booking: Booking } | null>(null);
  const [jobDriverName, setJobDriverName] = useState('');
  const [jobDriverPhone, setJobDriverPhone] = useState('');
  const [jobVehicleNumber, setJobVehicleNumber] = useState('');
  const [jobScheduledFor, setJobScheduledFor] = useState('');
  const [jobEtaStart, setJobEtaStart] = useState('');
  const [jobEtaEnd, setJobEtaEnd] = useState('');
  const [jobReceiverName, setJobReceiverName] = useState('');
  const [jobReceiverPhone, setJobReceiverPhone] = useState('');
  const [jobNotes, setJobNotes] = useState('');
  const [jobStatus, setJobStatus] = useState<FulfillmentJobStatus>('SCHEDULED');
  const [jobSubmitting, setJobSubmitting] = useState(false);

  // Return Pickup Modal State
  const [selectedReturnJob, setSelectedReturnJob] = useState<ReturnPickupJob | null>(null);
  const [pickupDriverName, setPickupDriverName] = useState('');
  const [pickupDriverPhone, setPickupDriverPhone] = useState('');
  const [pickupVehicleNumber, setPickupVehicleNumber] = useState('');
  const [pickupScheduledFor, setPickupScheduledFor] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [pickupStatus, setPickupStatus] = useState<FulfillmentJobStatus>('SCHEDULED');
  const [pickupSubmitting, setPickupSubmitting] = useState(false);

  const loadFulfillment = async () => {
    setDeliveryLoading(true);
    setReturnsLoading(true);
    try {
      const [del, ret] = await Promise.all([api.getDeliveryJobs(), api.getReturnPickupJobs()]);
      setDeliveryJobs(del);
      setReturnPickupJobs(ret);
    } catch {
      // fallback
    } finally {
      setDeliveryLoading(false);
      setReturnsLoading(false);
    }
  };

  useEffect(() => {
    loadFulfillment();
  }, []);

  const [paymentModalBooking, setPaymentModalBooking] = useState<Booking | null>(null);
  const [whatsAppModalBooking, setWhatsAppModalBooking] = useState<Booking | null>(null);
  const [whatsAppModalDispatch, setWhatsAppModalDispatch] = useState<DispatchRecord | null>(null);

  const handleOpenWhatsAppModal = async (b: Booking) => {
    setWhatsAppModalBooking(b);
    try {
      const record = await api.getDispatchByBooking(b.id);
      setWhatsAppModalDispatch(record);
    } catch {
      setWhatsAppModalDispatch(null);
    }
  };

  const availableCities = useMemo(
    () => cities.filter((c) => (selectedStateId === 'ALL' ? true : c.stateId === Number(selectedStateId))),
    [cities, selectedStateId],
  );
  const availableHubs = useMemo(() => {
    if (selectedCityId !== 'ALL') return hubs.filter((h) => h.cityId === Number(selectedCityId));
    if (selectedStateId !== 'ALL') {
      const ids = new Set(availableCities.map((c) => c.id));
      return hubs.filter((h) => ids.has(h.cityId));
    }
    return hubs;
  }, [hubs, selectedCityId, selectedStateId, availableCities]);

  // Pending handover queue: active bookings covering today's date
  const pendingHandovers = useMemo(() => {
    return allBookings.filter((b) => {
      if (!PENDING_STATUSES.has(b.status)) return false;
      // Active for today: must start on or before today and end on or after today
      if (b.startDate > TODAY || b.endDate < TODAY) return false;
      const hub = hubs.find((h) => h.id === b.asset.hubId);
      const city = cities.find((c) => c.id === hub?.cityId);
      if (selectedStateId !== 'ALL' && city?.stateId !== Number(selectedStateId)) return false;
      if (selectedCityId !== 'ALL' && hub?.cityId !== Number(selectedCityId)) return false;
      if (selectedHubId !== 'ALL' && b.asset.hubId !== Number(selectedHubId)) return false;
      return true;
    });
  }, [allBookings, hubs, cities, selectedStateId, selectedCityId, selectedHubId]);

  const [visibleCount, setVisibleCount] = useState<number>(7);

  // Reset to initial 7 items when filters change
  React.useEffect(() => {
    setVisibleCount(7);
  }, [selectedStateId, selectedCityId, selectedHubId]);

  // Infinite scroll slice (default 7 items, loads +7 on scroll)
  const visibleHandovers = useMemo(() => {
    return pendingHandovers.slice(0, visibleCount);
  }, [pendingHandovers, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 60) {
      if (visibleCount < pendingHandovers.length) {
        setVisibleCount((prev) => Math.min(prev + 7, pendingHandovers.length));
      }
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 7, pendingHandovers.length));
  };

  // Delivery jobs list combined with confirmed bookings
  const combinedDeliveries = useMemo(() => {
    const map = new Map<number, { job?: DeliveryJob; booking: Booking }>();
    deliveryJobs.forEach((j) => {
      if (j.booking) map.set(j.booking.id, { job: j, booking: j.booking });
    });
    allBookings.forEach((b) => {
      if (['CONFIRMED', 'ALLOCATED', 'DISPATCH_READY', 'OUT_FOR_DELIVERY', 'ON_RENT'].includes(b.status)) {
        if (!map.has(b.id)) {
          map.set(b.id, { booking: b });
        }
      }
    });

    return Array.from(map.values()).filter(({ booking }) => {
      const hub = hubs.find((h) => h.id === booking.asset.hubId);
      const city = cities.find((c) => c.id === hub?.cityId);
      if (selectedStateId !== 'ALL' && city?.stateId !== Number(selectedStateId)) return false;
      if (selectedCityId !== 'ALL' && hub?.cityId !== Number(selectedCityId)) return false;
      if (selectedHubId !== 'ALL' && booking.asset.hubId !== Number(selectedHubId)) return false;
      return true;
    });
  }, [deliveryJobs, allBookings, hubs, cities, selectedStateId, selectedCityId, selectedHubId]);

  // Return pickup jobs combined with bookings where return is requested
  const combinedReturns = useMemo(() => {
    const map = new Map<number, ReturnPickupJob>();
    returnPickupJobs.forEach((r) => {
      if (r.booking) map.set(r.booking.id, r);
    });
    allBookings
      .filter((b) => b.status === 'RETURN_REQUESTED')
      .forEach((b) => {
        if (!map.has(b.id)) {
          map.set(b.id, {
            id: b.id,
            booking: b,
            status: 'REQUESTED',
            scheduledFor: b.endDate,
          });
        }
      });

    return Array.from(map.values()).filter((item) => {
      const hub = hubs.find((h) => h.id === item.booking.asset.hubId);
      const city = cities.find((c) => c.id === hub?.cityId);
      if (selectedStateId !== 'ALL' && city?.stateId !== Number(selectedStateId)) return false;
      if (selectedCityId !== 'ALL' && hub?.cityId !== Number(selectedCityId)) return false;
      if (selectedHubId !== 'ALL' && item.booking.asset.hubId !== Number(selectedHubId)) return false;
      return true;
    });
  }, [returnPickupJobs, allBookings, hubs, cities, selectedStateId, selectedCityId, selectedHubId]);

  const openScheduleDelivery = (item: { job?: DeliveryJob; booking: Booking }) => {
    setSelectedDeliveryJob(item);
    const j = item.job;
    const b = item.booking;
    setJobDriverName(j?.driverName || '');
    setJobDriverPhone(j?.driverPhone || '');
    setJobVehicleNumber(j?.vehicleNumber || '');
    setJobScheduledFor(j?.scheduledFor ? j.scheduledFor.slice(0, 16) : `${b.startDate}T09:00`);
    setJobEtaStart(j?.etaStart ? j.etaStart.slice(0, 16) : `${b.startDate}T10:00`);
    setJobEtaEnd(j?.etaEnd ? j.etaEnd.slice(0, 16) : `${b.startDate}T12:00`);
    setJobReceiverName(j?.receiverName || b.customer.fullName);
    setJobReceiverPhone(j?.receiverPhone || b.customer.phone);
    setJobNotes(
      j?.deliveryNotes || (b.deliveryLocationName ? `Delivery to: ${b.deliveryLocationName}` : b.deliveryAddress),
    );
    setJobStatus(j?.status || 'SCHEDULED');
  };

  const handleSaveDeliveryJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliveryJob) return;
    setJobSubmitting(true);
    try {
      const payload = {
        driverName: jobDriverName,
        driverPhone: jobDriverPhone,
        vehicleNumber: jobVehicleNumber,
        scheduledFor: jobScheduledFor ? new Date(jobScheduledFor).toISOString() : undefined,
        etaStart: jobEtaStart ? new Date(jobEtaStart).toISOString() : undefined,
        etaEnd: jobEtaEnd ? new Date(jobEtaEnd).toISOString() : undefined,
        receiverName: jobReceiverName,
        receiverPhone: jobReceiverPhone,
        notes: jobNotes,
        status: jobStatus,
      };

      if (selectedDeliveryJob.job?.id) {
        await api.updateDeliveryJob(selectedDeliveryJob.job.id, payload);
      } else {
        await api.saveDeliveryJob(selectedDeliveryJob.booking.id, payload);
      }
      await loadFulfillment();
      setSelectedDeliveryJob(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save delivery job');
    } finally {
      setJobSubmitting(false);
    }
  };

  const handleQuickUpdateDeliveryStatus = async (jobId: number, newStatus: FulfillmentJobStatus) => {
    try {
      await api.updateDeliveryJob(jobId, { status: newStatus });
      await loadFulfillment();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const openScheduleReturn = (item: ReturnPickupJob) => {
    setSelectedReturnJob(item);
    setPickupDriverName(item.driverName || '');
    setPickupDriverPhone(item.driverPhone || '');
    setPickupVehicleNumber(item.vehicleNumber || '');
    setPickupScheduledFor(item.scheduledFor ? item.scheduledFor.slice(0, 16) : `${TODAY}T14:00`);
    setPickupNotes(item.pickupNotes || '');
    setPickupStatus(item.status || 'SCHEDULED');
  };

  const handleSaveReturnJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturnJob) return;
    setPickupSubmitting(true);
    try {
      const payload = {
        driverName: pickupDriverName,
        driverPhone: pickupDriverPhone,
        vehicleNumber: pickupVehicleNumber,
        scheduledFor: pickupScheduledFor ? new Date(pickupScheduledFor).toISOString() : undefined,
        notes: pickupNotes,
        status: pickupStatus,
      };
      await api.updateReturnPickupJob(selectedReturnJob.id, payload);
      await loadFulfillment();
      setSelectedReturnJob(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save return pickup job');
    } finally {
      setPickupSubmitting(false);
    }
  };

  const handleQuickUpdateReturnStatus = async (jobId: number, newStatus: FulfillmentJobStatus) => {
    try {
      await api.updateReturnPickupJob(jobId, { status: newStatus });
      await loadFulfillment();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  // Handover form state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [driverName, setDriverName] = useState<string>('');
  const [fuelLevel, setFuelLevel] = useState<string>('');
  const [engineHoursOut, setEngineHoursOut] = useState<number>(0);
  const [conditionNotes, setConditionNotes] = useState<string>('');
  const [checkEngine, setCheckEngine] = useState(true);
  const [checkAccessories, setCheckAccessories] = useState(true);
  const [checkSignature, setCheckSignature] = useState(true);

  const [issuedChallan, setIssuedChallan] = useState<DispatchRecord | null>(null);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'error' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'error',
  });

  const openHandoverPanel = (b: Booking) => {
    setSelectedBooking(b);
    setIssuedChallan(null);
    setDriverName('');
    setFuelLevel('');
    setEngineHoursOut(b.asset.engineHours || 0);
    setConditionNotes('');
    setCheckEngine(true);
    setCheckAccessories(true);
    setCheckSignature(true);
  };

  const closePanel = () => {
    setSelectedBooking(null);
    setIssuedChallan(null);
  };

  const totalCollected = (selectedBooking?.advancePaid || 0) + (selectedBooking?.depositPaid || 0);
  const requiredInitial = (selectedBooking?.depositAmount || 0) + (selectedBooking?.baseRent || 0);
  const isZeroCreditPassed = totalCollected >= requiredInitial;

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    if (!isZeroCreditPassed) {
      setErrorModal({
        isOpen: true,
        title: 'Payment Required Before Handover (नो उधारी)',
        message: `Total payment required is ${formatINR(requiredInitial)}, but only ${formatINR(totalCollected)} has been received so far. Please collect remaining balance first before releasing machine.`,
        variant: 'warning',
      });
      return;
    }

    try {
      const challan = await api.executeDispatch({
        bookingId: selectedBooking.id,
        driverName,
        fuelLevel,
        engineHoursOut,
        conditionNotes,
      });

      // Automatically trigger WhatsApp notification via backend bot dispatcher
      try {
        await api.sendDispatchWhatsAppNotification(selectedBooking.id);
      } catch (err) {
        console.warn('WhatsApp dispatch notification call:', err);
      }

      setIssuedChallan(challan);
    } catch (err: any) {
      setErrorModal({
        isOpen: true,
        title: 'Dispatch Failed',
        message: err.message || 'Dispatch could not be executed. Please check booking status.',
        variant: 'error',
      });
    }
  };

  // Overdue flag: startDate is before today
  const isOverdue = (b: Booking) => b.startDate < TODAY;

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2
            className={cn(
              'text-lg sm:text-xl font-black flex items-center gap-2',
              isDaylight ? 'text-slate-950' : 'text-white',
            )}
          >
            <Send className={cn('h-5 w-5', isDaylight ? 'text-amber-700' : 'text-slate-400')} />
            Send Machine to Customer (मशीन भेजना व डिलीवरी)
          </h2>
          <p className={cn('text-[11px] mt-0.5', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
            Driver details, delivery address, time, and handing over machine to customer (ड्राइवर, डिलीवरी और मशीन
            सुपुर्दगी)
          </p>
        </div>
      </div>

      {/* Sub Tabs Switcher */}
      <div
        className={cn(
          'flex items-center gap-1.5 p-1 rounded-xl border flex-shrink-0',
          isDaylight ? 'border-slate-200 bg-slate-100' : 'border-slate-800 bg-slate-900/60',
        )}
      >
        <button
          onClick={() => setActiveTab('deliveries')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
            activeTab === 'deliveries'
              ? isDaylight
                ? 'bg-white text-slate-950 shadow-xs'
                : 'bg-slate-800 text-white shadow-xs'
              : isDaylight
                ? 'text-slate-600 hover:text-slate-950'
                : 'text-slate-400 hover:text-white',
          )}
        >
          <Truck className="h-3.5 w-3.5 text-amber-500" />
          <span>Machines to Send (भेजने वाली मशीनें)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
            {combinedDeliveries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
            activeTab === 'returns'
              ? isDaylight
                ? 'bg-white text-slate-950 shadow-xs'
                : 'bg-slate-800 text-white shadow-xs'
              : isDaylight
                ? 'text-slate-600 hover:text-slate-950'
                : 'text-slate-400 hover:text-white',
          )}
        >
          <RotateCcw className="h-3.5 w-3.5 text-purple-500" />
          <span>Pickup from Field (खेत से वापस लाने वाली)</span>
          {combinedReturns.length > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500 text-white animate-pulse">
              {combinedReturns.length}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500">
              0
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('handover')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
            activeTab === 'handover'
              ? isDaylight
                ? 'bg-white text-slate-950 shadow-xs'
                : 'bg-slate-800 text-white shadow-xs'
              : isDaylight
                ? 'text-slate-600 hover:text-slate-950'
                : 'text-slate-400 hover:text-white',
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>Yard Handover (यार्ड से मशीन देना)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500">
            {pendingHandovers.length}
          </span>
        </button>
      </div>

      {/* Filters */}
      <div
        className={cn(
          'flex-shrink-0 p-2.5 rounded-xl border transition-colors',
          isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40',
        )}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Calendar className={cn('h-3 w-3', isDaylight ? 'text-amber-700' : 'text-amber-400')} />
            <span className={cn('text-[11px] font-bold', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
              Today:{' '}
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedStateId('ALL');
              setSelectedCityId('ALL');
              setSelectedHubId('ALL');
            }}
            className={cn(
              'text-[11px] font-bold flex items-center gap-1 cursor-pointer',
              isDaylight ? 'text-amber-800 hover:text-amber-950' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <SearchSelect
            options={[
              { value: 'ALL', label: 'All States' },
              ...states.map((s) => ({ value: String(s.id), label: s.name })),
            ]}
            value={selectedStateId}
            onChange={(v) => {
              setSelectedStateId(String(v || 'ALL'));
              setSelectedCityId('ALL');
              setSelectedHubId('ALL');
            }}
            placeholder="All States"
            isClearable={false}
          />
          <SearchSelect
            options={
              selectedStateId !== 'ALL' && availableCities.length === 0
                ? []
                : [
                    { value: 'ALL', label: 'All Cities' },
                    ...availableCities.map((c) => ({ value: String(c.id), label: c.name })),
                  ]
            }
            value={selectedCityId}
            onChange={(v) => {
              setSelectedCityId(String(v || 'ALL'));
              setSelectedHubId('ALL');
            }}
            placeholder={
              selectedStateId !== 'ALL' && availableCities.length === 0 ? 'No cities in this State' : 'All Cities'
            }
            isDisabled={selectedStateId !== 'ALL' && availableCities.length === 0}
            isClearable={false}
          />
          <SearchSelect
            options={
              (selectedCityId !== 'ALL' && availableHubs.length === 0) ||
              (selectedStateId !== 'ALL' && availableCities.length === 0)
                ? []
                : [
                    { value: 'ALL', label: 'All Hubs' },
                    ...availableHubs.map((h) => ({ value: String(h.id), label: h.name })),
                  ]
            }
            value={selectedHubId}
            onChange={(v) => setSelectedHubId(String(v || 'ALL'))}
            placeholder={
              selectedStateId !== 'ALL' && availableCities.length === 0
                ? 'No cities in this State'
                : selectedCityId !== 'ALL' && availableHubs.length === 0
                  ? 'No hubs in this City'
                  : 'All Hubs'
            }
            isDisabled={
              (selectedCityId !== 'ALL' && availableHubs.length === 0) ||
              (selectedStateId !== 'ALL' && availableCities.length === 0)
            }
            isClearable={false}
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. DELIVERY JOBS & OUTBOUND SCHEDULE TAB */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'deliveries' && (
        <div
          className={cn(
            'flex-1 min-h-0 rounded-2xl border overflow-hidden flex flex-col',
            isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40',
          )}
        >
          <div
            className={cn(
              'px-3.5 py-2.5 border-b flex items-center justify-between flex-shrink-0',
              isDaylight ? 'border-slate-200' : 'border-slate-800/60',
            )}
          >
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-500" />
              <div>
                <h3 className={cn('font-black text-xs sm:text-sm', isDaylight ? 'text-slate-950' : 'text-white')}>
                  Active Delivery Jobs & Field Routes ({combinedDeliveries.length})
                </h3>
                <p className="text-[10px] text-slate-500">
                  Assign drivers, vehicles, and ETA windows for confirmed farmer bookings.
                </p>
              </div>
            </div>
            <button
              onClick={loadFulfillment}
              disabled={deliveryLoading}
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className={cn('h-3 w-3', deliveryLoading && 'animate-spin')} /> Refresh
            </button>
          </div>

          {combinedDeliveries.length === 0 ? (
            <div className="flex-1 min-h-0 p-8 text-center flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mx-auto" />
              <p className={cn('text-xs font-bold', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                No Deliveries Scheduled
              </p>
              <p className="text-[11px] text-slate-500">
                When new bookings are confirmed, they appear here for delivery vehicle and driver assignment.
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead
                  className={cn(
                    'sticky top-0 z-10 border-b text-[11px] font-black uppercase tracking-wider',
                    isDaylight
                      ? 'border-slate-300 bg-slate-100 text-slate-800'
                      : 'border-slate-800 bg-slate-950 text-slate-300',
                  )}
                >
                  <tr>
                    <th className="py-3 px-4">Booking / Machine</th>
                    <th className="py-3 px-4">Destination & Farm Local Name</th>
                    <th className="py-3 px-4">Receiver Contact</th>
                    <th className="py-3 px-4">Driver & Vehicle</th>
                    <th className="py-3 px-4">Scheduled Slot / ETA</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={cn('divide-y', isDaylight ? 'divide-slate-100' : 'divide-slate-800/50')}>
                  {combinedDeliveries.map(({ job, booking }) => {
                    const status = job?.status || 'SCHEDULED';
                    const isDelivered = status === 'COMPLETED' || booking.status === 'ON_RENT';
                    const isOutForDelivery = status === 'OUT_FOR_DELIVERY';

                    return (
                      <tr
                        key={booking.id}
                        className={cn('transition-colors', isDaylight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20')}
                      >
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-amber-700 dark:text-amber-400">
                            {booking.bookingNumber}
                          </div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {booking.asset.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">{booking.asset.assetTag}</div>
                        </td>

                        <td className="py-3 px-4 max-w-[220px]">
                          {booking.deliveryLocationName ? (
                            <div className="font-black text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{booking.deliveryLocationName}</span>
                            </div>
                          ) : (
                            <div className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate">
                              {booking.deliveryAddress}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">{booking.deliveryAddress}</div>
                          {job?.deliveryNotes && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 italic truncate mt-0.5">
                              Note: {job.deliveryNotes}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {job?.receiverName || booking.customer.fullName}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {job?.receiverPhone || booking.customer.phone}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {job?.driverName ? (
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{job.driverName}</div>
                              <div className="font-mono text-[10px] text-slate-500">
                                {job.driverPhone || '—'} · {job.vehicleNumber || 'No vehicle'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold italic">
                              Unassigned Driver
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {job?.scheduledFor ? (
                            <div className="font-mono text-xs">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {formatDate(job.scheduledFor)}
                              </div>
                              {job.etaStart && (
                                <div className="text-[10px] text-slate-500">
                                  ETA:{' '}
                                  {new Date(job.etaStart).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                  {job.etaEnd
                                    ? ` - ${new Date(job.etaEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                    : ''}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-slate-500">{booking.startDate}</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border',
                              isDelivered
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/50'
                                : isOutForDelivery
                                  ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-700/50'
                                  : 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700/50',
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                isOutForDelivery
                                  ? 'bg-indigo-500 animate-pulse'
                                  : isDelivered
                                    ? 'bg-emerald-500'
                                    : 'bg-sky-500',
                              )}
                            />
                            {isDelivered ? 'DELIVERED' : isOutForDelivery ? 'OUT FOR DELIVERY' : 'SCHEDULED'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => openScheduleDelivery({ job, booking })}
                              className="px-2.5 py-1.5 rounded-lg border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              {job?.driverName ? 'Edit Driver/ETA' : 'Assign Driver'}
                            </button>

                            {job?.id && !isDelivered && !isOutForDelivery && (
                              <button
                                onClick={() => handleQuickUpdateDeliveryStatus(job.id, 'OUT_FOR_DELIVERY')}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <Send className="h-3 w-3" />
                                Out For Delivery
                              </button>
                            )}

                            {job?.id && isOutForDelivery && (
                              <button
                                onClick={() => handleQuickUpdateDeliveryStatus(job.id, 'COMPLETED')}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <Check className="h-3 w-3" />
                                Mark Delivered
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. RETURN PICKUP JOBS TAB */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'returns' && (
        <div
          className={cn(
            'flex-1 min-h-0 rounded-2xl border overflow-hidden flex flex-col',
            isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40',
          )}
        >
          <div
            className={cn(
              'px-3.5 py-2.5 border-b flex items-center justify-between flex-shrink-0',
              isDaylight ? 'border-slate-200' : 'border-slate-800/60',
            )}
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-purple-500" />
              <div>
                <h3 className={cn('font-black text-xs sm:text-sm', isDaylight ? 'text-slate-950' : 'text-white')}>
                  Return Pickup Requests & Yard Collection ({combinedReturns.length})
                </h3>
                <p className="text-[10px] text-slate-500">
                  Pickups scheduled when farmers request return from their fields.
                </p>
              </div>
            </div>
            <button
              onClick={loadFulfillment}
              disabled={returnsLoading}
              className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className={cn('h-3 w-3', returnsLoading && 'animate-spin')} /> Refresh
            </button>
          </div>

          {combinedReturns.length === 0 ? (
            <div className="flex-1 min-h-0 p-8 text-center flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mx-auto" />
              <p className={cn('text-xs font-bold', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                No Return Pickups Pending
              </p>
              <p className="text-[11px] text-slate-500">
                When a farmer requests machine return or collection, pickup tasks appear here for driver assignment.
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead
                  className={cn(
                    'sticky top-0 z-10 border-b text-[11px] font-black uppercase tracking-wider',
                    isDaylight
                      ? 'border-slate-300 bg-slate-100 text-slate-800'
                      : 'border-slate-800 bg-slate-950 text-slate-300',
                  )}
                >
                  <tr>
                    <th className="py-3 px-4">Booking / Machine</th>
                    <th className="py-3 px-4">Farmer & Farm Pickup Point</th>
                    <th className="py-3 px-4">Pickup Driver & Vehicle</th>
                    <th className="py-3 px-4">Scheduled Pickup Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={cn('divide-y', isDaylight ? 'divide-slate-100' : 'divide-slate-800/50')}>
                  {combinedReturns.map((item) => {
                    const status = item.status;
                    const isCollected = status === 'COMPLETED';
                    const isInTransit = status === 'IN_TRANSIT';

                    return (
                      <tr
                        key={item.id}
                        className={cn('transition-colors', isDaylight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20')}
                      >
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-amber-700 dark:text-amber-400">
                            {item.booking.bookingNumber}
                          </div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {item.booking.asset.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">{item.booking.asset.assetTag}</div>
                        </td>

                        <td className="py-3 px-4 max-w-[220px]">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {item.booking.customer.fullName}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">{item.booking.customer.phone}</div>
                          {item.booking.deliveryLocationName ? (
                            <div className="font-black text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{item.booking.deliveryLocationName}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                              {item.booking.deliveryAddress}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {item.driverName ? (
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{item.driverName}</div>
                              <div className="font-mono text-[10px] text-slate-500">
                                {item.driverPhone || '—'} · {item.vehicleNumber || 'No vehicle'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold italic">
                              Unassigned Pickup Driver
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-xs">
                          {item.scheduledFor ? formatDate(item.scheduledFor) : 'Immediate'}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border',
                              isCollected
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/50'
                                : isInTransit
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50'
                                  : 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700/50',
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                isInTransit
                                  ? 'bg-amber-500 animate-pulse'
                                  : isCollected
                                    ? 'bg-emerald-500'
                                    : 'bg-purple-500',
                              )}
                            />
                            {item.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => openScheduleReturn(item)}
                              className="px-2.5 py-1.5 rounded-lg border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              {item.driverName ? 'Edit Driver' : 'Assign Driver'}
                            </button>

                            {!isCollected && !isInTransit && (
                              <button
                                onClick={() => handleQuickUpdateReturnStatus(item.id, 'IN_TRANSIT')}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                Driver In Transit
                              </button>
                            )}

                            {!isCollected && (
                              <button
                                onClick={() => handleQuickUpdateReturnStatus(item.id, 'COMPLETED')}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <Check className="h-3 w-3" />
                                Collected (At Yard)
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. YARD HANDOVER DESK TAB */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'handover' && (
        <div
          className={cn(
            'flex-1 min-h-0 rounded-2xl border overflow-hidden flex flex-col',
            isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40',
          )}
        >
          <div
            className={cn(
              'px-3.5 py-2 border-b flex items-center justify-between flex-shrink-0',
              isDaylight ? 'border-slate-200' : 'border-slate-800/60',
            )}
          >
            <div className="flex items-center gap-2">
              <Truck className={cn('h-4 w-4', isDaylight ? 'text-amber-700' : 'text-amber-400')} />
              <h3 className={cn('font-black text-xs sm:text-sm', isDaylight ? 'text-slate-950' : 'text-white')}>
                Pending Handovers — Today ({pendingHandovers.length})
              </h3>
            </div>
            {pendingHandovers.some(isOverdue) && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                {pendingHandovers.filter(isOverdue).length} Overdue
              </span>
            )}
          </div>

          {pendingHandovers.length === 0 ? (
            <div className="flex-1 min-h-0 p-8 text-center flex flex-col items-center justify-center space-y-1.5">
              <CheckCircle2 className="h-7 w-7 mx-auto opacity-25 text-emerald-500" />
              <p className={cn('text-xs font-bold', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
                All handovers complete for today
              </p>
              <p className="text-[11px] text-slate-500">
                No bookings with pending dispatch for today's date. New bookings created for today will appear here.
              </p>
            </div>
          ) : (
            <div onScroll={handleScroll} className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead
                  className={cn(
                    'sticky top-0 z-10 border-b text-[11px] font-black uppercase tracking-wider',
                    isDaylight
                      ? 'border-slate-300 bg-slate-100 text-slate-800 shadow-xs'
                      : 'border-slate-800 bg-slate-950 text-slate-300 shadow-xs',
                  )}
                >
                  <tr>
                    <th className="py-3 px-4">Booking / Customer</th>
                    <th className="py-3 px-4">Machine</th>
                    <th className="py-3 px-4">Hub</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={cn('divide-y', isDaylight ? 'divide-slate-100' : 'divide-slate-800/50')}>
                  {visibleHandovers.map((b) => {
                    const overdue = isOverdue(b);
                    const paid = (b.advancePaid || 0) + (b.depositPaid || 0);
                    const required = (b.depositAmount || 0) + (b.baseRent || 0);
                    const paymentOk = paid >= required;
                    return (
                      <tr
                        key={b.id}
                        className={cn(
                          'transition-colors',
                          overdue
                            ? isDaylight
                              ? 'bg-rose-50 hover:bg-rose-100/60'
                              : 'bg-rose-950/10 hover:bg-rose-950/20'
                            : isDaylight
                              ? 'hover:bg-slate-50'
                              : 'hover:bg-slate-800/30',
                        )}
                      >
                        {/* Booking / Customer */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {overdue && <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />}
                            <div>
                              <div
                                className={cn(
                                  'font-mono font-bold text-[11px]',
                                  isDaylight ? 'text-amber-700' : 'text-amber-400',
                                )}
                              >
                                {b.bookingNumber}
                              </div>
                              <div
                                className={cn('font-bold text-sm mt-0.5', isDaylight ? 'text-slate-950' : 'text-white')}
                              >
                                {b.customer.fullName}
                              </div>
                              <div className="text-[10px] text-slate-500">{b.customer.phone}</div>
                            </div>
                          </div>
                        </td>

                        {/* Machine */}
                        <td className="py-3.5 px-4">
                          <div className={cn('font-bold', isDaylight ? 'text-slate-900' : 'text-slate-200')}>
                            {b.asset.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500 mt-0.5">{b.asset.assetTag}</div>
                        </td>

                        {/* Hub */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span className={cn('font-medium', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                              {b.asset.hubName || '—'}
                            </span>
                          </div>
                        </td>

                        {/* Start Date */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1">
                            <Clock className={cn('h-3 w-3 shrink-0', overdue ? 'text-rose-500' : 'text-slate-400')} />
                            <span
                              className={cn(
                                'font-mono text-[11px]',
                                overdue ? 'text-rose-500 font-bold' : isDaylight ? 'text-slate-700' : 'text-slate-300',
                              )}
                            >
                              {b.startDate}
                            </span>
                          </div>
                          {overdue && <div className="text-[10px] text-rose-500 font-bold mt-0.5">OVERDUE</div>}
                        </td>

                        {/* Payment status */}
                        <td className="py-3.5 px-4">
                          {paymentOk ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border',
                                isDaylight
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-emerald-900/30 text-emerald-300 border-emerald-800/50',
                              )}
                            >
                              <ShieldCheck className="h-3 w-3" /> Cleared
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border',
                                isDaylight
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-rose-900/30 text-rose-300 border-rose-800/50',
                              )}
                            >
                              <ShieldAlert className="h-3 w-3" /> Pending
                            </span>
                          )}
                          <div className={cn('text-[10px] mt-0.5', isDaylight ? 'text-slate-500' : 'text-slate-500')}>
                            {formatINR(paid)} / {formatINR(required)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <StatusBadge status={b.status} size="sm" />
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsAppModal(b)}
                              data-tooltip="Circulate Dispatch Update on WhatsApp"
                              data-tooltip-pos="left"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            <button
                              onClick={() => {
                                if (!paymentOk) {
                                  setPaymentModalBooking(b);
                                } else {
                                  openHandoverPanel(b);
                                }
                              }}
                              className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                                paymentOk
                                  ? isDaylight
                                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                                    : 'bg-amber-600/80 hover:bg-amber-500 text-slate-950 border border-amber-500/50'
                                  : isDaylight
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                                    : 'bg-rose-700 hover:bg-rose-600 text-white',
                              )}
                            >
                              {!paymentOk ? <ShieldAlert className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                              <span>{paymentOk ? 'Handover' : 'Collect & Handover'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Infinite Scroll Footer */}
          {pendingHandovers.length > 0 && (
            <InfiniteScrollFooter
              loadedCount={visibleHandovers.length}
              totalCount={pendingHandovers.length}
              onLoadMore={handleLoadMore}
              itemName="pending handovers"
            />
          )}
        </div>
      )}

      {/* Schedule / Assign Delivery Job Modal */}
      {selectedDeliveryJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-3 overflow-y-auto">
          <div
            className={cn(
              'w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-2xl',
              isDaylight ? 'bg-white border-slate-200 text-slate-950' : 'bg-[#242424] border-amber-500/30 text-white',
            )}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-black">Schedule Delivery Job & Assign Driver</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeliveryJob(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border p-3 text-xs space-y-1.5 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Booking:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {selectedDeliveryJob.booking.bookingNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Machine:</span>
                <span className="font-bold">
                  {selectedDeliveryJob.booking.asset.name} ({selectedDeliveryJob.booking.asset.assetTag})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Destination Farm:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedDeliveryJob.booking.deliveryLocationName || selectedDeliveryJob.booking.deliveryAddress}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveDeliveryJob} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold mb-1">Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={jobDriverName}
                    onChange={(e) => setJobDriverName(e.target.value)}
                    className="w-full rounded-xl border p-2 text-xs font-bold focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Driver Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={jobDriverPhone}
                    onChange={(e) => setJobDriverPhone(e.target.value)}
                    className="w-full rounded-xl border p-2 text-xs font-bold focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold mb-1">Vehicle / Carrier No.</label>
                  <input
                    type="text"
                    placeholder="e.g. UP-32-AB-1234"
                    value={jobVehicleNumber}
                    onChange={(e) => setJobVehicleNumber(e.target.value)}
                    className="w-full rounded-xl border p-2 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Delivery Status</label>
                  <select
                    value={jobStatus}
                    onChange={(e) => setJobStatus(e.target.value as FulfillmentJobStatus)}
                    className="w-full rounded-xl border p-2 text-xs font-bold focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                  >
                    <option value="SCHEDULED">SCHEDULED (Planned)</option>
                    <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY (On Road)</option>
                    <option value="COMPLETED">COMPLETED (Delivered to Farm)</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold mb-1">Scheduled Date/Time</label>
                  <input
                    type="datetime-local"
                    value={jobScheduledFor}
                    onChange={(e) => setJobScheduledFor(e.target.value)}
                    className="w-full rounded-xl border p-1.5 text-[11px] focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">ETA Window Start</label>
                  <input
                    type="datetime-local"
                    value={jobEtaStart}
                    onChange={(e) => setJobEtaStart(e.target.value)}
                    className="w-full rounded-xl border p-1.5 text-[11px] focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">ETA Window End</label>
                  <input
                    type="datetime-local"
                    value={jobEtaEnd}
                    onChange={(e) => setJobEtaEnd(e.target.value)}
                    className="w-full rounded-xl border p-1.5 text-[11px] focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold mb-1">Field Receiver Name</label>
                  <input
                    type="text"
                    value={jobReceiverName}
                    onChange={(e) => setJobReceiverName(e.target.value)}
                    className="w-full rounded-xl border p-2 text-xs focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Receiver Phone</label>
                  <input
                    type="tel"
                    value={jobReceiverPhone}
                    onChange={(e) => setJobReceiverPhone(e.target.value)}
                    className="w-full rounded-xl border p-2 text-xs focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Field Access & Route Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approach via canal bridge; tractor trailer access confirmed"
                  value={jobNotes}
                  onChange={(e) => setJobNotes(e.target.value)}
                  className="w-full rounded-xl border p-2 text-xs focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedDeliveryJob(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={jobSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Truck className="h-4 w-4" />
                  {jobSubmitting ? 'Saving...' : 'Save Delivery Job & Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Return Pickup Job Modal */}
      {selectedReturnJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-3 overflow-y-auto">
          <div
            className={cn(
              'w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-2xl',
              isDaylight ? 'bg-white border-slate-200 text-slate-950' : 'bg-[#242424] border-purple-500/30 text-white',
            )}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-purple-500" />
                <h3 className="text-base font-black">Schedule Return Pickup Driver</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturnJob(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border p-3 text-xs space-y-1.5 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Booking:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {selectedReturnJob.booking?.bookingNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Farmer:</span>
                <span className="font-bold">
                  {selectedReturnJob.booking?.customer?.fullName} ({selectedReturnJob.booking?.customer?.phone})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Pickup Point:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {selectedReturnJob.booking?.deliveryLocationName || selectedReturnJob.booking?.deliveryAddress}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveReturnJob} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold mb-1">Pickup Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shyam Lal"
                    value={pickupDriverName}
                    onChange={(e) => setPickupDriverName(e.target.value)}
                    className="w-full rounded-xl border p-2 text-xs font-bold focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Driver Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={pickupDriverPhone}
                    onChange={(e) => setPickupDriverPhone(e.target.value)}
                    className="w-full rounded-xl border p-2 text-xs font-bold focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold mb-1">Vehicle / Carrier No.</label>
                  <input
                    type="text"
                    placeholder="e.g. UP-32-CD-5678"
                    value={pickupVehicleNumber}
                    onChange={(e) => setPickupVehicleNumber(e.target.value)}
                    className="w-full rounded-xl border p-2 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Pickup Status</label>
                  <select
                    value={pickupStatus}
                    onChange={(e) => setPickupStatus(e.target.value as FulfillmentJobStatus)}
                    className="w-full rounded-xl border p-2 text-xs font-bold focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                  >
                    <option value="REQUESTED">REQUESTED (Farmer Waiting)</option>
                    <option value="SCHEDULED">SCHEDULED (Driver Assigned)</option>
                    <option value="IN_TRANSIT">IN_TRANSIT (Driver En Route)</option>
                    <option value="COMPLETED">COMPLETED (Collected & In Yard)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Scheduled Pickup Date/Time</label>
                <input
                  type="datetime-local"
                  value={pickupScheduledFor}
                  onChange={(e) => setPickupScheduledFor(e.target.value)}
                  className="w-full rounded-xl border p-2 text-xs focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Pickup Field Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Collect from field gate; farmer available at tubewell"
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  className="w-full rounded-xl border p-2 text-xs focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedReturnJob(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pickupSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-md cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  {pickupSubmitting ? 'Saving...' : 'Save Return Pickup Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Handover Panel Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-3 bg-black/55 backdrop-blur-md overflow-y-auto">
          <div
            className={cn(
              'w-full max-w-4xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border shadow-2xl my-2',
              isDaylight ? 'bg-white border-slate-200' : 'bg-[#242424] border-slate-800',
            )}
          >
            {/* Success state */}
            {issuedChallan ? (
              <div className="p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={cn('font-black text-base', isDaylight ? 'text-slate-950' : 'text-white')}>
                      Challan {issuedChallan.challanNumber} Issued!
                    </h3>
                    <p className={cn('text-xs', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
                      Machine <strong className="text-amber-500">{issuedChallan.assetTag}</strong> successfully handed
                      over · Status → <strong className="text-emerald-400">ON_RENT</strong>
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    'rounded-xl border p-4 text-xs grid grid-cols-2 gap-3',
                    isDaylight ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-800/50 bg-emerald-900/20',
                  )}
                >
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Challan #</div>
                    <div
                      className={cn('font-mono font-bold mt-0.5', isDaylight ? 'text-slate-900' : 'text-emerald-400')}
                    >
                      {issuedChallan.challanNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Driver</div>
                    <div className={cn('font-medium mt-0.5', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                      {issuedChallan.driverName}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Fuel Out</div>
                    <div className={cn('font-medium mt-0.5', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                      {issuedChallan.fuelLevel}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Engine Hours Out</div>
                    <div className={cn('font-mono font-bold mt-0.5', isDaylight ? 'text-slate-900' : 'text-slate-300')}>
                      {issuedChallan.engineHoursOut} hrs
                    </div>
                  </div>
                </div>
                {/* WhatsApp status banner */}
                <div
                  className={cn(
                    'rounded-xl border p-3 flex items-start gap-2.5 text-xs',
                    isDaylight
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                      : 'border-emerald-800/40 bg-emerald-950/30 text-emerald-300',
                  )}
                >
                  <MessageSquare className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs">WhatsApp Dispatch Alert Dispatched</div>
                    <div className="text-[11px] opacity-85">
                      Challan handover details & live trip tracking prompt sent to{' '}
                      <strong>+91 {selectedBooking.customer.phone}</strong>.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = getDispatchWhatsAppMessage(selectedBooking, issuedChallan);
                      openWhatsAppCirculation(selectedBooking.customer.phone, msg);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Open in WhatsApp</span>
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </button>

                  <button
                    type="button"
                    onClick={() => printDispatchChallanPdf({ booking: selectedBooking, challan: issuedChallan })}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border font-bold text-xs transition-colors cursor-pointer',
                      isDaylight
                        ? 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100'
                        : 'border-amber-700/50 text-amber-300 bg-amber-900/20 hover:bg-amber-900/30',
                    )}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Challan (DC)</span>
                  </button>

                  <button
                    type="button"
                    onClick={closePanel}
                    className={cn(
                      'py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm',
                      isDaylight
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black',
                    )}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Panel Header */}
                <div
                  className={cn(
                    'flex items-center justify-between px-4 py-3 border-b',
                    isDaylight ? 'border-slate-100' : 'border-slate-800',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'p-2 rounded-xl',
                        isDaylight ? 'bg-amber-100 text-amber-700' : 'bg-amber-900/40 text-amber-400',
                      )}
                    >
                      <Send className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className={cn('font-black text-sm', isDaylight ? 'text-slate-950' : 'text-white')}>
                        Yard Handover Checklist
                      </h3>
                      <p className={cn('text-[11px] font-mono', isDaylight ? 'text-amber-700' : 'text-amber-400')}>
                        {selectedBooking.bookingNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closePanel}
                    className={cn(
                      'p-1.5 rounded-lg border cursor-pointer transition-colors',
                      isDaylight
                        ? 'border-slate-200 text-slate-400 hover:bg-slate-100'
                        : 'border-slate-700 text-slate-500 hover:bg-slate-800',
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Booking summary strip */}
                <div
                  className={cn(
                    'px-4 py-2 border-b text-xs',
                    isDaylight
                      ? 'bg-slate-50 border-slate-100 text-slate-700'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400',
                  )}
                >
                  <span className="font-bold">{selectedBooking.customer.fullName}</span>
                  {' · '}
                  <span>{selectedBooking.asset.name}</span>
                  {' · '}
                  <span className="font-mono">{selectedBooking.asset.assetTag}</span>
                  {' · '}
                  <span>
                    To:{' '}
                    <strong className={isDaylight ? 'text-slate-800' : 'text-slate-200'}>
                      {selectedBooking.deliveryAddress}
                    </strong>
                  </span>
                </div>

                <form onSubmit={handleDispatch} className="p-4 sm:p-5 space-y-3.5">
                  {/* Zero-credit summary */}
                  <div
                    className={cn(
                      'rounded-xl border p-4 flex items-center justify-between',
                      isZeroCreditPassed
                        ? isDaylight
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-emerald-800/50 bg-emerald-900/20'
                        : isDaylight
                          ? 'border-rose-200 bg-rose-50'
                          : 'border-rose-800/50 bg-rose-900/20',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isZeroCreditPassed ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-rose-500" />
                      )}
                      <div>
                        <div
                          className={cn(
                            'text-xs font-black',
                            isZeroCreditPassed
                              ? isDaylight
                                ? 'text-emerald-800'
                                : 'text-emerald-300'
                              : isDaylight
                                ? 'text-rose-800'
                                : 'text-rose-300',
                          )}
                        >
                          {isZeroCreditPassed ? 'Zero-Credit Barrier: CLEARED' : 'Zero-Credit Barrier: BLOCKED'}
                        </div>
                        <div className={cn('text-[11px]', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
                          Collected {formatINR(totalCollected)} of required {formatINR(requiredInitial)}
                        </div>
                      </div>
                    </div>
                    {!isZeroCreditPassed && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentModalBooking(selectedBooking)}
                          className="text-[11px] font-black px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-sm transition-all"
                        >
                          ⚡ Collect Rental & Deposit Now →
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            closePanel();
                            onNavigateToPayment();
                          }}
                          className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                        >
                          Ledger
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Fuel level */}
                    <div>
                      <label
                        className={cn(
                          'block text-[11px] font-bold uppercase tracking-wide mb-1',
                          isDaylight ? 'text-slate-500' : 'text-slate-400',
                        )}
                      >
                        Fuel Level at Handover
                      </label>
                      <input
                        type="text"
                        value={fuelLevel}
                        onChange={(e) => setFuelLevel(e.target.value)}
                        placeholder="e.g. 100%, 75%"
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 text-xs focus:outline-none',
                          isDaylight
                            ? 'border-slate-300 bg-white text-slate-950 focus:border-amber-500'
                            : 'border-slate-700 bg-slate-950 text-white focus:border-amber-500',
                        )}
                      />
                    </div>

                    {/* Engine hours */}
                    <div>
                      <label
                        className={cn(
                          'block text-[11px] font-bold uppercase tracking-wide mb-1',
                          isDaylight ? 'text-slate-500' : 'text-slate-400',
                        )}
                      >
                        Engine / Operating Hours Out
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={engineHoursOut}
                        onChange={(e) => setEngineHoursOut(parseFloat(e.target.value))}
                        placeholder="Current engine meter hours"
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none',
                          isDaylight
                            ? 'border-slate-300 bg-white text-slate-950 focus:border-amber-500'
                            : 'border-slate-700 bg-slate-950 text-white focus:border-amber-500',
                        )}
                      />
                    </div>

                    {/* Driver */}
                    <div className="sm:col-span-2">
                      <label
                        className={cn(
                          'block text-[11px] font-bold uppercase tracking-wide mb-1',
                          isDaylight ? 'text-slate-500' : 'text-slate-400',
                        )}
                      >
                        Assigned Driver / Logistics Operator
                      </label>
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="Enter driver name or transport fleet"
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 text-xs focus:outline-none',
                          isDaylight
                            ? 'border-slate-300 bg-white text-slate-950 focus:border-amber-500'
                            : 'border-slate-700 bg-slate-950 text-white focus:border-amber-500',
                        )}
                      />
                    </div>

                    {/* Condition notes */}
                    <div className="sm:col-span-2">
                      <label
                        className={cn(
                          'block text-[11px] font-bold uppercase tracking-wide mb-1',
                          isDaylight ? 'text-slate-500' : 'text-slate-400',
                        )}
                      >
                        Condition Notes & Serial Confirmation
                      </label>
                      <textarea
                        rows={2}
                        value={conditionNotes}
                        onChange={(e) => setConditionNotes(e.target.value)}
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 text-xs focus:outline-none resize-none',
                          isDaylight
                            ? 'border-slate-300 bg-white text-slate-950 focus:border-amber-500'
                            : 'border-slate-700 bg-slate-950 text-white focus:border-amber-500',
                        )}
                      />
                    </div>
                  </div>

                  {/* Pre-dispatch checklist */}
                  <div
                    className={cn(
                      'rounded-xl border p-4 space-y-2.5',
                      isDaylight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/60',
                    )}
                  >
                    <h4
                      className={cn(
                        'text-[11px] font-black uppercase tracking-wider mb-3',
                        isDaylight ? 'text-slate-500' : 'text-slate-400',
                      )}
                    >
                      Pre-Dispatch Safety Checklist (SOP-005)
                    </h4>
                    {[
                      {
                        state: checkEngine,
                        set: setCheckEngine,
                        label: 'Engine Start, Idle & Leakage Test Verified (No oil/fuel leaks)',
                      },
                      {
                        state: checkAccessories,
                        set: setCheckAccessories,
                        label: `Mandatory Accessories Included: ${selectedBooking.asset.accessoriesIncluded || 'All tools checked'}`,
                      },
                      {
                        state: checkSignature,
                        set: setCheckSignature,
                        label: 'Customer ID & Delivery Acceptance Sign-off Acknowledged',
                      },
                    ].map(({ state, set, label }) => (
                      <label
                        key={label}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors',
                          state
                            ? isDaylight
                              ? 'border-emerald-200 bg-emerald-50/60'
                              : 'border-emerald-800/40 bg-emerald-900/10'
                            : isDaylight
                              ? 'border-slate-200'
                              : 'border-slate-800',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={state}
                          onChange={(e) => set(e.target.checked)}
                          className="accent-amber-500 h-4 w-4 mt-0.5 cursor-pointer shrink-0"
                        />
                        <span
                          className={cn('text-xs leading-relaxed', isDaylight ? 'text-slate-700' : 'text-slate-300')}
                        >
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={closePanel}
                      className={cn(
                        'flex-1 py-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors',
                        isDaylight
                          ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                          : 'border-slate-700 text-slate-300 hover:bg-slate-800',
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!isZeroCreditPassed}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-black cursor-pointer transition-colors',
                        isZeroCreditPassed
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50',
                      )}
                    >
                      <Send className="h-4 w-4" />
                      Execute Dispatch & Issue Challan
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error / Warning Modal */}
      <ConfirmationModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal((p) => ({ ...p, isOpen: false }))}
        variant={errorModal.variant}
        title={errorModal.title}
        message={errorModal.message}
      />

      {/* Collect Rental & Security Deposit Modal */}
      {paymentModalBooking && (
        <CollectPaymentModal
          isOpen={!!paymentModalBooking}
          booking={paymentModalBooking}
          onClose={() => setPaymentModalBooking(null)}
          onPaymentCollected={(updatedBooking) => {
            setPaymentModalBooking(null);
            openHandoverPanel(updatedBooking);
          }}
        />
      )}

      {/* WhatsApp Circulation Modal */}
      {whatsAppModalBooking && (
        <WhatsAppCirculationModal
          isOpen={!!whatsAppModalBooking}
          onClose={() => {
            setWhatsAppModalBooking(null);
            setWhatsAppModalDispatch(null);
          }}
          stageName="Yard Dispatch Handover"
          bookingNumber={whatsAppModalBooking.bookingNumber}
          recipientName={whatsAppModalBooking.customer.fullName}
          recipientPhone={whatsAppModalBooking.customer.phone}
          message={getDispatchWhatsAppMessage(
            whatsAppModalBooking,
            whatsAppModalDispatch || {
              id: whatsAppModalBooking.id,
              bookingId: whatsAppModalBooking.id,
              assetTag: whatsAppModalBooking.asset.assetTag,
              challanNumber: `DC-${new Date().getFullYear()}-${String(whatsAppModalBooking.id).padStart(4, '0')}`,
              fuelLevel: '',
              engineHoursOut: whatsAppModalBooking.asset.engineHours,
              accessoriesVerified: true,
              conditionNotes: '',
              driverName: '',
              customerSignatureConfirmed: true,
              dispatchTimestamp: new Date().toISOString(),
            },
          )}
          onPrintPdf={() =>
            printDispatchChallanPdf({
              booking: whatsAppModalBooking,
              challan: whatsAppModalDispatch || {
                id: whatsAppModalBooking.id,
                bookingId: whatsAppModalBooking.id,
                assetTag: whatsAppModalBooking.asset.assetTag,
                challanNumber: `DC-${new Date().getFullYear()}-${String(whatsAppModalBooking.id).padStart(4, '0')}`,
                fuelLevel: '',
                engineHoursOut: whatsAppModalBooking.asset.engineHours,
                accessoriesVerified: true,
                conditionNotes: '',
                driverName: '',
                customerSignatureConfirmed: true,
                dispatchTimestamp: new Date().toISOString(),
              },
            })
          }
          pdfButtonLabel="Print Challan (DC) PDF"
        />
      )}
    </div>
  );
};

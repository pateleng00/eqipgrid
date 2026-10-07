import React, { useState, useMemo } from 'react';
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
import { Booking, DispatchRecord } from '../../types';
import { cn } from '../../lib/utils';
import { printDispatchChallanPdf } from '../../services/voucherPdfService';
import { getDispatchWhatsAppMessage, openWhatsAppCirculation } from '../../services/whatsappCirculation';

interface DispatchYardViewProps {
  onNavigateToPayment: () => void;
}

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

  const [paymentModalBooking, setPaymentModalBooking] = useState<Booking | null>(null);
  const [whatsAppModalBooking, setWhatsAppModalBooking] = useState<Booking | null>(null);

  const availableCities = useMemo(() =>
    cities.filter((c) => selectedStateId === 'ALL' ? true : c.stateId === Number(selectedStateId)),
    [cities, selectedStateId]
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

  // Handover form state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [driverName, setDriverName] = useState<string>('Suraj Logistics (E-Rickshaw 3W)');
  const [fuelLevel, setFuelLevel] = useState<string>('100% (Full Tank)');
  const [engineHoursOut, setEngineHoursOut] = useState<number>(14.5);
  const [conditionNotes, setConditionNotes] = useState<string>('Clean machine, fresh oil, air filter blown clean');
  const [checkEngine, setCheckEngine] = useState(true);
  const [checkAccessories, setCheckAccessories] = useState(true);
  const [checkSignature, setCheckSignature] = useState(true);

  const [issuedChallan, setIssuedChallan] = useState<DispatchRecord | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string; variant: 'error' | 'warning' }>({
    isOpen: false, title: '', message: '', variant: 'error',
  });

  const openHandoverPanel = (b: Booking) => {
    setSelectedBooking(b);
    setIssuedChallan(null);
    setDriverName('Suraj Logistics (E-Rickshaw 3W)');
    setFuelLevel('100% (Full Tank)');
    setEngineHoursOut(14.5);
    setConditionNotes('Clean machine, fresh oil, air filter blown clean');
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
        title: 'Zero-Credit Barrier — Dispatch Blocked',
        message: `Required minimum collection is ${formatINR(requiredInitial)}, but only ${formatINR(totalCollected)} has been received. Record the payment first, then return to dispatch.`,
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
      setErrorModal({ isOpen: true, title: 'Dispatch Failed', message: err.message || 'Dispatch could not be executed. Please check booking status.', variant: 'error' });
    }
  };

  // Overdue flag: startDate is before today
  const isOverdue = (b: Booking) => b.startDate < TODAY;

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      {/* Header */}
      <div className="flex-shrink-0">
        <h2 className={cn('text-lg sm:text-xl font-black flex items-center gap-2', isDaylight ? 'text-slate-950' : 'text-white')}>
          <Send className={cn('h-5 w-5', isDaylight ? 'text-amber-700' : 'text-slate-400')} />
          Yard Dispatch & Handover
        </h2>
        <p className={cn('text-[11px] mt-0.5', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
          Showing today's pending handovers — select a booking to execute yard dispatch
        </p>
      </div>

      {/* Filters */}
      <div className={cn('flex-shrink-0 p-2.5 rounded-xl border transition-colors', isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40')}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Calendar className={cn('h-3 w-3', isDaylight ? 'text-amber-700' : 'text-amber-400')} />
            <span className={cn('text-[11px] font-bold', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
              Today: {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <button
            onClick={() => { setSelectedStateId('ALL'); setSelectedCityId('ALL'); setSelectedHubId('ALL'); }}
            className={cn('text-[11px] font-bold flex items-center gap-1 cursor-pointer', isDaylight ? 'text-amber-800 hover:text-amber-950' : 'text-slate-400 hover:text-slate-200')}
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <SearchSelect
            options={[{ value: 'ALL', label: 'All States' }, ...states.map((s) => ({ value: String(s.id), label: s.name }))]}
            value={selectedStateId}
            onChange={(v) => { setSelectedStateId(String(v || 'ALL')); setSelectedCityId('ALL'); setSelectedHubId('ALL'); }}
            placeholder="All States" isClearable={false}
          />
          <SearchSelect
            options={[{ value: 'ALL', label: 'All Cities' }, ...availableCities.map((c) => ({ value: String(c.id), label: c.name }))]}
            value={selectedCityId}
            onChange={(v) => { setSelectedCityId(String(v || 'ALL')); setSelectedHubId('ALL'); }}
            placeholder="All Cities" isClearable={false}
          />
          <SearchSelect
            options={[{ value: 'ALL', label: 'All Hubs' }, ...availableHubs.map((h) => ({ value: String(h.id), label: h.name }))]}
            value={selectedHubId}
            onChange={(v) => setSelectedHubId(String(v || 'ALL'))}
            placeholder="All Hubs" isClearable={false}
          />
        </div>
      </div>

      {/* Pending Handover Queue Table */}
      <div className={cn('flex-1 min-h-0 rounded-2xl border overflow-hidden flex flex-col', isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40')}>
        <div className={cn('px-3.5 py-2 border-b flex items-center justify-between flex-shrink-0', isDaylight ? 'border-slate-200' : 'border-slate-800/60')}>
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
          <div
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-x-auto overflow-y-auto"
          >
            <table className="w-full text-left text-xs">
              <thead className={cn('sticky top-0 z-10 border-b text-[11px] font-black uppercase tracking-wider', isDaylight ? 'border-slate-300 bg-slate-100 text-slate-800 shadow-xs' : 'border-slate-800 bg-slate-950 text-slate-300 shadow-xs')}>
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
                          ? isDaylight ? 'bg-rose-50 hover:bg-rose-100/60' : 'bg-rose-950/10 hover:bg-rose-950/20'
                          : isDaylight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/30'
                      )}
                    >
                      {/* Booking / Customer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {overdue && <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />}
                          <div>
                            <div className={cn('font-mono font-bold text-[11px]', isDaylight ? 'text-amber-700' : 'text-amber-400')}>{b.bookingNumber}</div>
                            <div className={cn('font-bold text-sm mt-0.5', isDaylight ? 'text-slate-950' : 'text-white')}>{b.customer.fullName}</div>
                            <div className="text-[10px] text-slate-500">{b.customer.phone}</div>
                          </div>
                        </div>
                      </td>

                      {/* Machine */}
                      <td className="py-3.5 px-4">
                        <div className={cn('font-bold', isDaylight ? 'text-slate-900' : 'text-slate-200')}>{b.asset.name}</div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">{b.asset.assetTag}</div>
                      </td>

                      {/* Hub */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className={cn('font-medium', isDaylight ? 'text-slate-700' : 'text-slate-300')}>{b.asset.hubName || '—'}</span>
                        </div>
                      </td>

                      {/* Start Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <Clock className={cn('h-3 w-3 shrink-0', overdue ? 'text-rose-500' : 'text-slate-400')} />
                          <span className={cn('font-mono text-[11px]', overdue ? 'text-rose-500 font-bold' : isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                            {b.startDate}
                          </span>
                        </div>
                        {overdue && <div className="text-[10px] text-rose-500 font-bold mt-0.5">OVERDUE</div>}
                      </td>

                      {/* Payment status */}
                      <td className="py-3.5 px-4">
                        {paymentOk ? (
                          <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border', isDaylight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-900/30 text-emerald-300 border-emerald-800/50')}>
                            <ShieldCheck className="h-3 w-3" /> Cleared
                          </span>
                        ) : (
                          <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border', isDaylight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-900/30 text-rose-300 border-rose-800/50')}>
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
                            onClick={() => setWhatsAppModalBooking(b)}
                            title="Circulate Dispatch Update on WhatsApp"
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
                                : 'bg-rose-700 hover:bg-rose-600 text-white'
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

      {/* Handover Panel Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/55 backdrop-blur-md overflow-y-auto">
          <div className={cn('w-full max-w-4xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border shadow-2xl my-4', isDaylight ? 'bg-white border-slate-200' : 'bg-[#242424] border-slate-800')}>

            {/* Success state */}
            {issuedChallan ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={cn('font-black text-base', isDaylight ? 'text-slate-950' : 'text-white')}>
                      Challan {issuedChallan.challanNumber} Issued!
                    </h3>
                    <p className={cn('text-xs', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
                      Machine <strong className="text-amber-500">{issuedChallan.assetTag}</strong> successfully handed over · Status → <strong className="text-emerald-400">ON_RENT</strong>
                    </p>
                  </div>
                </div>
                <div className={cn('rounded-xl border p-4 text-xs grid grid-cols-2 gap-3', isDaylight ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-800/50 bg-emerald-900/20')}>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Challan #</div>
                    <div className={cn('font-mono font-bold mt-0.5', isDaylight ? 'text-slate-900' : 'text-emerald-400')}>{issuedChallan.challanNumber}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Driver</div>
                    <div className={cn('font-medium mt-0.5', isDaylight ? 'text-slate-700' : 'text-slate-300')}>{issuedChallan.driverName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Fuel Out</div>
                    <div className={cn('font-medium mt-0.5', isDaylight ? 'text-slate-700' : 'text-slate-300')}>{issuedChallan.fuelLevel}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Engine Hours Out</div>
                    <div className={cn('font-mono font-bold mt-0.5', isDaylight ? 'text-slate-900' : 'text-slate-300')}>{issuedChallan.engineHoursOut} hrs</div>
                  </div>
                </div>
                {/* WhatsApp status banner */}
                <div
                  className={cn(
                    'rounded-xl border p-3 flex items-start gap-2.5 text-xs',
                    isDaylight ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-emerald-800/40 bg-emerald-950/30 text-emerald-300'
                  )}
                >
                  <MessageSquare className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs">WhatsApp Dispatch Alert Dispatched</div>
                    <div className="text-[11px] opacity-85">
                      Challan handover details & live trip tracking prompt sent to <strong>+91 {selectedBooking.customer.phone}</strong>.
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
                      isDaylight ? 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100' : 'border-amber-700/50 text-amber-300 bg-amber-900/20 hover:bg-amber-900/30'
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
                      isDaylight ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black' : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                    )}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Panel Header */}
                <div className={cn('flex items-center justify-between px-5 py-4 border-b', isDaylight ? 'border-slate-100' : 'border-slate-800')}>
                  <div className="flex items-center gap-2.5">
                    <div className={cn('p-2 rounded-xl', isDaylight ? 'bg-amber-100 text-amber-700' : 'bg-amber-900/40 text-amber-400')}>
                      <Send className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className={cn('font-black text-sm', isDaylight ? 'text-slate-950' : 'text-white')}>Yard Handover Checklist</h3>
                      <p className={cn('text-[11px] font-mono', isDaylight ? 'text-amber-700' : 'text-amber-400')}>{selectedBooking.bookingNumber}</p>
                    </div>
                  </div>
                  <button onClick={closePanel} className={cn('p-1.5 rounded-lg border cursor-pointer transition-colors', isDaylight ? 'border-slate-200 text-slate-400 hover:bg-slate-100' : 'border-slate-700 text-slate-500 hover:bg-slate-800')}>
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Booking summary strip */}
                <div className={cn('px-5 py-3 border-b text-xs', isDaylight ? 'bg-slate-50 border-slate-100 text-slate-700' : 'bg-slate-950/60 border-slate-800 text-slate-400')}>
                  <span className="font-bold">{selectedBooking.customer.fullName}</span>
                  {' · '}<span>{selectedBooking.asset.name}</span>
                  {' · '}<span className="font-mono">{selectedBooking.asset.assetTag}</span>
                  {' · '}<span>To: <strong className={isDaylight ? 'text-slate-800' : 'text-slate-200'}>{selectedBooking.deliveryAddress}</strong></span>
                </div>

                <form onSubmit={handleDispatch} className="p-5 space-y-5">
                  {/* Zero-credit summary */}
                  <div className={cn('rounded-xl border p-4 flex items-center justify-between', isZeroCreditPassed ? (isDaylight ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-800/50 bg-emerald-900/20') : (isDaylight ? 'border-rose-200 bg-rose-50' : 'border-rose-800/50 bg-rose-900/20'))}>
                    <div className="flex items-center gap-2">
                      {isZeroCreditPassed
                        ? <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        : <ShieldAlert className="h-4 w-4 text-rose-500" />
                      }
                      <div>
                        <div className={cn('text-xs font-black', isZeroCreditPassed ? (isDaylight ? 'text-emerald-800' : 'text-emerald-300') : (isDaylight ? 'text-rose-800' : 'text-rose-300'))}>
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
                          onClick={() => { closePanel(); onNavigateToPayment(); }}
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
                      <label className={cn('block text-[11px] font-bold uppercase tracking-wide mb-1', isDaylight ? 'text-slate-500' : 'text-slate-400')}>Fuel Level at Handover</label>
                      <input
                        type="text"
                        value={fuelLevel}
                        onChange={(e) => setFuelLevel(e.target.value)}
                        className={cn('w-full rounded-lg border px-3 py-2 text-xs focus:outline-none', isDaylight ? 'border-slate-300 bg-white text-slate-950 focus:border-amber-500' : 'border-slate-700 bg-slate-950 text-white focus:border-amber-500')}
                      />
                    </div>

                    {/* Engine hours */}
                    <div>
                      <label className={cn('block text-[11px] font-bold uppercase tracking-wide mb-1', isDaylight ? 'text-slate-500' : 'text-slate-400')}>Engine / Operating Hours Out</label>
                      <input
                        type="number"
                        step="0.1"
                        value={engineHoursOut}
                        onChange={(e) => setEngineHoursOut(parseFloat(e.target.value))}
                        className={cn('w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none', isDaylight ? 'border-slate-300 bg-white text-slate-950 focus:border-amber-500' : 'border-slate-700 bg-slate-950 text-white focus:border-amber-500')}
                      />
                    </div>

                    {/* Driver */}
                    <div className="sm:col-span-2">
                      <label className={cn('block text-[11px] font-bold uppercase tracking-wide mb-1', isDaylight ? 'text-slate-500' : 'text-slate-400')}>Assigned Driver / Logistics Operator</label>
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className={cn('w-full rounded-lg border px-3 py-2 text-xs focus:outline-none', isDaylight ? 'border-slate-300 bg-white text-slate-950 focus:border-amber-500' : 'border-slate-700 bg-slate-950 text-white focus:border-amber-500')}
                      />
                    </div>

                    {/* Condition notes */}
                    <div className="sm:col-span-2">
                      <label className={cn('block text-[11px] font-bold uppercase tracking-wide mb-1', isDaylight ? 'text-slate-500' : 'text-slate-400')}>Condition Notes & Serial Confirmation</label>
                      <textarea
                        rows={2}
                        value={conditionNotes}
                        onChange={(e) => setConditionNotes(e.target.value)}
                        className={cn('w-full rounded-lg border px-3 py-2 text-xs focus:outline-none resize-none', isDaylight ? 'border-slate-300 bg-white text-slate-950 focus:border-amber-500' : 'border-slate-700 bg-slate-950 text-white focus:border-amber-500')}
                      />
                    </div>
                  </div>

                  {/* Pre-dispatch checklist */}
                  <div className={cn('rounded-xl border p-4 space-y-2.5', isDaylight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/60')}>
                    <h4 className={cn('text-[11px] font-black uppercase tracking-wider mb-3', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
                      Pre-Dispatch Safety Checklist (SOP-005)
                    </h4>
                    {[
                      { state: checkEngine, set: setCheckEngine, label: 'Engine Start, Idle & Leakage Test Verified (No oil/fuel leaks)' },
                      { state: checkAccessories, set: setCheckAccessories, label: `Mandatory Accessories Included: ${selectedBooking.asset.accessoriesIncluded || 'All tools checked'}` },
                      { state: checkSignature, set: setCheckSignature, label: 'Customer ID & Delivery Acceptance Sign-off Acknowledged' },
                    ].map(({ state, set, label }) => (
                      <label key={label} className={cn('flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors', state ? (isDaylight ? 'border-emerald-200 bg-emerald-50/60' : 'border-emerald-800/40 bg-emerald-900/10') : (isDaylight ? 'border-slate-200' : 'border-slate-800'))}>
                        <input
                          type="checkbox"
                          checked={state}
                          onChange={(e) => set(e.target.checked)}
                          className="accent-amber-500 h-4 w-4 mt-0.5 cursor-pointer shrink-0"
                        />
                        <span className={cn('text-xs leading-relaxed', isDaylight ? 'text-slate-700' : 'text-slate-300')}>{label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={closePanel}
                      className={cn('flex-1 py-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors', isDaylight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-slate-700 text-slate-300 hover:bg-slate-800')}
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
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
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
          onClose={() => setWhatsAppModalBooking(null)}
          stageName="Yard Dispatch Handover"
          bookingNumber={whatsAppModalBooking.bookingNumber}
          recipientName={whatsAppModalBooking.customer.fullName}
          recipientPhone={whatsAppModalBooking.customer.phone}
          message={getDispatchWhatsAppMessage(whatsAppModalBooking, {
            id: 0,
            bookingId: whatsAppModalBooking.id,
            assetTag: whatsAppModalBooking.asset.assetTag,
            challanNumber: `DC-${new Date().getFullYear()}-DISP`,
            fuelLevel: '100% (Full Tank)',
            engineHoursOut: whatsAppModalBooking.asset.engineHours || 14.5,
            accessoriesVerified: true,
            conditionNotes: 'All mechanical systems operational. Dispatched to farm site.',
            driverName: 'Suraj Logistics (E-Rickshaw 3W)',
            customerSignatureConfirmed: true,
            dispatchTimestamp: new Date().toISOString(),
          })}
          onPrintPdf={() =>
            printDispatchChallanPdf({
              booking: whatsAppModalBooking,
              challan: {
                id: 0,
                bookingId: whatsAppModalBooking.id,
                assetTag: whatsAppModalBooking.asset.assetTag,
                challanNumber: `DC-${new Date().getFullYear()}-DISP`,
                fuelLevel: '100% (Full Tank)',
                engineHoursOut: whatsAppModalBooking.asset.engineHours || 14.5,
                accessoriesVerified: true,
                conditionNotes: 'All mechanical systems operational.',
                driverName: 'Suraj Logistics (E-Rickshaw 3W)',
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

import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Printer,
  Sparkles,
  Truck,
  MapPin,
  X,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { SearchSelect } from '../../components/SearchSelect';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';
import { WhatsAppCirculationModal } from '../../components/WhatsAppCirculationModal';
import { formatINR, formatDate } from '../../lib/utils';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { Booking, ReturnInspection } from '../../types';
import { cn } from '../../lib/utils';
import { printReturnSettlementPdf } from '../../services/voucherPdfService';
import { getReturnSettlementWhatsAppMessage, openWhatsAppCirculation } from '../../services/whatsappCirculation';

export const ReturnAuditView: React.FC = () => {
  const { isDaylight } = useTheme();
  const allBookings = api.bookings;
  const states = api.getStates();
  const cities = api.getCities();
  const hubs = api.getHubs();

  // Regional filters
  const [selectedStateId, setSelectedStateId] = useState<string>('ALL');
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');

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

  // Only DISPATCHED / ON_RENT machines are eligible for return audit
  const dispatchedBookings = useMemo(() => {
    return allBookings.filter((b) => {
      const eligible = b.status === 'DISPATCHED' || b.status === 'ON_RENT';
      if (!eligible) return false;
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
  const visibleDispatches = useMemo(() => {
    return dispatchedBookings.slice(0, visibleCount);
  }, [dispatchedBookings, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 60) {
      if (visibleCount < dispatchedBookings.length) {
        setVisibleCount((prev) => Math.min(prev + 7, dispatchedBookings.length));
      }
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 7, dispatchedBookings.length));
  };

  // Inspection panel state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [inspectorName, setInspectorName] = useState<string>('Rajesh Sharma (Lead Tech)');
  const [fuelDeltaCharge, setFuelDeltaCharge] = useState<number>(200);
  const [hasDamage, setHasDamage] = useState<boolean>(false);
  const [damageCost, setDamageCost] = useState<number>(0);
  const [damageDescription, setDamageDescription] = useState<string>('');

  const [completedInspection, setCompletedInspection] = useState<ReturnInspection | null>(null);
  const [whatsAppModalBooking, setWhatsAppModalBooking] = useState<Booking | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

  const depositPaid = selectedBooking?.depositPaid || 0;
  const netRefund = Math.max(0, depositPaid - (hasDamage ? damageCost : 0) - fuelDeltaCharge);

  const openInspectionPanel = (b: Booking) => {
    setSelectedBooking(b);
    setInspectorName('Rajesh Sharma (Lead Tech)');
    setFuelDeltaCharge(200);
    setHasDamage(false);
    setDamageCost(0);
    setDamageDescription('');
    setCompletedInspection(null);
  };

  const closePanel = () => {
    setSelectedBooking(null);
    setCompletedInspection(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    try {
      const res = await api.executeReturnInspection({
        bookingId: selectedBooking.id,
        inspectorName,
        hasDamage,
        damageCost: hasDamage ? damageCost : 0,
        fuelDeltaCharge,
        damageDescription: hasDamage ? damageDescription : 'Clean return, no mechanical damage observed.',
      });

      // Automatically trigger WhatsApp notification via backend bot dispatcher
      try {
        await api.sendReturnWhatsAppNotification(selectedBooking.id);
      } catch (err) {
        console.warn('WhatsApp return settlement notification call:', err);
      }

      setCompletedInspection(res);
    } catch (err: any) {
      setErrorModal({ isOpen: true, message: err.message || 'Inspection submission failed. Please check booking status and try again.' });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      {/* Header */}
      <div className="flex-shrink-0">
        <h2 className={cn('text-lg sm:text-xl font-black flex items-center gap-2', isDaylight ? 'text-slate-950' : 'text-white')}>
          <RotateCcw className={cn('h-5 w-5', isDaylight ? 'text-amber-700' : 'text-purple-400')} />
          Return Audit
        </h2>
        <p className={cn('text-[11px] mt-0.5', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
          Showing dispatched & on-rent machines — select a booking to submit return inspection
        </p>
      </div>

      {/* Filters */}
      <div className={cn('flex-shrink-0 p-2.5 rounded-xl border transition-colors', isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40')}>
        <div className="flex items-center justify-end mb-1.5">
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

      {/* Dispatched Machines Table */}
      <div className={cn('flex-1 min-h-0 rounded-2xl border overflow-hidden flex flex-col', isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40')}>
        <div className={cn('px-3.5 py-2 border-b flex items-center justify-between flex-shrink-0', isDaylight ? 'border-slate-200' : 'border-slate-800/60')}>
          <div className="flex items-center gap-2">
            <Truck className={cn('h-4 w-4', isDaylight ? 'text-amber-700' : 'text-purple-400')} />
            <h3 className={cn('font-black text-xs sm:text-sm', isDaylight ? 'text-slate-950' : 'text-white')}>
              Machines Out in Field — Return Pending ({dispatchedBookings.length})
            </h3>
          </div>
        </div>

        {dispatchedBookings.length === 0 ? (
          <div className="flex-1 min-h-0 p-8 text-center flex flex-col items-center justify-center space-y-1.5">
            <RotateCcw className="h-7 w-7 mx-auto opacity-25 text-slate-500" />
            <p className={cn('text-xs font-bold', isDaylight ? 'text-slate-500' : 'text-slate-400')}>No machines currently out in field</p>
            <p className="text-[11px] text-slate-500">Once machines are dispatched via Yard Handover, they will appear here for return inspection.</p>
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
                  <th className="py-3 px-4">Deposit Escrow</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={cn('divide-y', isDaylight ? 'divide-slate-100' : 'divide-slate-800/50')}>
                {visibleDispatches.map((b) => (
                  <tr key={b.id} className={cn('transition-colors', isDaylight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/30')}>
                    <td className="py-3.5 px-4">
                      <div className={cn('font-mono font-bold text-[11px]', isDaylight ? 'text-amber-700' : 'text-amber-400')}>{b.bookingNumber}</div>
                      <div className={cn('font-bold text-sm mt-0.5', isDaylight ? 'text-slate-950' : 'text-white')}>{b.customer.fullName}</div>
                      <div className="text-[10px] text-slate-500">{b.customer.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className={cn('font-bold', isDaylight ? 'text-slate-900' : 'text-slate-200')}>{b.asset.name}</div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">{b.asset.assetTag}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className={cn('font-medium', isDaylight ? 'text-slate-700' : 'text-slate-300')}>{b.asset.hubName || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className={cn('font-extrabold text-sm', isDaylight ? 'text-slate-900' : 'text-white')}>{formatINR(b.depositPaid)}</div>
                      <div className={cn('text-[10px]', isDaylight ? 'text-slate-500' : 'text-slate-500')}>of {formatINR(b.depositAmount)}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={b.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setWhatsAppModalBooking(b)}
                          title="Circulate Return / Settlement Notice on WhatsApp"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>

                        <button
                          onClick={() => openInspectionPanel(b)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                            isDaylight
                              ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-sm'
                              : 'bg-purple-600/80 hover:bg-purple-500 text-white border border-purple-500/50'
                          )}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Return & Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Infinite Scroll Footer */}
        {dispatchedBookings.length > 0 && (
          <InfiniteScrollFooter
            loadedCount={visibleDispatches.length}
            totalCount={dispatchedBookings.length}
            onLoadMore={handleLoadMore}
            itemName="active machines"
          />
        )}
      </div>

      {/* Inspection Panel Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/55 backdrop-blur-md overflow-y-auto">
          <div className={cn('w-full max-w-3xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border shadow-2xl my-4', isDaylight ? 'bg-white border-slate-200' : 'bg-[#242424] border-slate-800')}>

            {/* Completed state */}
            {completedInspection ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={cn('font-black text-base', isDaylight ? 'text-slate-950' : 'text-white')}>
                      Return Audit Complete
                    </h3>
                    <p className={cn('text-xs', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
                      Asset <strong className="text-amber-500">{completedInspection.assetTag}</strong> · {completedInspection.nextAction}
                    </p>
                  </div>
                </div>
                {/* Itemized Deposit Settlement Breakdown */}
                <div
                  className={cn(
                    'rounded-xl border p-4 text-xs space-y-2',
                    isDaylight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'
                  )}
                >
                  <div className="font-bold uppercase tracking-wider text-[10px] text-slate-500 border-b pb-1">
                    Security Deposit Settlement Audit (F-004)
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Security Deposit Held in Escrow:</span>
                    <span className="font-bold font-mono">{formatINR(depositPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Fuel Delta / Refueling Surcharge:</span>
                    <span className={cn('font-bold font-mono', fuelDeltaCharge > 0 ? 'text-rose-600' : 'text-slate-500')}>
                      {fuelDeltaCharge > 0 ? `-${formatINR(fuelDeltaCharge)}` : '₹0.00 (Full Tank)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Damage / Repair Deductions:</span>
                    <span className={cn('font-bold font-mono', hasDamage && damageCost > 0 ? 'text-rose-600' : 'text-slate-500')}>
                      {hasDamage && damageCost > 0 ? `-${formatINR(damageCost)}` : '₹0.00 (Zero Damage)'}
                    </span>
                  </div>
                  {hasDamage && damageDescription && (
                    <div className="text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-2 rounded border border-rose-200 dark:border-rose-900/40">
                      <strong>Audit Damage Notes:</strong> {damageDescription}
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t pt-2 font-bold text-sm">
                    <span className="text-emerald-700 dark:text-emerald-400">Net Refund Credited to Customer:</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatINR(netRefund)}
                    </span>
                  </div>
                </div>

                {/* WhatsApp Status Banner */}
                <div
                  className={cn(
                    'rounded-xl border p-3 flex items-start gap-2.5 text-xs',
                    isDaylight ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-emerald-800/40 bg-emerald-950/30 text-emerald-300'
                  )}
                >
                  <MessageSquare className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs">WhatsApp Settlement Notice Sent</div>
                    <div className="text-[11px] opacity-85">
                      Itemized statement and UPI refund confirmation sent to <strong>+91 {selectedBooking.customer.phone}</strong>.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = getReturnSettlementWhatsAppMessage(selectedBooking, completedInspection, {
                        originalDeposit: depositPaid,
                        fuelDeltaCharge,
                        damageCost: hasDamage ? damageCost : 0,
                        netRefund,
                        damageDescription: hasDamage ? damageDescription : undefined,
                      });
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
                    onClick={() =>
                      printReturnSettlementPdf({
                        booking: selectedBooking,
                        inspection: completedInspection,
                        originalDeposit: depositPaid,
                        fuelDeltaCharge,
                        damageCost: hasDamage ? damageCost : 0,
                        damageNotes: hasDamage ? damageDescription : undefined,
                        netRefund,
                        refundDestination: selectedBooking.customer.phone,
                        inspectorName,
                      })
                    }
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold cursor-pointer transition-colors border',
                      isDaylight ? 'border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100' : 'border-purple-700/50 text-purple-300 bg-purple-900/20 hover:bg-purple-900/30'
                    )}
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Settlement (F-004)</span>
                  </button>

                  <button
                    type="button"
                    onClick={closePanel}
                    className={cn(
                      'py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm',
                      isDaylight ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black' : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                    )}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Panel Header */}
                <div className={cn('flex items-center justify-between px-5 py-4 border-b', isDaylight ? 'border-slate-100' : 'border-slate-800')}>
                  <div className="flex items-center gap-2.5">
                    <div className={cn('p-2 rounded-xl', isDaylight ? 'bg-purple-100 text-purple-700' : 'bg-purple-900/40 text-purple-400')}>
                      <RotateCcw className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className={cn('font-black text-sm', isDaylight ? 'text-slate-950' : 'text-white')}>Return & Inspect</h3>
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
                  {' · '}
                  <span>{selectedBooking.asset.name}</span>
                  {' · '}
                  <span>Deposit: <strong className={isDaylight ? 'text-emerald-700' : 'text-emerald-400'}>{formatINR(selectedBooking.depositPaid)}</strong></span>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  {/* Inspector */}
                  <div>
                    <label className={cn('block text-[11px] font-bold uppercase tracking-wide mb-1', isDaylight ? 'text-slate-500' : 'text-slate-400')}>Inspector / Technician</label>
                    <input
                      type="text"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      className={cn('w-full rounded-lg border px-3 py-2 text-xs focus:outline-none', isDaylight ? 'border-slate-300 bg-white text-slate-950 focus:border-purple-500' : 'border-slate-700 bg-slate-950 text-white focus:border-purple-500')}
                      required
                    />
                  </div>

                  {/* Fuel delta */}
                  <div>
                    <label className={cn('block text-[11px] font-bold uppercase tracking-wide mb-1', isDaylight ? 'text-slate-500' : 'text-slate-400')}>Fuel Delta Charge (₹)</label>
                    <input
                      type="number"
                      value={fuelDeltaCharge}
                      onChange={(e) => setFuelDeltaCharge(parseFloat(e.target.value) || 0)}
                      className={cn('w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none', isDaylight ? 'border-slate-300 bg-white text-slate-950 focus:border-purple-500' : 'border-slate-700 bg-slate-950 text-white focus:border-purple-500')}
                    />
                  </div>

                  {/* Damage toggle */}
                  <div className={cn('rounded-xl border p-4 space-y-3', isDaylight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/60')}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={cn('h-4 w-4', hasDamage ? 'text-rose-500' : 'text-slate-400')} />
                        <span className={cn('text-xs font-bold', isDaylight ? 'text-slate-800' : 'text-slate-200')}>Damage / Wear Detected</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={hasDamage}
                        onChange={(e) => setHasDamage(e.target.checked)}
                        className="accent-rose-500 h-4 w-4 cursor-pointer"
                      />
                    </div>
                    {hasDamage && (
                      <div className="space-y-3 pt-2 border-t border-rose-500/20">
                        <div>
                          <label className="block text-[11px] font-bold text-rose-400 uppercase tracking-wide mb-1">Repair Cost (₹)</label>
                          <input
                            type="number"
                            value={damageCost}
                            onChange={(e) => setDamageCost(parseFloat(e.target.value) || 0)}
                            className={cn('w-full rounded-lg border border-rose-400/40 px-3 py-2 text-xs focus:outline-none', isDaylight ? 'bg-white text-slate-950' : 'bg-slate-900 text-white')}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-rose-400 uppercase tracking-wide mb-1">Damage Notes</label>
                          <textarea
                            rows={2}
                            value={damageDescription}
                            onChange={(e) => setDamageDescription(e.target.value)}
                            placeholder="e.g. Broken coupling pin, dented guard..."
                            className={cn('w-full rounded-lg border border-rose-400/40 px-3 py-2 text-xs focus:outline-none resize-none', isDaylight ? 'bg-white text-slate-950' : 'bg-slate-900 text-white')}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Net refund preview */}
                  <div className={cn('rounded-xl border p-4 flex items-center justify-between', isDaylight ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-800/50 bg-emerald-900/20')}>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span className={cn('text-xs font-bold', isDaylight ? 'text-slate-700' : 'text-slate-300')}>Net Refund to Customer</span>
                    </div>
                    <span className="text-xl font-extrabold text-emerald-500 font-mono">{formatINR(netRefund)}</span>
                  </div>

                  {/* Routing decision */}
                  <div className={cn('text-xs px-3 py-2 rounded-lg border font-medium', hasDamage ? (isDaylight ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-rose-800/50 bg-rose-900/20 text-rose-400') : (isDaylight ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-emerald-800/50 bg-emerald-900/20 text-emerald-400'))}>
                    {hasDamage ? '→ Machine routed to MAINTENANCE workshop' : '→ Machine becomes AVAILABLE in yard'}
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
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-white text-xs font-black cursor-pointer transition-colors shadow-md shadow-purple-500/20"
                    >
                      <Sparkles className="h-4 w-4" />
                      Submit & Close Rental
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Modal */}
      <ConfirmationModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        variant="error"
        title="Inspection Failed"
        message={errorModal.message}
      />

      {/* WhatsApp Circulation Modal */}
      {whatsAppModalBooking && (
        <WhatsAppCirculationModal
          isOpen={!!whatsAppModalBooking}
          onClose={() => setWhatsAppModalBooking(null)}
          stageName="Return Settlement"
          bookingNumber={whatsAppModalBooking.bookingNumber}
          recipientName={whatsAppModalBooking.customer.fullName}
          recipientPhone={whatsAppModalBooking.customer.phone}
          message={getReturnSettlementWhatsAppMessage(
            whatsAppModalBooking,
            {
              id: 0,
              bookingId: whatsAppModalBooking.id,
              assetTag: whatsAppModalBooking.asset.assetTag,
              returnTimestamp: new Date().toISOString(),
              fuelLevelReturn: '75%',
              fuelDeltaCharge: 200,
              engineHoursIn: (whatsAppModalBooking.asset.engineHours || 14.5) + 8.0,
              accessoriesReturnedOk: true,
              inspectorName: 'Rajesh Sharma (Lead Tech)',
              hasDamage: false,
              damageCost: 0,
              damageDescription: 'Clean return, no mechanical damage observed.',
              nextAction: 'AVAILABLE',
            },
            {
              originalDeposit: whatsAppModalBooking.depositPaid || whatsAppModalBooking.depositAmount || 0,
              fuelDeltaCharge: 200,
              damageCost: 0,
              netRefund: Math.max(0, (whatsAppModalBooking.depositPaid || whatsAppModalBooking.depositAmount || 0) - 200),
            }
          )}
          onPrintPdf={() =>
            printReturnSettlementPdf({
              booking: whatsAppModalBooking,
              inspection: {
                id: 0,
                bookingId: whatsAppModalBooking.id,
                assetTag: whatsAppModalBooking.asset.assetTag,
                returnTimestamp: new Date().toISOString(),
                fuelLevelReturn: '75%',
                fuelDeltaCharge: 200,
                engineHoursIn: (whatsAppModalBooking.asset.engineHours || 14.5) + 8.0,
                accessoriesReturnedOk: true,
                inspectorName: 'Rajesh Sharma (Lead Tech)',
                hasDamage: false,
                damageCost: 0,
                damageDescription: 'Clean return, no mechanical damage observed.',
                nextAction: 'AVAILABLE',
              },
              originalDeposit: whatsAppModalBooking.depositPaid || whatsAppModalBooking.depositAmount || 0,
              fuelDeltaCharge: 200,
              damageCost: 0,
              netRefund: Math.max(0, (whatsAppModalBooking.depositPaid || whatsAppModalBooking.depositAmount || 0) - 200),
              refundDestination: whatsAppModalBooking.customer.phone,
              inspectorName: 'Rajesh Sharma',
            })
          }
          pdfButtonLabel="Print Settlement Voucher (F-004)"
        />
      )}
    </div>
  );
};

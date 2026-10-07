import React, { useState } from 'react';
import {
  Send,
  ShieldCheck,
  CheckCircle2,
  Printer,
  X,
  Truck,
  Fuel,
  Gauge,
  FileText,
  UserCheck,
  Loader2,
  MapPin,
  Calendar,
} from 'lucide-react';
import { cn, formatINR } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';
import { api } from '../services/api';
import { Booking, DispatchRecord } from '../types';
import { printDispatchChallanPdf } from '../services/voucherPdfService';

interface HandoverChecklistModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onHandoverCompleted?: (record: DispatchRecord) => void;
}

export const HandoverChecklistModal: React.FC<HandoverChecklistModalProps> = ({
  isOpen,
  booking,
  onClose,
  onHandoverCompleted,
}) => {
  const { isDaylight } = useTheme();

  const [driverName, setDriverName] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [engineHoursOut, setEngineHoursOut] = useState<number | ''>('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [checkEngine, setCheckEngine] = useState(true);
  const [checkAccessories, setCheckAccessories] = useState(true);
  const [checkSignature, setCheckSignature] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedChallan, setIssuedChallan] = useState<DispatchRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const handleExecuteDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const challan = await api.executeDispatch({
        bookingId: booking.id,
        driverName: driverName.trim() || 'EquipGrid Fleet / Self Pickup',
        fuelLevel: fuelLevel.trim() || '100% (Full Tank)',
        engineHoursOut: typeof engineHoursOut === 'number' ? engineHoursOut : (parseFloat(String(engineHoursOut)) || 0),
        conditionNotes: conditionNotes.trim() || 'Standard Outward Check Completed',
      });

      setIssuedChallan(challan);
      if (onHandoverCompleted) onHandoverCompleted(challan);
    } catch (err: any) {
      console.error('Dispatch execution failed:', err);
      setErrorMessage(err.message || 'Dispatch handover failed. Please check booking status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIssuedChallan(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={cn(
          'w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border shadow-2xl transition-all',
          isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#1e1e1e] border-slate-800 text-slate-100'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between px-6 py-4 border-b',
            isDaylight ? 'border-slate-100 bg-slate-50' : 'border-slate-800 bg-slate-900/40'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base">
                Yard Dispatch & Handover Formality
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Booking: <span className="text-amber-600 font-bold">{booking.bookingNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={cn(
              'p-1.5 rounded-lg border transition-colors cursor-pointer',
              isDaylight
                ? 'border-slate-200 text-slate-400 hover:bg-slate-100'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {issuedChallan ? (
          /* Success Challan State */
          <div className="p-6 space-y-5">
            <div className={cn('flex items-center gap-3 p-4 rounded-xl border', isDaylight ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400')}>
              <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-500" />
              <div>
                <h4 className="font-black text-base">Outward Challan Issued Successfully!</h4>
                <p className={cn('text-xs mt-0.5', isDaylight ? 'text-slate-700' : 'opacity-90')}>
                  Machine <strong className="text-amber-600 font-bold">{issuedChallan.assetTag}</strong> has been handed over and transitioned to <strong className="text-emerald-600 font-bold">ON_RENT</strong>.
                </p>
              </div>
            </div>

            <div
              className={cn(
                'rounded-xl border p-4 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3',
                isDaylight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-900/50'
              )}
            >
              <div>
                <span className={cn('text-[10px] uppercase font-bold block', isDaylight ? 'text-slate-600' : 'text-slate-400')}>Challan #</span>
                <span className="font-mono font-bold text-amber-600 block mt-0.5">{issuedChallan.challanNumber}</span>
              </div>
              <div>
                <span className={cn('text-[10px] uppercase font-bold block', isDaylight ? 'text-slate-600' : 'text-slate-400')}>Driver / Fleet</span>
                <span className={cn('font-medium block mt-0.5', isDaylight ? 'text-slate-950 font-bold' : 'text-white')}>{issuedChallan.driverName}</span>
              </div>
              <div>
                <span className={cn('text-[10px] uppercase font-bold block', isDaylight ? 'text-slate-600' : 'text-slate-400')}>Fuel Out</span>
                <span className={cn('font-medium block mt-0.5', isDaylight ? 'text-slate-950 font-bold' : 'text-white')}>{issuedChallan.fuelLevel}</span>
              </div>
              <div>
                <span className={cn('text-[10px] uppercase font-bold block', isDaylight ? 'text-slate-600' : 'text-slate-400')}>Engine Hours Out</span>
                <span className={cn('font-mono font-bold block mt-0.5', isDaylight ? 'text-slate-950' : 'text-white')}>{issuedChallan.engineHoursOut} hrs</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (booking) {
                    printDispatchChallanPdf({
                      booking,
                      challan: issuedChallan,
                    });
                  } else {
                    window.print();
                  }
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border',
                  isDaylight
                    ? 'border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100'
                    : 'border-amber-700/50 text-amber-400 hover:bg-amber-900/20'
                )}
              >
                <Printer className="h-4 w-4" />
                <span>Print Outward Challan</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-xs font-black transition-colors cursor-pointer shadow-sm',
                  isDaylight ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                )}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Handover Checklist Form */
          <form onSubmit={handleExecuteDispatch} className="p-6 space-y-5">
            {/* Payment Cleared Pill */}
            <div
              className={cn(
                'p-3 rounded-xl border flex items-center justify-between text-xs',
                isDaylight ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
              )}
            >
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Zero-Credit Barrier: CLEARED</span>
              </div>
              <div className="font-mono text-[11px] font-bold">
                Paid: {formatINR((booking.advancePaid || 0) + (booking.depositPaid || 0))}
              </div>
            </div>

            {/* Machinery & Customer Details */}
            <div
              className={cn(
                'p-3.5 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs',
                isDaylight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
              )}
            >
              <div>
                <span className={cn('text-[10px] uppercase font-bold block', isDaylight ? 'text-slate-600' : 'text-slate-400')}>Equipment</span>
                <span className={cn('font-bold block mt-0.5 text-sm', isDaylight ? 'text-slate-950 font-extrabold' : 'text-white')}>{booking.asset.name}</span>
                <span className="font-mono text-[11px] text-amber-600 font-bold">{booking.asset.assetTag}</span>
              </div>
              <div>
                <span className={cn('text-[10px] uppercase font-bold block', isDaylight ? 'text-slate-600' : 'text-slate-400')}>Delivery To</span>
                <span className={cn('font-bold block mt-0.5 text-sm', isDaylight ? 'text-slate-950 font-extrabold' : 'text-white')}>{booking.customer.fullName}</span>
                <span className={cn('text-[11px] block truncate', isDaylight ? 'text-slate-700 font-medium' : 'text-slate-400')}>{booking.deliveryAddress}</span>
              </div>
            </div>

            {/* Inputs: Driver, Fuel, Engine Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={cn('block text-[11px] font-bold uppercase tracking-wide mb-1', isDaylight ? 'text-slate-700' : 'text-slate-400')}>
                  Driver / Vehicle
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Suraj Logistics (E-Rickshaw 3W)"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-xs focus:outline-none transition-colors',
                    isDaylight ? 'border-slate-300 bg-white text-slate-900 focus:border-amber-500' : 'border-slate-700 bg-slate-950 text-white focus:border-amber-500'
                  )}
                />
              </div>

              <div>
                <label className={cn('block text-[11px] font-bold uppercase tracking-wide mb-1', isDaylight ? 'text-slate-700' : 'text-slate-400')}>
                  Fuel Level Out
                </label>
                <input
                  type="text"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value)}
                  placeholder="e.g. 100% (Full Tank)"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-xs focus:outline-none transition-colors font-medium',
                    isDaylight ? 'border-slate-300 bg-white text-slate-900 focus:border-amber-500' : 'border-slate-700 bg-slate-950 text-white focus:border-amber-500'
                  )}
                />
              </div>

              <div>
                <label className={cn('block text-[11px] font-bold uppercase tracking-wide mb-1', isDaylight ? 'text-slate-700' : 'text-slate-400')}>
                  Engine Hours Out
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={engineHoursOut}
                  onChange={(e) => setEngineHoursOut(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 14.5"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-xs font-mono font-medium focus:outline-none transition-colors',
                    isDaylight ? 'border-slate-300 bg-white text-slate-900 focus:border-amber-500' : 'border-slate-700 bg-slate-950 text-white focus:border-amber-500'
                  )}
                />
              </div>
            </div>

            {/* Condition Notes */}
            <div>
              <label className={cn('block text-[11px] font-bold uppercase tracking-wide mb-1', isDaylight ? 'text-slate-700' : 'text-slate-400')}>
                Handover Inspection & Condition Notes
              </label>
              <input
                type="text"
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="e.g. Clean machine, fresh oil, air filter blown clean"
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-xs focus:outline-none transition-colors font-medium',
                  isDaylight ? 'border-slate-300 bg-white text-slate-900 focus:border-amber-500' : 'border-slate-700 bg-slate-950 text-white focus:border-amber-500'
                )}
              />
            </div>

            {/* Mandatory Checklists */}
            <div className="space-y-2 pt-1">
              <span className={cn('block text-[11px] font-bold uppercase tracking-wide', isDaylight ? 'text-slate-800' : 'text-slate-400')}>
                Mandatory Outward Checks (SOP-005)
              </span>

              <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={checkEngine}
                  onChange={(e) => setCheckEngine(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
                />
                <span className={cn('font-semibold', isDaylight ? 'text-slate-900' : 'text-slate-200')}>Engine run test & safety guard verified</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={checkAccessories}
                  onChange={(e) => setCheckAccessories(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
                />
                <span className={cn('font-semibold', isDaylight ? 'text-slate-900' : 'text-slate-200')}>Accessories & tool kit packed with machine</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={checkSignature}
                  onChange={(e) => setCheckSignature(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4"
                />
                <span className={cn('font-semibold', isDaylight ? 'text-slate-900' : 'text-slate-200')}>Customer/Driver outward challan acknowledgment verified</span>
              </label>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className={cn(
                  'px-4 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                  isDaylight ? 'border border-slate-300 text-slate-600 hover:bg-slate-100' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                )}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !checkEngine || !checkAccessories || !checkSignature}
                className={cn(
                  'px-5 py-2.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md',
                  isDaylight
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Issuing Challan...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Execute Yard Dispatch & Generate Challan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  Banknote,
  Smartphone,
  Building2,
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
  MessageSquare,
  Printer,
  ExternalLink,
} from 'lucide-react';
import { cn, formatINR } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';
import { api } from '../services/api';
import { Booking, PaymentMode } from '../types';
import { printBookingConfirmationPdf } from '../services/voucherPdfService';
import { getBookingWhatsAppMessage, openWhatsAppCirculation } from '../services/whatsappCirculation';

interface CollectPaymentModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onPaymentCollected: (updatedBooking: Booking) => void;
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  isOpen,
  booking,
  onClose,
  onPaymentCollected,
}) => {
  const { isDaylight } = useTheme();

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('Payment collected at yard desk prior to dispatch handover');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);

  if (!isOpen || !booking) return null;

  // Calculate required vs collected
  const advancePaid = booking.advancePaid || 0;
  const depositPaid = booking.depositPaid || 0;
  const totalPaid = advancePaid + depositPaid;

  const depositRequired = booking.depositAmount || 0;
  // If baseRent is not set, use totalAmount - depositAmount
  const advanceRequired = booking.baseRent || Math.max(0, (booking.totalAmount || 0) - depositRequired);
  const totalRequired = depositRequired + advanceRequired;

  const advanceDue = Math.max(0, advanceRequired - advancePaid);
  const depositDue = Math.max(0, depositRequired - depositPaid);
  const totalDue = advanceDue + depositDue;

  const handleCollectAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const generatedRef = transactionRef.trim()
        ? transactionRef.trim()
        : paymentMode === 'UPI'
        ? `UPI/${Date.now().toString().slice(-8)}`
        : paymentMode === 'CASH'
        ? `CASH/REC-${Date.now().toString().slice(-6)}`
        : `NEFT/${Date.now().toString().slice(-8)}`;

      // 1. Record Advance Rent if any due
      if (advanceDue > 0) {
        await api.recordPayment({
          bookingId: booking.id,
          amount: advanceDue,
          paymentType: 'ADVANCE',
          paymentMode,
          transactionRef: generatedRef,
          notes: `${notes} (Advance Rent: ${formatINR(advanceDue)})`,
        });
      }

      // 2. Record Security Deposit if any due
      if (depositDue > 0) {
        await api.recordPayment({
          bookingId: booking.id,
          amount: depositDue,
          paymentType: 'DEPOSIT',
          paymentMode,
          transactionRef: `${generatedRef}-DEP`,
          notes: `${notes} (Security Deposit: ${formatINR(depositDue)})`,
        });
      }

      // Find the updated booking in API
      const updated = api.bookings.find((b) => b.id === booking.id) || {
        ...booking,
        advancePaid: advanceRequired,
        depositPaid: depositRequired,
        status: 'DISPATCH_READY' as const,
      };

      // Automatically trigger WhatsApp notification via backend bot dispatcher
      try {
        await api.sendBookingWhatsAppNotification(booking.id);
      } catch (err) {
        console.warn('Automated WhatsApp booking notification call:', err);
      }

      setSuccessBooking(updated);
    } catch (err: any) {
      console.error('Payment collection error:', err);
      setErrorMessage(err.message || 'Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    `upi://pay?pa=equipgrid@upi&pn=EquipGrid+Agro+and+Civil+Rentals&am=${totalDue.toFixed(
      2
    )}&cu=INR&tn=Rent+%26+Deposit+for+${booking.bookingNumber}&tr=${booking.bookingNumber}`
  )}`;

  if (successBooking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className={cn(
            'w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4',
            isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#1e1e1e] border-slate-800 text-slate-100'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className={cn('font-black text-base', isDaylight ? 'text-slate-950' : 'text-white')}>
                Payment Confirmed & Booking Secured!
              </h3>
              <p className={cn('text-xs font-mono', isDaylight ? 'text-amber-800' : 'text-amber-400')}>
                {successBooking.bookingNumber} · Status → DISPATCH_READY
              </p>
            </div>
          </div>

          {/* Breakdown summary */}
          <div
            className={cn(
              'rounded-xl border p-3.5 space-y-2 text-xs',
              isDaylight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            )}
          >
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold">{successBooking.customer.fullName} (+91 {successBooking.customer.phone})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Machinery:</span>
              <span className="font-bold">{successBooking.asset.name} ({successBooking.asset.assetTag})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Advance Rent Paid:</span>
              <span className="font-bold font-mono">{formatINR(successBooking.advancePaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Security Deposit (Escrow):</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatINR(successBooking.depositPaid)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1.5 font-bold">
              <span>Total Received:</span>
              <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
                {formatINR((successBooking.advancePaid || 0) + (successBooking.depositPaid || 0))}
              </span>
            </div>
          </div>

          {/* WhatsApp automated status banner */}
          <div
            className={cn(
              'rounded-xl border p-3 flex items-start gap-2.5 text-xs',
              isDaylight
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
            )}
          >
            <MessageSquare className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-xs">WhatsApp Booking Notification Dispatched</div>
              <div className="text-[11px] opacity-85">
                Sent to <strong>+91 {successBooking.customer.phone}</strong> with confirmation details & PDF voucher.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const msg = getBookingWhatsAppMessage(successBooking, transactionRef);
                  openWhatsAppCirculation(successBooking.customer.phone, msg);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Open in WhatsApp</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => {
                  printBookingConfirmationPdf({
                    booking: successBooking,
                    advancePaid: successBooking.advancePaid,
                    depositPaid: successBooking.depositPaid,
                    paymentMode,
                    transactionRef,
                  });
                }}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border font-bold text-xs transition-colors cursor-pointer',
                  isDaylight
                    ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                    : 'border-amber-700/50 bg-amber-900/20 text-amber-300 hover:bg-amber-900/30'
                )}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onPaymentCollected(successBooking);
                setSuccessBooking(null);
                onClose();
              }}
              className={cn(
                'w-full py-2.5 rounded-xl font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm',
                isDaylight
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
              )}
            >
              <span>Done & Proceed to Handover</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={cn(
          'w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border shadow-2xl transition-all',
          isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#1e1e1e] border-slate-800 text-slate-100'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between px-6 py-4 border-b',
            isDaylight ? 'border-slate-100 bg-amber-50/60' : 'border-slate-800 bg-amber-950/20'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base">
                Collect Payment Before Dispatch
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Booking Ref: <span className="text-amber-600 font-bold">{booking.bookingNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
        <form onSubmit={handleCollectAndProceed} className="p-6 space-y-5">
          {/* Policy Callout */}
          <div
            className={cn(
              'p-3.5 rounded-xl border text-xs flex items-start gap-2.5',
              isDaylight
                ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
            )}
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong className="font-bold">Zero-Open-Credit Policy Barrier (SOP-003):</strong>
              <p className="text-[11px] mt-0.5 opacity-90">
                Machinery cannot be released for yard handover until both the <strong>Advance Rent</strong> and <strong>Security Deposit</strong> have been collected in full.
              </p>
            </div>
          </div>

          {/* Machine & Customer Details Pill */}
          <div
            className={cn(
              'p-3.5 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs',
              isDaylight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
            )}
          >
            <div>
              <span className={cn('text-[10px] uppercase font-bold block', isDaylight ? 'text-slate-600' : 'text-slate-400')}>Machine & Tag</span>
              <span className={cn('font-bold block mt-0.5 text-sm', isDaylight ? 'text-slate-950 font-extrabold' : 'text-white')}>{booking.asset.name}</span>
              <span className="font-mono text-[11px] text-amber-600 font-bold">{booking.asset.assetTag}</span>
            </div>
            <div>
              <span className={cn('text-[10px] uppercase font-bold block', isDaylight ? 'text-slate-600' : 'text-slate-400')}>Customer</span>
              <span className={cn('font-bold block mt-0.5 text-sm', isDaylight ? 'text-slate-950 font-extrabold' : 'text-white')}>{booking.customer.fullName}</span>
              <span className={cn('font-mono text-[11px]', isDaylight ? 'text-slate-600 font-medium' : 'text-slate-500')}>{booking.customer.phone}</span>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div
            className={cn(
              'rounded-xl border overflow-hidden text-xs',
              isDaylight ? 'border-slate-200' : 'border-slate-800'
            )}
          >
            <div
              className={cn(
                'px-4 py-2 border-b font-bold text-[11px] uppercase tracking-wider',
                isDaylight ? 'bg-slate-100 text-slate-700' : 'bg-slate-900 text-slate-400'
              )}
            >
              Collection Breakdown
            </div>
            <div className={cn('divide-y', isDaylight ? 'divide-slate-200' : 'divide-slate-800')}>
              <div className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className={cn('font-bold', isDaylight ? 'text-slate-900' : 'text-slate-200')}>1. Advance Rental</span>
                  <div className={cn('text-[10px]', isDaylight ? 'text-slate-600 font-medium' : 'text-slate-500')}>Paid: {formatINR(advancePaid)}</div>
                </div>
                <div className="text-right font-mono font-bold text-amber-600">
                  {formatINR(advanceDue)}
                </div>
              </div>

              <div className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className={cn('font-bold', isDaylight ? 'text-slate-900' : 'text-slate-200')}>2. Security Deposit (Refundable)</span>
                  <div className={cn('text-[10px]', isDaylight ? 'text-slate-600 font-medium' : 'text-slate-500')}>Paid: {formatINR(depositPaid)}</div>
                </div>
                <div className="text-right font-mono font-bold text-purple-600">
                  {formatINR(depositDue)}
                </div>
              </div>

              <div
                className={cn(
                  'px-4 py-3 flex items-center justify-between font-black text-sm',
                  isDaylight ? 'bg-emerald-50 text-emerald-950 border-t border-emerald-200' : 'bg-emerald-950/20 text-emerald-300'
                )}
              >
                <span>Total Amount to Collect Now</span>
                <span className="font-mono text-base font-black">{formatINR(totalDue)}</span>
              </div>
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div className="space-y-2">
            <label className={cn('block text-xs font-bold uppercase tracking-wide', isDaylight ? 'text-slate-700' : 'text-slate-400')}>
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('UPI')}
                className={cn(
                  'p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer',
                  paymentMode === 'UPI'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 shadow-sm'
                    : isDaylight
                    ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800'
                )}
              >
                <Smartphone className="h-4 w-4" />
                <span>UPI Payment</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('CASH')}
                className={cn(
                  'p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer',
                  paymentMode === 'CASH'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 shadow-sm'
                    : isDaylight
                    ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800'
                )}
              >
                <Banknote className="h-4 w-4" />
                <span>Cash at Desk</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('BANK_TRANSFER')}
                className={cn(
                  'p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer',
                  paymentMode === 'BANK_TRANSFER'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 shadow-sm'
                    : isDaylight
                    ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800'
                )}
              >
                <Building2 className="h-4 w-4" />
                <span>Bank IMPS</span>
              </button>
            </div>
          </div>

          {/* Mode Details */}
          {paymentMode === 'UPI' && (
            <div
              className={cn(
                'p-4 rounded-xl border flex flex-col sm:flex-row items-center gap-4 text-xs',
                isDaylight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              )}
            >
              <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                <img
                  src={upiQrUrl}
                  alt="UPI Payment QR Code"
                  className="w-24 h-24 object-contain"
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className={cn('flex items-center gap-1.5 font-bold', isDaylight ? 'text-slate-900' : 'text-slate-200')}>
                  <QrCode className="h-4 w-4 text-amber-500" />
                  <span>Scan via PhonePe / GPay / Paytm / BHIM</span>
                </div>
                <div className={cn('text-[11px] font-mono', isDaylight ? 'text-slate-700' : 'text-slate-400')}>
                  VPA: <strong className={isDaylight ? 'text-slate-950 font-bold' : 'text-slate-300'}>equipgrid@upi</strong>
                </div>
                <div className={cn('text-[11px] font-mono', isDaylight ? 'text-slate-700' : 'text-slate-400')}>
                  Payee: <strong className={isDaylight ? 'text-slate-950 font-bold' : 'text-slate-200'}>EquipGrid Agro and Civil Rentals</strong>
                </div>
                <div className="text-[11px] text-amber-600 font-bold">
                  Amount: {formatINR(totalDue)}
                </div>
              </div>
            </div>
          )}

          {/* Reference / UTR Input */}
          <div className="space-y-1">
            <label className={cn('block text-xs font-bold uppercase tracking-wide', isDaylight ? 'text-slate-700' : 'text-slate-400')}>
              {paymentMode === 'UPI' ? 'UPI UTR / Reference Number' : paymentMode === 'CASH' ? 'Receipt Voucher / Cash Note' : 'Bank Reference ID'}
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder={
                paymentMode === 'UPI'
                  ? 'e.g. 12-digit UTR 328409182390 (or leave blank to auto-generate)'
                  : paymentMode === 'CASH'
                  ? 'e.g. Cash collected by Yard Manager'
                  : 'e.g. IMPS/NEFT transaction ref'
              }
              className={cn(
                'w-full rounded-lg border px-3.5 py-2 text-xs focus:outline-none transition-colors font-mono',
                isDaylight
                  ? 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                  : 'border-slate-700 bg-slate-950 text-white focus:border-amber-500'
              )}
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={cn(
                'px-4 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                isDaylight
                  ? 'border border-slate-300 text-slate-600 hover:bg-slate-100'
                  : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
              )}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
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
                  <span>Recording Payment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Record Payment & Proceed to Handover</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

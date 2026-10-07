import React, { useState } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  Send,
  X,
  Printer,
  ShieldCheck,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { openWhatsAppCirculation, copyMessageToClipboard } from '../services/whatsappCirculation';

interface WhatsAppCirculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  recipientName: string;
  recipientPhone: string;
  bookingNumber: string;
  message: string;
  stageName: 'Booking Confirmation' | 'Yard Dispatch Handover' | 'Return Settlement';
  onPrintPdf?: () => void;
  pdfButtonLabel?: string;
}

export const WhatsAppCirculationModal: React.FC<WhatsAppCirculationModalProps> = ({
  isOpen,
  onClose,
  title,
  recipientName,
  recipientPhone,
  bookingNumber,
  message,
  stageName,
  onPrintPdf,
  pdfButtonLabel = 'Print / Save PDF Voucher',
}) => {
  const { isDaylight } = useTheme();
  const [phone, setPhone] = useState(recipientPhone);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const ok = await copyMessageToClipboard(message);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendWhatsApp = () => {
    openWhatsAppCirculation(phone || recipientPhone, message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDaylight ? 'border-slate-200 bg-emerald-50/60' : 'border-slate-800 bg-emerald-950/30'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                {title || `Circulate ${stageName} on WhatsApp`}
              </h3>
              <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                Booking Ref: {bookingNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
              isDaylight
                ? 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Automated System Status Banner */}
          <div
            className={`rounded-xl border p-3 flex items-start gap-2.5 ${
              isDaylight
                ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                : 'border-emerald-800/40 bg-emerald-950/30 text-emerald-300'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-[11px]">Automated WhatsApp Notification Triggered</div>
              <div className="text-[11px] opacity-85">
                Backend bot dispatcher queued this update. You can also manually circulate or resend via WhatsApp below.
              </div>
            </div>
          </div>

          {/* Recipient Details */}
          <div
            className={`p-3.5 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3 ${
              isDaylight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
            }`}
          >
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Recipient Customer
              </label>
              <div className="font-bold text-sm text-slate-900 dark:text-white">{recipientName}</div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                WhatsApp Phone Number
              </label>
              <div className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className={`w-full font-mono font-bold text-xs px-2 py-1 rounded border focus:outline-none ${
                    isDaylight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                      : 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                WhatsApp Message Preview
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-500 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy Text
                  </>
                )}
              </button>
            </div>

            <div
              className={`p-3.5 rounded-xl border font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto select-all ${
                isDaylight
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              {message}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-end gap-2.5 px-5 py-3.5 border-t ${
            isDaylight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'
          }`}
        >
          {onPrintPdf && (
            <button
              type="button"
              onClick={onPrintPdf}
              className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                isDaylight
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Printer className="h-3.5 w-3.5 text-amber-600" />
              <span>{pdfButtonLabel}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Open in WhatsApp</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </button>
        </div>
      </div>
    </div>
  );
};

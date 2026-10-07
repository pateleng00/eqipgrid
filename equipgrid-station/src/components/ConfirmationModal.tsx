import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';

export type ModalVariant = 'success' | 'error' | 'warning' | 'info';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: ModalVariant;
  title: string;
  message: string;
  /** Primary action button label. If omitted, only "Close" is shown. */
  confirmLabel?: string;
  onConfirm?: () => void;
  /** If true, show a cancel button alongside the confirm button. */
  showCancel?: boolean;
  cancelLabel?: string;
}

const VARIANT_CONFIG: Record<
  ModalVariant,
  {
    icon: React.ReactNode;
    iconBg: string;
    iconBgDark: string;
    accent: string;
    accentDark: string;
    confirmBtn: string;
    confirmBtnDark: string;
  }
> = {
  success: {
    icon: <CheckCircle2 className="h-6 w-6" />,
    iconBg: 'bg-emerald-100 text-emerald-600',
    iconBgDark: 'bg-emerald-900/40 text-emerald-400',
    accent: 'border-emerald-200',
    accentDark: 'border-emerald-800/50',
    confirmBtn: 'bg-emerald-500 hover:bg-emerald-400 text-white',
    confirmBtnDark: 'bg-emerald-700 hover:bg-emerald-600 text-white',
  },
  error: {
    icon: <XCircle className="h-6 w-6" />,
    iconBg: 'bg-rose-100 text-rose-600',
    iconBgDark: 'bg-rose-900/40 text-rose-400',
    accent: 'border-rose-200',
    accentDark: 'border-rose-800/50',
    confirmBtn: 'bg-rose-500 hover:bg-rose-400 text-white',
    confirmBtnDark: 'bg-rose-700 hover:bg-rose-600 text-white',
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6" />,
    iconBg: 'bg-amber-100 text-amber-600',
    iconBgDark: 'bg-amber-900/30 text-amber-400',
    accent: 'border-amber-200',
    accentDark: 'border-amber-800/50',
    confirmBtn: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black',
    confirmBtnDark: 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-black',
  },
  info: {
    icon: <Info className="h-6 w-6" />,
    iconBg: 'bg-blue-100 text-blue-600',
    iconBgDark: 'bg-blue-900/40 text-blue-400',
    accent: 'border-blue-200',
    accentDark: 'border-blue-800/50',
    confirmBtn: 'bg-blue-500 hover:bg-blue-400 text-white',
    confirmBtnDark: 'bg-blue-700 hover:bg-blue-600 text-white',
  },
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  variant = 'info',
  title,
  message,
  confirmLabel,
  onConfirm,
  showCancel = false,
  cancelLabel = 'Cancel',
}) => {
  const { isDaylight } = useTheme();

  if (!isOpen) return null;

  const cfg = VARIANT_CONFIG[variant];

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-4 sm:p-6 bg-black/55 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'w-full max-w-lg min-h-64 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border shadow-2xl p-7 sm:p-8 space-y-5 transition-colors animate-in fade-in zoom-in-95 duration-150',
          isDaylight
            ? `bg-white text-slate-950 ${cfg.accent}`
            : `bg-[#242424] text-slate-100 ${cfg.accentDark}`
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-xl shrink-0',
                isDaylight ? cfg.iconBg : cfg.iconBgDark
              )}
            >
              {cfg.icon}
            </div>
            <h3 className="text-base font-black leading-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className={cn(
              'p-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer',
              isDaylight
                ? 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                : 'border-slate-700 text-slate-500 hover:bg-slate-800 hover:text-slate-200'
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Message */}
        <p
          className={cn(
            'text-sm leading-relaxed',
            isDaylight ? 'text-slate-600' : 'text-slate-400'
          )}
        >
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          {showCancel && (
            <button
              onClick={onClose}
              className={cn(
                'px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors',
                isDaylight
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              )}
            >
              {cancelLabel}
            </button>
          )}

          {confirmLabel ? (
            <button
              onClick={handleConfirm}
              className={cn(
                'px-5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors',
                isDaylight ? cfg.confirmBtn : cfg.confirmBtnDark
              )}
            >
              {confirmLabel}
            </button>
          ) : (
            <button
              onClick={onClose}
              className={cn(
                'px-5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors',
                isDaylight
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
              )}
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

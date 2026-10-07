import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getStatusColor(status: string, isDaylight = false): { bg: string; text: string; border: string; dot: string } {
  if (isDaylight) {
    switch (status) {
      case 'AVAILABLE':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-900 font-bold',
          border: 'border-emerald-300',
          dot: 'bg-emerald-600',
        };
      case 'ON_RENT':
      case 'DISPATCHED':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-950 font-bold',
          border: 'border-amber-300',
          dot: 'bg-amber-600',
        };
      case 'CONFIRMED':
      case 'ALLOCATED':
      case 'DISPATCH_READY':
        return {
          bg: 'bg-sky-50',
          text: 'text-sky-950 font-bold',
          border: 'border-sky-300',
          dot: 'bg-sky-600',
        };
      case 'MAINTENANCE':
      case 'DAMAGED':
        return {
          bg: 'bg-rose-50',
          text: 'text-rose-950 font-bold',
          border: 'border-rose-300',
          dot: 'bg-rose-600',
        };
      case 'INSPECTION':
      case 'RETURN_PENDING':
      case 'RETURNED':
        return {
          bg: 'bg-purple-50',
          text: 'text-purple-950 font-bold',
          border: 'border-purple-300',
          dot: 'bg-purple-600',
        };
      case 'CLOSED':
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-800 font-bold',
          border: 'border-slate-300',
          dot: 'bg-slate-500',
        };
      default:
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-800 font-bold',
          border: 'border-slate-300',
          dot: 'bg-slate-500',
        };
    }
  }

  switch (status) {
    case 'AVAILABLE':
      return {
        bg: 'bg-emerald-950/30',
        text: 'text-emerald-300/80',
        border: 'border-emerald-800/40',
        dot: 'bg-emerald-500/60',
      };
    case 'ON_RENT':
    case 'DISPATCHED':
      return {
        bg: 'bg-amber-950/25',
        text: 'text-amber-300/80',
        border: 'border-amber-800/40',
        dot: 'bg-amber-500/60',
      };
    case 'CONFIRMED':
    case 'DISPATCH_READY':
      return {
        bg: 'bg-sky-950/25',
        text: 'text-sky-300/80',
        border: 'border-sky-800/40',
        dot: 'bg-sky-500/60',
      };
    case 'MAINTENANCE':
    case 'DAMAGED':
      return {
        bg: 'bg-rose-950/25',
        text: 'text-rose-300/80',
        border: 'border-rose-800/40',
        dot: 'bg-rose-500/60',
      };
    case 'INSPECTION':
    case 'RETURN_PENDING':
    case 'RETURNED':
      return {
        bg: 'bg-purple-950/25',
        text: 'text-purple-300/80',
        border: 'border-purple-800/40',
        dot: 'bg-purple-500/60',
      };
    case 'CLOSED':
      return {
        bg: 'bg-slate-900/60',
        text: 'text-slate-400',
        border: 'border-slate-800',
        dot: 'bg-slate-500',
      };
    default:
      return {
        bg: 'bg-slate-900/40',
        text: 'text-slate-400',
        border: 'border-slate-800',
        dot: 'bg-slate-500',
      };
  }
}

import React from 'react';
import {
  BarChart3,
  ArrowDownRight,
  ArrowUpRight,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Wallet,
  Banknote,
  Smartphone,
  Building2,
} from 'lucide-react';
import { formatINR } from '../../lib/utils';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';

export const DailyCashReconciliationView: React.FC = () => {
  const { isDaylight } = useTheme();
  const cashSheet = api.getDailyCash();

  const closingPosition = cashSheet.closingPosition;
  const isBalanced = cashSheet.reconciliationStatus === 'BALANCED';

  // Card helper
  const StatCard = ({
    label, value, sub, color, icon,
  }: {
    label: string;
    value: string;
    sub?: string;
    color: string;
    icon: React.ReactNode;
  }) => (
    <div className={cn('rounded-xl border p-2.5 sm:p-3 flex items-center justify-between gap-2', isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40')}>
      <div className="min-w-0">
        <div className={cn('text-[10px] font-black uppercase tracking-wider', isDaylight ? 'text-slate-500' : 'text-slate-400')}>{label}</div>
        <div className={cn('text-lg sm:text-xl font-black font-mono mt-0.5 truncate', color)}>{value}</div>
        {sub && <div className={cn('text-[10px] mt-0.5', isDaylight ? 'text-slate-400' : 'text-slate-500')}>{sub}</div>}
      </div>
      <div className={cn('p-2 rounded-lg shrink-0', isDaylight ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-slate-400')}>
        {icon}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">

      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <h2 className={cn('text-lg sm:text-xl font-black flex items-center gap-2', isDaylight ? 'text-slate-950' : 'text-white')}>
            <BarChart3 className={cn('h-5 w-5', isDaylight ? 'text-amber-700' : 'text-amber-400')} />
            End of Day Report
          </h2>
          <p className={cn('text-[11px] mt-0.5', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
            Daily cash balancing, receipts breakdown & DPR benchmark vs actuals
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Reconciliation status pill */}
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-black',
            isBalanced
              ? isDaylight
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50'
              : isDaylight
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-rose-900/30 text-rose-300 border-rose-700/50'
          )}>
            {isBalanced
              ? <><CheckCircle2 className="h-3.5 w-3.5" /> BALANCED</>
              : <><XCircle className="h-3.5 w-3.5" /> UNBALANCED</>
            }
          </span>
          <button
            onClick={() => window.print()}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold cursor-pointer transition-colors',
              isDaylight
                ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold shadow-xs'
                : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
            Export Statement
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-shrink-0">
        <StatCard
          label="Opening Float"
          value={formatINR(cashSheet.openingCash)}
          sub="Petty cash at 08:00 AM"
          color={isDaylight ? 'text-slate-900' : 'text-slate-100'}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Total Receipts"
          value={formatINR(cashSheet.totalReceipts)}
          sub="Deposits + Advances"
          color={isDaylight ? 'text-emerald-700' : 'text-emerald-400'}
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
        <StatCard
          label="Total Outflows"
          value={formatINR(cashSheet.totalExpenses + cashSheet.totalRefunds)}
          sub="Expenses + Refunds"
          color={isDaylight ? 'text-rose-600' : 'text-rose-400'}
          icon={<ArrowDownRight className="h-4 w-4" />}
        />
        <StatCard
          label="Closing Balance"
          value={formatINR(closingPosition)}
          sub="End of day position"
          color={isDaylight ? 'text-amber-700' : 'text-amber-400'}
          icon={<BarChart3 className="h-4 w-4" />}
        />
      </div>

      {/* Main — full width scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">

          {/* Receipts by mode */}
          <div className={cn('rounded-2xl border overflow-hidden', isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40')}>
            <div className={cn('px-5 py-3.5 border-b flex items-center gap-2', isDaylight ? 'border-slate-200' : 'border-slate-800')}>
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              <h3 className={cn('font-black text-sm', isDaylight ? 'text-slate-950' : 'text-white')}>Receipts by Mode</h3>
              <span className={cn('ml-auto font-mono font-black text-base', isDaylight ? 'text-emerald-700' : 'text-emerald-400')}>+{formatINR(cashSheet.totalReceipts)}</span>
            </div>
            <div className={cn('divide-y', isDaylight ? 'divide-slate-100' : 'divide-slate-800/50')}>
              {[
                { label: 'UPI Payments', sub: 'PhonePe / GPay / Paytm', value: cashSheet.upiReceipts, icon: <Smartphone className="h-4 w-4" />, color: isDaylight ? 'text-blue-700' : 'text-blue-400' },
                { label: 'Yard Cash Receipts', sub: 'Counter collections', value: cashSheet.cashReceipts, icon: <Banknote className="h-4 w-4" />, color: isDaylight ? 'text-emerald-700' : 'text-emerald-400' },
                { label: 'Bank / NEFT Transfer', sub: 'RTGS & direct transfer', value: cashSheet.bankReceipts, icon: <Building2 className="h-4 w-4" />, color: isDaylight ? 'text-purple-700' : 'text-purple-400' },
              ].map(({ label, sub, value, icon, color }) => (
                <div key={label} className={cn('flex items-center justify-between px-5 py-3.5', isDaylight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20')}>
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-xl', isDaylight ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-slate-400')}>{icon}</div>
                    <div>
                      <div className={cn('font-bold text-xs', isDaylight ? 'text-slate-800' : 'text-slate-200')}>{label}</div>
                      <div className={cn('text-[11px]', isDaylight ? 'text-slate-400' : 'text-slate-500')}>{sub}</div>
                    </div>
                  </div>
                  <span className={cn('font-mono font-extrabold text-sm', color)}>{formatINR(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Outflows */}
          <div className={cn('rounded-2xl border overflow-hidden', isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40')}>
            <div className={cn('px-5 py-3.5 border-b flex items-center gap-2', isDaylight ? 'border-slate-200' : 'border-slate-800')}>
              <ArrowDownRight className="h-4 w-4 text-rose-500" />
              <h3 className={cn('font-black text-sm', isDaylight ? 'text-slate-950' : 'text-white')}>Outflows & Deductions</h3>
              <span className={cn('ml-auto font-mono font-black text-base', isDaylight ? 'text-rose-600' : 'text-rose-400')}>−{formatINR(cashSheet.totalExpenses + cashSheet.totalRefunds)}</span>
            </div>
            <div className={cn('divide-y', isDaylight ? 'divide-slate-100' : 'divide-slate-800/50')}>
              {[
                { label: 'Yard Expenses', sub: 'Fuel, grease, consumables', value: cashSheet.totalExpenses },
                { label: 'Deposit Refunds Settled', sub: 'Released to customers post-return', value: cashSheet.totalRefunds },
              ].map(({ label, sub, value }) => (
                <div key={label} className={cn('flex items-center justify-between px-5 py-3.5', isDaylight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20')}>
                  <div>
                    <div className={cn('font-bold text-xs', isDaylight ? 'text-slate-800' : 'text-slate-200')}>{label}</div>
                    <div className={cn('text-[11px]', isDaylight ? 'text-slate-400' : 'text-slate-500')}>{sub}</div>
                  </div>
                  <span className={cn('font-mono font-extrabold text-sm', isDaylight ? 'text-rose-600' : 'text-rose-400')}>−{formatINR(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Closing formula row */}
          <div className={cn(
            'rounded-2xl border p-5 flex items-center justify-between',
            isDaylight
              ? 'border-amber-300 bg-amber-50'
              : 'border-amber-700/50 bg-gradient-to-r from-amber-900/20 via-slate-900 to-slate-950'
          )}>
            <div>
              <div className={cn('text-[11px] font-black uppercase tracking-wider', isDaylight ? 'text-amber-800' : 'text-amber-500')}>
                Closing Position Formula
              </div>
              <div className={cn('text-xs mt-1 font-mono', isDaylight ? 'text-slate-600' : 'text-slate-400')}>
                Opening ({formatINR(cashSheet.openingCash)}) + Receipts ({formatINR(cashSheet.totalReceipts)}) − Outflows ({formatINR(cashSheet.totalExpenses + cashSheet.totalRefunds)})
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className={cn('text-[11px] font-bold uppercase', isDaylight ? 'text-amber-700' : 'text-amber-500')}>Closing Balance</div>
              <div className={cn('text-2xl font-black font-mono', isDaylight ? 'text-amber-700' : 'text-amber-400')}>
                {formatINR(closingPosition)}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

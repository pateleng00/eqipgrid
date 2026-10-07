import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Search,
  Banknote,
  Smartphone,
  Building2,
} from 'lucide-react';
import { formatINR, formatDate } from '../../lib/utils';
import { SearchSelect } from '../../components/SearchSelect';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { Payment } from '../../types';
import { cn } from '../../lib/utils';

const PAYMENT_TYPE_STYLE: Record<string, { label: string; color: string; darkColor: string; isCredit: boolean }> = {
  DEPOSIT:          { label: 'Deposit',          color: 'bg-blue-100 text-blue-800 border-blue-300',     darkColor: 'bg-blue-900/30 text-blue-300 border-blue-800/50',    isCredit: true },
  ADVANCE:          { label: 'Advance Rent',      color: 'bg-amber-100 text-amber-800 border-amber-300',  darkColor: 'bg-amber-900/30 text-amber-300 border-amber-700/50', isCredit: true },
  FINAL_SETTLEMENT: { label: 'Final Settlement',  color: 'bg-emerald-100 text-emerald-800 border-emerald-300', darkColor: 'bg-emerald-900/30 text-emerald-300 border-emerald-800/50', isCredit: true },
  DAMAGE_CHARGE:    { label: 'Damage Charge',     color: 'bg-rose-100 text-rose-800 border-rose-300',     darkColor: 'bg-rose-900/30 text-rose-300 border-rose-800/50',    isCredit: true },
  REFUND:           { label: 'Refund',            color: 'bg-purple-100 text-purple-800 border-purple-300', darkColor: 'bg-purple-900/30 text-purple-300 border-purple-800/50', isCredit: false },
};

const PAYMENT_MODE_ICON: Record<string, React.ReactNode> = {
  UPI:           <Smartphone className="h-3 w-3" />,
  CASH:          <Banknote className="h-3 w-3" />,
  BANK_TRANSFER: <Building2 className="h-3 w-3" />,
};

export const PaymentLedgerView: React.FC = () => {
  const { isDaylight } = useTheme();
  const allPayments = api.payments;
  const allBookings = api.bookings;
  const states = api.getStates();
  const cities = api.getCities();
  const hubs = api.getHubs();

  const [selectedStateId, setSelectedStateId] = useState<string>('ALL');
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

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

  const filteredPayments = useMemo(() => {
    return allPayments.filter((p) => {
      const booking = allBookings.find((b) => b.id === p.bookingId);
      if (booking) {
        const hub = hubs.find((h) => h.id === booking.asset.hubId);
        const city = cities.find((c) => c.id === hub?.cityId);
        if (selectedStateId !== 'ALL' && city?.stateId !== Number(selectedStateId)) return false;
        if (selectedCityId !== 'ALL' && hub?.cityId !== Number(selectedCityId)) return false;
        if (selectedHubId !== 'ALL' && booking.asset.hubId !== Number(selectedHubId)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRef = p.transactionRef?.toLowerCase().includes(q);
        const matchBooking = p.bookingNumber?.toLowerCase().includes(q);
        const matchCustomer = p.customerName?.toLowerCase().includes(q);
        if (!matchRef && !matchBooking && !matchCustomer) return false;
      }
      return true;
    });
  }, [allPayments, allBookings, hubs, cities, selectedStateId, selectedCityId, selectedHubId, searchQuery]);

  const [visibleCount, setVisibleCount] = useState<number>(7);

  // Reset to initial 7 items when filters change
  React.useEffect(() => {
    setVisibleCount(7);
  }, [selectedStateId, selectedCityId, selectedHubId, searchQuery]);

  // Infinite scroll slice (most recent first, default 7 items, loads +7 on scroll)
  const visiblePayments = useMemo(() => {
    const reversed = [...filteredPayments].reverse();
    return reversed.slice(0, visibleCount);
  }, [filteredPayments, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 60) {
      if (visibleCount < filteredPayments.length) {
        setVisibleCount((prev) => Math.min(prev + 7, filteredPayments.length));
      }
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 7, filteredPayments.length));
  };

  // Totals
  const totalCollected = filteredPayments
    .filter((p) => PAYMENT_TYPE_STYLE[p.paymentType]?.isCredit !== false)
    .reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = filteredPayments
    .filter((p) => p.paymentType === 'REFUND')
    .reduce((sum, p) => sum + p.amount, 0);
  const netBalance = totalCollected - totalRefunded;

  const resetFilters = () => {
    setSelectedStateId('ALL');
    setSelectedCityId('ALL');
    setSelectedHubId('ALL');
    setSearchQuery('');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className={cn('text-lg sm:text-xl font-black flex items-center gap-2', isDaylight ? 'text-slate-950' : 'text-white')}>
            <CreditCard className={cn('h-5 w-5', isDaylight ? 'text-amber-700' : 'text-emerald-400')} />
            Payments & Ledger
          </h2>
          <p className={cn('text-[11px] mt-0.5', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
            Append-only transaction ledger — payments are recorded at Booking, Dispatch, and Return stages
          </p>
        </div>
        <button
          onClick={() => setShowQrModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-sm cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <QrCode className="h-4 w-4" />
          Merchant UPI QR
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-shrink-0">
        {[
          { label: 'Total Collected', value: formatINR(totalCollected), color: isDaylight ? 'text-emerald-700' : 'text-emerald-400', icon: <ArrowUpRight className="h-4 w-4" /> },
          { label: 'Total Refunded', value: formatINR(totalRefunded), color: isDaylight ? 'text-rose-600' : 'text-rose-400', icon: <ArrowDownLeft className="h-4 w-4" /> },
          { label: 'Net Balance', value: formatINR(netBalance), color: isDaylight ? 'text-slate-950' : 'text-white', icon: <CreditCard className="h-4 w-4" /> },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn('rounded-xl border p-2.5 sm:p-3 flex items-center justify-between', isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40')}
          >
            <div>
              <div className={cn('text-[10px] font-bold uppercase tracking-wider', isDaylight ? 'text-slate-500' : 'text-slate-400')}>{stat.label}</div>
              <div className={cn('text-lg sm:text-xl font-black font-mono mt-0.5', stat.color)}>{stat.value}</div>
            </div>
            <div className={cn('p-2 rounded-lg', isDaylight ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-slate-400')}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={cn('flex-shrink-0 p-2.5 rounded-xl border transition-colors', isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40')}>
        <div className="flex items-center justify-end mb-1.5">
          <button
            onClick={resetFilters}
            className={cn('text-[11px] font-bold flex items-center gap-1 cursor-pointer', isDaylight ? 'text-amber-800 hover:text-amber-950' : 'text-slate-400 hover:text-slate-200')}
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ref, booking, customer..."
              className={cn(
                'w-full rounded-lg border pl-8 pr-3 py-1.5 text-xs focus:outline-none transition-colors',
                isDaylight
                  ? 'border-slate-300 bg-white text-slate-950 placeholder-slate-400 focus:border-amber-500'
                  : 'border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:border-amber-500'
              )}
            />
          </div>
        </div>
      </div>

      {/* Ledger Table — read-only */}
      <div className={cn('flex-1 min-h-0 rounded-2xl border overflow-hidden flex flex-col', isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40')}>
        <div className={cn('px-3.5 py-2 border-b flex items-center justify-between flex-shrink-0', isDaylight ? 'border-slate-200' : 'border-slate-800/60')}>
          <div className="flex items-center gap-2">
            <CreditCard className={cn('h-4 w-4', isDaylight ? 'text-amber-700' : 'text-emerald-400')} />
            <h3 className={cn('font-black text-xs sm:text-sm', isDaylight ? 'text-slate-950' : 'text-white')}>
              Transaction History
            </h3>
          </div>
          <span className={cn('text-[11px] font-mono font-bold', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
            {filteredPayments.length} transactions
          </span>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="flex-1 min-h-0 p-8 text-center flex flex-col items-center justify-center space-y-1.5">
            <CreditCard className="h-7 w-7 mx-auto opacity-25 text-slate-500" />
            <p className={cn('text-xs font-bold', isDaylight ? 'text-slate-500' : 'text-slate-400')}>No transactions found</p>
            <p className="text-[11px] text-slate-500">Payments are recorded when bookings are confirmed, dispatched, and returned.</p>
          </div>
        ) : (
          <div
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-x-auto overflow-y-auto"
          >
            <table className="w-full text-left text-xs">
              <thead className={cn('sticky top-0 z-10 border-b text-[11px] font-black uppercase tracking-wider', isDaylight ? 'border-slate-300 bg-slate-100 text-slate-800 shadow-xs' : 'border-slate-800 bg-slate-950 text-slate-300 shadow-xs')}>
                <tr>
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Booking / Customer</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className={cn('divide-y', isDaylight ? 'divide-slate-100' : 'divide-slate-800/50')}>
                {visiblePayments.map((p) => {
                  const typeStyle = PAYMENT_TYPE_STYLE[p.paymentType];
                  const isRefund = p.paymentType === 'REFUND';
                  return (
                    <tr
                      key={p.id}
                      className={cn('transition-colors', isDaylight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20')}
                    >
                      {/* Transaction ref */}
                      <td className="py-3.5 px-4">
                        <div className={cn('font-mono font-bold text-xs', isDaylight ? 'text-slate-800' : 'text-slate-200')}>
                          {p.transactionRef || '—'}
                        </div>
                        {p.notes && (
                          <div className={cn('text-[10px] mt-0.5 truncate max-w-[160px]', isDaylight ? 'text-slate-400' : 'text-slate-500')}>
                            {p.notes}
                          </div>
                        )}
                      </td>

                      {/* Booking / Customer */}
                      <td className="py-3.5 px-4">
                        <div className={cn('font-mono font-bold text-[11px]', isDaylight ? 'text-amber-700' : 'text-amber-400')}>
                          {p.bookingNumber}
                        </div>
                        <div className={cn('font-medium mt-0.5', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                          {p.customerName || '—'}
                        </div>
                      </td>

                      {/* Payment type badge */}
                      <td className="py-3.5 px-4">
                        <span className={cn(
                          'inline-block text-[10px] font-bold px-2 py-0.5 rounded border',
                          isDaylight ? typeStyle?.color : typeStyle?.darkColor
                        )}>
                          {typeStyle?.label || p.paymentType}
                        </span>
                      </td>

                      {/* Mode */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(isDaylight ? 'text-slate-500' : 'text-slate-400')}>
                            {PAYMENT_MODE_ICON[p.paymentMode] || null}
                          </span>
                          <span className={cn('font-mono text-[11px] font-bold', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                            {p.paymentMode}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4">
                        <div className={cn('text-[11px] font-mono', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
                          {formatDate(p.createdAt)}
                        </div>
                      </td>

                      {/* Amount — red for refunds, green for inflows */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isRefund
                            ? <ArrowDownLeft className="h-3.5 w-3.5 text-rose-500" />
                            : <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                          }
                          <span className={cn(
                            'font-mono font-extrabold text-sm',
                            isRefund
                              ? (isDaylight ? 'text-rose-600' : 'text-rose-400')
                              : (isDaylight ? 'text-emerald-700' : 'text-emerald-400')
                          )}>
                            {isRefund ? '−' : '+'}{formatINR(p.amount)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer totals row */}
              <tfoot>
                <tr className={cn('border-t-2 font-black text-sm', isDaylight ? 'border-slate-300 bg-slate-100/60' : 'border-slate-700 bg-slate-950/60')}>
                  <td colSpan={5} className="py-3 px-4">
                    <span className={cn('text-xs uppercase tracking-wider font-black', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
                      Net Balance ({filteredPayments.length} txns)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={cn('font-mono font-extrabold text-base', isDaylight ? 'text-slate-950' : 'text-white')}>
                      {formatINR(netBalance)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Infinite Scroll Footer */}
        {filteredPayments.length > 0 && (
          <InfiniteScrollFooter
            loadedCount={visiblePayments.length}
            totalCount={filteredPayments.length}
            onLoadMore={handleLoadMore}
            itemName="transactions"
          />
        )}
      </div>

      {/* UPI QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className={cn('w-full max-w-lg min-h-80 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border p-7 sm:p-8 space-y-5 text-center', isDaylight ? 'bg-white border-slate-200 text-slate-950' : 'bg-[#242424] border-emerald-500/25 text-white')}>
            <div className={cn('flex items-center justify-between border-b pb-4', isDaylight ? 'border-slate-200' : 'border-slate-700/50')}>
              <h3 className={cn('text-lg font-black', isDaylight ? 'text-slate-950' : 'text-white')}>EquipGrid Rental Desk UPI QR</h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                aria-label="Close UPI QR dialog"
                className={cn('rounded-lg border p-2 transition-colors cursor-pointer', isDaylight ? 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-800' : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-100')}
              >
                ✕
              </button>
            </div>
            <p className={cn('text-xs', isDaylight ? 'text-slate-600' : 'text-slate-400')}>UPI VPA: <span className="font-mono text-amber-600 font-bold">equipgrid@icici</span></p>
            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl bg-white p-3 shadow-inner border border-slate-200">
              <div className="grid grid-cols-6 grid-rows-6 gap-1 h-full w-full bg-slate-900 p-2 rounded">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn('rounded-xs', (i % 2 === 0 && i % 3 === 0) || i < 8 || i > 28 ? 'bg-amber-400' : 'bg-white')}
                  />
                ))}
              </div>
            </div>
            <p className={cn('text-[11px]', isDaylight ? 'text-slate-500' : 'text-slate-400')}>Supports PhonePe, Google Pay, Paytm, BHIM.</p>
            <button
              onClick={() => setShowQrModal(false)}
              className={cn('w-full py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer', isDaylight ? 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200' : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white')}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

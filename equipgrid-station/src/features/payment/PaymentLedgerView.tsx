import React, { useState, useMemo, useEffect } from 'react';
import { getUrlParam, setUrlParam } from '../../lib/navigationState';
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
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Check,
  Copy,
  DollarSign,
  ShieldCheck,
  ExternalLink,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { formatINR, formatDate } from '../../lib/utils';
import { SearchSelect, SelectOption } from '../../components/SearchSelect';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';
import { useTheme } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../services/api';
import { Payment, PaymentProof, RefundTransaction, PaymentType } from '../../types';
import { cn } from '../../lib/utils';

const PAYMENT_LEDGER_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'ADVANCE', label: 'Advance Rent (अग्रिम किराया)', subLabel: 'Advance Rental Inflow' },
  { value: 'DEPOSIT', label: 'Security Deposit (सुरक्षा राशि)', subLabel: 'Refundable Security Deposit' },
  { value: 'FINAL_SETTLEMENT', label: 'Final Settlement (अंतिम निपटान)', subLabel: 'Post-Return Final Balance Settlement' },
];

const PAYMENT_TYPE_STYLE: Record<string, { label: string; color: string; darkColor: string; isCredit: boolean }> = {
  DEPOSIT: {
    label: 'Deposit',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    darkColor: 'bg-blue-900/30 text-blue-300 border-blue-800/50',
    isCredit: true,
  },
  ADVANCE: {
    label: 'Advance Rent',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    darkColor: 'bg-amber-900/30 text-amber-300 border-amber-700/50',
    isCredit: true,
  },
  FINAL_SETTLEMENT: {
    label: 'Final Settlement',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    darkColor: 'bg-emerald-900/30 text-emerald-300 border-emerald-800/50',
    isCredit: true,
  },
  DAMAGE_CHARGE: {
    label: 'Damage Charge',
    color: 'bg-rose-100 text-rose-800 border-rose-300',
    darkColor: 'bg-rose-900/30 text-rose-300 border-rose-800/50',
    isCredit: true,
  },
  REFUND: {
    label: 'Refund',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    darkColor: 'bg-purple-900/30 text-purple-300 border-purple-800/50',
    isCredit: false,
  },
};

const PAYMENT_MODE_ICON: Record<string, React.ReactNode> = {
  UPI: <Smartphone className="h-3 w-3" />,
  CASH: <Banknote className="h-3 w-3" />,
  BANK_TRANSFER: <Building2 className="h-3 w-3" />,
};

type LedgerSubTab = 'ledger' | 'proofs' | 'refunds';

export const PaymentLedgerView: React.FC = () => {
  const { isDaylight } = useTheme();
  const { currentUser } = useAuth();
  const allPayments = api.payments;
  const allBookings = api.bookings;
  const states = api.getStates();
  const cities = api.getCities();
  const hubs = api.getHubs();

  const [activeSubTab, setActiveSubTab] = useState<LedgerSubTab>('ledger');
  const [selectedStateId, setSelectedStateId] = useState<string>('ALL');
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQrModal, setShowQrModal] = useState<boolean>(() => getUrlParam('modal') === 'upi_qr');
  const [merchantQrDetails, setMerchantQrDetails] = useState<{
    payeeVpa: string;
    payeeName: string;
    amount: number;
    transactionNote: string;
    upiUri: string;
    qrCodeBase64: string;
    qrCodeImageUrl: string;
  } | null>(null);
  const [qrAmount, setQrAmount] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  const fetchMerchantQr = async (customAmount?: number) => {
    setQrLoading(true);
    try {
      const details = await api.getMerchantUpiDetails(customAmount);
      setMerchantQrDetails(details);
    } catch {
      const amountVal = customAmount || 0;
      setMerchantQrDetails({
        payeeVpa: '9984698008@upi',
        payeeName: 'Akash Kumar',
        amount: amountVal,
        transactionNote: 'EquipGrid Rental Desk Payment',
        upiUri: `upi://pay?pa=9984698008@upi&pn=Akash+Kumar&cu=INR${amountVal > 0 ? `&am=${amountVal}` : ''}`,
        qrCodeBase64: '',
        qrCodeImageUrl: `/equipgrid/whatsapp/qr/merchant${amountVal > 0 ? `?amount=${amountVal}` : ''}`,
      });
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    if (showQrModal && !merchantQrDetails) {
      fetchMerchantQr();
    }
  }, [showQrModal]);

  // Payment Proof Queue State
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [proofsLoading, setProofsLoading] = useState(false);
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [verifyAmount, setVerifyAmount] = useState<number>(0);
  const [verifyType, setVerifyType] = useState<PaymentType>('ADVANCE');
  const [verifyNotes, setVerifyNotes] = useState('Staff-verified payment proof against bank/UPI reconciliation');
  const [isVerifying, setIsVerifying] = useState(false);

  // Refund Queue State
  const [refunds, setRefunds] = useState<RefundTransaction[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundTransaction | null>(null);
  const [payoutRef, setPayoutRef] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const loadProofs = async () => {
    setProofsLoading(true);
    try {
      const list = await api.getPaymentProofs();
      setProofs(list);
    } catch {
      // fallback
    } finally {
      setProofsLoading(false);
    }
  };

  const loadRefunds = async () => {
    setRefundsLoading(true);
    try {
      const list = await api.getRefunds();
      setRefunds(list);
    } catch {
      // fallback
    } finally {
      setRefundsLoading(false);
    }
  };

  useEffect(() => {
    loadProofs();
    loadRefunds();
  }, []);

  const pendingProofsCount = useMemo(() => proofs.filter((p) => p.status === 'PENDING').length, [proofs]);
  const pendingRefundsCount = useMemo(() => refunds.filter((r) => r.status === 'PENDING').length, [refunds]);

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
          <h2
            className={cn(
              'text-lg sm:text-xl font-black flex items-center gap-2',
              isDaylight ? 'text-slate-950' : 'text-white',
            )}
          >
            <CreditCard className={cn('h-5 w-5', isDaylight ? 'text-amber-700' : 'text-emerald-400')} />
            Payments & Money (रुपये और हिसाब)
          </h2>
          <p className={cn('text-[11px] mt-0.5', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
            All money received via UPI & Cash during booking, dispatch, and returns (सभी भुगतान रिकॉर्ड)
          </p>
        </div>
        <button
          onClick={() => {
            setShowQrModal(true);
            setUrlParam('modal', 'upi_qr');
            setQrAmount('');
            fetchMerchantQr();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-sm cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <QrCode className="h-4 w-4" />
          Show UPI QR Code (QR कोड दिखाएं)
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-shrink-0">
        {[
          {
            label: 'Total Collected (कुल कमाई)',
            value: formatINR(totalCollected),
            color: isDaylight ? 'text-emerald-700' : 'text-emerald-400',
            icon: <ArrowUpRight className="h-4 w-4" />,
          },
          {
            label: 'Total Refunded (सिक्योरिटी वापसी)',
            value: formatINR(totalRefunded),
            color: isDaylight ? 'text-rose-600' : 'text-rose-400',
            icon: <ArrowDownLeft className="h-4 w-4" />,
          },
          {
            label: 'Net in Station (नेट बची राशि)',
            value: formatINR(netBalance),
            color: isDaylight ? 'text-slate-950' : 'text-white',
            icon: <CreditCard className="h-4 w-4" />,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn(
              'rounded-xl border p-2.5 sm:p-3 flex items-center justify-between',
              isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40',
            )}
          >
            <div>
              <div
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider',
                  isDaylight ? 'text-slate-500' : 'text-slate-400',
                )}
              >
                {stat.label}
              </div>
              <div className={cn('text-lg sm:text-xl font-black font-mono mt-0.5', stat.color)}>{stat.value}</div>
            </div>
            <div
              className={cn(
                'p-2 rounded-lg',
                isDaylight ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-slate-400',
              )}
            >
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Sub Tabs Switcher */}
      <div
        className={cn(
          'flex items-center gap-1.5 p-1 rounded-xl border flex-shrink-0',
          isDaylight ? 'border-slate-200 bg-slate-100' : 'border-slate-800 bg-slate-900/60',
        )}
      >
        <button
          onClick={() => setActiveSubTab('ledger')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
            activeSubTab === 'ledger'
              ? isDaylight
                ? 'bg-white text-slate-950 shadow-xs'
                : 'bg-slate-800 text-white shadow-xs'
              : isDaylight
                ? 'text-slate-600 hover:text-slate-950'
                : 'text-slate-400 hover:text-white',
          )}
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>Payment Records (भुगतान रिकॉर्ड)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('proofs')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
            activeSubTab === 'proofs'
              ? isDaylight
                ? 'bg-white text-slate-950 shadow-xs'
                : 'bg-slate-800 text-white shadow-xs'
              : isDaylight
                ? 'text-slate-600 hover:text-slate-950'
                : 'text-slate-400 hover:text-white',
          )}
        >
          <FileCheck className="h-3.5 w-3.5 text-amber-500" />
          <span>UPI Approvals (स्क्रीनशॉट जांच)</span>
          {pendingProofsCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
              {pendingProofsCount} PENDING
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              0
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('refunds')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
            activeSubTab === 'refunds'
              ? isDaylight
                ? 'bg-white text-slate-950 shadow-xs'
                : 'bg-slate-800 text-white shadow-xs'
              : isDaylight
                ? 'text-slate-600 hover:text-slate-950'
                : 'text-slate-400 hover:text-white',
          )}
        >
          <DollarSign className="h-3.5 w-3.5 text-purple-500" />
          <span>Refund Requests (सिक्योरिटी वापसी)</span>
          {pendingRefundsCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
              {pendingRefundsCount} PENDING
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              0
            </span>
          )}
        </button>
      </div>

      {/* Filters (only for transaction ledger) */}
      {activeSubTab === 'ledger' && (
        <div
          className={cn(
            'flex-shrink-0 p-2.5 rounded-xl border transition-colors',
            isDaylight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/40',
          )}
        >
          <div className="flex items-center justify-end mb-1.5">
            <button
              onClick={resetFilters}
              className={cn(
                'text-[11px] font-bold flex items-center gap-1 cursor-pointer',
                isDaylight ? 'text-amber-800 hover:text-amber-950' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
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
                    : 'border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:border-amber-500',
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. TRANSACTION LEDGER TAB */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'ledger' && (
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
              <p className={cn('text-xs font-bold', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
                No transactions found
              </p>
              <p className="text-[11px] text-slate-500">
                Payments are recorded when bookings are confirmed, dispatched, and returned.
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
                          <div
                            className={cn(
                              'font-mono font-bold text-xs',
                              isDaylight ? 'text-slate-800' : 'text-slate-200',
                            )}
                          >
                            {p.transactionRef || '—'}
                          </div>
                          {p.notes && (
                            <div
                              className={cn(
                                'text-[10px] mt-0.5 truncate max-w-[160px]',
                                isDaylight ? 'text-slate-400' : 'text-slate-500',
                              )}
                            >
                              {p.notes}
                            </div>
                          )}
                        </td>

                        {/* Booking / Customer */}
                        <td className="py-3.5 px-4">
                          <div
                            className={cn(
                              'font-mono font-bold text-[11px]',
                              isDaylight ? 'text-amber-700' : 'text-amber-400',
                            )}
                          >
                            {p.bookingNumber}
                          </div>
                          <div className={cn('font-medium mt-0.5', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                            {p.customerName || '—'}
                          </div>
                        </td>

                        {/* Payment type badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'inline-block text-[10px] font-bold px-2 py-0.5 rounded border',
                              isDaylight ? typeStyle?.color : typeStyle?.darkColor,
                            )}
                          >
                            {typeStyle?.label || p.paymentType}
                          </span>
                        </td>

                        {/* Mode */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(isDaylight ? 'text-slate-500' : 'text-slate-400')}>
                              {PAYMENT_MODE_ICON[p.paymentMode] || null}
                            </span>
                            <span
                              className={cn(
                                'font-mono text-[11px] font-bold',
                                isDaylight ? 'text-slate-700' : 'text-slate-300',
                              )}
                            >
                              {p.paymentMode}
                            </span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4">
                          <div
                            className={cn('text-[11px] font-mono', isDaylight ? 'text-slate-500' : 'text-slate-400')}
                          >
                            {formatDate(p.createdAt)}
                          </div>
                        </td>

                        {/* Amount — red for refunds, green for inflows */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isRefund ? (
                              <ArrowDownLeft className="h-3.5 w-3.5 text-rose-500" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                            <span
                              className={cn(
                                'font-mono font-extrabold text-sm',
                                isRefund
                                  ? isDaylight
                                    ? 'text-rose-600'
                                    : 'text-rose-400'
                                  : isDaylight
                                    ? 'text-emerald-700'
                                    : 'text-emerald-400',
                              )}
                            >
                              {isRefund ? '−' : '+'}
                              {formatINR(p.amount)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer totals row */}
                <tfoot>
                  <tr
                    className={cn(
                      'border-t-2 font-black text-sm',
                      isDaylight ? 'border-slate-300 bg-slate-100/60' : 'border-slate-700 bg-slate-950/60',
                    )}
                  >
                    <td colSpan={5} className="py-3 px-4">
                      <span
                        className={cn(
                          'text-xs uppercase tracking-wider font-black',
                          isDaylight ? 'text-slate-500' : 'text-slate-400',
                        )}
                      >
                        Net Balance ({filteredPayments.length} txns)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={cn(
                          'font-mono font-extrabold text-base',
                          isDaylight ? 'text-slate-950' : 'text-white',
                        )}
                      >
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
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. PAYMENT PROOF VERIFICATION QUEUE TAB */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'proofs' && (
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
              <FileCheck className="h-4 w-4 text-amber-500" />
              <div>
                <h3 className={cn('font-black text-xs sm:text-sm', isDaylight ? 'text-slate-950' : 'text-white')}>
                  Farmer Payment Proof Verification Queue
                </h3>
                <p className="text-[10px] text-slate-500">
                  Farmers submitting UPI transaction IDs/UTRs via WhatsApp require staff verification before booking
                  lock.
                </p>
              </div>
            </div>
            <button
              onClick={loadProofs}
              disabled={proofsLoading}
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className={cn('h-3 w-3', proofsLoading && 'animate-spin')} /> Refresh
            </button>
          </div>

          {proofs.length === 0 ? (
            <div className="flex-1 min-h-0 p-8 text-center flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mx-auto" />
              <p className={cn('text-xs font-bold', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                Payment Proof Queue is Clean
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm">
                No unverified farmer UPI/UTR payment proofs pending. When a farmer submits a UTR on WhatsApp, it appears
                here for bank reconciliation.
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
                    <th className="py-3 px-4">Submitted Ref / UTR</th>
                    <th className="py-3 px-4">Farmer / Phone</th>
                    <th className="py-3 px-4">Booking / Machine</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Submission Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={cn('divide-y', isDaylight ? 'divide-slate-100' : 'divide-slate-800/50')}>
                  {proofs.map((proof) => {
                    const isPending = proof.status === 'PENDING';
                    const booking = proof.booking || allBookings.find((b) => b.id === (proof as any).bookingId);
                    return (
                      <tr
                        key={proof.id}
                        className={cn('transition-colors', isDaylight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20')}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {proof.submittedReference || '—'}
                            </span>
                            {proof.submittedReference && (
                              <button
                                onClick={() => copyToClipboard(proof.submittedReference)}
                                title="Copy UTR Reference"
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                              >
                                {copiedRef === proof.submittedReference ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {booking?.customer?.fullName || 'Walk-in Farmer'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{booking?.customer?.phone || '—'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                            {booking?.bookingNumber}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            {booking?.asset?.name} ({booking?.asset?.assetTag})
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-xs text-slate-900 dark:text-white">
                          {booking ? formatINR(booking.totalAmount) : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border',
                              isPending
                                ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/50',
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                isPending ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500',
                              )}
                            />
                            {proof.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {formatDate(proof.submittedAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isPending ? (
                            <button
                              onClick={() => {
                                setSelectedProof(proof);
                                setVerifyAmount(booking?.totalAmount || 0);
                                setVerifyType('ADVANCE');
                                setVerifyNotes('Verified UPI/bank credit from WhatsApp proof');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-sm cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Verify & Credit
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                              Verified by {proof.verifiedBy || 'Staff'}
                            </span>
                          )}
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
      {/* 3. REFUND SETTLEMENT QUEUE TAB */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'refunds' && (
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
              <DollarSign className="h-4 w-4 text-purple-500" />
              <div>
                <h3 className={cn('font-black text-xs sm:text-sm', isDaylight ? 'text-slate-950' : 'text-white')}>
                  Deposit Refund Settlement Queue
                </h3>
                <p className="text-[10px] text-slate-500">
                  Security deposits pending refund back to farmers after yard inspection completion.
                </p>
              </div>
            </div>
            <button
              onClick={loadRefunds}
              disabled={refundsLoading}
              className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className={cn('h-3 w-3', refundsLoading && 'animate-spin')} /> Refresh
            </button>
          </div>

          {refunds.length === 0 ? (
            <div className="flex-1 min-h-0 p-8 text-center flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mx-auto" />
              <p className={cn('text-xs font-bold', isDaylight ? 'text-slate-700' : 'text-slate-300')}>
                No Refunds in Queue
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm">
                When a return inspection completes with refundable security deposit, it automatically appears here for
                payout processing.
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
                    <th className="py-3 px-4">Booking / Customer</th>
                    <th className="py-3 px-4">Machine</th>
                    <th className="py-3 px-4">Refund Amount</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Initiated Date</th>
                    <th className="py-3 px-4">Payout Ref</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={cn('divide-y', isDaylight ? 'divide-slate-100' : 'divide-slate-800/50')}>
                  {refunds.map((refund) => {
                    const isPending = refund.status === 'PENDING';
                    const booking = refund.booking;
                    return (
                      <tr
                        key={refund.id}
                        className={cn('transition-colors', isDaylight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/20')}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-amber-700 dark:text-amber-400">
                            {booking?.bookingNumber}
                          </div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {booking?.customer?.fullName || 'Farmer'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{booking?.customer?.phone}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{booking?.asset?.name}</div>
                          <div className="font-mono text-[10px] text-slate-500">{booking?.asset?.assetTag}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                          {formatINR(refund.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[11px] max-w-[180px] truncate">
                          {refund.reason || 'Return inspection settlement'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border',
                              isPending
                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                isPending ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500',
                              )}
                            />
                            {refund.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {formatDate(refund.initiatedAt)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {refund.paymentReference || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isPending ? (
                            <button
                              onClick={() => {
                                setSelectedRefund(refund);
                                setPayoutRef(`UPI/REF-${Date.now().toString().slice(-6)}`);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-sm cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                              Mark Refunded
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                              Completed {formatDate(refund.completedAt || '')}
                            </span>
                          )}
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

      {/* Verify Proof Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-3 overflow-y-auto">
          <div
            className={cn(
              'w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-2xl',
              isDaylight ? 'bg-white border-slate-200 text-slate-950' : 'bg-[#242424] border-emerald-500/30 text-white',
            )}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="text-base font-black">Verify Farmer Payment Proof</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border p-3 text-xs space-y-1.5 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Submitted Reference (UTR):</span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                  {selectedProof.submittedReference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Booking Number:</span>
                <span className="font-mono font-bold">{selectedProof.booking?.bookingNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Farmer Name:</span>
                <span className="font-bold">{selectedProof.booking?.customer?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Machine:</span>
                <span>{selectedProof.booking?.asset?.name}</span>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsVerifying(true);
                try {
                  await api.verifyPaymentProof(selectedProof.id, {
                    amount: verifyAmount,
                    paymentType: verifyType,
                    verifiedBy: currentUser?.name || 'STATION_STAFF',
                    notes: verifyNotes,
                  });
                  await loadProofs();
                  setSelectedProof(null);
                } catch (err: any) {
                  alert(err.message || 'Payment proof verification failed');
                } finally {
                  setIsVerifying(false);
                }
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold mb-1">Verified Amount (₹ INR)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={verifyAmount}
                  onChange={(e) => setVerifyAmount(Number(e.target.value))}
                  className="w-full rounded-xl border p-2.5 text-sm font-mono font-bold focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Payment Ledger Category</label>
                <SearchSelect
                  options={PAYMENT_LEDGER_CATEGORY_OPTIONS}
                  value={verifyType}
                  onChange={(val) => setVerifyType((val || 'ADVANCE') as PaymentType)}
                  isClearable={false}
                  isSearchable={false}
                  placeholder="Select payment category..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Verification Audit Notes</label>
                <textarea
                  rows={2}
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full rounded-xl border p-2 text-xs focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProof(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {isVerifying ? 'Verifying...' : 'Confirm Verification & Credit Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Refund Complete Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-3 overflow-y-auto">
          <div
            className={cn(
              'w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-2xl',
              isDaylight ? 'bg-white border-slate-200 text-slate-950' : 'bg-[#242424] border-purple-500/30 text-white',
            )}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-500" />
                <h3 className="text-base font-black">Complete Deposit Refund</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRefund(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border p-3 text-xs space-y-1.5 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Refund Amount to Farmer:</span>
                <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                  {formatINR(selectedRefund.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Farmer:</span>
                <span className="font-bold">
                  {selectedRefund.booking?.customer?.fullName} ({selectedRefund.booking?.customer?.phone})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Booking Number:</span>
                <span className="font-mono font-bold">{selectedRefund.booking?.bookingNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Settlement Reason:</span>
                <span>{selectedRefund.reason}</span>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!payoutRef.trim()) return;
                setIsRefunding(true);
                try {
                  await api.completeRefund(selectedRefund.id, {
                    paymentReference: payoutRef.trim(),
                  });
                  await loadRefunds();
                  setSelectedRefund(null);
                  setPayoutRef('');
                } catch (err: any) {
                  alert(err.message || 'Refund completion failed');
                } finally {
                  setIsRefunding(false);
                }
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold mb-1">Bank / UPI Payout UTR Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UPI/REF-987654 or NEFT/UTR-12345678"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  className="w-full rounded-xl border p-2.5 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none dark:bg-slate-950"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Enter the actual transaction reference issued by the bank or merchant UPI portal.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRefund(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRefunding || !payoutRef.trim()}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-md cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isRefunding ? 'Recording...' : 'Mark Refund Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Merchant UPI QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-3 overflow-y-auto">
          <div
            className={cn(
              'w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border p-4 sm:p-5 space-y-3.5 shadow-2xl transition-all',
              isDaylight ? 'bg-white border-slate-200 text-slate-950' : 'bg-[#1e1e1e] border-slate-800 text-white',
            )}
          >
            {/* Header */}
            <div
              className={cn(
                'flex items-center justify-between border-b pb-3',
                isDaylight ? 'border-slate-200' : 'border-slate-800',
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'p-1.5 rounded-lg border',
                    isDaylight
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                  )}
                >
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <h3 className={cn('text-sm font-black', isDaylight ? 'text-slate-950' : 'text-white')}>
                    EquipGrid Rental Desk UPI QR
                  </h3>
                  <p className={cn('text-[10px]', isDaylight ? 'text-slate-500' : 'text-slate-400')}>
                    Scannable via PhonePe, GPay, Paytm, BHIM, Cred
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false);
                  setUrlParam('modal', null);
                }}
                aria-label="Close UPI QR dialog"
                className={cn(
                  'rounded-lg border p-1.5 transition-colors cursor-pointer text-xs font-bold',
                  isDaylight
                    ? 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-800'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                )}
              >
                ✕
              </button>
            </div>

            {/* Payee Info & Copy VPA */}
            <div
              className={cn(
                'p-2.5 rounded-xl border flex items-center justify-between gap-2',
                isDaylight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800',
              )}
            >
              <div className="min-w-0">
                <div
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider',
                    isDaylight ? 'text-slate-500' : 'text-slate-400',
                  )}
                >
                  Official Payee Account
                </div>
                <div className={cn('text-xs font-black truncate', isDaylight ? 'text-slate-900' : 'text-white')}>
                  {merchantQrDetails?.payeeName || 'Akash Kumar'}
                </div>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold truncate">
                  {merchantQrDetails?.payeeVpa || '9984698008@upi'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const vpa = merchantQrDetails?.payeeVpa || '9984698008@upi';
                  navigator.clipboard.writeText(vpa);
                  setQrCopied(true);
                  setTimeout(() => setQrCopied(false), 2000);
                }}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-xs',
                  qrCopied
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : isDaylight
                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700',
                )}
              >
                {qrCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{qrCopied ? 'Copied' : 'Copy UPI'}</span>
              </button>
            </div>

            {/* Dynamic Scannable QR Code Container */}
            <div className="relative mx-auto flex items-center justify-center p-3 rounded-2xl bg-white border border-slate-200 shadow-md w-56 h-56">
              {qrLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                  <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="text-xs font-bold">Rendering QR...</span>
                </div>
              ) : (
                <img
                  src={
                    merchantQrDetails?.qrCodeBase64 ||
                    `/equipgrid/whatsapp/qr/merchant${qrAmount && parseFloat(qrAmount) > 0 ? `?amount=${encodeURIComponent(qrAmount)}` : ''}`
                  }
                  alt="EquipGrid Merchant Dynamic UPI QR Code"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Optional Amount Preset / Field */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider',
                    isDaylight ? 'text-slate-600' : 'text-slate-400',
                  )}
                >
                  Pre-set Amount on Customer Phone (Optional)
                </label>
                {qrAmount && (
                  <button
                    type="button"
                    onClick={() => {
                      setQrAmount('');
                      fetchMerchantQr(0);
                    }}
                    className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Clear Amount
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span
                    className={cn(
                      'absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono',
                      isDaylight ? 'text-slate-400' : 'text-slate-500',
                    )}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Enter amount (e.g. 5000)"
                    value={qrAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQrAmount(val);
                      const num = parseFloat(val);
                      fetchMerchantQr(isNaN(num) || num <= 0 ? undefined : num);
                    }}
                    className={cn(
                      'w-full pl-6 pr-3 py-1.5 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500',
                      isDaylight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-900 border-slate-700 text-white',
                    )}
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[500, 1000, 2500, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setQrAmount(amt.toString());
                      fetchMerchantQr(amt);
                    }}
                    className={cn(
                      'px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-colors cursor-pointer',
                      qrAmount === amt.toString()
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : isDaylight
                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300',
                    )}
                  >
                    +₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <a
                href={`/equipgrid/whatsapp/qr/merchant${qrAmount && parseFloat(qrAmount) > 0 ? `?amount=${encodeURIComponent(qrAmount)}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-colors flex items-center justify-center gap-1.5',
                  isDaylight
                    ? 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800 shadow-xs'
                    : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200',
                )}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print / Full QR</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false);
                  setUrlParam('modal', null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-sm cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

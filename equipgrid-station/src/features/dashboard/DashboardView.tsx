import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Send,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Search,
  Truck,
  CheckCircle,
  Clock,
  Wrench,
  AlertTriangle,
  Zap,
  Phone,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { SearchSelect } from '../../components/SearchSelect';
import { CollectPaymentModal } from '../../components/CollectPaymentModal';
import { HandoverChecklistModal } from '../../components/HandoverChecklistModal';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';
import { formatINR, formatDate, cn } from '../../lib/utils';
import { useTheme } from '../../lib/ThemeContext';
import { api, resolveAssetS3Key, sanitizeMediaUrl } from '../../services/api';
import { SkeletonTable } from '../../components/SkeletonTable';
import { Booking } from '../../types';
import { useAuth } from '../../lib/AuthContext';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

const TODAY = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { isDaylight } = useTheme();
  const { currentUser } = useAuth();
  const summary = api.getDashboardSummary();
  const bookings = api.bookings || [];
  const assets = api.assets || [];
  const hubs = api.getHubs();
  const cities = api.getCities();
  const states = api.getStates();

  const [isLoading, setIsLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(7);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Dashboard Sub-View Switcher: 'deployments' | 'urgent-feed'
  const [dashboardSubView, setDashboardSubView] = useState<'deployments' | 'urgent-feed'>('deployments');

  // Date Scope: 'TODAY' (Active for today's date), 'UPCOMING', 'PAST', 'ALL'
  const [selectedDateScope, setSelectedDateScope] = useState<string>('TODAY');

  // Cascading Filter States: State -> City -> Hub + Status + Search
  const [selectedStateId, setSelectedStateId] = useState<string>('ALL');
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals for Payment Collection & Handover Checklist
  const [paymentModalBooking, setPaymentModalBooking] = useState<Booking | null>(null);
  const [handoverModalBooking, setHandoverModalBooking] = useState<Booking | null>(null);

  // 1. Available cities depend on selected State
  const availableCities = useMemo(() => {
    if (selectedStateId === 'ALL') return cities;
    return cities.filter((c) => c.stateId === Number(selectedStateId));
  }, [cities, selectedStateId]);

  // 2. Available hubs depend on selected City
  const availableHubs = useMemo(() => {
    if (selectedCityId !== 'ALL') {
      return hubs.filter((h) => h.cityId === Number(selectedCityId));
    }
    if (selectedStateId !== 'ALL') {
      const cityIds = new Set(availableCities.map((c) => c.id));
      return hubs.filter((h) => cityIds.has(h.cityId));
    }
    return hubs;
  }, [hubs, selectedCityId, selectedStateId, availableCities]);

  // Cascading filter reset triggers
  const handleStateChange = (val: string | number) => {
    setSelectedStateId(String(val));
    setSelectedCityId('ALL');
    setSelectedHubId('ALL');
  };

  const handleCityChange = (val: string | number) => {
    setSelectedCityId(String(val));
    setSelectedHubId('ALL');
  };

  const handleResetFilters = () => {
    setSelectedDateScope('TODAY');
    setSelectedStateId('ALL');
    setSelectedCityId('ALL');
    setSelectedHubId('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  // Filter Bookings strictly based on Date Scope -> State -> City -> Hub -> Status
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 1. Date Scope: By default, ONLY bookings that are active for today's date
      if (selectedDateScope === 'TODAY') {
        const isActiveToday = b.startDate <= TODAY && b.endDate >= TODAY;
        if (!isActiveToday) return false;
      } else if (selectedDateScope === 'UPCOMING') {
        if (b.startDate <= TODAY) return false;
      } else if (selectedDateScope === 'PAST') {
        if (b.endDate >= TODAY) return false;
      }

      // 2. State, City, Hub
      const assetHub = hubs.find((h) => h.id === b.asset.hubId);
      const assetCity = cities.find((c) => c.id === assetHub?.cityId);
      const assetStateId = assetCity?.stateId;

      if (selectedStateId !== 'ALL' && assetStateId !== Number(selectedStateId)) return false;
      if (selectedCityId !== 'ALL' && assetHub?.cityId !== Number(selectedCityId)) return false;
      if (selectedHubId !== 'ALL' && b.asset.hubId !== Number(selectedHubId)) return false;
      if (selectedStatus !== 'ALL' && b.status !== selectedStatus) return false;

      // 3. Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchNum = b.bookingNumber.toLowerCase().includes(q);
        const matchCustomer = b.customer.fullName.toLowerCase().includes(q);
        const matchPhone = b.customer.phone.includes(q);
        const matchAsset = b.asset.name.toLowerCase().includes(q);
        const matchTag = b.asset.assetTag.toLowerCase().includes(q);
        if (!matchNum && !matchCustomer && !matchPhone && !matchAsset && !matchTag) return false;
      }

      return true;
    });
  }, [
    bookings,
    hubs,
    cities,
    selectedDateScope,
    selectedStateId,
    selectedCityId,
    selectedHubId,
    selectedStatus,
    searchQuery,
  ]);

  // Reset to initial 7 items when any search or filter criteria change
  useEffect(() => {
    setVisibleCount(7);
  }, [selectedDateScope, selectedStateId, selectedCityId, selectedHubId, selectedStatus, searchQuery]);

  // Infinite scroll slice
  const visibleBookings = useMemo(() => {
    return filteredBookings.slice(0, visibleCount);
  }, [filteredBookings, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 60) {
      if (visibleCount < filteredBookings.length) {
        setVisibleCount((prev) => Math.min(prev + 7, filteredBookings.length));
      }
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 7, filteredBookings.length));
  };

  // Metrics
  const todayReservations = bookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'ALLOCATED' || b.status === 'DISPATCH_READY',
  );
  const todayDispatched = bookings.filter((b) => b.status === 'DISPATCHED' || b.status === 'ON_RENT');
  const availableMachines = assets.filter((a) => a.status === 'AVAILABLE');

  // Copy to clipboard helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Dispatch Handover action flow
  const handleDispatchHandoverClick = (b: Booking) => {
    const totalPaid = (b.advancePaid || 0) + (b.depositPaid || 0);
    const depositRequired = b.depositAmount || 0;
    const advanceRequired = b.baseRent || Math.max(0, (b.totalAmount || 0) - depositRequired);
    const requiredBarrier = depositRequired + advanceRequired;

    if (totalPaid < requiredBarrier) {
      setPaymentModalBooking(b);
    } else {
      setHandoverModalBooking(b);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2.5 overflow-hidden">
      {/* ── Top Hero Bar (Clear, Plain Language) ── */}
      <div
        className={cn(
          'p-3.5 sm:p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 shadow-sm transition-all',
          isDaylight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/60 border-slate-800/80 text-white',
        )}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 shrink-0">
            <Zap className="h-5 w-5 text-teal-700" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="font-mono font-semibold text-slate-700">
                {currentTime.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span>•</span>
              <span className="font-mono font-bold text-teal-700">
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons (Simple, Clear Text) */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
          <button
            onClick={() => onNavigate('booking')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border bg-teal-700 hover:bg-teal-800 text-white border-teal-800"
          >
            <Zap className="h-3.5 w-3.5 text-white" />
            <span>New Booking (नई बुकिंग)</span>
          </button>

          <button
            onClick={() => onNavigate('catalog')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border',
              isDaylight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700',
            )}
          >
            <Truck className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">All Machines (सभी मशीनें)</span>
          </button>

          <button
            onClick={() => onNavigate('maintenance')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border',
              isDaylight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700',
            )}
          >
            <Wrench className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Repairs (मरम्मत)</span>
          </button>

          <button
            onClick={() => onNavigate('payments')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border',
              isDaylight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700',
            )}
          >
            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Payments (पैसे लें)</span>
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards with Simple Everyday Labels (Consistent 2-Color Scheme) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 shrink-0">
        <StatCard
          title="Today's Bookings"
          value={todayReservations.length}
          icon={<Calendar className="h-4 w-4" />}
          accentColor="teal"
          badgeText="Today"
          subtitle="Scheduled Pickups (आज की बुकिंग)"
          onClick={() => {
            setSelectedStatus('CONFIRMED');
            setDashboardSubView('deployments');
          }}
          isActive={selectedStatus === 'CONFIRMED'}
        />
        <StatCard
          title="Machines on Rent"
          value={todayDispatched.length}
          icon={<Send className="h-4 w-4" />}
          accentColor="emerald"
          badgeText="On Field"
          subtitle="Working on Field (किराए पर)"
          onClick={() => {
            setSelectedStatus('ON_RENT');
            setDashboardSubView('deployments');
          }}
          isActive={selectedStatus === 'ON_RENT'}
        />
        <StatCard
          title="Ready in Yard"
          value={availableMachines.length}
          icon={<Truck className="h-4 w-4" />}
          accentColor="emerald"
          badgeText="Available"
          subtitle="Ready to Rent (तैयार मशीनें)"
          onClick={() => onNavigate('catalog')}
        />
        <StatCard
          title="Today's Collection"
          value={formatINR(summary.todayGrossRevenue)}
          icon={<CreditCard className="h-4 w-4" />}
          accentColor="teal"
          trend="+18%"
          trendPositive={true}
          subtitle="Cash & UPI (आज की कुल कमाई)"
          onClick={() => onNavigate('payments')}
        />
        <StatCard
          title="Security Deposits Kept"
          value={formatINR(summary.pendingSecurityDeposits)}
          icon={<ShieldCheck className="h-4 w-4" />}
          accentColor="teal"
          badgeText="Safe"
          subtitle="Customer Deposit (जमा सिक्योरिटी)"
          onClick={() => onNavigate('return')}
        />
      </div>

      {/* ── Sub-View Selector Tabs (Plain Language) ── */}
      <div className="flex items-center justify-between border-b border-slate-200 shrink-0 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDashboardSubView('deployments')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center gap-1.5 select-none',
              dashboardSubView === 'deployments'
                ? 'bg-teal-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100',
            )}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Active Bookings & Deliveries (सक्रिय बुकिंग - {filteredBookings.length})</span>
          </button>

          <button
            onClick={() => setDashboardSubView('urgent-feed')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold transition-all rounded-lg cursor-pointer flex items-center gap-1.5 select-none',
              dashboardSubView === 'urgent-feed'
                ? 'bg-teal-700 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100',
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Needs Attention Today (आज क्या करना है)</span>
          </button>
        </div>

        {selectedStatus !== 'ALL' && (
          <button
            onClick={() => setSelectedStatus('ALL')}
            className="text-[11px] font-bold text-amber-500 hover:underline cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear Filter ({selectedStatus})</span>
          </button>
        )}
      </div>

      {/* ── Sub-View 1: Active Bookings Table ── */}
      {dashboardSubView === 'deployments' && (
        <>
          {/* Filters Bar: Date Scope, State, City, Hub, Status, Search */}
          <div
            className={cn(
              'shrink-0 p-2.5 rounded-xl border transition-colors space-y-1.5 shadow-xs',
              isDaylight
                ? 'border-slate-200 bg-white text-slate-950'
                : 'border-slate-800 bg-slate-900/60 text-slate-200',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <Calendar className="h-3 w-3 text-amber-500" />
                <span>Filter Bookings ({filteredBookings.length} matching bookings)</span>
              </div>

              <button
                onClick={handleResetFilters}
                className={cn(
                  'text-[11px] flex items-center gap-1 font-bold cursor-pointer transition-colors',
                  isDaylight ? 'text-amber-800 hover:text-amber-950' : 'text-slate-400 hover:text-slate-200',
                )}
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters (रीसेट करें)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
              {/* Date Scope Filter */}
              <div>
                <SearchSelect
                  options={[
                    {
                      value: 'TODAY',
                      label: `Today Only (${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})`,
                    },
                    { value: 'UPCOMING', label: 'Upcoming (आने वाली तारीखें)' },
                    { value: 'PAST', label: 'Past / Completed (बीती तारीखें)' },
                    { value: 'ALL', label: 'All Dates (सभी तारीखें)' },
                  ]}
                  value={selectedDateScope}
                  onChange={(val) => setSelectedDateScope(String(val || 'TODAY'))}
                  placeholder="Date (तारीख)"
                  isClearable={false}
                />
              </div>

              {/* State Filter */}
              <div>
                <SearchSelect
                  options={[
                    { value: 'ALL', label: 'All States (सभी राज्य)' },
                    ...states.map((s) => ({
                      value: String(s.id),
                      label: s.name,
                      badge: s.code,
                    })),
                  ]}
                  value={selectedStateId}
                  onChange={(val) => handleStateChange(val || 'ALL')}
                  placeholder="State (राज्य)"
                  isClearable={false}
                />
              </div>

              {/* City Filter */}
              <div>
                <SearchSelect
                  options={
                    selectedStateId !== 'ALL' && availableCities.length === 0
                      ? []
                      : [
                          { value: 'ALL', label: 'All Cities (सभी शहर)' },
                          ...availableCities.map((c) => ({
                            value: String(c.id),
                            label: c.name,
                          })),
                        ]
                  }
                  value={selectedCityId}
                  onChange={(val) => handleCityChange(val || 'ALL')}
                  placeholder={
                    selectedStateId !== 'ALL' && availableCities.length === 0 ? 'No cities in State' : 'City (शहर)'
                  }
                  isDisabled={selectedStateId !== 'ALL' && availableCities.length === 0}
                  isClearable={false}
                />
              </div>

              {/* Hub Yard Filter */}
              <div>
                <SearchSelect
                  options={
                    (selectedCityId !== 'ALL' && availableHubs.length === 0) ||
                    (selectedStateId !== 'ALL' && availableCities.length === 0)
                      ? []
                      : [
                          { value: 'ALL', label: 'All Hubs (सभी यार्ड)' },
                          ...availableHubs.map((h) => ({
                            value: String(h.id),
                            label: h.name,
                          })),
                        ]
                  }
                  value={selectedHubId}
                  onChange={(val) => setSelectedHubId(String(val || 'ALL'))}
                  placeholder={
                    selectedStateId !== 'ALL' && availableCities.length === 0
                      ? 'No cities in State'
                      : selectedCityId !== 'ALL' && availableHubs.length === 0
                        ? 'No hubs in City'
                        : 'Station (यार्ड)'
                  }
                  isDisabled={
                    (selectedCityId !== 'ALL' && availableHubs.length === 0) ||
                    (selectedStateId !== 'ALL' && availableCities.length === 0)
                  }
                  isClearable={false}
                />
              </div>

              {/* Status Filter */}
              <div>
                <SearchSelect
                  options={[
                    { value: 'ALL', label: 'All Statuses (सभी स्थितियां)' },
                    { value: 'CONFIRMED', label: 'CONFIRMED (बुकिंग पक्की)' },
                    { value: 'ALLOCATED', label: 'ALLOCATED (मशीन तय की)' },
                    { value: 'DISPATCH_READY', label: 'DISPATCH_READY (तैयार)' },
                    { value: 'DISPATCHED', label: 'DISPATCHED (रास्ते में)' },
                    { value: 'ON_RENT', label: 'ON_RENT (किराए पर चल रही)' },
                    { value: 'RETURNED', label: 'RETURNED (वापस आ गई)' },
                  ]}
                  value={selectedStatus}
                  onChange={(val) => setSelectedStatus(String(val || 'ALL'))}
                  placeholder="Status (स्थिति)"
                  isClearable={false}
                />
              </div>

              {/* Search Bar */}
              <div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search booking #, customer, tag..."
                    className={cn(
                      'w-full rounded-lg border pl-8 pr-2.5 py-2 text-xs transition-colors focus:outline-none',
                      isDaylight
                        ? 'border-slate-300 bg-white text-slate-950 placeholder-slate-500 focus:border-amber-600'
                        : 'border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:border-amber-500',
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Operational Bookings Table */}
          <div
            className={cn(
              'flex-1 min-h-0 w-full rounded-2xl border overflow-hidden transition-colors flex flex-col shadow-xs',
              isDaylight
                ? 'border-slate-200 bg-white text-slate-950'
                : 'border-slate-800 bg-slate-900/60 text-slate-200',
            )}
          >
            {isLoading ? (
              <div className="p-6">
                <SkeletonTable columns={7} rows={6} />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="flex-1 min-h-0 p-8 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
                <Calendar className="h-8 w-8 mx-auto opacity-30 text-slate-500" />
                <div className="text-xs font-bold">No active bookings found for your filter</div>
                <p className="text-[11px] max-w-sm mx-auto">
                  {selectedDateScope === 'TODAY'
                    ? 'Only bookings active today are shown. Switch date filter to "All Dates" to see earlier or future bookings.'
                    : 'Try clearing the search or status filter.'}
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 mt-2 cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div onScroll={handleScroll} className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead
                    className={cn(
                      'sticky top-0 z-10 border-b text-[11px] font-black uppercase tracking-wider',
                      isDaylight
                        ? 'border-slate-300 bg-slate-100 text-slate-900'
                        : 'border-slate-800 bg-slate-950 text-slate-300',
                    )}
                  >
                    <tr>
                      <th className="py-3 px-4">Booking # (बुकिंग नंबर)</th>
                      <th className="py-3 px-4">Machine (मशीन)</th>
                      <th className="py-3 px-4">Customer (ग्राहक)</th>
                      <th className="py-3 px-4">Rental Dates (किराया अवधि)</th>
                      <th className="py-3 px-4">Station (यार्ड)</th>
                      <th className="py-3 px-4">Rent & Payments (किराया व जमा)</th>
                      <th className="py-3 px-4">Status (स्थिति)</th>
                      <th className="py-3 px-4 text-right">Action (कार्य)</th>
                    </tr>
                  </thead>
                  <tbody className={cn('divide-y', isDaylight ? 'divide-slate-200' : 'divide-slate-800/60')}>
                    {visibleBookings.map((b) => {
                      const paid = (b.advancePaid || 0) + (b.depositPaid || 0);
                      const depositReq = b.depositAmount || 0;
                      const advanceReq = b.baseRent || Math.max(0, (b.totalAmount || 0) - depositReq);
                      const required = depositReq + advanceReq;
                      const isPaymentCleared = paid >= required;

                      const s3Key = resolveAssetS3Key(b.asset.assetTag);
                      const photoUrl = sanitizeMediaUrl(b.asset.imageUrl, `${s3Key}.jpg`);

                      return (
                        <tr
                          key={b.id}
                          className={cn(
                            'transition-colors group',
                            isDaylight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40',
                          )}
                        >
                          {/* Booking Number with Copy */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className={cn('font-bold', isDaylight ? 'text-amber-800' : 'text-slate-200')}>
                                {b.bookingNumber}
                              </span>
                              <button
                                onClick={() => handleCopy(b.bookingNumber, `bk-${b.id}`)}
                                title="Copy booking number"
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                              >
                                {copiedId === `bk-${b.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">
                              {b.bookingSource || 'STATION'}
                            </span>
                          </td>

                          {/* Machine Name & Photo */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                                {photoUrl ? (
                                  <img
                                    src={photoUrl}
                                    alt={b.asset.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Truck className="h-4 w-4 text-slate-400" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="font-extrabold text-xs truncate max-w-[180px]">{b.asset.name}</div>
                                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                  <span
                                    className={cn(
                                      'px-1.5 py-0.2 rounded border font-bold text-[10px]',
                                      isDaylight
                                        ? 'bg-amber-100 text-amber-950 border-amber-300'
                                        : 'bg-slate-800 text-slate-300 border-slate-700',
                                    )}
                                  >
                                    {b.asset.assetTag}
                                  </span>
                                  <span>•</span>
                                  <span className="truncate">{b.asset.category}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Customer with Phone Call Link */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{b.customer.fullName}</span>
                              {b.customer.verified && (
                                <span title="KYC Verified (सत्यापित)" className="text-emerald-500">
                                  ●
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                              <a
                                href={`tel:${b.customer.phone}`}
                                className="hover:text-amber-500 flex items-center gap-0.5"
                                title="Call customer (कॉल करें)"
                              >
                                <Phone className="h-2.5 w-2.5" />
                                <span>{b.customer.phone}</span>
                              </a>
                            </div>
                          </td>

                          {/* Rental Dates */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="font-bold text-xs">{formatDate(b.startDate)}</div>
                            <div className="text-[10px] text-slate-500">to {formatDate(b.endDate)}</div>
                          </td>

                          {/* Station Location */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-xs">{b.asset.hubName || 'Hardoi Central Yard'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {b.asset.cityName ? `${b.asset.cityName}, ${b.asset.stateName || 'UP'}` : 'Uttar Pradesh'}
                            </div>
                          </td>

                          {/* Financials & Deposit Status */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-sm">{formatINR(b.totalAmount)}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={cn(
                                  'text-[11px] font-bold',
                                  isPaymentCleared
                                    ? isDaylight
                                      ? 'text-emerald-800'
                                      : 'text-emerald-400'
                                    : isDaylight
                                      ? 'text-rose-700'
                                      : 'text-rose-400',
                                )}
                              >
                                Paid: {formatINR(paid)}
                              </span>
                              {!isPaymentCleared && (
                                <span className="text-[9px] px-1 rounded bg-rose-500/20 text-rose-500 font-bold border border-rose-500/30">
                                  Unpaid (बकाया)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <StatusBadge status={b.status} size="sm" showFarmerLabel={true} />
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            {b.status === 'ON_RENT' ? (
                              <button
                                onClick={() => onNavigate('return')}
                                className={cn(
                                  'px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors border',
                                  isDaylight
                                    ? 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100'
                                    : 'bg-purple-950/40 text-purple-300 border-purple-800/60 hover:bg-purple-900/50',
                                )}
                              >
                                Take Return (मशीन वापस लें)
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDispatchHandoverClick(b)}
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs',
                                  isPaymentCleared
                                    ? 'bg-teal-700 text-white hover:bg-teal-800 shadow-teal-700/20 font-bold'
                                    : 'bg-rose-600 text-white hover:bg-rose-500 font-bold',
                                )}
                              >
                                {!isPaymentCleared && <ShieldAlert className="h-3.5 w-3.5 shrink-0" />}
                                <span>
                                  {isPaymentCleared
                                    ? 'Send Machine (मशीन भेजें)'
                                    : 'Take Money & Send (पैसे लेकर भेजें)'}
                                </span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Infinite Scroll Footer */}
            {filteredBookings.length > 0 && !isLoading && (
              <InfiniteScrollFooter
                loadedCount={visibleBookings.length}
                totalCount={filteredBookings.length}
                onLoadMore={handleLoadMore}
                itemName="bookings"
              />
            )}
          </div>
        </>
      )}

      {/* ── Sub-View 3: Urgent Operations Feed (Plain Language) ── */}
      {dashboardSubView === 'urgent-feed' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
          <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/5">
            <h3 className="font-black text-xs text-rose-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              <span>Needs Attention Today (आज क्या करना है)</span>
            </h3>

            <div className="space-y-2">
              <div
                onClick={() => onNavigate('return')}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-amber-500 transition-colors"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Late Return (मशीन समय पर वापस नहीं आई)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Harvester H-102 (Ramesh Patel) was due back 4 hours ago. Please call farmer to confirm return.
                  </p>
                </div>
                <span className="text-xs font-bold text-rose-500 shrink-0">Open Return Desk →</span>
              </div>

              <div
                onClick={() => onNavigate('maintenance')}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-amber-500 transition-colors"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Repair Check (सर्विस व मरम्मत पूरी करें)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Plate Compactor C-CMP-002 oil change complete. Check and mark ready to rent.
                  </p>
                </div>
                <span className="text-xs font-bold text-amber-500 shrink-0">Check Machine →</span>
              </div>

              <div
                onClick={() => onNavigate('payments')}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-amber-500 transition-colors"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Take Security Deposit (सिक्योरिटी जमा करें)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Booking EG-BK-0003 is pending UPI deposit payment before releasing machine.
                  </p>
                </div>
                <span className="text-xs font-bold text-purple-500 shrink-0">Show QR Code →</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Collect Rental & Security Deposit Modal */}
      {paymentModalBooking && (
        <CollectPaymentModal
          isOpen={!!paymentModalBooking}
          booking={paymentModalBooking}
          onClose={() => setPaymentModalBooking(null)}
          onPaymentCollected={(updatedBooking) => {
            setPaymentModalBooking(null);
            setHandoverModalBooking(updatedBooking);
          }}
        />
      )}

      {/* Step 2: Yard Dispatch & Handover Checklist Modal */}
      {handoverModalBooking && (
        <HandoverChecklistModal
          isOpen={!!handoverModalBooking}
          booking={handoverModalBooking}
          onClose={() => setHandoverModalBooking(null)}
          onHandoverCompleted={() => {
            // Refreshes dashboard state automatically
          }}
        />
      )}
    </div>
  );
};

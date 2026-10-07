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
} from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { SearchSelect } from '../../components/SearchSelect';
import { CollectPaymentModal } from '../../components/CollectPaymentModal';
import { HandoverChecklistModal } from '../../components/HandoverChecklistModal';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';
import { formatINR, formatDate } from '../../lib/utils';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { SkeletonTable } from '../../components/SkeletonTable';
import { Booking, BookingStatus } from '../../types';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

const TODAY = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { isDaylight } = useTheme();
  const summary = api.getDashboardSummary();
  const bookings = api.bookings;
  const hubs = api.getHubs();
  const cities = api.getCities();
  const states = api.getStates();

  const [isLoading, setIsLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(7);

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
        const matchAsset = b.asset.name.toLowerCase().includes(q);
        const matchTag = b.asset.assetTag.toLowerCase().includes(q);
        if (!matchNum && !matchCustomer && !matchAsset && !matchTag) return false;
      }

      return true;
    });
  }, [bookings, hubs, cities, selectedDateScope, selectedStateId, selectedCityId, selectedHubId, selectedStatus, searchQuery]);

  // Reset to initial 7 items when any search or filter criteria change
  useEffect(() => {
    setVisibleCount(7);
  }, [selectedDateScope, selectedStateId, selectedCityId, selectedHubId, selectedStatus, searchQuery]);

  // Infinite scroll slice (default 7 items, loads +7 on scroll)
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

  // Current Day's Reservation and Dispatched metrics
  const todayReservations = filteredBookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'ALLOCATED' || b.status === 'DISPATCH_READY'
  );
  const todayDispatched = filteredBookings.filter(
    (b) => b.status === 'DISPATCHED' || b.status === 'ON_RENT'
  );

  // Dispatch Handover action flow
  const handleDispatchHandoverClick = (b: Booking) => {
    const totalPaid = (b.advancePaid || 0) + (b.depositPaid || 0);
    const depositRequired = b.depositAmount || 0;
    const advanceRequired = b.baseRent || Math.max(0, (b.totalAmount || 0) - depositRequired);
    const requiredBarrier = depositRequired + advanceRequired;

    if (totalPaid < requiredBarrier) {
      // Step 1: No booking amount paid or partially paid -> Collect Rental & Security Deposit first!
      setPaymentModalBooking(b);
    } else {
      // Step 2: Payment cleared -> Proceed directly to Handover formality!
      setHandoverModalBooking(b);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-shrink-0">
        <StatCard
          title="Day Reservations"
          value={todayReservations.length}
          icon={<Calendar className="h-4 w-4" />}
          accentColor="amber"
        />
        <StatCard
          title="Active Dispatched"
          value={todayDispatched.length}
          icon={<Send className="h-4 w-4" />}
          accentColor="emerald"
        />
        <StatCard
          title="Revenue Receipts"
          value={formatINR(summary.todayGrossRevenue)}
          icon={<CreditCard className="h-4 w-4" />}
          accentColor="blue"
        />
        <StatCard
          title="Security Deposits"
          value={formatINR(summary.pendingSecurityDeposits)}
          icon={<ShieldCheck className="h-4 w-4" />}
          accentColor="purple"
        />
      </div>

      {/* Filters Bar: Date Scope, State, City, Hub, Status, Search */}
      <div
        className={`flex-shrink-0 p-2.5 rounded-xl border transition-colors space-y-1.5 ${
          isDaylight ? 'border-slate-200 bg-white text-slate-950 shadow-sm' : 'border-slate-800 bg-slate-900/40 text-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <Calendar className="h-3 w-3 text-amber-500" />
            <span>Today's Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>

          <button
            onClick={handleResetFilters}
            className={`text-[11px] flex items-center gap-1 font-medium cursor-pointer ${
              isDaylight ? 'text-amber-800 hover:text-amber-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          {/* Date Scope Filter */}
          <div>
            <SearchSelect
              options={[
                { value: 'TODAY', label: `Active Today (${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})` },
                { value: 'UPCOMING', label: 'Upcoming Reservations' },
                { value: 'PAST', label: 'Past / Expired Dates' },
                { value: 'ALL', label: 'All Dates' },
              ]}
              value={selectedDateScope}
              onChange={(val) => setSelectedDateScope(String(val || 'TODAY'))}
              placeholder="Date Scope"
              isClearable={false}
            />
          </div>

          {/* State Filter */}
          <div>
            <SearchSelect
              options={[
                { value: 'ALL', label: 'All States' },
                ...states.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                  badge: s.code,
                })),
              ]}
              value={selectedStateId}
              onChange={(val) => handleStateChange(val || 'ALL')}
              placeholder="All States"
              isClearable={false}
            />
          </div>

          {/* City Filter */}
          <div>
            <SearchSelect
              options={[
                { value: 'ALL', label: 'All Cities' },
                ...availableCities.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                })),
              ]}
              value={selectedCityId}
              onChange={(val) => handleCityChange(val || 'ALL')}
              placeholder="All Cities"
              isClearable={false}
            />
          </div>

          {/* Hub Yard Filter */}
          <div>
            <SearchSelect
              options={[
                { value: 'ALL', label: 'All Hubs' },
                ...availableHubs.map((h) => ({
                  value: String(h.id),
                  label: h.name,
                })),
              ]}
              value={selectedHubId}
              onChange={(val) => setSelectedHubId(String(val || 'ALL'))}
              placeholder="All Hubs"
              isClearable={false}
            />
          </div>

          {/* Status Filter */}
          <div>
            <SearchSelect
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'CONFIRMED', label: 'CONFIRMED (Reserved)' },
                { value: 'ALLOCATED', label: 'ALLOCATED (Yard Prep)' },
                { value: 'DISPATCH_READY', label: 'DISPATCH_READY (Inspection Passed)' },
                { value: 'DISPATCHED', label: 'DISPATCHED (In Transit)' },
                { value: 'ON_RENT', label: 'ON_RENT (Active Deployment)' },
                { value: 'RETURNED', label: 'RETURNED (Returned to Yard)' },
              ]}
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(String(val || 'ALL'))}
              placeholder="All Statuses"
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
                placeholder="Booking #, customer, tag..."
                className={`w-full rounded-lg border pl-8 pr-2.5 py-2 text-xs transition-colors focus:outline-none ${
                  isDaylight
                    ? 'border-slate-300 bg-white text-slate-950 placeholder-slate-500 focus:border-amber-600'
                    : 'border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:border-amber-500'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Full Page Width Operational Table */}
      <div
        className={`flex-1 min-h-0 w-full rounded-2xl border overflow-hidden transition-colors flex flex-col ${
          isDaylight ? 'border-slate-200 bg-white text-slate-950 shadow-sm' : 'border-slate-800 bg-slate-900/40 text-slate-200'
        }`}
      >
        <div className="px-3.5 py-2 border-b flex items-center justify-between border-slate-700/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Send className={`h-4 w-4 ${isDaylight ? 'text-amber-700' : 'text-slate-400'}`} />
            <h3 className={`text-xs sm:text-sm font-black ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
              Reservations & Dispatches ({filteredBookings.length})
            </h3>
            {selectedDateScope === 'TODAY' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                Active for Today Only
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <SkeletonTable columns={7} rows={6} />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex-1 min-h-0 p-8 text-center text-slate-500 flex flex-col items-center justify-center space-y-1.5">
            <Calendar className="h-7 w-7 mx-auto opacity-30 text-slate-500" />
            <div className="text-xs font-bold">No active reservations or dispatches found for today</div>
            <p className="text-[11px] max-w-sm mx-auto">
              {selectedDateScope === 'TODAY'
                ? 'Only bookings scheduled for today are shown here. Switch the Date Scope filter to "All Dates" or "Past" to review earlier bookings.'
                : 'Try adjusting the State, City, or Status filters.'}
            </p>
          </div>
        ) : (
          <div
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-x-auto overflow-y-auto"
          >
            <table className="w-full text-left text-xs">
              <thead
                className={`sticky top-0 z-10 border-b text-[11px] font-black uppercase tracking-wider ${
                  isDaylight
                    ? 'border-slate-300 bg-slate-100 text-slate-900 shadow-xs'
                    : 'border-slate-800 bg-slate-950 text-slate-300 shadow-xs'
                }`}
              >
                <tr>
                  <th className="py-3 px-4">Booking Number</th>
                  <th className="py-3 px-4">Machine Info</th>
                  <th className="py-3 px-4">Customer Info</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Hub</th>
                  <th className="py-3 px-4">Financials</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  isDaylight ? 'divide-slate-200' : 'divide-slate-800/60'
                }`}
              >
                {visibleBookings.map((b) => {
                  const paid = (b.advancePaid || 0) + (b.depositPaid || 0);
                  const depositReq = b.depositAmount || 0;
                  const advanceReq = b.baseRent || Math.max(0, (b.totalAmount || 0) - depositReq);
                  const required = depositReq + advanceReq;
                  const isPaymentCleared = paid >= required;

                  return (
                    <tr
                      key={b.id}
                      className={`transition-colors ${
                        isDaylight ? 'hover:bg-slate-200/40' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      {/* Booking Number */}
                      <td className={`py-3.5 px-4 font-mono ${
                        isDaylight ? 'font-black text-amber-800' : 'font-medium text-slate-300'
                      }`}>
                        {b.bookingNumber}
                      </td>

                      {/* Machine & Tag */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-sm">{b.asset.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className={`font-mono text-xs px-1.5 py-0.2 rounded border ${
                            isDaylight ? 'text-amber-950 bg-amber-100 border-amber-300 font-bold' : 'text-slate-300 bg-slate-800 border-slate-700 font-medium'
                          }`}>
                            {b.asset.assetTag}
                          </span>
                          <span>•</span>
                          <span>{b.asset.category}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold">{b.customer.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{b.customer.phone}</div>
                      </td>

                      {/* Rental Window */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold">{formatDate(b.startDate)}</div>
                        <div className="text-[10px] text-slate-500">to {formatDate(b.endDate)}</div>
                      </td>

                      {/* Hub Yard */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-xs">{b.asset.hubName || 'Hardoi Central Yard'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {b.asset.cityName ? `${b.asset.cityName}, ${b.asset.stateName || 'UP'}` : 'Uttar Pradesh'}
                        </div>
                      </td>

                      {/* Financials */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-sm">{formatINR(b.totalAmount)}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[11px] font-medium ${
                            isPaymentCleared
                              ? isDaylight ? 'text-emerald-800 font-bold' : 'text-emerald-400'
                              : isDaylight ? 'text-rose-700 font-bold' : 'text-rose-400'
                          }`}>
                            Paid: {formatINR(paid)}
                          </span>
                          {!isPaymentCleared && (
                            <span className="text-[10px] px-1 rounded bg-rose-500/20 text-rose-500 font-bold">
                              Unpaid
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={b.status} size="sm" />
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {b.status === 'ON_RENT' ? (
                          <button
                            onClick={() => onNavigate('return')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                              isDaylight
                                ? 'bg-purple-100 text-purple-900 border border-purple-300 font-bold hover:bg-purple-200'
                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                            }`}
                          >
                            Process Return
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDispatchHandoverClick(b)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm ${
                              isPaymentCleared
                                ? isDaylight
                                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                                  : 'bg-amber-600/90 text-slate-950 hover:bg-amber-500'
                                : isDaylight
                                ? 'bg-rose-600 text-white hover:bg-rose-500'
                                : 'bg-rose-700 text-white hover:bg-rose-600'
                            }`}
                          >
                            {!isPaymentCleared && <ShieldAlert className="h-3.5 w-3.5 shrink-0" />}
                            <span>{isPaymentCleared ? 'Dispatch Handover' : 'Collect & Handover'}</span>
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
            itemName="reservations"
          />
        )}
      </div>

      {/* Step 1: Collect Rental & Security Deposit Modal */}
      {paymentModalBooking && (
        <CollectPaymentModal
          isOpen={!!paymentModalBooking}
          booking={paymentModalBooking}
          onClose={() => setPaymentModalBooking(null)}
          onPaymentCollected={(updatedBooking) => {
            setPaymentModalBooking(null);
            // Immediately transition to Handover Formality checklist!
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


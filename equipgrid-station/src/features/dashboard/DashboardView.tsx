import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Send,
  CreditCard,
  ShieldCheck,
  RotateCcw,
  Search,
  Truck,
  CheckCircle,
} from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { SearchSelect } from '../../components/SearchSelect';
import { formatINR, formatDate } from '../../lib/utils';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { SkeletonTable } from '../../components/SkeletonTable';
import { BookingStatus } from '../../types';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { isDaylight } = useTheme();
  const summary = api.getDashboardSummary();
  const bookings = api.bookings;
  const hubs = api.getHubs();
  const cities = api.getCities();
  const states = api.getStates();

  const [isLoading, setIsLoading] = useState(false);

  // Cascading Filter States: State -> City -> Hub + Status + Search
  const [selectedStateId, setSelectedStateId] = useState<string>('ALL');
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
    setSelectedStateId('ALL');
    setSelectedCityId('ALL');
    setSelectedHubId('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  // Filter Bookings strictly based on State -> City -> Hub -> Status
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Find asset hub, city, state
      const assetHub = hubs.find((h) => h.id === b.asset.hubId);
      const assetCity = cities.find((c) => c.id === assetHub?.cityId);
      const assetStateId = assetCity?.stateId;

      if (selectedStateId !== 'ALL' && assetStateId !== Number(selectedStateId)) return false;
      if (selectedCityId !== 'ALL' && assetHub?.cityId !== Number(selectedCityId)) return false;
      if (selectedHubId !== 'ALL' && b.asset.hubId !== Number(selectedHubId)) return false;
      if (selectedStatus !== 'ALL' && b.status !== selectedStatus) return false;

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
  }, [bookings, hubs, cities, selectedStateId, selectedCityId, selectedHubId, selectedStatus, searchQuery]);

  // Current Day's Reservation and Dispatched metrics ONLY (not available stock)
  const todayReservations = filteredBookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'ALLOCATED' || b.status === 'DISPATCH_READY'
  );
  const todayDispatched = filteredBookings.filter(
    (b) => b.status === 'DISPATCHED' || b.status === 'ON_RENT'
  );

  return (
    <div className="space-y-6">
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Day Reservations"
          value={todayReservations.length}
          icon={<Calendar className="h-5 w-5" />}
          accentColor="amber"
        />
        <StatCard
          title="Active Dispatched"
          value={todayDispatched.length}
          icon={<Send className="h-5 w-5" />}
          accentColor="emerald"
        />
        <StatCard
          title="Revenue Receipts"
          value={formatINR(summary.todayGrossRevenue)}
          icon={<CreditCard className="h-5 w-5" />}
          accentColor="blue"
        />
        <StatCard
          title="Security Deposits"
          value={formatINR(summary.pendingSecurityDeposits)}
          icon={<ShieldCheck className="h-5 w-5" />}
          accentColor="purple"
        />
      </div>

      {/* Filters Bar: State, City, Hub, Status */}
      <div
        className={`p-3.5 rounded-xl border transition-colors space-y-2.5 ${
          isDaylight ? 'border-slate-300 bg-transparent text-slate-950' : 'border-slate-800 bg-slate-900/40 text-slate-200'
        }`}
      >
        <div className="flex items-center justify-end">
          <button
            onClick={handleResetFilters}
            className={`text-xs flex items-center gap-1 font-medium ${
              isDaylight ? 'text-amber-800 hover:text-amber-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                    ? 'border-slate-300 bg-transparent text-slate-950 placeholder-slate-500 focus:border-amber-600'
                    : 'border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:border-amber-500'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Full Page Width Operational Table (Skeleton Table format on loading) */}
      <div
        className={`w-full rounded-2xl border overflow-hidden transition-colors ${
          isDaylight ? 'border-slate-300 bg-transparent text-slate-950' : 'border-slate-800 bg-slate-900/40 text-slate-200'
        }`}
      >
        <div className="p-4 border-b flex items-center justify-between border-slate-700/20">
          <h3 className={`text-sm font-black flex items-center gap-2 ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
            <Send className={`h-4 w-4 ${isDaylight ? 'text-amber-700' : 'text-slate-400'}`} />
            Reservations & Dispatches ({filteredBookings.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-6">
            <SkeletonTable columns={7} rows={6} />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Calendar className="h-8 w-8 mx-auto opacity-30 text-slate-500" />
            <div className="text-sm font-bold">No reservations or dispatches found matching filters</div>
            <p className="text-xs max-w-sm mx-auto">
              Try adjusting the State, City, or Status filters to inspect other operational dates.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b text-[11px] font-black uppercase tracking-wider ${
                  isDaylight
                    ? 'border-slate-300 bg-slate-200/50 text-slate-900'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400'
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
                {filteredBookings.map((b) => (
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
                      <div className={`text-[11px] font-medium mt-0.5 ${
                        isDaylight ? 'text-emerald-800 font-bold' : 'text-emerald-400/80'
                      }`}>
                        Paid: {formatINR(b.advancePaid + b.depositPaid)}
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
                          onClick={() => onNavigate('dispatch')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                            isDaylight
                              ? 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-sm'
                              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          Dispatch Handover
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

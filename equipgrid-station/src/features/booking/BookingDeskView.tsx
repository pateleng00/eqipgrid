import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  Calculator,
  UserCheck,
  ShieldAlert,
  MapPin,
  CheckCircle,
  Truck,
  Sparkles,
  Plus,
  Search,
  RotateCcw,
  Send,
  Image as ImageIcon,
  UserPlus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { formatINR, formatDate } from '../../lib/utils';
import { SearchSelect } from '../../components/SearchSelect';
import { StatusBadge } from '../../components/StatusBadge';
import { SkeletonTable } from '../../components/SkeletonTable';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { Asset, Booking, Customer, CustomerTier, QuoteCalculation } from '../../types';

interface BookingDeskViewProps {
  preselectedAsset?: Asset | null;
  onBookingCreated: () => void;
  onNavigateToDispatch?: () => void;
}

export const BookingDeskView: React.FC<BookingDeskViewProps> = ({
  preselectedAsset,
  onBookingCreated,
  onNavigateToDispatch,
}) => {
  const { isDaylight } = useTheme();
  const [bookingsList, setBookingsList] = useState<Booking[]>([...api.bookings]);
  const [customerList, setCustomerList] = useState<Customer[]>([...api.customers]);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    setBookingsList([...api.bookings]);
    setCustomerList([...api.customers]);
    return api.subscribe(() => {
      setBookingsList([...api.bookings]);
      setCustomerList([...api.customers]);
    });
  }, []);

  // Modal state for creating new booking
  const [showCreateModal, setShowCreateModal] = useState<boolean>(!!preselectedAsset);

  // Masters for filters
  const states = api.getStates();
  const cities = api.getCities();
  const hubs = api.getHubs();
  const assets = api.assets;
  const dealers = api.dealers;

  // Filter states
  const [selectedStateId, setSelectedStateId] = useState<string>('ALL');
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Dependent cascading options
  const availableCities = useMemo(() => {
    if (selectedStateId === 'ALL') return cities;
    return cities.filter((c) => c.stateId === Number(selectedStateId));
  }, [cities, selectedStateId]);

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
    setSearchQuery('');
  };

  // Requirement: ONLY reserved machines row for current day which are NOT dispatched yet
  // Status must be CONFIRMED, ALLOCATED, or DISPATCH_READY (not DISPATCHED, ON_RENT, RETURNED)
  const reservedNotDispatched = useMemo(() => {
    return bookingsList.filter((b) => {
      // Must not be dispatched yet
      const isNotDispatched =
        b.status === 'CONFIRMED' || b.status === 'ALLOCATED' || b.status === 'DISPATCH_READY';
      if (!isNotDispatched) return false;

      // Filter by location
      const assetHub = hubs.find((h) => h.id === b.asset.hubId);
      const assetCity = cities.find((c) => c.id === assetHub?.cityId);
      const assetStateId = assetCity?.stateId;

      if (selectedStateId !== 'ALL' && assetStateId !== Number(selectedStateId)) return false;
      if (selectedCityId !== 'ALL' && assetHub?.cityId !== Number(selectedCityId)) return false;
      if (selectedHubId !== 'ALL' && b.asset.hubId !== Number(selectedHubId)) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchNum = b.bookingNumber.toLowerCase().includes(q);
        const matchCust = b.customer.fullName.toLowerCase().includes(q);
        const matchAsset = b.asset.name.toLowerCase().includes(q);
        const matchTag = b.asset.assetTag.toLowerCase().includes(q);
        if (!matchNum && !matchCust && !matchAsset && !matchTag) return false;
      }

      return true;
    });
  }, [bookingsList, hubs, cities, selectedStateId, selectedCityId, selectedHubId, searchQuery]);

  // Form State for creating new reservation
  const [selectedAssetId, setSelectedAssetId] = useState<number>(
    preselectedAsset ? preselectedAsset.id : assets[0]?.id || 1
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(customerList[0]?.id || 0);
  const [bookingStateId, setBookingStateId] = useState<string>(preselectedAsset?.stateName ? String(cities.find((city) => city.name === preselectedAsset.cityName)?.stateId || 'ALL') : 'ALL');
  const [bookingCityId, setBookingCityId] = useState<string>(preselectedAsset?.cityName ? String(cities.find((city) => city.name === preselectedAsset.cityName)?.id || 'ALL') : 'ALL');
  const [bookingHubId, setBookingHubId] = useState<string>(preselectedAsset?.hubId ? String(preselectedAsset.hubId) : 'ALL');
  const [bookingCategory, setBookingCategory] = useState<string>(preselectedAsset?.category || 'ALL');
  const [customerDialog, setCustomerDialog] = useState<'add' | 'edit' | null>(null);
  const [customerPendingDelete, setCustomerPendingDelete] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({ fullName: '', phone: '', address: '', email: '', tier: 'TIER_1_BASIC' as CustomerTier });
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [distanceKm, setDistanceKm] = useState<number>(4.5);
  const [operatorRequired, setOperatorRequired] = useState<boolean>(false);
  const [selectedDealerId, setSelectedDealerId] = useState<string>('1');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('Hardoi Bypass Road, Near Sugar Mill');
  const [notes, setNotes] = useState<string>('Site access open for flatbed transport');

  const [quote, setQuote] = useState<QuoteCalculation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  });

  const currentAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];

  const bookingCities = useMemo(() => bookingStateId === 'ALL' ? cities : cities.filter((city) => city.stateId === Number(bookingStateId)), [cities, bookingStateId]);
  const bookingHubs = useMemo(() => {
    if (bookingCityId !== 'ALL') return hubs.filter((hub) => hub.cityId === Number(bookingCityId));
    const cityIds = new Set(bookingCities.map((city) => city.id));
    return bookingStateId === 'ALL' ? hubs : hubs.filter((hub) => cityIds.has(hub.cityId));
  }, [hubs, bookingCities, bookingCityId, bookingStateId]);
  const availableMachines = useMemo(() => assets.filter((asset) => {
    if (asset.status !== 'AVAILABLE') return false;
    if (bookingHubId !== 'ALL' && asset.hubId !== Number(bookingHubId)) return false;
    if (bookingCategory !== 'ALL' && asset.category !== bookingCategory) return false;
    return true;
  }), [assets, bookingHubId, bookingCategory]);
  const scopedCustomers = useMemo(() => customerList.filter((customer) => {
    if (bookingStateId !== 'ALL' && customer.stateId !== Number(bookingStateId)) return false;
    if (bookingCityId !== 'ALL' && customer.cityId !== Number(bookingCityId)) return false;
    if (bookingHubId !== 'ALL' && customer.hubId !== Number(bookingHubId)) return false;
    return true;
  }), [customerList, bookingStateId, bookingCityId, bookingHubId]);

  useEffect(() => {
    if (availableMachines.length && !availableMachines.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(availableMachines[0].id);
    }
  }, [availableMachines, selectedAssetId]);

  useEffect(() => {
    if (scopedCustomers.length && !scopedCustomers.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(scopedCustomers[0].id);
    }
  }, [scopedCustomers, selectedCustomerId]);

  useEffect(() => {
    if (preselectedAsset) {
      setSelectedAssetId(preselectedAsset.id);
      setShowCreateModal(true);
    }
  }, [preselectedAsset]);

  // Quote recalculation
  useEffect(() => {
    if (!currentAsset) return;
    const calculate = async () => {
      const q = await api.calculateQuote(
        selectedAssetId,
        startDate,
        endDate,
        distanceKm,
        operatorRequired || !!currentAsset.operatorRequired
      );
      setQuote(q);
    };
    calculate();
  }, [selectedAssetId, startDate, endDate, distanceKm, operatorRequired, currentAsset]);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await api.createBooking({
        customerId: selectedCustomerId,
        assetId: selectedAssetId,
        startDate,
        endDate,
        deliveryAddress,
        distanceKm,
        operatorRequired: operatorRequired || !!currentAsset.operatorRequired,
        dealerId: selectedDealerId ? Number(selectedDealerId) : undefined,
        notes,
      });

      setBookingsList([...api.bookings]);
      setBookingSuccess(res.bookingNumber);
      setShowCreateModal(false);
      onBookingCreated();
    } catch (err: any) {
      setErrorModal({ isOpen: true, message: err.message || 'Booking creation failed. Please verify machine availability and customer details.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCustomerDialog = (mode: 'add' | 'edit') => {
    const customer = customerList.find((item) => item.id === selectedCustomerId);
    setCustomerForm(mode === 'edit' && customer
      ? { fullName: customer.fullName, phone: customer.phone, address: customer.address, email: customer.email || '', tier: customer.tier }
      : { fullName: '', phone: '', address: '', email: '', tier: 'TIER_1_BASIC' });
    setCustomerDialog(mode);
  };

  const saveCustomer = (event: React.FormEvent) => {
    event.preventDefault();
    const territory = {
      stateId: bookingStateId === 'ALL' ? undefined : Number(bookingStateId),
      cityId: bookingCityId === 'ALL' ? undefined : Number(bookingCityId),
      hubId: bookingHubId === 'ALL' ? undefined : Number(bookingHubId),
    };
    const selected = customerList.find((item) => item.id === selectedCustomerId);
    const payload = { ...customerForm, verified: customerForm.tier === 'TIER_2_VERIFIED', ...territory };
    const customer = customerDialog === 'edit' && selected
      ? api.updateCustomer(selected.id, payload)
      : api.addCustomer(payload);
    setCustomerList([...api.customers]);
    if (customer) setSelectedCustomerId(customer.id);
    setCustomerDialog(null);
  };

  const deleteCustomer = () => {
    if (!customerPendingDelete) return;
    try {
      api.removeCustomer(customerPendingDelete.id);
      setCustomerList([...api.customers]);
      setSelectedCustomerId(0);
    } catch (error: any) {
      setErrorModal({ isOpen: true, message: error.message || 'Customer could not be deleted.' });
    } finally {
      setCustomerPendingDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className={`text-xl font-black flex items-center gap-2 ${
              isDaylight ? 'text-slate-950' : 'text-white'
            }`}
          >
            <CalendarCheck className={`h-6 w-6 ${isDaylight ? 'text-amber-700' : 'text-slate-400'}`} />
            Booking Desk
          </h2>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto ${
            isDaylight
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-none'
          }`}
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>New Reservation</span>
        </button>
      </div>

      {bookingSuccess && (
        <div
          className={`rounded-xl border p-4 flex items-center justify-between ${
            isDaylight
              ? 'border-emerald-500/60 bg-emerald-50/50 text-emerald-950'
              : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <CheckCircle className={`h-5 w-5 ${isDaylight ? 'text-emerald-700' : 'text-emerald-400'}`} />
            <div>
              <div className="font-extrabold text-sm">Booking {bookingSuccess} Reserved Successfully!</div>
              <div className="text-xs opacity-80">
                Machine queued for yard inspection and dispatch.
              </div>
            </div>
          </div>
          <button
            onClick={() => setBookingSuccess(null)}
            className="text-xs px-2 py-1 font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Cascading Filter Bar */}
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
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* State */}
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

          {/* City */}
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

          {/* Hub Yard */}
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

          {/* Search */}
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

      {/* Reserved Machines Not Dispatched Yet (Table) */}
      <div
        className={`w-full rounded-2xl border overflow-hidden transition-colors ${
          isDaylight ? 'border-slate-300 bg-transparent text-slate-950' : 'border-slate-800 bg-slate-900/40 text-slate-200'
        }`}
      >
        <div className="p-4 border-b flex items-center justify-between border-slate-700/20">
          <h3 className={`text-sm font-black flex items-center gap-2 ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
            <CalendarCheck className={`h-4 w-4 ${isDaylight ? 'text-amber-700' : 'text-slate-400'}`} />
            Reserved Machines Awaiting Dispatch ({reservedNotDispatched.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-6">
            <SkeletonTable columns={7} rows={5} />
          </div>
        ) : reservedNotDispatched.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CalendarCheck className="h-8 w-8 mx-auto opacity-30 text-slate-500" />
            <div className="text-sm font-bold">No pending reservations awaiting dispatch</div>
            <p className="text-xs max-w-sm mx-auto">
              All reserved machines for current day have either been dispatched or no bookings match the selected filters.
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
                  <th className="py-3 px-4">Booking #</th>
                  <th className="py-3 px-4">Reserved Machine</th>
                  <th className="py-3 px-4">Stationed Hub</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Rental Window</th>
                  <th className="py-3 px-4">Financials & Deposit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  isDaylight ? 'divide-slate-200' : 'divide-slate-800/60'
                }`}
              >
                {reservedNotDispatched.map((b) => (
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

                    {/* Reserved Machine */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-12 rounded-lg overflow-hidden bg-slate-950 border border-slate-700 shrink-0">
                          {b.asset.imageUrl ? (
                            <img
                              src={b.asset.imageUrl}
                              alt={b.asset.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800';
                              }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-600">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs px-1.5 py-0.2 rounded border ${
                              isDaylight
                                ? 'text-amber-950 bg-amber-100 border-amber-300 font-bold'
                                : 'text-slate-300 bg-slate-800 border-slate-700 font-medium'
                            }`}>
                              {b.asset.assetTag}
                            </span>
                            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
                              {b.asset.category}
                            </span>
                          </div>
                          <div className="font-extrabold text-xs mt-0.5">{b.asset.name}</div>
                        </div>
                      </div>
                    </td>

                    {/* Stationed Hub */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-xs">{b.asset.hubName || 'Hardoi Central Yard'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {b.asset.cityName ? `${b.asset.cityName}, ${b.asset.stateName || 'UP'}` : 'Uttar Pradesh'}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold">{b.customer.fullName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{b.customer.phone}</div>
                    </td>

                    {/* Rental Window */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold">{formatDate(b.startDate)}</div>
                      <div className="text-[10px] text-slate-500">to {formatDate(b.endDate)}</div>
                    </td>

                    {/* Financials & Deposit */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-xs">{formatINR(b.totalAmount)}</div>
                      <div className={`text-[11px] mt-0.5 ${
                        isDaylight ? 'text-amber-800 font-bold' : 'text-slate-400 font-medium'
                      }`}>
                        Deposit: {formatINR(b.depositAmount)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={b.status} size="sm" />
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          if (onNavigateToDispatch) {
                            onNavigateToDispatch();
                          } else {
                            window.location.hash = 'dispatch';
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          isDaylight
                            ? 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-sm'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Dispatch Handover</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Reservation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div
            className={`w-full max-w-5xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border p-7 sm:p-8 space-y-6 shadow-2xl transition-all my-8 ${
              isDaylight ? 'border-amber-300 bg-white text-slate-950' : 'border-amber-500/30 bg-[#242424] text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-5 border-slate-700/30">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-500/15 p-2.5 text-amber-400">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg">New Equipment Reservation</h3>
                  <p className="mt-0.5 text-xs text-slate-400">Set the rental dates, delivery details, and commercial terms.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                aria-label="Close reservation dialog"
                className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Booking Inputs */}
              <div className="lg:col-span-2 space-y-5">
                <div className={`rounded-2xl border p-4 ${isDaylight ? 'border-slate-200 bg-slate-50/70' : 'border-slate-700 bg-[#1e1e1e]'}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider">Machine availability filters</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    <SearchSelect options={[{ value: 'ALL', label: 'All States' }, ...states.map((state) => ({ value: String(state.id), label: state.name }))]} value={bookingStateId} onChange={(value) => { setBookingStateId(String(value || 'ALL')); setBookingCityId('ALL'); setBookingHubId('ALL'); }} placeholder="State" isClearable={false} />
                    <SearchSelect options={[{ value: 'ALL', label: 'All Cities' }, ...bookingCities.map((city) => ({ value: String(city.id), label: city.name }))]} value={bookingCityId} onChange={(value) => { setBookingCityId(String(value || 'ALL')); setBookingHubId('ALL'); }} placeholder="City" isClearable={false} />
                    <SearchSelect options={[{ value: 'ALL', label: 'All Hubs' }, ...bookingHubs.map((hub) => ({ value: String(hub.id), label: hub.name }))]} value={bookingHubId} onChange={(value) => setBookingHubId(String(value || 'ALL'))} placeholder="Hub" isClearable={false} />
                    <SearchSelect options={[{ value: 'ALL', label: 'All Categories' }, { value: 'CONSTRUCTION', label: 'Construction' }, { value: 'AGRICULTURE', label: 'Agriculture' }]} value={bookingCategory} onChange={(value) => setBookingCategory(String(value || 'ALL'))} placeholder="Category" isClearable={false} />
                  </div>
                </div>
                {/* Equipment Selection */}
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label className="block text-xs font-bold">Available machine</label>
                    <span className="text-[11px] font-bold text-emerald-500">{availableMachines.length} available</span>
                  </div>
                  {availableMachines.length ? <SearchSelect
                    options={availableMachines.map((a) => ({
                      value: a.id,
                      label: `[${a.assetTag}] ${a.name}`,
                      subLabel: `${formatINR(a.dailyRate)}/day • Deposit: ${formatINR(a.depositAmount)} • Yard: ${a.hubName || 'Hardoi'}`,
                      badge: 'AVAILABLE',
                    }))}
                    value={selectedAssetId}
                    onChange={(val) => val && setSelectedAssetId(Number(val))}
                    placeholder="Search an available machine..."
                    isClearable={false}
                  /> : <div className="rounded-xl border border-dashed border-amber-500/40 p-4 text-xs text-slate-400">No available machines match this territory and category. Adjust the filters to continue.</div>}
                </div>

                {/* Customer Selection */}
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label className="block text-xs font-bold">Customer / Contractor</label>
                    <div className="flex items-center gap-2">
                      {scopedCustomers.length > 0 && <>
                        <button type="button" onClick={() => openCustomerDialog('edit')} className="text-[11px] font-bold text-slate-400 hover:text-amber-400">Edit</button>
                        <button type="button" onClick={() => setCustomerPendingDelete(customerList.find((customer) => customer.id === selectedCustomerId) || null)} className="text-[11px] font-bold text-rose-400 hover:text-rose-300">Delete</button>
                      </>}
                      <button type="button" onClick={() => openCustomerDialog('add')} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-black text-slate-950 hover:bg-amber-400"><UserPlus className="h-3 w-3" /> Add customer</button>
                    </div>
                  </div>
                  {scopedCustomers.length ? <SearchSelect
                    options={scopedCustomers.map((c) => ({
                      value: c.id,
                      label: c.fullName,
                      subLabel: `Phone: ${c.phone} • ${c.address}`,
                      badge: c.tier,
                    }))}
                    value={selectedCustomerId}
                    onChange={(val) => val && setSelectedCustomerId(Number(val))}
                    placeholder="Search customer..."
                    isClearable={false}
                  /> : <div className="rounded-xl border border-dashed border-amber-500/40 p-4 text-xs text-slate-400">No customer is assigned to this territory. <button type="button" onClick={() => openCustomerDialog('add')} className="font-bold text-amber-400 hover:text-amber-300">Add the first customer.</button></div>}
                </div>

                {/* Rental Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Dispatch Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold bg-transparent focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Return End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold bg-transparent focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                {/* Transit Distance (5km free rule) */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Delivery Transit Distance: {distanceKm} km</span>
                    <span className="font-mono text-emerald-600 font-bold">
                      {distanceKm <= 5 ? 'Free Pick & Drop (₹0)' : `+${(distanceKm - 5).toFixed(1)} km @ ₹10/km`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="35"
                    step="0.5"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Delivery Site Address */}
                <div>
                  <label className="block text-xs font-bold mb-1">Delivery Destination Address</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-transparent focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                {/* Operator Checkbox */}
                <div className="flex items-center justify-between rounded-lg border border-slate-300 p-2.5">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-bold">EquipGrid Machine Operator</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={operatorRequired || !!currentAsset?.operatorRequired}
                    disabled={!!currentAsset?.operatorRequired}
                    onChange={(e) => setOperatorRequired(e.target.checked)}
                    className="h-4 w-4 accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Right Col: Instant Commercial Breakdown */}
              <div className={`rounded-2xl border p-5 space-y-4 flex flex-col justify-between ${isDaylight ? 'border-amber-200 bg-amber-50/40' : 'border-amber-500/25 bg-[#2c2c2c]'}`}>
                <div>
                  <div className="flex items-center gap-2 border-b pb-2 border-slate-200">
                    <Calculator className="h-4 w-4 text-amber-500" />
                    <h4 className="font-black text-xs">Commercial Quote</h4>
                  </div>

                  <div className="space-y-2 text-xs pt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration</span>
                      <span className="font-bold">{quote?.durationDays || 1} Days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Base Equipment Rent</span>
                      <span className="font-bold">{formatINR(quote?.baseRent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Transit {distanceKm <= 5 ? '(0–5km Free)' : '(>5km @ ₹10/km)'}
                      </span>
                      <span className="font-bold">
                        {(quote?.deliveryFee ?? 0) === 0 ? 'FREE (₹0)' : formatINR(quote?.deliveryFee)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Operator Fee</span>
                      <span className="font-bold">{formatINR(quote?.operatorFee)}</span>
                    </div>
                    <div className={`flex justify-between pt-1 border-t border-slate-700/40 font-medium ${
                      isDaylight ? 'text-amber-800' : 'text-slate-300'
                    }`}>
                      <span>Refundable Deposit</span>
                      <span>{formatINR(quote?.depositAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700/60 text-sm font-bold">
                      <span>Total Value</span>
                      <span className={isDaylight ? 'text-amber-800' : 'text-slate-100'}>
                        {formatINR(quote?.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || availableMachines.length === 0 || scopedCustomers.length === 0}
                    className={`w-full py-3 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50 transition-colors ${
                      isDaylight
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    {isSubmitting ? 'Reserving...' : 'Confirm Reservation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="w-full py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {customerDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/55 p-4 sm:p-6 backdrop-blur-md">
          <div className={`w-full max-w-xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border p-7 sm:p-8 ${isDaylight ? 'border-amber-300 bg-white text-slate-950' : 'border-amber-500/30 bg-[#242424] text-slate-100'}`}>
            <div className="mb-6 flex items-center justify-between border-b border-slate-700/30 pb-4">
              <div>
                <h3 className="text-lg font-black">{customerDialog === 'add' ? 'Add customer' : 'Edit customer'}</h3>
                <p className="mt-0.5 text-xs text-slate-400">This customer will be assigned to the selected booking territory.</p>
              </div>
              <button type="button" onClick={() => setCustomerDialog(null)} aria-label="Close customer dialog" className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100">✕</button>
            </div>
            <form onSubmit={saveCustomer} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold">Customer / business name</label>
                <input required value={customerForm.fullName} onChange={(event) => setCustomerForm({ ...customerForm, fullName: event.target.value })} className="w-full rounded-xl border p-3 text-sm focus:border-amber-500 focus:outline-none" placeholder="e.g. Sinha Infra Projects" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="mb-1 block text-xs font-bold">Mobile phone</label><input required value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} className="w-full rounded-xl border p-3 text-sm focus:border-amber-500 focus:outline-none" placeholder="+91 98765 43210" /></div>
                <div><label className="mb-1 block text-xs font-bold">Email (optional)</label><input type="email" value={customerForm.email} onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })} className="w-full rounded-xl border p-3 text-sm focus:border-amber-500 focus:outline-none" placeholder="contact@example.com" /></div>
              </div>
              <div><label className="mb-1 block text-xs font-bold">Address</label><input required value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} className="w-full rounded-xl border p-3 text-sm focus:border-amber-500 focus:outline-none" placeholder="Street, locality, city" /></div>
              <div><label className="mb-1 block text-xs font-bold">Verification tier</label><select value={customerForm.tier} onChange={(event) => setCustomerForm({ ...customerForm, tier: event.target.value as CustomerTier })} className="w-full rounded-xl border p-3 text-sm focus:border-amber-500 focus:outline-none"><option value="TIER_1_BASIC">Basic customer</option><option value="TIER_2_VERIFIED">Verified customer</option></select></div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setCustomerDialog(null)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800">Cancel</button>
                <button type="submit" className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400">{customerDialog === 'add' ? 'Add customer' : 'Save customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!customerPendingDelete}
        onClose={() => setCustomerPendingDelete(null)}
        onConfirm={deleteCustomer}
        variant="error"
        title="Delete customer?"
        message={`Delete ${customerPendingDelete?.fullName || 'this customer'} from the customer master? Customers with booking history are protected and can be edited instead.`}
        confirmLabel="Delete customer"
        showCancel
      />

      {/* Error Modal */}
      <ConfirmationModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        variant="error"
        title="Booking Failed"
        message={errorModal.message}
      />
    </div>
  );
};

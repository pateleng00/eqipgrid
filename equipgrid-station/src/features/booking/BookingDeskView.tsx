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
  Trash2,
  MessageSquare,
  Printer,
  ExternalLink,
  Banknote,
  CheckCircle2,
  FileText,
  Clock,
  Filter,
} from 'lucide-react';
import { cn, formatINR, formatDate } from '../../lib/utils';
import { SearchSelect } from '../../components/SearchSelect';
import { StatusBadge } from '../../components/StatusBadge';
import { SkeletonTable } from '../../components/SkeletonTable';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';
import { WhatsAppCirculationModal } from '../../components/WhatsAppCirculationModal';
import { HandoverChecklistModal } from '../../components/HandoverChecklistModal';
import { CollectPaymentModal } from '../../components/CollectPaymentModal';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { Asset, Booking, Customer, CustomerTier, QuoteCalculation } from '../../types';
import { printBookingConfirmationPdf, printDispatchChallanPdf } from '../../services/voucherPdfService';
import { getBookingWhatsAppMessage } from '../../services/whatsappCirculation';

interface BookingDeskViewProps {
  preselectedAsset?: Asset | null;
  onBookingCreated: () => void;
  onNavigateToDispatch?: () => void;
  initialViewMode?: 'all' | 'dispatch';
  openCreateModal?: boolean;
  onCreateModalOpened?: () => void;
}

export const BookingDeskView: React.FC<BookingDeskViewProps> = ({
  preselectedAsset,
  onBookingCreated,
  onNavigateToDispatch,
  initialViewMode = 'all',
  openCreateModal = false,
  onCreateModalOpened,
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

  // Modal states for creating new booking, WhatsApp notice, yard handover, payment collection
  const [showCreateModal, setShowCreateModal] = useState<boolean>(!!preselectedAsset);
  const [whatsAppModalBooking, setWhatsAppModalBooking] = useState<Booking | null>(null);
  const [dispatchModalBooking, setDispatchModalBooking] = useState<Booking | null>(null);
  const [paymentModalBooking, setPaymentModalBooking] = useState<Booking | null>(null);

  // SubView filter tab: 'ALL' | 'READY_DISPATCH' | 'DISPATCHED' | 'PENDING_PAYMENT'
  const [subView, setSubView] = useState<'ALL' | 'READY_DISPATCH' | 'DISPATCHED' | 'PENDING_PAYMENT'>(
    initialViewMode === 'dispatch' ? 'READY_DISPATCH' : 'ALL'
  );

  useEffect(() => {
    if (initialViewMode === 'dispatch') {
      setSubView('READY_DISPATCH');
    }
  }, [initialViewMode]);

  // Open modal when triggered externally (e.g. from Navbar "New Deployment" button)
  useEffect(() => {
    if (openCreateModal) {
      setBookingStateId('');
      setBookingCityId('');
      setBookingHubId('');
      setBookingCategory('');
      setSelectedAssetId(0);
      setSelectedCustomerId(0);
      setQuote(null);
      setDeliveryAddress('');
      setNotes('');
      setShowCreateModal(true);
      onCreateModalOpened?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreateModal]);

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

  const [visibleCount, setVisibleCount] = useState<number>(7);

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

  // Location and search filtered bookings
  const locationAndSearchFilteredBookings = useMemo(() => {
    return bookingsList.filter((b) => {
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

  // Dynamic counts for each subview
  const counts = useMemo(() => {
    let all = locationAndSearchFilteredBookings.length;
    let readyDispatch = 0;
    let dispatched = 0;
    let pendingPayment = 0;

    locationAndSearchFilteredBookings.forEach((b) => {
      if (b.status === 'CONFIRMED' || b.status === 'ALLOCATED' || b.status === 'DISPATCH_READY') {
        readyDispatch++;
      } else if (b.status === 'ON_RENT' || b.status === 'DISPATCHED') {
        dispatched++;
      } else if (b.status === 'PENDING_PAYMENT') {
        pendingPayment++;
      }
    });

    return { all, readyDispatch, dispatched, pendingPayment };
  }, [locationAndSearchFilteredBookings]);

  // Subview-filtered bookings list
  const filteredBookings = useMemo(() => {
    return locationAndSearchFilteredBookings.filter((b) => {
      if (subView === 'READY_DISPATCH') {
        return b.status === 'CONFIRMED' || b.status === 'ALLOCATED' || b.status === 'DISPATCH_READY';
      }
      if (subView === 'DISPATCHED') {
        return b.status === 'ON_RENT' || b.status === 'DISPATCHED';
      }
      if (subView === 'PENDING_PAYMENT') {
        return b.status === 'PENDING_PAYMENT';
      }
      return true; // 'ALL'
    });
  }, [locationAndSearchFilteredBookings, subView]);

  const reservedNotDispatched = filteredBookings;

  // Reset to initial 7 items when filters change
  useEffect(() => {
    setVisibleCount(7);
  }, [selectedStateId, selectedCityId, selectedHubId, searchQuery, subView]);

  // Infinite scroll slice (default 7 items, loads +7 on scroll)
  const visibleReservations = useMemo(() => {
    return filteredBookings.slice(0, visibleCount);
  }, [filteredBookings, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 60) {
      if (visibleCount < reservedNotDispatched.length) {
        setVisibleCount((prev) => Math.min(prev + 7, reservedNotDispatched.length));
      }
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 7, reservedNotDispatched.length));
  };

  // Form State for creating new reservation
  const [selectedAssetId, setSelectedAssetId] = useState<number>(
    preselectedAsset ? preselectedAsset.id : 0
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [bookingStateId, setBookingStateId] = useState<string>(preselectedAsset?.stateName ? String(cities.find((city) => city.name === preselectedAsset.cityName)?.stateId || '') : '');
  const [bookingCityId, setBookingCityId] = useState<string>(preselectedAsset?.cityName ? String(cities.find((city) => city.name === preselectedAsset.cityName)?.id || '') : '');
  const [bookingHubId, setBookingHubId] = useState<string>(preselectedAsset?.hubId ? String(preselectedAsset.hubId) : '');
  const [bookingCategory, setBookingCategory] = useState<string>(preselectedAsset?.category || '');
  const [customerDialog, setCustomerDialog] = useState<'add' | 'edit' | null>(null);
  const [customerPendingDelete, setCustomerPendingDelete] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({ fullName: '', phone: '', address: '', email: '', tier: 'TIER_1_BASIC' as CustomerTier });
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [distanceKm, setDistanceKm] = useState<number>(4.5);
  const [operatorRequired, setOperatorRequired] = useState<boolean>(false);
  const [selectedDealerId, setSelectedDealerId] = useState<string>('1');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [quote, setQuote] = useState<QuoteCalculation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  });

  const currentAsset = selectedAssetId ? assets.find((a) => a.id === selectedAssetId) || null : null;

  const hasSelectedFilters = Boolean(bookingStateId || bookingCityId || bookingHubId || bookingCategory);

  const bookingCities = useMemo(() => {
    if (!bookingStateId || bookingStateId === 'ALL') return cities;
    return cities.filter((city) => city.stateId === Number(bookingStateId));
  }, [cities, bookingStateId]);

  const bookingHubs = useMemo(() => {
    if (bookingCityId && bookingCityId !== 'ALL') return hubs.filter((hub) => hub.cityId === Number(bookingCityId));
    if (bookingStateId && bookingStateId !== 'ALL') {
      const cityIds = new Set(bookingCities.map((city) => city.id));
      return hubs.filter((hub) => cityIds.has(hub.cityId));
    }
    return hubs;
  }, [hubs, bookingCities, bookingCityId, bookingStateId]);

  const availableMachines = useMemo(() => {
    if (!hasSelectedFilters) return [];
    return assets.filter((asset) => {
      if (asset.status !== 'AVAILABLE') return false;
      if (bookingHubId && bookingHubId !== 'ALL' && asset.hubId !== Number(bookingHubId)) return false;
      if (bookingCityId && bookingCityId !== 'ALL') {
        const hub = hubs.find((h) => h.id === asset.hubId);
        if (hub && hub.cityId !== Number(bookingCityId)) return false;
      }
      if (bookingStateId && bookingStateId !== 'ALL') {
        const cityIds = new Set(cities.filter((c) => c.stateId === Number(bookingStateId)).map((c) => c.id));
        const hub = hubs.find((h) => h.id === asset.hubId);
        if (hub && !cityIds.has(hub.cityId)) return false;
      }
      if (bookingCategory && bookingCategory !== 'ALL' && asset.category !== bookingCategory) return false;
      return true;
    });
  }, [assets, hasSelectedFilters, bookingHubId, bookingCityId, bookingStateId, bookingCategory, hubs, cities]);

  const scopedCustomers = useMemo(() => {
    // Before hub selection, NO customer should show!
    if (!bookingHubId || bookingHubId === 'ALL') {
      return [];
    }
    const targetHubId = Number(bookingHubId);
    return customerList.filter((customer) => {
      if (customer.hubId) {
        return customer.hubId === targetHubId;
      }
      return false;
    });
  }, [customerList, bookingHubId]);

  useEffect(() => {
    if (availableMachines.length && !availableMachines.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(availableMachines[0].id);
    } else if (!availableMachines.length) {
      setSelectedAssetId(0);
    }
  }, [availableMachines, selectedAssetId]);

  useEffect(() => {
    // If hub is not selected or current customer is not in this hub's list, reset customer selection
    if (!bookingHubId || bookingHubId === 'ALL') {
      setSelectedCustomerId(0);
    } else if (selectedCustomerId && !scopedCustomers.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(0);
    }
  }, [scopedCustomers, selectedCustomerId, bookingHubId]);

  useEffect(() => {
    if (preselectedAsset) {
      setSelectedAssetId(preselectedAsset.id);
      if (preselectedAsset.hubId) setBookingHubId(String(preselectedAsset.hubId));
      if (preselectedAsset.category) setBookingCategory(preselectedAsset.category);
      setShowCreateModal(true);
    }
  }, [preselectedAsset]);

  // Quote recalculation
  useEffect(() => {
    if (!currentAsset) {
      setQuote(null);
      return;
    }
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
    if (!currentAsset) {
      setErrorModal({
        isOpen: true,
        message: 'Please select filters and an available machine before confirming.',
      });
      return;
    }
    if (!selectedCustomerId) {
      setErrorModal({
        isOpen: true,
        message: 'Please select a customer mapped to the chosen hub yard before confirming.',
      });
      return;
    }
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

      // Automatically trigger WhatsApp notification via backend bot dispatcher
      try {
        await api.sendBookingWhatsAppNotification(res.id);
      } catch (err) {
        console.warn('WhatsApp booking notification call:', err);
      }
    } catch (err: any) {
      setErrorModal({ isOpen: true, message: err.message || 'Booking creation failed. Please verify machine availability and customer details.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCustomerDialog = (mode: 'add' | 'edit') => {
    if (!bookingHubId || bookingHubId === 'ALL') {
      setErrorModal({
        isOpen: true,
        message: 'Please select a State, City, and Hub Yard before adding or managing a customer.',
      });
      return;
    }
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

  const handleOpenCreateModal = () => {
    setBookingStateId('');
    setBookingCityId('');
    setBookingHubId('');
    setBookingCategory('');
    setSelectedAssetId(0);
    setSelectedCustomerId(0);
    setQuote(null);
    setDeliveryAddress('');
    setNotes('');
    setShowCreateModal(true);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      {/* View Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2
            className={`text-lg sm:text-xl font-black flex items-center gap-2 ${
              isDaylight ? 'text-slate-950' : 'text-white'
            }`}
          >
            <CalendarCheck className={`h-5 w-5 ${isDaylight ? 'text-amber-700' : 'text-amber-400'}`} />
            Deployments Desk
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Manage equipment reservations, payment collection, and yard delivery challans in one unified workflow.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto ${
            isDaylight
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-none'
          }`}
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>New Deployment</span>
        </button>
      </div>

      {bookingSuccess && (() => {
        const recentBooking = bookingsList.find((b) => b.bookingNumber === bookingSuccess);
        return (
          <div
            className={`flex-shrink-0 rounded-xl border p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
              isDaylight
                ? 'border-emerald-500/60 bg-emerald-50/50 text-emerald-950'
                : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle className={`h-4 w-4 ${isDaylight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              <div>
                <div className="font-extrabold text-xs">Booking {bookingSuccess} Reserved Successfully!</div>
                <div className="text-[11px] opacity-80">
                  Machine staged for yard handover. WhatsApp notification queued for customer.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              {recentBooking && (
                <>
                  {recentBooking.status === 'PENDING_PAYMENT' ? (
                    <button
                      type="button"
                      onClick={() => setPaymentModalBooking(recentBooking)}
                      className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors shadow-xs"
                    >
                      <Banknote className="h-3 w-3" />
                      <span>Collect Payment</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDispatchModalBooking(recentBooking)}
                      className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer transition-colors shadow-xs"
                    >
                      <Truck className="h-3 w-3" />
                      <span>Dispatch Machine (DC)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setWhatsAppModalBooking(recentBooking)}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors shadow-xs"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>WhatsApp Notice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => printBookingConfirmationPdf({ booking: recentBooking })}
                    className={cn(
                      'flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border cursor-pointer transition-colors',
                      isDaylight
                        ? 'border-amber-300 bg-white text-amber-900 hover:bg-amber-50'
                        : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    )}
                  >
                    <Printer className="h-3 w-3" />
                    <span>PDF Voucher</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setBookingSuccess(null)}
                className={cn('text-xs px-2 py-1 font-bold cursor-pointer transition-colors', isDaylight ? 'text-slate-600 hover:text-slate-950' : 'text-slate-400 hover:text-white')}
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })()}

      {/* Cascading Filter Bar */}
      <div
        className={`flex-shrink-0 p-2.5 rounded-xl border transition-colors space-y-1.5 ${
          isDaylight ? 'border-slate-200 bg-white text-slate-950 shadow-sm' : 'border-slate-800 bg-slate-900/40 text-slate-200'
        }`}
      >
        <div className="flex items-center justify-end">
          <button
            onClick={handleResetFilters}
            className={`text-[11px] flex items-center gap-1 font-medium cursor-pointer ${
              isDaylight ? 'text-amber-800 hover:text-amber-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
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
                    ? 'border-slate-300 bg-white text-slate-950 placeholder-slate-500 focus:border-amber-600'
                    : 'border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:border-amber-500'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reserved Machines Not Dispatched Yet (Table) */}
      <div
        className={`flex-1 min-h-0 w-full rounded-2xl border overflow-hidden transition-colors flex flex-col ${
          isDaylight ? 'border-slate-200 bg-white text-slate-950 shadow-sm' : 'border-slate-800 bg-slate-900/40 text-slate-200'
        }`}
      >
        <div className="px-3.5 py-2.5 border-b flex flex-col md:flex-row md:items-center justify-between gap-2 border-slate-700/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CalendarCheck className={`h-4 w-4 ${isDaylight ? 'text-amber-700' : 'text-slate-400'}`} />
            <h3 className={`text-xs sm:text-sm font-black ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
              Equipment Deployments ({filteredBookings.length})
            </h3>
          </div>

          {/* Subview Segmented Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setSubView('ALL')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                subView === 'ALL'
                  ? isDaylight
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-amber-500 text-slate-950 font-black'
                  : isDaylight
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
              )}
            >
              <span>All Bookings</span>
              <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full font-mono', subView === 'ALL' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300')}>
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubView('READY_DISPATCH')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                subView === 'READY_DISPATCH'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : isDaylight
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
              )}
            >
              <Truck className="h-3 w-3" />
              <span>Ready for Dispatch</span>
              <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold', subView === 'READY_DISPATCH' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/20 text-amber-700 dark:text-amber-400')}>
                {counts.readyDispatch}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubView('DISPATCHED')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                subView === 'DISPATCHED'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : isDaylight
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
              )}
            >
              <span>Dispatched & On Rent</span>
              <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold', subView === 'DISPATCHED' ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400')}>
                {counts.dispatched}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubView('PENDING_PAYMENT')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
                subView === 'PENDING_PAYMENT'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : isDaylight
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
              )}
            >
              <Banknote className="h-3 w-3" />
              <span>Pending Payment</span>
              <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold', subView === 'PENDING_PAYMENT' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400')}>
                {counts.pendingPayment}
              </span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <SkeletonTable columns={7} rows={5} />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex-1 min-h-0 p-8 text-center text-slate-500 flex flex-col items-center justify-center space-y-1.5">
            <CalendarCheck className="h-7 w-7 mx-auto opacity-30 text-slate-500" />
            <div className="text-xs font-bold">No bookings found for the selected view</div>
            <p className="text-[11px] max-w-sm mx-auto">
              {subView === 'READY_DISPATCH'
                ? 'All reserved machines have been dispatched, or no reservations match the current filter.'
                : subView === 'DISPATCHED'
                ? 'No machinery is currently active on customer rental sites.'
                : subView === 'PENDING_PAYMENT'
                ? 'No bookings currently have pending advance or deposit payments.'
                : 'No bookings match your selected location and search filters.'}
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
                {visibleReservations.map((b) => (
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
                        <div className={`h-10 w-12 rounded-lg overflow-hidden shrink-0 border ${
                          isDaylight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-700'
                        }`}>
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setWhatsAppModalBooking(b)}
                          title="Circulate Booking Confirmation on WhatsApp"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => printBookingConfirmationPdf({ booking: b })}
                          title="Print / Download Official PDF Voucher"
                          className={cn(
                            'p-1.5 rounded-lg border transition-colors cursor-pointer',
                            isDaylight
                              ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                              : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                          )}
                        >
                          <Printer className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        </button>

                        {/* Direct Workflow Actions: Dispatch, Collect Payment, or View Challan */}
                        {(b.status === 'CONFIRMED' || b.status === 'ALLOCATED' || b.status === 'DISPATCH_READY') && (
                          <button
                            type="button"
                            onClick={() => setDispatchModalBooking(b)}
                            title="Execute Yard Handover & Issue Delivery Challan (DC)"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            <span>Dispatch (DC)</span>
                          </button>
                        )}

                        {b.status === 'PENDING_PAYMENT' && (
                          <button
                            type="button"
                            onClick={() => setPaymentModalBooking(b)}
                            title="Collect Advance / Deposit Payment"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            <span>Collect Payment</span>
                          </button>
                        )}

                        {(b.status === 'ON_RENT' || b.status === 'DISPATCHED') && (
                          <button
                            type="button"
                            onClick={() => {
                              printDispatchChallanPdf({
                                booking: b,
                                challan: {
                                  id: b.id,
                                  challanNumber: `DC-2026-${String(b.id).padStart(4, '0')}`,
                                  bookingId: b.id,
                                  assetTag: b.asset.assetTag,
                                  dispatchTimestamp: new Date().toISOString(),
                                  fuelLevel: '100% (Full Tank)',
                                  engineHoursOut: 14.5,
                                  accessoriesVerified: true,
                                  driverName: 'Suraj Logistics (E-Rickshaw 3W)',
                                  customerSignatureConfirmed: true,
                                },
                              });
                            }}
                            title="Print / View Delivery Challan (DC)"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border border-blue-500/40 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Challan (DC)</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Infinite Scroll Footer */}
        {filteredBookings.length > 0 && !isLoading && (
          <InfiniteScrollFooter
            loadedCount={visibleReservations.length}
            totalCount={filteredBookings.length}
            onLoadMore={handleLoadMore}
            itemName="bookings"
          />
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
            <div className={`flex items-center justify-between border-b pb-5 ${
              isDaylight ? 'border-slate-200' : 'border-slate-700/30'
            }`}>
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
                className={cn(
                  'rounded-lg border p-2 transition-colors cursor-pointer',
                  isDaylight
                    ? 'border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                )}
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
                    <SearchSelect options={[{ value: 'ALL', label: 'All States' }, ...states.map((state) => ({ value: String(state.id), label: state.name }))]} value={bookingStateId} onChange={(value) => { setBookingStateId(String(value || '')); setBookingCityId(''); setBookingHubId(''); }} placeholder="State" isClearable={true} />
                    <SearchSelect options={[{ value: 'ALL', label: 'All Cities' }, ...bookingCities.map((city) => ({ value: String(city.id), label: city.name }))]} value={bookingCityId} onChange={(value) => { setBookingCityId(String(value || '')); setBookingHubId(''); }} placeholder="City" isClearable={true} />
                    <SearchSelect options={[{ value: 'ALL', label: 'All Hubs' }, ...bookingHubs.map((hub) => ({ value: String(hub.id), label: hub.name }))]} value={bookingHubId} onChange={(value) => setBookingHubId(String(value || ''))} placeholder="Hub" isClearable={true} />
                    <SearchSelect options={[{ value: 'ALL', label: 'All Categories' }, { value: 'CONSTRUCTION', label: 'Construction' }, { value: 'AGRICULTURE', label: 'Agriculture' }]} value={bookingCategory} onChange={(value) => setBookingCategory(String(value || ''))} placeholder="Category" isClearable={true} />
                  </div>
                </div>
                {/* Equipment Selection */}
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label className="block text-xs font-bold">Available machine</label>
                    <span className="text-[11px] font-bold text-emerald-500">
                      {hasSelectedFilters ? `${availableMachines.length} available` : 'Filters required'}
                    </span>
                  </div>
                  {!hasSelectedFilters ? (
                    <div className="rounded-xl border border-dashed border-amber-500/40 p-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Filter className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Please select filters above (State, City, Hub, or Category) to display available machinery.</span>
                    </div>
                  ) : availableMachines.length ? (
                    <SearchSelect
                      options={availableMachines.map((a) => ({
                        value: a.id,
                        label: `[${a.assetTag}] ${a.name}`,
                        subLabel: `${formatINR(a.dailyRate)}/day • Dep: ${formatINR(a.depositAmount)} • Std: 8h/day (+1h buffer) • Yard: ${a.hubName || 'Hardoi'}`,
                        badge: 'AVAILABLE',
                      }))}
                      value={selectedAssetId}
                      onChange={(val) => val && setSelectedAssetId(Number(val))}
                      placeholder="Search an available machine..."
                      isClearable={false}
                    />
                  ) : (
                    <div className="rounded-xl border border-dashed border-amber-500/40 p-4 text-xs text-slate-400">
                      No available machines match this filter. Adjust the filters to continue.
                    </div>
                  )}
                </div>

                {/* Customer Selection */}
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label className="block text-xs font-bold">
                      Customer / Contractor <span className="text-amber-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {bookingHubId && bookingHubId !== 'ALL' && selectedCustomerId ? (
                        <>
                          <button type="button" onClick={() => openCustomerDialog('edit')} className="text-[11px] font-bold text-slate-400 hover:text-amber-400">Edit</button>
                          <button type="button" onClick={() => setCustomerPendingDelete(customerList.find((customer) => customer.id === selectedCustomerId) || null)} className="text-[11px] font-bold text-rose-400 hover:text-rose-300">Delete</button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openCustomerDialog('add')}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-black text-slate-950 hover:bg-amber-400 cursor-pointer"
                      >
                        <UserPlus className="h-3 w-3" /> Add customer
                      </button>
                    </div>
                  </div>

                  {!bookingHubId || bookingHubId === 'ALL' ? (
                    <div className={`rounded-xl border border-dashed p-3 text-xs flex items-center gap-2 ${
                      isDaylight ? 'border-amber-300 bg-amber-50/70 text-amber-900 font-medium' : 'border-amber-500/30 bg-amber-950/20 text-amber-300'
                    }`}>
                      <MapPin className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <span>Select <strong>State, City & Hub Yard</strong> above first to view customers assigned to that yard.</span>
                    </div>
                  ) : scopedCustomers.length ? (
                    <SearchSelect
                      options={scopedCustomers.map((c) => ({
                        value: c.id,
                        label: c.fullName,
                        subLabel: `Phone: ${c.phone} • ${c.address}`,
                        badge: c.tier,
                      }))}
                      value={selectedCustomerId || ''}
                      onChange={(val) => setSelectedCustomerId(Number(val) || 0)}
                      placeholder="Select customer assigned to this hub yard..."
                      isClearable={false}
                    />
                  ) : (
                    <div className="rounded-xl border border-dashed border-amber-500/40 p-3.5 text-xs text-slate-400">
                      No customer is mapped to this Hub Yard yet.{' '}
                      <button type="button" onClick={() => openCustomerDialog('add')} className="font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer">
                        Add the first customer for this hub.
                      </button>
                    </div>
                  )}
                </div>

                {/* Rental Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Dispatch Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Return End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:border-amber-500"
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
                    placeholder="e.g. Hardoi Bypass Road, Near Sugar Mill"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white text-slate-900 focus:outline-none focus:border-amber-500"
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

                  <div className="mt-2.5 flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Std: 8 hrs/day shift (+ 1 hr buffer) • Extra hrs billed from deposit</span>
                  </div>

                  {currentAsset && quote ? (
                    <div className="space-y-2 text-xs pt-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Duration</span>
                        <span className="font-bold">{quote.durationDays} Days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Base Equipment Rent</span>
                        <span className="font-bold">{formatINR(quote.baseRent)}</span>
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
                        <span className="font-bold">{formatINR(quote.operatorFee)}</span>
                      </div>
                      <div className={`flex justify-between pt-1 border-t font-medium ${
                        isDaylight ? 'border-slate-200 text-amber-800' : 'border-slate-700/40 text-slate-300'
                      }`}>
                        <span>Refundable Deposit</span>
                        <span>{formatINR(quote.depositAmount)}</span>
                      </div>
                      <div className={`flex justify-between pt-2 border-t text-sm font-bold ${
                        isDaylight ? 'border-slate-200' : 'border-slate-700/60'
                      }`}>
                        <span>Total Value</span>
                        <span className={isDaylight ? 'text-amber-800' : 'text-slate-100'}>
                          {formatINR(quote.totalAmount)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                      <p className="font-bold text-slate-500">No machine selected</p>
                      <p className="text-[11px]">Select filters and choose a machine to view commercial breakdown.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || !currentAsset || availableMachines.length === 0 || scopedCustomers.length === 0}
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
                    className={cn(
                      'w-full py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer',
                      isDaylight
                        ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                        : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                    )}
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
            <div className={`mb-6 flex items-center justify-between border-b pb-4 ${
              isDaylight ? 'border-slate-200' : 'border-slate-700/30'
            }`}>
              <div>
                <h3 className="text-lg font-black">{customerDialog === 'add' ? 'Add customer' : 'Edit customer'}</h3>
                <p className="mt-0.5 text-xs text-slate-400">This customer will be assigned to the selected booking territory.</p>
              </div>
              <button
                type="button"
                onClick={() => setCustomerDialog(null)}
                aria-label="Close customer dialog"
                className={cn(
                  'rounded-lg border p-2 transition-colors cursor-pointer',
                  isDaylight
                    ? 'border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                )}
              >
                ✕
              </button>
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
                <button
                  type="button"
                  onClick={() => setCustomerDialog(null)}
                  className={cn(
                    'rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer',
                    isDaylight
                      ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  )}
                >
                  Cancel
                </button>
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

      {/* WhatsApp Circulation Modal */}
      {whatsAppModalBooking && (
        <WhatsAppCirculationModal
          isOpen={!!whatsAppModalBooking}
          onClose={() => setWhatsAppModalBooking(null)}
          stageName="Booking Confirmation"
          bookingNumber={whatsAppModalBooking.bookingNumber}
          recipientName={whatsAppModalBooking.customer.fullName}
          recipientPhone={whatsAppModalBooking.customer.phone}
          message={getBookingWhatsAppMessage(whatsAppModalBooking)}
          onPrintPdf={() => printBookingConfirmationPdf({ booking: whatsAppModalBooking })}
          pdfButtonLabel="Print Booking Voucher PDF"
        />
      )}

      {/* Direct Yard Handover Checklist Modal */}
      {dispatchModalBooking && (
        <HandoverChecklistModal
          isOpen={!!dispatchModalBooking}
          booking={dispatchModalBooking}
          onClose={() => setDispatchModalBooking(null)}
          onHandoverCompleted={(_record) => {
            setBookingsList([...api.bookings]);
          }}
        />
      )}

      {/* Direct Collect Payment Modal */}
      {paymentModalBooking && (
        <CollectPaymentModal
          isOpen={!!paymentModalBooking}
          booking={paymentModalBooking}
          onClose={() => setPaymentModalBooking(null)}
          onPaymentCollected={(updated) => {
            setBookingsList([...api.bookings]);
            setPaymentModalBooking(null);
            // Immediately chain into handover checklist modal for uninterrupted flow!
            setDispatchModalBooking(updated);
          }}
        />
      )}
    </div>
  );
};

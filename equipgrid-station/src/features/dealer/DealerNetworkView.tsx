import React, { useState } from 'react';
import {
  Users,
  Percent,
  Plus,
  MapPin,
  Phone,
  CheckCircle,
  Building,
  TrendingUp,
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { formatINR, cn } from '../../lib/utils';
import { SearchSelect } from '../../components/SearchSelect';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';
import { api } from '../../services/api';
import { Dealer } from '../../types';

export const DealerNetworkView: React.FC = () => {
  const { isDaylight } = useTheme();
  const [dealers, setDealers] = useState<Dealer[]>(api.dealers);
  const [showAddModal, setShowAddModal] = useState(false);

  // Master location data
  const states = api.getStates();
  const cities = api.getCities();
  const hubs = api.getHubs();

  React.useEffect(() => {
    setDealers(api.dealers);
    return api.subscribe(() => {
      setDealers(api.dealers);
    });
  }, []);

  // Page-level filters: State, City, Hub
  const [filterStateId, setFilterStateId] = useState<string>('ALL');
  const [filterCityId, setFilterCityId] = useState<string>('ALL');
  const [filterHubId, setFilterHubId] = useState<string>('ALL');

  // Modal form states: Territory First (State -> City -> Hub), then Details
  const [modalStateId, setModalStateId] = useState<number | ''>(states[0]?.id || 1);
  const [modalCityId, setModalCityId] = useState<number | ''>(cities[0]?.id || 1);
  const [modalHubId, setModalHubId] = useState<number | ''>(hubs[0]?.id || 1);
  const [tradeName, setTradeName] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(0.06);

  // Cascading lists for Modal
  const modalAvailableCities = React.useMemo(() => {
    if (!modalStateId) return cities;
    return cities.filter((c) => c.stateId === Number(modalStateId));
  }, [cities, modalStateId]);

  const modalAvailableHubs = React.useMemo(() => {
    if (modalCityId) {
      return hubs.filter((h) => h.cityId === Number(modalCityId));
    }
    if (modalStateId) {
      const cityIds = new Set(modalAvailableCities.map((c) => c.id));
      return hubs.filter((h) => cityIds.has(h.cityId));
    }
    return hubs;
  }, [hubs, modalAvailableCities, modalCityId, modalStateId]);

  // Page filter cascading lists
  const pageAvailableCities = cities.filter((c) =>
    filterStateId === 'ALL' ? true : c.stateId === Number(filterStateId)
  );
  const pageAvailableHubs = hubs.filter((h) => {
    if (filterCityId !== 'ALL') return h.cityId === Number(filterCityId);
    if (filterStateId !== 'ALL') {
      const cityIds = new Set(pageAvailableCities.map((c) => c.id));
      return cityIds.has(h.cityId);
    }
    return true;
  });

  const filteredDealers = dealers.filter((d) => {
    if (filterHubId !== 'ALL') {
      if (d.hubId && d.hubId !== Number(filterHubId)) return false;
      const hub = hubs.find((h) => h.id === Number(filterHubId));
      if (!d.hubId && hub && !d.location.toLowerCase().includes(hub.name.toLowerCase())) return false;
    }
    if (filterCityId !== 'ALL') {
      if (d.cityId && d.cityId !== Number(filterCityId)) return false;
      const city = cities.find((c) => c.id === Number(filterCityId));
      if (!d.cityId && city && !d.location.toLowerCase().includes(city.name.toLowerCase())) return false;
    }
    if (filterStateId !== 'ALL') {
      if (d.stateId && d.stateId !== Number(filterStateId)) return false;
    }
    return true;
  });

  const [visibleCount, setVisibleCount] = useState<number>(7);

  React.useEffect(() => {
    setVisibleCount(7);
  }, [filterStateId, filterCityId, filterHubId]);

  const visibleDealers = React.useMemo(() => {
    return filteredDealers.slice(0, visibleCount);
  }, [filteredDealers, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 60) {
      if (visibleCount < filteredDealers.length) {
        setVisibleCount((prev) => Math.min(prev + 7, filteredDealers.length));
      }
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 7, filteredDealers.length));
  };

  const totalCommissions = filteredDealers.reduce((acc, d) => acc + d.totalCommissionEarned, 0);

  const handleOpenAdd = () => {
    const defaultHub = hubs[0];
    const defaultCity = cities.find((c) => c.id === defaultHub?.cityId);
    setModalStateId(defaultCity?.stateId || states[0]?.id || 1);
    setModalCityId(defaultCity?.id || cities[0]?.id || 1);
    setModalHubId(defaultHub?.id || 1);
    setTradeName('');
    setName('');
    setPhone('');
    setAltPhone('');
    setAddress('');
    setNotes('');
    setCommissionRate(0.06);
    setShowAddModal(true);
  };

  const handleAddDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedHub = hubs.find((h) => h.id === Number(modalHubId));
      const selectedCity = cities.find((c) => c.id === Number(modalCityId) || c.id === selectedHub?.cityId);
      const selectedState = states.find((s) => s.id === Number(modalStateId) || s.id === selectedCity?.stateId);

      const locationText = selectedHub
        ? `${selectedHub.name} (${selectedCity?.name || ''}, ${selectedState?.code || ''})`
        : address || 'Hub Yard Area';

      await api.addDealer({
        name,
        tradeName,
        phone,
        location: locationText,
        stateId: modalStateId ? Number(modalStateId) : undefined,
        cityId: modalCityId ? Number(modalCityId) : undefined,
        hubId: modalHubId ? Number(modalHubId) : undefined,
        hubName: selectedHub?.name,
        address: address || undefined,
        notes: notes || undefined,
        commissionRate: Number(commissionRate) || 0.06,
        active: true,
      });
      setShowAddModal(false);
      setTradeName('');
      setName('');
      setPhone('');
      setAltPhone('');
      setAddress('');
      setNotes('');
    } catch (err) {
      console.error('Failed to create dealer:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className={cn("text-lg sm:text-xl font-extrabold flex items-center gap-2", isDaylight ? "text-slate-950" : "text-white")}>
            <Users className="h-5 w-5 text-amber-500" />
            Channel Partners & Dealer Network (6% Model)
          </h2>
          <p className={cn("text-[11px] mt-0.5", isDaylight ? "text-slate-500" : "text-slate-400")}>
            Strategic partnerships across key cement yards, brick kilns & agri equipment stores
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-none self-start sm:self-auto ${
            isDaylight
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>Onboard Channel Partner</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-shrink-0">
        <div className={cn("rounded-xl border p-2.5 sm:p-3", isDaylight ? "border-slate-200 bg-white shadow-sm" : "border-slate-800 bg-slate-900/40")}>
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDaylight ? "text-slate-500" : "text-slate-400")}>Active Partners</span>
          <div className={cn("text-xl sm:text-2xl font-extrabold mt-0.5", isDaylight ? "text-slate-950" : "text-white")}>{filteredDealers.length} Yards / Stores</div>
          <p className={cn("text-[11px] mt-0.5", isDaylight ? "text-slate-500" : "text-slate-500")}>Covering network service territories</p>
        </div>

        <div className={cn("rounded-xl border p-2.5 sm:p-3", isDaylight ? "border-slate-200 bg-white shadow-sm" : "border-slate-800 bg-slate-900/40")}>
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDaylight ? "text-slate-500" : "text-slate-400")}>Commission Rule</span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-500 mt-0.5">6.0% Flat</div>
          <p className={cn("text-[11px] mt-0.5", isDaylight ? "text-slate-500" : "text-slate-500")}>Calculated on Gross Equipment Rent</p>
        </div>

        <div className={cn("rounded-xl border p-2.5 sm:p-3", isDaylight ? "border-slate-200 bg-white shadow-sm" : "border-slate-800 bg-slate-900/40")}>
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDaylight ? "text-slate-500" : "text-slate-400")}>Total Commissions Tracked</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-500 mt-0.5">{formatINR(totalCommissions)}</div>
          <p className={cn("text-[11px] mt-0.5", isDaylight ? "text-slate-500" : "text-slate-500")}>Payable upon completed rental</p>
        </div>
      </div>

      {/* Territory Filter Bar */}
      <div className={cn("flex flex-wrap items-center gap-2 p-2.5 sm:p-3 rounded-xl border flex-shrink-0", isDaylight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900/40")}>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
          <MapPin className="h-4 w-4 text-amber-500" />
          <span>Territory Filters:</span>
        </div>

        {/* State */}
        <div className="w-36 sm:w-44">
          <SearchSelect
            options={[
              { value: 'ALL', label: 'All States' },
              ...states.map((s) => ({ value: s.id, label: s.name, subLabel: s.code })),
            ]}
            value={filterStateId === 'ALL' ? 'ALL' : Number(filterStateId)}
            onChange={(val) => {
              setFilterStateId(String(val || 'ALL'));
              setFilterCityId('ALL');
              setFilterHubId('ALL');
            }}
            isClearable={false}
          />
        </div>

        {/* City */}
        <div className="w-40 sm:w-48">
          <SearchSelect
            options={[
              { value: 'ALL', label: 'All Cities' },
              ...pageAvailableCities.map((c) => ({ value: c.id, label: c.name, subLabel: c.pinCode ? `PIN: ${c.pinCode}` : undefined })),
            ]}
            value={filterCityId === 'ALL' ? 'ALL' : Number(filterCityId)}
            onChange={(val) => {
              setFilterCityId(String(val || 'ALL'));
              setFilterHubId('ALL');
            }}
            isClearable={false}
          />
        </div>

        {/* Hub */}
        <div className="w-44 sm:w-56">
          <SearchSelect
            options={[
              { value: 'ALL', label: 'All Hubs / Yards' },
              ...pageAvailableHubs.map((h) => ({ value: h.id, label: h.name, subLabel: h.code })),
            ]}
            value={filterHubId === 'ALL' ? 'ALL' : Number(filterHubId)}
            onChange={(val) => setFilterHubId(String(val || 'ALL'))}
            isClearable={false}
          />
        </div>

        {(filterStateId !== 'ALL' || filterCityId !== 'ALL' || filterHubId !== 'ALL') && (
          <button
            onClick={() => {
              setFilterStateId('ALL');
              setFilterCityId('ALL');
              setFilterHubId('ALL');
            }}
            className="text-xs text-amber-600 hover:text-amber-500 font-bold ml-auto cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Partner Directory Grid — scrolls within section only */}
      <div
        className={`flex-1 min-h-0 rounded-2xl border overflow-hidden flex flex-col ${
          isDaylight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900/40'
        }`}
      >
        <div
          onScroll={handleScroll}
          className="flex-1 min-h-0 p-3 overflow-y-auto"
        >
          {visibleDealers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Users className="h-10 w-10 text-slate-400 mb-2 opacity-50" />
              <p className="text-sm font-bold text-slate-500">No channel partners found matching selected territory filters</p>
              <button
                onClick={() => {
                  setFilterStateId('ALL');
                  setFilterCityId('ALL');
                  setFilterHubId('ALL');
                }}
                className="mt-3 text-xs text-amber-600 hover:text-amber-500 font-bold underline cursor-pointer"
              >
                Clear Territory Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {visibleDealers.map((dealer) => (
                <div
                  key={dealer.id}
                  className={`rounded-xl border p-5 space-y-3 transition-all shadow-md ${
                    isDaylight
                      ? 'border-slate-200 bg-white text-slate-950 hover:border-amber-400'
                      : 'border-slate-800 bg-slate-900/40 text-slate-200 hover:border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`font-bold text-sm ${isDaylight ? 'text-slate-950' : 'text-white'}`}>{dealer.tradeName}</h3>
                      <p className={`text-xs flex items-center gap-1 mt-0.5 ${isDaylight ? 'text-slate-600' : 'text-slate-400'}`}>
                        <MapPin className={`h-3 w-3 ${isDaylight ? 'text-amber-700' : 'text-slate-400'}`} />
                        {dealer.location}
                      </p>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-mono border ${
                      isDaylight
                        ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-700 font-medium'
                    }`}>
                      {((dealer.commissionRate || 0.06) * 100).toFixed(0)}% Partner
                    </span>
                  </div>

                  <div className={`space-y-1.5 text-xs pt-1 ${isDaylight ? 'text-slate-700' : 'text-slate-300'}`}>
                    <div className="flex items-center justify-between">
                      <span className={isDaylight ? 'text-slate-500' : 'text-slate-500'}>Contact Person:</span>
                      <span className={`font-medium ${isDaylight ? 'text-slate-900' : 'text-slate-200'}`}>{dealer.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isDaylight ? 'text-slate-500' : 'text-slate-500'}>Phone:</span>
                      <span className={`font-mono ${isDaylight ? 'text-slate-900' : 'text-slate-200'}`}>{dealer.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isDaylight ? 'text-slate-500' : 'text-slate-500'}>Bookings Referred:</span>
                      <span className={`font-bold ${isDaylight ? 'text-slate-950' : 'text-white'}`}>{dealer.totalReferrals}</span>
                    </div>
                    <div className={`flex items-center justify-between pt-1 border-t ${isDaylight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                      <span className={`font-semibold ${isDaylight ? 'text-slate-600' : 'text-slate-400'}`}>Earned Commission:</span>
                      <span className="font-bold text-emerald-500 font-mono">
                        {formatINR(dealer.totalCommissionEarned)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Infinite Scroll Footer */}
        <InfiniteScrollFooter
          loadedCount={visibleDealers.length}
          totalCount={filteredDealers.length}
          onLoadMore={handleLoadMore}
          itemName="partners"
        />
      </div>

      {/* --- ENLARGED ONBOARD CHANNEL PARTNER MODAL (3X SIZE WITH STATE->CITY->HUB CASCADE) --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className={`w-full max-w-5xl min-h-[580px] max-h-[calc(100vh-2.5rem)] overflow-y-auto rounded-3xl border p-8 sm:p-10 space-y-6 shadow-2xl transition-all ${
            isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-amber-500/30 bg-[#1e1e1e] text-white'
          }`}>
            {/* Modal Header */}
            <div className={`flex items-start justify-between border-b pb-5 ${isDaylight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500 border border-amber-500/30">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className={`text-xl font-black ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
                      Onboard Channel Partner & Dealer Configuration
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono">
                      6.0% Revenue Model
                    </span>
                  </div>
                  <p className={`mt-1 text-xs ${isDaylight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Select territory (State → City → Hub) first, then provide partner business credentials and commercial referral terms.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close dealer onboarding dialog"
                className={`rounded-xl border p-2.5 transition-colors cursor-pointer ${
                  isDaylight ? 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-800' : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDealer} className="space-y-6 text-left">
              {/* 1. Territory First Cascade: State -> City -> Hub */}
              <div className={`p-5 rounded-2xl border ${
                isDaylight ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-900/60 border-slate-800'
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black flex items-center gap-2 text-amber-900 dark:text-amber-400 uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-mono text-[10px] flex items-center justify-center font-bold">1</span>
                    <span>Territory Assignment (State → City → Stationed Hub) *</span>
                  </div>
                  <span className="text-[11px] text-slate-500">Required before partner details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      State *
                    </label>
                    <SearchSelect
                      options={states.map((s) => ({ value: s.id, label: s.name, subLabel: s.code }))}
                      value={modalStateId}
                      onChange={(val) => {
                        const sid = val ? Number(val) : '';
                        setModalStateId(sid);
                        setModalCityId('');
                        setModalHubId('');
                      }}
                      placeholder="Select State..."
                      isClearable={false}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      City / District *
                    </label>
                    <SearchSelect
                      options={modalAvailableCities.map((c) => ({ value: c.id, label: c.name, subLabel: c.pinCode ? `PIN: ${c.pinCode}` : undefined }))}
                      value={modalCityId}
                      onChange={(val) => {
                        const cid = val ? Number(val) : '';
                        setModalCityId(cid);
                        setModalHubId('');
                      }}
                      placeholder={modalStateId ? 'Select City...' : 'Select State First'}
                      isClearable={false}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Stationed Hub / Yard *
                    </label>
                    <SearchSelect
                      options={modalAvailableHubs.map((h) => ({ value: h.id, label: h.name, subLabel: h.code }))}
                      value={modalHubId}
                      onChange={(val) => val && setModalHubId(Number(val))}
                      placeholder="Select Hub..."
                      isClearable={false}
                    />
                  </div>
                </div>

                {modalHubId && (
                  <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-slate-800 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    <span>
                      Operating under yard:{' '}
                      <strong className="font-bold underline">{hubs.find((h) => h.id === Number(modalHubId))?.name}</strong>{' '}
                      ({cities.find((c) => c.id === Number(modalCityId))?.name},{' '}
                      {states.find((s) => s.id === Number(modalStateId))?.name})
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Partner & Business Details */}
              <div className={`p-5 rounded-2xl border ${
                isDaylight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-900/40 border-slate-800'
              } space-y-4`}>
                <div className="text-xs font-black flex items-center gap-2 text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-white font-mono text-[10px] flex items-center justify-center font-bold">2</span>
                  <span>Partner & Business Credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Business / Shop Trade Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bilgram Kisan Fertilizers & Agri Equipment Store"
                      value={tradeName}
                      onChange={(e) => setTradeName(e.target.value)}
                      className={`w-full rounded-xl border p-3 text-xs focus:border-amber-500 focus:outline-none ${
                        isDaylight ? 'border-slate-300 bg-white text-slate-900 font-semibold' : 'border-slate-700 bg-slate-950 text-white'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Proprietor / Contact Person Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Arvind Mishra"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full rounded-xl border p-3 text-xs focus:border-amber-500 focus:outline-none ${
                        isDaylight ? 'border-slate-300 bg-white text-slate-900 font-semibold' : 'border-slate-700 bg-slate-950 text-white'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Primary Mobile Phone *
                    </label>
                    <input
                      type="text"
                      placeholder="+91 94500 09988"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full rounded-xl border p-3 text-xs font-mono focus:border-amber-500 focus:outline-none ${
                        isDaylight ? 'border-slate-300 bg-white text-slate-900 font-semibold' : 'border-slate-700 bg-slate-950 text-white'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Alternate Phone / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98390 11223"
                      value={altPhone}
                      onChange={(e) => setAltPhone(e.target.value)}
                      className={`w-full rounded-xl border p-3 text-xs font-mono focus:border-amber-500 focus:outline-none ${
                        isDaylight ? 'border-slate-300 bg-white text-slate-900 font-semibold' : 'border-slate-700 bg-slate-950 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Shop / Yard Street Address & Landmark
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Shop #12, Near Mandi Samiti, Bilgram Road"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className={`w-full rounded-xl border p-3 text-xs focus:border-amber-500 focus:outline-none ${
                        isDaylight ? 'border-slate-300 bg-white text-slate-900 font-semibold' : 'border-slate-700 bg-slate-950 text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Commission Rate (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="25"
                        step="0.5"
                        value={commissionRate * 100}
                        onChange={(e) => setCommissionRate(parseFloat(e.target.value) / 100 || 0.06)}
                        className={`w-full rounded-xl border p-3 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none ${
                          isDaylight ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-700 bg-slate-950 text-white'
                        }`}
                      />
                      <span className="absolute right-3.5 top-3 text-xs font-bold text-amber-500">%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                    Partnership Notes & Territory Agreement
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Key partner for concrete mixers and mini excavators in Bilgram industrial/mandi perimeter. 6% commission settled after return of asset."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`w-full rounded-xl border p-3 text-xs focus:border-amber-500 focus:outline-none ${
                      isDaylight ? 'border-slate-300 bg-white text-slate-900 font-normal' : 'border-slate-700 bg-slate-950 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                    isDaylight ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-colors bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Confirm & Onboard Channel Partner</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

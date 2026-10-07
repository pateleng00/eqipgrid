import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Building2,
  Navigation,
  Plus,
  CheckCircle,
  Truck,
  Phone,
  Search,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { City, Hub, State } from '../../types';
import { SearchSelect } from '../../components/SearchSelect';
import { SkeletonTable } from '../../components/SkeletonTable';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';

export const LocationMasterView: React.FC = () => {
  const { isDaylight } = useTheme();

  // Master lists
  const [states, setStates] = useState<State[]>(() => api.getStates());
  const [cities, setCities] = useState<City[]>(() => api.getCities());
  const [hubs, setHubs] = useState<Hub[]>(() => api.getHubs());
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    setStates(api.getStates());
    setCities(api.getCities());
    setHubs(api.getHubs());
    return api.subscribe(() => {
      setStates(api.getStates());
      setCities(api.getCities());
      setHubs(api.getHubs());
    });
  }, []);

  // Parent-dependent cascading filters
  const [selectedStateId, setSelectedStateId] = useState<string>('ALL');
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [visibleCount, setVisibleCount] = useState<number>(7);

  // Modals for adding new entries
  const [showAddState, setShowAddState] = useState(false);
  const [newStateName, setNewStateName] = useState('');
  const [newStateCode, setNewStateCode] = useState('');

  const [showAddCity, setShowAddCity] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newCityPin, setNewCityPin] = useState('');
  const [newCityStateId, setNewCityStateId] = useState<number | ''>(states[0]?.id || '');

  const [showAddHub, setShowAddHub] = useState(false);
  const [newHubStateId, setNewHubStateId] = useState<number | ''>(states[0]?.id || '');
  const [newHubCityId, setNewHubCityId] = useState<number | ''>('');
  const [newHubName, setNewHubName] = useState('');
  const [newHubCode, setNewHubCode] = useState('');
  const [newHubAddress, setNewHubAddress] = useState('');
  const [newHubPhone, setNewHubPhone] = useState('');
  const [newHubRadius, setNewHubRadius] = useState('25');
  const [newHubLat, setNewHubLat] = useState('');
  const [newHubLng, setNewHubLng] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Available cities inside Add Hub modal (cascaded by selected newHubStateId)
  const hubModalAvailableCities = useMemo(() => {
    if (!newHubStateId) return [];
    return cities.filter((c) => c.stateId === Number(newHubStateId));
  }, [cities, newHubStateId]);

  // Dependent cascading options for directory:
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

  // Handle State Change -> Reset downstream City & Hub
  const handleStateChange = (val: string | number) => {
    const sId = String(val);
    setSelectedStateId(sId);
    setSelectedCityId('ALL');
    setSelectedHubId('ALL');
  };

  // Handle City Change -> Reset downstream Hub
  const handleCityChange = (val: string | number) => {
    const cId = String(val);
    setSelectedCityId(cId);
    setSelectedHubId('ALL');
  };

  const handleResetFilters = () => {
    setSelectedStateId('ALL');
    setSelectedCityId('ALL');
    setSelectedHubId('ALL');
    setSearchQuery('');
  };

  // Filtered hub rows based on state, city, hub, and text search
  const displayedHubs = useMemo(() => {
    return hubs.filter((hub) => {
      // Find city and state of this hub
      const city = cities.find((c) => c.id === hub.cityId);
      const stateId = city?.stateId;

      if (selectedStateId !== 'ALL' && stateId !== Number(selectedStateId)) return false;
      if (selectedCityId !== 'ALL' && hub.cityId !== Number(selectedCityId)) return false;
      if (selectedHubId !== 'ALL' && hub.id !== Number(selectedHubId)) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = hub.name.toLowerCase().includes(q);
        const matchCode = hub.code.toLowerCase().includes(q);
        const matchAddress = hub.address.toLowerCase().includes(q);
        const matchCity = city ? city.name.toLowerCase().includes(q) : false;
        if (!matchName && !matchCode && !matchAddress && !matchCity) return false;
      }
      return true;
    });
  }, [hubs, cities, selectedStateId, selectedCityId, selectedHubId, searchQuery]);

  // Reset to initial 7 items when location filters change
  React.useEffect(() => {
    setVisibleCount(7);
  }, [selectedStateId, selectedCityId, selectedHubId, searchQuery]);

  // Infinite scroll slice (default 7 items, loads +7 on scroll)
  const visibleHubs = useMemo(() => {
    return displayedHubs.slice(0, visibleCount);
  }, [displayedHubs, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 60) {
      if (visibleCount < displayedHubs.length) {
        setVisibleCount((prev) => Math.min(prev + 7, displayedHubs.length));
      }
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 7, displayedHubs.length));
  };

  const handleOpenAddState = () => {
    setNewStateName('');
    setNewStateCode('');
    setShowAddState(true);
  };

  const handleOpenAddCity = () => {
    setNewCityStateId(states[0]?.id || '');
    setNewCityName('');
    setNewCityPin('');
    setShowAddCity(true);
  };

  const handleOpenAddHub = () => {
    const firstState = states[0];
    const firstStateId = firstState?.id || '';
    setNewHubStateId(firstStateId);
    const stateCities = firstStateId ? cities.filter((c) => c.stateId === Number(firstStateId)) : [];
    setNewHubCityId(stateCities[0]?.id || '');
    setNewHubName('');
    setNewHubCode('');
    setNewHubAddress('');
    setNewHubPhone('');
    setNewHubRadius('25');
    setNewHubLat('');
    setNewHubLng('');
    setGpsLoading(false);
    setShowAddHub(true);
  };

  const handleCreateState = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStateName.trim() || !newStateCode.trim()) return;
    const added = api.addState(newStateName.trim(), newStateCode.trim());
    setStates([...api.getStates()]);
    setNewStateName('');
    setNewStateCode('');
    setShowAddState(false);
    setSuccessMsg(`State '${added.name}' created successfully.`);
  };

  const handleCreateCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityStateId || !newCityName.trim()) return;
    const added = api.addCity(Number(newCityStateId), newCityName.trim(), newCityPin.trim());
    setCities([...api.getCities()]);
    setNewCityName('');
    setNewCityPin('');
    setShowAddCity(false);
    setSuccessMsg(`City '${added.name}' added under state.`);
  };

  const handleCreateHub = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(newHubLat);
    const lng = parseFloat(newHubLng);
    if (!newHubStateId || !newHubCityId || !newHubName.trim() || !newHubCode.trim() || !newHubAddress.trim()) return;
    if (isNaN(lat) || isNaN(lng)) return; // lat/lng mandatory
    const added = api.addHub({
      cityId: Number(newHubCityId),
      name: newHubName.trim(),
      code: newHubCode.trim().toUpperCase(),
      address: newHubAddress.trim(),
      contactPhone: newHubPhone.trim() || undefined,
      operatingRadiusKm: parseFloat(newHubRadius) || 25,
      latitude: lat,
      longitude: lng,
    });
    setHubs([...api.getHubs()]);
    setNewHubName('');
    setNewHubCode('');
    setNewHubAddress('');
    setNewHubPhone('');
    setNewHubLat('');
    setNewHubLng('');
    setShowAddHub(false);
    setSuccessMsg(`Hub Yard '${added.name}' added successfully under city.`);
  };

  const handleGetGps = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewHubLat(pos.coords.latitude.toFixed(7));
        setNewHubLng(pos.coords.longitude.toFixed(7));
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
            <MapPin className={`h-5 w-5 ${isDaylight ? 'text-amber-700' : 'text-slate-400'}`} />
            Location Master
          </h2>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleOpenAddState}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              isDaylight
                ? 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 shadow-xs'
                : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add State</span>
          </button>
          <button
            onClick={handleOpenAddCity}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              isDaylight
                ? 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 shadow-xs'
                : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add City</span>
          </button>
          <button
            onClick={handleOpenAddHub}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-none ${
              isDaylight
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Hub Yard</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/60 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 flex items-center justify-between font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-slate-600 hover:text-slate-950 text-xs px-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dependent Cascading Filters: State -> City -> Hub */}
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
            <span>Reset All</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
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
                  subLabel: c.pinCode ? `PIN: ${c.pinCode}` : undefined,
                })),
              ]}
              value={selectedCityId}
              onChange={(val) => handleCityChange(val || 'ALL')}
              placeholder="All Cities"
              isClearable={false}
            />
          </div>

          {/* Hub / Yard Filter */}
          <div>
            <SearchSelect
              options={[
                { value: 'ALL', label: 'All Hubs' },
                ...availableHubs.map((h) => ({
                  value: String(h.id),
                  label: h.name,
                  badge: h.code,
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search yard, code, address..."
                className={`w-full rounded-lg border pl-8 pr-3 py-1.5 text-xs transition-colors focus:outline-none ${
                  isDaylight
                    ? 'border-slate-300 bg-white text-slate-950 placeholder-slate-500 focus:border-amber-600'
                    : 'border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:border-amber-500'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hub / Yard Table (With Skeleton Table support) */}
      <div
        className={`flex-1 min-h-0 rounded-2xl border overflow-hidden transition-colors flex flex-col ${
          isDaylight ? 'border-slate-200 bg-white text-slate-950 shadow-sm' : 'border-slate-800 bg-slate-900/40 text-slate-200'
        }`}
      >
        <div className="px-3.5 py-2 border-b flex items-center justify-between border-slate-700/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className={`h-4 w-4 ${isDaylight ? 'text-amber-700' : 'text-amber-400'}`} />
            <h3 className="font-black text-xs sm:text-sm">
              Registered Hubs & Depots ({displayedHubs.length})
            </h3>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <SkeletonTable columns={6} rows={5} />
          </div>
        ) : displayedHubs.length === 0 ? (
          <div className="flex-1 min-h-0 p-8 text-center text-slate-500 flex flex-col items-center justify-center space-y-1.5">
            <MapPin className="h-7 w-7 mx-auto opacity-30 text-amber-500" />
            <div className="text-xs font-bold">No Hubs Found matching current filter</div>
            <p className="text-[11px] max-w-sm mx-auto">
              Try adjusting the State or City selection, or add a new Hub under this location.
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
                  <th className="py-3 px-4">Yard Code</th>
                  <th className="py-3 px-4">Hub / Yard Name</th>
                  <th className="py-3 px-4">State & City</th>
                  <th className="py-3 px-4">Operating Radius</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Stationed Machinery</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  isDaylight ? 'divide-slate-200' : 'divide-slate-800/60'
                }`}
              >
                {visibleHubs.map((hub) => {
                  const city = cities.find((c) => c.id === hub.cityId);
                  const state = states.find((s) => s.id === city?.stateId);
                  const machinesStationed = api.assets.filter((a) => a.hubId === hub.id).length;

                  return (
                    <tr
                      key={hub.id}
                      className={`transition-colors ${
                        isDaylight ? 'hover:bg-slate-200/40' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className={`py-3.5 px-4 font-mono ${
                        isDaylight ? 'font-black text-amber-800' : 'font-medium text-slate-300'
                      }`}>
                        {hub.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-sm">{hub.name}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{hub.address}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold">{city?.name || 'N/A'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{state?.name || 'N/A'} ({state?.code})</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">
                          {hub.operatingRadiusKm} km radius
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {hub.contactPhone || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium">
                        <span className="flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-slate-500" />
                          <span>{machinesStationed} Units</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                          Active Yard
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Infinite Scroll Footer */}
        {displayedHubs.length > 0 && !isLoading && (
          <InfiniteScrollFooter
            loadedCount={visibleHubs.length}
            totalCount={displayedHubs.length}
            onLoadMore={handleLoadMore}
            itemName="registered yards"
          />
        )}
      </div>

      {/* --- ADD STATE MODAL --- */}
      {showAddState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div
            className={`w-full max-w-xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border p-7 sm:p-8 space-y-6 shadow-2xl transition-all ${
              isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#1e1e1e] text-white'
            }`}
          >
            <div className={`flex items-start justify-between border-b pb-4 ${
              isDaylight ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 border border-amber-500/30">
                  <Navigation className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-black ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
                      Add Regional State
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono">
                      Level 1: State
                    </span>
                  </div>
                  <p className={`mt-0.5 text-xs ${isDaylight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Top-level administrative territory for machinery deployment and tax jurisdiction.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddState(false)}
                aria-label="Close state dialog"
                className={`rounded-xl border p-2 transition-colors cursor-pointer ${
                  isDaylight
                    ? 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-800'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateState} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                  State Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajasthan, Madhya Pradesh, Uttar Pradesh"
                  value={newStateName}
                  onChange={(e) => setNewStateName(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 text-xs focus:border-amber-500 focus:outline-none ${
                    isDaylight ? 'border-slate-300 bg-white text-slate-900 font-semibold' : 'border-slate-700 bg-slate-950 text-white'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                  State Code (2-3 Chars) *
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. RJ, MP, UP"
                  value={newStateCode}
                  onChange={(e) => setNewStateCode(e.target.value.toUpperCase())}
                  className={`w-full rounded-xl border p-2.5 text-xs font-mono uppercase focus:border-amber-500 focus:outline-none ${
                    isDaylight ? 'border-slate-300 bg-white text-slate-900 font-bold' : 'border-slate-700 bg-slate-950 text-white'
                  }`}
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Used as standard prefix across all subordinate hub yard codes (e.g. HUB-{newStateCode || 'UP'}-01).
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddState(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                    isDaylight ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black cursor-pointer transition-colors bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Save State</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD CITY MODAL --- */}
      {showAddCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div
            className={`w-full max-w-xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border p-7 sm:p-8 space-y-6 shadow-2xl transition-all ${
              isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#1e1e1e] text-white'
            }`}
          >
            <div className={`flex items-start justify-between border-b pb-4 ${
              isDaylight ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 border border-amber-500/30">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-black ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
                      Add City / District
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono">
                      Level 2: City
                    </span>
                  </div>
                  <p className={`mt-0.5 text-xs ${isDaylight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Select parent state first, then enter the target urban district.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCity(false)}
                aria-label="Close city dialog"
                className={`rounded-xl border p-2 transition-colors cursor-pointer ${
                  isDaylight
                    ? 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-800'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCity} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                  Parent State *
                </label>
                <SearchSelect
                  options={states.map((s) => ({ value: s.id, label: s.name, subLabel: s.code }))}
                  value={newCityStateId}
                  onChange={(val) => setNewCityStateId(val ? Number(val) : '')}
                  placeholder="Select Parent State *"
                  isClearable={false}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                  City / District Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shahjahanpur, Sitapur, Hardoi"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 text-xs focus:border-amber-500 focus:outline-none ${
                    isDaylight ? 'border-slate-300 bg-white text-slate-900 font-semibold' : 'border-slate-700 bg-slate-950 text-white'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                  Postal PIN Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 242001"
                  value={newCityPin}
                  onChange={(e) => setNewCityPin(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 text-xs font-mono focus:border-amber-500 focus:outline-none ${
                    isDaylight ? 'border-slate-300 bg-white text-slate-900 font-bold' : 'border-slate-700 bg-slate-950 text-white'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCity(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                    isDaylight ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCityStateId}
                  className={`px-5 py-2 rounded-xl text-xs font-black cursor-pointer transition-colors flex items-center gap-1.5 ${
                    newCityStateId
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Save City</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD HUB YARD MODAL (BOTH STATE & CITY REQUIRED VIA SEARCHSELECT) --- */}
      {showAddHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div
            className={`w-full max-w-3xl max-h-[calc(100vh-2.5rem)] overflow-y-auto rounded-3xl border p-8 sm:p-10 space-y-6 shadow-2xl transition-all ${
              isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#1e1e1e] text-white'
            }`}
          >
            <div className={`flex items-start justify-between border-b pb-5 ${
              isDaylight ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500 border border-amber-500/30">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className={`text-lg font-black ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
                      Add New Stationed Hub Yard / Depot
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono">
                      Level 3: Yard
                    </span>
                  </div>
                  <p className={`mt-0.5 text-xs ${isDaylight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Both State and City selection are strictly required before configuring the hub facility.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddHub(false)}
                aria-label="Close hub dialog"
                className={`rounded-xl border p-2.5 transition-colors cursor-pointer ${
                  isDaylight
                    ? 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-800'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHub} className="space-y-6">
              {/* Step 1: Parent Territory (Both State & City Required) */}
              <div className={`p-5 rounded-2xl border ${
                isDaylight ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-900/60 border-slate-800'
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black flex items-center gap-2 text-amber-900 dark:text-amber-400 uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-mono text-[10px] flex items-center justify-center font-bold">1</span>
                    <span>Parent Territory (State & City Required) *</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Parent State *
                    </label>
                    <SearchSelect
                      options={states.map((s) => ({ value: s.id, label: s.name, subLabel: s.code }))}
                      value={newHubStateId}
                      onChange={(val) => {
                        const sid = val ? Number(val) : '';
                        setNewHubStateId(sid);
                        setNewHubCityId('');
                      }}
                      placeholder="Select Parent State *"
                      isClearable={false}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Parent City / District *
                    </label>
                    <SearchSelect
                      options={hubModalAvailableCities.map((c) => ({
                        value: c.id,
                        label: c.name,
                        subLabel: c.pinCode ? `PIN: ${c.pinCode}` : undefined,
                      }))}
                      value={newHubCityId}
                      onChange={(val) => setNewHubCityId(val ? Number(val) : '')}
                      placeholder={newHubStateId ? "Select Parent City *" : "Select State First"}
                      isDisabled={!newHubStateId}
                      isClearable={false}
                    />
                  </div>
                </div>

                {newHubStateId && newHubCityId && (
                  <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-slate-800 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    <span>
                      Stationing hub under{' '}
                      <strong>{cities.find((c) => c.id === Number(newHubCityId))?.name}</strong>,{' '}
                      <strong>{states.find((s) => s.id === Number(newHubStateId))?.name}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Step 2: Depot Specs & Operating Range */}
              <div className={`p-5 rounded-2xl border ${
                isDaylight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-900/40 border-slate-800'
              } space-y-4`}>
                <div className="text-xs font-black flex items-center gap-2 text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-white font-mono text-[10px] flex items-center justify-center font-bold">2</span>
                  <span>Hub Yard Identification & Facility Info</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Hub Yard Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Shahjahanpur Highway Depot"
                      value={newHubName}
                      onChange={(e) => setNewHubName(e.target.value)}
                      className={`w-full rounded-xl border p-2.5 text-xs focus:border-amber-500 focus:outline-none ${
                        isDaylight ? 'border-slate-300 bg-white text-slate-900 font-semibold' : 'border-slate-700 bg-slate-950 text-white'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Hub Code *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HUB-SHJ-01"
                      value={newHubCode}
                      onChange={(e) => setNewHubCode(e.target.value.toUpperCase())}
                      className={`w-full rounded-xl border p-2.5 text-xs font-mono uppercase focus:border-amber-500 focus:outline-none ${
                        isDaylight ? 'border-slate-300 bg-white text-slate-900 font-bold' : 'border-slate-700 bg-slate-950 text-white'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Operating Radius (KM) *
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="150"
                      value={newHubRadius}
                      onChange={(e) => setNewHubRadius(e.target.value)}
                      className={`w-full rounded-xl border p-2.5 text-xs font-mono focus:border-amber-500 focus:outline-none ${
                        isDaylight ? 'border-slate-300 bg-white text-slate-900 font-bold' : 'border-slate-700 bg-slate-950 text-white'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Primary Yard Contact / Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 94500 09988"
                      value={newHubPhone}
                      onChange={(e) => setNewHubPhone(e.target.value)}
                      className={`w-full rounded-xl border p-2.5 text-xs font-mono focus:border-amber-500 focus:outline-none ${
                        isDaylight ? 'border-slate-300 bg-white text-slate-900 font-semibold' : 'border-slate-700 bg-slate-950 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}>
                    Yard Street Address / Location Landmark *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Near Toll Plaza, Bareilly-Lucknow Highway, Shahjahanpur"
                    value={newHubAddress}
                    onChange={(e) => setNewHubAddress(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 text-xs focus:border-amber-500 focus:outline-none ${
                      isDaylight ? 'border-slate-300 bg-white text-slate-900 font-semibold' : 'border-slate-700 bg-slate-950 text-white'
                    }`}
                    required
                  />
                </div>

                {/* GPS Coordinates — Mandatory */}
                <div className={`p-4 rounded-xl border-2 ${
                  isDaylight ? 'border-amber-300 bg-amber-50/60' : 'border-amber-600/40 bg-amber-900/10'
                } space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-500" />
                      <span className={`text-xs font-black ${isDaylight ? 'text-amber-900' : 'text-amber-400'}`}>
                        GPS Coordinates *
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">(mandatory for distance calc)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetGps}
                      disabled={gpsLoading}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        gpsLoading
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {gpsLoading ? 'Getting GPS…' : 'Use My Location'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${isDaylight ? 'text-slate-700' : 'text-slate-300'}`}>
                        Latitude *
                      </label>
                      <input
                        type="number"
                        step="0.0000001"
                        min="6"
                        max="38"
                        placeholder="e.g. 27.3967000"
                        value={newHubLat}
                        onChange={(e) => setNewHubLat(e.target.value)}
                        className={`w-full rounded-xl border p-2.5 text-xs font-mono focus:border-amber-500 focus:outline-none ${
                          isDaylight ? 'border-slate-300 bg-white text-slate-900 font-bold' : 'border-slate-700 bg-slate-950 text-white'
                        }`}
                        required
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${isDaylight ? 'text-slate-700' : 'text-slate-300'}`}>
                        Longitude *
                      </label>
                      <input
                        type="number"
                        step="0.0000001"
                        min="68"
                        max="98"
                        placeholder="e.g. 80.1266000"
                        value={newHubLng}
                        onChange={(e) => setNewHubLng(e.target.value)}
                        className={`w-full rounded-xl border p-2.5 text-xs font-mono focus:border-amber-500 focus:outline-none ${
                          isDaylight ? 'border-slate-300 bg-white text-slate-900 font-bold' : 'border-slate-700 bg-slate-950 text-white'
                        }`}
                        required
                      />
                    </div>
                  </div>
                  {newHubLat && newHubLng && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      📍 {parseFloat(newHubLat).toFixed(5)}°N, {parseFloat(newHubLng).toFixed(5)}°E
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddHub(false)}
                  className={`px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                    isDaylight ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newHubStateId || !newHubCityId || !newHubLat || !newHubLng}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-colors flex items-center gap-2 ${
                    newHubStateId && newHubCityId && newHubLat && newHubLng
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Save Hub Yard</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

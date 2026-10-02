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

  // Modals for adding new entries
  const [showAddState, setShowAddState] = useState(false);
  const [newStateName, setNewStateName] = useState('');
  const [newStateCode, setNewStateCode] = useState('');

  const [showAddCity, setShowAddCity] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newCityPin, setNewCityPin] = useState('');
  const [newCityStateId, setNewCityStateId] = useState<number>(states[0]?.id || 1);

  const [showAddHub, setShowAddHub] = useState(false);
  const [newHubName, setNewHubName] = useState('');
  const [newHubCode, setNewHubCode] = useState('');
  const [newHubAddress, setNewHubAddress] = useState('');
  const [newHubPhone, setNewHubPhone] = useState('');
  const [newHubRadius, setNewHubRadius] = useState('25');
  const [newHubCityId, setNewHubCityId] = useState<number>(cities[0]?.id || 1);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dependent cascading options:
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
    if (!newCityName.trim()) return;
    const added = api.addCity(newCityStateId, newCityName.trim(), newCityPin.trim());
    setCities([...api.getCities()]);
    setNewCityName('');
    setNewCityPin('');
    setShowAddCity(false);
    setSuccessMsg(`City '${added.name}' added under state.`);
  };

  const handleCreateHub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHubName.trim() || !newHubCode.trim() || !newHubAddress.trim()) return;
    const added = api.addHub({
      cityId: newHubCityId,
      name: newHubName.trim(),
      code: newHubCode.trim(),
      address: newHubAddress.trim(),
      contactPhone: newHubPhone.trim() || undefined,
      operatingRadiusKm: parseFloat(newHubRadius) || 25,
    });
    setHubs([...api.getHubs()]);
    setNewHubName('');
    setNewHubCode('');
    setNewHubAddress('');
    setNewHubPhone('');
    setShowAddHub(false);
    setSuccessMsg(`Hub Yard '${added.name}' added successfully.`);
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
            <MapPin className={`h-6 w-6 ${isDaylight ? 'text-amber-700' : 'text-slate-400'}`} />
            Location Master
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddState(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
              isDaylight
                ? 'border-slate-400 bg-transparent text-slate-950 hover:bg-slate-200/50 font-bold'
                : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add State</span>
          </button>
          <button
            onClick={() => setShowAddCity(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
              isDaylight
                ? 'border-slate-400 bg-transparent text-slate-950 hover:bg-slate-200/50 font-bold'
                : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add City</span>
          </button>
          <button
            onClick={() => setShowAddHub(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-none ${
              isDaylight
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
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
            <span>Reset All</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                className={`w-full rounded-lg border pl-8 pr-3 py-2 text-xs transition-colors focus:outline-none ${
                  isDaylight
                    ? 'border-slate-300 bg-transparent text-slate-950 placeholder-slate-500 focus:border-amber-600'
                    : 'border-slate-800 bg-slate-950 text-white placeholder-slate-600 focus:border-amber-500'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hub / Yard Table (With Skeleton Table support) */}
      <div
        className={`rounded-2xl border overflow-hidden transition-colors ${
          isDaylight ? 'border-slate-300 bg-transparent text-slate-950' : 'border-slate-800 bg-slate-900/40 text-slate-200'
        }`}
      >
        <div className="p-4 border-b flex items-center justify-between border-slate-700/20">
          <div className="flex items-center gap-2">
            <Building2 className={`h-4 w-4 ${isDaylight ? 'text-amber-700' : 'text-amber-400'}`} />
            <h3 className="font-black text-sm">
              Registered Hubs & Depots ({displayedHubs.length})
            </h3>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <SkeletonTable columns={6} rows={5} />
          </div>
        ) : displayedHubs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <MapPin className="h-8 w-8 mx-auto opacity-30 text-amber-500" />
            <div className="text-sm font-bold">No Hubs Found matching current filter</div>
            <p className="text-xs max-w-sm mx-auto">
              Try adjusting the State or City selection, or add a new Hub under this location.
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
                {displayedHubs.map((hub) => {
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
      </div>

      {/* Add State Modal */}
      {showAddState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div
            className={`w-full max-w-xl min-h-[28rem] max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border p-7 sm:p-8 space-y-5 shadow-2xl transition-all ${
              isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#242424] text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/20">
              <h3 className="font-black text-sm">Add New Regional State (Top Level)</h3>
              <button
                onClick={() => setShowAddState(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateState} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">State Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rajasthan, Madhya Pradesh"
                  value={newStateName}
                  onChange={(e) => setNewStateName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">State Code (2-3 chars)</label>
                <input
                  type="text"
                  placeholder="e.g. RJ, MP"
                  value={newStateCode}
                  onChange={(e) => setNewStateCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono uppercase focus:outline-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddState(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-950"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                    isDaylight
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  }`}
                >
                  Save State
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add City Modal */}
      {showAddCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div
            className={`w-full max-w-xl min-h-[30rem] max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border p-7 sm:p-8 space-y-5 shadow-2xl transition-all ${
              isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#242424] text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/20">
              <h3 className="font-black text-sm">Add City under State</h3>
              <button
                onClick={() => setShowAddCity(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCity} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Select Parent State</label>
                <select
                  value={newCityStateId}
                  onChange={(e) => setNewCityStateId(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold focus:outline-none"
                >
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">City Name</label>
                <input
                  type="text"
                  placeholder="e.g. Shahjahanpur, Sitapur"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Postal PIN Code</label>
                <input
                  type="text"
                  placeholder="e.g. 242001"
                  value={newCityPin}
                  onChange={(e) => setNewCityPin(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCity(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-950"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                    isDaylight
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  }`}
                >
                  Save City
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Hub Yard Modal */}
      {showAddHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div
            className={`w-full max-w-2xl min-h-[34rem] max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border p-7 sm:p-8 space-y-5 shadow-2xl transition-all ${
              isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#242424] text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/20">
              <h3 className="font-black text-sm">Add New Hub Yard under City</h3>
              <button
                onClick={() => setShowAddHub(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateHub} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Select Parent City</label>
                <select
                  value={newHubCityId}
                  onChange={(e) => setNewHubCityId(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold focus:outline-none"
                >
                  {cities.map((c) => {
                    const st = states.find((s) => s.id === c.stateId);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({st?.code || ''})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Hub Yard Name</label>
                <input
                  type="text"
                  placeholder="e.g. Shahjahanpur Highway Depot"
                  value={newHubName}
                  onChange={(e) => setNewHubName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1">Hub Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HUB-SHJ-01"
                    value={newHubCode}
                    onChange={(e) => setNewHubCode(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono uppercase focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Operating Radius (km)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={newHubRadius}
                    onChange={(e) => setNewHubRadius(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Yard Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Near Toll Plaza, Bareilly-Lucknow Highway"
                  value={newHubAddress}
                  onChange={(e) => setNewHubAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+919450009988"
                  value={newHubPhone}
                  onChange={(e) => setNewHubPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHub(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-950"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                    isDaylight
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  }`}
                >
                  Save Hub Yard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

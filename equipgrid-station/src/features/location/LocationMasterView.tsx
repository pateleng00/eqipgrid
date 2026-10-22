import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Compass,
  Edit2,
  ExternalLink,
  Shield,
  User,
  Tag,
  Sparkles,
  AlertTriangle,
  Trash2,
  Power,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { api } from '../../services/api';
import { City, Hub, State, Customer, FarmLocation } from '../../types';
import { SearchSelect } from '../../components/SearchSelect';
import { SkeletonTable } from '../../components/SkeletonTable';
import { InfiniteScrollFooter } from '../../components/InfiniteScrollFooter';
import { getUrlParam, setUrlParam } from '../../lib/navigationState';
import { UpsertFarmLocationModal } from '../../components/UpsertFarmLocationModal';
import { cn } from '../../lib/utils';

export const LocationMasterView: React.FC = () => {
  const { isDaylight } = useTheme();

  // Subtab: 'hubs' | 'cities' | 'states' | 'farms'
  const [activeTab, setActiveTab] = useState<'hubs' | 'cities' | 'states' | 'farms'>('hubs');

  // Master lists (includeInactive = true for full administrative control)
  const [states, setStates] = useState<State[]>(() => api.getStates(true));
  const [cities, setCities] = useState<City[]>(() => api.getCities(undefined, true));
  const [hubs, setHubs] = useState<Hub[]>(() => api.getHubs(undefined, true));
  const [customers, setCustomers] = useState<Customer[]>(() => api.customers);
  const [allFarmLocations, setAllFarmLocations] = useState<{ customer: Customer; location: FarmLocation }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Farm location specific state
  const [selectedFarmCustomerId, setSelectedFarmCustomerId] = useState<string>('ALL');
  const [farmSearchQuery, setFarmSearchQuery] = useState('');
  const [isFarmModalOpen, setIsFarmModalOpen] = useState(false);
  const [farmLocationToEdit, setFarmLocationToEdit] = useState<FarmLocation | null>(null);
  const [farmModalCustomer, setFarmModalCustomer] = useState<Customer | null>(null);

  const refreshFarmLocations = useCallback(async () => {
    const custs = api.customers;
    setCustomers([...custs]);
    const items: { customer: Customer; location: FarmLocation }[] = [];
    for (const c of custs) {
      try {
        const locs = await api.getFarmLocations(c.id);
        for (const loc of locs) {
          items.push({ customer: c, location: loc });
        }
      } catch {}
    }
    setAllFarmLocations(items);
  }, []);

  useEffect(() => {
    setStates(api.getStates(true));
    setCities(api.getCities(undefined, true));
    setHubs(api.getHubs(undefined, true));
    setCustomers([...api.customers]);
    refreshFarmLocations();
    return api.subscribe(() => {
      setStates(api.getStates(true));
      setCities(api.getCities(undefined, true));
      setHubs(api.getHubs(undefined, true));
      setCustomers([...api.customers]);
      refreshFarmLocations();
    });
  }, [refreshFarmLocations]);

  // --- FILTERS FOR HUBS ---
  const [selectedStateId, setSelectedStateId] = useState<string>('ALL');
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');
  const [hubStatusFilter, setHubStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(10);

  // --- FILTERS FOR CITIES ---
  const [cityFilterStateId, setCityFilterStateId] = useState<string>('ALL');
  const [cityStatusFilter, setCityStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [citySearchQuery, setCitySearchQuery] = useState('');

  // --- FILTERS FOR STATES ---
  const [stateStatusFilter, setStateStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [stateSearchQuery, setStateSearchQuery] = useState('');

  // Modals for adding new entries
  const [showAddState, setShowAddState] = useState(() => getUrlParam('modal') === 'state');
  const [newStateName, setNewStateName] = useState('');
  const [newStateCode, setNewStateCode] = useState('');

  const [showAddCity, setShowAddCity] = useState(() => getUrlParam('modal') === 'city');
  const [newCityName, setNewCityName] = useState('');
  const [newCityPin, setNewCityPin] = useState('');
  const [newCityStateId, setNewCityStateId] = useState<number | ''>(states[0]?.id || '');

  const [showAddHub, setShowAddHub] = useState(() => getUrlParam('modal') === 'hub');
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

  // Modals for editing existing entries
  const [editingState, setEditingState] = useState<State | null>(null);
  const [editStateName, setEditStateName] = useState('');
  const [editStateCode, setEditStateCode] = useState('');

  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editCityName, setEditCityName] = useState('');
  const [editCityStateId, setEditCityStateId] = useState<number | ''>('');
  const [editCityPin, setEditCityPin] = useState('');

  const [editingHub, setEditingHub] = useState<Hub | null>(null);
  const [editHubStateId, setEditHubStateId] = useState<number | ''>('');
  const [editHubCityId, setEditHubCityId] = useState<number | ''>('');
  const [editHubName, setEditHubName] = useState('');
  const [editHubCode, setEditHubCode] = useState('');
  const [editHubAddress, setEditHubAddress] = useState('');
  const [editHubPhone, setEditHubPhone] = useState('');
  const [editHubRadius, setEditHubRadius] = useState('25');
  const [editHubLat, setEditHubLat] = useState('');
  const [editHubLng, setEditHubLng] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'hub' | 'city' | 'state';
    id: number;
    name: string;
    machinesCount: number;
  } | null>(null);

  useEffect(() => {
    if (showAddState) setUrlParam('modal', 'state');
    else if (showAddCity) setUrlParam('modal', 'city');
    else if (showAddHub) setUrlParam('modal', 'hub');
    else setUrlParam('modal', null);
  }, [showAddState, showAddCity, showAddHub]);

  // Available cities inside Add Hub modal (cascaded by selected newHubStateId)
  const hubModalAvailableCities = useMemo(() => {
    if (!newHubStateId) return [];
    return cities.filter((c) => c.stateId === Number(newHubStateId));
  }, [cities, newHubStateId]);

  // Available cities inside Edit Hub modal (cascaded by selected editHubStateId)
  const editHubModalAvailableCities = useMemo(() => {
    if (!editHubStateId) return [];
    return cities.filter((c) => c.stateId === Number(editHubStateId));
  }, [cities, editHubStateId]);

  // Dependent cascading options for hub directory:
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

  // Reset downstream filters
  const handleStateChange = (val: string | number) => {
    const sId = String(val);
    setSelectedStateId(sId);
    setSelectedCityId('ALL');
    setSelectedHubId('ALL');
  };

  const handleCityChange = (val: string | number) => {
    const cId = String(val);
    setSelectedCityId(cId);
    setSelectedHubId('ALL');
  };

  const handleResetHubFilters = () => {
    setSelectedStateId('ALL');
    setSelectedCityId('ALL');
    setSelectedHubId('ALL');
    setHubStatusFilter('ALL');
    setSearchQuery('');
  };

  // Filtered hubs list
  const displayedHubs = useMemo(() => {
    return hubs.filter((hub) => {
      const city = cities.find((c) => c.id === hub.cityId);
      const stateId = city?.stateId;

      if (selectedStateId !== 'ALL' && stateId !== Number(selectedStateId)) return false;
      if (selectedCityId !== 'ALL' && hub.cityId !== Number(selectedCityId)) return false;
      if (selectedHubId !== 'ALL' && hub.id !== Number(selectedHubId)) return false;

      if (hubStatusFilter === 'ACTIVE' && !hub.active) return false;
      if (hubStatusFilter === 'INACTIVE' && hub.active) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = hub.name.toLowerCase().includes(q);
        const matchCode = hub.code.toLowerCase().includes(q);
        const matchAddress = (hub.address || '').toLowerCase().includes(q);
        const matchCity = city ? city.name.toLowerCase().includes(q) : false;
        if (!matchName && !matchCode && !matchAddress && !matchCity) return false;
      }
      return true;
    });
  }, [hubs, cities, selectedStateId, selectedCityId, selectedHubId, hubStatusFilter, searchQuery]);

  // Filtered cities list
  const displayedCities = useMemo(() => {
    return cities.filter((city) => {
      if (cityFilterStateId !== 'ALL' && city.stateId !== Number(cityFilterStateId)) return false;
      if (cityStatusFilter === 'ACTIVE' && !city.active) return false;
      if (cityStatusFilter === 'INACTIVE' && city.active) return false;

      if (citySearchQuery.trim()) {
        const q = citySearchQuery.toLowerCase();
        const matchName = city.name.toLowerCase().includes(q);
        const matchPin = (city.pinCode || '').toLowerCase().includes(q);
        const state = states.find((s) => s.id === city.stateId);
        const matchState = state ? state.name.toLowerCase().includes(q) : false;
        if (!matchName && !matchPin && !matchState) return false;
      }
      return true;
    });
  }, [cities, states, cityFilterStateId, cityStatusFilter, citySearchQuery]);

  // Filtered states list
  const displayedStates = useMemo(() => {
    return states.filter((state) => {
      if (stateStatusFilter === 'ACTIVE' && !state.active) return false;
      if (stateStatusFilter === 'INACTIVE' && state.active) return false;

      if (stateSearchQuery.trim()) {
        const q = stateSearchQuery.toLowerCase();
        const matchName = state.name.toLowerCase().includes(q);
        const matchCode = state.code.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [states, stateStatusFilter, stateSearchQuery]);

  // Filtered farm locations
  const filteredFarmLocations = useMemo(() => {
    return allFarmLocations.filter(({ customer, location }) => {
      if (selectedFarmCustomerId !== 'ALL' && customer.id !== Number(selectedFarmCustomerId)) return false;
      if (!farmSearchQuery.trim()) return true;
      const q = farmSearchQuery.toLowerCase();
      const matchLocal = (location.localName || '').toLowerCase().includes(q);
      const matchHindi = (location.localNameHindi || '').toLowerCase().includes(q);
      const matchAliases = (location.aliases || '').toLowerCase().includes(q);
      const matchVillage = (location.village || '').toLowerCase().includes(q);
      const matchLandmark = (location.landmark || '').toLowerCase().includes(q);
      const matchCustomer = (customer.fullName || '').toLowerCase().includes(q) || (customer.phone || '').includes(q);
      return matchLocal || matchHindi || matchAliases || matchVillage || matchLandmark || matchCustomer;
    });
  }, [allFarmLocations, selectedFarmCustomerId, farmSearchQuery]);

  // Infinite scroll slice for hubs
  const visibleHubs = useMemo(() => {
    return displayedHubs.slice(0, visibleCount);
  }, [displayedHubs, visibleCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 60) {
      if (visibleCount < displayedHubs.length) {
        setVisibleCount((prev) => Math.min(prev + 10, displayedHubs.length));
      }
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 10, displayedHubs.length));
  };

  // Helper machine counts
  const getHubActiveMachines = (hubId: number) => {
    return api.assets.filter((a) => a.hubId === hubId && a.status !== 'RETIRED').length;
  };

  const getCityActiveMachines = (cityId: number) => {
    const cityHubIds = new Set(hubs.filter((h) => h.cityId === cityId).map((h) => h.id));
    return api.assets.filter((a) => a.hubId && cityHubIds.has(a.hubId) && a.status !== 'RETIRED').length;
  };

  const getStateActiveMachines = (stateId: number) => {
    const stateCityIds = new Set(cities.filter((c) => c.stateId === stateId).map((c) => c.id));
    const stateHubIds = new Set(hubs.filter((h) => stateCityIds.has(h.cityId)).map((h) => h.id));
    return api.assets.filter((a) => a.hubId && stateHubIds.has(a.hubId) && a.status !== 'RETIRED').length;
  };

  // --- ACTIONS: CREATION ---
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

  const handleCreateState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStateName.trim() || !newStateCode.trim()) return;
    setErrorMsg(null);
    setActionLoading(true);
    try {
      const added = await api.createState(newStateName.trim(), newStateCode.trim());
      setStates([...api.getStates(true)]);
      setNewStateName('');
      setNewStateCode('');
      setShowAddState(false);
      setSuccessMsg(`State '${added.name}' created successfully.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create state.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityStateId || !newCityName.trim()) return;
    setErrorMsg(null);
    setActionLoading(true);
    try {
      const added = await api.createCity(Number(newCityStateId), newCityName.trim(), newCityPin.trim());
      setCities([...api.getCities(undefined, true)]);
      setNewCityName('');
      setNewCityPin('');
      setShowAddCity(false);
      setSuccessMsg(`City '${added.name}' added successfully under state.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create city.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateHub = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(newHubLat);
    const lng = parseFloat(newHubLng);
    if (!newHubStateId || !newHubCityId || !newHubName.trim() || !newHubCode.trim() || !newHubAddress.trim()) return;
    if (isNaN(lat) || isNaN(lng)) return;
    setErrorMsg(null);
    setActionLoading(true);
    try {
      const added = await api.createHub({
        cityId: Number(newHubCityId),
        name: newHubName.trim(),
        code: newHubCode.trim().toUpperCase(),
        address: newHubAddress.trim(),
        contactPhone: newHubPhone.trim() || undefined,
        operatingRadiusKm: parseFloat(newHubRadius) || 25,
        latitude: lat,
        longitude: lng,
      });
      setHubs([...api.getHubs(undefined, true)]);
      setNewHubName('');
      setNewHubCode('');
      setNewHubAddress('');
      setNewHubPhone('');
      setNewHubLat('');
      setNewHubLng('');
      setShowAddHub(false);
      setSuccessMsg(`Hub Yard '${added.name}' added successfully under city.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create hub.');
    } finally {
      setActionLoading(false);
    }
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
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // --- ACTIONS: STATUS TOGGLE (WITH ACTIVE MACHINE GUARD CAPTURE) ---
  const handleToggleHubStatus = async (hub: Hub) => {
    setErrorMsg(null);
    setActionLoading(true);
    const targetStatus = !hub.active;
    try {
      await api.toggleHubStatus(hub.id, targetStatus);
      setHubs([...api.getHubs(undefined, true)]);
      setSuccessMsg(
        targetStatus
          ? `Hub '${hub.name}' has been activated.`
          : `Hub '${hub.name}' has been deactivated.`
      );
    } catch (err: any) {
      // Backend BusinessRuleViolationException captured here (active machine guard)
      setErrorMsg(err.message || 'Cannot modify Hub status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCityStatus = async (city: City) => {
    setErrorMsg(null);
    setActionLoading(true);
    const targetStatus = !city.active;
    try {
      await api.toggleCityStatus(city.id, targetStatus);
      setCities([...api.getCities(undefined, true)]);
      setSuccessMsg(
        targetStatus
          ? `City '${city.name}' has been activated.`
          : `City '${city.name}' has been deactivated.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Cannot modify City status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStateStatus = async (state: State) => {
    setErrorMsg(null);
    setActionLoading(true);
    const targetStatus = !state.active;
    try {
      await api.toggleStateStatus(state.id, targetStatus);
      setStates([...api.getStates(true)]);
      setSuccessMsg(
        targetStatus
          ? `State '${state.name}' has been activated.`
          : `State '${state.name}' has been deactivated.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Cannot modify State status.');
    } finally {
      setActionLoading(false);
    }
  };

  // --- ACTIONS: EDIT MODALS ---
  const handleOpenEditState = (state: State) => {
    setEditingState(state);
    setEditStateName(state.name);
    setEditStateCode(state.code);
  };

  const handleSaveEditState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingState || !editStateName.trim() || !editStateCode.trim()) return;
    setErrorMsg(null);
    setActionLoading(true);
    try {
      await api.updateState(editingState.id, {
        name: editStateName.trim(),
        code: editStateCode.trim().toUpperCase(),
      });
      setStates([...api.getStates(true)]);
      setEditingState(null);
      setSuccessMsg(`State '${editStateName}' updated successfully.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update state.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditCity = (city: City) => {
    setEditingCity(city);
    setEditCityName(city.name);
    setEditCityStateId(city.stateId);
    setEditCityPin(city.pinCode || '');
  };

  const handleSaveEditCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCity || !editCityStateId || !editCityName.trim()) return;
    setErrorMsg(null);
    setActionLoading(true);
    try {
      await api.updateCity(editingCity.id, {
        stateId: Number(editCityStateId),
        name: editCityName.trim(),
        pinCode: editCityPin.trim() || undefined,
      });
      setCities([...api.getCities(undefined, true)]);
      setEditingCity(null);
      setSuccessMsg(`City '${editCityName}' updated successfully.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update city.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditHub = (hub: Hub) => {
    setEditingHub(hub);
    const parentCity = cities.find((c) => c.id === hub.cityId);
    setEditHubStateId(parentCity?.stateId || states[0]?.id || '');
    setEditHubCityId(hub.cityId);
    setEditHubName(hub.name);
    setEditHubCode(hub.code);
    setEditHubAddress(hub.address || '');
    setEditHubPhone(hub.contactPhone || '');
    setEditHubRadius(hub.operatingRadiusKm != null ? String(hub.operatingRadiusKm) : '25');
    setEditHubLat(hub.latitude != null ? String(hub.latitude) : '');
    setEditHubLng(hub.longitude != null ? String(hub.longitude) : '');
  };

  const handleSaveEditHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHub || !editHubCityId || !editHubName.trim() || !editHubCode.trim() || !editHubAddress.trim()) return;
    const lat = parseFloat(editHubLat);
    const lng = parseFloat(editHubLng);
    if (isNaN(lat) || isNaN(lng)) {
      setErrorMsg('Valid GPS Latitude and Longitude are mandatory.');
      return;
    }
    setErrorMsg(null);
    setActionLoading(true);
    try {
      await api.updateHub(editingHub.id, {
        cityId: Number(editHubCityId),
        name: editHubName.trim(),
        code: editHubCode.trim().toUpperCase(),
        address: editHubAddress.trim(),
        contactPhone: editHubPhone.trim() || undefined,
        operatingRadiusKm: parseFloat(editHubRadius) || 25,
        latitude: lat,
        longitude: lng,
      });
      setHubs([...api.getHubs(undefined, true)]);
      setEditingHub(null);
      setSuccessMsg(`Hub Yard '${editHubName}' updated successfully.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update hub.');
    } finally {
      setActionLoading(false);
    }
  };

  // --- ACTIONS: DELETE CONFIRMATION ---
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setErrorMsg(null);
    setActionLoading(true);
    try {
      if (deleteTarget.type === 'hub') {
        await api.deleteHub(deleteTarget.id);
        setHubs([...api.getHubs(undefined, true)]);
        setSuccessMsg(`Hub '${deleteTarget.name}' deleted successfully.`);
      } else if (deleteTarget.type === 'city') {
        await api.deleteCity(deleteTarget.id);
        setCities([...api.getCities(undefined, true)]);
        setSuccessMsg(`City '${deleteTarget.name}' deleted successfully.`);
      } else if (deleteTarget.type === 'state') {
        await api.deleteState(deleteTarget.id);
        setStates([...api.getStates(true)]);
        setSuccessMsg(`State '${deleteTarget.name}' deleted successfully.`);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      // Backend guard message shown
      setErrorMsg(err.message || `Failed to delete ${deleteTarget.type}.`);
      setDeleteTarget(null);
    } finally {
      setActionLoading(false);
    }
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
            <MapPin className={`h-5 w-5 ${isDaylight ? 'text-amber-700' : 'text-amber-400'}`} />
            Hub Locations & Geographical Entities (स्टेशन व क्षेत्र प्रबंधन)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Territory hierarchy, active machine allocation guards, and farmer delivery locations
          </p>
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
            <span>State (राज्य)</span>
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
            <span>City (शहर)</span>
          </button>
          <button
            onClick={handleOpenAddHub}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Hub (नया स्टेशन)</span>
          </button>
          {activeTab === 'farms' && (
            <button
              onClick={() => {
                const targetCustomer =
                  selectedFarmCustomerId !== 'ALL'
                    ? customers.find((c) => c.id === Number(selectedFarmCustomerId)) || customers[0]
                    : customers[0];
                setFarmLocationToEdit(null);
                setFarmModalCustomer(targetCustomer || null);
                setIsFarmModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-900/30"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Field (खेत का पता)</span>
            </button>
          )}
        </div>
      </div>

      {/* Subtab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('hubs')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0',
            activeTab === 'hubs'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Station Yards (स्टेशन व यार्ड)</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
            {hubs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cities')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0',
            activeTab === 'cities'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>Cities & Districts (शहर व जिले)</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
            {cities.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('states')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0',
            activeTab === 'states'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
        >
          <Navigation className="h-3.5 w-3.5" />
          <span>States & Regions (राज्य व प्रांत)</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
            {states.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('farms')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0',
            activeTab === 'farms'
              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
        >
          <Compass className="h-3.5 w-3.5" />
          <span>Farmer Fields (किसानों के खेत)</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
            {allFarmLocations.length}
          </span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-500/60 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white text-xs px-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Deactivation Guard & Server Error Violation Alert */}
      {errorMsg && (
        <div className="rounded-xl border-2 border-rose-500/70 bg-rose-500/15 p-3.5 text-xs text-rose-900 dark:text-rose-200 flex items-start justify-between font-bold shadow-md shadow-rose-950/20 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                Action Barred (कार्य निष्पादन अवरुद्ध)
              </div>
              <p className="font-semibold leading-relaxed">{errorMsg}</p>
            </div>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-700 dark:text-rose-300 hover:text-rose-950 dark:hover:text-white text-xs px-2 cursor-pointer font-black"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 1: HUB YARDS DIRECTORY --- */}
      {/* ========================================================================= */}
      {activeTab === 'hubs' && (
        <>
          {/* Dependent Cascading Filters: State -> City -> Hub */}
          <div
            className={`flex-shrink-0 p-2.5 rounded-xl border transition-colors space-y-1.5 ${
              isDaylight
                ? 'border-slate-200 bg-white text-slate-950 shadow-sm'
                : 'border-slate-800 bg-slate-900/40 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Territory Cascading Filter & Search (राज्य ➔ शहर ➔ स्टेशन यार्ड)
              </span>
              <button
                onClick={handleResetHubFilters}
                className={`text-[11px] flex items-center gap-1 font-medium cursor-pointer ${
                  isDaylight ? 'text-amber-800 hover:text-amber-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {/* State Filter */}
              <div>
                <SearchSelect
                  options={[{ value: 'ALL', label: 'All States' }, ...states.map((s) => ({ value: String(s.id), label: s.name, badge: s.code }))]}
                  value={selectedStateId}
                  onChange={handleStateChange}
                  placeholder="All States"
                  isClearable={false}
                />
              </div>

              {/* City Filter */}
              <div>
                <SearchSelect
                  options={
                    selectedStateId !== 'ALL' && availableCities.length === 0
                      ? []
                      : [{ value: 'ALL', label: 'All Cities' }, ...availableCities.map((c) => ({ value: String(c.id), label: c.name }))]
                  }
                  value={selectedCityId}
                  onChange={handleCityChange}
                  placeholder={selectedStateId !== 'ALL' && availableCities.length === 0 ? 'No cities in this State' : 'All Cities'}
                  isDisabled={selectedStateId !== 'ALL' && availableCities.length === 0}
                  isClearable={false}
                />
              </div>

              {/* Hub Filter */}
              <div>
                <SearchSelect
                  options={
                    (selectedCityId !== 'ALL' && availableHubs.length === 0) ||
                    (selectedStateId !== 'ALL' && availableCities.length === 0)
                      ? []
                      : [
                          { value: 'ALL', label: 'All Hubs' },
                          ...availableHubs.map((h) => ({
                            value: String(h.id),
                            label: h.name,
                            badge: h.code,
                          })),
                        ]
                  }
                  value={selectedHubId}
                  onChange={(val) => setSelectedHubId(String(val || 'ALL'))}
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
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={hubStatusFilter}
                  onChange={(e) => setHubStatusFilter(e.target.value as any)}
                  className={`w-full rounded-lg border px-3 py-1.5 text-xs transition-colors focus:outline-none ${
                    isDaylight
                      ? 'border-slate-300 bg-white text-slate-950 font-medium'
                      : 'border-slate-800 bg-slate-950 text-white font-medium'
                  }`}
                >
                  <option value="ALL">All Statuses (सभी)</option>
                  <option value="ACTIVE">Active Yards Only</option>
                  <option value="INACTIVE">Deactivated Yards Only</option>
                </select>
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

          {/* Hub / Yard Table */}
          <div
            className={`flex-1 min-h-0 rounded-2xl border overflow-hidden transition-colors flex flex-col ${
              isDaylight
                ? 'border-slate-200 bg-white text-slate-950 shadow-sm'
                : 'border-slate-800 bg-slate-900/40 text-slate-200'
            }`}
          >
            <div className="px-3.5 py-2 border-b flex items-center justify-between border-slate-700/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className={`h-4 w-4 ${isDaylight ? 'text-amber-700' : 'text-amber-400'}`} />
                <h3 className="font-black text-xs sm:text-sm">Registered Hubs & Depots ({displayedHubs.length})</h3>
              </div>
            </div>

            {isLoading ? (
              <div className="p-6">
                <SkeletonTable columns={7} rows={5} />
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
              <div onScroll={handleScroll} className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
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
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDaylight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                    {visibleHubs.map((hub) => {
                      const city = cities.find((c) => c.id === hub.cityId);
                      const state = states.find((s) => s.id === city?.stateId);
                      const machinesStationed = getHubActiveMachines(hub.id);

                      return (
                        <tr
                          key={hub.id}
                          className={`transition-colors ${
                            isDaylight ? 'hover:bg-slate-200/40' : 'hover:bg-slate-800/30'
                          } ${!hub.active ? 'opacity-65' : ''}`}
                        >
                          <td
                            className={`py-3.5 px-4 font-mono ${
                              isDaylight ? 'font-black text-amber-800' : 'font-medium text-slate-300'
                            }`}
                          >
                            {hub.code}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-sm flex items-center gap-2">
                              <span>{hub.name}</span>
                              {!hub.active && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  Deactivated
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">{hub.address}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold">{city?.name || '—'}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {state?.name || '—'}{state?.code ? ` (${state.code})` : ''}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              {hub.operatingRadiusKm != null ? `${hub.operatingRadiusKm} km radius` : '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">{hub.contactPhone || '+91 94674 79922'}</td>
                          <td className="py-3.5 px-4 font-mono font-medium">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold text-xs ${
                                machinesStationed > 0
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                  : 'text-slate-500'
                              }`}
                            >
                              <Truck className="h-3.5 w-3.5" />
                              <span>{machinesStationed} Active Units</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleHubStatus(hub)}
                              disabled={actionLoading}
                              title={
                                hub.active && machinesStationed > 0
                                  ? `Deactivation barred: ${machinesStationed} active machine(s) stationed`
                                  : hub.active
                                    ? 'Click to Deactivate Hub'
                                    : 'Click to Activate Hub'
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all border ${
                                hub.active
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-300'
                              }`}
                            >
                              <Power className="h-3 w-3" />
                              <span>{hub.active ? 'Active' : 'Inactive'}</span>
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditHub(hub)}
                                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                                title="Edit Hub Yard"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'hub',
                                    id: hub.id,
                                    name: hub.name,
                                    machinesCount: machinesStationed,
                                  })
                                }
                                className="p-1.5 rounded-lg border border-rose-300/40 dark:border-rose-900/40 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                                title="Delete Hub Yard"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
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
        </>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 2: CITIES & DISTRICTS --- */}
      {/* ========================================================================= */}
      {activeTab === 'cities' && (
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          {/* Filters Bar */}
          <div
            className={`flex-shrink-0 p-2.5 rounded-xl border transition-colors space-y-1.5 ${
              isDaylight
                ? 'border-slate-200 bg-white text-slate-950 shadow-sm'
                : 'border-slate-800 bg-slate-900/40 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Filter Operating Cities & Districts (शहर व जिले)
              </span>
              <button
                onClick={() => {
                  setCityFilterStateId('ALL');
                  setCityStatusFilter('ALL');
                  setCitySearchQuery('');
                }}
                className={`text-[11px] flex items-center gap-1 font-medium cursor-pointer ${
                  isDaylight ? 'text-amber-800 hover:text-amber-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <SearchSelect
                  options={[{ value: 'ALL', label: 'All States' }, ...states.map((s) => ({ value: String(s.id), label: s.name, badge: s.code }))]}
                  value={cityFilterStateId}
                  onChange={(val) => setCityFilterStateId(String(val || 'ALL'))}
                  placeholder="Filter by State"
                  isClearable={false}
                />
              </div>

              <div>
                <select
                  value={cityStatusFilter}
                  onChange={(e) => setCityStatusFilter(e.target.value as any)}
                  className={`w-full rounded-lg border px-3 py-1.5 text-xs transition-colors focus:outline-none ${
                    isDaylight
                      ? 'border-slate-300 bg-white text-slate-950 font-medium'
                      : 'border-slate-800 bg-slate-950 text-white font-medium'
                  }`}
                >
                  <option value="ALL">All Statuses (सभी)</option>
                  <option value="ACTIVE">Active Cities Only</option>
                  <option value="INACTIVE">Deactivated Cities Only</option>
                </select>
              </div>

              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={citySearchQuery}
                    onChange={(e) => setCitySearchQuery(e.target.value)}
                    placeholder="Search city, PIN code..."
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

          {/* Cities Table */}
          <div
            className={`flex-1 min-h-0 rounded-2xl border overflow-hidden transition-colors flex flex-col ${
              isDaylight
                ? 'border-slate-200 bg-white text-slate-950 shadow-sm'
                : 'border-slate-800 bg-slate-900/40 text-slate-200'
            }`}
          >
            <div className="px-3.5 py-2 border-b flex items-center justify-between border-slate-700/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className={`h-4 w-4 ${isDaylight ? 'text-amber-700' : 'text-amber-400'}`} />
                <h3 className="font-black text-xs sm:text-sm">Operating Cities & Districts ({displayedCities.length})</h3>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead
                  className={`sticky top-0 z-10 border-b text-[11px] font-black uppercase tracking-wider ${
                    isDaylight
                      ? 'border-slate-300 bg-slate-100 text-slate-900 shadow-xs'
                      : 'border-slate-800 bg-slate-950 text-slate-300 shadow-xs'
                  }`}
                >
                  <tr>
                    <th className="py-3 px-4">City / District Name</th>
                    <th className="py-3 px-4">Parent State</th>
                    <th className="py-3 px-4">PIN Code</th>
                    <th className="py-3 px-4">Registered Hubs</th>
                    <th className="py-3 px-4">Active Fleet in City</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDaylight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                  {displayedCities.map((city) => {
                    const parentState = states.find((s) => s.id === city.stateId);
                    const cityHubs = hubs.filter((h) => h.cityId === city.id);
                    const activeMachines = getCityActiveMachines(city.id);

                    return (
                      <tr
                        key={city.id}
                        className={`transition-colors ${
                          isDaylight ? 'hover:bg-slate-200/40' : 'hover:bg-slate-800/30'
                        } ${!city.active ? 'opacity-65' : ''}`}
                      >
                        <td className="py-3.5 px-4 font-bold text-sm">
                          <div className="flex items-center gap-2">
                            <span>{city.name}</span>
                            {!city.active && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium">
                          {parentState?.name || '—'} {parentState?.code ? `(${parentState.code})` : ''}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{city.pinCode || '—'}</td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-700">
                            {cityHubs.length} Yards
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${
                              activeMachines > 0
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                : 'text-slate-500'
                            }`}
                          >
                            <Truck className="h-3 w-3" />
                            <span>{activeMachines} Units</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleCityStatus(city)}
                            disabled={actionLoading}
                            title={
                              city.active && activeMachines > 0
                                ? `Deactivation barred: ${activeMachines} active machine(s) in city hubs`
                                : city.active
                                  ? 'Click to Deactivate City'
                                  : 'Click to Activate City'
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all border ${
                              city.active
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            <Power className="h-3 w-3" />
                            <span>{city.active ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCity(city)}
                              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                              title="Edit City"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'city',
                                  id: city.id,
                                  name: city.name,
                                  machinesCount: activeMachines,
                                })
                              }
                              className="p-1.5 rounded-lg border border-rose-300/40 dark:border-rose-900/40 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                              title="Delete City"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 3: STATES & REGIONS --- */}
      {/* ========================================================================= */}
      {activeTab === 'states' && (
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          {/* Filters Bar */}
          <div
            className={`flex-shrink-0 p-2.5 rounded-xl border transition-colors space-y-1.5 ${
              isDaylight
                ? 'border-slate-200 bg-white text-slate-950 shadow-sm'
                : 'border-slate-800 bg-slate-900/40 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Filter Registered States & Regions (राज्य व प्रांत)
              </span>
              <button
                onClick={() => {
                  setStateStatusFilter('ALL');
                  setStateSearchQuery('');
                }}
                className={`text-[11px] flex items-center gap-1 font-medium cursor-pointer ${
                  isDaylight ? 'text-amber-800 hover:text-amber-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <select
                  value={stateStatusFilter}
                  onChange={(e) => setStateStatusFilter(e.target.value as any)}
                  className={`w-full rounded-lg border px-3 py-1.5 text-xs transition-colors focus:outline-none ${
                    isDaylight
                      ? 'border-slate-300 bg-white text-slate-950 font-medium'
                      : 'border-slate-800 bg-slate-950 text-white font-medium'
                  }`}
                >
                  <option value="ALL">All Statuses (सभी)</option>
                  <option value="ACTIVE">Active States Only</option>
                  <option value="INACTIVE">Deactivated States Only</option>
                </select>
              </div>

              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={stateSearchQuery}
                    onChange={(e) => setStateSearchQuery(e.target.value)}
                    placeholder="Search state name, code (UP, RJ, MP)..."
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

          {/* States Table */}
          <div
            className={`flex-1 min-h-0 rounded-2xl border overflow-hidden transition-colors flex flex-col ${
              isDaylight
                ? 'border-slate-200 bg-white text-slate-950 shadow-sm'
                : 'border-slate-800 bg-slate-900/40 text-slate-200'
            }`}
          >
            <div className="px-3.5 py-2 border-b flex items-center justify-between border-slate-700/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Navigation className={`h-4 w-4 ${isDaylight ? 'text-amber-700' : 'text-amber-400'}`} />
                <h3 className="font-black text-xs sm:text-sm">Registered States & Territorials ({displayedStates.length})</h3>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead
                  className={`sticky top-0 z-10 border-b text-[11px] font-black uppercase tracking-wider ${
                    isDaylight
                      ? 'border-slate-300 bg-slate-100 text-slate-900 shadow-xs'
                      : 'border-slate-800 bg-slate-950 text-slate-300 shadow-xs'
                  }`}
                >
                  <tr>
                    <th className="py-3 px-4">State Code</th>
                    <th className="py-3 px-4">State Name</th>
                    <th className="py-3 px-4">Registered Cities</th>
                    <th className="py-3 px-4">Total Hub Yards</th>
                    <th className="py-3 px-4">Active Fleet in State</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDaylight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                  {displayedStates.map((state) => {
                    const stateCities = cities.filter((c) => c.stateId === state.id);
                    const stateCityIds = new Set(stateCities.map((c) => c.id));
                    const stateHubs = hubs.filter((h) => stateCityIds.has(h.cityId));
                    const activeMachines = getStateActiveMachines(state.id);

                    return (
                      <tr
                        key={state.id}
                        className={`transition-colors ${
                          isDaylight ? 'hover:bg-slate-200/40' : 'hover:bg-slate-800/30'
                        } ${!state.active ? 'opacity-65' : ''}`}
                      >
                        <td
                          className={`py-3.5 px-4 font-mono font-black text-sm ${
                            isDaylight ? 'text-amber-800' : 'text-amber-400'
                          }`}
                        >
                          {state.code}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-sm">
                          <div className="flex items-center gap-2">
                            <span>{state.name}</span>
                            {!state.active && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-700">
                            {stateCities.length} Cities
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-700">
                            {stateHubs.length} Yards
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${
                              activeMachines > 0
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                : 'text-slate-500'
                            }`}
                          >
                            <Truck className="h-3 w-3" />
                            <span>{activeMachines} Units</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStateStatus(state)}
                            disabled={actionLoading}
                            title={
                              state.active && activeMachines > 0
                                ? `Deactivation barred: ${activeMachines} active machine(s) in state hubs`
                                : state.active
                                  ? 'Click to Deactivate State'
                                  : 'Click to Activate State'
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all border ${
                              state.active
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            <Power className="h-3 w-3" />
                            <span>{state.active ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditState(state)}
                              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                              title="Edit State"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'state',
                                  id: state.id,
                                  name: state.name,
                                  machinesCount: activeMachines,
                                })
                              }
                              className="p-1.5 rounded-lg border border-rose-300/40 dark:border-rose-900/40 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                              title="Delete State"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 4: FARMER FARM LOCATIONS DIRECTORY --- */}
      {/* ========================================================================= */}
      {activeTab === 'farms' && (
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          {/* Filters Bar */}
          <div
            className={`flex-shrink-0 p-3 rounded-xl border transition-colors space-y-2 ${
              isDaylight
                ? 'border-slate-200 bg-white text-slate-950 shadow-sm'
                : 'border-slate-800 bg-slate-900/40 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Filter Registered Farmer Fields & Delivery Locations
              </span>
              <button
                onClick={() => {
                  setSelectedFarmCustomerId('ALL');
                  setFarmSearchQuery('');
                }}
                className={`text-[11px] flex items-center gap-1 font-medium cursor-pointer ${
                  isDaylight ? 'text-amber-800 hover:text-amber-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <SearchSelect
                  options={[
                    { value: 'ALL', label: 'All Registered Farmers' },
                    ...customers.map((c) => ({
                      value: String(c.id),
                      label: c.fullName,
                      badge: c.phone,
                    })),
                  ]}
                  value={selectedFarmCustomerId}
                  onChange={(val) => setSelectedFarmCustomerId(String(val || 'ALL'))}
                  placeholder="Filter by Farmer / Customer"
                  isClearable={false}
                />
              </div>

              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={farmSearchQuery}
                    onChange={(e) => setFarmSearchQuery(e.target.value)}
                    placeholder="Search field name, village, landmark, farmer name..."
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

          {/* Cards Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filteredFarmLocations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center space-y-1.5">
                <MapPin className="h-7 w-7 mx-auto opacity-30 text-amber-500" />
                <div className="text-xs font-bold">No farmer fields found matching current filter</div>
                <p className="text-[11px] max-w-sm mx-auto">
                  Click 'Add Field' above to record a new field parcel for an existing customer.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredFarmLocations.map(({ customer, location }) => (
                  <div
                    key={location.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isDaylight
                        ? 'border-slate-200 bg-white text-slate-950 shadow-sm hover:shadow-md'
                        : 'border-slate-800 bg-slate-900/60 text-slate-100 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <div>
                          <div className="font-extrabold text-sm flex items-center gap-1.5">
                            <span>{location.localName || 'Field Parcel'}</span>
                            {location.isDefault && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                Primary
                              </span>
                            )}
                          </div>
                          {location.localNameHindi && (
                            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                              {location.localNameHindi}
                            </div>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {location.locationType}
                        </span>
                      </div>

                      <div className="text-xs flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-bold">{customer.fullName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">({customer.phone})</span>
                      </div>

                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {[location.village, location.tehsil, location.district].filter(Boolean).join(', ') ||
                              'Rural Field Parcel'}
                          </span>
                        </div>
                        {location.landmark && (
                          <p className="text-[11px] text-slate-500 pl-5">Landmark: {location.landmark}</p>
                        )}
                      </div>

                      {location.accessNotes && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-900 dark:text-amber-300 font-medium flex items-start gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <span>
                            <strong>Road access:</strong> {location.accessNotes}
                          </span>
                        </div>
                      )}

                      {location.deliveryContactName && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>
                            Receiver: {location.deliveryContactName}{' '}
                            {location.deliveryContactPhone ? `(${location.deliveryContactPhone})` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div>
                        {location.latitude && location.longitude ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                          >
                            <Compass className="h-3 w-3" />
                            <span>
                              {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
                            </span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">No GPS coordinates recorded</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setFarmLocationToEdit(location);
                          setFarmModalCustomer(customer);
                          setIsFarmModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit Field</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- ADD STATE MODAL --- */}
      {/* ========================================================================= */}
      {showAddState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-3 overflow-y-auto">
          <div
            className={`w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border p-4 sm:p-5 space-y-4 shadow-2xl transition-all ${
              isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#1e1e1e] text-white'
            }`}
          >
            <div
              className={`flex items-start justify-between border-b pb-3 ${
                isDaylight ? 'border-slate-200' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 border border-amber-500/30">
                  <Navigation className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
                    Add State (नया राज्य)
                  </h3>
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
                    isDaylight
                      ? 'border-slate-300 bg-white text-slate-900 font-semibold'
                      : 'border-slate-700 bg-slate-950 text-white'
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
                    isDaylight
                      ? 'border-slate-300 bg-white text-slate-900 font-bold'
                      : 'border-slate-700 bg-slate-950 text-white'
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
                    isDaylight
                      ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-black cursor-pointer transition-colors bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  <span>Save State</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- ADD CITY MODAL --- */}
      {/* ========================================================================= */}
      {showAddCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-3 overflow-y-auto">
          <div
            className={`w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border p-4 sm:p-5 space-y-4 shadow-2xl transition-all ${
              isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#1e1e1e] text-white'
            }`}
          >
            <div
              className={`flex items-start justify-between border-b pb-3 ${
                isDaylight ? 'border-slate-200' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 border border-amber-500/30">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
                    Add City (नया शहर / जिला)
                  </h3>
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
                  placeholder="e.g. Shahjahanpur, Sitapur, Hardoi, Jaipur"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 text-xs focus:border-amber-500 focus:outline-none ${
                    isDaylight
                      ? 'border-slate-300 bg-white text-slate-900 font-semibold'
                      : 'border-slate-700 bg-slate-950 text-white'
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
                    isDaylight
                      ? 'border-slate-300 bg-white text-slate-900 font-bold'
                      : 'border-slate-700 bg-slate-950 text-white'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCity(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                    isDaylight
                      ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCityStateId || actionLoading}
                  className={`px-5 py-2 rounded-xl text-xs font-black cursor-pointer transition-colors flex items-center gap-1.5 ${
                    newCityStateId
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  <span>Save City</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- ADD HUB YARD MODAL --- */}
      {/* ========================================================================= */}
      {showAddHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-3 overflow-y-auto">
          <div
            className={`w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border p-4 sm:p-5 space-y-4 shadow-2xl transition-all ${
              isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#1e1e1e] text-white'
            }`}
          >
            <div
              className={`flex items-start justify-between border-b pb-3 ${
                isDaylight ? 'border-slate-200' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500 border border-amber-500/30">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className={`text-lg font-black ${isDaylight ? 'text-slate-950' : 'text-white'}`}>
                    Add Stationed Hub Yard (नया स्टेशन यार्ड)
                  </h3>
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
              <div
                className={`p-5 rounded-2xl border ${
                  isDaylight ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-900/60 border-slate-800'
                } space-y-3`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}
                    >
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
                    <label
                      className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}
                    >
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
                      placeholder={
                        !newHubStateId
                          ? 'Select State First'
                          : hubModalAvailableCities.length === 0
                            ? 'No cities in this State'
                            : 'Select Parent City *'
                      }
                      isDisabled={!newHubStateId || hubModalAvailableCities.length === 0}
                      noOptionsMessage="No cities found in this State"
                      isClearable={false}
                    />
                  </div>
                </div>
              </div>

              <div
                className={`p-5 rounded-2xl border ${
                  isDaylight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                } space-y-4`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}
                    >
                      Hub Yard Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Shahjahanpur Highway Depot"
                      value={newHubName}
                      onChange={(e) => setNewHubName(e.target.value)}
                      className={`w-full rounded-xl border p-2.5 text-xs focus:border-amber-500 focus:outline-none ${
                        isDaylight
                          ? 'border-slate-300 bg-white text-slate-900 font-semibold'
                          : 'border-slate-700 bg-slate-950 text-white'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}
                    >
                      Hub Code *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HUB-SHJ-01"
                      value={newHubCode}
                      onChange={(e) => setNewHubCode(e.target.value.toUpperCase())}
                      className={`w-full rounded-xl border p-2.5 text-xs font-mono uppercase focus:border-amber-500 focus:outline-none ${
                        isDaylight
                          ? 'border-slate-300 bg-white text-slate-900 font-bold'
                          : 'border-slate-700 bg-slate-950 text-white'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}
                    >
                      Operating Radius (KM) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      step="any"
                      value={newHubRadius}
                      onChange={(e) => setNewHubRadius(e.target.value)}
                      className={`w-full rounded-xl border p-2.5 text-xs font-mono focus:border-amber-500 focus:outline-none ${
                        isDaylight
                          ? 'border-slate-300 bg-white text-slate-900 font-bold'
                          : 'border-slate-700 bg-slate-950 text-white'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}
                    >
                      Primary Yard Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 94500 09988"
                      value={newHubPhone}
                      onChange={(e) => setNewHubPhone(e.target.value)}
                      className={`w-full rounded-xl border p-2.5 text-xs font-mono focus:border-amber-500 focus:outline-none ${
                        isDaylight
                          ? 'border-slate-300 bg-white text-slate-900 font-semibold'
                          : 'border-slate-700 bg-slate-950 text-white'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-xs font-bold mb-1.5 ${isDaylight ? 'text-slate-800' : 'text-slate-200'}`}
                  >
                    Yard Street Address / Location Landmark *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Near Toll Plaza, Bareilly-Lucknow Highway, Shahjahanpur"
                    value={newHubAddress}
                    onChange={(e) => setNewHubAddress(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 text-xs focus:border-amber-500 focus:outline-none ${
                      isDaylight
                        ? 'border-slate-300 bg-white text-slate-900 font-semibold'
                        : 'border-slate-700 bg-slate-950 text-white'
                    }`}
                    required
                  />
                </div>

                <div
                  className={`p-4 rounded-xl border-2 ${
                    isDaylight ? 'border-amber-300 bg-amber-50/60' : 'border-amber-600/40 bg-amber-900/10'
                  } space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-500" />
                      <span className={`text-xs font-black ${isDaylight ? 'text-amber-900' : 'text-amber-400'}`}>
                        GPS Coordinates *
                      </span>
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
                        step="any"
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
                        step="any"
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
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddHub(false)}
                  className={`px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                    isDaylight
                      ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newHubStateId || !newHubCityId || !newHubLat || !newHubLng || actionLoading}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-colors flex items-center gap-2 ${
                    newHubStateId && newHubCityId && newHubLat && newHubLng
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  <span>Save Hub Yard</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- EDIT STATE MODAL --- */}
      {/* ========================================================================= */}
      {editingState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-3 overflow-y-auto">
          <div
            className={`w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-2xl transition-all ${
              isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#1e1e1e] text-white'
            }`}
          >
            <div className="flex items-start justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Navigation className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-black">Edit State: {editingState.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingState(null)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditState} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">State Name *</label>
                <input
                  type="text"
                  value={editStateName}
                  onChange={(e) => setEditStateName(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 text-xs font-semibold focus:border-amber-500 focus:outline-none ${
                    isDaylight ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-700 bg-slate-950 text-white'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">State Code *</label>
                <input
                  type="text"
                  maxLength={4}
                  value={editStateCode}
                  onChange={(e) => setEditStateCode(e.target.value.toUpperCase())}
                  className={`w-full rounded-xl border p-2.5 text-xs font-mono uppercase font-bold focus:border-amber-500 focus:outline-none ${
                    isDaylight ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-700 bg-slate-950 text-white'
                  }`}
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingState(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-black cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  <span>Update State</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- EDIT CITY MODAL --- */}
      {/* ========================================================================= */}
      {editingCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-3 overflow-y-auto">
          <div
            className={`w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-2xl transition-all ${
              isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#1e1e1e] text-white'
            }`}
          >
            <div className="flex items-start justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-black">Edit City: {editingCity.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCity(null)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditCity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Parent State *</label>
                <SearchSelect
                  options={states.map((s) => ({ value: s.id, label: s.name, subLabel: s.code }))}
                  value={editCityStateId}
                  onChange={(val) => setEditCityStateId(val ? Number(val) : '')}
                  placeholder="Select Parent State *"
                  isClearable={false}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">City Name *</label>
                <input
                  type="text"
                  value={editCityName}
                  onChange={(e) => setEditCityName(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 text-xs font-semibold focus:border-amber-500 focus:outline-none ${
                    isDaylight ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-700 bg-slate-950 text-white'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Postal PIN Code</label>
                <input
                  type="text"
                  value={editCityPin}
                  onChange={(e) => setEditCityPin(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none ${
                    isDaylight ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-700 bg-slate-950 text-white'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCity(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-black cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  <span>Update City</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- EDIT HUB MODAL --- */}
      {/* ========================================================================= */}
      {editingHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-3 overflow-y-auto">
          <div
            className={`w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border p-5 space-y-4 shadow-2xl transition-all ${
              isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#1e1e1e] text-white'
            }`}
          >
            <div className="flex items-start justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Truck className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-black">Edit Hub Yard: {editingHub.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingHub(null)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditHub} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Parent State *</label>
                  <SearchSelect
                    options={states.map((s) => ({ value: s.id, label: s.name, subLabel: s.code }))}
                    value={editHubStateId}
                    onChange={(val) => {
                      const sid = val ? Number(val) : '';
                      setEditHubStateId(sid);
                      setEditHubCityId('');
                    }}
                    placeholder="Select State"
                    isClearable={false}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Parent City *</label>
                  <SearchSelect
                    options={editHubModalAvailableCities.map((c) => ({ value: c.id, label: c.name }))}
                    value={editHubCityId}
                    onChange={(val) => setEditHubCityId(val ? Number(val) : '')}
                    placeholder="Select City"
                    isDisabled={!editHubStateId || editHubModalAvailableCities.length === 0}
                    isClearable={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Hub Name *</label>
                  <input
                    type="text"
                    value={editHubName}
                    onChange={(e) => setEditHubName(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 text-xs font-semibold focus:border-amber-500 focus:outline-none ${
                      isDaylight ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-700 bg-slate-950 text-white'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Hub Code *</label>
                  <input
                    type="text"
                    value={editHubCode}
                    onChange={(e) => setEditHubCode(e.target.value.toUpperCase())}
                    className={`w-full rounded-xl border p-2.5 text-xs font-mono uppercase font-bold focus:border-amber-500 focus:outline-none ${
                      isDaylight ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-700 bg-slate-950 text-white'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Operating Radius (KM) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={editHubRadius}
                    onChange={(e) => setEditHubRadius(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none ${
                      isDaylight ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-700 bg-slate-950 text-white'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Contact Phone</label>
                  <input
                    type="tel"
                    value={editHubPhone}
                    onChange={(e) => setEditHubPhone(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 text-xs font-mono focus:border-amber-500 focus:outline-none ${
                      isDaylight ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-700 bg-slate-950 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">Address *</label>
                <input
                  type="text"
                  value={editHubAddress}
                  onChange={(e) => setEditHubAddress(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 text-xs font-semibold focus:border-amber-500 focus:outline-none ${
                    isDaylight ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-700 bg-slate-950 text-white'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-slate-300">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={editHubLat}
                    onChange={(e) => setEditHubLat(e.target.value)}
                    className={`w-full rounded-xl border p-2 text-xs font-mono focus:border-amber-500 focus:outline-none ${
                      isDaylight ? 'border-slate-300 bg-white text-slate-900 font-bold' : 'border-slate-700 bg-slate-950 text-white'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-slate-300">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={editHubLng}
                    onChange={(e) => setEditHubLng(e.target.value)}
                    className={`w-full rounded-xl border p-2 text-xs font-mono focus:border-amber-500 focus:outline-none ${
                      isDaylight ? 'border-slate-300 bg-white text-slate-900 font-bold' : 'border-slate-700 bg-slate-950 text-white'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingHub(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-black cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  <span>Update Hub Yard</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- DELETE CONFIRMATION MODAL --- */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-3 overflow-y-auto">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-2xl transition-all ${
              isDaylight ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-800 bg-[#1e1e1e] text-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-500 border border-rose-500/30 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black">
                  Delete {deleteTarget.type.toUpperCase()}: {deleteTarget.name}?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to permanently delete this {deleteTarget.type}?
                </p>
                {deleteTarget.machinesCount > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      Warning: {deleteTarget.machinesCount} active machine(s) are stationed in this jurisdiction. Deletion will be barred by backend guards.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl text-xs font-black cursor-pointer bg-rose-600 hover:bg-rose-500 text-white shadow-sm flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- FARMER FARM LOCATION UPSERT MODAL --- */}
      {/* ========================================================================= */}
      {isFarmModalOpen && farmModalCustomer && (
        <UpsertFarmLocationModal
          isOpen={isFarmModalOpen}
          onClose={() => {
            setIsFarmModalOpen(false);
            setFarmLocationToEdit(null);
          }}
          customerId={farmModalCustomer.id}
          customerName={farmModalCustomer.fullName}
          customerPhone={farmModalCustomer.phone}
          locationToEdit={farmLocationToEdit}
          onSaved={async () => {
            await refreshFarmLocations();
            setSuccessMsg('Farmer field location saved successfully.');
          }}
        />
      )}
    </div>
  );
};

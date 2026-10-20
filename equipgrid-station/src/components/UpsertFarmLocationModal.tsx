import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Compass, CheckCircle2, AlertCircle, X, Shield, Phone, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';
import { api } from '../services/api';
import { FarmLocation, FarmLocationType, UpsertFarmLocationPayload } from '../types';

interface UpsertFarmLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: number;
  customerName?: string;
  customerPhone?: string;
  locationToEdit?: FarmLocation | null;
  onSaved: (location: FarmLocation) => void;
}

export const UpsertFarmLocationModal: React.FC<UpsertFarmLocationModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  customerPhone,
  locationToEdit,
  onSaved,
}) => {
  const { isDaylight } = useTheme();

  const [localName, setLocalName] = useState('');
  const [localNameHindi, setLocalNameHindi] = useState('');
  const [aliases, setAliases] = useState('');
  const [locationType, setLocationType] = useState<FarmLocationType>('FARM');
  const [village, setVillage] = useState('');
  const [tehsil, setTehsil] = useState('');
  const [district, setDistrict] = useState('');
  const [landmark, setLandmark] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [deliveryContactName, setDeliveryContactName] = useState('');
  const [deliveryContactPhone, setDeliveryContactPhone] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (locationToEdit) {
      setLocalName(locationToEdit.localName || '');
      setLocalNameHindi(locationToEdit.localNameHindi || '');
      setAliases(locationToEdit.aliases || '');
      setLocationType(locationToEdit.locationType || 'FARM');
      setVillage(locationToEdit.village || '');
      setTehsil(locationToEdit.tehsil || '');
      setDistrict(locationToEdit.district || '');
      setLandmark(locationToEdit.landmark || '');
      setAccessNotes(locationToEdit.accessNotes || '');
      setDeliveryContactName(locationToEdit.deliveryContactName || customerName || '');
      setDeliveryContactPhone(locationToEdit.deliveryContactPhone || customerPhone || '');
      setLatitude(locationToEdit.latitude != null ? String(locationToEdit.latitude) : '');
      setLongitude(locationToEdit.longitude != null ? String(locationToEdit.longitude) : '');
      setIsDefault(Boolean(locationToEdit.isDefault));
    } else {
      setLocalName('');
      setLocalNameHindi('');
      setAliases('');
      setLocationType('FARM');
      setVillage('');
      setTehsil('');
      setDistrict('');
      setLandmark('');
      setAccessNotes('');
      setDeliveryContactName(customerName || '');
      setDeliveryContactPhone(customerPhone || '');
      setLatitude('');
      setLongitude('');
      setIsDefault(false);
    }
    setErrorMsg(null);
  }, [locationToEdit, customerName, customerPhone, isOpen]);

  if (!isOpen) return null;

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setErrorMsg('Could not acquire device GPS coordinates. Please enter coordinates or address manually.');
        setGpsLoading(false);
      },
      { timeout: 7000, enableHighAccuracy: true },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName.trim()) {
      setErrorMsg('Please specify the farmer’s local field name (e.g., Bada Khet).');
      return;
    }
    if (!customerId) {
      setErrorMsg('Please select a valid farmer / customer first.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: UpsertFarmLocationPayload = {
      localName: localName.trim(),
      localNameHindi: localNameHindi.trim() || undefined,
      aliases: aliases.trim() || undefined,
      locationType,
      village: village.trim() || undefined,
      tehsil: tehsil.trim() || undefined,
      district: district.trim() || undefined,
      landmark: landmark.trim() || undefined,
      accessNotes: accessNotes.trim() || undefined,
      deliveryContactName: deliveryContactName.trim() || undefined,
      deliveryContactPhone: deliveryContactPhone.trim() || undefined,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      isDefault,
    };

    try {
      let saved: FarmLocation;
      if (locationToEdit?.id) {
        saved = await api.updateFarmLocation(customerId, locationToEdit.id, payload);
      } else {
        saved = await api.createFarmLocation(customerId, payload);
      }
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save farm location. Please verify details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-4 backdrop-blur-sm">
      <div
        className={cn(
          'w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border p-5 sm:p-6 shadow-2xl transition-all',
          isDaylight
            ? 'border-amber-300 bg-white text-slate-900 shadow-amber-500/10'
            : 'border-amber-500/30 bg-[#222222] text-slate-100 shadow-black/80',
        )}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                {locationToEdit ? 'Edit Farm / Delivery Field' : 'Add Farmer’s Field / Delivery Place'}
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              खेत व डिलीवरी स्थल का स्थानीय नाम, बोलचाल पहचान और ट्रैक्टर रास्ता विवरण
              {customerName ? (
                <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400">• Farmer: {customerName}</span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Local Name & Hindi Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold">
                Local Field Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="e.g. Bada Khet, Purva Bagh, Nahar Paar"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-semibold focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Common local or field parcel identifier</span>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Local Name in Hindi (स्थानीय नाम)</label>
              <input
                type="text"
                value={localNameHindi}
                onChange={(e) => setLocalNameHindi(e.target.value)}
                placeholder="उदा. बड़ा खेत, पुरवा बाग, नहर पार"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-semibold focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Shown to local drivers and field coordinators</span>
            </div>
          </div>

          {/* Row 2: Spoken Aliases & Location Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold">Spoken Aliases / बोलचाल नाम</label>
              <input
                type="text"
                value={aliases}
                onChange={(e) => setAliases(e.target.value)}
                placeholder="e.g. Tubewell wala khet, Purani Kothi, Chauraha"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs font-semibold focus:border-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">How the farmer or neighbours refer to it over phone</span>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Place Category</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { value: 'FARM' as const, label: 'Farm / Khet', icon: '🌾' },
                  { value: 'HOME' as const, label: 'Residence', icon: '🏡' },
                  { value: 'VILLAGE_PICKUP' as const, label: 'Pickup Point', icon: '📍' },
                  { value: 'SITE' as const, label: 'Work Site', icon: '🏗️' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setLocationType(item.value)}
                    className={cn(
                      'py-2 px-1 text-center rounded-lg border text-[11px] font-bold transition-colors cursor-pointer flex flex-col items-center gap-0.5',
                      locationType === item.value
                        ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
                    )}
                  >
                    <span>{item.icon}</span>
                    <span className="truncate w-full">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Village, Tehsil, District */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold">Village / Gram Panchayat</label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Bhatgaon"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Tehsil / Block</label>
              <input
                type="text"
                value={tehsil}
                onChange={(e) => setTehsil(e.target.value)}
                placeholder="e.g. Sandila"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">District / Zila</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Hardoi"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Landmark & Road Access Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold">Prominent Landmark (पहचान चिन्ह)</label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Govt Primary School, Canal Siphon Bridge"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Tractor / Transport Access Notes</label>
              <input
                type="text"
                value={accessNotes}
                onChange={(e) => setAccessNotes(e.target.value)}
                placeholder="e.g. 12ft gravel track, tractor trolley enters field edge"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 5: Receiver Contact at Field */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-amber-500" />
                Delivery Receiver Contact Person
              </label>
              <input
                type="text"
                value={deliveryContactName}
                onChange={(e) => setDeliveryContactName(e.target.value)}
                placeholder="e.g. Rameshwar Yadav"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-amber-500" />
                Receiver Mobile Phone
              </label>
              <input
                type="text"
                value={deliveryContactPhone}
                onChange={(e) => setDeliveryContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 6: GPS Coordinates */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Compass className="h-3.5 w-3.5 text-amber-500" />
                GPS Coordinates (For Driver Turn-by-Turn Navigation)
              </span>
              <button
                type="button"
                onClick={handleCaptureGps}
                disabled={gpsLoading}
                className="px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold hover:bg-amber-500/20 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Navigation className={cn('h-3 w-3', gpsLoading && 'animate-spin')} />
                <span>{gpsLoading ? 'Detecting GPS...' : '📍 Use Current GPS Pin'}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="27.394800"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="80.128700"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 7: Set as Default Farm */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs font-bold">Set as Default / Primary Field</p>
                <p className="text-[10px] text-slate-500">Auto-selected on subsequent bookings for this farmer</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 accent-amber-500 cursor-pointer rounded"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={cn(
                'rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer',
                isDaylight
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800',
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving...' : locationToEdit ? 'Update Field' : 'Save Field'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

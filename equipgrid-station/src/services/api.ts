import {
  Asset,
  AssetCategory,
  AssetMedia,
  AssetStatus,
  BillingUnit,
  BillingUnitMaster,
  BILLING_UNIT_OPTIONS,
  DEFAULT_BILLING_UNITS,
  getBillingUnitLabel,
  getBillingUnitHindiLabel,
  resolveBillingUnitCode,
  resolveBillingUnitInt,
  Booking,
  BookingStatus,
  City,
  Customer,
  FarmLocation,
  DailyCashReconciliation,
  DashboardSummary,
  Dealer,
  DealerCommission,
  DispatchRecord,
  EquipmentType,
  Hub,
  MachineModel,
  Manufacturer,
  Payment,
  PaymentMode,
  PaymentType,
  QuoteCalculation,
  RentalConfiguration,
  ReturnInspection,
  State,
  UserAccount,
  StaffRole,
  CreateUserPayload,
  UpdateUserPayload,
  BookingSource,
  FarmLocationType,
  JobStatus,
  RefundStatus,
  VerificationStatus,
  UpsertFarmLocationPayload,
  PaymentProof,
  RefundTransaction,
  DeliveryJob,
  ReturnPickupJob,
  UpdateFulfillmentJobPayload,
  EquipmentRecommendationRequest,
  EquipmentRecommendationResponse,
  MaintenanceTicket,
  MaintenanceDamageComponent,
  CreateMaintenanceTicketPayload,
  UpdateMaintenanceProgressPayload,
  CompleteMaintenancePayload,
  MaintenanceStatus,
} from '../types';

// Verified AWS S3 assets bucket base URL
export const S3_ASSETS_BASE = 'https://equipgrid-assets-dev.s3.ap-south-1.amazonaws.com';

/**
 * Sanitizes S3 media URLs.
 * If a presigned URL has broken authorization params (such as an empty Access Key ID
 * producing `X-Amz-Credential=%2F...`), or if it contains authorization query parameters
 * for our public S3 assets bucket, strip the query string so the browser directly accesses
 * the clean public S3 object.
 */
export function sanitizeMediaUrl(rawUrl?: string, s3Key?: string): string {
  if (!rawUrl && s3Key) {
    const cleanKey = s3Key.replace(/^\//, '');
    return `${S3_ASSETS_BASE}/${cleanKey}`;
  }
  if (!rawUrl) return '';

  // If the URL has empty AKID parameter (e.g. X-Amz-Credential=%2F or X-Amz-Credential=/)
  // or contains AuthorizationQueryParametersError
  if (
    rawUrl.includes('X-Amz-Credential=%2F') ||
    rawUrl.includes('X-Amz-Credential=/') ||
    rawUrl.includes('AuthorizationQueryParametersError')
  ) {
    return rawUrl.split('?')[0];
  }

  return rawUrl;
}

// Map of canonical S3 prefix for known tags or fallback families (all keys use underscore formatting in S3)
export function resolveAssetS3Key(assetTag: string): string {
  const raw = assetTag.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const KNOWN_KEYS = [
    'c_mix_001',
    'c_mix_002',
    'c_vib_001',
    'c_vib_002',
    'c_vib_003',
    'c_cmp_001',
    'c_cmp_002',
    'c_jkh_001',
    'c_jkh_002',
    'c_jkh_003',
    'c_jkh_004',
    'c_pmp_001',
    'c_pmp_002',
    'c_gen_001',
    'c_gen_002',
    'a_rep_001',
    'a_wed_001',
    'a_wed_002',
    'a_aug_001',
  ];

  if (KNOWN_KEYS.includes(raw)) {
    return raw;
  }

  // Family fallbacks for dynamically added assets or variations
  if (raw.includes('mix')) return 'c_mix_001';
  if (raw.includes('vib')) return 'c_vib_001';
  if (raw.includes('cmp') || raw.includes('com')) return 'c_cmp_001';
  if (raw.includes('jkh') || raw.includes('ham') || raw.includes('dem')) return 'c_jkh_001';
  if (raw.includes('pmp') || raw.includes('pum')) return 'c_pmp_001';
  if (raw.includes('gen')) return 'c_gen_001';
  if (raw.includes('rep') || raw.includes('rea')) return 'a_rep_001';
  if (raw.includes('wed') || raw.includes('wee')) return 'a_wed_001';
  if (raw.includes('aug')) return 'a_aug_001';

  return '';
}

// Return empty list if asset has no real media in database (do not fabricate fake photos/videos)
export function buildMachineMedia(
  _assetId: number,
  _assetTag: string,
  _category: 'CONSTRUCTION' | 'AGRICULTURE' | 'MULTIPURPOSE_FLEET' = 'CONSTRUCTION',
  _typeName: string = '',
  _baseImageUrl?: string,
): AssetMedia[] {
  return [];
}

// REST API Base URL (proxied by Vite to http://localhost:8081)
const API_BASE = '/equipgrid';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  let token = '';
  try {
    const authStored = localStorage.getItem('equipgrid_auth_user');
    if (authStored) {
      const parsed = JSON.parse(authStored);
      if (parsed?.token) token = parsed.token;
    }
  } catch {}

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errMsg = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const errBody = await res.json();
      if (errBody?.data && typeof errBody.data === 'object' && Object.keys(errBody.data).length > 0) {
        const fieldMsgs = Object.entries(errBody.data)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        errMsg = fieldMsgs || errBody?.message?.text || errBody?.message || errMsg;
      } else if (errBody?.message?.text) {
        errMsg = errBody.message.text;
      } else if (errBody?.message) {
        errMsg = typeof errBody.message === 'string' ? errBody.message : JSON.stringify(errBody.message);
      }
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  const data = await res.json();
  return (data?.data !== undefined ? data.data : data) as T;
}

export async function uploadTemporaryMedia(file: File): Promise<{
  url: string;
  key?: string;
  fileName?: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  fileSizeBytes?: number;
}> {
  const url = `${API_BASE}/common/storage/upload`;
  let token = '';
  try {
    const authStored = localStorage.getItem('equipgrid_auth_user');
    if (authStored) {
      const parsed = JSON.parse(authStored);
      if (parsed?.token) token = parsed.token;
    }
  } catch {}

  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    let errMsg = `Upload failed: ${res.status} ${res.statusText}`;
    try {
      const errBody = await res.json();
      if (errBody?.message?.text) errMsg = errBody.message.text;
      else if (errBody?.message)
        errMsg = typeof errBody.message === 'string' ? errBody.message : JSON.stringify(errBody.message);
    } catch {}
    throw new Error(errMsg);
  }

  const json = await res.json();
  return (json?.data !== undefined ? json.data : json) as {
    url: string;
    key?: string;
    fileName?: string;
    mediaType?: 'IMAGE' | 'VIDEO';
    fileSizeBytes?: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity Mappers: Transform Backend DB responses to Frontend TypeScript interfaces
// ─────────────────────────────────────────────────────────────────────────────

function mapCategory(cat: any): AssetCategory {
  if (cat === 2 || cat === 'AGRICULTURE') return 'AGRICULTURE';
  if (cat === 3 || cat === 'MULTIPURPOSE_FLEET') return 'MULTIPURPOSE_FLEET';
  return 'CONSTRUCTION';
}

function mapStatus(status: any): AssetStatus {
  if (typeof status === 'string') return status as AssetStatus;
  const statusMap: Record<number, AssetStatus> = {
    1: 'AVAILABLE',
    2: 'RESERVED',
    3: 'DISPATCH_READY',
    4: 'DISPATCHED',
    5: 'ON_RENT',
    6: 'RETURN_PENDING',
    7: 'RETURNED',
    8: 'INSPECTION',
    9: 'DAMAGE_ASSESSMENT',
    10: 'MAINTENANCE',
    11: 'DAMAGED',
    12: 'RETIRED',
  };
  return statusMap[status] || 'AVAILABLE';
}

function mapBookingStatus(status: any): BookingStatus {
  if (typeof status === 'string') return status as BookingStatus;
  const map: Record<number, BookingStatus> = {
    1: 'QUOTED',
    2: 'PENDING_PAYMENT',
    3: 'CONFIRMED',
    4: 'ALLOCATED',
    5: 'DISPATCH_READY',
    6: 'DISPATCHED',
    7: 'ON_RENT',
    8: 'RETURN_REQUESTED',
    9: 'RETURNED',
    10: 'INSPECTED',
    11: 'CLOSED',
    12: 'CANCELLED',
  };
  return map[status] || 'QUOTED';
}

function mapPaymentType(type: any): PaymentType {
  if (typeof type === 'string') return type as PaymentType;
  const map: Record<number, PaymentType> = {
    1: 'ADVANCE',
    2: 'DEPOSIT',
    3: 'FINAL_SETTLEMENT',
    4: 'DAMAGE_CHARGE',
    5: 'REFUND',
  };
  return map[type] || 'ADVANCE';
}

function mapPaymentMode(mode: any): PaymentMode {
  if (typeof mode === 'string') return mode as PaymentMode;
  const map: Record<number, PaymentMode> = {
    1: 'CASH',
    2: 'UPI',
    3: 'BANK_TRANSFER',
  };
  return map[mode] || 'UPI';
}

function mapBookingSource(source: any): BookingSource {
  if (typeof source === 'string') return source as BookingSource;
  const map: Record<number, BookingSource> = {
    1: 'STATION',
    2: 'PHONE_AGENT',
    3: 'DEALER',
    4: 'FPO',
    5: 'KISAN_MITRA',
    6: 'WHATSAPP',
  };
  return map[source] || 'STATION';
}

function mapFarmLocationType(type: any): FarmLocationType {
  if (typeof type === 'string') return type as FarmLocationType;
  const map: Record<number, FarmLocationType> = {
    1: 'FARM',
    2: 'HOME',
    3: 'VILLAGE_PICKUP',
    4: 'SITE',
  };
  return map[type] || 'FARM';
}

function mapJobStatus(status: any): JobStatus {
  if (typeof status === 'string') return status as JobStatus;
  const map: Record<number, JobStatus> = {
    1: 'REQUESTED',
    2: 'SCHEDULED',
    3: 'OUT_FOR_DELIVERY',
    4: 'COMPLETED',
    5: 'CANCELLED',
  };
  return map[status] || 'SCHEDULED';
}

function mapRefundStatus(status: any): RefundStatus {
  if (typeof status === 'string') return status as RefundStatus;
  const map: Record<number, RefundStatus> = {
    1: 'PENDING',
    2: 'PROCESSING',
    3: 'COMPLETED',
    4: 'FAILED',
  };
  return map[status] || 'PENDING';
}

function mapVerificationStatus(status: any): VerificationStatus {
  if (typeof status === 'string') return status as VerificationStatus;
  const map: Record<number, VerificationStatus> = {
    1: 'PENDING',
    2: 'VERIFIED',
    3: 'REJECTED',
  };
  return map[status] || 'PENDING';
}

function mapAsset(a: any): Asset {
  let media: AssetMedia[] = [];
  if (Array.isArray(a.mediaItems) && a.mediaItems.length > 0) {
    media = a.mediaItems.map((m: any, idx: number) => {
      const cleanUrl = sanitizeMediaUrl(m.url, m.s3Key);
      return {
        id: m.id || idx + 1,
        mediaType: m.mediaType,
        url: cleanUrl || `${S3_ASSETS_BASE}/${(m.s3Key || '').replace(/^\//, '')}`,
        s3Key: m.s3Key,
        displayOrder: m.displayOrder ?? idx,
        fileName: m.fileName,
        contentType: m.contentType,
        fileSizeBytes: m.fileSizeBytes,
        durationSeconds: m.durationSeconds,
      };
    });
  }

  const rawImg = a.imageUrl && !a.imageUrl.includes('unsplash') ? a.imageUrl : undefined;
  const cleanImg = rawImg ? sanitizeMediaUrl(rawImg) : undefined;

  return {
    id: a.id,
    assetTag: a.assetTag,
    name: a.name || a.modelName || a.model?.name || a.type?.name || a.assetTag,
    category: mapCategory(a.category),
    typeId: a.type?.id,
    typeName: a.type?.name,
    manufacturerId: a.manufacturer?.id,
    manufacturerName: a.manufacturer?.name,
    modelId: a.model?.id,
    modelName: a.model?.name || a.modelName || undefined,
    hubId: a.hub?.id,
    hubName: a.hub?.name,
    cityName: a.hub?.city?.name,
    stateName: a.hub?.city?.state?.name,
    imageUrl: cleanImg,
    serialNumber: a.serialNumber || '',
    dailyRate: a.dailyRate != null ? Number(a.dailyRate) : undefined,
    depositAmount: a.depositAmount != null ? Number(a.depositAmount) : undefined,
    purchaseCost: a.purchaseCost ? Number(a.purchaseCost) : undefined,
    operatorRequired: Boolean(a.operatorRequired),
    status: mapStatus(a.status),
    conditionNotes: a.conditionNotes || '',
    engineHours: Number(a.engineHours || 0),
    accessoriesIncluded: a.accessoriesIncluded || '',
    mediaItems: media,
    billingUnit: resolveBillingUnitCode(a.billingUnitMaster?.code || a.billingUnit),
    billingUnitId: a.billingUnitMaster?.id || (typeof a.billingUnit === 'number' ? a.billingUnit : undefined),
    billingUnitMaster: a.billingUnitMaster,
    unitLabel: a.billingUnitMaster?.unitLabel || a.unitLabel || getBillingUnitLabel(a.billingUnit),
    hindiUnitLabel: a.billingUnitMaster?.hindiUnitLabel || a.hindiUnitLabel || getBillingUnitHindiLabel(a.billingUnit),
    workingHoursLimit: a.workingHoursLimit ? Number(a.workingHoursLimit) : undefined,
    shiftTerms: a.shiftTerms || a.billingUnitMaster?.defaultShiftTerms,
  };
}

function mapRentalConfig(rc: any): RentalConfiguration {
  return {
    id: rc.id,
    hubId: rc.hub?.id || rc.hubId,
    hubName: rc.hub?.name || rc.hubName,
    cityId: rc.hub?.city?.id || rc.cityId,
    cityName: rc.hub?.city?.name || rc.cityName,
    assetId: rc.asset?.id || rc.assetId,
    assetName: rc.asset?.name || rc.assetName,
    typeId: rc.type?.id || rc.typeId,
    typeName: rc.type?.name || rc.typeName,
    baseDailyRate: Number(rc.baseDailyRate || 0),
    depositAmount: Number(rc.depositAmount != null ? rc.depositAmount : 0),
    operatorDailyRate: rc.operatorDailyRate != null ? Number(rc.operatorDailyRate) : undefined,
    freeDeliveryDistanceKm: rc.freeDeliveryDistanceKm != null ? Number(rc.freeDeliveryDistanceKm) : undefined,
    ratePerKmAfterFree: rc.ratePerKmAfterFree != null ? Number(rc.ratePerKmAfterFree) : undefined,
    active: Boolean(rc.active ?? true),
    notes: rc.notes,
    billingUnit: resolveBillingUnitCode(rc.billingUnitMaster?.code || rc.billingUnit),
    billingUnitId: rc.billingUnitMaster?.id || (typeof rc.billingUnit === 'number' ? rc.billingUnit : undefined),
    billingUnitMaster: rc.billingUnitMaster,
    unitLabel: rc.billingUnitMaster?.unitLabel || getBillingUnitLabel(rc.billingUnit),
    hindiUnitLabel: rc.billingUnitMaster?.hindiUnitLabel || getBillingUnitHindiLabel(rc.billingUnit),
    workingHoursLimit: rc.workingHoursLimit ? Number(rc.workingHoursLimit) : undefined,
    shiftTerms: rc.shiftTerms || rc.billingUnitMaster?.defaultShiftTerms,
  };
}

function mapBooking(b: any): Booking {
  return {
    id: b.id,
    bookingNumber: b.bookingNumber,
    customer: {
      id: b.customer?.id,
      fullName: b.customer?.fullName || b.customer?.phone || 'Customer',
      phone: b.customer?.phone || '',
      email: b.customer?.email,
      address: b.customer?.address || '',
      aadhaarNumber: b.customer?.aadhaarNumber,
      gstNumber: b.customer?.gstNumber,
      tier: b.customer?.tier === 2 ? 'TIER_2_VERIFIED' : 'TIER_1_BASIC',
      verified: Boolean(b.customer?.verified),
      notes: b.customer?.notes,
    },
    asset: mapAsset(b.asset),
    startDate: b.startDate,
    endDate: b.endDate,
    deliveryAddress: b.deliveryAddress,
    farmLocationId: b.farmLocation?.id || b.farmLocationId,
    deliveryLocationName: b.deliveryLocationName,
    deliveryLocationSnapshot: b.deliveryLocationSnapshot,
    deliveryLatitude: b.deliveryLatitude == null ? undefined : Number(b.deliveryLatitude),
    deliveryLongitude: b.deliveryLongitude == null ? undefined : Number(b.deliveryLongitude),
    bookingSource: mapBookingSource(b.bookingSource),
    callbackRequested: Boolean(b.callbackRequested),
    distanceKm: Number(b.distanceKm || 0),
    operatorRequired: Boolean(b.operatorRequired),
    baseRent: Number(b.baseRent || 0),
    deliveryFee: Number(b.deliveryFee || 0),
    operatorFee: Number(b.operatorFee || 0),
    depositAmount: Number(b.depositAmount || 0),
    totalAmount: Number(b.totalAmount || 0),
    advancePaid: Number(b.advancePaid || 0),
    depositPaid: Number(b.depositPaid || 0),
    billingUnit: b.billingUnit ? resolveBillingUnitCode(b.billingUnit) : resolveBillingUnitCode(b.asset?.billingUnit),
    shiftTerms: b.shiftTerms || b.asset?.shiftTerms,
    rentalConfigId: b.rentalConfig?.id || b.rentalConfigId,
    dailyRate: b.dailyRate != null ? Number(b.dailyRate) : b.asset ? Number(b.asset.dailyRate) : undefined,
    status: mapBookingStatus(b.status),
    dealerId: b.dealerId,
    notes: b.notes,
    createdAt: b.createdAt || '',
  };
}

function mapPayment(p: any): Payment {
  return {
    id: p.id,
    bookingId: p.booking?.id || p.bookingId,
    bookingNumber: p.booking?.bookingNumber || p.bookingNumber,
    customerName: p.customer?.fullName || p.customerName,
    amount: Number(p.amount || 0),
    paymentType: mapPaymentType(p.paymentType),
    paymentMode: mapPaymentMode(p.paymentMode),
    transactionRef: p.transactionRef,
    notes: p.notes,
    createdAt: p.createdAt || '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ApiStore: Backed by Spring Boot REST Backend & PostgreSQL database
// ─────────────────────────────────────────────────────────────────────────────

export class ApiStore {
  states: State[] = [];
  cities: City[] = [];
  hubs: Hub[] = [];
  private _types: EquipmentType[] = [];
  private _typesLoading = false;
  get types(): EquipmentType[] {
    if (this._types.length === 0 && !this._typesLoading) {
      this._typesLoading = true;
      request<any[]>('/masters/types').then((res) => {
        this._types = (res || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          code: t.code,
          category: mapCategory(t.category),
          description: t.description,
          hindiName: t.hindiName,
          localLanguageName: t.localLanguageName,
          hindiDescription: t.hindiDescription,
          active: Boolean(t.active ?? true),
        }));
        this.notify();
      });
    }
    return this._types;
  }
  set types(v) {
    this._types = v;
  }

  private _manufacturers: Manufacturer[] = [];
  private _manufacturersLoading = false;
  get manufacturers(): Manufacturer[] {
    if (this._manufacturers.length === 0 && !this._manufacturersLoading) {
      this._manufacturersLoading = true;
      request<any[]>('/masters/manufacturers').then((res) => {
        this._manufacturers = (res || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          code: m.code,
          country: m.country || 'India',
          active: Boolean(m.active ?? true),
        }));
        this.notify();
      });
    }
    return this._manufacturers;
  }
  set manufacturers(v) {
    this._manufacturers = v;
  }

  private _models: MachineModel[] = [];
  private _modelsLoading = false;
  get models(): MachineModel[] {
    if (this._models.length === 0 && !this._modelsLoading) {
      this._modelsLoading = true;
      request<any[]>('/masters/models').then((res) => {
        this._models = (res || []).map((m: any) => ({
          id: m.id,
          typeId: m.type?.id || m.typeId,
          manufacturerId: m.manufacturer?.id || m.manufacturerId,
          name: m.name,
          modelNumber: m.modelNumber,
          specs: m.specs,
          active: Boolean(m.active ?? true),
        }));
        this.notify();
      });
    }
    return this._models;
  }
  set models(v) {
    this._models = v;
  }

  private _billingUnits: BillingUnitMaster[] = [];
  private _billingUnitsLoading = false;
  get billingUnits(): BillingUnitMaster[] {
    if (this._billingUnits.length === 0 && !this._billingUnitsLoading) {
      this._billingUnitsLoading = true;
      request<any[]>('/masters/billing-units')
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            this._billingUnits = res.map((u: any) => ({
              id: Number(u.id),
              code: String(u.code),
              name: String(u.name),
              hindiName: u.hindiName || undefined,
              unitLabel: String(u.unitLabel || u.name),
              hindiUnitLabel: u.hindiUnitLabel || undefined,
              unitLabelLong: u.unitLabelLong || undefined,
              defaultShiftTerms: u.defaultShiftTerms || undefined,
              description: u.description || undefined,
              active: Boolean(u.active ?? true),
              displayOrder: Number(u.displayOrder || u.id),
            }));
          } else {
            this._billingUnits = [];
          }
          this.notify();
        })
        .catch((err) => {
          console.warn('Failed to fetch billing units from backend:', err);
          this._billingUnits = [];
          this.notify();
        });
    }
    return this._billingUnits;
  }
  set billingUnits(v) {
    this._billingUnits = v;
  }

  private _assets: Asset[] = [];
  private _assetsLoading = false;
  get assets(): Asset[] {
    if (this._assets.length === 0 && !this._assetsLoading) {
      this._assetsLoading = true;
      request<any[]>('/assets').then((res) => {
        this._assets = (res || []).map(mapAsset);
        this.notify();
      });
    }
    return this._assets;
  }
  set assets(v) {
    this._assets = v;
  }

  private _rentalConfigs: RentalConfiguration[] = [];
  private _rentalConfigsLoading = false;
  get rentalConfigs(): RentalConfiguration[] {
    if (this._rentalConfigs.length === 0 && !this._rentalConfigsLoading) {
      this._rentalConfigsLoading = true;
      request<any[]>('/rental-configs').then((res) => {
        this._rentalConfigs = (res || []).map(mapRentalConfig);
        this.notify();
      });
    }
    return this._rentalConfigs;
  }
  set rentalConfigs(v) {
    this._rentalConfigs = v;
  }



  private _customers: Customer[] = [];
  private _customersLoading = false;
  get customers(): Customer[] {
    if (this._customers.length === 0 && !this._customersLoading) {
      this._customersLoading = true;
      request<any[]>('/customers').then((res) => {
        this._customers = (res || []).map((c: any) => ({
          id: c.id,
          fullName: c.fullName,
          phone: c.phone,
          email: c.email,
          address: c.address,
          aadhaarNumber: c.aadhaarNumber,
          gstNumber: c.gstNumber,
          tier: c.tier === 2 ? 'TIER_2_VERIFIED' : 'TIER_1_BASIC',
          verified: Boolean(c.verified),
          notes: c.notes,
          hubId: c.hub?.id || c.hubId,
          cityId: c.hub?.cityId || c.cityId,
          stateId: c.hub?.city?.stateId || c.stateId,
        }));
        this.notify();
      });
    }
    return this._customers;
  }
  set customers(v) {
    this._customers = v;
  }

  private _dealers: Dealer[] = [];
  private _dealersLoading = false;
  get dealers(): Dealer[] {
    if (this._dealers.length === 0 && !this._dealersLoading) {
      this._dealersLoading = true;
      request<any[]>('/dealers').then((res) => {
        this._dealers = (res || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          tradeName: d.tradeName,
          phone: d.phone,
          location: d.location,
          commissionRate: d.commissionRate != null ? Number(d.commissionRate) : 0,
          totalCommissionEarned: Number(d.totalCommissionEarned || 0),
          totalReferrals: Number(d.totalReferrals || 0),
          active: Boolean(d.active ?? true),
        }));
        this.notify();
      });
    }
    return this._dealers;
  }
  set dealers(v) {
    this._dealers = v;
  }

  private _bookings: Booking[] = [];
  private _bookingsLoading = false;
  get bookings(): Booking[] {
    if (this._bookings.length === 0 && !this._bookingsLoading) {
      this._bookingsLoading = true;
      request<any[]>('/bookings').then((res) => {
        this._bookings = (res || []).map(mapBooking);
        this.notify();
      });
    }
    return this._bookings;
  }
  set bookings(v) {
    this._bookings = v;
  }

  private _payments: Payment[] = [];
  private _paymentsLoading = false;
  get payments(): Payment[] {
    if (this._payments.length === 0 && !this._paymentsLoading) {
      this._paymentsLoading = true;
      request<any[]>('/payments').then((res) => {
        this._payments = (res || []).map(mapPayment);
        this.notify();
      });
    }
    return this._payments;
  }
  set payments(v) {
    this._payments = v;
  }
  dashboardSummary: DashboardSummary = {
    totalAssets: 0,
    availableAssets: 0,
    activeRentals: 0,
    pendingDispatch: 0,
    todayGrossRevenue: 0,
    totalRevenueCollected: 0,
    pendingSecurityDeposits: 0,
    fleetUtilizationPercent: 0,
    zeroCreditCompliancePercent: 100,
  };

  private listeners = new Set<() => void>();
  private initialized = false;

  constructor() {
    // Initiate background load from REST APIs on instantiation
    this.init();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Subscriber error in ApiStore:', e);
      }
    });
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await this.refreshAll();
  }

  async refreshAll(): Promise<void> {
    try {
      const results = await Promise.allSettled([
        request<any[]>('/locations/states?includeInactive=true'),
        request<any[]>('/locations/cities?includeInactive=true'),
        request<any[]>('/locations/hubs?includeInactive=true'),
        request<any>('/reports/dashboard-summary'),
      ]);

      if (results[0].status === 'fulfilled') {
        this.states = (results[0].value || []).map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          active: Boolean(s.active ?? true),
        }));
      }

      if (results[1].status === 'fulfilled') {
        this.cities = (results[1].value || []).map((c) => ({
          id: c.id,
          stateId: c.state?.id || c.stateId,
          name: c.name,
          pinCode: c.pinCode,
          active: Boolean(c.active ?? true),
        }));
      }

      if (results[2].status === 'fulfilled') {
        this.hubs = (results[2].value || []).map((h) => ({
          id: h.id,
          cityId: h.city?.id || h.cityId,
          name: h.name,
          code: h.code,
          address: h.address,
          contactPhone: h.contactPhone || '+91 94674 79922',
          operatingRadiusKm: h.operatingRadiusKm != null ? Number(h.operatingRadiusKm) : undefined,
          latitude: h.latitude != null ? Number(h.latitude) : undefined,
          longitude: h.longitude != null ? Number(h.longitude) : undefined,
          active: Boolean(h.active ?? true),
        }));
      }

      if (results[3].status === 'fulfilled') {
        const sum = results[3].value;
        if (sum) {
          this.dashboardSummary = {
            totalAssets: Number(sum.totalAssets || this._assets?.length || 0),
            availableAssets: Number(
              sum.availableAssets || this._assets?.filter((a: any) => a.status === 'AVAILABLE').length || 0,
            ),
            activeRentals: Number(sum.activeRentals || 0),
            pendingDispatch: Number(sum.pendingDispatch || 0),
            todayGrossRevenue: Number(sum.todayGrossRevenue || 0),
            totalRevenueCollected: Number(sum.totalRevenueCollected || 0),
            pendingSecurityDeposits: Number(sum.pendingSecurityDeposits || 0),
            fleetUtilizationPercent: Number(sum.fleetUtilizationPercent || 0),
            zeroCreditCompliancePercent: Number(sum.zeroCreditCompliancePercent || 100),
          };
        }
      }

      this.notify();
    } catch (err) {
      console.error('Failed to refresh data from backend APIs:', err);
    }
  }

  // --- LOCATION MASTER METHODS ---
  getStates(includeInactive: boolean = false): State[] {
    return includeInactive ? [...this.states] : this.states.filter((s) => s.active);
  }

  addState(name: string, code: string): State {
    const newState: State = {
      id: Date.now(),
      name,
      code: code.toUpperCase(),
      active: true,
    };
    this.states.push(newState);
    this.notify();

    request<any>('/locations/states', {
      method: 'POST',
      body: JSON.stringify({ name, code: code.toUpperCase() }),
    })
      .then((raw) => {
        if (raw?.id) newState.id = raw.id;
        this.notify();
      })
      .catch((e) => console.error('Failed to persist state:', e));

    return newState;
  }

  async createState(name: string, code: string): Promise<State> {
    const raw = await request<any>('/locations/states', {
      method: 'POST',
      body: JSON.stringify({ name, code: code.toUpperCase() }),
    });
    const newState: State = {
      id: raw.id || Date.now(),
      name: raw.name || name,
      code: (raw.code || code).toUpperCase(),
      active: raw.active ?? true,
    };
    this.states.push(newState);
    this.notify();
    return newState;
  }

  async toggleStateStatus(stateId: number, active: boolean): Promise<State> {
    const raw = await request<any>(`/locations/states/${stateId}/status?active=${active}`, {
      method: 'PATCH',
    });
    const idx = this.states.findIndex((s) => s.id === stateId);
    if (idx !== -1) {
      this.states[idx] = { ...this.states[idx], active };
      this.notify();
    }
    return raw;
  }

  async updateState(stateId: number, data: { name: string; code: string }): Promise<State> {
    const raw = await request<any>(`/locations/states/${stateId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: data.name, code: data.code.toUpperCase() }),
    });
    const idx = this.states.findIndex((s) => s.id === stateId);
    if (idx !== -1) {
      this.states[idx] = { ...this.states[idx], name: data.name, code: data.code.toUpperCase() };
      this.notify();
    }
    return raw;
  }

  async deleteState(stateId: number): Promise<void> {
    await request<void>(`/locations/states/${stateId}`, {
      method: 'DELETE',
    });
    this.states = this.states.filter((s) => s.id !== stateId);
    this.notify();
  }

  getCities(stateId?: number, includeInactive: boolean = false): City[] {
    let list = includeInactive ? this.cities : this.cities.filter((c) => c.active);
    if (stateId) {
      list = list.filter((c) => c.stateId === stateId);
    }
    return list;
  }

  addCity(stateId: number, name: string, pinCode?: string): City {
    const newCity: City = {
      id: Date.now(),
      stateId,
      name,
      pinCode,
      active: true,
    };
    this.cities.push(newCity);
    this.notify();

    request<any>('/locations/cities', {
      method: 'POST',
      body: JSON.stringify({ stateId, name, pinCode }),
    })
      .then((raw) => {
        if (raw?.id) newCity.id = raw.id;
        this.notify();
      })
      .catch((e) => console.error('Failed to persist city:', e));

    return newCity;
  }

  async createCity(stateId: number, name: string, pinCode?: string): Promise<City> {
    const raw = await request<any>('/locations/cities', {
      method: 'POST',
      body: JSON.stringify({ stateId, name, pinCode }),
    });
    const newCity: City = {
      id: raw.id || Date.now(),
      stateId: raw.state?.id || raw.stateId || stateId,
      name: raw.name || name,
      pinCode: raw.pinCode || pinCode,
      active: raw.active ?? true,
    };
    this.cities.push(newCity);
    this.notify();
    return newCity;
  }

  async toggleCityStatus(cityId: number, active: boolean): Promise<City> {
    const raw = await request<any>(`/locations/cities/${cityId}/status?active=${active}`, {
      method: 'PATCH',
    });
    const idx = this.cities.findIndex((c) => c.id === cityId);
    if (idx !== -1) {
      this.cities[idx] = { ...this.cities[idx], active };
      this.notify();
    }
    return raw;
  }

  async updateCity(cityId: number, data: { stateId: number; name: string; pinCode?: string }): Promise<City> {
    const raw = await request<any>(`/locations/cities/${cityId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const idx = this.cities.findIndex((c) => c.id === cityId);
    if (idx !== -1) {
      this.cities[idx] = {
        ...this.cities[idx],
        stateId: data.stateId,
        name: data.name,
        pinCode: data.pinCode,
      };
      this.notify();
    }
    return raw;
  }

  async deleteCity(cityId: number): Promise<void> {
    await request<void>(`/locations/cities/${cityId}`, {
      method: 'DELETE',
    });
    this.cities = this.cities.filter((c) => c.id !== cityId);
    this.notify();
  }

  getHubs(cityId?: number, includeInactive: boolean = false): Hub[] {
    let list = includeInactive ? this.hubs : this.hubs.filter((h) => h.active);
    if (cityId) {
      list = list.filter((h) => h.cityId === cityId);
    }
    return list;
  }

  addHub(data: {
    cityId: number;
    name: string;
    code: string;
    address: string;
    contactPhone?: string;
    operatingRadiusKm?: number;
    latitude: number;
    longitude: number;
  }): Hub {
    const newHub: Hub = {
      id: Date.now(),
      cityId: data.cityId,
      name: data.name,
      code: data.code.toUpperCase(),
      address: data.address,
      contactPhone: data.contactPhone,
      operatingRadiusKm: data.operatingRadiusKm || 25.0,
      latitude: data.latitude,
      longitude: data.longitude,
      active: true,
    };
    this.hubs.push(newHub);
    this.notify();

    request<any>('/locations/hubs', {
      method: 'POST',
      body: JSON.stringify({
        cityId: data.cityId,
        name: data.name,
        code: data.code.toUpperCase(),
        address: data.address,
        contactPhone: data.contactPhone,
        operatingRadiusKm: data.operatingRadiusKm || 25.0,
        latitude: data.latitude,
        longitude: data.longitude,
      }),
    })
      .then((raw) => {
        if (raw?.id) newHub.id = raw.id;
        this.notify();
      })
      .catch((e) => console.error('Failed to persist hub:', e));

    return newHub;
  }

  async createHub(data: {
    cityId: number;
    name: string;
    code: string;
    address: string;
    contactPhone?: string;
    operatingRadiusKm?: number;
    latitude: number;
    longitude: number;
  }): Promise<Hub> {
    const raw = await request<any>('/locations/hubs', {
      method: 'POST',
      body: JSON.stringify({
        cityId: data.cityId,
        name: data.name,
        code: data.code.toUpperCase(),
        address: data.address,
        contactPhone: data.contactPhone,
        operatingRadiusKm: data.operatingRadiusKm || 25.0,
        latitude: data.latitude,
        longitude: data.longitude,
      }),
    });
    const newHub: Hub = {
      id: raw.id || Date.now(),
      cityId: raw.city?.id || raw.cityId || data.cityId,
      name: raw.name || data.name,
      code: (raw.code || data.code).toUpperCase(),
      address: raw.address || data.address,
      contactPhone: raw.contactPhone || data.contactPhone,
      operatingRadiusKm: raw.operatingRadiusKm || data.operatingRadiusKm || 25.0,
      latitude: raw.latitude ?? data.latitude,
      longitude: raw.longitude ?? data.longitude,
      active: raw.active ?? true,
    };
    this.hubs.push(newHub);
    this.notify();
    return newHub;
  }

  async toggleHubStatus(hubId: number, active: boolean): Promise<Hub> {
    const raw = await request<any>(`/locations/hubs/${hubId}/status?active=${active}`, {
      method: 'PATCH',
    });
    const idx = this.hubs.findIndex((h) => h.id === hubId);
    if (idx !== -1) {
      this.hubs[idx] = { ...this.hubs[idx], active };
      this.notify();
    }
    return raw;
  }

  async updateHub(
    hubId: number,
    data: {
      cityId: number;
      name: string;
      code: string;
      address: string;
      contactPhone?: string;
      operatingRadiusKm?: number;
      latitude: number;
      longitude: number;
    },
  ): Promise<Hub> {
    const raw = await request<any>(`/locations/hubs/${hubId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const idx = this.hubs.findIndex((h) => h.id === hubId);
    if (idx !== -1) {
      this.hubs[idx] = {
        ...this.hubs[idx],
        cityId: data.cityId,
        name: data.name,
        code: data.code.toUpperCase(),
        address: data.address,
        contactPhone: data.contactPhone,
        operatingRadiusKm: data.operatingRadiusKm || 25.0,
        latitude: data.latitude,
        longitude: data.longitude,
      };
      this.notify();
    }
    return raw;
  }

  async deleteHub(hubId: number): Promise<void> {
    await request<void>(`/locations/hubs/${hubId}`, {
      method: 'DELETE',
    });
    this.hubs = this.hubs.filter((h) => h.id !== hubId);
    this.notify();
  }

  // --- CUSTOMER MASTER METHODS ---
  getCustomers(filters?: { stateId?: number; cityId?: number; hubId?: number }): Customer[] {
    return this.customers.filter((customer) => {
      if (filters?.stateId && customer.stateId !== filters.stateId) return false;
      if (filters?.cityId && customer.cityId !== filters.cityId) return false;
      if (filters?.hubId && customer.hubId !== filters.hubId) return false;
      return true;
    });
  }

  getCustomerById(id: number): Customer | undefined {
    return this.customers.find((c) => c.id === id);
  }

  addCustomer(data: Omit<Customer, 'id'>): Customer {
    const tierNum = data.tier === 'TIER_2_VERIFIED' ? 2 : 1;
    const tempId = Date.now();
    const newCust: Customer = {
      ...data,
      id: tempId,
    };
    this.customers.unshift(newCust);
    this.notify();

    request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        aadhaarNumber: data.aadhaarNumber,
        gstNumber: data.gstNumber,
        tier: tierNum,
        verified: data.verified,
        notes: data.notes,
        hubId: data.hubId,
      }),
    })
      .then((raw) => {
        const idx = this.customers.findIndex((c) => c.id === tempId);
        if (idx !== -1) {
          this.customers[idx].id = raw.id;
          this.notify();
        }
      })
      .catch((e) => console.error('Failed to persist customer:', e));

    return newCust;
  }

  updateCustomer(id: number, data: Partial<Omit<Customer, 'id'>>): Customer | undefined {
    const customer = this.customers.find((c) => c.id === id);
    if (!customer) return undefined;
    Object.assign(customer, data);
    this.bookings.forEach((booking) => {
      if (booking.customer.id === id) booking.customer = customer;
    });
    this.notify();

    const tierNum = customer.tier === 'TIER_2_VERIFIED' ? 2 : 1;
    request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        aadhaarNumber: customer.aadhaarNumber,
        gstNumber: customer.gstNumber,
        tier: tierNum,
        verified: customer.verified,
        notes: customer.notes,
        hubId: customer.hubId,
      }),
    }).catch((e) => console.error('Failed to sync customer update to backend:', e));

    return customer;
  }

  removeCustomer(id: number): boolean {
    if (this.bookings.some((booking) => booking.customer.id === id)) {
      throw new Error('Customers with booking history cannot be deleted. Edit their details instead.');
    }
    const index = this.customers.findIndex((customer) => customer.id === id);
    if (index === -1) return false;
    this.customers.splice(index, 1);
    this.notify();
    return true;
  }

  // --- MACHINE MASTERS METHODS ---
  async fetchEquipmentTypes(includeInactive = true): Promise<EquipmentType[]> {
    const res = await request<any[]>(`/masters/types?includeInactive=${includeInactive}`);
    this._types = (res || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      category: mapCategory(t.category),
      description: t.description,
      hindiName: t.hindiName,
      localLanguageName: t.localLanguageName,
      hindiDescription: t.hindiDescription,
      active: Boolean(t.active ?? true),
    }));
    this.notify();
    return this._types;
  }

  getEquipmentTypes(includeInactive = false): EquipmentType[] {
    return includeInactive ? this.types : this.types.filter((t) => t.active);
  }

  async addEquipmentType(data: {
    name: string;
    code?: string;
    category: AssetCategory;
    description?: string;
    hindiName?: string;
    localLanguageName?: string;
    hindiDescription?: string;
    active?: boolean;
  }): Promise<EquipmentType> {
    const raw = await request<any>('/masters/types', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        code: data.code ? data.code.toUpperCase() : undefined,
        category: data.category === 'MULTIPURPOSE_FLEET' ? 3 : data.category === 'AGRICULTURE' ? 2 : 1,
        description: data.description,
        hindiName: data.hindiName,
        localLanguageName: data.localLanguageName,
        hindiDescription: data.hindiDescription,
        active: data.active ?? true,
      }),
    });
    const newType: EquipmentType = {
      id: raw.id,
      name: raw.name,
      code: raw.code,
      category: mapCategory(raw.category),
      description: raw.description,
      hindiName: raw.hindiName,
      localLanguageName: raw.localLanguageName,
      hindiDescription: raw.hindiDescription,
      active: Boolean(raw.active ?? true),
    };
    this.types.push(newType);
    this.notify();
    return newType;
  }

  async updateEquipmentType(id: number, data: Partial<EquipmentType>): Promise<EquipmentType> {
    const existing = this.types.find((t) => t.id === id);
    const cat = data.category !== undefined ? data.category : existing?.category;
    const catInt = cat === 'MULTIPURPOSE_FLEET' ? 3 : cat === 'AGRICULTURE' ? 2 : 1;
    const raw = await request<any>(`/masters/types/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name ?? existing?.name,
        code: (data.code ?? existing?.code)?.toUpperCase(),
        category: catInt,
        description: data.description !== undefined ? data.description : existing?.description,
        hindiName: data.hindiName !== undefined ? data.hindiName : existing?.hindiName,
        localLanguageName: data.localLanguageName !== undefined ? data.localLanguageName : existing?.localLanguageName,
        hindiDescription: data.hindiDescription !== undefined ? data.hindiDescription : existing?.hindiDescription,
        active: data.active !== undefined ? data.active : existing?.active,
      }),
    });
    const updated: EquipmentType = {
      id: raw.id,
      name: raw.name,
      code: raw.code,
      category: mapCategory(raw.category),
      description: raw.description,
      hindiName: raw.hindiName,
      localLanguageName: raw.localLanguageName,
      hindiDescription: raw.hindiDescription,
      active: Boolean(raw.active ?? true),
    };
    const idx = this.types.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.types[idx] = updated;
    }
    this.notify();
    return updated;
  }

  async deleteEquipmentType(id: number): Promise<void> {
    await request<any>(`/masters/types/${id}`, {
      method: 'DELETE',
    });
    this.types = this.types.filter((t) => t.id !== id);
    this.notify();
  }

  async checkEquipmentTypeAvailability(
    name: string,
    excludeId?: number,
  ): Promise<{ duplicate: boolean; matchedName?: string; similarityPercentage: number; message: string }> {
    const params = new URLSearchParams({ name });
    if (excludeId) params.append('excludeId', String(excludeId));
    return request(`/masters/types/check-availability?${params.toString()}`);
  }

  // --- MANUFACTURERS (OEM) ---
  async fetchManufacturers(includeInactive = true): Promise<Manufacturer[]> {
    const res = await request<any[]>(`/masters/manufacturers?includeInactive=${includeInactive}`);
    this._manufacturers = (res || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      code: m.code,
      country: m.country || 'India',
      active: Boolean(m.active ?? true),
    }));
    this.notify();
    return this._manufacturers;
  }

  getManufacturers(includeInactive = false): Manufacturer[] {
    return includeInactive ? this.manufacturers : this.manufacturers.filter((m) => m.active);
  }

  async addManufacturer(name: string, code: string, country = 'India', active = true): Promise<Manufacturer> {
    const raw = await request<any>('/masters/manufacturers', {
      method: 'POST',
      body: JSON.stringify({ name, code: code.toUpperCase(), country, active }),
    });
    const newMfg: Manufacturer = {
      id: raw.id,
      name: raw.name,
      code: raw.code,
      country: raw.country || country,
      active: Boolean(raw.active ?? true),
    };
    this.manufacturers.push(newMfg);
    this.notify();
    return newMfg;
  }

  async updateManufacturer(id: number, data: Partial<Manufacturer>): Promise<Manufacturer> {
    const existing = this.manufacturers.find((m) => m.id === id);
    const raw = await request<any>(`/masters/manufacturers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name ?? existing?.name,
        code: (data.code ?? existing?.code)?.toUpperCase(),
        country: data.country ?? existing?.country ?? 'India',
        active: data.active !== undefined ? data.active : existing?.active,
      }),
    });
    const updated: Manufacturer = {
      id: raw.id,
      name: raw.name,
      code: raw.code,
      country: raw.country || 'India',
      active: Boolean(raw.active ?? true),
    };
    const idx = this.manufacturers.findIndex((m) => m.id === id);
    if (idx !== -1) {
      this.manufacturers[idx] = updated;
    }
    this.notify();
    return updated;
  }

  async deleteManufacturer(id: number): Promise<void> {
    await request<any>(`/masters/manufacturers/${id}`, {
      method: 'DELETE',
    });
    this.manufacturers = this.manufacturers.filter((m) => m.id !== id);
    this.notify();
  }

  async checkManufacturerAvailability(
    name: string,
    excludeId?: number,
  ): Promise<{ duplicate: boolean; matchedName?: string; similarityPercentage: number; message: string }> {
    const params = new URLSearchParams({ name });
    if (excludeId) params.append('excludeId', String(excludeId));
    return request(`/masters/manufacturers/check-availability?${params.toString()}`);
  }

  // --- MACHINE MODELS ---
  async fetchMachineModels(typeId?: number, manufacturerId?: number, includeInactive = true): Promise<MachineModel[]> {
    const params = new URLSearchParams({ includeInactive: String(includeInactive) });
    if (typeId) params.append('typeId', String(typeId));
    if (manufacturerId) params.append('manufacturerId', String(manufacturerId));
    const res = await request<any[]>(`/masters/models?${params.toString()}`);
    this._models = (res || []).map((m: any) => ({
      id: m.id,
      typeId: m.type?.id || m.typeId,
      manufacturerId: m.manufacturer?.id || m.manufacturerId,
      name: m.name,
      modelNumber: m.modelNumber,
      specs: m.specs,
      active: Boolean(m.active ?? true),
    }));
    this.notify();
    return this._models;
  }

  getMachineModels(typeId?: number, manufacturerId?: number, includeInactive = false): MachineModel[] {
    let list = includeInactive ? this.models : this.models.filter((m) => m.active);
    if (typeId) list = list.filter((m) => m.typeId === typeId);
    if (manufacturerId) list = list.filter((m) => m.manufacturerId === manufacturerId);
    return list;
  }

  async addMachineModel(data: {
    typeId: number;
    manufacturerId: number;
    name: string;
    modelNumber?: string;
    specs?: string;
    active?: boolean;
  }): Promise<MachineModel> {
    const raw = await request<any>('/masters/models', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const newModel: MachineModel = {
      id: raw.id,
      typeId: raw.type?.id || raw.typeId || data.typeId,
      manufacturerId: raw.manufacturer?.id || raw.manufacturerId || data.manufacturerId,
      name: raw.name,
      modelNumber: raw.modelNumber,
      specs: raw.specs,
      active: Boolean(raw.active ?? true),
    };
    this.models.push(newModel);
    this.notify();
    return newModel;
  }

  async updateMachineModel(id: number, data: Partial<MachineModel>): Promise<MachineModel> {
    const existing = this.models.find((m) => m.id === id);
    const raw = await request<any>(`/masters/models/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        typeId: data.typeId ?? existing?.typeId,
        manufacturerId: data.manufacturerId ?? existing?.manufacturerId,
        name: data.name ?? existing?.name,
        modelNumber: data.modelNumber !== undefined ? data.modelNumber : existing?.modelNumber,
        specs: data.specs !== undefined ? data.specs : existing?.specs,
        active: data.active !== undefined ? data.active : existing?.active,
      }),
    });
    const updated: MachineModel = {
      id: raw.id,
      typeId: raw.type?.id || raw.typeId || data.typeId || existing?.typeId!,
      manufacturerId: raw.manufacturer?.id || raw.manufacturerId || data.manufacturerId || existing?.manufacturerId!,
      name: raw.name,
      modelNumber: raw.modelNumber,
      specs: raw.specs,
      active: Boolean(raw.active ?? true),
    };
    const idx = this.models.findIndex((m) => m.id === id);
    if (idx !== -1) {
      this.models[idx] = updated;
    }
    this.notify();
    return updated;
  }

  async deleteMachineModel(id: number): Promise<void> {
    await request<any>(`/masters/models/${id}`, {
      method: 'DELETE',
    });
    this.models = this.models.filter((m) => m.id !== id);
    this.notify();
  }

  async checkMachineModelAvailability(
    name: string,
    typeId?: number,
    manufacturerId?: number,
    excludeId?: number,
  ): Promise<{ duplicate: boolean; matchedName?: string; similarityPercentage: number; message: string }> {
    const params = new URLSearchParams({ name });
    if (typeId) params.append('typeId', String(typeId));
    if (manufacturerId) params.append('manufacturerId', String(manufacturerId));
    if (excludeId) params.append('excludeId', String(excludeId));
    return request(`/masters/models/check-availability?${params.toString()}`);
  }

  getBillingUnits(): BillingUnitMaster[] {
    return this.billingUnits.filter((u) => u.active !== false);
  }

  // --- RENTAL CONFIGURATION METHODS ---
  getRentalConfigs(hubId?: number, assetId?: number): RentalConfiguration[] {
    let list = this.rentalConfigs.filter((c) => c.active);
    if (hubId) list = list.filter((c) => c.hubId === hubId);
    if (assetId) list = list.filter((c) => c.assetId === assetId);
    return list;
  }

  getRentalConfigsForAsset(assetId: number, hubId?: number): RentalConfiguration[] {
    const asset = this.assets.find((a) => a.id === assetId);
    const resolvedHubId = hubId || asset?.hubId;

    // 1. All active configurations explicitly tied to this machine
    const directConfigs = this.rentalConfigs.filter(
      (c) => c.active && c.assetId === assetId && (!resolvedHubId || c.hubId === resolvedHubId),
    );

    // 2. All active configurations for this machine's model / type in this hub
    const typeConfigs = asset?.typeId
      ? this.rentalConfigs.filter(
          (c) => c.active && !c.assetId && c.typeId === asset.typeId && (!resolvedHubId || c.hubId === resolvedHubId),
        )
      : [];

    // 3. All active configurations for this hub
    const hubConfigs = resolvedHubId
      ? this.rentalConfigs.filter((c) => c.active && !c.assetId && !c.typeId && c.hubId === resolvedHubId)
      : [];

    const map = new Map<string, RentalConfiguration>();
    // Hub defaults first
    hubConfigs.forEach((c) => map.set(String(c.billingUnit || 'DAILY'), c));
    // Type configs override hub defaults
    typeConfigs.forEach((c) => map.set(String(c.billingUnit || 'DAILY'), c));
    // Asset configs override type configs
    directConfigs.forEach((c) => map.set(String(c.billingUnit || 'DAILY'), c));

    const list = Array.from(map.values());
    if (list.length > 0) return list;
    if (directConfigs.length > 0) return directConfigs;
    if (typeConfigs.length > 0) return typeConfigs;
    return hubConfigs;
  }

  getRentalConfigForAsset(assetOrId: Asset | number, hubId?: number): RentalConfiguration | undefined {
    if (!assetOrId) return undefined;
    const assetId = typeof assetOrId === 'number' ? assetOrId : assetOrId.id;
    const resolvedHubId = hubId || (typeof assetOrId === 'object' ? assetOrId.hubId : undefined);
    const asset = typeof assetOrId === 'object' ? assetOrId : this.assets.find((a) => a.id === assetId);
    const configs = this.rentalConfigs || [];
    if (configs.length === 0) return undefined;

    return (
      configs.find((rc) => rc.assetId === assetId && rc.active) ||
      (asset?.typeId && resolvedHubId
        ? configs.find((rc) => rc.typeId === asset.typeId && rc.hubId === resolvedHubId && rc.active)
        : undefined) ||
      (asset?.typeId ? configs.find((rc) => rc.typeId === asset.typeId && rc.active) : undefined)
    );
  }

  addRentalConfig(data: {
    hubId: number;
    assetId?: number;
    typeId?: number;
    baseDailyRate: number;
    depositAmount: number;
    operatorDailyRate?: number;
    freeDeliveryDistanceKm?: number;
    ratePerKmAfterFree?: number;
    notes?: string;
    billingUnit?: BillingUnit;
    billingUnitId?: number;
    workingHoursLimit?: number;
    shiftTerms?: string;
  }): RentalConfiguration {
    const hub = this.hubs.find((h) => h.id === data.hubId);
    const asset = data.assetId ? this.assets.find((a) => a.id === data.assetId) : undefined;
    const type = data.typeId ? this.types.find((t) => t.id === data.typeId) : undefined;

    const newConfig: RentalConfiguration = {
      id: Date.now(),
      hubId: data.hubId,
      hubName: hub?.name,
      cityId: hub?.cityId,
      cityName: this.cities.find((c) => c.id === hub?.cityId)?.name,
      assetId: data.assetId,
      assetName: asset?.name,
      typeId: data.typeId,
      typeName: type?.name,
      baseDailyRate: data.baseDailyRate,
      depositAmount: data.depositAmount != null ? data.depositAmount : 0,
      operatorDailyRate: data.operatorDailyRate ?? 0,
      freeDeliveryDistanceKm: data.freeDeliveryDistanceKm ?? 0,
      ratePerKmAfterFree: data.ratePerKmAfterFree ?? 0,
      active: true,
      notes: data.notes,
      billingUnit: resolveBillingUnitCode(data.billingUnit),
      billingUnitId: data.billingUnitId || resolveBillingUnitInt(data.billingUnit),
      unitLabel: getBillingUnitLabel(data.billingUnit),
      hindiUnitLabel: getBillingUnitHindiLabel(data.billingUnit),
      workingHoursLimit: data.workingHoursLimit,
      shiftTerms: data.shiftTerms,
    };
    this.rentalConfigs.unshift(newConfig);
    this.notify();

    request<any>('/rental-configs', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        billingUnit: resolveBillingUnitInt(data.billingUnit),
        billingUnitId: data.billingUnitId || resolveBillingUnitInt(data.billingUnit),
      }),
    })
      .then((raw) => {
        const mapped = mapRentalConfig(raw);
        const idx = this.rentalConfigs.findIndex((c) => c.id === newConfig.id);
        if (idx !== -1) this.rentalConfigs[idx] = mapped;
        this.notify();
      })
      .catch((e) => console.error('Failed to persist rental config:', e));

    return newConfig;
  }

  updateRentalConfig(
    id: number,
    data: Partial<Omit<RentalConfiguration, 'id' | 'hubId'>>,
  ): RentalConfiguration | undefined {
    const config = this.rentalConfigs.find((c) => c.id === id);
    if (!config) return undefined;

    if (data.baseDailyRate !== undefined) config.baseDailyRate = data.baseDailyRate;
    if (data.depositAmount !== undefined) config.depositAmount = data.depositAmount;
    if (data.operatorDailyRate !== undefined) config.operatorDailyRate = data.operatorDailyRate;
    if (data.freeDeliveryDistanceKm !== undefined) config.freeDeliveryDistanceKm = data.freeDeliveryDistanceKm;
    if (data.ratePerKmAfterFree !== undefined) config.ratePerKmAfterFree = data.ratePerKmAfterFree;
    if (data.notes !== undefined) config.notes = data.notes;
    if (data.billingUnit !== undefined) config.billingUnit = resolveBillingUnitCode(data.billingUnit);
    if (data.workingHoursLimit !== undefined) config.workingHoursLimit = data.workingHoursLimit;
    if (data.shiftTerms !== undefined) config.shiftTerms = data.shiftTerms;
    this.notify();

    const payload: any = { ...data };
    if (data.billingUnit !== undefined) {
      payload.billingUnit = resolveBillingUnitInt(data.billingUnit);
      payload.billingUnitId = (data as any).billingUnitId || resolveBillingUnitInt(data.billingUnit);
    }

    request<any>(`/rental-configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }).catch((e) => console.error('Failed to update rental config:', e));

    return config;
  }

  removeRentalConfig(id: number): boolean {
    const idx = this.rentalConfigs.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.rentalConfigs[idx].active = false;
      this.notify();
      request<any>(`/rental-configs/${id}`, {
        method: 'DELETE',
      }).catch((e) => console.error('Failed to delete rental config:', e));
      return true;
    }
    return false;
  }

  // --- FLEET / ASSET METHODS ---
  getAssets(filters?: { category?: AssetCategory; status?: AssetStatus; hubId?: number }): Asset[] {
    return this.assets.filter((asset) => {
      if (filters?.category && asset.category !== filters.category) return false;
      if (filters?.status && asset.status !== filters.status) return false;
      if (filters?.hubId && asset.hubId !== filters.hubId) return false;
      return true;
    });
  }

  getAssetById(id: number): Asset | undefined {
    return this.assets.find((a) => a.id === id);
  }

  getAssetByTag(tag: string): Asset | undefined {
    return this.assets.find((a) => a.assetTag.toLowerCase() === tag.toLowerCase());
  }

  async addAsset(data: {
    name: string;
    category?: AssetCategory;
    typeId: number;
    manufacturerId: number;
    modelId: number;
    hubId: number;
    imageUrl?: string;
    galleryImageUrls?: string[];
    videoUrl?: string;
    dailyRate?: number;
    depositAmount?: number;
    operatorRequired: boolean;
    serialNumber?: string;
    purchaseCost?: number;
    conditionNotes?: string;
    accessoriesIncluded?: string;
    assetTag?: string;
    billingUnit?: BillingUnit;
    billingUnitId?: number;
    workingHoursLimit?: number;
    shiftTerms?: string;
  }): Promise<Asset> {
    const type = this.types.find((t) => t.id === data.typeId);
    const mfg = this.manufacturers.find((m) => m.id === data.manufacturerId);
    const model = this.models.find((m) => m.id === data.modelId);
    const hub = this.hubs.find((h) => h.id === data.hubId);
    const city = hub ? this.cities.find((c) => c.id === hub.cityId) : undefined;
    const state = city ? this.states.find((s) => s.id === city.stateId) : undefined;

    const matchingConfig =
      this.rentalConfigs.find((rc) => rc.typeId === data.typeId && rc.hubId === data.hubId && rc.active) ||
      this.rentalConfigs.find((rc) => rc.typeId === data.typeId && rc.active);
    const resolvedDailyRate = data.dailyRate !== undefined ? data.dailyRate : matchingConfig?.baseDailyRate;
    const resolvedDepositAmount =
      data.depositAmount !== undefined ? data.depositAmount : matchingConfig?.depositAmount;

    const resolvedCategory: AssetCategory =
      data.category ||
      type?.category ||
      'CONSTRUCTION';
    const categoryInt =
      resolvedCategory === 'MULTIPURPOSE_FLEET' ? 3 : resolvedCategory === 'AGRICULTURE' ? 2 : 1;

    const prefix = resolvedCategory === 'MULTIPURPOSE_FLEET' ? 'M' : resolvedCategory === 'AGRICULTURE' ? 'A' : 'C';
    const subCode = type?.code?.split('-')[1] || 'MCH';
    const tag = data.assetTag || `${prefix}-${subCode}-${String(this.assets.length + 1).padStart(3, '0')}`;

    const resolvedName = data.name?.trim() || model?.name?.trim() || type?.name?.trim() || tag;
    const resolvedModelName = model?.name?.trim() || resolvedName;

    const effectiveImageUrl =
      data.imageUrl ||
      (data.galleryImageUrls && data.galleryImageUrls.length > 0 ? data.galleryImageUrls[0] : '') ||
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800';

    const customMedia: AssetMedia[] = [];
    if (data.galleryImageUrls && data.galleryImageUrls.length > 0) {
      data.galleryImageUrls.forEach((img, idx) => {
        customMedia.push({
          id: Date.now() + idx,
          mediaType: 'IMAGE',
          url: img,
          s3Key: img,
          displayOrder: idx,
        });
      });
    } else if (data.imageUrl) {
      customMedia.push({
        id: Date.now(),
        mediaType: 'IMAGE',
        url: data.imageUrl,
        s3Key: data.imageUrl,
        displayOrder: 0,
      });
    }

    if (data.videoUrl) {
      customMedia.push({
        id: Date.now() + 99,
        mediaType: 'VIDEO',
        url: data.videoUrl,
        s3Key: data.videoUrl,
        displayOrder: 0,
        durationSeconds: 15,
        contentType: 'video/mp4',
      });
    }

    const newAsset: Asset = {
      id: Date.now(),
      assetTag: tag,
      name: resolvedName,
      category: resolvedCategory,
      typeId: data.typeId,
      typeName: type?.name,
      manufacturerId: data.manufacturerId,
      manufacturerName: mfg?.name,
      modelId: data.modelId,
      modelName: resolvedModelName,
      hubId: data.hubId,
      hubName: hub?.name,
      cityName: city?.name,
      stateName: state?.name,
      imageUrl: effectiveImageUrl,
      serialNumber: data.serialNumber || `SN-${Date.now().toString().slice(-6)}`,
      dailyRate: resolvedDailyRate,
      depositAmount: resolvedDepositAmount,
      purchaseCost: data.purchaseCost,
      operatorRequired: data.operatorRequired,
      status: 'AVAILABLE',
      engineHours: 0.0,
      conditionNotes: data.conditionNotes || '',
      accessoriesIncluded: data.accessoriesIncluded,
      billingUnit: resolveBillingUnitCode(data.billingUnit),
      billingUnitId: data.billingUnitId || resolveBillingUnitInt(data.billingUnit),
      unitLabel: getBillingUnitLabel(data.billingUnit),
      hindiUnitLabel: getBillingUnitHindiLabel(data.billingUnit),
      workingHoursLimit: data.workingHoursLimit,
      shiftTerms: data.shiftTerms,
      mediaItems: customMedia,
    };

    this.assets.unshift(newAsset);
    this.notify();

    try {
      const raw = await request<any>('/assets', {
        method: 'POST',
        body: JSON.stringify({
          assetTag: tag,
          name: resolvedName,
          modelName: resolvedModelName,
          category: categoryInt,
          typeId: data.typeId,
          manufacturerId: data.manufacturerId,
          modelId: data.modelId,
          hubId: data.hubId,
          imageUrl: effectiveImageUrl,
          galleryImageUrls: data.galleryImageUrls,
          videoUrl: data.videoUrl,
          dailyRate: resolvedDailyRate,
          depositAmount: resolvedDepositAmount,
          purchaseCost: data.purchaseCost,
          operatorRequired: data.operatorRequired,
          serialNumber: data.serialNumber || '',
          conditionNotes: data.conditionNotes,
          accessoriesIncluded: data.accessoriesIncluded,
          billingUnit: resolveBillingUnitInt(data.billingUnit),
          billingUnitId: data.billingUnitId || resolveBillingUnitInt(data.billingUnit),
          workingHoursLimit: data.workingHoursLimit,
          shiftTerms: data.shiftTerms,
        }),
      });

      const mapped = mapAsset(raw);
      const idx = this.assets.findIndex((a) => a.id === newAsset.id);
      if (idx !== -1) this.assets[idx] = mapped;
      this.notify();
      return mapped;
    } catch (e: any) {
      // Rollback optimistic add if backend failed
      this.assets = this.assets.filter((a) => a.id !== newAsset.id);
      this.notify();
      console.error('Failed to persist asset on backend:', e);
      throw e;
    }
  }

  async updateAsset(
    id: number,
    data: Partial<{
      name: string;
      category: AssetCategory;
      typeId: number;
      manufacturerId: number;
      modelId: number;
      hubId: number;
      imageUrl: string;
      serialNumber: string;
      dailyRate: number;
      depositAmount: number;
      purchaseCost: number;
      operatorRequired: boolean;
      conditionNotes: string;
      accessoriesIncluded: string;
      billingUnit: BillingUnit;
      workingHoursLimit: number;
      shiftTerms: string;
    }>,
  ): Promise<Asset | undefined> {
    const existing = this.assets.find((a) => a.id === id);
    if (!existing) return undefined;

    const cat = data.category !== undefined ? data.category : existing.category;
    const catInt = cat === 'MULTIPURPOSE_FLEET' ? 3 : cat === 'AGRICULTURE' ? 2 : 1;

    const payload: any = {
      name: data.name ?? existing.name,
      category: catInt,
      typeId: data.typeId ?? existing.typeId,
      manufacturerId: data.manufacturerId ?? existing.manufacturerId,
      modelId: data.modelId ?? existing.modelId,
      hubId: data.hubId ?? existing.hubId,
      imageUrl: data.imageUrl ?? existing.imageUrl,
      serialNumber: data.serialNumber ?? existing.serialNumber,
      dailyRate: data.dailyRate ?? existing.dailyRate,
      depositAmount: data.depositAmount ?? existing.depositAmount,
      purchaseCost: data.purchaseCost ?? existing.purchaseCost,
      operatorRequired: data.operatorRequired ?? existing.operatorRequired,
      conditionNotes: data.conditionNotes ?? existing.conditionNotes,
      accessoriesIncluded: data.accessoriesIncluded ?? existing.accessoriesIncluded,
      workingHoursLimit: data.workingHoursLimit ?? existing.workingHoursLimit,
      shiftTerms: data.shiftTerms ?? existing.shiftTerms,
      billingUnit:
        data.billingUnit !== undefined ? resolveBillingUnitInt(data.billingUnit) : resolveBillingUnitInt(existing.billingUnit),
      billingUnitId:
        (data as any).billingUnitId ||
        (data.billingUnit !== undefined ? resolveBillingUnitInt(data.billingUnit) : existing.billingUnitId),
    };

    const updatedAsset: Asset = {
      ...existing,
      ...data,
      billingUnit: data.billingUnit !== undefined ? resolveBillingUnitCode(data.billingUnit) : existing.billingUnit,
      billingUnitId:
        (data as any).billingUnitId ||
        (data.billingUnit !== undefined ? resolveBillingUnitInt(data.billingUnit) : existing.billingUnitId),
      unitLabel: data.billingUnit !== undefined ? getBillingUnitLabel(data.billingUnit) : existing.unitLabel,
      hindiUnitLabel:
        data.billingUnit !== undefined ? getBillingUnitHindiLabel(data.billingUnit) : existing.hindiUnitLabel,
    };
    const idx = this.assets.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this.assets[idx] = updatedAsset;
      this.notify();
    }

    try {
      const raw = await request<any>(`/assets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const mapped = mapAsset(raw);
      if (idx !== -1) {
        this.assets[idx] = mapped;
        this.notify();
      }
      return mapped;
    } catch (e) {
      console.error('Failed to update asset on backend:', e);
      return updatedAsset;
    }
  }

  async updateAssetStatus(id: number, status: AssetStatus): Promise<Asset | undefined> {
    const raw = await request<any>(`/assets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    const mapped = mapAsset(raw);
    const idx = this.assets.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this.assets[idx] = mapped;
      this.notify();
    }
    return mapped;
  }

  // --- COMMERCIAL QUOTE CALCULATION ---
  async calculateQuote(
    assetId: number,
    startDate: string,
    endDate: string,
    distanceKm: number,
    operatorRequired: boolean,
    _hubId?: number,
    rentalConfigId?: number,
  ): Promise<QuoteCalculation> {
    try {
      const res = await request<any>('/bookings/quote', {
        method: 'POST',
        body: JSON.stringify({
          assetId,
          startDate,
          endDate,
          distanceKm,
          operatorRequired,
          rentalConfigId,
        }),
      });

      return {
        assetId: res.assetId,
        assetName: res.assetName,
        assetTag: res.assetTag,
        durationDays: Number(res.durationDays || 1),
        dailyRate: Number(res.dailyRate || 0),
        baseRent: Number(res.baseRent || 0),
        deliveryFee: Number(res.deliveryFee || 0),
        operatorFee: Number(res.operatorFee || 0),
        depositAmount: Number(res.depositAmount || 0),
        totalAmount: Number(res.totalAmount || 0),
        requiredInitialPayment: Number(res.requiredInitialPayment || 0),
        rentalConfigId: res.rentalConfigId || rentalConfigId,
        billingUnit: res.billingUnit ? resolveBillingUnitCode(res.billingUnit) : undefined,
        shiftTerms: res.shiftTerms,
      };
    } catch {
      // Local fallback calculation based on selected rental configuration or asset defaults
      const asset = this.assets.find((a) => a.id === assetId);
      if (!asset) throw new Error('Selected machine does not exist');
      const rc = rentalConfigId
        ? this.rentalConfigs.find((c) => c.id === rentalConfigId)
        : this.getRentalConfigForAsset(assetId, _hubId);
      const [y1, m1, d1] = startDate.split('-').map(Number);
      const [y2, m2, d2] = endDate.split('-').map(Number);
      const date1 = new Date(y1, m1 - 1, d1);
      const date2 = new Date(y2, m2 - 1, d2);
      const diffDays = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
      const days = Math.max(1, diffDays + 1);

      const rate = rc ? rc.baseDailyRate : (asset.dailyRate ?? 0);
      const deposit = rc ? rc.depositAmount : (asset.depositAmount ?? 0);
      const opRate = rc ? (rc.operatorDailyRate ?? 500) : 500;
      const freeKm = rc ? (rc.freeDeliveryDistanceKm ?? 5.0) : 5.0;
      const ratePerKm = rc ? (rc.ratePerKmAfterFree ?? 10.0) : 10.0;

      const baseRent = rate * days;
      const opFee = operatorRequired || asset.operatorRequired ? opRate * days : 0;
      const delFee =
        freeKm === 0 && ratePerKm === 0 ? 0 : distanceKm > freeKm ? Math.round((distanceKm - freeKm) * ratePerKm) : 0;
      const total = baseRent + opFee + delFee + deposit;

      return {
        assetId: asset.id,
        assetName: asset.name,
        assetTag: asset.assetTag,
        durationDays: days,
        dailyRate: rate,
        baseRent,
        deliveryFee: delFee,
        operatorFee: opFee,
        depositAmount: deposit,
        totalAmount: total,
        requiredInitialPayment: baseRent + delFee + deposit,
        rentalConfigId: rc?.id,
        billingUnit: rc?.billingUnit,
        shiftTerms: rc?.shiftTerms,
      };
    }
  }

  private farmLocationsStore: Record<number, FarmLocation[]> = {};

  // --- BOOKING OPERATIONS ---
  async getFarmLocations(customerId: number): Promise<FarmLocation[]> {
    try {
      const rows = await request<any[]>(`/customers/${customerId}/farm-locations`);
      if (Array.isArray(rows) && rows.length > 0) {
        const mapped = rows.map((location) => ({
          id: location.id,
          localName: location.localName,
          localNameHindi: location.localNameHindi,
          aliases: location.aliases,
          locationType: mapFarmLocationType(location.locationType),
          latitude: location.latitude == null ? undefined : Number(location.latitude),
          longitude: location.longitude == null ? undefined : Number(location.longitude),
          village: location.village,
          tehsil: location.tehsil,
          district: location.district,
          landmark: location.landmark,
          accessNotes: location.accessNotes,
          deliveryContactName: location.deliveryContactName,
          deliveryContactPhone: location.deliveryContactPhone,
          isDefault: Boolean(location.isDefault),
          lastUsedAt: location.lastUsedAt,
        }));
        this.farmLocationsStore[customerId] = mapped;
        return mapped;
      }
    } catch {
      // Backend offline or endpoint error; fall through to local store
    }
    return this.farmLocationsStore[customerId] || [];
  }

  async createFarmLocation(customerId: number, data: UpsertFarmLocationPayload): Promise<FarmLocation> {
    try {
      const raw = await request<any>(`/customers/${customerId}/farm-locations`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const created: FarmLocation = {
        id: raw.id,
        localName: raw.localName,
        localNameHindi: raw.localNameHindi,
        aliases: raw.aliases,
        locationType: mapFarmLocationType(raw.locationType),
        latitude: raw.latitude == null ? undefined : Number(raw.latitude),
        longitude: raw.longitude == null ? undefined : Number(raw.longitude),
        village: raw.village,
        tehsil: raw.tehsil,
        district: raw.district,
        landmark: raw.landmark,
        accessNotes: raw.accessNotes,
        deliveryContactName: raw.deliveryContactName,
        deliveryContactPhone: raw.deliveryContactPhone,
        isDefault: Boolean(raw.isDefault),
        lastUsedAt: raw.lastUsedAt,
      };
      if (!this.farmLocationsStore[customerId]) this.farmLocationsStore[customerId] = [];
      if (created.isDefault) {
        this.farmLocationsStore[customerId].forEach((l) => (l.isDefault = false));
      }
      this.farmLocationsStore[customerId].push(created);
      this.notify();
      return created;
    } catch {
      // Offline fallback
      const newId = Date.now();
      const created: FarmLocation = {
        id: newId,
        localName: data.localName,
        localNameHindi: data.localNameHindi,
        aliases: data.aliases,
        locationType: data.locationType || 'FARM',
        latitude: data.latitude,
        longitude: data.longitude,
        village: data.village,
        tehsil: data.tehsil,
        district: data.district,
        landmark: data.landmark,
        accessNotes: data.accessNotes,
        deliveryContactName: data.deliveryContactName,
        deliveryContactPhone: data.deliveryContactPhone,
        isDefault: Boolean(data.isDefault),
      };
      if (!this.farmLocationsStore[customerId]) this.farmLocationsStore[customerId] = [];
      if (created.isDefault) {
        this.farmLocationsStore[customerId].forEach((l) => (l.isDefault = false));
      }
      this.farmLocationsStore[customerId].push(created);
      this.notify();
      return created;
    }
  }

  async updateFarmLocation(
    customerId: number,
    locationId: number,
    data: UpsertFarmLocationPayload,
  ): Promise<FarmLocation> {
    try {
      const raw = await request<any>(`/customers/${customerId}/farm-locations/${locationId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      const updated: FarmLocation = {
        id: raw.id,
        localName: raw.localName,
        localNameHindi: raw.localNameHindi,
        aliases: raw.aliases,
        locationType: mapFarmLocationType(raw.locationType),
        latitude: raw.latitude == null ? undefined : Number(raw.latitude),
        longitude: raw.longitude == null ? undefined : Number(raw.longitude),
        village: raw.village,
        tehsil: raw.tehsil,
        district: raw.district,
        landmark: raw.landmark,
        accessNotes: raw.accessNotes,
        deliveryContactName: raw.deliveryContactName,
        deliveryContactPhone: raw.deliveryContactPhone,
        isDefault: Boolean(raw.isDefault),
        lastUsedAt: raw.lastUsedAt,
      };
      const list = this.farmLocationsStore[customerId] || [];
      const idx = list.findIndex((l) => l.id === locationId);
      if (updated.isDefault) {
        list.forEach((l) => (l.isDefault = false));
      }
      if (idx >= 0) list[idx] = updated;
      else list.push(updated);
      this.farmLocationsStore[customerId] = list;
      this.notify();
      return updated;
    } catch {
      const list = this.farmLocationsStore[customerId] || [];
      const idx = list.findIndex((l) => l.id === locationId);
      const existing = list[idx];
      const updated: FarmLocation = {
        id: locationId,
        localName: data.localName || existing?.localName || 'Field',
        localNameHindi: data.localNameHindi ?? existing?.localNameHindi,
        aliases: data.aliases ?? existing?.aliases,
        locationType: data.locationType || existing?.locationType || 'FARM',
        latitude: data.latitude ?? existing?.latitude,
        longitude: data.longitude ?? existing?.longitude,
        village: data.village ?? existing?.village,
        tehsil: data.tehsil ?? existing?.tehsil,
        district: data.district ?? existing?.district,
        landmark: data.landmark ?? existing?.landmark,
        accessNotes: data.accessNotes ?? existing?.accessNotes,
        deliveryContactName: data.deliveryContactName ?? existing?.deliveryContactName,
        deliveryContactPhone: data.deliveryContactPhone ?? existing?.deliveryContactPhone,
        isDefault: Boolean(data.isDefault),
      };
      if (updated.isDefault) {
        list.forEach((l) => (l.isDefault = false));
      }
      if (idx >= 0) list[idx] = updated;
      else list.push(updated);
      this.farmLocationsStore[customerId] = list;
      this.notify();
      return updated;
    }
  }

  async createBooking(data: {
    customerId: number;
    assetId: number;
    startDate: string;
    endDate: string;
    deliveryAddress: string;
    farmLocationId?: number;
    bookingSource?: BookingSource;
    callbackRequested?: boolean;
    distanceKm: number;
    operatorRequired: boolean;
    dealerId?: number;
    notes?: string;
    rentalConfigId?: number;
    billingUnit?: BillingUnit;
    shiftTerms?: string;
    dailyRate?: number;
  }): Promise<Booking> {
    const raw = await request<any>('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        deliveryAddress: data.deliveryAddress?.trim() || 'Standard Delivery Location',
      }),
    });

    const newBooking = mapBooking(raw);
    if (data.rentalConfigId) newBooking.rentalConfigId = data.rentalConfigId;
    if (data.billingUnit) newBooking.billingUnit = resolveBillingUnitCode(data.billingUnit);
    if (data.shiftTerms) newBooking.shiftTerms = data.shiftTerms;
    if (data.dailyRate) newBooking.dailyRate = data.dailyRate;

    this.bookings.unshift(newBooking);

    const asset = this.assets.find((a) => a.id === data.assetId);
    if (asset) asset.status = 'RESERVED';

    this.notify();
    return newBooking;
  }

  getBookings(filters?: { status?: BookingStatus; customerId?: number }): Booking[] {
    return this.bookings.filter((b) => {
      if (filters?.status && b.status !== filters.status) return false;
      if (filters?.customerId && b.customer.id !== filters.customerId) return false;
      return true;
    });
  }

  getBookingById(id: number): Booking | undefined {
    return this.bookings.find((b) => b.id === id);
  }

  getBookingByNumber(num: string): Booking | undefined {
    return this.bookings.find((b) => b.bookingNumber === num);
  }

  // --- PAYMENT OPERATIONS ---
  async recordPayment(data: {
    bookingId: number;
    amount: number;
    paymentType: PaymentType;
    paymentMode: PaymentMode;
    transactionRef?: string;
    notes?: string;
  }): Promise<Payment> {
    const typeEnumMap: Record<PaymentType, number> = {
      ADVANCE: 1,
      DEPOSIT: 2,
      FINAL_SETTLEMENT: 3,
      DAMAGE_CHARGE: 4,
      REFUND: 5,
    };
    const modeEnumMap: Record<PaymentMode, number> = {
      CASH: 1,
      UPI: 2,
      BANK_TRANSFER: 3,
    };

    const raw = await request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: data.bookingId,
        amount: data.amount,
        paymentType: typeEnumMap[data.paymentType] || 1,
        paymentMode: modeEnumMap[data.paymentMode] || 2,
        transactionRef: data.transactionRef,
        notes: data.notes,
      }),
    });

    const payment = mapPayment(raw);
    this.payments.unshift(payment);

    const b = this.bookings.find((bk) => bk.id === data.bookingId);
    if (b) {
      if (data.paymentType === 'ADVANCE') b.advancePaid += data.amount;
      if (data.paymentType === 'DEPOSIT') b.depositPaid += data.amount;
      if (b.depositPaid >= b.depositAmount && b.advancePaid >= b.baseRent && b.status === 'QUOTED') {
        b.status = 'CONFIRMED';
      }
    }

    this.notify();
    return payment;
  }

  getPayments(bookingId?: number): Payment[] {
    if (bookingId) return this.payments.filter((p) => p.bookingId === bookingId);
    return this.payments;
  }

  // --- PAYMENT OPERATIONS & RECONCILIATION QUEUES ---
  async getPaymentProofs(): Promise<PaymentProof[]> {
    try {
      const rows = await request<any[]>('/payment-operations/proofs');
      return (rows || []).map((p) => ({
        id: p.id,
        booking: mapBooking(p.booking),
        submittedReference: p.submittedReference,
        status: mapVerificationStatus(p.status),
        submittedAt: p.submittedAt,
        verifiedAt: p.verifiedAt,
        verifiedBy: p.verifiedBy,
        verificationNotes: p.verificationNotes,
      }));
    } catch (e) {
      console.warn('Failed to fetch payment proofs:', e);
      return [];
    }
  }

  async verifyPaymentProof(
    id: number,
    data: { amount?: number; paymentType?: PaymentType; verifiedBy?: string; notes?: string },
  ): Promise<PaymentProof> {
    const typeEnumMap: Record<PaymentType, number> = {
      ADVANCE: 1,
      DEPOSIT: 2,
      FINAL_SETTLEMENT: 3,
      DAMAGE_CHARGE: 4,
      REFUND: 5,
    };
    const raw = await request<any>(`/payment-operations/proofs/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...data,
        paymentType: data.paymentType ? typeEnumMap[data.paymentType] || 1 : 1,
      }),
    });
    // Refresh local lists
    await this.refreshAll();
    return {
      id: raw.id,
      booking: mapBooking(raw.booking),
      submittedReference: raw.submittedReference,
      status: mapVerificationStatus(raw.status || 2),
      submittedAt: raw.submittedAt,
      verifiedAt: raw.verifiedAt,
      verifiedBy: raw.verifiedBy,
      verificationNotes: raw.verificationNotes,
    };
  }

  async getRefunds(): Promise<RefundTransaction[]> {
    try {
      const rows = await request<any[]>('/payment-operations/refunds');
      return (rows || []).map((r) => ({
        id: r.id,
        booking: mapBooking(r.booking),
        amount: Number(r.amount || 0),
        status: mapRefundStatus(r.status),
        paymentReference: r.paymentReference,
        reason: r.reason,
        initiatedAt: r.initiatedAt,
        completedAt: r.completedAt,
      }));
    } catch (e) {
      console.warn('Failed to fetch refunds:', e);
      return [];
    }
  }

  async completeRefund(id: number, data: { paymentReference: string }): Promise<RefundTransaction> {
    const raw = await request<any>(`/payment-operations/refunds/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    await this.refreshAll();
    return {
      id: raw.id,
      booking: mapBooking(raw.booking),
      amount: Number(raw.amount || 0),
      status: mapRefundStatus(raw.status || 3),
      paymentReference: raw.paymentReference,
      reason: raw.reason,
      initiatedAt: raw.initiatedAt,
      completedAt: raw.completedAt,
    };
  }

  // --- FULFILLMENT & LOGISTICS JOBS ---
  async getDeliveryJobs(): Promise<DeliveryJob[]> {
    try {
      const rows = await request<any[]>('/fulfillment/deliveries');
      return (rows || []).map((j) => ({
        id: j.id,
        booking: mapBooking(j.booking),
        status: mapJobStatus(j.status),
        driverName: j.driverName,
        driverPhone: j.driverPhone,
        vehicleNumber: j.vehicleNumber,
        scheduledFor: j.scheduledFor,
        etaStart: j.etaStart,
        etaEnd: j.etaEnd,
        deliveredAt: j.deliveredAt,
        receiverName: j.receiverName,
        receiverPhone: j.receiverPhone,
        deliveryNotes: j.deliveryNotes,
      }));
    } catch (e) {
      console.warn('Failed to fetch delivery jobs:', e);
      return [];
    }
  }

  async getReturnPickupJobs(): Promise<ReturnPickupJob[]> {
    try {
      const rows = await request<any[]>('/fulfillment/returns');
      return (rows || []).map((j) => ({
        id: j.id,
        booking: mapBooking(j.booking),
        status: mapJobStatus(j.status),
        driverName: j.driverName,
        driverPhone: j.driverPhone,
        vehicleNumber: j.vehicleNumber,
        scheduledFor: j.scheduledFor,
        collectedAt: j.collectedAt,
        pickupNotes: j.pickupNotes,
      }));
    } catch (e) {
      console.warn('Failed to fetch return pickup jobs:', e);
      return [];
    }
  }

  async saveDeliveryJob(bookingId: number, data: UpdateFulfillmentJobPayload): Promise<DeliveryJob> {
    const raw = await request<any>(`/fulfillment/bookings/${bookingId}/delivery`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.notify();
    return {
      id: raw.id,
      booking: mapBooking(raw.booking),
      status: mapJobStatus(raw.status),
      driverName: raw.driverName,
      driverPhone: raw.driverPhone,
      vehicleNumber: raw.vehicleNumber,
      scheduledFor: raw.scheduledFor,
      etaStart: raw.etaStart,
      etaEnd: raw.etaEnd,
      deliveredAt: raw.deliveredAt,
      receiverName: raw.receiverName,
      receiverPhone: raw.receiverPhone,
      deliveryNotes: raw.deliveryNotes,
    };
  }

  async updateDeliveryJob(id: number, data: UpdateFulfillmentJobPayload): Promise<DeliveryJob> {
    const raw = await request<any>(`/fulfillment/deliveries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    this.notify();
    return {
      id: raw.id,
      booking: mapBooking(raw.booking),
      status: mapJobStatus(raw.status),
      driverName: raw.driverName,
      driverPhone: raw.driverPhone,
      vehicleNumber: raw.vehicleNumber,
      scheduledFor: raw.scheduledFor,
      etaStart: raw.etaStart,
      etaEnd: raw.etaEnd,
      deliveredAt: raw.deliveredAt,
      receiverName: raw.receiverName,
      receiverPhone: raw.receiverPhone,
      deliveryNotes: raw.deliveryNotes,
    };
  }

  async updateReturnPickupJob(id: number, data: UpdateFulfillmentJobPayload): Promise<ReturnPickupJob> {
    const raw = await request<any>(`/fulfillment/returns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    this.notify();
    return {
      id: raw.id,
      booking: mapBooking(raw.booking),
      status: mapJobStatus(raw.status),
      driverName: raw.driverName,
      driverPhone: raw.driverPhone,
      vehicleNumber: raw.vehicleNumber,
      scheduledFor: raw.scheduledFor,
      collectedAt: raw.collectedAt,
      pickupNotes: raw.pickupNotes,
    };
  }

  // --- TASK-BASED MACHINE RECOMMENDATIONS ---
  async getEquipmentRecommendations(req: EquipmentRecommendationRequest): Promise<EquipmentRecommendationResponse[]> {
    try {
      const rows = await request<any[]>('/recommendations/equipment', {
        method: 'POST',
        body: JSON.stringify(req),
      });
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map((r) => ({
          assetId: r.assetId,
          assetName: r.assetName,
          assetTag: r.assetTag,
          reason: r.reason,
          dailyRate: Number(r.dailyRate || 0),
          depositAmount: Number(r.depositAmount || 0),
        }));
      }
    } catch {
      // Backend offline or endpoint empty; fallback to internal fleet matching
    }

    const taskLower = (req.task || '').toLowerCase();
    const isWeeding = taskLower.includes('weed') || taskLower.includes('nirai');
    const isHarvesting = taskLower.includes('harvest') || taskLower.includes('kata') || taskLower.includes('reap');
    const isSpraying = taskLower.includes('spray') || taskLower.includes('chhid');
    const isTilling =
      taskLower.includes('till') ||
      taskLower.includes('juta') ||
      taskLower.includes('rotavator') ||
      taskLower.includes('plow');
    const isDigging =
      taskLower.includes('dig') ||
      taskLower.includes('gaddha') ||
      taskLower.includes('auger') ||
      taskLower.includes('hole');
    const isWater =
      taskLower.includes('pump') ||
      taskLower.includes('water') ||
      taskLower.includes('irrigation') ||
      taskLower.includes('sinchai');

    // Filter available assets
    const available = this.assets.filter((a) => {
      if (req.hubId && a.hubId !== req.hubId) return false;
      return a.status === 'AVAILABLE';
    });

    const candidates = available.length > 0 ? available : this.assets;

    const scored = candidates.map((a) => {
      const name = (a.name + ' ' + a.assetTag + ' ' + (a.typeName || '')).toLowerCase();
      let matchScore = 0;
      let reason = `Recommended machine for ${req.task}: High performance on rural farm terrain.`;

      if (isWeeding && (name.includes('weed') || name.includes('rotary'))) {
        matchScore = 10;
        reason = `Recommended for Weeding (निराई): High-torque rotary blades clear inter-row weeds at 1.5 acres/day. Low fuel consumption.`;
      } else if (isHarvesting && (name.includes('reap') || name.includes('harvest'))) {
        matchScore = 10;
        reason = `Recommended for Harvesting (कटाई): Front crop cutter cuts paddy/wheat without grain loss, covering 3–4 acres per day.`;
      } else if (isSpraying && (name.includes('spray') || name.includes('mist'))) {
        matchScore = 10;
        reason = `Recommended for Spraying (छिड़काव): Uniform droplet dispersion with 20L high-pressure tank for rapid orchard & field protection.`;
      } else if (isTilling && (name.includes('tractor') || name.includes('rotavator') || name.includes('tiller'))) {
        matchScore = 10;
        reason = `Recommended for Tilling (जुताई): Excellent seedbed preparation, pulverized soil mixing and ridge formation for ${req.acreage || 2} acres.`;
      } else if (isDigging && (name.includes('aug') || name.includes('dig') || name.includes('drill'))) {
        matchScore = 10;
        reason = `Recommended for Hole Digging (गड्ढा खुदाई): Drills clean 8-12 inch pits in minutes for orchard saplings and fence poles.`;
      } else if (isWater && (name.includes('pmp') || name.includes('pump') || name.includes('water'))) {
        matchScore = 10;
        reason = `Recommended for Irrigation (सिंचाई): 1000 L/min diesel water pump with suction hose for reliable field canal lifting.`;
      } else if (a.category === 'AGRICULTURE') {
        matchScore = 5;
        reason = `Agricultural multi-purpose implement suitable for seasonal farm operations.`;
      }

      return { asset: a, matchScore, reason };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);
    const top = scored.slice(0, 2);

    return top.map(({ asset, reason }) => {
      const rc = this.getRentalConfigForAsset(asset);
      return {
        assetId: asset.id,
        assetName: asset.name,
        assetTag: asset.assetTag,
        reason,
        dailyRate: rc ? rc.baseDailyRate : asset.dailyRate,
        depositAmount: rc ? rc.depositAmount : asset.depositAmount,
      };
    });
  }

  // --- DISPATCH OPERATIONS ---
  async executeDispatch(data: {
    bookingId: number;
    driverName: string;
    fuelLevel: string;
    engineHoursOut: number;
    conditionNotes?: string;
  }): Promise<DispatchRecord> {
    const raw = await request<any>('/dispatch', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: data.bookingId,
        driverName: data.driverName,
        fuelLevel: data.fuelLevel,
        engineHoursOut: data.engineHoursOut,
        conditionNotes: data.conditionNotes,
        accessoriesVerified: true,
        customerSignatureConfirmed: true,
      }),
    });

    const b = this.bookings.find((bk) => bk.id === data.bookingId);
    if (b) {
      b.status = 'ON_RENT';
      const asset = this.assets.find((a) => a.id === b.asset.id);
      if (asset) asset.status = 'ON_RENT';
    }

    this.notify();

    return {
      id: raw.id,
      challanNumber: raw.challanNumber || '',
      bookingId: data.bookingId,
      assetTag: raw.asset?.assetTag || b?.asset.assetTag || '',
      dispatchTimestamp: raw.dispatchTimestamp || '',
      fuelLevel: data.fuelLevel,
      engineHoursOut: data.engineHoursOut,
      accessoriesVerified: true,
      conditionNotes: data.conditionNotes,
      driverName: data.driverName,
      customerSignatureConfirmed: true,
    };
  }

  async getDispatchByBooking(bookingId: number): Promise<DispatchRecord> {
    const raw = await request<any>(`/dispatch/booking/${bookingId}`);
    return {
      id: raw.id,
      challanNumber: raw.challanNumber,
      bookingId: raw.booking?.id || bookingId,
      assetTag: raw.asset?.assetTag || '',
      dispatchTimestamp: raw.dispatchTimestamp || '',
      fuelLevel: raw.fuelLevel || '—',
      engineHoursOut: raw.engineHoursOut !== undefined && raw.engineHoursOut !== null ? Number(raw.engineHoursOut) : 0,
      accessoriesVerified: raw.accessoriesVerified ?? true,
      conditionNotes: raw.conditionNotes || '',
      driverName: raw.driverName || '—',
      driverPhone: raw.driverPhone || '',
      vehicleNumber: raw.vehicleNumber || '',
      customerSignatureConfirmed: raw.customerSignatureConfirmed ?? true,
    };
  }

  // --- RETURN INSPECTION OPERATIONS ---
  async executeReturnInspection(data: {
    bookingId: number;
    inspectorName: string;
    hasDamage: boolean;
    damageCost: number;
    fuelDeltaCharge: number;
    damageDescription?: string;
    fuelLevelReturn?: string;
    engineHoursIn?: number;
    accessoriesReturnedOk?: boolean;
  }): Promise<ReturnInspection> {
    const b = this.bookings.find((bk) => bk.id === data.bookingId);
    const nextAction = data.hasDamage ? 'MAINTENANCE' : 'AVAILABLE';
    const raw = await request<any>('/returns', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: data.bookingId,
        inspectorName: data.inspectorName,
        hasDamage: data.hasDamage,
        damageCost: data.damageCost,
        fuelDeltaCharge: data.fuelDeltaCharge,
        damageDescription: data.damageDescription,
        nextAction,
        fuelLevelReturn: data.fuelLevelReturn || '—',
        engineHoursIn: data.engineHoursIn !== undefined ? data.engineHoursIn : b?.asset.engineHours || 0,
        accessoriesReturnedOk: data.accessoriesReturnedOk ?? true,
      }),
    });

    if (b) {
      b.status = 'CLOSED';
      const asset = this.assets.find((a) => a.id === b.asset.id);
      if (asset) asset.status = data.hasDamage ? 'MAINTENANCE' : 'AVAILABLE';
    }

    this.notify();

    return {
      id: raw.id || Date.now(),
      bookingId: data.bookingId,
      assetTag: raw.asset?.assetTag || b?.asset.assetTag || '',
      returnTimestamp: raw.returnTimestamp || '',
      fuelLevelReturn: raw.fuelLevelReturn || data.fuelLevelReturn || '—',
      fuelDeltaCharge: Number(raw.fuelDeltaCharge !== undefined ? raw.fuelDeltaCharge : data.fuelDeltaCharge),
      engineHoursIn: Number(
        raw.engineHoursIn !== undefined ? raw.engineHoursIn : data.engineHoursIn || b?.asset.engineHours || 0,
      ),
      accessoriesReturnedOk: Boolean(raw.accessoriesReturnedOk ?? true),
      hasDamage: Boolean(raw.hasDamage ?? data.hasDamage),
      damageCost: Number(raw.damageCost !== undefined ? raw.damageCost : data.damageCost),
      damageDescription: raw.damageDescription || data.damageDescription,
      inspectorName: data.inspectorName,
      nextAction: data.hasDamage ? 'MAINTENANCE' : 'AVAILABLE',
    };
  }

  async getInspectionsByBooking(bookingId: number): Promise<ReturnInspection[]> {
    const rawList = await request<any[]>(`/returns/booking/${bookingId}`);
    if (!Array.isArray(rawList)) return [];
    return rawList.map((raw) => ({
      id: raw.id,
      bookingId: raw.booking?.id || bookingId,
      assetTag: raw.asset?.assetTag || '',
      returnTimestamp: raw.createdAt || raw.returnTimestamp || '',
      fuelLevelReturn: raw.fuelLevelReturn || '—',
      fuelDeltaCharge: Number(raw.fuelDeltaCharge || 0),
      engineHoursIn: Number(raw.engineHoursIn || 0),
      accessoriesReturnedOk: Boolean(raw.accessoriesReturnedOk ?? true),
      hasDamage: Boolean(raw.hasDamage ?? false),
      damageCost: Number(raw.damageCost || 0),
      damageDescription: raw.damageDescription || '',
      inspectorName: raw.inspectorName || '—',
      nextAction: raw.nextAction || 'AVAILABLE',
    }));
  }

  // --- DEALER OPERATIONS ---
  getDealers(): Dealer[] {
    return this.dealers.filter((d) => d.active !== false);
  }

  getDealerById(id: number): Dealer | undefined {
    return this.dealers.find((d) => d.id === id);
  }

  async addDealer(data: Omit<Dealer, 'id' | 'totalCommissionEarned' | 'totalReferrals'>): Promise<Dealer> {
    const payload = {
      name: data.name,
      tradeName: data.tradeName,
      phone: data.phone,
      location: data.location || data.address || '',
      commissionRate: data.commissionRate != null ? Number(data.commissionRate) : 0,
    };
    const raw = await request<any>('/dealers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch(() => null);

    const newDealer: Dealer = {
      id: raw?.id || Date.now(),
      name: raw?.name || data.name,
      tradeName: raw?.tradeName || data.tradeName,
      phone: raw?.phone || data.phone,
      location: raw?.location || data.location,
      stateId: data.stateId,
      cityId: data.cityId,
      hubId: data.hubId,
      hubName: data.hubName,
      address: data.address,
      notes: data.notes,
      commissionRate: Number(raw?.commissionRate ?? data.commissionRate ?? 0),
      totalCommissionEarned: Number(raw?.totalCommissionEarned || 0),
      totalReferrals: Number(raw?.totalReferrals || 0),
      active: true,
    };
    this.dealers.push(newDealer);
    this.notify();
    return newDealer;
  }

  async getDealerCommissions(dealerId: number): Promise<DealerCommission[]> {
    const raw = await request<any[]>(`/dealers/${dealerId}/commissions`);
    return (raw || []).map((c) => ({
      id: c.id,
      dealerId: c.dealer?.id || dealerId,
      dealerName: c.dealer?.name,
      bookingId: c.booking?.id,
      grossRentalRevenue: Number(c.grossRentalRevenue || 0),
      commissionRate: Number(c.commissionRate || 0),
      commissionAmount: Number(c.commissionAmount || 0),
      status: c.status === 2 ? 'SETTLED' : 'PENDING',
      createdAt: c.createdAt,
    }));
  }

  async settleCommission(commissionId: number): Promise<void> {
    await request<any>(`/dealers/commissions/${commissionId}/settle`, {
      method: 'PATCH',
    });
    this.notify();
  }

  // --- REPORTING & DASHBOARD ---
  getDashboardSummary(): DashboardSummary {
    const total = this.assets.length;
    const available = this.assets.filter((a) => a.status === 'AVAILABLE').length;
    const onRent = this.assets.filter((a) => a.status === 'ON_RENT' || a.status === 'DISPATCHED').length;
    const pendingDispatch = this.bookings.filter((b) => b.status === 'CONFIRMED').length;

    const totalCollected = this.payments.reduce((acc, p) => acc + p.amount, 0);
    const pendingDeposits = this.bookings
      .filter((b) => b.status === 'ON_RENT')
      .reduce((acc, b) => acc + (b.depositPaid || 0), 0);

    return {
      totalAssets: total || this.dashboardSummary.totalAssets,
      availableAssets: available || this.dashboardSummary.availableAssets,
      activeRentals: onRent || this.dashboardSummary.activeRentals,
      pendingDispatch: pendingDispatch || this.dashboardSummary.pendingDispatch,
      todayGrossRevenue: this.dashboardSummary.todayGrossRevenue || totalCollected,
      totalRevenueCollected: totalCollected || this.dashboardSummary.totalRevenueCollected,
      pendingSecurityDeposits: pendingDeposits || this.dashboardSummary.pendingSecurityDeposits,
      fleetUtilizationPercent:
        total > 0 ? Math.round((onRent / total) * 100) : this.dashboardSummary.fleetUtilizationPercent,
      zeroCreditCompliancePercent: 100,
    };
  }

  getDailyCash(): DailyCashReconciliation {
    const cash = this.payments.filter((p) => p.paymentMode === 'CASH').reduce((sum, p) => sum + p.amount, 0);
    const upi = this.payments.filter((p) => p.paymentMode === 'UPI').reduce((sum, p) => sum + p.amount, 0);
    const bank = this.payments.filter((p) => p.paymentMode === 'BANK_TRANSFER').reduce((sum, p) => sum + p.amount, 0);

    const opening = 0;
    const totalReceipts = cash + upi + bank;

    return {
      date: new Date().toISOString().split('T')[0],
      openingCash: opening,
      cashReceipts: cash,
      upiReceipts: upi,
      bankReceipts: bank,
      totalReceipts,
      totalExpenses: 0,
      totalRefunds: 0,
      closingPosition: opening + totalReceipts,
      reconciliationStatus: 'BALANCED',
    };
  }

  // --- WHATSAPP NOTIFICATIONS & CIRCULATION ---
  async sendBookingWhatsAppNotification(bookingId: number): Promise<any> {
    try {
      return await request<any>(`/whatsapp/notify/booking/${bookingId}`, {
        method: 'POST',
      });
    } catch (err) {
      console.warn('WhatsApp booking notification error:', err);
      const b = this.bookings.find((item) => item.id === bookingId);
      return {
        to: b?.customer.phone,
        bookingNumber: b?.bookingNumber,
        status: 'FAILED',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async sendDispatchWhatsAppNotification(bookingId: number): Promise<any> {
    try {
      return await request<any>(`/whatsapp/notify/dispatch/${bookingId}`, {
        method: 'POST',
      });
    } catch (err) {
      console.warn('WhatsApp dispatch notification error:', err);
      const b = this.bookings.find((item) => item.id === bookingId);
      return {
        to: b?.customer.phone,
        bookingNumber: b?.bookingNumber,
        status: 'FAILED',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async sendReturnWhatsAppNotification(bookingId: number): Promise<any> {
    try {
      return await request<any>(`/whatsapp/notify/settlement/${bookingId}`, {
        method: 'POST',
      });
    } catch (err) {
      console.warn('WhatsApp return settlement notification error:', err);
      const b = this.bookings.find((item) => item.id === bookingId);
      return {
        to: b?.customer.phone,
        bookingNumber: b?.bookingNumber,
        status: 'FAILED',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // USER MANAGEMENT & RBAC APIS
  // ─────────────────────────────────────────────────────────────────────────

  private normalizeStaffRole(role: any): StaffRole {
    if (role === 8 || role === '8' || role === 'ROOT') return 'ROOT';
    if (role === 7 || role === '7' || role === 'ADMIN' || role === 1 || role === '1' || role === 'SUPER_ADMIN')
      return 'ADMIN';
    if (role === 6 || role === '6' || role === 'MANAGER') return 'MANAGER';
    if (role === 2 || role === '2' || role === 'OPERATOR') return 'OPERATOR';
    if (role === 3 || role === '3' || role === 'TECHNICIAN') return 'TECHNICIAN';
    if (role === 4 || role === '4' || role === 'DRIVER') return 'DRIVER';
    return String(role || 'OPERATOR').toUpperCase() as StaffRole;
  }

  async getUsers(hubId?: number, role?: string): Promise<UserAccount[]> {
    const params = new URLSearchParams();
    if (hubId) params.append('hubId', String(hubId));
    if (role) params.append('role', role);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const list = await request<UserAccount[]>(`/users${qs}`);
    return (list || []).map((u) => ({
      ...u,
      role: this.normalizeStaffRole(u.role),
    }));
  }

  async createUser(payload: CreateUserPayload): Promise<UserAccount> {
    const res = await request<UserAccount>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.notify();
    return {
      ...res,
      role: this.normalizeStaffRole(res.role),
    };
  }

  async updateUser(id: number, payload: UpdateUserPayload): Promise<UserAccount> {
    const res = await request<UserAccount>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    this.notify();
    return {
      ...res,
      role: this.normalizeStaffRole(res.role),
    };
  }

  async deleteUser(id: number): Promise<void> {
    await request<void>(`/users/${id}`, {
      method: 'DELETE',
    });
    this.notify();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MACHINERY FLEET DELETION (STRICTLY ROOT ONLY)
  // ─────────────────────────────────────────────────────────────────────────

  async deleteAsset(id: number): Promise<void> {
    await request<void>(`/assets/${id}`, {
      method: 'DELETE',
    });
    this.assets = this.assets.filter((a) => a.id !== id);
    this.notify();
  }

  async getMerchantUpiDetails(
    amount?: number,
    note?: string,
  ): Promise<{
    payeeVpa: string;
    payeeName: string;
    amount: number;
    transactionNote: string;
    upiUri: string;
    qrCodeBase64: string;
    qrCodeImageUrl: string;
  }> {
    const params = new URLSearchParams();
    if (amount && amount > 0) params.append('amount', amount.toString());
    if (note) params.append('note', note);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<{
      payeeVpa: string;
      payeeName: string;
      amount: number;
      transactionNote: string;
      upiUri: string;
      qrCodeBase64: string;
      qrCodeImageUrl: string;
    }>(`/whatsapp/qr/merchant/details${qs}`);
  }

  // ── Maintenance & Servicing API ──────────────────────────────────────────

  async fetchMaintenanceTickets(
    hubId?: number,
    status?: MaintenanceStatus,
    activeOnly?: boolean,
  ): Promise<MaintenanceTicket[]> {
    const params = new URLSearchParams();
    if (hubId) params.append('hubId', hubId.toString());
    if (status) params.append('status', status);
    if (activeOnly !== undefined) params.append('activeOnly', String(activeOnly));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<MaintenanceTicket[]>(`/maintenance/tickets${qs}`);
  }

  async getMaintenanceTicket(id: number): Promise<MaintenanceTicket> {
    return request<MaintenanceTicket>(`/maintenance/tickets/${id}`);
  }

  async createMaintenanceTicket(
    payload: CreateMaintenanceTicketPayload,
  ): Promise<MaintenanceTicket> {
    const ticket = await request<MaintenanceTicket>('/maintenance/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Update local asset status
    const asset = this.assets.find((a) => a.id === payload.assetId);
    if (asset) {
      asset.status = payload.serviceType === 'REPAIR_WORK' ? 'DAMAGED' : 'MAINTENANCE';
    }
    this.notify();
    return ticket;
  }

  async updateMaintenanceTicketProgress(
    id: number,
    payload: UpdateMaintenanceProgressPayload,
  ): Promise<MaintenanceTicket> {
    return request<MaintenanceTicket>(`/maintenance/tickets/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async uploadMaintenanceInvoice(id: number, file: File): Promise<MaintenanceTicket> {
    const url = `${API_BASE}/maintenance/tickets/${id}/invoice`;
    let token = '';
    try {
      const authStored = localStorage.getItem('equipgrid_auth_user');
      if (authStored) {
        const parsed = JSON.parse(authStored);
        if (parsed?.token) token = parsed.token;
      }
    } catch {}

    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      let errMsg = `Invoice upload failed: ${res.status} ${res.statusText}`;
      try {
        const errBody = await res.json();
        if (errBody?.message?.text) errMsg = errBody.message.text;
        else if (errBody?.message)
          errMsg =
            typeof errBody.message === 'string'
              ? errBody.message
              : JSON.stringify(errBody.message);
      } catch {}
      throw new Error(errMsg);
    }

    const json = await res.json();
    return (json?.data !== undefined ? json.data : json) as MaintenanceTicket;
  }

  async completeMaintenanceTicket(
    id: number,
    payload: CompleteMaintenancePayload,
  ): Promise<MaintenanceTicket> {
    const ticket = await request<MaintenanceTicket>(`/maintenance/tickets/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Restore local asset status
    const asset = this.assets.find((a) => a.id === ticket.assetId);
    if (asset) {
      asset.status = 'AVAILABLE';
      if (payload.meterHoursAfterService) {
        asset.engineHours = payload.meterHoursAfterService;
      }
    }
    this.notify();
    return ticket;
  }

  async fetchAssetMaintenanceHistory(assetId: number): Promise<MaintenanceTicket[]> {
    return request<MaintenanceTicket[]>(`/maintenance/assets/${assetId}/history`);
  }

  async fetchDamageComponents(
    equipmentTypeId?: number,
  ): Promise<MaintenanceDamageComponent[]> {
    const qs = equipmentTypeId ? `?equipmentTypeId=${equipmentTypeId}` : '';
    return request<MaintenanceDamageComponent[]>(`/maintenance/damage-components${qs}`);
  }

  async createDamageComponent(
    payload: Partial<MaintenanceDamageComponent>,
  ): Promise<MaintenanceDamageComponent> {
    return request<MaintenanceDamageComponent>('/maintenance/damage-components', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async uploadDamagePhoto(file: File): Promise<string> {
    const url = `${API_BASE}/maintenance/damage-photos`;
    let token = '';
    try {
      const authStored = localStorage.getItem('equipgrid_auth_user');
      if (authStored) {
        const parsed = JSON.parse(authStored);
        if (parsed?.token) token = parsed.token;
      }
    } catch {}

    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      let errMsg = `Damage photo upload failed: ${res.status} ${res.statusText}`;
      try {
        const errBody = await res.json();
        if (errBody?.message?.text) errMsg = errBody.message.text;
        else if (errBody?.message)
          errMsg =
            typeof errBody.message === 'string'
              ? errBody.message
              : JSON.stringify(errBody.message);
      } catch {}
      throw new Error(errMsg);
    }

    const json = await res.json();
    return (json?.data !== undefined ? json.data : json) as string;
  }
}

export const api = new ApiStore();

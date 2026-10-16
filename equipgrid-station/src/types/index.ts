export type AssetCategory = 'CONSTRUCTION' | 'AGRICULTURE' | 'MULTIPURPOSE_FLEET';

export interface BillingUnitMaster {
  id: number;
  code: string;
  name: string;
  hindiName: string;
  unitLabel: string;
  hindiUnitLabel: string;
  unitLabelLong?: string;
  hindiUnitLabelLong?: string;
  description?: string;
  hindiDescription?: string;
  defaultShiftTerms?: string;
  hindiDefaultShiftTerms?: string;
  displayOrder?: number;
  active: boolean;
}

export enum BillingUnitEnum {
  DAILY = 1,
  HOURLY = 2,
  PER_TRIP = 3,
  PER_HOLE = 4,
  PER_ACRE = 5,
  PER_KM = 6,
  PER_SHIFT = 7,
  PER_TON = 8,
  MONTHLY = 9,
}

export type BillingUnitCode =
  | 'DAILY'
  | 'HOURLY'
  | 'PER_TRIP'
  | 'PER_HOLE'
  | 'PER_ACRE'
  | 'PER_KM'
  | 'PER_SHIFT'
  | 'PER_TON'
  | 'MONTHLY'
  | (string & {});

export type BillingUnit = BillingUnitEnum | BillingUnitCode;

export interface BillingUnitOption {
  value: BillingUnitEnum | number;
  code: BillingUnitCode;
  label: string;
  hindiName?: string;
  unitLabel: string;
  hindiUnitLabel?: string;
  unitLabelLong: string;
  defaultShiftTerms: string;
}

export const BILLING_UNIT_OPTIONS: BillingUnitOption[] = [
  {
    value: BillingUnitEnum.DAILY,
    code: 'DAILY',
    label: 'Per Day (Daily Shift / 24-hr)',
    hindiName: 'प्रति दिन (24 घंटे की शिफ्ट)',
    unitLabel: 'day',
    hindiUnitLabel: 'दिन',
    unitLabelLong: '24-hr day',
    defaultShiftTerms: 'Full 24-hr day site deployment • Flexible field usage',
  },
  {
    value: BillingUnitEnum.HOURLY,
    code: 'HOURLY',
    label: 'Per Hour (Metered Run Time)',
    hindiName: 'प्रति घंटा (मीटर समय अनुसार)',
    unitLabel: 'hr',
    hindiUnitLabel: 'घंटा',
    unitLabelLong: 'metered hour',
    defaultShiftTerms: 'Hourly metered operation • Pay for actual run time',
  },
  {
    value: BillingUnitEnum.PER_TRIP,
    code: 'PER_TRIP',
    label: 'Per Trip (Transportation / Haulage)',
    hindiName: 'प्रति चक्कर (परिवहन / ढुलाई)',
    unitLabel: 'trip',
    hindiUnitLabel: 'ट्रिप',
    unitLabelLong: 'transport trip',
    defaultShiftTerms: 'Per transport trip • No daily shift restriction',
  },
  {
    value: BillingUnitEnum.PER_HOLE,
    code: 'PER_HOLE',
    label: 'Per Hole (Earth Auger / Drilling)',
    hindiName: 'प्रति गड्ढा (बरमा / पोल ड्रिलिंग)',
    unitLabel: 'hole',
    hindiUnitLabel: 'गड्ढा',
    unitLabelLong: 'hole drilled',
    defaultShiftTerms: 'Per hole drilled • Includes 6" & 8" bits • Zero time boundation',
  },
  {
    value: BillingUnitEnum.PER_ACRE,
    code: 'PER_ACRE',
    label: 'Per Acre (Field Operation / Harvesting)',
    hindiName: 'प्रति एकड़ (खेत जुताई / कटाई)',
    unitLabel: 'acre',
    hindiUnitLabel: 'एकड़',
    unitLabelLong: 'acre worked',
    defaultShiftTerms: 'Per acre worked • Rate based on land area covered',
  },
  {
    value: BillingUnitEnum.PER_KM,
    code: 'PER_KM',
    label: 'Per Kilometer (Distance / Towing)',
    hindiName: 'प्रति किलोमीटर (दूरी अनुसार)',
    unitLabel: 'km',
    hindiUnitLabel: 'किमी',
    unitLabelLong: 'kilometer traveled',
    defaultShiftTerms: 'Per kilometer traveled • Mileage-based logistics billing',
  },
  {
    value: BillingUnitEnum.PER_SHIFT,
    code: 'PER_SHIFT',
    label: 'Per Shift (8-Hour Working Shift)',
    hindiName: 'प्रति शिफ्ट (8 घंटे का कार्य)',
    unitLabel: 'shift',
    hindiUnitLabel: 'शिफ्ट',
    unitLabelLong: '8-hr shift',
    defaultShiftTerms: 'Standard 8-hour work shift • Operator allowance included',
  },
  {
    value: BillingUnitEnum.PER_TON,
    code: 'PER_TON',
    label: 'Per Ton (Bulk Material Haulage)',
    hindiName: 'प्रति टन (थोक सामग्री वजन)',
    unitLabel: 'ton',
    hindiUnitLabel: 'टन',
    unitLabelLong: 'metric ton',
    defaultShiftTerms: 'Per metric ton payload weighed at certified weighbridge',
  },
  {
    value: BillingUnitEnum.MONTHLY,
    code: 'MONTHLY',
    label: 'Per Month (Long-Term Site Lease)',
    hindiName: 'प्रति माह (दीर्घकालिक साइट पट्टा)',
    unitLabel: 'mo',
    hindiUnitLabel: 'माह',
    unitLabelLong: 'calendar month',
    defaultShiftTerms: 'Monthly lease contract • Dedicated on-site maintenance support',
  },
];

export const DEFAULT_BILLING_UNITS: BillingUnitMaster[] = BILLING_UNIT_OPTIONS.map((opt) => ({
  id: typeof opt.value === 'number' ? opt.value : 0,
  code: opt.code,
  name: opt.label,
  hindiName: opt.hindiName || '',
  unitLabel: opt.unitLabel,
  hindiUnitLabel: opt.hindiUnitLabel || '',
  unitLabelLong: opt.unitLabelLong,
  defaultShiftTerms: opt.defaultShiftTerms,
  active: true,
  displayOrder: typeof opt.value === 'number' ? opt.value : 0,
}));

export function resolveBillingUnitCode(val: BillingUnit | number | string | undefined | null): BillingUnitCode {
  if (!val) return 'DAILY';
  const str = String(val).trim().toUpperCase();
  if (val === BillingUnitEnum.HOURLY || str === '2' || str === 'HOURLY') return 'HOURLY';
  if (val === BillingUnitEnum.PER_TRIP || str === '3' || str === 'PER_TRIP') return 'PER_TRIP';
  if (val === BillingUnitEnum.PER_HOLE || str === '4' || str === 'PER_HOLE') return 'PER_HOLE';
  if (val === BillingUnitEnum.PER_ACRE || str === '5' || str === 'PER_ACRE') return 'PER_ACRE';
  if (val === BillingUnitEnum.PER_KM || str === '6' || str === 'PER_KM') return 'PER_KM';
  if (val === BillingUnitEnum.PER_SHIFT || str === '7' || str === 'PER_SHIFT') return 'PER_SHIFT';
  if (val === BillingUnitEnum.PER_TON || str === '8' || str === 'PER_TON') return 'PER_TON';
  if (val === BillingUnitEnum.MONTHLY || str === '9' || str === 'MONTHLY') return 'MONTHLY';
  return 'DAILY';
}

export function resolveBillingUnitInt(val: BillingUnit | number | string | undefined | null): BillingUnitEnum {
  const code = resolveBillingUnitCode(val);
  switch (code) {
    case 'HOURLY':
      return BillingUnitEnum.HOURLY;
    case 'PER_TRIP':
      return BillingUnitEnum.PER_TRIP;
    case 'PER_HOLE':
      return BillingUnitEnum.PER_HOLE;
    case 'PER_ACRE':
      return BillingUnitEnum.PER_ACRE;
    case 'PER_KM':
      return BillingUnitEnum.PER_KM;
    case 'PER_SHIFT':
      return BillingUnitEnum.PER_SHIFT;
    case 'PER_TON':
      return BillingUnitEnum.PER_TON;
    case 'MONTHLY':
      return BillingUnitEnum.MONTHLY;
    default:
      return BillingUnitEnum.DAILY;
  }
}

export function getBillingUnitLabel(val: BillingUnit | number | string | undefined | null): string {
  const code = resolveBillingUnitCode(val);
  const opt = BILLING_UNIT_OPTIONS.find((o) => o.code === code);
  return opt ? opt.unitLabel : 'day';
}

export function getBillingUnitHindiLabel(val: BillingUnit | number | string | undefined | null): string {
  const code = resolveBillingUnitCode(val);
  const opt = BILLING_UNIT_OPTIONS.find((o) => o.code === code);
  return opt?.hindiUnitLabel || 'दिन';
}

export function getBillingUnitShiftTerms(val: BillingUnit | number | string | undefined | null): string {
  const code = resolveBillingUnitCode(val);
  const opt = BILLING_UNIT_OPTIONS.find((o) => o.code === code);
  return opt ? opt.defaultShiftTerms : 'Full 24-hr day site deployment • Flexible field usage';
}

export function getBillingUnitDisplayName(val: BillingUnit | number | string | undefined | null): string {
  const code = resolveBillingUnitCode(val);
  const opt = BILLING_UNIT_OPTIONS.find((o) => o.code === code);
  return opt ? opt.label : 'Per Day (Daily Shift / 24-hr)';
}

export type AssetStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'DISPATCH_READY'
  | 'DISPATCHED'
  | 'ON_RENT'
  | 'RETURN_PENDING'
  | 'RETURNED'
  | 'INSPECTION'
  | 'DAMAGE_ASSESSMENT'
  | 'MAINTENANCE'
  | 'DAMAGED'
  | 'RETIRED';

export interface State {
  id: number;
  name: string;
  code: string;
  active: boolean;
}

export interface City {
  id: number;
  stateId: number;
  name: string;
  pinCode?: string;
  active: boolean;
}

export interface Hub {
  id: number;
  cityId: number;
  name: string;
  code: string;
  address: string;
  contactPhone?: string;
  operatingRadiusKm?: number;
  /** GPS latitude of the hub yard. */
  latitude?: number;
  /** GPS longitude of the hub yard. */
  longitude?: number;
  active: boolean;
}

export interface EquipmentType {
  id: number;
  name: string;
  code: string;
  category: AssetCategory;
  description?: string;
  hindiName?: string;
  localLanguageName?: string;
  hindiDescription?: string;
  active: boolean;
}

export interface Manufacturer {
  id: number;
  name: string;
  code: string;
  country: string;
  active: boolean;
}

export interface MachineModel {
  id: number;
  typeId: number;
  manufacturerId: number;
  name: string;
  modelNumber: string;
  specs?: string;
  active: boolean;
}

export interface RentalConfiguration {
  id: number;
  hubId: number;
  hubName?: string;
  cityId?: number;
  cityName?: string;
  assetId?: number;
  assetName?: string;
  typeId?: number;
  typeName?: string;
  baseDailyRate: number;
  depositAmount: number;
  operatorDailyRate?: number;
  freeDeliveryDistanceKm?: number;
  ratePerKmAfterFree?: number;
  active: boolean;
  notes?: string;
  billingUnit?: BillingUnit;
  billingUnitId?: number;
  billingUnitMaster?: BillingUnitMaster;
  unitLabel?: string;
  hindiUnitLabel?: string;
  workingHoursLimit?: number;
  shiftTerms?: string;
}

export interface Asset {
  id: number;
  assetTag: string; // e.g. C-MIX-001
  name: string;
  hindiName?: string;
  localLanguageName?: string;
  hindiDescription?: string;
  category: AssetCategory;
  modelName?: string;
  serialNumber: string;
  dailyRate?: number;
  depositAmount?: number;
  purchaseCost?: number;
  operatorRequired: boolean;
  status: AssetStatus;
  conditionNotes?: string;
  engineHours: number;
  accessoriesIncluded?: string;
  imageUrl?: string;
  typeId?: number;
  typeName?: string;
  manufacturerId?: number;
  manufacturerName?: string;
  modelId?: number;
  hubId?: number;
  hubName?: string;
  cityName?: string;
  stateName?: string;
  mediaItems?: AssetMedia[]; // gallery images + video
  billingUnit?: BillingUnit;
  billingUnitId?: number;
  billingUnitMaster?: BillingUnitMaster;
  unitLabel?: string;
  hindiUnitLabel?: string;
  workingHoursLimit?: number;
  shiftTerms?: string;
}

export interface AssetMedia {
  id: number;
  mediaType: 'IMAGE' | 'VIDEO';
  url: string;
  s3Key: string;
  displayOrder: number;
  fileName?: string;
  contentType?: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
}

export type CustomerTier = 'TIER_1_BASIC' | 'TIER_2_VERIFIED';

export interface Customer {
  id: number;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  aadhaarNumber?: string;
  gstNumber?: string;
  tier: CustomerTier;
  verified: boolean;
  notes?: string;
  /** Service territory used to scope customers during booking. */
  stateId?: number;
  cityId?: number;
  hubId?: number;
}

export type FarmLocationType = 'FARM' | 'HOME' | 'VILLAGE_PICKUP' | 'SITE';

/** A farmer-visible, reusable delivery place. The local name is what staff and farmers use. */
export interface FarmLocation {
  id: number;
  localName: string;
  localNameHindi?: string;
  aliases?: string;
  locationType: FarmLocationType;
  latitude?: number;
  longitude?: number;
  village?: string;
  tehsil?: string;
  district?: string;
  landmark?: string;
  accessNotes?: string;
  deliveryContactName?: string;
  deliveryContactPhone?: string;
  isDefault: boolean;
  lastUsedAt?: string;
}

export type BookingStatus =
  | 'QUOTED'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'ALLOCATED'
  | 'DISPATCH_READY'
  | 'DISPATCHED'
  | 'ON_RENT'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'INSPECTED'
  | 'CLOSED'
  | 'CANCELLED';

export type BookingSource = 'STATION' | 'PHONE_AGENT' | 'DEALER' | 'FPO' | 'KISAN_MITRA' | 'WHATSAPP';

export interface Booking {
  id: number;
  bookingNumber: string;
  customer: Customer;
  asset: Asset;
  startDate: string;
  endDate: string;
  deliveryAddress: string;
  farmLocationId?: number;
  farmLocation?: FarmLocation;
  deliveryLocationName?: string;
  deliveryLocationSnapshot?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  bookingSource?: BookingSource;
  callbackRequested?: boolean;
  distanceKm: number;
  operatorRequired: boolean;
  baseRent: number;
  deliveryFee: number;
  operatorFee: number;
  depositAmount: number;
  totalAmount: number;
  advancePaid: number;
  depositPaid: number;
  billingUnit?: BillingUnit;
  shiftTerms?: string;
  rentalConfigId?: number;
  dailyRate?: number;
  status: BookingStatus;
  dealerId?: number;
  notes?: string;
  createdAt: string;
}

export interface QuoteCalculation {
  assetId: number;
  assetName: string;
  assetTag: string;
  durationDays: number;
  dailyRate: number;
  baseRent: number;
  deliveryFee: number;
  operatorFee: number;
  depositAmount: number;
  totalAmount: number;
  requiredInitialPayment: number;
  rentalConfigId?: number;
  billingUnit?: BillingUnit;
  shiftTerms?: string;
}

export interface DispatchRecord {
  id: number;
  challanNumber: string;
  bookingId: number;
  assetTag: string;
  dispatchTimestamp: string;
  fuelLevel: string;
  engineHoursOut: number;
  accessoriesVerified: boolean;
  conditionNotes?: string;
  driverName: string;
  driverPhone?: string;
  vehicleNumber?: string;
  customerSignatureConfirmed: boolean;
}

export interface ReturnInspection {
  id: number;
  bookingId: number;
  assetTag: string;
  returnTimestamp: string;
  fuelLevelReturn: string;
  fuelDeltaCharge: number;
  engineHoursIn: number;
  accessoriesReturnedOk: boolean;
  hasDamage: boolean;
  damageCost: number;
  damageDescription?: string;
  inspectorName: string;
  nextAction: AssetStatus;
}

export type PaymentType = 'ADVANCE' | 'DEPOSIT' | 'FINAL_SETTLEMENT' | 'DAMAGE_CHARGE' | 'REFUND';
export type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER';

export interface Payment {
  id: number;
  bookingId: number;
  bookingNumber?: string;
  customerName?: string;
  amount: number;
  paymentType: PaymentType;
  paymentMode: PaymentMode;
  transactionRef?: string;
  notes?: string;
  createdAt: string;
}

export interface Dealer {
  id: number;
  name: string;
  tradeName: string;
  phone: string;
  location: string;
  stateId?: number;
  cityId?: number;
  hubId?: number;
  hubName?: string;
  address?: string;
  notes?: string;
  commissionRate: number;
  totalCommissionEarned: number;
  totalReferrals: number;
  active?: boolean;
}

export interface DealerCommission {
  id: number;
  dealerId: number;
  dealerName?: string;
  bookingId: number;
  grossRentalRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'PENDING' | 'SETTLED';
  createdAt: string;
}

export interface DailyCashReconciliation {
  date: string;
  openingCash: number;
  cashReceipts: number;
  upiReceipts: number;
  bankReceipts: number;
  totalReceipts: number;
  totalExpenses: number;
  totalRefunds: number;
  closingPosition: number;
  reconciliationStatus: string;
}

export interface DashboardSummary {
  totalAssets: number;
  availableAssets: number;
  activeRentals: number;
  pendingDispatch: number;
  todayGrossRevenue: number;
  totalRevenueCollected: number;
  pendingSecurityDeposits: number;
  fleetUtilizationPercent: number;
  zeroCreditCompliancePercent: number;
}

export type StaffRole = 'ROOT' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'TECHNICIAN' | 'DRIVER' | 'CUSTOMER';

export interface UserAccount {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: StaffRole;
  roleTitle?: string;
  phone?: string;
  hubId?: number | null;
  hubName?: string | null;
  hubCode?: string | null;
  active: boolean;
  createdAt?: string;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  username?: string;
  password: string;
  phone?: string;
  role: StaffRole;
  hubId?: number | null;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: StaffRole;
  hubId?: number | null;
  active?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Farmer-First Simplification & Operational Flow Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UpsertFarmLocationPayload {
  localName: string;
  localNameHindi?: string;
  aliases?: string;
  locationType?: FarmLocationType;
  latitude?: number;
  longitude?: number;
  village?: string;
  tehsil?: string;
  district?: string;
  landmark?: string;
  accessNotes?: string;
  deliveryContactName?: string;
  deliveryContactPhone?: string;
  isDefault?: boolean;
}

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface PaymentProof {
  id: number;
  booking: Booking;
  submittedReference: string;
  status: VerificationStatus;
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
}

export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface RefundTransaction {
  id: number;
  booking: Booking;
  amount: number;
  status: RefundStatus;
  paymentReference?: string;
  reason?: string;
  initiatedAt: string;
  completedAt?: string;
}

export type FulfillmentJobStatus =
  'REQUESTED' | 'SCHEDULED' | 'OUT_FOR_DELIVERY' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export type JobStatus = FulfillmentJobStatus;

export interface DeliveryJob {
  id: number;
  booking: Booking;
  status: FulfillmentJobStatus;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  scheduledFor?: string;
  etaStart?: string;
  etaEnd?: string;
  deliveredAt?: string;
  receiverName?: string;
  receiverPhone?: string;
  deliveryNotes?: string;
}

export interface ReturnPickupJob {
  id: number;
  booking: Booking;
  status: FulfillmentJobStatus;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  scheduledFor?: string;
  collectedAt?: string;
  pickupNotes?: string;
}

export interface UpdateFulfillmentJobPayload {
  status?: FulfillmentJobStatus;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  scheduledFor?: string;
  etaStart?: string;
  etaEnd?: string;
  receiverName?: string;
  receiverPhone?: string;
  notes?: string;
}

export interface EquipmentRecommendationRequest {
  task: string;
  hubId?: number;
  startDate?: string;
  endDate?: string;
  acreage?: number;
}

export interface EquipmentRecommendationResponse {
  assetId: number;
  assetName: string;
  assetTag: string;
  reason: string;
  dailyRate?: number;
  depositAmount?: number;
}

export interface FarmerFriendlyStatusInfo {
  internalStatus: string;
  farmerLabelEn: string;
  farmerLabelHi: string;
  step: 0 | 1 | 2 | 3 | 4 | 5;
  badgeColor: string;
  badgeDarkColor: string;
  descriptionEn: string;
  descriptionHi: string;
}

export function getFarmerFriendlyStatus(status: BookingStatus | string): FarmerFriendlyStatusInfo {
  switch (status) {
    case 'QUOTED':
    case 'PENDING_PAYMENT':
      return {
        internalStatus: status,
        farmerLabelEn: 'Request Received',
        farmerLabelHi: 'अनुरोध प्राप्त हुआ',
        step: 1,
        badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
        badgeDarkColor: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
        descriptionEn: 'Booking request created; quotation ready.',
        descriptionHi: 'मशीन मांग दर्ज हुई है, कोटेशन तैयार है।',
      };
    case 'CONFIRMED':
    case 'ALLOCATED':
    case 'DISPATCH_READY':
      return {
        internalStatus: status,
        farmerLabelEn: 'Booking Confirmed',
        farmerLabelHi: 'बुकिंग कन्फर्म',
        step: 2,
        badgeColor: 'bg-sky-50 text-sky-900 border-sky-300',
        badgeDarkColor: 'bg-sky-950/40 text-sky-300 border-sky-800/50',
        descriptionEn: 'Machine reserved and ready at station yard.',
        descriptionHi: 'मशीन सुरक्षित है, यार्ड से निकलने के लिए तैयार।',
      };
    case 'OUT_FOR_DELIVERY':
    case 'DISPATCHED':
      return {
        internalStatus: status,
        farmerLabelEn: 'Machine On The Way',
        farmerLabelHi: 'मशीन रास्ते में है',
        step: 3,
        badgeColor: 'bg-indigo-50 text-indigo-900 border-indigo-300',
        badgeDarkColor: 'bg-indigo-950/40 text-indigo-300 border-indigo-800/50',
        descriptionEn: 'Driver assigned and machine dispatched to farm.',
        descriptionHi: 'ड्राइवर मशीन लेकर खेत की ओर निकल चुका है।',
      };
    case 'ON_RENT':
    case 'DELIVERED':
      return {
        internalStatus: status,
        farmerLabelEn: 'Delivered & Working',
        farmerLabelHi: 'खेत पर कार्यरत',
        step: 4,
        badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-300',
        badgeDarkColor: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50',
        descriptionEn: 'Delivered at farm; active on-rent.',
        descriptionHi: 'खेत पर मशीन पहुंच चुकी है, काम जारी है।',
      };
    case 'RETURN_REQUESTED':
      return {
        internalStatus: status,
        farmerLabelEn: 'Return Pickup Booked',
        farmerLabelHi: 'वापसी अनुरोध दर्ज',
        step: 5,
        badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
        badgeDarkColor: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
        descriptionEn: 'Farmer requested return; pickup vehicle scheduled.',
        descriptionHi: 'वापसी की सूचना प्राप्त, गाड़ी पिकअप के लिए भेजी जा रही है।',
      };
    case 'RETURNED':
    case 'INSPECTED':
    case 'CLOSED':
      return {
        internalStatus: status,
        farmerLabelEn: 'Returned & Settled',
        farmerLabelHi: 'वापसी पूर्ण व सेटल',
        step: 5,
        badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
        badgeDarkColor: 'bg-slate-900/60 text-slate-300 border-slate-700',
        descriptionEn: 'Machine inspected and security deposit settled/refunded.',
        descriptionHi: 'मशीन यार्ड में वापस आई, सुरक्षा राशि का निपटारा हुआ।',
      };
    case 'AVAILABLE':
      return {
        internalStatus: status,
        farmerLabelEn: 'Ready to Rent',
        farmerLabelHi: 'किराए के लिए तैयार',
        step: 0,
        badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-300',
        badgeDarkColor: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50',
        descriptionEn: 'Cleaned, inspected, and ready for customer pickup.',
        descriptionHi: 'साफ, जांची हुई और तुरंत किराए पर देने के लिए तैयार।',
      };
    case 'RESERVED':
      return {
        internalStatus: status,
        farmerLabelEn: 'Booked',
        farmerLabelHi: 'आरक्षित',
        step: 1,
        badgeColor: 'bg-sky-50 text-sky-900 border-sky-300',
        badgeDarkColor: 'bg-sky-950/40 text-sky-300 border-sky-800/50',
        descriptionEn: 'Reserved for an upcoming booking.',
        descriptionHi: 'किसान के लिए सुरक्षित रखी गई है।',
      };
    case 'MAINTENANCE':
      return {
        internalStatus: status,
        farmerLabelEn: 'In Repair Shed',
        farmerLabelHi: 'सर्विस शेड में',
        step: 0,
        badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
        badgeDarkColor: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
        descriptionEn: 'Undergoing routine oil change, sharpening or service.',
        descriptionHi: 'नियमित सर्विस, तेल बदलाव या जांच में है।',
      };
    case 'INSPECTION':
      return {
        internalStatus: status,
        farmerLabelEn: 'Condition Check',
        farmerLabelHi: 'जांच जारी',
        step: 0,
        badgeColor: 'bg-sky-50 text-sky-900 border-sky-300',
        badgeDarkColor: 'bg-sky-950/40 text-sky-300 border-sky-800/50',
        descriptionEn: 'Technical inspection underway.',
        descriptionHi: 'तकनीकी जांच की जा रही है।',
      };
    case 'DAMAGED':
    case 'DAMAGE_ASSESSMENT':
      return {
        internalStatus: status,
        farmerLabelEn: 'Needs Repair',
        farmerLabelHi: 'मरम्मत चाहिए',
        step: 0,
        badgeColor: 'bg-rose-50 text-rose-900 border-rose-300',
        badgeDarkColor: 'bg-rose-950/40 text-rose-300 border-rose-800/50',
        descriptionEn: 'Broken part or damaged during field operation.',
        descriptionHi: 'खराबी या टूट-फूट, मिस्त्री द्वारा ठीक होना बाकी।',
      };
    default:
      return {
        internalStatus: status,
        farmerLabelEn: status.replace(/_/g, ' '),
        farmerLabelHi: status.replace(/_/g, ' '),
        step: 1,
        badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
        badgeDarkColor: 'bg-slate-900/60 text-slate-300 border-slate-700',
        descriptionEn: 'Active booking workflow',
        descriptionHi: 'बुकिंग कार्यप्रणाली सक्रिय',
      };
  }
}

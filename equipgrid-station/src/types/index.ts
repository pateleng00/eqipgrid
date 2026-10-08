export type AssetCategory = 'CONSTRUCTION' | 'AGRICULTURE' | 'MULTIPURPOSE_FLEET';

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
  operatingRadiusKm: number;
  /** GPS latitude of the hub yard — mandatory for distance calculations. */
  latitude: number;
  /** GPS longitude of the hub yard — mandatory for distance calculations. */
  longitude: number;
  active: boolean;
}

export interface EquipmentType {
  id: number;
  name: string;
  code: string;
  category: AssetCategory;
  description?: string;
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
  operatorDailyRate: number;
  freeDeliveryDistanceKm: number; // 5.0 km
  ratePerKmAfterFree: number; // 10.00 Rs/km
  active: boolean;
  notes?: string;
}

export interface Asset {
  id: number;
  assetTag: string; // e.g. C-MIX-001
  name: string;
  category: AssetCategory;
  modelName: string;
  serialNumber: string;
  dailyRate: number;
  depositAmount: number;
  purchaseCost?: number;
  operatorRequired: boolean;
  status: AssetStatus;
  conditionNotes?: string;
  engineHours: number;
  accessoriesIncluded?: string;
  imageUrl: string;
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

export interface Booking {
  id: number;
  bookingNumber: string;
  customer: Customer;
  asset: Asset;
  startDate: string;
  endDate: string;
  deliveryAddress: string;
  distanceKm: number;
  operatorRequired: boolean;
  baseRent: number;
  deliveryFee: number;
  operatorFee: number;
  depositAmount: number;
  totalAmount: number;
  advancePaid: number;
  depositPaid: number;
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

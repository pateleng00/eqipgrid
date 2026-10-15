# EquipGrid Database Enum Specification & Architecture Reference (`DB_CHANGES.md`)

> **Architectural Policy**:
> Enums are strictly stored as **NUMERIC (`smallint` / `integer`)** values in the PostgreSQL database. No string/VARCHAR values are used for enum columns in the database.
> The JPA layer utilizes explicit `@Converter(autoApply = true) implements AttributeConverter<..., Short>` converters to enforce deterministic, 1-based numeric codes, preventing ordinal drift when enums are reordered or extended.

---

## 1. Summary Audit Table

| Database Table | Column Name | Database Type | Java Enum Class | Valid Numeric Range | Description / Notes |
|---|---|---|---|---|---|
| `assets` | `category` | `smallint NOT NULL` | `AssetCategory` | `1..3` | Equipment industry classification |
| `assets` | `status` | `smallint NOT NULL DEFAULT 1` | `AssetStatus` | `1..12` | Machinery lifecycle state |
| `assets` | `billing_unit` | `smallint NOT NULL DEFAULT 1` | `BillingUnit` | `1..9` | Metric tariff code |
| `bookings` | `status` | `smallint NOT NULL DEFAULT 1` | `BookingStatus` | `1..12` | Reservation lifecycle state |
| `bookings` | `booking_source` | `smallint NOT NULL DEFAULT 1` | `BookingSource` | `1..6` | Origination channel |
| `users` | `role` | `smallint NOT NULL` | `Role` | `1..8` | Platform RBAC role |
| `customers` | `tier` | `smallint NOT NULL DEFAULT 1` | `CustomerTier` | `1..2` | Farmer verification level |
| `dealer_commissions` | `status` | `smallint NOT NULL DEFAULT 1` | `CommissionStatus` | `1..2` | Dealer referral payout status |
| `delivery_jobs` | `status` | `smallint NOT NULL DEFAULT 2` | `JobStatus` | `1..5` | Yard delivery dispatch state |
| `equipment_types` | `category` | `smallint NOT NULL DEFAULT 1` | `AssetCategory` | `1..3` | Equipment category taxonomy |
| `farm_locations` | `location_type` | `smallint NOT NULL DEFAULT 1` | `FarmLocationType` | `1..4` | Reusable delivery landmark type |
| `payment_proofs` | `status` | `smallint NOT NULL DEFAULT 1` | `VerificationStatus` | `1..3` | Offline payment approval state |
| `payments` | `payment_mode` | `smallint NOT NULL` | `PaymentMode` | `1..3` | Cash/UPI/Bank transfer |
| `payments` | `payment_type` | `smallint NOT NULL` | `PaymentType` | `1..5` | Advance/Deposit/Settlement |
| `refund_transactions` | `status` | `smallint NOT NULL DEFAULT 1` | `RefundStatus` | `1..4` | Security deposit refund state |
| `rental_configurations`| `billing_unit` | `smallint NOT NULL DEFAULT 1` | `BillingUnit` | `1..9` | Slab billing metric |
| `return_inspections` | `next_action` | `smallint NOT NULL DEFAULT 1` | `AssetStatus` | `1, 10..12` | Yard return disposition |
| `return_pickup_jobs` | `status` | `smallint NOT NULL DEFAULT 1` | `JobStatus` | `1..5` | Field retrieval state |
| `whatsapp_conversations`| `state` | `smallint NOT NULL DEFAULT 1` | `WhatsAppState` | `1..14` | Rural chatbot conversation step |

---

## 2. Exact Numeric Mapping Catalog

### 2.1 `AssetCategory` (`assets.category`, `equipment_types.category`)
- `1` -> `CONSTRUCTION` (Construction & Civil Infrastructure)
- `2` -> `AGRICULTURE` (Agricultural & Farming Machinery)
- `3` -> `MULTIPURPOSE_FLEET` (Multipurpose Utility & Haulage)

### 2.2 `AssetStatus` (`assets.status`, `return_inspections.next_action`)
- `1` -> `AVAILABLE` (Ready at hub yard)
- `2` -> `RESERVED` (Locked for customer booking)
- `3` -> `DISPATCH_READY` (Prepped & pre-dispatch inspection clear)
- `4` -> `DISPATCHED` (In transit on flatbed/driver)
- `5` -> `ON_RENT` (Operating on farm/site)
- `6` -> `RETURN_PENDING` (Lease elapsed, waiting for pickup)
- `7` -> `RETURNED` (Arrived at yard)
- `8` -> `INSPECTION` (Under check-in damage inspection)
- `9` -> `DAMAGE_ASSESSMENT` (Claim assessment in progress)
- `10` -> `MAINTENANCE` (Periodic maintenance / servicing)
- `11` -> `DAMAGED` (Out of service awaiting repair)
- `12` -> `RETIRED` (Scrapped / decommissioned)

### 2.3 `BillingUnit` (`assets.billing_unit`, `rental_configurations.billing_unit`)
- `1` -> `DAILY` (Per Day / 24-hr Shift)
- `2` -> `HOURLY` (Per Hour / Metered Run Time)
- `3` -> `PER_TRIP` (Per Transport Trip / Haulage)
- `4` -> `PER_HOLE` (Per Hole / Earth Auger Drilling)
- `5` -> `PER_ACRE` (Per Acre / Field Area Worked)
- `6` -> `PER_KM` (Per Kilometer / Haulage Transit)
- `7` -> `PER_SHIFT` (Per Shift / Standard 8-hr Shift)
- `8` -> `PER_TON` (Per Ton / Payload Handled)
- `9` -> `MONTHLY` (Per Month / Long-Term Lease)

### 2.4 `BookingStatus` (`bookings.status`)
- `1` -> `QUOTED` (Quotation Generated)
- `2` -> `PENDING_PAYMENT` (Pending Advance Payment)
- `3` -> `CONFIRMED` (Booking Confirmed)
- `4` -> `ALLOCATED` (Machinery Allocated)
- `5` -> `DISPATCH_READY` (Ready for Dispatch)
- `6` -> `DISPATCHED` (Dispatched from Yard)
- `7` -> `ON_RENT` (Working on Field)
- `8` -> `RETURN_REQUESTED` (Return Pickup Requested)
- `9` -> `RETURNED` (Returned to Yard)
- `10` -> `INSPECTED` (Return Inspection Completed)
- `11` -> `CLOSED` (Account Settled)
- `12` -> `CANCELLED` (Cancelled)

### 2.5 `BookingSource` (`bookings.booking_source`)
- `1` -> `STATION` (Station Yard Counter)
- `2` -> `PHONE_AGENT` (Inbound Call Desk)
- `3` -> `DEALER` (Partner Dealer Referral)
- `4` -> `FPO` (Farmer Producer Organization)
- `5` -> `KISAN_MITRA` (Rural Field Agent)
- `6` -> `WHATSAPP` (WhatsApp Chatbot Booking)

### 2.6 `Role` (`users.role`)
- `1` -> `CUSTOMER` (Farmer / Contractor)
- `2` -> `OPERATOR` (Equipment Operator)
- `3` -> `TECHNICIAN` (Yard Mechanic)
- `4` -> `DRIVER` (Logistics Delivery Driver)
- `5` -> `DEALER` (Commercial Partner)
- `6` -> `MANAGER` (Yard Hub Manager)
- `7` -> `ADMIN` (Station Administrator)
- `8` -> `ROOT` (System Superuser)

### 2.7 `CustomerTier` (`customers.tier`)
- `1` -> `TIER_1_BASIC` (Phone Verified, Standard Deposit)
- `2` -> `TIER_2_VERIFIED` (Aadhaar/KYC Verified, Zero Deposit Eligible)

### 2.8 `JobStatus` (`delivery_jobs.status`, `return_pickup_jobs.status`)
- `1` -> `REQUESTED`
- `2` -> `SCHEDULED`
- `3` -> `OUT_FOR_DELIVERY`
- `4` -> `COMPLETED`
- `5` -> `CANCELLED`

### 2.9 `FarmLocationType` (`farm_locations.location_type`)
- `1` -> `FARM` (Agricultural Field / Khet)
- `2` -> `HOME` (Farmer Residence / Niwas)
- `3` -> `VILLAGE_PICKUP` (Gram Sthal / Landmark)
- `4` -> `SITE` (Commercial Site)

### 2.10 `PaymentMode` & `PaymentType` (`payments`)
- **`payment_mode`**: `1` -> `CASH`, `2` -> `UPI`, `3` -> `BANK_TRANSFER`
- **`payment_type`**: `1` -> `ADVANCE`, `2` -> `DEPOSIT`, `3` -> `FINAL_SETTLEMENT`, `4` -> `DAMAGE_CHARGE`, `5` -> `REFUND`

---

## 3. Database Data Integrity & Verification SQL

The following queries must be executed to verify database integrity.

### 3.1 Check for NULLs in Required Enum Columns
```sql
SELECT 'assets.category' AS col, COUNT(*) FROM assets WHERE category IS NULL
UNION ALL
SELECT 'assets.status', COUNT(*) FROM assets WHERE status IS NULL
UNION ALL
SELECT 'assets.billing_unit', COUNT(*) FROM assets WHERE billing_unit IS NULL
UNION ALL
SELECT 'bookings.status', COUNT(*) FROM bookings WHERE status IS NULL
UNION ALL
SELECT 'bookings.booking_source', COUNT(*) FROM bookings WHERE booking_source IS NULL
UNION ALL
SELECT 'users.role', COUNT(*) FROM users WHERE role IS NULL
UNION ALL
SELECT 'customers.tier', COUNT(*) FROM customers WHERE tier IS NULL;
-- Expected Result: 0 for all rows
```

### 3.2 Check for Out-of-Range Numeric Values
```sql
-- Out-of-range checks
SELECT id, asset_tag, category FROM assets WHERE category NOT BETWEEN 1 AND 3;
SELECT id, asset_tag, status FROM assets WHERE status NOT BETWEEN 1 AND 12;
SELECT id, asset_tag, billing_unit FROM assets WHERE billing_unit NOT BETWEEN 1 AND 9;
SELECT id, booking_number, status FROM bookings WHERE status NOT BETWEEN 1 AND 12;
SELECT id, booking_number, booking_source FROM bookings WHERE booking_source NOT BETWEEN 1 AND 6;
SELECT id, username, role FROM users WHERE role NOT BETWEEN 1 AND 8;
-- Expected Result: 0 rows returned
```

### 3.3 Breakdown Counts by Enum Value
```sql
SELECT status, COUNT(*) AS asset_count FROM assets GROUP BY status ORDER BY status;
SELECT status, COUNT(*) AS booking_count FROM bookings GROUP BY status ORDER BY status;
SELECT role, COUNT(*) AS user_count FROM users GROUP BY role ORDER BY role;
```

---

## 4. Optional Data Integrity CHECK Constraints

To enforce data integrity at the database engine level (preventing accidental insertion of invalid numbers):

```sql
ALTER TABLE assets ADD CONSTRAINT chk_assets_category CHECK (category BETWEEN 1 AND 3);
ALTER TABLE assets ADD CONSTRAINT chk_assets_status CHECK (status BETWEEN 1 AND 12);
ALTER TABLE assets ADD CONSTRAINT chk_assets_billing_unit CHECK (billing_unit BETWEEN 1 AND 9);
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_status CHECK (status BETWEEN 1 AND 12);
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_booking_source CHECK (booking_source BETWEEN 1 AND 6);
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role BETWEEN 1 AND 8);
ALTER TABLE customers ADD CONSTRAINT chk_customers_tier CHECK (tier BETWEEN 1 AND 2);
```

### Rollback SQL for Constraints:
```sql
ALTER TABLE assets DROP CONSTRAINT IF EXISTS chk_assets_category;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS chk_assets_status;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS chk_assets_billing_unit;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_bookings_status;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_bookings_booking_source;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS chk_customers_tier;
```

---

## 5. Deployment & Rollout Checklist

1. [ ] **Pre-Deployment Backup**:
   ```bash
   pg_dump -U postgres -d equipgrid_dev -Fc -f equipgrid_dev_backup_$(date +%Y%m%d).dump
   ```
2. [ ] **Pre-Deployment Verification**: Run Section 3.1 & 3.2 queries to ensure existing records are strictly within bounds.
3. [ ] **Application Deployment**: Deploy Spring Boot backend (`equipgrid-power`) with Spotless formatted entities and `equipgrid-station` frontend.
4. [ ] **Post-Deployment Verification**:
   - Create test booking from Station Desk (`POST /equipgrid/bookings`).
   - Verify `status = 1` or `status = 3` is stored as `smallint` in PostgreSQL.
   - Verify all dropdown selectors in `BookingDeskView`, `EquipmentCatalogView`, and `RentalConfigView` render without NaN/undefined.

---

## 6. Code Files Associated with this Enum Architecture

### Backend (`equipgrid-power`):
- `com.equipgrid.asset.enums.AssetCategory`
- `com.equipgrid.asset.enums.AssetStatus`
- `com.equipgrid.asset.enums.BillingUnit`
- `com.equipgrid.booking.enums.BookingStatus`
- `com.equipgrid.booking.enums.BookingSource`
- `com.equipgrid.auth.enums.Role`
- `com.equipgrid.customer.enums.CustomerTier`
- `com.equipgrid.dealer.enums.CommissionStatus`
- `com.equipgrid.fulfillment.enums.JobStatus`
- `com.equipgrid.farmlocation.enums.FarmLocationType`
- `com.equipgrid.payment.enums.PaymentMode`
- `com.equipgrid.payment.enums.PaymentType`
- `com.equipgrid.payment.enums.VerificationStatus`
- `com.equipgrid.payment.enums.RefundStatus`
- `com.equipgrid.whatsapp.enums.WhatsAppState`

### Frontend (`equipgrid-station`):
- `src/types/index.ts`
- `src/features/booking/BookingDeskView.tsx`
- `src/features/equipment/EquipmentCatalogView.tsx`
- `src/features/rentalconfig/RentalConfigView.tsx`
- `src/features/dispatch/DispatchYardView.tsx`
- `src/features/payment/PaymentLedgerView.tsx`

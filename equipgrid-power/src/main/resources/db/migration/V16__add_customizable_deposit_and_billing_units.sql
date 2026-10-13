-- EquipGrid V16: Customizable Security Deposit & Variable Billing Units (Hourly, Daily, Per-Trip, Per-Hole, Per-Acre)
-- BillingUnit Enum values: 1=DAILY, 2=HOURLY, 3=PER_TRIP, 4=PER_HOLE, 5=PER_ACRE

ALTER TABLE assets 
    ADD COLUMN IF NOT EXISTS name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS billing_unit SMALLINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS working_hours_limit NUMERIC(6, 2),
    ADD COLUMN IF NOT EXISTS shift_terms VARCHAR(256);

ALTER TABLE rental_configurations
    ADD COLUMN IF NOT EXISTS billing_unit SMALLINT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS working_hours_limit NUMERIC(6, 2),
    ADD COLUMN IF NOT EXISTS shift_terms VARCHAR(256);

-- 1. Configure Earth Auger as PER_HOLE wise (4 = PER_HOLE, ₹25/hole, customizable ₹200 deposit, zero time boundation)
UPDATE assets 
SET billing_unit = 4,
    daily_rate = 25.00,
    deposit_amount = 200.00,
    shift_terms = 'Per hole drilled • Includes 6" & 8" bits • No shift boundation'
WHERE asset_tag LIKE 'A-AUG%' OR name ILIKE '%Auger%';

-- 2. Configure Dewatering Pump as HOURLY (2 = HOURLY, ₹150/hr, customizable ₹500 deposit)
UPDATE assets 
SET billing_unit = 2,
    daily_rate = 150.00,
    deposit_amount = 500.00,
    shift_terms = 'Hourly metered pumping • Pay for actual run time'
WHERE asset_tag LIKE 'C-PMP%' OR name ILIKE '%Trash Pump%' OR name ILIKE '%Dewatering%';

-- 3. Configure Concrete Needle Vibrator as Zero Deposit (1 = DAILY, ₹0 deposit, continuous daily deployment)
UPDATE assets 
SET billing_unit = 1,
    deposit_amount = 0.00,
    shift_terms = 'Full 24-hr day site rental • Zero security deposit required'
WHERE asset_tag LIKE 'C-VIB%' OR name ILIKE '%Vibrator%';

-- 4. Update default shift terms for remaining fleet
UPDATE assets
SET shift_terms = 'Full 24-hr day site deployment • Flexible field usage'
WHERE shift_terms IS NULL AND billing_unit = 1;

-- Also sync rental_configurations table defaults
UPDATE rental_configurations rc
SET billing_unit = a.billing_unit,
    deposit_amount = a.deposit_amount,
    base_daily_rate = a.daily_rate,
    shift_terms = a.shift_terms
FROM assets a
WHERE rc.asset_id = a.id;

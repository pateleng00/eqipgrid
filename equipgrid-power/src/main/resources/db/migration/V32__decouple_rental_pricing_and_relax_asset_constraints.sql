-- EquipGrid V32: Decouple rental pricing from assets table
-- Daily rental rates and security deposit amounts must come dynamically from rental_configurations table.
-- Also relax not-null constraints on category to prevent creation failures when derived from model/type.

ALTER TABLE assets ALTER COLUMN daily_rate DROP NOT NULL;
ALTER TABLE assets ALTER COLUMN deposit_amount DROP NOT NULL;

-- Clear hardcoded dummy rates and deposit amounts from assets so rates strictly resolve from rental_configurations
UPDATE assets SET daily_rate = NULL, deposit_amount = NULL;

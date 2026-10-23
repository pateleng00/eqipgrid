-- EquipGrid V30: Add created_by and updated_by audit columns to billing_units table
-- Matches the BaseEntity mapped superclass audit fields in BillingUnitMaster

ALTER TABLE billing_units
    ADD COLUMN IF NOT EXISTS created_by BIGINT DEFAULT 1;
ALTER TABLE billing_units
    ADD COLUMN IF NOT EXISTS updated_by BIGINT DEFAULT 1;

UPDATE billing_units
SET created_by = 1
WHERE created_by IS NULL;
UPDATE billing_units
SET updated_by = 1
WHERE updated_by IS NULL;

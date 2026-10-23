-- V22: Add created_by and updated_by columns to farm_locations table to match BaseEntity
ALTER TABLE farm_locations
    ADD COLUMN IF NOT EXISTS created_by BIGINT DEFAULT 1;
ALTER TABLE farm_locations
    ADD COLUMN IF NOT EXISTS updated_by BIGINT DEFAULT 1;

UPDATE farm_locations
SET created_by = 1
WHERE created_by IS NULL;
UPDATE farm_locations
SET updated_by = 1
WHERE updated_by IS NULL;

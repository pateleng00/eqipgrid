-- V9: Add created_by and updated_by (user ID) audit columns across all entity tables
-- Converts asset_media audit columns from VARCHAR 'ADMIN' to BIGINT user ID 1
-- Adds created_by and updated_by BIGINT to all tables extending BaseEntity

-- 1. Convert asset_media created_by and updated_by to BIGINT user ID safely
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'asset_media' AND column_name = 'created_by' AND data_type LIKE '%char%'
    ) THEN
        UPDATE asset_media 
        SET created_by = '1' 
        WHERE created_by IS NULL OR created_by = 'ADMIN' OR created_by !~ '^[0-9]+$';

        UPDATE asset_media 
        SET updated_by = '1' 
        WHERE updated_by IS NULL OR updated_by = 'ADMIN' OR updated_by !~ '^[0-9]+$';

        ALTER TABLE asset_media 
            ALTER COLUMN created_by TYPE BIGINT USING (created_by::bigint),
            ALTER COLUMN created_by SET DEFAULT 1;

        ALTER TABLE asset_media 
            ALTER COLUMN updated_by TYPE BIGINT USING (updated_by::bigint),
            ALTER COLUMN updated_by SET DEFAULT 1;
    ELSE
        UPDATE asset_media SET created_by = 1 WHERE created_by IS NULL;
        UPDATE asset_media SET updated_by = 1 WHERE updated_by IS NULL;
        ALTER TABLE asset_media ALTER COLUMN created_by SET DEFAULT 1;
        ALTER TABLE asset_media ALTER COLUMN updated_by SET DEFAULT 1;
    END IF;
END $$;

-- 2. Add created_by and updated_by to all other BaseEntity-backed tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'users', 
            'states', 
            'cities', 
            'hubs', 
            'equipment_types',
            'manufacturers', 
            'machine_models', 
            'assets', 
            'customers',
            'dealers', 
            'rental_configurations', 
            'bookings', 
            'whatsapp_conversations'
        ])
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_by BIGINT DEFAULT 1;', t);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_by BIGINT DEFAULT 1;', t);
        EXECUTE format('UPDATE %I SET created_by = 1 WHERE created_by IS NULL;', t);
        EXECUTE format('UPDATE %I SET updated_by = 1 WHERE updated_by IS NULL;', t);
    END LOOP;
END $$;

-- 3. Add created_by and updated_by to other operational transaction tables for consistency
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'payments', 
            'dispatch_records', 
            'return_inspections', 
            'dealer_commissions'
        ])
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_by BIGINT DEFAULT 1;', t);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_by BIGINT DEFAULT 1;', t);
        EXECUTE format('UPDATE %I SET created_by = 1 WHERE created_by IS NULL;', t);
        EXECUTE format('UPDATE %I SET updated_by = 1 WHERE updated_by IS NULL;', t);
    END LOOP;
END $$;

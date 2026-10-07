-- V13: Add missing updated_at column to location and machine master tables extending BaseEntity
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'states', 
            'cities', 
            'hubs', 
            'equipment_types',
            'manufacturers', 
            'machine_models'
        ])
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;', t);
        EXECUTE format('UPDATE %I SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;', t);
    END LOOP;
END $$;

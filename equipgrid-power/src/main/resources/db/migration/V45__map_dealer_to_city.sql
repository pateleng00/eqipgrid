-- EquipGrid V45: Map Dealers to City (Dealers operate in a City territory, not a Hub)
ALTER TABLE dealers
    ADD COLUMN IF NOT EXISTS city_id BIGINT REFERENCES cities(id);

-- Backfill existing dealers to their city based on location match
UPDATE dealers d
SET city_id = c.id FROM cities c
WHERE d.city_id IS NULL
  AND (d.location ILIKE '%' || c.name || '%'
   OR c.name ILIKE '%' || d.location || '%');

-- For any remaining dealers without city_id, default to first available city (Hardoi)
UPDATE dealers
SET city_id = (SELECT id FROM cities ORDER BY id ASC LIMIT 1)
WHERE city_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_dealers_city_id ON dealers(city_id);

-- Ensure BaseEntity audit columns exist on dealer_leads and support_tickets
ALTER TABLE dealer_leads
    ADD COLUMN IF NOT EXISTS created_by BIGINT DEFAULT 1;
ALTER TABLE dealer_leads
    ADD COLUMN IF NOT EXISTS updated_by BIGINT DEFAULT 1;

ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS created_by BIGINT DEFAULT 1;
ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS updated_by BIGINT DEFAULT 1;

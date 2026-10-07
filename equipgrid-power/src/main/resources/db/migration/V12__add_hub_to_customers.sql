-- V12: Add Hub Yard mapping to Customers table
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS hub_id BIGINT REFERENCES hubs(id);

-- Backfill existing customers to regional hubs based on addresses
UPDATE customers
SET hub_id = (SELECT id FROM hubs WHERE code = 'HUB-HRD-01' LIMIT 1)
WHERE id = 1 OR address ILIKE '%Hardoi%' OR full_name ILIKE '%Ramesh%';

UPDATE customers
SET hub_id = (SELECT id FROM hubs WHERE code = 'HUB-BLG-03' LIMIT 1)
WHERE id IN (2, 4) OR address ILIKE '%Bilgram%' OR full_name ILIKE '%Shyam%' OR full_name ILIKE '%Virendra%';

UPDATE customers
SET hub_id = (SELECT id FROM hubs WHERE code = 'HUB-SDL-02' LIMIT 1)
WHERE id = 3 OR address ILIKE '%Sandila%' OR full_name ILIKE '%Awadh%';

-- Default any remaining unassigned customers to primary hub
UPDATE customers
SET hub_id = (SELECT id FROM hubs ORDER BY id ASC LIMIT 1)
WHERE hub_id IS NULL;

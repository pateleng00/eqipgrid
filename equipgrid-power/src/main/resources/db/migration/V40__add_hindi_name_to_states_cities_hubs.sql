-- EquipGrid V40: Add hindi_name column to states, cities, and hubs tables

-- 1. Add hindi_name column to states
ALTER TABLE states
    ADD COLUMN IF NOT EXISTS hindi_name VARCHAR (128);

-- 2. Add hindi_name column to cities
ALTER TABLE cities
    ADD COLUMN IF NOT EXISTS hindi_name VARCHAR (128);

-- 3. Add hindi_name column to hubs
ALTER TABLE hubs
    ADD COLUMN IF NOT EXISTS hindi_name VARCHAR (128);

-- 4. Seed Hindi Devanagari names for states
UPDATE states
SET hindi_name = 'उत्तर प्रदेश'
WHERE code = 'UP'
   OR name = 'Uttar Pradesh';
UPDATE states
SET hindi_name = 'बिहार'
WHERE code = 'BR'
   OR name = 'Bihar';
UPDATE states
SET hindi_name = 'मध्य प्रदेश'
WHERE code = 'MP'
   OR name = 'Madhya Pradesh';

-- 5. Seed Hindi Devanagari names for cities
UPDATE cities
SET hindi_name = 'हरदोई'
WHERE name = 'Hardoi';
UPDATE cities
SET hindi_name = 'लखनऊ'
WHERE name = 'Lucknow';
UPDATE cities
SET hindi_name = 'कानपुर'
WHERE name = 'Kanpur';
UPDATE cities
SET hindi_name = 'सीतापुर'
WHERE name = 'Sitapur';
UPDATE cities
SET hindi_name = 'शाहजहाँपुर'
WHERE name = 'Shahjahanpur';

-- 6. Seed Hindi Devanagari names for hubs
UPDATE hubs
SET hindi_name = 'हरदोई सेंट्रल यार्ड'
WHERE code = 'HUB-HRD-01';
UPDATE hubs
SET hindi_name = 'संडीला इंडस्ट्रियल हब'
WHERE code = 'HUB-SDL-02';
UPDATE hubs
SET hindi_name = 'बिलग्राम कृषि यार्ड'
WHERE code = 'HUB-BLG-03';

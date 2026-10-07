-- V10: Add mandatory latitude and longitude columns to hubs table
-- Both columns are NOT NULL with temporarily a DEFAULT to allow seed data update
-- then the DEFAULT will be dropped to enforce strict NOT NULL on all new inserts

ALTER TABLE hubs
    ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10, 7) NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7) NOT NULL DEFAULT 0.0;

-- Update existing seeded yards with actual GPS coordinates
-- Hardoi Central Yard, Hardoi, UP
UPDATE hubs SET latitude = 27.3967, longitude = 80.1266 WHERE code = 'HUB-HRD-01';

-- Sandila Industrial Hub, Sandila (Hardoi district), UP
UPDATE hubs SET latitude = 27.0697, longitude = 80.5048 WHERE code = 'HUB-SDL-02';

-- Bilgram Agro Yard, Bilgram (Hardoi district), UP
UPDATE hubs SET latitude = 27.1937, longitude = 80.0378 WHERE code = 'HUB-BLG-03';

-- Drop the temporary default so future inserts MUST provide a real value
ALTER TABLE hubs ALTER COLUMN latitude  DROP DEFAULT;
ALTER TABLE hubs ALTER COLUMN longitude DROP DEFAULT;

-- EquipGrid V35: Add logo_url column to manufacturers (OEMs)
-- Allows storing official OEM logo image URLs for the dynamic brand marquee strip

ALTER TABLE manufacturers
    ADD COLUMN IF NOT EXISTS logo_url VARCHAR(512);

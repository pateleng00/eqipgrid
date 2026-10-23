-- EquipGrid V34: Add image_url column to equipment_types
-- Adds the image_url column to store actual generic machinery representative images.

ALTER TABLE equipment_types
    ADD COLUMN IF NOT EXISTS image_url VARCHAR (512);

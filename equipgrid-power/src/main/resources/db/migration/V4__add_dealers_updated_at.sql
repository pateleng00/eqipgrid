-- EquipGrid V4: Add missing updated_at column to dealers table
-- Ensures Hibernate schema-validation passes for Dealer entity extending BaseEntity

ALTER TABLE dealers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

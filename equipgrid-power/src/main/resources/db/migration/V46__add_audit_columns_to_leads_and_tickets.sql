-- EquipGrid V46: Ensure BaseEntity audit columns created_by and updated_by exist on dealer_leads and support_tickets
ALTER TABLE dealer_leads
    ADD COLUMN IF NOT EXISTS created_by BIGINT DEFAULT 1;
ALTER TABLE dealer_leads
    ADD COLUMN IF NOT EXISTS updated_by BIGINT DEFAULT 1;

ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS created_by BIGINT DEFAULT 1;
ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS updated_by BIGINT DEFAULT 1;

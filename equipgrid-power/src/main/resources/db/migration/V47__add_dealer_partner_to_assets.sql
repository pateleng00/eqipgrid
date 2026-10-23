-- EquipGrid V47: Add dealer_partner_id to assets for mapping dealer-owned machines vs EquipGrid fleet
ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS dealer_partner_id BIGINT REFERENCES dealers(id);

CREATE INDEX IF NOT EXISTS idx_assets_dealer_partner_id ON assets(dealer_partner_id);

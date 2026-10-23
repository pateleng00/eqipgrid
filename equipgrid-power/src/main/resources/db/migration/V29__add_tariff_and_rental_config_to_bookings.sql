-- EquipGrid V29: Add Tariff & Rental Configuration Link to Bookings
-- Allows bookings to record specific rental configuration tariffs (multi-billing units, custom rates, shift terms)

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS rental_config_id BIGINT REFERENCES rental_configurations(id);
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS billing_unit VARCHAR (32);
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS shift_terms VARCHAR (256);
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS daily_rate DECIMAL (10, 2);

CREATE INDEX IF NOT EXISTS idx_bookings_rental_config ON bookings(rental_config_id);

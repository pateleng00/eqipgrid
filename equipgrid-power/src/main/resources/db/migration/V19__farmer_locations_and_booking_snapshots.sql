-- Farmers commonly operate more than one farm. Keep reusable, locally named
-- delivery places separate from the immutable location snapshot on a booking.
CREATE TABLE IF NOT EXISTS farm_locations
(
    id
    BIGSERIAL
    PRIMARY
    KEY,
    customer_id
    BIGINT
    NOT
    NULL
    REFERENCES
    customers
(
    id
),
    local_name VARCHAR
(
    128
) NOT NULL,
    local_name_hindi VARCHAR
(
    128
),
    aliases TEXT,
    location_type SMALLINT NOT NULL DEFAULT 1, -- 1=FARM, 2=HOME, 3=VILLAGE_PICKUP, 4=SITE
    latitude NUMERIC
(
    10,
    7
),
    longitude NUMERIC
(
    10,
    7
),
    village VARCHAR
(
    128
),
    tehsil VARCHAR
(
    128
),
    district VARCHAR
(
    128
),
    landmark TEXT,
    access_notes TEXT,
    delivery_contact_name VARCHAR
(
    128
),
    delivery_contact_phone VARCHAR
(
    20
),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at TIMESTAMP,
    verified_at TIMESTAMP,
    verified_by VARCHAR
(
    128
),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_farm_locations_customer_active
    ON farm_locations(customer_id, active, is_default);

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS farm_location_id BIGINT REFERENCES farm_locations(id);
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS delivery_location_name VARCHAR (128);
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS delivery_location_snapshot TEXT;
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC (10, 7);
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC (10, 7);

CREATE INDEX IF NOT EXISTS idx_bookings_farm_location ON bookings(farm_location_id);

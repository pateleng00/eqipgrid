ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source SMALLINT NOT NULL DEFAULT 1; -- 1=STATION, 2=PHONE_AGENT, 3=DEALER, 4=FPO, 5=KISAN_MITRA, 6=WHATSAPP
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS callback_requested BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS delivery_jobs (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(id),
    status SMALLINT NOT NULL DEFAULT 2, -- 1=REQUESTED, 2=SCHEDULED, 3=OUT_FOR_DELIVERY, 4=COMPLETED, 5=CANCELLED
    driver_name VARCHAR(128),
    driver_phone VARCHAR(20),
    vehicle_number VARCHAR(32),
    scheduled_for TIMESTAMP,
    eta_start TIMESTAMP,
    eta_end TIMESTAMP,
    delivered_at TIMESTAMP,
    receiver_name VARCHAR(128),
    receiver_phone VARCHAR(20),
    delivery_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS return_pickup_jobs (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(id),
    status SMALLINT NOT NULL DEFAULT 1, -- 1=REQUESTED, 2=SCHEDULED, 3=OUT_FOR_DELIVERY, 4=COMPLETED, 5=CANCELLED
    driver_name VARCHAR(128),
    driver_phone VARCHAR(20),
    vehicle_number VARCHAR(32),
    scheduled_for TIMESTAMP,
    collected_at TIMESTAMP,
    pickup_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refund_transactions (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id),
    amount NUMERIC(10, 2) NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1, -- 1=PENDING, 2=PROCESSING, 3=COMPLETED, 4=FAILED
    payment_reference VARCHAR(128),
    reason TEXT,
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delivery_jobs_status ON delivery_jobs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_return_pickup_jobs_status ON return_pickup_jobs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_booking ON refund_transactions(booking_id, status);

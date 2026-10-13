CREATE TABLE IF NOT EXISTS payment_proofs (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id),
    submitted_reference VARCHAR(128),
    status SMALLINT NOT NULL DEFAULT 1, -- 1=PENDING, 2=VERIFIED, 3=REJECTED
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    verified_by VARCHAR(128),
    verification_notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON payment_proofs(status, submitted_at);

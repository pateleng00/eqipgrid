-- EquipGrid V1: Core Operational Schema
-- PostgreSQL 16+ DDL with Smallint Enums and Audit Constraints

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    role SMALLINT NOT NULL, -- Enum: 1=CUSTOMER, 2=OPERATOR, 3=TECHNICIAN, 4=DRIVER, 5=DEALER, 6=MANAGER, 7=ADMIN
    phone VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(128) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(128),
    address TEXT NOT NULL,
    aadhaar_number VARCHAR(20),
    gst_number VARCHAR(30),
    tier SMALLINT NOT NULL DEFAULT 1, -- Enum: 1=TIER_1_BASIC, 2=TIER_2_VERIFIED
    verified BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
    id BIGSERIAL PRIMARY KEY,
    asset_tag VARCHAR(32) UNIQUE NOT NULL, -- e.g. C-MIX-001
    name VARCHAR(128) NOT NULL,
    category SMALLINT NOT NULL, -- Enum: 1=CONSTRUCTION, 2=AGRICULTURE
    model_name VARCHAR(128),
    serial_number VARCHAR(128),
    daily_rate NUMERIC(10, 2) NOT NULL,
    deposit_amount NUMERIC(10, 2) NOT NULL,
    purchase_cost NUMERIC(10, 2),
    operator_required BOOLEAN DEFAULT FALSE,
    status SMALLINT NOT NULL DEFAULT 1, -- Enum: 1=AVAILABLE, 2=RESERVED, 3=DISPATCH_READY, 4=DISPATCHED, 5=ON_RENT, 6=RETURN_PENDING, 7=RETURNED, 8=INSPECTION, 9=DAMAGE_ASSESSMENT, 10=MAINTENANCE, 11=DAMAGED, 12=RETIRED
    condition_notes TEXT,
    engine_hours NUMERIC(8, 2) DEFAULT 0.0,
    accessories_included TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id BIGSERIAL PRIMARY KEY,
    booking_number VARCHAR(32) UNIQUE NOT NULL, -- BK-2026-001
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    asset_id BIGINT NOT NULL REFERENCES assets(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    delivery_address TEXT NOT NULL,
    distance_km NUMERIC(6, 2) DEFAULT 0.0,
    operator_required BOOLEAN DEFAULT FALSE,
    operator_assigned_id BIGINT REFERENCES users(id),
    base_rent NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    operator_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    deposit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    advance_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    deposit_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    status SMALLINT NOT NULL DEFAULT 1, -- Enum: 1=QUOTED, 2=PENDING_PAYMENT, 3=CONFIRMED, 4=ALLOCATED, 5=DISPATCH_READY, 6=DISPATCHED, 7=ON_RENT, 8=RETURN_REQUESTED, 9=RETURNED, 10=INSPECTED, 11=CLOSED, 12=CANCELLED
    dealer_id BIGINT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dispatch_records (
    id BIGSERIAL PRIMARY KEY,
    challan_number VARCHAR(32) UNIQUE NOT NULL, -- CH-2026-001
    booking_id BIGINT NOT NULL REFERENCES bookings(id),
    asset_id BIGINT NOT NULL REFERENCES assets(id),
    dispatch_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fuel_level VARCHAR(32) DEFAULT '100%',
    engine_hours_out NUMERIC(8, 2) DEFAULT 0.0,
    accessories_verified BOOLEAN DEFAULT TRUE,
    condition_notes TEXT,
    photo_urls TEXT,
    driver_name VARCHAR(128),
    customer_signature_confirmed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS return_inspections (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id),
    asset_id BIGINT NOT NULL REFERENCES assets(id),
    return_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fuel_level_return VARCHAR(32) DEFAULT '100%',
    fuel_delta_charge NUMERIC(10, 2) DEFAULT 0.0,
    engine_hours_in NUMERIC(8, 2) DEFAULT 0.0,
    accessories_returned_ok BOOLEAN DEFAULT TRUE,
    has_damage BOOLEAN DEFAULT FALSE,
    damage_cost NUMERIC(10, 2) DEFAULT 0.0,
    damage_description TEXT,
    inspector_name VARCHAR(128) NOT NULL,
    next_action SMALLINT NOT NULL DEFAULT 1, -- Enum: maps to AssetStatus
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT REFERENCES bookings(id),
    customer_id BIGINT REFERENCES customers(id),
    amount NUMERIC(10, 2) NOT NULL,
    payment_type SMALLINT NOT NULL, -- Enum: 1=ADVANCE, 2=DEPOSIT, 3=FINAL_SETTLEMENT, 4=DAMAGE_CHARGE, 5=REFUND
    payment_mode SMALLINT NOT NULL, -- Enum: 1=CASH, 2=UPI, 3=BANK_TRANSFER
    transaction_ref VARCHAR(128),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dealers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    trade_name VARCHAR(128) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    location VARCHAR(128) NOT NULL, -- Hardoi, Sandila, Bilgram
    commission_rate NUMERIC(5, 4) DEFAULT 0.0600,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dealer_commissions (
    id BIGSERIAL PRIMARY KEY,
    dealer_id BIGINT NOT NULL REFERENCES dealers(id),
    booking_id BIGINT NOT NULL REFERENCES bookings(id),
    gross_rental_revenue NUMERIC(10, 2) NOT NULL,
    commission_rate NUMERIC(5, 4) NOT NULL,
    commission_amount NUMERIC(10, 2) NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1, -- Enum: 1=PENDING, 2=SETTLED
    settled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    performed_by VARCHAR(64) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX idx_payments_booking ON payments(booking_id);

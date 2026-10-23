-- V43__create_dealer_leads.sql
-- Create dealer leads table for host fleet monetization enquiries from website

CREATE TABLE IF NOT EXISTS dealer_leads
(
    id
    BIGSERIAL
    PRIMARY
    KEY,
    lead_number
    VARCHAR
(
    32
) NOT NULL UNIQUE,
    name VARCHAR
(
    128
) NOT NULL,
    phone VARCHAR
(
    20
) NOT NULL,
    business_name VARCHAR
(
    255
),
    district VARCHAR
(
    100
) NOT NULL,
    fleet_count VARCHAR
(
    50
),
    machine_category VARCHAR
(
    100
),
    status SMALLINT NOT NULL DEFAULT 1,
    remarks TEXT,
    created_by BIGINT DEFAULT 1,
    updated_by BIGINT DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_dealer_leads_status ON dealer_leads(status);
CREATE INDEX IF NOT EXISTS idx_dealer_leads_phone ON dealer_leads(phone);
CREATE INDEX IF NOT EXISTS idx_dealer_leads_district ON dealer_leads(district);

-- V44__create_support_tickets.sql
-- Create support tickets table for contact enquiries and machine availability callbacks

CREATE TABLE IF NOT EXISTS support_tickets
(
    id
    BIGSERIAL
    PRIMARY
    KEY,
    ticket_number
    VARCHAR
(
    32
) NOT NULL UNIQUE,
    customer_name VARCHAR
(
    128
) NOT NULL,
    customer_phone VARCHAR
(
    20
) NOT NULL,
    topic VARCHAR
(
    64
) NOT NULL,
    message TEXT,
    district VARCHAR
(
    100
),
    asset_id BIGINT REFERENCES assets
(
    id
) ON DELETE SET NULL,
    asset_name VARCHAR
(
    255
),
    rental_start_date DATE,
    rental_end_date DATE,
    status SMALLINT NOT NULL DEFAULT 1,
    priority SMALLINT NOT NULL DEFAULT 2,
    remarks TEXT,
    assigned_to VARCHAR
(
    100
),
    resolved_by VARCHAR
(
    100
),
    resolved_at TIMESTAMP,
    created_by BIGINT DEFAULT 1,
    updated_by BIGINT DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_phone ON support_tickets(customer_phone);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);

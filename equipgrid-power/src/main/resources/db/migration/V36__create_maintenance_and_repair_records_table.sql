-- V36: Create maintenance and repair records table for yard and fleet operations
-- Supports In-House Repair Bays and External Service Centers with invoice document tracking.
-- Zero dummy data: Pure schema definition with relational constraints and indexing.

CREATE TABLE IF NOT EXISTS maintenance_records (
    id BIGSERIAL PRIMARY KEY,
    ticket_number VARCHAR(32) NOT NULL UNIQUE,
    asset_id BIGINT NOT NULL REFERENCES assets(id),
    hub_id BIGINT NOT NULL REFERENCES hubs(id),
    service_type VARCHAR(32) NOT NULL,
    location_type VARCHAR(32) NOT NULL,
    service_center_name VARCHAR(255),
    service_center_contact VARCHAR(64),
    service_center_address TEXT,
    priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS',
    issue_description TEXT NOT NULL,
    work_scope TEXT,
    estimated_cost NUMERIC(10, 2),
    actual_parts_cost NUMERIC(10, 2),
    actual_labor_cost NUMERIC(10, 2),
    total_cost NUMERIC(10, 2),
    invoice_number VARCHAR(64),
    invoice_document_url TEXT,
    invoice_file_name VARCHAR(255),
    invoice_file_type VARCHAR(64),
    invoice_uploaded_at TIMESTAMP WITH TIME ZONE,
    meter_hours_at_service INTEGER,
    next_service_due_hours INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expected_completion_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    assigned_technician VARCHAR(128),
    created_by BIGINT REFERENCES users(id),
    updated_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_asset ON maintenance_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_hub ON maintenance_records(hub_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_ticket ON maintenance_records(ticket_number);

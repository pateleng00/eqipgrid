-- V39: Convert maintenance_records enum columns from VARCHAR to SMALLINT
-- Standardizes maintenance_records to store short codes matching JPA AutoApply converters
-- Ensures zero enum strings in the database.

-- 1. Drop existing defaults on varchar columns if present
ALTER TABLE maintenance_records ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE maintenance_records ALTER COLUMN status DROP DEFAULT;

-- 2. Convert service_type column to SMALLINT
-- 1: PERIODIC_SERVICE, 2: REPAIR_WORK, 3: SERVICE_AND_REPAIR
ALTER TABLE maintenance_records
    ALTER COLUMN service_type TYPE SMALLINT USING (
        CASE service_type
            WHEN 'PERIODIC_SERVICE' THEN 1
            WHEN 'REPAIR_WORK' THEN 2
            WHEN 'SERVICE_AND_REPAIR' THEN 3
            ELSE (CASE WHEN service_type ~ '^[0-9]+$' THEN service_type::SMALLINT ELSE 1 END)
        END
    );

-- 3. Convert location_type column to SMALLINT
-- 1: IN_HOUSE, 2: EXTERNAL_SERVICE_CENTER
ALTER TABLE maintenance_records
    ALTER COLUMN location_type TYPE SMALLINT USING (
        CASE location_type
            WHEN 'IN_HOUSE' THEN 1
            WHEN 'EXTERNAL_SERVICE_CENTER' THEN 2
            ELSE (CASE WHEN location_type ~ '^[0-9]+$' THEN location_type::SMALLINT ELSE 1 END)
        END
    );

-- 4. Convert priority column to SMALLINT and set default to 2 (NORMAL)
-- 1: LOW, 2: NORMAL, 3: HIGH, 4: URGENT
ALTER TABLE maintenance_records
    ALTER COLUMN priority TYPE SMALLINT USING (
        CASE priority
            WHEN 'LOW' THEN 1
            WHEN 'NORMAL' THEN 2
            WHEN 'HIGH' THEN 3
            WHEN 'URGENT' THEN 4
            ELSE (CASE WHEN priority ~ '^[0-9]+$' THEN priority::SMALLINT ELSE 2 END)
        END
    );

ALTER TABLE maintenance_records ALTER COLUMN priority SET DEFAULT 2;

-- 5. Convert status column to SMALLINT and set default to 2 (IN_PROGRESS)
-- 1: SCHEDULED, 2: IN_PROGRESS, 3: WAITING_PARTS, 4: COMPLETED, 5: CANCELLED
ALTER TABLE maintenance_records
    ALTER COLUMN status TYPE SMALLINT USING (
        CASE status
            WHEN 'SCHEDULED' THEN 1
            WHEN 'IN_PROGRESS' THEN 2
            WHEN 'WAITING_PARTS' THEN 3
            WHEN 'COMPLETED' THEN 4
            WHEN 'CANCELLED' THEN 5
            ELSE (CASE WHEN status ~ '^[0-9]+$' THEN status::SMALLINT ELSE 2 END)
        END
    );

ALTER TABLE maintenance_records ALTER COLUMN status SET DEFAULT 2;

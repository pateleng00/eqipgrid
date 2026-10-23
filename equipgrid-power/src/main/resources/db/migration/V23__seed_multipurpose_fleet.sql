-- EquipGrid V23: Seed Multipurpose Fleet Equipment Types, Models, and Assets
-- Category: 1=CONSTRUCTION, 2=AGRICULTURE, 3=MULTIPURPOSE_FLEET

-- 1. Equipment Types for Multipurpose Fleet
INSERT INTO equipment_types (name, code, category, description, active)
VALUES ('Hydraulic Tractor Trolley (10-Ton)', 'TYPE-MULTI-TRL', 3,
        'Heavy dual-purpose tipping trailer for farm crop transport and civil site sand/brick hauling', true),
       ('Mobile Water Tanker & Pressure Sprayer', 'TYPE-MULTI-TNK', 3,
        'Multi-use 5000L water tanker for construction site curing/compaction and agricultural irrigation', true),
       ('Dual-Use Silent Diesel Generator 7.5kVA', 'TYPE-MULTI-GEN', 3,
        'Heavy mobile silent generator for powering construction machinery and agricultural tubewells',
        true) ON CONFLICT (code) DO NOTHING;

-- 2. Machine Models
INSERT INTO machine_models (type_id, manufacturer_id, name, model_number, specs, active)
SELECT t.id,
       m.id,
       'Mahindra Heavy 10-Ton Hydraulic Tipper Trolley',
       'MAH-TRL-10T',
       '10-Ton payload, heavy-duty hydraulic jack cylinder, removable side panels for dual haulage',
       true
FROM equipment_types t,
     manufacturers m
WHERE t.code = 'TYPE-MULTI-TRL'
  AND m.code = 'MFG-KISANFORCE' ON CONFLICT (type_id, manufacturer_id, model_number) DO NOTHING;

INSERT INTO machine_models (type_id, manufacturer_id, name, model_number, specs, active)
SELECT t.id,
       m.id,
       'Universal 5000L Tractor Water Tanker',
       'UNIV-TNK-5000L',
       '5000 Litre epoxy-coated tank, 3-inch discharge valve, integrated spray bar',
       true
FROM equipment_types t,
     manufacturers m
WHERE t.code = 'TYPE-MULTI-TNK'
  AND m.code = 'MFG-UNIVERSAL' ON CONFLICT (type_id, manufacturer_id, model_number) DO NOTHING;

INSERT INTO machine_models (type_id, manufacturer_id, name, model_number, specs, active)
SELECT t.id,
       m.id,
       'Kirloskar 7.5kVA Silent Diesel Generator',
       'KIRL-GEN-7.5KVA',
       '7.5kVA 230V/415V Dual Output, Soundproof canopy, 3-cylinder diesel, 12h run-tank',
       true
FROM equipment_types t,
     manufacturers m
WHERE t.code = 'TYPE-MULTI-GEN'
  AND m.code = 'MFG-KIRLOSKAR' ON CONFLICT (type_id, manufacturer_id, model_number) DO NOTHING;

-- 3. Assets for Multipurpose Fleet
ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS name VARCHAR (128),
    ADD COLUMN IF NOT EXISTS category SMALLINT,
    ADD COLUMN IF NOT EXISTS model_name VARCHAR (128),
    ADD COLUMN IF NOT EXISTS serial_number VARCHAR (128),
    ADD COLUMN IF NOT EXISTS daily_rate NUMERIC (10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC (10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC (10, 2),
    ADD COLUMN IF NOT EXISTS operator_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS status SMALLINT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS condition_notes TEXT,
    ADD COLUMN IF NOT EXISTS accessories_included TEXT,
    ADD COLUMN IF NOT EXISTS engine_hours NUMERIC (8, 2) DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS image_url VARCHAR (512) DEFAULT 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
    ADD COLUMN IF NOT EXISTS billing_unit SMALLINT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS working_hours_limit NUMERIC (6, 2),
    ADD COLUMN IF NOT EXISTS shift_terms VARCHAR (256),
    ADD COLUMN IF NOT EXISTS type_id BIGINT,
    ADD COLUMN IF NOT EXISTS manufacturer_id BIGINT,
    ADD COLUMN IF NOT EXISTS model_id BIGINT,
    ADD COLUMN IF NOT EXISTS hub_id BIGINT;

INSERT INTO assets (asset_tag, name, category, model_name, serial_number, daily_rate, deposit_amount,
                    purchase_cost, operator_required, status, condition_notes, accessories_included,
                    model_id, type_id, manufacturer_id, hub_id, billing_unit, shift_terms)
VALUES ('M-TRL-001',
        'Hydraulic Tractor Trolley (10-Ton Tipper)',
        3,
        'Mahindra Heavy 10-Ton Tipper',
        'SN-MT-7701',
        1500.00,
        4000.00,
        185000.00,
        false,
        1,
        'Brand new heavy chassis, hydraulic hose & tow hitch safety pins certified',
        'Hydraulic quick-connect hose, safety tow pin, 4x wheel chocks',
        (SELECT id FROM machine_models WHERE model_number = 'MAH-TRL-10T' LIMIT 1),
       (SELECT id FROM equipment_types WHERE code = 'TYPE-MULTI-TRL' LIMIT 1),
       (SELECT id FROM manufacturers WHERE code = 'MFG-KISANFORCE' LIMIT 1), COALESCE(
        (SELECT id FROM hubs WHERE code = 'HUB-HRD-01'), (SELECT id FROM hubs ORDER BY id ASC LIMIT
        1)), 1, 'Full 24-hr day site deployment • Farm harvest & civil haulage allowed' ),
(
    'M-TRL-002',
    'Hydraulic Tractor Trolley (10-Ton Tipper)',
    3,
    'Mahindra Heavy 10-Ton Tipper',
    'SN-MT-7702',
    1500.00,
    4000.00,
    185000.00,
    false,
    1,
    'Fleet inspection passed, hydraulic seals tested under full payload',
    'Hydraulic quick-connect hose, safety tow pin',
    (SELECT id FROM machine_models WHERE model_number = 'MAH-TRL-10T' LIMIT 1),
    (SELECT id FROM equipment_types WHERE code = 'TYPE-MULTI-TRL' LIMIT 1),
    (SELECT id FROM manufacturers WHERE code = 'MFG-KISANFORCE' LIMIT 1),
    COALESCE((SELECT id FROM hubs WHERE code = 'HUB-BLG-03'), (SELECT id FROM hubs ORDER BY id ASC LIMIT 1)),
    1,
    'Full 24-hr day site deployment • Farm harvest & civil haulage allowed'
),
(
    'M-TNK-001',
    'Mobile Water Tanker & Pressure Sprayer 5000L',
    3,
    'Universal 5000L Tractor Water Tanker',
    'SN-MW-8801',
    1200.00,
    3000.00,
    140000.00,
    false,
    1,
    'Tank leak test passed, high-volume spray bar operational',
    '3-inch delivery hose 10m, gravity spreader nozzle',
    (SELECT id FROM machine_models WHERE model_number = 'UNIV-TNK-5000L' LIMIT 1),
    (SELECT id FROM equipment_types WHERE code = 'TYPE-MULTI-TNK' LIMIT 1),
    (SELECT id FROM manufacturers WHERE code = 'MFG-UNIVERSAL' LIMIT 1),
    COALESCE((SELECT id FROM hubs WHERE code = 'HUB-SDL-02'), (SELECT id FROM hubs ORDER BY id ASC LIMIT 1)),
    1,
    'Full 24-hr day site deployment • Zero shift restriction'
),
(
    'M-GEN-001',
    'Dual-Use Silent Diesel Generator 7.5kVA',
    3,
    'Kirloskar 7.5kVA Silent Diesel Generator',
    'SN-MG-9901',
    1400.00,
    4500.00,
    165000.00,
    false,
    1,
    'Sound canopy dampeners checked, AVR output stabilized at 230V',
    'Industrial 32A distribution box, 15m armored cable, earth rod',
    (SELECT id FROM machine_models WHERE model_number = 'KIRL-GEN-7.5KVA' LIMIT 1),
    (SELECT id FROM equipment_types WHERE code = 'TYPE-MULTI-GEN' LIMIT 1),
    (SELECT id FROM manufacturers WHERE code = 'MFG-KIRLOSKAR' LIMIT 1),
    COALESCE((SELECT id FROM hubs WHERE code = 'HUB-HRD-01'), (SELECT id FROM hubs ORDER BY id ASC LIMIT 1)),
    1,
    'Full 24-hr day site deployment • Fuel not included'
)
ON CONFLICT (asset_tag) DO
UPDATE SET
    category = EXCLUDED.category,
    type_id = EXCLUDED.type_id,
    model_id = EXCLUDED.model_id;

-- 4. Rental Configurations for Multipurpose Equipment Types
INSERT INTO rental_configurations (hub_id, type_id, base_daily_rate, deposit_amount,
                                   operator_daily_rate, free_delivery_distance_km, rate_per_km_after_free, active,
                                   billing_unit)
SELECT COALESCE((SELECT id FROM hubs WHERE code = 'HUB-HRD-01'), (SELECT id FROM hubs ORDER BY id ASC LIMIT 1)),
       id,
       1500.00,
       4000.00,
       0.00,
       10.0,
       18.00,
       true,
       1
FROM equipment_types
WHERE code = 'TYPE-MULTI-TRL' ON CONFLICT DO NOTHING;

INSERT INTO rental_configurations (hub_id, type_id, base_daily_rate, deposit_amount,
                                   operator_daily_rate, free_delivery_distance_km, rate_per_km_after_free, active,
                                   billing_unit)
SELECT COALESCE((SELECT id FROM hubs WHERE code = 'HUB-HRD-01'), (SELECT id FROM hubs ORDER BY id ASC LIMIT 1)),
       id,
       1200.00,
       3000.00,
       0.00,
       10.0,
       18.00,
       true,
       1
FROM equipment_types
WHERE code = 'TYPE-MULTI-TNK' ON CONFLICT DO NOTHING;

INSERT INTO rental_configurations (hub_id, type_id, base_daily_rate, deposit_amount,
                                   operator_daily_rate, free_delivery_distance_km, rate_per_km_after_free, active,
                                   billing_unit)
SELECT COALESCE((SELECT id FROM hubs WHERE code = 'HUB-HRD-01'), (SELECT id FROM hubs ORDER BY id ASC LIMIT 1)),
       id,
       1400.00,
       4500.00,
       0.00,
       10.0,
       18.00,
       true,
       1
FROM equipment_types
WHERE code = 'TYPE-MULTI-GEN' ON CONFLICT DO NOTHING;

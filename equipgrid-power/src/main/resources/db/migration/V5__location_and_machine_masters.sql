-- EquipGrid V5: Location Master, Machine Masters, Equipment Image & Rental Configurations

-- 1. LOCATION MASTER HIERARCHY: State -> City -> Hub (Yard)
CREATE TABLE IF NOT EXISTS states (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cities (
    id BIGSERIAL PRIMARY KEY,
    state_id BIGINT NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    pin_code VARCHAR(12),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_city_state UNIQUE (state_id, name)
);

CREATE TABLE IF NOT EXISTS hubs (
    id BIGSERIAL PRIMARY KEY,
    city_id BIGINT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    code VARCHAR(32) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    contact_phone VARCHAR(20),
    operating_radius_km NUMERIC(6, 2) DEFAULT 25.0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. MACHINE MASTERS: Equipment Type -> Manufacturer -> Machine Model
CREATE TABLE IF NOT EXISTS equipment_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    code VARCHAR(32) NOT NULL UNIQUE,
    category SMALLINT NOT NULL DEFAULT 1, -- 1=CONSTRUCTION, 2=AGRICULTURE
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manufacturers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    code VARCHAR(32) NOT NULL UNIQUE,
    country VARCHAR(64) DEFAULT 'India',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS machine_models (
    id BIGSERIAL PRIMARY KEY,
    type_id BIGINT NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
    manufacturer_id BIGINT NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    model_number VARCHAR(64) NOT NULL,
    specs TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_model_type_mfg UNIQUE (type_id, manufacturer_id, model_number)
);

-- 3. EXTEND ASSETS TABLE: Link to Type, Manufacturer, Model, Hub, and add mandatory image_url
ALTER TABLE assets 
    ADD COLUMN IF NOT EXISTS type_id BIGINT REFERENCES equipment_types(id),
    ADD COLUMN IF NOT EXISTS manufacturer_id BIGINT REFERENCES manufacturers(id),
    ADD COLUMN IF NOT EXISTS model_id BIGINT REFERENCES machine_models(id),
    ADD COLUMN IF NOT EXISTS hub_id BIGINT REFERENCES hubs(id),
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(512) NOT NULL DEFAULT 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800';

-- 4. RENTAL CONFIGURATION TABLE: Machine-wise and Hub-wise, updatable, removable
-- Rule: Free delivery (pick & drop) till 5 KMs, thereafter 10 Rs per KM
CREATE TABLE IF NOT EXISTS rental_configurations (
    id BIGSERIAL PRIMARY KEY,
    hub_id BIGINT NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    asset_id BIGINT REFERENCES assets(id) ON DELETE CASCADE,
    type_id BIGINT REFERENCES equipment_types(id) ON DELETE SET NULL,
    base_daily_rate NUMERIC(10, 2) NOT NULL,
    deposit_amount NUMERIC(10, 2) NOT NULL,
    operator_daily_rate NUMERIC(10, 2) DEFAULT 500.00,
    free_delivery_distance_km NUMERIC(6, 2) NOT NULL DEFAULT 5.0,
    rate_per_km_after_free NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. SEED INITIAL MASTER DATA

-- States
INSERT INTO states (name, code, active) VALUES
('Uttar Pradesh', 'UP', true),
('Bihar', 'BR', true),
('Madhya Pradesh', 'MP', true)
ON CONFLICT (name) DO NOTHING;

-- Cities in Uttar Pradesh
INSERT INTO cities (state_id, name, pin_code, active)
SELECT s.id, c.name, c.pin_code, true
FROM states s
CROSS JOIN (VALUES 
    ('Hardoi', '241001'),
    ('Lucknow', '226001'),
    ('Kanpur', '208001'),
    ('Sitapur', '261001'),
    ('Shahjahanpur', '242001')
) AS c(name, pin_code)
WHERE s.code = 'UP'
ON CONFLICT (state_id, name) DO NOTHING;

-- Hubs (Yards) under Hardoi and neighboring cities
INSERT INTO hubs (city_id, name, code, address, contact_phone, operating_radius_km, active)
SELECT c.id, h.name, h.code, h.address, h.phone, h.radius, true
FROM cities c
CROSS JOIN (VALUES 
    ('Hardoi Central Yard', 'HUB-HRD-01', 'Plot 4, Cinema Chauraha, Hardoi Bypass, UP', '+919450001100', 30.0),
    ('Sandila Industrial Hub', 'HUB-SDL-02', 'Phase II Industrial Area, Sandila, Hardoi', '+919450002200', 25.0),
    ('Bilgram Agro Yard', 'HUB-BLG-03', 'Near Mandi Samiti, Bilgram Road, Hardoi', '+919450003300', 20.0)
) AS h(name, code, address, phone, radius)
WHERE c.name = 'Hardoi'
ON CONFLICT (code) DO NOTHING;

-- Machine Types
INSERT INTO equipment_types (name, code, category, description, active) VALUES
('Tilting Concrete Mixer', 'TYPE-CONC-MIX', 1, 'Heavy-duty 10/7 diesel and electric batch concrete mixers', true),
('Concrete Needle Vibrator', 'TYPE-CONC-VIB', 1, 'High-frequency needle poker vibrators with flexible drive shafts', true),
('Plate Compactor / Earth Rammer', 'TYPE-PLATE-CMP', 1, 'Walk-behind soil and asphalt plate vibratory compactors', true),
('Demolition Jackhammer', 'TYPE-DEMO-JKH', 1, 'High-impact 16kg-30kg demolition hammers and chisels', true),
('Trash / De-watering Pump', 'TYPE-DEWAT-PMP', 1, 'Self-priming 3-inch petrol and diesel mud/trash pumps', true),
('Portable Power Generator', 'TYPE-PORT-GEN', 1, 'Single/three-phase mobile generators 3.5kVA to 10kVA', true),
('Power Reaper Harvester', 'TYPE-AGRO-REP', 2, 'Walking tractor mounted paddy and wheat crop harvester', true),
('Rotary Power Weeder / Tiller', 'TYPE-AGRO-WED', 2, '7HP engine inter-row tillage and weeding cultivator', true),
('Post-Hole Earth Auger', 'TYPE-AGRO-AUG', 2, 'Two-stroke soil hole digger for fencing and sapling plantation', true)
ON CONFLICT (name) DO NOTHING;

-- Manufacturers
INSERT INTO manufacturers (name, code, country, active) VALUES
('Universal Construction Machinery', 'MFG-UNIVERSAL', 'India', true),
('Honda Power Products', 'MFG-HONDA', 'India', true),
('SpeedCrafts Limited', 'MFG-SPEEDCRAFT', 'India', true),
('Robert Bosch Power Tools', 'MFG-BOSCH', 'Germany', true),
('Kirloskar Brothers Engines', 'MFG-KIRLOSKAR', 'India', true),
('VST Tillers Tractors Ltd', 'MFG-VST', 'India', true),
('KisanForce Agro Engineering', 'MFG-KISANFORCE', 'India', true),
('Agritech India Solutions', 'MFG-AGRITECH', 'India', true)
ON CONFLICT (name) DO NOTHING;

-- Machine Models
INSERT INTO machine_models (type_id, manufacturer_id, name, model_number, specs, active)
SELECT t.id, m.id, 'Universal 10/7 Heavy Diesel Mixer', 'UNIV-10/7-D', '10 cu ft unmixed / 7 cu ft mixed batch, 6HP Air-cooled Diesel Engine', true
FROM equipment_types t, manufacturers m
WHERE t.code = 'TYPE-CONC-MIX' AND m.code = 'MFG-UNIVERSAL'
ON CONFLICT (type_id, manufacturer_id, model_number) DO NOTHING;

INSERT INTO machine_models (type_id, manufacturer_id, name, model_number, specs, active)
SELECT t.id, m.id, 'Honda GX160 Poker Vibrator 5.5HP', 'GX160-PV55', '163cc 4-Stroke OHV Engine, 60mm Needle, 5m Hose', true
FROM equipment_types t, manufacturers m
WHERE t.code = 'TYPE-CONC-VIB' AND m.code = 'MFG-HONDA'
ON CONFLICT (type_id, manufacturer_id, model_number) DO NOTHING;

INSERT INTO machine_models (type_id, manufacturer_id, name, model_number, specs, active)
SELECT t.id, m.id, 'SpeedCraft PC-90 Compactor', 'PC-90-PET', '90kg operating weight, 15kN centrifugal compaction force', true
FROM equipment_types t, manufacturers m
WHERE t.code = 'TYPE-PLATE-CMP' AND m.code = 'MFG-SPEEDCRAFT'
ON CONFLICT (type_id, manufacturer_id, model_number) DO NOTHING;

INSERT INTO machine_models (type_id, manufacturer_id, name, model_number, specs, active)
SELECT t.id, m.id, 'Bosch GSH 16-30 Demolition Hammer', 'GSH-16-30', '1750W Motor, 41J impact energy, 16.5kg weight', true
FROM equipment_types t, manufacturers m
WHERE t.code = 'TYPE-DEMO-JKH' AND m.code = 'MFG-BOSCH'
ON CONFLICT (type_id, manufacturer_id, model_number) DO NOTHING;

INSERT INTO machine_models (type_id, manufacturer_id, name, model_number, specs, active)
SELECT t.id, m.id, 'Kirloskar KTP-3 Mud Pump', 'KTP-3-3INCH', '3-inch suction/delivery, 1000 LPM discharge, 28m head', true
FROM equipment_types t, manufacturers m
WHERE t.code = 'TYPE-DEWAT-PMP' AND m.code = 'MFG-KIRLOSKAR'
ON CONFLICT (type_id, manufacturer_id, model_number) DO NOTHING;

INSERT INTO machine_models (type_id, manufacturer_id, name, model_number, specs, active)
SELECT t.id, m.id, 'VST Shakti 4R Power Reaper', 'VST-4R-DIESEL', '5HP Diesel Engine, 1.2m cutting width, 3-4 acres/day harvest', true
FROM equipment_types t, manufacturers m
WHERE t.code = 'TYPE-AGRO-REP' AND m.code = 'MFG-VST'
ON CONFLICT (type_id, manufacturer_id, model_number) DO NOTHING;

-- Link existing assets to default Hardoi Central Hub and Types
UPDATE assets 
SET hub_id = (SELECT id FROM hubs WHERE code = 'HUB-HRD-01' LIMIT 1),
    type_id = (SELECT id FROM equipment_types WHERE code = 'TYPE-CONC-MIX' LIMIT 1),
    manufacturer_id = (SELECT id FROM manufacturers WHERE code = 'MFG-UNIVERSAL' LIMIT 1),
    image_url = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800'
WHERE asset_tag LIKE 'C-MIX%';

UPDATE assets 
SET hub_id = (SELECT id FROM hubs WHERE code = 'HUB-HRD-01' LIMIT 1),
    type_id = (SELECT id FROM equipment_types WHERE code = 'TYPE-CONC-VIB' LIMIT 1),
    manufacturer_id = (SELECT id FROM manufacturers WHERE code = 'MFG-HONDA' LIMIT 1),
    image_url = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800'
WHERE asset_tag LIKE 'C-VIB%';

UPDATE assets 
SET hub_id = (SELECT id FROM hubs WHERE code = 'HUB-SDL-02' LIMIT 1),
    type_id = (SELECT id FROM equipment_types WHERE code = 'TYPE-PLATE-CMP' LIMIT 1),
    manufacturer_id = (SELECT id FROM manufacturers WHERE code = 'MFG-SPEEDCRAFT' LIMIT 1),
    image_url = 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800'
WHERE asset_tag LIKE 'C-CMP%';

UPDATE assets 
SET hub_id = (SELECT id FROM hubs WHERE code = 'HUB-HRD-01' LIMIT 1),
    type_id = (SELECT id FROM equipment_types WHERE code = 'TYPE-DEMO-JKH' LIMIT 1),
    manufacturer_id = (SELECT id FROM manufacturers WHERE code = 'MFG-BOSCH' LIMIT 1),
    image_url = 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=800'
WHERE asset_tag LIKE 'C-JKH%';

UPDATE assets 
SET hub_id = (SELECT id FROM hubs WHERE code = 'HUB-BLG-03' LIMIT 1),
    type_id = (SELECT id FROM equipment_types WHERE code = 'TYPE-AGRO-REP' LIMIT 1),
    manufacturer_id = (SELECT id FROM manufacturers WHERE code = 'MFG-VST' LIMIT 1),
    image_url = 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800'
WHERE asset_tag LIKE 'A-REP%';

-- Seed Baseline Rental Configurations (Machine-wise & Hub-wise)
-- Rule: Free delivery <= 5 KM, 10 Rs/KM thereafter
INSERT INTO rental_configurations (hub_id, asset_id, type_id, base_daily_rate, deposit_amount, operator_daily_rate, free_delivery_distance_km, rate_per_km_after_free, notes)
SELECT 
    h.id,
    a.id,
    a.type_id,
    a.daily_rate,
    a.deposit_amount,
    500.00,
    5.0,  -- 0 Rs till 5 KM (Pick and Drop Free)
    10.00, -- 10 Rs/KM thereafter
    'Standard Hub Rental Rule: Free pick & drop within 5km, ₹10/km thereafter'
FROM assets a
JOIN hubs h ON a.hub_id = h.id
ON CONFLICT DO NOTHING;

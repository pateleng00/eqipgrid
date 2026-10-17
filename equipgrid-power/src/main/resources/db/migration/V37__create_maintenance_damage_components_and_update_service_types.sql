-- V37: Create maintenance damage components master table and add periodic & repair details to maintenance_records
-- Supports the 3 maintenance types: PERIODIC_SERVICE, REPAIR_WORK, SERVICE_AND_REPAIR
-- Adds external damage photo uploads and generic machine component catalog.

-- 1. Create maintenance_damage_components table
CREATE TABLE IF NOT EXISTS maintenance_damage_components (
    id BIGSERIAL PRIMARY KEY,
    part_code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    hindi_name VARCHAR(128),
    category VARCHAR(64) DEFAULT 'GENERAL',
    description TEXT,
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maint_damage_comp_active ON maintenance_damage_components(active, display_order);

-- 2. Seed generic machine & vehicle components that can be damaged externally
INSERT INTO maintenance_damage_components (part_code, name, hindi_name, category, description, display_order, active)
VALUES
    ('TYRE_WHEEL', 'Tyres / Wheels / Rim', 'टायर / पहिया / रिम', 'WHEELS', 'External tyre cuts, punctures, rim bend or lug nut damages', 1, TRUE),
    ('CUTTING_BLADE_TINES', 'Cutting Blades / Rotavator Tines / Knives', 'ब्लेड / कटर / खुरपा / रोटावेटर ताइन', 'ATTACHMENTS', 'Bent, cracked or worn cutting edges, rotavator blades or harvester cutters', 2, TRUE),
    ('HYDRAULIC_HOSE_PIPE', 'Hydraulic Hose / Oil Pipes', 'हाइड्रोलिक पाइप / होस', 'HYDRAULIC', 'External hydraulic pipe puncture, leakage, burst hose or loose coupling', 3, TRUE),
    ('BATTERY_WIRING', 'Battery / Electrical Wiring / Starter', 'बैटरी / वायरिंग / सेल्फ स्टार्टर', 'ELECTRICAL', 'Battery discharge, terminal corrosion, exposed wiring or ignition malfunction', 4, TRUE),
    ('HEADLIGHT_INDICATORS', 'Headlights / Tail Lights / Indicators', 'हेडलाइट / इंडिकेटर / लाइट', 'ELECTRICAL', 'Broken lens, burnt bulb or smashed indicator assembly', 5, TRUE),
    ('CLUTCH_BRAKE_LEVER', 'Clutch / Brake Levers & Pedals', 'क्लच / ब्रेक / लीवर / पैडल', 'CONTROLS', 'Worn brake shoes, jammed clutch lever or loose foot pedal', 6, TRUE),
    ('RADIATOR_COOLING_FINS', 'Radiator / Water Pump / Cooling Fins', 'रेडिएटर / वाटर पंप / कूलिंग पंखा', 'ENGINE_EXTERNAL', 'Radiator fin choke, coolant hose leak or water pump impeller issue', 7, TRUE),
    ('FUEL_TANK_PIPE', 'Fuel Tank / Diesel Pipes / Filter Bowl', 'डीजल टैंक / फ्यूल पाइप / ग्लास बाउल', 'FUEL_SYSTEM', 'Fuel tank dent, filter bowl crack or diesel line leakage', 8, TRUE),
    ('STEERING_TIE_ROD', 'Steering Linkage / Tie Rods / Ball Joints', 'स्टीयरिंग रॉड / बॉल जॉइंट / लिंकेज', 'STEERING', 'Loose steering tie rod, worn ball joint or misalignment', 9, TRUE),
    ('SILENCER_EXHAUST', 'Silencer / Exhaust Pipe', 'साइलेंसर / एग्जॉस्ट पाइप', 'EXHAUST', 'Exhaust pipe crack, broken mounting bracket or silencer rust', 10, TRUE),
    ('CHASSIS_BODY_FRAME', 'Body Frame / Bumper / Hood / Mudguard', 'बॉडी फ्रेम / बम्पर / मडगार्ड / हुड', 'CHASSIS', 'External body dent, cracked mudguard, damaged safety guard or frame bend', 11, TRUE),
    ('V_BELT_PULLEY', 'Fan Belt / V-Belt / Drive Pulley', 'फैन बेल्ट / वी-बेल्ट / पुली', 'DRIVE', 'Loose, cracked or slipping rubber drive belts', 12, TRUE),
    ('OTHER', 'Other Component (अन्य - विवरण आवश्यक)', 'अन्य भाग - कृपया विवरण लिखें', 'OTHER', 'Unlisted external damaged part requiring detailed description', 99, TRUE)
ON CONFLICT (part_code) DO NOTHING;

-- 3. Add periodic service & damage repair columns to maintenance_records
ALTER TABLE maintenance_records
    ADD COLUMN IF NOT EXISTS service_number INT,
    ADD COLUMN IF NOT EXISTS is_free_service BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS periodic_service_notes TEXT,
    ADD COLUMN IF NOT EXISTS damaged_components JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS other_damage_description TEXT,
    ADD COLUMN IF NOT EXISTS damage_image_urls JSONB DEFAULT '[]'::jsonb;

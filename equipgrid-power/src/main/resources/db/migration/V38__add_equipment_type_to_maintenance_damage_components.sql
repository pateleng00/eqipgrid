-- ==============================================================================
-- EquipGrid V38: Add Equipment Type Association to Maintenance Damage Components
-- Maps maintenance damage components strictly to equipment_type_id as foreign key.
-- (e.g. Tractor, Rotavator, Combine Harvester, Earth Auger, etc.)
-- ==============================================================================

-- 1. Alter table maintenance_damage_components
ALTER TABLE maintenance_damage_components
    ADD COLUMN IF NOT EXISTS equipment_type_id BIGINT REFERENCES equipment_types(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_universal BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Drop unique constraint on part_code if exists to allow same component code in different types or make unique per type
ALTER TABLE maintenance_damage_components DROP CONSTRAINT IF EXISTS maintenance_damage_components_part_code_key;

-- Add index on equipment_type_id and is_universal
CREATE INDEX IF NOT EXISTS idx_damage_components_type ON maintenance_damage_components(equipment_type_id);
CREATE INDEX IF NOT EXISTS idx_damage_components_universal ON maintenance_damage_components(is_universal);

-- 3. Mark universal components from V37
UPDATE maintenance_damage_components
SET is_universal = TRUE
WHERE part_code IN ('OTHER', 'BATTERY_WIRING', 'HYDRAULIC_HOSE_PIPE', 'CHASSIS_BODY_FRAME');

-- Associate tractor components from V37
UPDATE maintenance_damage_components
SET equipment_type_id = (SELECT id FROM equipment_types WHERE code = 'TYPE-DUAL-TRAC' LIMIT 1)
WHERE part_code IN ('TYRE_WHEEL', 'CLUTCH_BRAKE_LEVER', 'RADIATOR_COOLING_FINS', 'FUEL_TANK_PIPE', 'STEERING_TIE_ROD', 'SILENCER_EXHAUST', 'HEADLIGHT_INDICATORS')
  AND (SELECT id FROM equipment_types WHERE code = 'TYPE-DUAL-TRAC' LIMIT 1) IS NOT NULL;

-- 4. Seed Type-Specific Components for Major Equipment Types

-- (A) TRACTOR SPECIFIC COMPONENTS (TYPE-DUAL-TRAC)
INSERT INTO maintenance_damage_components (equipment_type_id, part_code, name, hindi_name, category, description, display_order, is_universal, active)
SELECT
    t.id, p.code, p.name, p.hindi, 'TRACTOR_TRANSMISSION', p.description_text, p.ord, FALSE, TRUE
FROM equipment_types t
CROSS JOIN (VALUES
    ('TRAC_PTO_SHAFT', 'P.T.O (Power Take-Off) Spline Shaft', 'पीटीओ शाफ्ट व स्प्लाइन', 'Damaged splines, PTO engagement lever slip, bearing play', 10),
    ('TRAC_3PT_LINKAGE', 'Three-Point Linkage Arms & Top Link', 'थ्री-पॉइंट हिच व टॉप लिंक', 'Bent lower arms, damaged lift rods, worn ball joints', 11),
    ('TRAC_HYD_LIFT_PUMP', 'Hydraulic Lift Pump & Control Valve', 'हाइड्रोलिक लिफ्ट पंप व वाल्व', 'Loss of lifting pressure, jerky draft control', 12),
    ('TRAC_FRONT_AXLE', 'Front Axle Spindle & Pivot Bush', 'फ्रंट एक्सल व स्पिंडल बुश', 'Wheel wobble, worn kingpin, axle pivot play', 13),
    ('TRAC_FIP_INJECTOR', 'Fuel Injection Pump (FIP) & Nozzles', 'डीजल पंप व इंजेक्टर नोजल', 'Black exhaust smoke, fuel starvation, clogged nozzle tips', 14),
    ('TRAC_BRAKE_SHOES', 'Brake Shoes & Oil-Immersed Discs', 'ब्रेक शू व ऑइल डिस्क', 'Brake slippage, uneven wheel braking, pedal hard', 15)
) AS p(code, name, hindi, description_text, ord)
WHERE t.code = 'TYPE-DUAL-TRAC'
ON CONFLICT DO NOTHING;

-- (B) ROTAVATOR / ROTARY TILLER SPECIFIC COMPONENTS (TYPE-AGRI-ROTA)
INSERT INTO maintenance_damage_components (equipment_type_id, part_code, name, hindi_name, category, description, display_order, is_universal, active)
SELECT
    t.id, p.code, p.name, p.hindi, 'ROTAVATOR_ASSEMBLY', p.description_text, p.ord, FALSE, TRUE
FROM equipment_types t
CROSS JOIN (VALUES
    ('ROTA_BLADES_TINES', 'Rotary Tines / Blades (L/C/J Type)', 'रोटावेटर ब्लेड व दांते', 'Worn out cutting edges, cracked or missing tines, loose blade bolts', 1),
    ('ROTA_SIDE_GEARBOX', 'Side Gear Box & Idler Gears', 'साइड गियर बॉक्स व दांतेदार गियर', 'Gear tooth chipped, oil leakage from side cover gasket', 2),
    ('ROTA_CENTRAL_GEARBOX', 'Central Crown Wheel & Pinion', 'मेन क्राउन गियरबॉक्स व पिनियन', 'Excessive backlash noise, input bevel shaft damage', 3),
    ('ROTA_PTO_CARDAN', 'Cardan Drive Shaft & Shear Bolt', 'कार्डन पीटीओ ड्राइव शाफ्ट व शियर बोल्ट', 'Twisted drive tube, broken shear pin, jammed universal cross', 4),
    ('ROTA_ROTOR_FLANGE', 'Rotor Hub Flange & End Bearings', 'रोटर शाफ्ट फ्लैंज व बेयरिंग', 'Bent rotor axle, bearing seizure from mud ingress', 5),
    ('ROTA_DEPTH_SKIDS', 'Depth Adjustment Skid Shoes', 'डेप्थ स्किड शू (साइड प्लेट)', 'Worn out lower runner plates, bent height adjusters', 6),
    ('ROTA_TRAILING_BOARD', 'Rear Trailing Board & Spring Shield', 'रियर ट्रेलिंग बोर्ड व स्प्रिंग', 'Dented leveling flap, broken tension springs', 7),
    ('ROTA_OIL_SEALS', 'Rotor Axle Duo-Cone Mechanical Seals', 'रोटर एक्सल ऑइल सील', 'Gear oil leaking into soil, water contamination in sump', 8)
) AS p(code, name, hindi, description_text, ord)
WHERE t.code = 'TYPE-AGRI-ROTA'
ON CONFLICT DO NOTHING;

-- (C) COMBINE HARVESTER SPECIFIC COMPONENTS (TYPE-AGRI-CMB)
INSERT INTO maintenance_damage_components (equipment_type_id, part_code, name, hindi_name, category, description, display_order, is_universal, active)
SELECT
    t.id, p.code, p.name, p.hindi, 'HARVESTER_ASSEMBLY', p.description_text, p.ord, FALSE, TRUE
FROM equipment_types t
CROSS JOIN (VALUES
    ('CMB_CUTTER_BAR', 'Cutter Bar Assembly & Knife Sections', 'कटर बार व कटर नाइफ सेक्शन', 'Broken knife teeth, worn ledger plates, loose knife clips', 1),
    ('CMB_REEL_TINES', 'Reel Drum, Teeth & Drive Pulley', 'रील ड्रम, स्प्रिंग दांते व पुली', 'Bent reel fingers, slipping variator belt, uneven feeding', 2),
    ('CMB_FEEDER_CHAIN', 'Feeder Conveyor Chain & Slats', 'फीडर कन्वेयर चेन व स्लैट्स', 'Stretched elevator chain, bent conveyor bars, sprocket wear', 3),
    ('CMB_THRESH_CYLINDER', 'Threshing Drum & Rasp Bars', 'थ्रेशिंग ड्रम व रैस्प बार', 'Uneven rasp bar wear, unthreshed grain loss, drum imbalance', 4),
    ('CMB_CONCAVE_GRATE', 'Concave Grate & Finger Extension', 'कॉन्केव जाली व ग्रिड', 'Choked concave slots, bent grid wires, grain crack damage', 5),
    ('CMB_STRAW_WALKER', 'Straw Walker Cranks & Wood Bearings', 'स्ट्रॉ वॉकर क्रैंक व बेयरिंग', 'Excessive walker vibration, worn wooden bush blocks', 6),
    ('CMB_GRAIN_AUGER', 'Grain Tank Unloading Auger & Flighting', 'ग्रेन टैंक अनलोडिंग ऑगर', 'Thin worn spiral flighting, seized auger swivel gearbox', 7),
    ('CMB_CLEANING_SIEVES', 'Cleaning Chaffer & Sieve Louvers', 'क्लीनिंग छलनी व चॉफर लौवर', 'Damaged sieve louvers, grain blower fan belt slipping', 8)
) AS p(code, name, hindi, description_text, ord)
WHERE t.code = 'TYPE-AGRI-CMB'
ON CONFLICT DO NOTHING;

-- (D) TIPPING TROLLEY / TRAILER SPECIFIC COMPONENTS (TYPE-DUAL-TRL)
INSERT INTO maintenance_damage_components (equipment_type_id, part_code, name, hindi_name, category, description, display_order, is_universal, active)
SELECT
    t.id, p.code, p.name, p.hindi, 'TRAILER_ASSEMBLY', p.description_text, p.ord, FALSE, TRUE
FROM equipment_types t
CROSS JOIN (VALUES
    ('TRL_HYD_RAM', 'Multi-Stage Tipping Hydraulic Ram / Cylinder', 'हाइड्रोलिक टिपर जैक सिलेंडर', 'Oil seal blowout, scored ram chrome piston, slow lifting', 1),
    ('TRL_LEAF_SPRINGS', 'Leaf Spring Suspension & U-Bolts', 'कमानी पत्ती व यू-बोल्ट', 'Cracked master leaf, loose U-clamp nuts, broken centre pin', 2),
    ('TRL_WHEEL_HUB', 'Heavy Wheel Hub & Taper Roller Bearings', 'पहिया हब व रोलर बेयरिंग', 'Worn bearing races, grease seal leakage, loose wheel studs', 3),
    ('TRL_TOWING_HITCH', 'Drawbar Eye & Towing Hitch Ring', 'टोइंग हुक रिंग व हिच पिन', 'Elongated tow eye, cracked drawbar tongue weld', 4),
    ('TRL_TAILGATE_LATCH', 'Tailgate Hinge & Automatic Locking Latches', 'डाला कब्जा व ऑटोमैटिक कुंडी', 'Bent tailgate latch rod, deformed rear door hinges', 5)
) AS p(code, name, hindi, description_text, ord)
WHERE t.code = 'TYPE-DUAL-TRL'
ON CONFLICT DO NOTHING;

-- (E) TRACTOR-PTO EARTH AUGER SPECIFIC COMPONENTS (TYPE-DUAL-PTO-AUG)
INSERT INTO maintenance_damage_components (equipment_type_id, part_code, name, hindi_name, category, description, display_order, is_universal, active)
SELECT
    t.id, p.code, p.name, p.hindi, 'AUGER_ASSEMBLY', p.description_text, p.ord, FALSE, TRUE
FROM equipment_types t
CROSS JOIN (VALUES
    ('AUG_DRILL_BIT', 'Auger Pilot Point & Fishtail Drill Bit', 'बरमा पायलट पॉइंट व ड्रिल बिट', 'Blunt lead screw tip, missing tungsten carbide teeth', 1),
    ('AUG_CUTTING_EDGE', 'Reversible Cutting Edge Blades', 'कटिंग एज ब्लेड प्लेट', 'Severely worn blade edges, sheared mounting bolts', 2),
    ('AUG_SPIRAL_FLIGHT', 'Spiral Flighting & Central Tube Axle', 'स्पाइरल स्पिंडल व सेंट्रल ट्यूब', 'Bent center pipe from rocky impact, torn flighting weld', 3),
    ('AUG_BEVEL_GEARBOX', 'Auger Heavy-Duty Bevel Gearbox', 'ऑगर बेवल गियरबॉक्स', 'Overheating gearbox, damaged ring & pinion teeth', 4),
    ('AUG_SHEAR_PIN', 'PTO Drive Shaft Safety Shear Pin & Cross', 'पीटीओ शियर पिन व यू-क्रॉस', 'Broken shear bolt, loose yoke splines', 5)
) AS p(code, name, hindi, description_text, ord)
WHERE t.code = 'TYPE-DUAL-PTO-AUG'
ON CONFLICT DO NOTHING;

-- (F) DIESEL GENERATOR SPECIFIC COMPONENTS (TYPE-DUAL-GEN)
INSERT INTO maintenance_damage_components (equipment_type_id, part_code, name, hindi_name, category, description, display_order, is_universal, active)
SELECT
    t.id, p.code, p.name, p.hindi, 'GENSET_ASSEMBLY', p.description_text, p.ord, FALSE, TRUE
FROM equipment_types t
CROSS JOIN (VALUES
    ('GEN_AVR_UNIT', 'Automatic Voltage Regulator (AVR)', 'ऑटोमैटिक वोल्टेज रेगुलेटर (AVR)', 'Voltage fluctuation, no AC output voltage generation', 1),
    ('GEN_ALT_STATOR', 'Alternator Stator & Rotor Windings', 'अल्टरनेटर स्टेटर व रोटर वाइंडिंग', 'Burnt winding insulation, grounded coil, brush wear', 2),
    ('GEN_INJECTOR_GOV', 'Mechanical / Electronic Fuel Governor', 'इंजन फ्यूल गवर्नर व एक्चुएटर', 'Engine hunting (RPM fluctuation), erratic frequency control', 3),
    ('GEN_STARTER_SOLENOID', 'Starter Motor Solenoid & Relay', 'सेल्फ स्टार्टर रिले व सोलेनोइड', 'Clicking noise but engine not cranking, burnt contactor', 4),
    ('GEN_COOLING_RADIATOR', 'Radiator Core & Water Coolant Pump', 'रेडिएटर कोर व कूलेंट पंप', 'Engine overheating cutoff, coolant leakage from water pump seal', 5)
) AS p(code, name, hindi, description_text, ord)
WHERE t.code = 'TYPE-DUAL-GEN'
ON CONFLICT DO NOTHING;

-- (G) BACKHOE LOADER SPECIFIC COMPONENTS (TYPE-DUAL-BHL)
INSERT INTO maintenance_damage_components (equipment_type_id, part_code, name, hindi_name, category, description, display_order, is_universal, active)
SELECT
    t.id, p.code, p.name, p.hindi, 'BACKHOE_ASSEMBLY', p.description_text, p.ord, FALSE, TRUE
FROM equipment_types t
CROSS JOIN (VALUES
    ('BHL_BUCKET_TEETH', 'Excavator Bucket Teeth & Adaptors', 'खोदाई बकेट के दांत व पिन', 'Worn or missing bucket teeth, broken lock pins', 1),
    ('BHL_BOOM_CYLINDER', 'Boom & Dipper Arm Hydraulic Cylinders', 'बूम व डिपर हाइड्रोलिक सिलेंडर', 'Piston rod seal leak, deep cylinder rod score marks', 2),
    ('BHL_SWING_CYLINDER', 'Swing Mechanism & Pivot Bushings', 'स्विंग मैकेनिज्म व पिवट बुश', 'Excessive slew play, damaged swing lock pin', 3),
    ('BHL_STABILIZER_LEG', 'Rear Stabilizer Pad & Outrigger Valve', 'स्टेबलाइजर लेग व हाइड्रोलिक लॉक', 'Stabilizer cylinder creep down, bent foot pad', 4),
    ('BHL_CONTROL_VALVES', 'Multi-Spool Hydraulic Control Bank', 'हाइड्रोलिक कंट्रोल वाल्व बैंक', 'Spool leaking, sluggish joystick response', 5)
) AS p(code, name, hindi, description_text, ord)
WHERE t.code = 'TYPE-DUAL-BHL'
ON CONFLICT DO NOTHING;

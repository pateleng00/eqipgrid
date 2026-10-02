-- EquipGrid V2: Seed Baseline Equipment Fleet from DPR with Short Enums

-- Initial Users (role: 1=CUSTOMER, 2=OPERATOR, 3=TECHNICIAN, 4=DRIVER, 5=DEALER, 6=MANAGER, 7=ADMIN)
INSERT INTO users (username, password_hash, full_name, role, phone, active) VALUES
('admin', '$2a$10$7zB3cW0L1t4.F9jH1m0e2u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6', 'EquipGrid Admin', 7, '+919876543210', true),
('ops_lead', '$2a$10$7zB3cW0L1t4.F9jH1m0e2u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6', 'Rajesh Sharma (Lead Tech)', 3, '+919876543211', true),
('operator1', '$2a$10$7zB3cW0L1t4.F9jH1m0e2u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6', 'Sunil Kumar (Certified Operator)', 2, '+919876543212', true)
ON CONFLICT (username) DO NOTHING;

-- Initial Dealers across Hardoi, Sandila, Bilgram
INSERT INTO dealers (name, trade_name, phone, location, commission_rate, active) VALUES
('Amit Verma', 'Hardoi Prime Cement Yard', '+919450001122', 'Hardoi Central', 0.0600, true),
('Mahesh Yadav', 'Sandila Agro & Hardware Center', '+919450002233', 'Sandila Industrial Area', 0.0600, true),
('Vikas Singh', 'Bilgram Construction Materials', '+919450003344', 'Bilgram Town', 0.0600, true)
ON CONFLICT (phone) DO NOTHING;

-- Seed Assets from DPR Section 2 (category: 1=CONSTRUCTION, 2=AGRICULTURE; status: 1=AVAILABLE)
INSERT INTO assets (asset_tag, name, category, model_name, serial_number, daily_rate, deposit_amount, purchase_cost, operator_required, status, condition_notes, accessories_included) VALUES
-- Concrete Mixers
('C-MIX-001', '10/7 Tilting Concrete Mixer (Diesel)', 1, 'Universal 10/7', 'SN-CM-8801', 1200.00, 5000.00, 60000.00, true, 1, 'Brand new, engine tuned, grease points checked', 'Tow bar, engine crank handle, grease gun'),
('C-MIX-002', '10/7 Tilting Concrete Mixer (Diesel)', 1, 'Universal 10/7', 'SN-CM-8802', 1200.00, 5000.00, 60000.00, true, 1, 'Pre-commissioned, high-torque hydraulic tip', 'Tow bar, engine crank handle'),

-- Vibrators
('C-VIB-001', 'Petrol Engine Concrete Vibrator', 1, 'Honda GX160 clone 5.5HP', 'SN-CV-4401', 400.00, 2000.00, 12000.00, false, 1, 'Ready for slab casting', '60mm needle shaft (flexible, 5m)'),
('C-VIB-002', 'Petrol Engine Concrete Vibrator', 1, 'Honda GX160 clone 5.5HP', 'SN-CV-4402', 400.00, 2000.00, 12000.00, false, 1, 'Clean air filter, high RPM test ok', '40mm needle shaft (flexible, 5m)'),
('C-VIB-003', 'Petrol Engine Concrete Vibrator', 1, 'Honda GX160 clone 5.5HP', 'SN-CV-4403', 400.00, 2000.00, 12000.00, false, 1, 'Ready for column pouring', '60mm needle shaft (flexible, 5m)'),

-- Plate Compactors / Earth Rammers
('C-CMP-001', 'Plate Compactor / Earth Rammer', 1, 'SpeedCraft PC-90 (Petrol)', 'SN-CP-3101', 800.00, 3000.00, 30000.00, false, 1, 'Heavy base plate, rubber mounts intact', 'Wheel attachment for yard transit'),
('C-CMP-002', 'Plate Compactor / Earth Rammer', 1, 'SpeedCraft PC-90 (Petrol)', 'SN-CP-3102', 800.00, 3000.00, 30000.00, false, 1, 'Excellent vibration compaction rating', 'Wheel attachment for yard transit'),

-- Jackhammers
('C-JKH-001', 'Heavy Demolition Jackhammer 16kg', 1, 'Bosch Type GSH 16-30 Hex', 'SN-JH-1001', 500.00, 2500.00, 10000.00, false, 1, 'High impact 45J hammer, tested on C25 block', '1x Pointed Chisel, 1x Flat Chisel, Carry case'),
('C-JKH-002', 'Heavy Demolition Jackhammer 16kg', 1, 'Bosch Type GSH 16-30 Hex', 'SN-JH-1002', 500.00, 2500.00, 10000.00, false, 1, 'Tested, grease filled', '1x Pointed Chisel, 1x Flat Chisel, Carry case'),
('C-JKH-003', 'Heavy Demolition Jackhammer 16kg', 1, 'Bosch Type GSH 16-30 Hex', 'SN-JH-1003', 500.00, 2500.00, 10000.00, false, 1, 'Ready for dispatch', '1x Pointed Chisel, Carry case'),
('C-JKH-004', 'Heavy Demolition Jackhammer 16kg', 1, 'Bosch Type GSH 16-30 Hex', 'SN-JH-1004', 500.00, 2500.00, 10000.00, false, 1, 'Ready for dispatch', '1x Flat Chisel, Carry case'),

-- Trash Pumps
('C-PMP-001', 'Portable 3-inch Petrol Trash Pump', 1, 'Kirloskar KTP-3', 'SN-TP-5001', 600.00, 2500.00, 11000.00, false, 1, 'Self-priming, high suction head', '3-inch suction hose 5m, strainer, clamps'),
('C-PMP-002', 'Portable 3-inch Petrol Trash Pump', 1, 'Kirloskar KTP-3', 'SN-TP-5002', 600.00, 2500.00, 11000.00, false, 1, 'De-watering ready', '3-inch suction hose 5m, strainer, clamps'),

-- Portable Generators
('C-GEN-001', 'Single-Phase Portable Generator 3.5kVA', 1, 'PowerGen 3500 (Petrol)', 'SN-PG-6201', 800.00, 3000.00, 18000.00, false, 1, 'Steady 230V AVR regulated', 'Industrial 16A plug top, earth spike'),
('C-GEN-002', 'Single-Phase Portable Generator 3.5kVA', 1, 'PowerGen 3500 (Petrol)', 'SN-PG-6202', 800.00, 3000.00, 18000.00, false, 1, 'Tested under full resistive load', 'Industrial 16A plug top, earth spike'),

-- Agriculture Equipment
('A-REP-001', 'Walk-Behind Power Reaper (Paddy/Wheat)', 2, 'VST Shakti 4R (Diesel)', 'SN-AR-9101', 2500.00, 8000.00, 135000.00, true, 1, 'Trained operator compulsory. Conveyor & blades sharpened', 'Spares cutter bar, guide guards, operator harness'),
('A-WED-001', 'Heavy-Duty 7HP Rotary Power Weeder', 2, 'KisanForce 7HP Petrol', 'SN-AW-7301', 1000.00, 3500.00, 38000.00, false, 1, 'Tillage blades fitted for inter-row weeding', 'Ditching blades, side disc guards, toolkit'),
('A-WED-002', 'Heavy-Duty 7HP Rotary Power Weeder', 2, 'KisanForce 7HP Petrol', 'SN-AW-7302', 1000.00, 3500.00, 38000.00, false, 1, 'Deep furrowing set included', 'Dryland rotor blades, ridger attachment'),
('A-AUG-001', 'Portable Post-Hole Earth Auger 68cc', 2, 'Agritech Pro Auger 68cc', 'SN-AA-2201', 600.00, 2000.00, 12000.00, false, 1, 'Dual handlebar, safety trigger lock', '8-inch spiral drill bit, 50cm extension rod')
ON CONFLICT (asset_tag) DO NOTHING;

-- Initial Verified Customer for testing (tier: 2=TIER_2_VERIFIED)
INSERT INTO customers (full_name, phone, email, address, aadhaar_number, tier, verified, notes) VALUES
('Ramesh Chandra Construction', '+919811223344', 'ramesh@chandra-build.in', 'Railway Station Road, Hardoi', '5544-3322-1100', 2, true, 'Trusted local residential contractor. Completed 5 past projects on time.')
ON CONFLICT (phone) DO NOTHING;

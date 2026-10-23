-- EquipGrid V26: Seed Comprehensive Manufacturers (OEMs) Catalog
-- Adds 66 distinct OEM machinery manufacturers across Civil Infra, Agricultural, and Dual-Use domains
-- Includes domestic leaders, global MNCs, and certified regional implement fabricators

INSERT INTO manufacturers (code, name, country, active)
VALUES
-- 1. Dual-Use & Heavy Earthmoving OEMs
('BULL', 'Bull Machines Private Limited', 'India', true),
('ACE', 'Action Construction Equipment (ACE)', 'India', true),
('ESCORTS', 'Escorts Kubota Limited', 'India', true),
('JCB', 'JCB India Limited', 'UK', true),
('CASE', 'Case Construction Equipment', 'USA', true),
('CAT', 'Caterpillar India (CAT)', 'USA', true),
('BOBCAT', 'Bobcat India (Doosan Bobcat)', 'USA', true),
('TATA-HITACHI', 'Tata Hitachi Construction Machinery', 'India', true),
('DITCH-WITCH', 'Ditch Witch India', 'USA', true),
('MTANDT', 'Mtandt Group', 'India', true),
('HAULOTTE', 'Haulotte India', 'France', true),

-- 2. Tractors & Power Units OEMs
('MAHINDRA', 'Mahindra & Mahindra', 'India', true),
('MAH-PWR', 'Mahindra Powerol', 'India', true),
('MAH-APP', 'Mahindra AppliTrac', 'India', true),
('JOHNDEERE', 'John Deere India', 'USA', true),
('NEWHOLLAND', 'New Holland Agriculture (CNH)', 'Italy', true),
('SONALIKA', 'Sonalika ITL (Solis Tractors)', 'India', true),
('KUBOTA', 'Kubota Agricultural Machinery India', 'Japan', true),
('YANMAR', 'Yanmar India', 'Japan', true),
('CUMMINS', 'Cummins India Limited', 'USA', true),
('KOEL', 'Kirloskar Oil Engines (KOEL)', 'India', true),
('GREAVES', 'Greaves Cotton Limited', 'India', true),

-- 3. Agricultural Implements & Harvesting OEMs
('FIELDKING', 'Fieldking (Beri Udyog)', 'India', true),
('SHAKTIMAN', 'Shaktiman (Tirth Agro Technology)', 'India', true),
('LANDFORCE', 'Landforce Agro', 'India', true),
('NATL-AGRO', 'National Agro Industries', 'India', true),
('MASCHIO', 'Maschio Gaspardo India', 'Italy', true),
('PREET', 'Preet Agro Industries', 'India', true),
('CLAAS', 'Claas India', 'Germany', true),
('KARTAR', 'Kartar Agro Industries', 'India', true),
('DASHMESH', 'Dashmesh Mechanical Works', 'India', true),
('STANDARD', 'Standard Combine Industries', 'India', true),
('PUNNI', 'Punni Agro Industries', 'India', true),
('AMAR', 'Amar Agricultural Implements', 'India', true),
('JAGATJIT', 'Jagatjit Group', 'India', true),
('KHEDUT', 'Khedut Agro Engineering', 'India', true),
('GRIMME', 'Grimme India', 'Germany', true),
('REDLANDS', 'Redlands Ashlyn Motors', 'India', true),
('GREENKRAFT', 'Greenkraft India', 'India', true),
('BCS', 'BCS India', 'Italy', true),
('KISANKRAFT', 'KisanKraft Limited', 'India', true),
('LOCAL-FAB', 'Certified Local Fabricators', 'India', true),

-- 4. Precision Agri, Spraying & Tools OEMs
('TRIMBLE', 'Spectra Precision (Trimble)', 'USA', true),
('FALCON', 'Falcon Garden & Agro Tools', 'India', true),
('ASPEE', 'Aspee Group', 'India', true),
('MITRA', 'Mitra Agro Equipments (Mahindra)', 'India', true),

-- 5. Concrete, Compaction & Civil Infrastructure OEMs
('SCHWING', 'Schwing Stetter India', 'Germany', true),
('AJAX', 'Ajax Engineering Limited', 'India', true),
('APOLLO-INF', 'Apollo Inffratech', 'India', true),
('DYNAPAC', 'Dynapac India', 'Sweden', true),
('SAFARI', 'Safari Construction Equipment', 'India', true),
('JAYMAC', 'Jaypee India (Jaymac)', 'India', true),
('WACKER', 'Wacker Neuson India', 'Germany', true),
('AMMANN', 'Ammann India', 'Switzerland', true),
('HAMM-WIRT', 'Hamm (Wirtgen Group)', 'Germany', true),
('SPARROCK', 'Sparrock Construction Tools', 'India', true),
('HUSQVARNA', 'Husqvarna India', 'Sweden', true),
('NORTON', 'Norton Clipper (Saint-Gobain)', 'France', true),

-- 6. Compressors, Air Tools & Demolition OEMs
('ATLASCOPCO', 'Atlas Copco India', 'Sweden', true),
('ELGI', 'Elgi Equipments Limited', 'India', true),
('CP', 'Chicago Pneumatic India', 'USA', true),
('HILTI', 'Hilti India Private Limited', 'Liechtenstein', true),

-- 7. High-Pressure Washing, Drainage & Pumping OEMs
('KARCHER', 'Kärcher India', 'Germany', true),
('HAWK-PUMPS', 'Hawk Pumps (Leucon India)', 'Italy', true),
('CRI-PUMPS', 'C.R.I. Pumps', 'India', true),
('CROMPTON', 'Crompton Greaves', 'India', true) ON CONFLICT (code) DO
UPDATE SET
    name = EXCLUDED.name,
    country = EXCLUDED.country,
    active = true;

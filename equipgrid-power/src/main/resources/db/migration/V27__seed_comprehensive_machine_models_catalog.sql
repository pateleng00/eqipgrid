-- EquipGrid V27: Seed Comprehensive Machine Models & Operational Fleet Catalog
-- Contains 126 authentic machine models (42 equipment types x 3 distinct OEMs)
-- Automatically fetches foreign keys (type_id, manufacturer_id, model_id, hub_id)
-- Joins hubs through cities and states to prevent hardcoded primary key violations
-- Sets hardcoded category IDs: 1=CONSTRUCTION, 2=AGRICULTURE, 3=MULTIPURPOSE_FLEET

-- ==============================================================================
-- 0. ENSURE PREREQUISITE OEM CODES EXIST
-- ==============================================================================

INSERT INTO manufacturers (code, name, country, active) VALUES
('VST', 'VST Tillers Tractors Ltd', 'India', true),
('BOSCH', 'Robert Bosch Power Tools', 'Germany', true),
('HONDA', 'Honda Power Products', 'India', true)
ON CONFLICT (code) DO NOTHING;

-- ==============================================================================
-- 1. SEED MACHINE MODELS (126 AUTHENTIC MODELS)
-- ==============================================================================

INSERT INTO machine_models (type_id, manufacturer_id, name, model_number, specs, active)
SELECT 
    t.id,
    m.id,
    v.model_name,
    v.model_number,
    v.specs,
    true
FROM (VALUES
    -- --------------------------------------------------------------------------
    -- CATEGORY 3: DUAL-USE FLEET (14 Types x 3 OEMs = 42 Models)
    -- --------------------------------------------------------------------------
    -- 1. Tractor-Mounted Backhoe Loader
    ('DUAL-BHL', 'BULL', 'Bull HD76 Super Loader Backhoe', 'BULL-BHL-76', '76 HP tractor backhoe loader, 1.0 m³ loader bucket, 0.24 m³ rear digger, 4.8m dig depth'),
    ('DUAL-BHL', 'ACE', 'ACE AX-130 Tractor Backhoe Attachment', 'ACE-AX130', 'Heavy backhoe attachment with dual hydraulic stabilizers, 130 HP tractor compatible, 4.5m digging reach'),
    ('DUAL-BHL', 'ESCORTS', 'Escorts Digmax II Tractor Mount', 'DIGMAX-II', 'Heavy duty trenching & loading backhoe arm with 4.8m digging depth and reinforced swing chassis'),

    -- 2. Heavy-Duty Tipping Trolley (5-10 Ton)
    ('DUAL-TRL', 'FIELDKING', 'Fieldking 10-Ton Hydraulic Tipper Trolley', 'FK-TT-10T', '10-Ton tandem axle tipper, dual hydraulic ram cylinders, drop-down heavy steel side gates'),
    ('DUAL-TRL', 'SONALIKA', 'Solis Heavy Hauler 8-Ton Tipper', 'SOL-TRL-8T', '8-Ton high-tensile steel trailer with reinforced drawbar & telescopic hydraulic tipping ram'),
    ('DUAL-TRL', 'STANDARD', 'Standard 10-Ton Dual-Use Farm Tipper', 'STD-TRL-10T', '10-Ton payload, reinforced channel chassis, dual leaf springs, farm grain and civil aggregate certified'),

    -- 3. Portable Diesel Generator (25-63 kVA)
    ('DUAL-GEN', 'KOEL', 'Kirloskar KG1-35AS 35 kVA Silent Genset', 'KG1-35AS', '35 kVA 3-phase soundproof canopy generator, KOEL 4R1040 engine, 415V dual terminal distribution'),
    ('DUAL-GEN', 'CUMMINS', 'Cummins X2.7-G2 30 kVA Silent Genset', 'CUMM-C30D5P', '30 kVA Prime power silent diesel generator with PowerCommand digital electronic governor'),
    ('DUAL-GEN', 'MAH-PWR', 'Mahindra Powerol 40 kVA CPCB IV+ Genset', 'MP-40KVA', '40 kVA fuel-efficient diesel generator, low noise 75 dBA acoustic enclosure, dual frequency capable'),

    -- 4. Tractor-PTO Driven Earth Auger
    ('DUAL-PTO-AUG', 'FIELDKING', 'Fieldking Heavy PTO Post Hole Digger', 'FK-PHD-900', 'Heavy duty bevel gearbox, 9" and 12" hardened auger bits, up to 36" depth, shear pin safety'),
    ('DUAL-PTO-AUG', 'SHAKTIMAN', 'Shaktiman Post Hole Digger PHD-100', 'SHK-PHD-100', 'Single-speed bevel gearbox, 12" heavy spiral bit, depth up to 1000mm, safety slip clutch'),
    ('DUAL-PTO-AUG', 'LANDFORCE', 'Landforce Tractor Auger DigPro 12', 'LF-AUG-12', 'Heavy tubular boom, 12" and 18" auger bits, rapid post hole digging for solar piling & tree plantation'),

    -- 5. Tractor-Mounted Front Loader
    ('DUAL-LDR', 'BULL', 'Bull Ultra Tractor Front End Loader', 'BULL-FL-U1', 'Heavy hydraulic lift capacity 1200kg, 3.8m dump height, single-lever joystick hydraulic control'),
    ('DUAL-LDR', 'MAH-APP', 'Mahindra AppliTrac Loader-Pro 575', 'MAH-LP-575', 'Matched to 50-60 HP tractors, 1000kg payload bucket, mechanical self-leveling linkage'),
    ('DUAL-LDR', 'ACE', 'ACE TL-1000 Tractor Front Loader', 'ACE-TL1000', '1000kg load capacity, 0.6 m³ heavy bucket for sand, gravel, and agricultural bulk handling'),

    -- 6. Towable Water Tanker (5000L+)
    ('DUAL-TNK', 'NATL-AGRO', 'National Agro 5000L Epoxy Water Tanker', 'NAT-WT-5000', '5000 Litre epoxy lined MS tank, 3" discharge valve, tractor drawbar hitch, rear gravity spray bar'),
    ('DUAL-TNK', 'LOCAL-FAB', 'Kisan Fabricators 6000L Heavy Tanker', 'KF-WT-6000', '6000 Litre corrugated tank, leaf spring suspension, twin axle, dual rear discharge taps'),
    ('DUAL-TNK', 'FIELDKING', 'Fieldking 5000L Water Bowser & Sprayer', 'FK-WB-5000', '5000 Litre capacity, internal anti-surge baffle plates, optional PTO high-pressure spray pump mount'),

    -- 7. Mini Tracked Excavator (3-5 Ton)
    ('DUAL-MEX', 'YANMAR', 'Yanmar ViO35 Zero Tail Swing Mini Excavator', 'VIO35-6B', '3.5 Ton operating weight, Yanmar 3TNV88 engine (24.4 HP), 0.11 m³ bucket, rubber crawler tracks'),
    ('DUAL-MEX', 'KUBOTA', 'Kubota U35-4 Compact Excavator', 'U35-4', '3.6 Ton operating weight, zero tail swing, 24.8 HP Kubota diesel engine, 3.1m digging depth'),
    ('DUAL-MEX', 'TATA-HITACHI', 'Tata Hitachi ZAXIS 33U Mini Excavator', 'ZX33U-5A', '3.4 Ton mini excavator, high fuel efficiency, auxiliary hydraulic lines for rock breaker attachment'),

    -- 8. Tractor-Fitted Hydra Crane (2-3T)
    ('DUAL-HYD', 'ACE', 'ACE Tractor Hydra Crane 3-Ton', 'ACE-THC-03', '3-Ton maximum capacity, 3-stage hydraulic telescopic boom, 8.5m hook height, front axle lock'),
    ('DUAL-HYD', 'BULL', 'Bull Tractor Crane TC-2500', 'BULL-TC2500', '2.5-Ton lift capacity, tractor rear 3-point mount, dual front outrigger stabilizer legs'),
    ('DUAL-HYD', 'ESCORTS', 'Escorts HydraTrac 3T Utility Crane', 'ESC-HT-03', '3-Ton tractor powered mobile yard crane with 360-degree snatch block and hydraulic winch'),

    -- 9. 4WD Utility Tractor (50-60 HP)
    ('DUAL-TRAC', 'MAHINDRA', 'Mahindra Arjun Novo 605 DI-i-4WD (57 HP)', 'NOVO-605-4WD', '57 HP 4-cylinder CRDe engine, 4WD heavy front axle, 2200kg lift capacity, 15F+15R shuttle transmission'),
    ('DUAL-TRAC', 'JOHNDEERE', 'John Deere 5310 GearPro 4WD (55 HP)', 'JD-5310-4WD', '55 HP turbocharged engine, dual clutch, top shaft synchromesh 12F+4R, heavy 4WD planetary drive'),
    ('DUAL-TRAC', 'SONALIKA', 'Sonalika Tiger DI 55 4WD (55 HP)', 'TIGER-55-4WD', '55 HP CRDS high-torque engine, 4WD drive, 2000kg hydraulic lift, dual PTO 540/540E'),

    -- 10. High-Pressure Washing Unit (Skid 200 Bar)
    ('DUAL-WSH', 'KARCHER', 'Kärcher HD 7/16-4 Cage Professional Washer', 'KARCH-HD7-16', '160-200 Bar operating pressure, 700 L/h flow rate, 4-pole electric motor, tubular cage frame'),
    ('DUAL-WSH', 'HAWK-PUMPS', 'Hawk Ultra Skid Diesel High-Pressure Jetter', 'HAWK-SKID-200', '200 Bar ceramic plunger pump, 14 L/min, powered by 10 HP air-cooled diesel engine'),
    ('DUAL-WSH', 'WACKER', 'Wacker Neuson HPW-200 Pressure Cleaner', 'WN-HPW-200', 'Heavy-duty 200 Bar high pressure washer with steel-braided hose and chemical injector'),

    -- 11. Mobile Disc Wood & Residue Chipper
    ('DUAL-CHP', 'REDLANDS', 'Redlands Champion Bio-Waste Chipper 6"', 'RED-CHI-6', '6-inch diameter wood branch & agri residue shredder, tractor PTO driven, dual reversible blades'),
    ('DUAL-CHP', 'GREENKRAFT', 'Greenkraft GK-150 Mobile Residue Shredder', 'GK-150-CHIP', '150mm chipping disc capacity, hydraulic in-feed rollers, 360-degree discharge chute'),
    ('DUAL-CHP', 'SHAKTIMAN', 'Shaktiman Mobile Biomass Chipper MC-100', 'SHK-MC-100', 'Heavy flywheel disc chipper for orchard prunings, cotton stalks, and wood branches'),

    -- 12. Tractor-Mounted Hydraulic Trencher
    ('DUAL-TRN', 'DITCH-WITCH', 'Ditch Witch C30X Tractor Mount Trencher', 'DW-C30X-TR', 'Chain trencher up to 48" depth, 6-12" width, heavy carbide shark teeth for rocky soil'),
    ('DUAL-TRN', 'BULL', 'Bull GroundMaster Tractor Trencher', 'BULL-TRN-120', '1200mm maximum trench depth, dual side spoil augers, continuous hydraulic chain drive'),
    ('DUAL-TRN', 'FIELDKING', 'Fieldking Heavy Pipeline Trencher', 'FK-TRN-100', 'PTO-driven trench cutter for underground pipe laying, irrigation cables, and electrical conduits'),

    -- 13. Towable Hydraulic Boom Lift (12-15m)
    ('DUAL-LIFT', 'ACE', 'ACE Aerial Work Platform TBL-14', 'ACE-TBL14', '14m working height, towable articulated knuckle boom, 200kg basket capacity, hydraulic outriggers'),
    ('DUAL-LIFT', 'MTANDT', 'Mtandt Aujasya Towable Cherry Picker 12m', 'MT-AUJ-12M', '12m working height, battery & diesel hybrid powered, compact towable trailer chassis'),
    ('DUAL-LIFT', 'HAULOTTE', 'Haulotte Quick-Up 14 Towable Hydraulic Lift', 'HAUL-QU14', '14.2m working platform, compact transport dimensions, rapid hydraulic self-deployment'),

    -- 14. Heavy-Duty Submersible Slurry Pump Set
    ('DUAL-SLR', 'KOEL', 'Kirloskar KDS-515+ Slurry Dewatering Pump', 'KIRL-KDS-515', '5 HP 3-phase submersible slurry pump, high-chrome impeller, handles up to 30mm solid mud'),
    ('DUAL-SLR', 'CRI-PUMPS', 'CRI SMV Series Heavy Mud & Slurry Pump 7.5HP', 'CRI-SMV-7.5', '7.5 HP non-clog cutter impeller, 1200 LPM discharge rate, cast iron heavy casing'),
    ('DUAL-SLR', 'CROMPTON', 'Crompton CG-SLURRY 5.0 Submersible Mud Pump', 'CG-SLR-50', '5 HP sewage and slurry handling pump with built-in thermal overload protector'),

    -- --------------------------------------------------------------------------
    -- CATEGORY 2: AGRI SPECIALIZED (14 Types x 3 OEMs = 42 Models)
    -- --------------------------------------------------------------------------
    -- 1. Rotavator / Rotary Tiller
    ('AGRI-ROTA', 'SHAKTIMAN', 'Shaktiman Champion Series Rotavator 7-Feet', 'SHK-CHAMP-7', '7-feet width, multi-speed gearbox, 54 L-type boron steel blades, depth up to 7 inches'),
    ('AGRI-ROTA', 'FIELDKING', 'Fieldking Maxx Multi-Speed Rotavator 6-Feet', 'FK-MAXX-6', '6-feet working width, heavy duty gear drive in oil bath, adjustable trailing board'),
    ('AGRI-ROTA', 'MASCHIO', 'Maschio Gaspardo Virat 205 Rotavator', 'MAS-VIRAT-205', '2.05m working width, 48 boron blades, heavy cast-iron frame, suitable for 50-65 HP'),

    -- 2. Multi-Crop Combine Harvester
    ('AGRI-CMB', 'PREET', 'Preet 987 Self-Propelled Multi-Crop Combine', 'PREET-987', '101 HP 6-cylinder diesel engine, 14-feet cutter bar, 1800kg grain tank capacity'),
    ('AGRI-CMB', 'CLAAS', 'Claas Crop Tiger 40 Wheel Combine', 'CLAAS-CT40', '76 HP turbocharged engine, multi-crop tangential threshing mechanism, 1.2 m³ grain tank'),
    ('AGRI-CMB', 'KARTAR', 'Kartar 4000 Self-Propelled Harvester', 'KARTAR-4000', '101 HP Ashok Leyland engine, 14-feet wide cutter bar, heavy duty straw walker system'),

    -- 3. Laser Land Leveler
    ('AGRI-LVL', 'TRIMBLE', 'Trimble Spectra Precision GL422N Laser Leveler', 'TRIM-GL422N', 'Dual grade laser transmitter, CR600 laser receiver, hydraulic CB40 control box'),
    ('AGRI-LVL', 'DASHMESH', 'Dashmesh 846 Laser Guided Land Leveler 7-Feet', 'DASH-846-LL', '7-feet high-carbon steel bucket, heavy double-mast hydraulic mast, wireless remote'),
    ('AGRI-LVL', 'FALCON', 'Falcon Agro Laser Leveler Master 8-Feet', 'FALC-LL-8FT', '8-feet heavy scrap blade bucket, auto-cut hydraulic proportional valve system'),

    -- 4. Paddy Rice Transplanter
    ('AGRI-RTP', 'KUBOTA', 'Kubota NSP-4W Walk-Behind Rice Transplanter', 'KUB-NSP-4W', '4-row planting, 4.3 HP OHV petrol engine, adjustable row-to-row spacing 30cm'),
    ('AGRI-RTP', 'YANMAR', 'Yanmar AP4 4-Row Walk-Behind Rice Transplanter', 'YAN-AP4', '4-row planting, 4.0 HP engine, rotary planting claw mechanism, lightweight flotation wheels'),
    ('AGRI-RTP', 'VST', 'VST Yanmar 8-Row Ride-On Transplanter', 'VST-8ROW-RTP', '8-row ride-on high-speed transplanting, 16 HP diesel engine, automatic seedling feeder'),

    -- 5. Reaper-Binder Attachment
    ('AGRI-RPB', 'BCS', 'BCS 622 Power Reaper-Binder (3-Wheel)', 'BCS-622-RB', '10 HP diesel engine, 1.4m cutting width, cuts and binds wheat & paddy into neat bundles'),
    ('AGRI-RPB', 'NATL-AGRO', 'National Tractor-Front Mount Reaper-Binder 4-Row', 'NAT-RB-4R', 'Tractor front-fitted PTO binder, automatic twine knotter, covers 1 acre per hour'),
    ('AGRI-RPB', 'VST', 'VST 130DI Reaper-Binder Walk-Behind', 'VST-130-RB', '13 HP diesel engine, cuts and tight-twine binds crop stalks at 5cm above ground'),

    -- 6. Pneumatic Planter / Seed Drill
    ('AGRI-SDR', 'NATL-AGRO', 'National 9-Tyne Zero Till Seed Drill', 'NAT-ZTD-9', '9-tyne inverted T-type openers, separate seed & fertilizer boxes with fluted rollers'),
    ('AGRI-SDR', 'FIELDKING', 'Fieldking 11-Tyne Multi-Crop Seed Drill', 'FK-SDR-11T', '11-row seed drill with depth control wheels, calibrated metering for wheat, mustard & gram'),
    ('AGRI-SDR', 'LANDFORCE', 'Landforce Pneumatic Planter 4-Row Precision', 'LF-PNEU-4R', '4-row air-assisted vacuum seed planter for maize, soybean, and cotton with uniform spacing'),

    -- 7. Tractor PTO Straw Baler
    ('AGRI-BLR', 'NEWHOLLAND', 'New Holland BC5060 Small Square Baler', 'NH-BC5060', 'High-density square baler, 1.8m pick-up width, heavy duty knotter, 540 RPM PTO'),
    ('AGRI-BLR', 'SHAKTIMAN', 'Shaktiman Round Straw Baler SRB-60', 'SHK-SRB-60', 'Mini round baler for paddy & wheat straw, produces 20-25kg compact round bales'),
    ('AGRI-BLR', 'CLAAS', 'Claas Markant 650 High Density Square Baler', 'CLAAS-M650', 'Wide pick-up, double knotter system, heavy flywheel for smooth PTO baling'),

    -- 8. High-Capacity Boom Sprayer
    ('AGRI-SPR', 'ASPEE', 'Aspee Tractor Mounted Boom Sprayer 500L', 'ASP-TMS-500', '500 Litre chemical tank, 12m wide folding boom, 24 brass mist nozzles, triple diaphragm pump'),
    ('AGRI-SPR', 'MITRA', 'Mitra Bullet Tractor Boom Sprayer 600L', 'MITRA-BLT-600', '600 Litre UV-stabilized tank, 12m hydraulic boom, Italian AR diaphragm pump'),
    ('AGRI-SPR', 'FIELDKING', 'Fieldking Trailed Boom Sprayer 1000L', 'FK-TBS-1000', '1000 Litre trailed sprayer, 15m folding boom, pressure regulation valve & agitation jet'),

    -- 9. Walk-Behind Power Weeder (7-9 HP)
    ('AGRI-WDB', 'VST', 'VST RT65 Power Weeder 7HP', 'VST-RT65', '7 HP petrol-kerosene engine, 650mm rotary tilling width, forward/reverse gears'),
    ('AGRI-WDB', 'KISANKRAFT', 'KisanKraft KK-IC-350D Diesel Power Weeder 7HP', 'KK-IC-350D', '7 HP 296cc diesel engine, adjustable 800-1100mm tilling blades, heavy PTO drive'),
    ('AGRI-WDB', 'HUSQVARNA', 'Husqvarna TF 545P Heavy Cultivator 9HP', 'HUSQ-TF545', '9 HP Husqvarna engine, 110cm working width, pneumatic wheels & ditcher attachment'),

    -- 10. Super Seeder (Stubble Management)
    ('AGRI-SSD', 'SHAKTIMAN', 'Shaktiman Super Seeder 7-Feet', 'SHK-SS-7FT', 'Combined rotavator & seed drill, cuts & mulches standing paddy stubble while sowing wheat'),
    ('AGRI-SSD', 'FIELDKING', 'Fieldking Maxx Super Seeder 8-Feet', 'FK-SS-8FT', '8-feet heavy chassis, boron steel blades, nickel-coated metering disc, 55-65 HP compatible'),
    ('AGRI-SSD', 'JAGATJIT', 'Jagatjit Deluxe Super Seeder 7-Feet', 'JAG-SS-7FT', 'Heavy-duty gearbox, 60 blades, calibrated fertilizer placement, anti-choke seed funnels'),

    -- 11. Multi-Crop High-Speed Thresher
    ('AGRI-THR', 'DASHMESH', 'Dashmesh 933 Multi-Crop Thresher', 'DASH-MCT-933', 'Tractor PTO driven, dual blower system, handles wheat, soybean, mustard & gram'),
    ('AGRI-THR', 'PREET', 'Preet Toka Multi-Crop Thresher 50HP', 'PREET-THR-50', '50 HP PTO driven, cutter-type threshing drum, clean grain elevator with bagging attachment'),
    ('AGRI-THR', 'PUNNI', 'Punni High-Output Multi-Crop Thresher', 'PUNNI-MCT-01', 'High-speed triple sieve cleaning mechanism, zero grain breakage, 15-20 quintals/hr'),

    -- 12. Heavy-Duty PTO Chaff Cutter
    ('AGRI-CHF', 'AMAR', 'Amar Tractor PTO Chaff Cutter 3-Blade', 'AMAR-CC-PTO', 'Tractor PTO operated, 3 high-carbon blades, reverse gear safety feeder, 3-5 ton/hr output'),
    ('AGRI-CHF', 'NATL-AGRO', 'National Heavy Chaff Cutter with Conveyor', 'NAT-CC-CONV', 'Belt conveyor automatic infeed, reversible roller gearbox, cuts green fodder & dry stover'),
    ('AGRI-CHF', 'KISANKRAFT', 'KisanKraft KK-FCR-3000 Electric/PTO Cutter', 'KK-FCR-3000', 'Heavy duty cast iron casing, dual drive electric & tractor PTO, 2500 kg/hr output'),

    -- 13. Automatic Potato Planter & Digger
    ('AGRI-POT', 'GRIMME', 'Grimme GL-220 2-Row Cup Potato Planter', 'GRIMME-GL220', '2-row precision cup feeding, adjustable seed spacing 15-35cm, fertilizer placement attachment'),
    ('AGRI-POT', 'KHEDUT', 'Khedut 2-Row Automatic Potato Planter', 'KHED-PP-2R', 'Automatic cup elevator, ridger discs, uniform seed depth control for high yield'),
    ('AGRI-POT', 'FIELDKING', 'Fieldking Vibratory Potato Digger 1-Row', 'FK-PD-1R', 'Tractor PTO vibratory conveyor digger, lifts tubers without skin damage, separates soil'),

    -- 14. Self-Propelled Walk-Behind Reaper
    ('AGRI-RPR', 'BCS', 'BCS 622 Walk-Behind Reaper 4-Feet', 'BCS-622-4F', '10 HP diesel engine, 1.2m cutter bar, side windrow conveyor delivers neat crop windrow'),
    ('AGRI-RPR', 'VST', 'VST Shakti 5-Feet Self-Propelled Reaper', 'VST-SPR-5F', '5.5 HP diesel engine, twin flotation wheels, cuts paddy and wheat at 2 inches from soil'),
    ('AGRI-RPR', 'KISANKRAFT', 'KisanKraft KK-SPR-1200D Walk-Behind Reaper', 'KK-SPR-1200', '6 HP diesel engine, 120cm working width, 1 acre in 1.5 hours, ideal for small farm plots'),

    -- --------------------------------------------------------------------------
    -- CATEGORY 1: CIVIL INFRA (14 Types x 3 OEMs = 42 Models)
    -- --------------------------------------------------------------------------
    -- 1. Full-Sized Backhoe Loader (JCB 3DX)
    ('CIVIL-BHL', 'JCB', 'JCB 3DX Super EcoXcellence 4WD', 'JCB-3DX-SUP', '76 HP JCB ecoMAX engine, 4WD drive, 1.1 m³ loader bucket, 0.26 m³ backhoe bucket, 4.77m digging depth'),
    ('CIVIL-BHL', 'CASE', 'CASE 770 EX Magnum Backhoe Loader', 'CASE-770EX', '76 HP FPT industrial engine, heavy-duty S-boom backhoe, variable displacement hydraulic pump'),
    ('CIVIL-BHL', 'MAHINDRA', 'Mahindra EarthMaster SX 4WD Backhoe Loader', 'MAH-EM-SX', '74 HP DITEC engine, Banana Boom geometry, telematics DigiSense enabled, 4.88m dig depth'),

    -- 2. Self-Loading Concrete Mixer
    ('CIVIL-SLM', 'AJAX', 'Ajax Fiori ARGO 4000 Self-Loading Mixer 4m³', 'AJAX-ARGO-4000', '4.0 m³ batch output concrete mixer, 110 HP engine, 4WD 4-wheel steer, electronic weigh-batching system'),
    ('CIVIL-SLM', 'SCHWING', 'Schwing Stetter SLM 4000 Self-Loading Mixer', 'SS-SLM-4000', '4.0 m³ drum capacity, electronic batching with digital print receipt, hydrostatic 4-wheel drive'),
    ('CIVIL-SLM', 'SAFARI', 'Safari Self-Loading Concrete Mixer SLM 2.5', 'SAF-SLM-2.5', '2.5 m³ drum capacity, hydraulic loading bucket with gate, electronic weigh cells'),

    -- 3. Walk-Behind Vibratory Soil Roller
    ('CIVIL-WBR', 'CASE', 'CASE 1107 EX Soil Compactor (11-Ton)', 'CASE-1107EX', '11-Ton class soil roller, 105 HP turbocharged engine, dual amplitude vibratory drum'),
    ('CIVIL-WBR', 'HAMM-WIRT', 'HAMM 311 Compactor (11-Ton Soil Roller)', 'HAMM-311', '11-Ton operating weight, 3-point articulated pendulum joint, high compaction force 240 kN'),
    ('CIVIL-WBR', 'DYNAPAC', 'Dynapac CA 250 D Vibratory Soil Roller (11-Ton)', 'DYNA-CA250D', '11-Ton single drum roller, Cummins B3.3 engine, heavy duty eccentric shaft mechanism'),

    -- 4. Portable Concrete Mixer (Diesel/Elec)
    ('CIVIL-MIX', 'SCHWING', 'Schwing Stetter 10/7 CFT Hopper Mixer', 'SS-MIX-107', '10 cu ft unmixed / 7 cu ft mixed batch, hydraulic loading hopper, 6 HP air-cooled diesel'),
    ('CIVIL-MIX', 'SAFARI', 'Safari 10/7 Hydraulic Hopper Cement Mixer', 'SAF-MIX-107H', 'Heavy-duty steel channel chassis, wire-rope hydraulic hopper, 6.5 HP diesel engine'),
    ('CIVIL-MIX', 'LOCAL-FAB', 'Bharat 10/7 Tilting Drum Concrete Mixer', 'BHARAT-MIX-107', 'Cast iron ring gear drum, diesel engine driven, heavy towing tow-bar with pneumatic wheels'),

    -- 5. Mechanical Concrete Vibrator Needle
    ('CIVIL-VIB', 'WACKER', 'Wacker Neuson M2500 Poker Vibrator', 'WN-M2500', '2.3 kW motor, 60mm vibrating poker head, 5m flexible shaft, 12,000 vibrations/min'),
    ('CIVIL-VIB', 'GREAVES', 'Greaves 5.5HP Diesel Poker Concrete Vibrator', 'GRV-VIB-55D', '5.5 HP diesel engine drive, 50mm needle, 6m flexible heavy drive shaft, anti-vibration base'),
    ('CIVIL-VIB', 'BULL', 'Bull Power Poker Vibrator 5.0HP Petrol', 'BULL-PV-50', '5.0 HP 4-stroke petrol engine, 60mm diameter needle, quick-connect drive dog coupling'),

    -- 6. Towable Diesel Air Compressor
    ('CIVIL-CMP', 'ATLASCOPCO', 'Atlas Copco XAS 48 Diesel Compressor 100 CFM', 'AC-XAS-48', '100 CFM free air delivery at 7 Bar, Kubota 3-cylinder diesel, HardHat canopy, road towable'),
    ('CIVIL-CMP', 'ELGI', 'Elgi PG 110-100 Trolley Mounted Compressor', 'ELGI-PG-110', '110 CFM delivery at 100 PSI, Tata/Kirloskar diesel engine, twin air outlet valves'),
    ('CIVIL-CMP', 'CP', 'Chicago Pneumatic CPS 90 Screw Compressor', 'CP-CPS-90', '90 CFM output at 7 Bar, sound attenuated canopy, high efficiency rotary screw air end'),

    -- 7. Tractor-Mounted Grader Attachment
    ('CIVIL-GRD', 'BULL', 'Bull Tractor Grader Blade 8-Feet', 'BULL-TGB-8', '8-feet heavy grader blade, 360-degree rotation, hydraulic tilt & angle adjustment for rural roads'),
    ('CIVIL-GRD', 'FIELDKING', 'Fieldking Heavy Terracer Blade 7-Feet', 'FK-TB-7FT', '7-feet reversible high-carbon cutting edge, heavy duty pivot pin, road leveling & canal bunding'),
    ('CIVIL-GRD', 'LANDFORCE', 'Landforce Hydraulic Grader Blade GraderPro 8', 'LF-GB-8FT', 'Heavy box chassis, dual hydraulic cylinders for pitch and angle control from tractor seat'),

    -- 8. De-Watering High-Delivery Pump Set
    ('CIVIL-PMP', 'KOEL', 'Kirloskar KDI-30 3-inch Diesel Dewatering Pump', 'KOEL-KDI-30', '3-inch self-priming pump, 5 HP KOEL diesel engine, 1000 LPM discharge, handles muddy slurry'),
    ('CIVIL-PMP', 'GREAVES', 'Greaves 4-inch Heavy Trash Pump Set 8HP', 'GRV-PMP-4IN', '4-inch suction/discharge, 8 HP Greaves diesel engine, 1800 LPM high volume delivery'),
    ('CIVIL-PMP', 'LOCAL-FAB', 'FieldMaster 3-inch High-Head Mud Pump', 'FM-PMP-3IN', '3-inch self priming dewatering trash pump powered by 6.5 HP 4-stroke petrol engine'),

    -- 9. Heavy Demolition Jackhammer (25-30kg)
    ('CIVIL-JKH', 'HILTI', 'Hilti TE 3000-AVR Heavy Demolition Breaker (30kg)', 'HILTI-TE3000', '68 Joules impact energy, Active Vibration Reduction (AVR), 1800W brushless motor, hex 28mm chuck'),
    ('CIVIL-JKH', 'SPARROCK', 'Sparrock Pneumatic Road Breaker 30kg', 'SPAR-PB-30', 'Pneumatic 30kg heavy road breaker, 1200 bpm, alloy steel forged cylinder for tarmac breaking'),
    ('CIVIL-JKH', 'WACKER', 'Wacker Neuson EH 75 Heavy Electric Breaker', 'WN-EH75', '75 Joules impact energy, 2050W hollow motor, full-hood vibration dampening system'),

    -- 10. Tamping Rammer / Jumping Jack (80kg)
    ('CIVIL-RAM', 'WACKER', 'Wacker Neuson BS 60-4 Tamping Rammer (72kg)', 'WN-BS60-4', '4-stroke GXR120 petrol engine, 18 kN impact force, 680 blows/min, shoe size 280x340mm'),
    ('CIVIL-RAM', 'AMMANN', 'Ammann ATR 68 Classic Tamping Rammer (68kg)', 'AMM-ATR-68', 'Honda GX100 engine, 13 kN impact force, low hand-arm vibration guide handle'),
    ('CIVIL-RAM', 'SAFARI', 'Safari SR-80 Heavy Soil Tamping Rammer', 'SAF-SR-80', '80kg operating weight, 4 HP petrol engine, steel reinforced laminated wooden shoe'),

    -- 11. Ride-On Tandem Asphalt Roller (1-2 Ton)
    ('CIVIL-ROL', 'ACE', 'ACE RD 100 Tandem Vibratory Roller (1-Ton)', 'ACE-RD100', '1.1-Ton operating weight, 18 HP water-cooled diesel engine, hydrostatic drive, double drum vibration'),
    ('CIVIL-ROL', 'CAT', 'Cat CB1.7 Utility Tandem Roller (1.7-Ton)', 'CAT-CB1.7', '1.7-Ton operating weight, 24.7 HP engine, 900mm drum width, pressurized water spray system'),
    ('CIVIL-ROL', 'DYNAPAC', 'Dynapac CC900 Ride-On Tandem Roller (1.6-Ton)', 'DYNA-CC900', '1.6-Ton operating weight, 24 HP Kubota diesel engine, 900mm drum width, dual drum drive'),

    -- 12. Bar Bending & Bar Cutting Machine Set
    ('CIVIL-BAR', 'JAYMAC', 'Jaymac Auto Rebar Bending & Cutting Set (32mm)', 'JM-BC-32SET', 'Handles up to 32mm TMT steel bars, electric brake motor, automated pin angle preset 0-180 deg'),
    ('CIVIL-BAR', 'SAFARI', 'Safari GW42 Bar Bending & GQ40 Cutting Pair', 'SAF-BC-42PAIR', '42mm maximum bending capacity, 40mm cutting capacity, hardened alloy steel gear components'),
    ('CIVIL-BAR', 'LOCAL-FAB', 'Shree Heavy 36mm Bar Bender & Shearing Cutter', 'SHREE-BC-36', '36mm rebar capacity, 5 HP heavy induction motors, foot pedal operation with dual safety limits'),

    -- 13. Skid Steer Loader (Wheeled / Tracked)
    ('CIVIL-SKD', 'BOBCAT', 'Bobcat S450 Skid Steer Loader (Wheeled)', 'BOBCAT-S450', '49 HP Bobcat diesel engine, 608kg rated operating capacity, 0.4 m³ bucket, zero-turn agile chassis'),
    ('CIVIL-SKD', 'JCB', 'JCB 135 HD Robot Skid Steer Loader', 'JCB-135-HD', '48 HP engine, unique single-boom PowerBoom design with safe side-door entry, 612kg payload'),
    ('CIVIL-SKD', 'CAT', 'Cat 216B Series 3 Skid Steer Loader', 'CAT-216B-3', '51 HP Cat 3024C engine, 635kg operating capacity, radial lift linkage, mechanical quick-coupler'),

    -- 14. Concrete Road Saw & Core Cutter Machine
    ('CIVIL-SAW', 'HUSQVARNA', 'Husqvarna FS 400 LV Floor Concrete Saw (18" Blade)', 'HUSQ-FS400', '13 HP Honda GX390 engine, 450mm max blade diameter, 162mm cutting depth, integrated water tank'),
    ('CIVIL-SAW', 'NORTON', 'Norton Clipper CS451 Heavy Road Floor Saw', 'NORT-CS451', '13 HP petrol engine, 450mm blade guard, continuous screw handwheel depth adjustment'),
    ('CIVIL-SAW', 'HILTI', 'Hilti DD 200 Heavy Diamond Core Drill Rig', 'HILTI-DD200', '3200W electric motor, coring up to 400mm diameter in reinforced concrete, 3-speed gearing')

) AS v(type_code, mfg_code, model_name, model_number, specs)
JOIN equipment_types t ON t.code = v.type_code
JOIN manufacturers m ON (m.code = v.mfg_code OR m.code = 'MFG-' || v.mfg_code)
ON CONFLICT (type_id, manufacturer_id, model_number) DO UPDATE SET
    name = EXCLUDED.name,
    specs = EXCLUDED.specs,
    active = true;


-- ==============================================================================
-- 2. SEED OPERATIONAL FLEET ASSETS
-- Automatically resolves model_id, type_id, manufacturer_id, and hub_id
-- Dynamic joins on hubs, cities, and states ensure zero hardcoded primary key violations
-- Category is explicitly hardcoded: 1=CONSTRUCTION, 2=AGRICULTURE, 3=MULTIPURPOSE_FLEET
-- ==============================================================================

INSERT INTO assets (
    asset_tag, name, category, model_name, serial_number, daily_rate, deposit_amount,
    purchase_cost, operator_required, status, condition_notes, accessories_included,
    model_id, type_id, manufacturer_id, hub_id, billing_unit, shift_terms, image_url
)
SELECT
    v.asset_tag,
    v.name,
    v.category,
    v.model_name,
    v.serial_number,
    v.daily_rate,
    v.deposit_amount,
    v.purchase_cost,
    v.operator_required,
    1, -- status = AVAILABLE
    v.condition_notes,
    v.accessories_included,
    mm.id,
    t.id,
    m.id,
    h.id,
    v.billing_unit,
    v.shift_terms,
    v.image_url
FROM (VALUES
    -- --------------------------------------------------------------------------
    -- DUAL-USE FLEET ASSETS (Category = 3)
    -- --------------------------------------------------------------------------
    (
        'M-BHL-001', 'Tractor-Mounted Backhoe Loader', 3, 'Bull HD76 Super Loader Backhoe', 'SN-BHL-101',
        3500.00, 10000.00, 750000.00, true,
        'Heavy hydraulic excavator arm certified, dual outriggers inspected', '1.0 m³ front bucket, 0.24 m³ trenching bucket, quick-attach pins',
        'DUAL-BHL', 'BULL', 'BULL-BHL-76', 'HUB-HRD-01', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Certified backhoe operator available',
        'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'M-TRL-101', 'Heavy-Duty Tipping Trolley (10-Ton)', 3, 'Fieldking 10-Ton Hydraulic Tipper Trolley', 'SN-TRL-201',
        1600.00, 4000.00, 195000.00, false,
        'Heavy hydraulic tipping cylinder tested under full payload, leaf springs lubricated', 'Hydraulic quick-connect hose, safety hitch pin, 4x wheel chocks',
        'DUAL-TRL', 'FIELDKING', 'FK-TT-10T', 'HUB-HRD-01', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Farm harvest & civil haulage allowed',
        'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'M-GEN-101', 'Portable Diesel Generator (35 kVA Silent)', 3, 'Kirloskar KG1-35AS 35 kVA Silent Genset', 'SN-GEN-301',
        2800.00, 8000.00, 395000.00, false,
        'Soundproof acoustic canopy in prime condition, voltage regulation calibrated at 415V', 'Dual 63A distribution board, 30m heavy armored cable, earthing rod set',
        'DUAL-GEN', 'KOEL', 'KG1-35AS', 'HUB-SDL-02', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Site backup & tubewell irrigation ready',
        'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'M-AUG-101', 'Tractor-PTO Driven Earth Auger', 3, 'Fieldking Heavy PTO Post Hole Digger', 'FK-AUG-401',
        1400.00, 3000.00, 92000.00, false,
        'Heavy bevel gearbox oil inspected, shear pin protection mechanism verified', '9" and 12" hardened auger bits, heavy PTO drive shaft with safety cover',
        'DUAL-PTO-AUG', 'FIELDKING', 'FK-PHD-900', 'HUB-BLG-03', 'Hardoi', 'UP', 3,
        'Per hole drilled or daily lease • Ideal for solar boundary fencing & orchards',
        'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'M-LDR-101', 'Tractor-Mounted Front Loader', 3, 'Bull Ultra Tractor Front End Loader', 'SN-LDR-501',
        2200.00, 6000.00, 240000.00, true,
        'Hydraulic lift cylinders serviced, high-strength subframe mounted', '0.6 m³ material bucket, hydraulic control valve kit',
        'DUAL-LDR', 'BULL', 'BULL-FL-U1', 'HUB-HRD-01', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Sand, aggregate & manure bulk loading',
        'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'M-TNK-101', 'Towable Water Tanker (5000L+)', 3, 'National Agro 5000L Epoxy Water Tanker', 'SN-TNK-601',
        1500.00, 3500.00, 145000.00, false,
        'Epoxy lined anti-corrosion tank, leak tested under full 5000L hydrostatic head', '3" high-flow discharge valve, 15m suction hose, rear gravity road spray bar',
        'DUAL-TNK', 'NATL-AGRO', 'NAT-WT-5000', 'HUB-SDL-02', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Road curing compaction & drought irrigation',
        'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'M-MEX-101', 'Mini Tracked Excavator (3.5 Ton)', 3, 'Yanmar ViO35 Zero Tail Swing Mini Excavator', 'SN-MEX-701',
        4500.00, 15000.00, 2850000.00, true,
        'Rubber tracks 90% tread, hydraulic joystick pilot control responsive', '0.11 m³ GP bucket, piping kit for rock breaker',
        'DUAL-MEX', 'YANMAR', 'VIO35-6B', 'HUB-HRD-01', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Compact urban trenching & farm canal work',
        'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'M-HYD-101', 'Tractor-Fitted Hydra Crane (3-Ton)', 3, 'ACE Tractor Hydra Crane 3-Ton', 'SN-HYD-801',
        2500.00, 7000.00, 380000.00, true,
        '3-stage telescopic boom checked, wire rope and hydraulic winch load-tested', '3-Ton snatch block, safety hook, dual front outriggers',
        'DUAL-HYD', 'ACE', 'ACE-THC-03', 'HUB-SDL-02', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Pre-cast concrete & farm transformer lifting',
        'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'M-TRAC-101', '4WD Utility Tractor (57 HP)', 3, 'Mahindra Arjun Novo 605 DI-i-4WD (57 HP)', 'SN-TRAC-901',
        2400.00, 7000.00, 950000.00, false,
        '4WD planetary front drive verified, dual clutch & hydraulic draft control calibrated', 'Heavy rear drawbar, toplink, 540/540E dual PTO stub',
        'DUAL-TRAC', 'MAHINDRA', 'NOVO-605-4WD', 'HUB-BLG-03', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Heavy deep tillage & commercial site haulage',
        'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'M-WSH-101', 'High-Pressure Washing Unit (Skid 200 Bar)', 3, 'Kärcher HD 7/16-4 Cage Professional Washer', 'SN-WSH-1001',
        1100.00, 2500.00, 95000.00, false,
        'Ceramic piston high-pressure pump tested at 200 Bar, trigger safety lock working', '15m steel-reinforced high-pressure hose, turbo dirt blaster lance, spray gun',
        'DUAL-WSH', 'KARCHER', 'KARCH-HD7-16', 'HUB-HRD-01', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Equipment de-mudding & brick washdown',
        'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'M-CHP-101', 'Mobile Disc Wood & Residue Chipper', 3, 'Redlands Champion Bio-Waste Chipper 6"', 'SN-CHP-1101',
        1800.00, 5000.00, 260000.00, false,
        'High-carbon tool steel chipping blades sharpened, balanced heavy flywheel', 'PTO drive shaft with safety clutch, 360-degree adjustable discharge chute',
        'DUAL-CHP', 'REDLANDS', 'RED-CHI-6', 'HUB-BLG-03', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Orchard residue mulching & biowaste reduction',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'M-TRN-101', 'Tractor-Mounted Hydraulic Trencher', 3, 'Ditch Witch C30X Tractor Mount Trencher', 'SN-TRN-1201',
        2900.00, 8000.00, 420000.00, false,
        'Carbide rock teeth digging chain inspected, hydraulic side discharge auger clean', 'Digging boom with 48" depth chain, hydraulic depth control cylinder',
        'DUAL-TRN', 'DITCH-WITCH', 'DW-C30X-TR', 'HUB-SDL-02', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Telecom fiber, pipeline & irrigation cabling',
        'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'M-LFT-101', 'Towable Hydraulic Boom Lift (14m)', 3, 'ACE Aerial Work Platform TBL-14', 'SN-LFT-1301',
        3800.00, 10000.00, 1150000.00, true,
        'Articulated boom hydraulics load tested, safety interlocks & basket harness certified', '2-person insulated fiberglass basket, dual ground/basket control console',
        'DUAL-LIFT', 'ACE', 'ACE-TBL14', 'HUB-SDL-02', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • High-mast lighting, painting & solar installation',
        'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'M-SLR-101', 'Heavy-Duty Submersible Slurry Pump Set', 3, 'Kirloskar KDS-515+ Slurry Dewatering Pump', 'SN-SLR-1401',
        1300.00, 3000.00, 68000.00, false,
        'High-chrome semi-open impeller tested, waterproof cable glands inspected', '30m submersible cable, DOL starter control panel, 3" delivery quick clamp',
        'DUAL-SLR', 'KOEL', 'KIRL-KDS-515', 'HUB-HRD-01', 'Hardoi', 'UP', 2,
        'Full 24-hr day site deployment • Foundation mud pit pumping & desilting',
        'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80'
    ),

    -- --------------------------------------------------------------------------
    -- AGRI SPECIALIZED ASSETS (Category = 2)
    -- --------------------------------------------------------------------------
    (
        'A-ROTA-101', 'Rotavator / Rotary Tiller (7-Feet)', 2, 'Shaktiman Champion Series Rotavator 7-Feet', 'SN-ROTA-101',
        1200.00, 3000.00, 115000.00, false,
        '54 L-type boron steel blades newly fitted, multi-speed oil bath gearbox smooth', 'Heavy duty PTO shaft with slip clutch, side depth skid shoes',
        'AGRI-ROTA', 'SHAKTIMAN', 'SHK-CHAMP-7', 'HUB-BLG-03', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Fast fine tilth soil preparation',
        'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'A-CMB-101', 'Multi-Crop Combine Harvester', 2, 'Preet 987 Self-Propelled Multi-Crop Combine', 'SN-CMB-201',
        8500.00, 25000.00, 2450000.00, true,
        '14-foot cutter bar sharp, threshing cylinder & grain elevators freshly overhauled', 'Paddy drum, wheat concave sieve, grain unloading auger tube',
        'AGRI-CMB', 'PREET', 'PREET-987', 'HUB-BLG-03', 'Hardoi', 'UP', 4,
        'Per acre worked or daily lease • Paddy and wheat harvest complete grain cleaning',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'A-LVL-101', 'Laser Land Leveler (Dual Grade)', 2, 'Trimble Spectra Precision GL422N Laser Leveler', 'SN-LVL-301',
        2200.00, 6000.00, 320000.00, false,
        'Laser transmitter calibrated with sub-centimeter accuracy, hydraulic mast responsive', 'Tripod stand, rod eye laser receiver, wireless control box, 7-foot scrap blade',
        'AGRI-LVL', 'TRIMBLE', 'TRIM-GL422N', 'HUB-BLG-03', 'Hardoi', 'UP', 4,
        'Per acre worked or daily lease • Precision water-saving field leveling',
        'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'A-RTP-101', 'Paddy Rice Transplanter (4-Row)', 2, 'Kubota NSP-4W Walk-Behind Rice Transplanter', 'SN-RTP-401',
        1700.00, 4500.00, 280000.00, false,
        'Transplanting claws clean & timed, engine starts on single pull', 'Seedling nursery trays support, seedling feeding guide rack',
        'AGRI-RTP', 'KUBOTA', 'KUB-NSP-4W', 'HUB-BLG-03', 'Hardoi', 'UP', 4,
        'Per acre worked or daily lease • High speed uniform paddy transplantation',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'A-RPB-101', 'Reaper-Binder Attachment', 2, 'BCS 622 Power Reaper-Binder (3-Wheel)', 'SN-RPB-501',
        2000.00, 5000.00, 310000.00, false,
        'Automatic knotter mechanism oiled, cutting knives sharp and aligned', '1.4m cutter bar, twine knotting spool holder, side windrow conveyor',
        'AGRI-RPB', 'BCS', 'BCS-622-RB', 'HUB-BLG-03', 'Hardoi', 'UP', 4,
        'Per acre worked or daily lease • Cuts and binds wheat/paddy into bundles',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'A-SDR-101', 'Pneumatic Planter / Seed Drill (9-Tyne)', 2, 'National 9-Tyne Zero Till Seed Drill', 'SN-SDR-601',
        1100.00, 2500.00, 85000.00, false,
        'Inverted T-openers checked, seed and fertilizer metering fluted rollers calibrated', 'Calibrated metering chart, drive ground wheel with chain tensioner',
        'AGRI-SDR', 'NATL-AGRO', 'NAT-ZTD-9', 'HUB-BLG-03', 'Hardoi', 'UP', 4,
        'Per acre worked or daily lease • Zero-tillage direct wheat & pulse seeding',
        'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'A-BLR-101', 'Tractor PTO Straw Baler (Square)', 2, 'New Holland BC5060 Small Square Baler', 'SN-BLR-701',
        3200.00, 9000.00, 1250000.00, false,
        'Heavy knotters synchronized, bale density tension spring adjusted', '1.8m pick-up reel with rubber teeth, bale counter meter, PTO drive shaft',
        'AGRI-BLR', 'NEWHOLLAND', 'NH-BC5060', 'HUB-BLG-03', 'Hardoi', 'UP', 4,
        'Per acre worked or daily lease • High density square baling for crop residue',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'A-SPR-101', 'High-Capacity Boom Sprayer (500L)', 2, 'Aspee Tractor Mounted Boom Sprayer 500L', 'SN-SPR-801',
        1300.00, 3000.00, 140000.00, false,
        'Diaphragm pressure pump tested at 20 Bar, 24 brass mist nozzles clean', '12m folding boom arm, 500L chemical tank with anti-swirl filter, pressure regulator',
        'AGRI-SPR', 'ASPEE', 'ASP-TMS-500', 'HUB-BLG-03', 'Hardoi', 'UP', 4,
        'Per acre worked or daily lease • Wide swath uniform crop pest spraying',
        'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'A-WDB-101', 'Walk-Behind Power Weeder (7 HP)', 2, 'VST RT65 Power Weeder 7HP', 'SN-WDB-901',
        750.00, 2000.00, 48000.00, false,
        'Rotary tines in excellent condition, clutch engagement smooth', 'Adjustable width rotary blades, rear drag bar furrower',
        'AGRI-WDB', 'VST', 'VST-RT65', 'HUB-HRD-01', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Sugarcane and vegetable inter-row weeding',
        'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'A-SSD-101', 'Super Seeder (Stubble Management 7-Feet)', 2, 'Shaktiman Super Seeder 7-Feet', 'SN-SSD-1001',
        2300.00, 6000.00, 275000.00, false,
        'Paddy stubble mulching blades sharp, seed-fertilizer drop boots unobstructed', 'Calibrated metering mechanism, heavy PTO drive shaft, press roller',
        'AGRI-SSD', 'SHAKTIMAN', 'SHK-SS-7FT', 'HUB-BLG-03', 'Hardoi', 'UP', 4,
        'Per acre worked or daily lease • Single pass paddy residue mulching and wheat sowing',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'A-THR-101', 'Multi-Crop High-Speed Thresher', 2, 'Dashmesh 933 Multi-Crop Thresher', 'SN-THR-1101',
        1900.00, 5000.00, 220000.00, false,
        'Dual blower cleaning fan belts tensioned, reversible feeder tray smooth', 'Wheat and gram interchangeable sieves, grain elevator bagging chute, PTO shaft',
        'AGRI-THR', 'DASHMESH', 'DASH-MCT-933', 'HUB-BLG-03', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • High capacity dust-free multi-crop grain threshing',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'A-CHF-101', 'Heavy-Duty PTO Chaff Cutter (3-Blade)', 2, 'Amar Tractor PTO Chaff Cutter 3-Blade', 'SN-CHF-1201',
        850.00, 2000.00, 65000.00, false,
        '3 high-carbon cutter blades newly sharpened, reverse safety gear responsive', 'Heavy cast iron flywheel, conveyor feeding trough, tractor PTO adapter',
        'AGRI-CHF', 'AMAR', 'AMAR-CC-PTO', 'HUB-HRD-01', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • High speed green and dry fodder processing',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'A-POT-101', 'Automatic Potato Planter (2-Row)', 2, 'Grimme GL-220 2-Row Cup Potato Planter', 'SN-POT-1301',
        1800.00, 5000.00, 210000.00, false,
        'Precision cup conveyor belt inspected, furrow opener ridgers aligned', 'Dual cup planting belts, fertilizer distribution hopper, ridger discs',
        'AGRI-POT', 'GRIMME', 'GRIMME-GL220', 'HUB-BLG-03', 'Hardoi', 'UP', 4,
        'Per acre worked or daily lease • Uniform potato seed planting & ridge forming',
        'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'A-RPR-101', 'Self-Propelled Walk-Behind Reaper (4-Feet)', 2, 'BCS 622 Walk-Behind Reaper 4-Feet', 'SN-RPR-1401',
        1300.00, 3500.00, 185000.00, false,
        'Cutter bar knives sharp, side windrow conveyor belt aligned', '4-foot cutter bar, side windrow conveyor, dual lugged drive wheels',
        'AGRI-RPR', 'BCS', 'BCS-622-4F', 'HUB-BLG-03', 'Hardoi', 'UP', 4,
        'Per acre worked or daily lease • Rapid harvest of wheat, paddy, and mustard',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
    ),

    -- --------------------------------------------------------------------------
    -- CIVIL INFRA ASSETS (Category = 1)
    -- --------------------------------------------------------------------------
    (
        'C-BHL-101', 'Full-Sized Backhoe Loader (JCB 3DX Super)', 1, 'JCB 3DX Super EcoXcellence 4WD', 'SN-JCB-101',
        4200.00, 12000.00, 3600000.00, true,
        'Live telematics LiveLink active, hydraulic pressures tested at 220 Bar', '1.1 m³ loader bucket, 0.26 m³ backhoe bucket, heavy outrigger pads',
        'CIVIL-BHL', 'JCB', 'JCB-3DX-SUP', 'HUB-HRD-01', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Master earthmoving, trenching & bulk truck loading',
        'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'C-SLM-101', 'Self-Loading Concrete Mixer (4m³)', 1, 'Ajax Fiori ARGO 4000 Self-Loading Mixer 4m³', 'SN-SLM-201',
        5500.00, 18000.00, 4200000.00, true,
        'Electronic weigh-batching load cells calibrated, water dosing pump tested', 'Electronic printer for batch slips, hydraulic loading shovel, high-pressure washing hose',
        'CIVIL-SLM', 'AJAX', 'AJAX-ARGO-4000', 'HUB-SDL-02', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • On-site certified concrete mixing without batching plant',
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'C-WBR-101', 'Vibratory Soil Compactor (11-Ton Roller)', 1, 'CASE 1107 EX Soil Compactor (11-Ton)', 'SN-WBR-301',
        4800.00, 15000.00, 3100000.00, true,
        'Vibratory eccentric shaft bearings inspected, amplitude selector functional', 'Smooth vibratory steel drum, dual scrapers, ROPS canopy canopy',
        'CIVIL-WBR', 'CASE', 'CASE-1107EX', 'HUB-SDL-02', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Highway road embankment & sub-base soil compaction',
        'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'C-MIX-101', 'Portable Concrete Mixer 10/7 (Diesel Hopper)', 1, 'Schwing Stetter 10/7 CFT Hopper Mixer', 'SN-MIX-401',
        1100.00, 3000.00, 165000.00, false,
        'Cast iron drum ring gear lubricated, hydraulic hopper lift wire rope tested', 'Mechanical batch hopper, 6 HP diesel engine, towing drawbar',
        'CIVIL-MIX', 'SCHWING', 'SS-MIX-107', 'HUB-HRD-01', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Building slab & boundary wall concrete batching',
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'C-VIB-101', 'Mechanical Concrete Vibrator Needle (60mm)', 1, 'Wacker Neuson M2500 Poker Vibrator', 'SN-VIB-501',
        450.00, 1000.00, 22000.00, false,
        'Electric high-frequency motor tested, needle flexible shaft lubricated', '60mm diameter vibrating poker head, 5m flexible heavy-duty drive hose',
        'CIVIL-VIB', 'WACKER', 'WN-M2500', 'HUB-HRD-01', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Air bubble elimination in concrete columns and slabs',
        'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'C-CMP-101', 'Towable Diesel Air Compressor (100 CFM)', 1, 'Atlas Copco XAS 48 Diesel Compressor 100 CFM', 'SN-CMP-601',
        2200.00, 6000.00, 480000.00, false,
        'Screw element compression verified at 7 Bar, HardHat canopy intact', '2x 3/4" claw couplings, 20m heavy air hose, moisture separator',
        'CIVIL-CMP', 'ATLASCOPCO', 'AC-XAS-48', 'HUB-SDL-02', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Powers pneumatic jackhammers, sandblasting & pipe testing',
        'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'C-GRD-101', 'Tractor-Mounted Grader Blade (8-Feet)', 1, 'Bull Tractor Grader Blade 8-Feet', 'SN-GRD-701',
        1300.00, 3000.00, 110000.00, false,
        'Reversible high-carbon blade edge sharp, 360-degree turntable pin greased', '8-foot heavy grader blade, hydraulic tilt cylinder, tractor 3-point linkage',
        'CIVIL-GRD', 'BULL', 'BULL-TGB-8', 'HUB-HRD-01', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Rural road leveling, canal bank dressing & gravel grading',
        'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'C-PMP-101', 'De-Watering High-Delivery Pump Set (3-inch)', 1, 'Kirloskar KDI-30 3-inch Diesel Dewatering Pump', 'SN-PMP-801',
        850.00, 2000.00, 45000.00, false,
        'Self-priming check valve tested, mechanical seals leak-free', '6m spiral suction hose, 25m flexible flat discharge delivery hose, foot valve',
        'CIVIL-PMP', 'KOEL', 'KOEL-KDI-30', 'HUB-HRD-01', 'Hardoi', 'UP', 2,
        'Hourly metered or full day lease • Basement pit de-watering & canal diversion',
        'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'C-JKH-101', 'Heavy Demolition Jackhammer 30kg (Hex 28mm)', 1, 'Hilti TE 3000-AVR Heavy Demolition Breaker (30kg)', 'SN-JKH-901',
        1100.00, 3000.00, 185000.00, false,
        'AVR vibration reduction effective, 68J impact energy verified', '1x pointed bull point chisel, 1x flat wide spade chisel, transport trolley',
        'CIVIL-JKH', 'HILTI', 'HILTI-TE3000', 'HUB-HRD-01', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • RCC slab breaking, foundation removal & road cutting',
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'C-RAM-101', 'Tamping Rammer / Jumping Jack (72kg)', 1, 'Wacker Neuson BS 60-4 Tamping Rammer (72kg)', 'SN-RAM-1001',
        950.00, 2500.00, 125000.00, false,
        '4-stroke engine starts readily, 18 kN impact force bellows in top shape', 'Standard 280x340mm ductile shoe, transport roller wheels',
        'CIVIL-RAM', 'WACKER', 'WN-BS60-4', 'HUB-SDL-02', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Pipeline trench backfill & foundation soil compaction',
        'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'C-ROL-101', 'Ride-On Tandem Asphalt Roller (1-Ton)', 1, 'ACE RD 100 Tandem Vibratory Roller (1-Ton)', 'SN-ROL-1101',
        2600.00, 7000.00, 850000.00, true,
        'Double drum vibration hydrostatics smooth, pressurized water spray bar unclogged', 'Dual steel vibratory drums, 100L water tank with pressurized nozzles',
        'CIVIL-ROL', 'ACE', 'ACE-RD100', 'HUB-SDL-02', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Bitumen asphalt road patch work & parking paving',
        'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'C-BAR-101', 'Bar Bending & Bar Cutting Machine Set (32mm)', 1, 'Jaymac Auto Rebar Bending & Cutting Set (32mm)', 'SN-BAR-1201',
        1600.00, 4500.00, 290000.00, false,
        'Electric brake motors tested, angle selector pins 45/90/135 deg precise', 'Bending pin set, cutting blade pair, foot pedal switches, electrical starter panel',
        'CIVIL-BAR', 'JAYMAC', 'JM-BC-32SET', 'HUB-SDL-02', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Heavy structural TMT steel rebar fabrication',
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'C-SKD-101', 'Skid Steer Loader (Wheeled Bobcat S450)', 1, 'Bobcat S450 Skid Steer Loader (Wheeled)', 'SN-SKD-1301',
        3800.00, 11000.00, 2450000.00, true,
        'Zero-turn hydraulic hydrostatic drive tight, auxiliary hydraulic lines tested', '0.4 m³ general purpose bucket, heavy-duty pneumatic skid-steer tires',
        'CIVIL-SKD', 'BOBCAT', 'BOBCAT-S450', 'HUB-SDL-02', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Confined urban grading, debris loading & material handling',
        'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80'
    ),
    (
        'C-SAW-101', 'Concrete Road Saw & Core Cutter Machine (18" Blade)', 1, 'Husqvarna FS 400 LV Floor Concrete Saw (18" Blade)', 'SN-SAW-1401',
        1200.00, 3000.00, 135000.00, false,
        'Blade spindle bearings smooth, manual depth screw crank precise', '18" laser-welded diamond cutting blade, 30L gravity water tank, cutting guide arm',
        'CIVIL-SAW', 'HUSQVARNA', 'HUSQ-FS400', 'HUB-SDL-02', 'Hardoi', 'UP', 1,
        'Full 24-hr day site deployment • Road expansion joint cutting & asphalt trench sawing',
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80'
    )
) AS v(
    asset_tag, name, category, model_name, serial_number, daily_rate, deposit_amount,
    purchase_cost, operator_required, condition_notes, accessories_included,
    type_code, mfg_code, model_number, hub_code, city_name, state_code, billing_unit, shift_terms, image_url
)
JOIN equipment_types t ON t.code = v.type_code
JOIN manufacturers m ON (m.code = v.mfg_code OR m.code = 'MFG-' || v.mfg_code)
JOIN machine_models mm ON mm.type_id = t.id AND mm.manufacturer_id = m.id AND mm.model_number = v.model_number
JOIN hubs h ON h.code = v.hub_code
JOIN cities c ON h.city_id = c.id AND c.name = v.city_name
JOIN states s ON c.state_id = s.id AND s.code = v.state_code
ON CONFLICT (asset_tag) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    model_name = EXCLUDED.model_name,
    daily_rate = EXCLUDED.daily_rate,
    deposit_amount = EXCLUDED.deposit_amount,
    purchase_cost = EXCLUDED.purchase_cost,
    operator_required = EXCLUDED.operator_required,
    condition_notes = EXCLUDED.condition_notes,
    accessories_included = EXCLUDED.accessories_included,
    model_id = EXCLUDED.model_id,
    type_id = EXCLUDED.type_id,
    manufacturer_id = EXCLUDED.manufacturer_id,
    hub_id = EXCLUDED.hub_id,
    billing_unit = EXCLUDED.billing_unit,
    shift_terms = EXCLUDED.shift_terms,
    image_url = EXCLUDED.image_url,
    status = 1;

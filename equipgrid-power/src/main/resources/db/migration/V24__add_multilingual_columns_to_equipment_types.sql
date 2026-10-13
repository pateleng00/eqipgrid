-- EquipGrid V24: Add Multilingual Columns & Descriptions to Equipment Types
-- Single source of truth for Hindi names, local colloquial names, and work descriptions

ALTER TABLE equipment_types
    ADD COLUMN IF NOT EXISTS hindi_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS local_language_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS hindi_description VARCHAR(512);

-- 1. Tilting Concrete Mixer
UPDATE equipment_types
SET hindi_name = 'कंक्रीट व मसाला मिलाने की मशीन (मिक्सर)',
    local_language_name = 'मसाला मशीन / कंक्रीट मिक्सर',
    description = 'Heavy-duty 10/7 diesel and electric batch concrete mixer for foundation and roof slab casting',
    hindi_description = 'छत ढलाई, नींव और निर्माण कार्यों के लिए सीमेंट, बालू और गिट्टी का मजबूत मसाला तैयार करने वाला 10/7 डीजल मिक्सर।'
WHERE code = 'TYPE-CONC-MIX';

-- 2. Concrete Needle Vibrator
UPDATE equipment_types
SET hindi_name = 'कंक्रीट बैठाने व कंपित करने की मशीन (वाइब्रेटर)',
    local_language_name = 'कम्पन वाली सुई / वाइब्रेटर',
    description = 'High-frequency needle poker vibrator with flexible drive shaft for air-bubble free compaction',
    hindi_description = 'छत, पिलर और बीम ढलाई में कंक्रीट से हवा के बुलबुले निकालकर उसे ठोस, मजबूत और हनीकॉम्ब-मुक्त बनाने वाली सुई।'
WHERE code = 'TYPE-CONC-VIB';

-- 3. Plate Compactor / Earth Rammer
UPDATE equipment_types
SET hindi_name = 'मिट्टी, बालू व फर्श कुटाई की मशीन (कॉम्पैक्टर)',
    local_language_name = 'कुटाई मशीन / प्लेट कॉम्पैक्टर',
    description = 'Walk-behind soil and asphalt plate vibratory compactor for soil base and paver block stabilization',
    hindi_description = 'नींव भराई, सड़क बेस और पेवर ब्लॉक लगाने से पहले मिट्टी और गिट्टी को ठोस तरीके से दबाने और बैठाने वाली मशीन।'
WHERE code = 'TYPE-PLATE-CMP';

-- 4. Demolition Jackhammer
UPDATE equipment_types
SET hindi_name = 'कंक्रीट, लिंटर व पत्थर तोड़ने की मशीन (हैमर)',
    local_language_name = 'ब्रेकर हैमर / छेनी मशीन',
    description = 'High-impact 16kg-30kg demolition hammer and chisel for breaking tough concrete structures',
    hindi_description = 'पुराना लेंटर, पक्के आरसीसी पिलर, पत्थर और मजबूत फर्श को तेजी से तोड़ने और छंटाई करने वाला भारी इलेक्ट्रिक जैकहैमर।'
WHERE code = 'TYPE-DEMO-JKH';

-- 5. Trash / De-watering Pump
UPDATE equipment_types
SET hindi_name = 'पानी, कीचड़ व गंदा पानी निकालने वाला पम्प',
    local_language_name = 'कीचड़ पम्प / पानी निकासी पम्प',
    description = 'Self-priming 3-inch petrol and diesel pump for heavy sludge, mud, and water excavation',
    hindi_description = 'बेसमेंट, सीवर, बोरवेल गड्ढों या जलभराव वाले खेतों से भारी गाद और गंदा पानी निकालने वाला 3-इंच सेल्फ-प्राइमिंग पम्प।'
WHERE code = 'TYPE-DEWAT-PMP';

-- 6. Portable Power Generator
UPDATE equipment_types
SET hindi_name = 'पोर्टेबल बिजली जनरेटर (पावर जनरेटर)',
    local_language_name = 'बिजली जनरेटर / जेनसेट',
    description = 'Single and three-phase mobile generator 3.5kVA to 10kVA for powering site machinery and events',
    hindi_description = 'साइट पर बिजली कटौती या दूरदराज के क्षेत्रों में वेल्डिंग, कटर, मिक्सर और लाइट चलाने के लिए विश्वसनीय पेट्रोल/डीजल जनरेटर।'
WHERE code = 'TYPE-PORT-GEN';

-- 7. Power Reaper Harvester
UPDATE equipment_types
SET hindi_name = 'फसल (धान, गेहूँ व सरसों) काटने की मशीन',
    local_language_name = 'रीपर / फसल कटाई मशीन',
    description = 'Walking tractor mounted paddy, wheat, and mustard crop harvester cutting close to ground',
    hindi_description = 'पकी हुई धान, गेहूं, बाजरा और सरसों की फसल को जमीन से 2-3 इंच ऊपर तेजी से काटने और एक कतार में बिछाने वाली मशीन।'
WHERE code = 'TYPE-AGRO-REP';

-- 8. Rotary Power Weeder / Tiller
UPDATE equipment_types
SET hindi_name = 'खेत की जुताई व निराई-गुड़ाई की मशीन (वीडर)',
    local_language_name = 'पावर वीडर / छोटा जोतने वाला',
    description = '7HP engine inter-row tillage and weeding cultivator for sugarcane, orchards, and vegetables',
    hindi_description = 'गन्ने, सब्जियों और बागवानी फसलों की कतारों के बीच खरपतवार निकालने और मिट्टी को भुरभुरी बनाने वाला 7HP टिलर।'
WHERE code = 'TYPE-AGRO-WED';

-- 9. Post-Hole Earth Auger
UPDATE equipment_types
SET hindi_name = 'जमीन में गड्ढा खोदने की मशीन (अर्थ ऑगर)',
    local_language_name = 'बरमा / पिलर डिगर',
    description = 'High-speed petrol earth auger with 6-inch & 8-inch drill bits for farm fencing and plantation',
    hindi_description = 'खेत की तारबंदी (फेंसिंग), खंभे गाड़ने और बागवानी के पौधे लगाने के लिए 2.5 फीट तक तेज और गोल गड्ढे खोदने वाला ऑगर।'
WHERE code = 'TYPE-AGRO-AUG';

-- 10. Hydraulic Tractor Trolley (10-Ton)
UPDATE equipment_types
SET hindi_name = 'हाइड्रोलिक ट्रैक्टर ट्रॉली (10-टन टिप्पर)',
    local_language_name = 'डम्पर ट्रॉली / मालवाहक ट्रॉली',
    description = 'Heavy dual-purpose tipping trailer for farm crop transport and civil site sand/brick hauling',
    hindi_description = 'अनाज, भूसा, बालू, ईंट या भारी निर्माण सामग्री की ढुलाई के लिए ऑटोमैटिक हाइड्रोलिक जैक से खाली होने वाली 10-टन ट्रॉली।'
WHERE code = 'TYPE-MULTI-TRL';

-- 11. Mobile Water Tanker & Pressure Sprayer
UPDATE equipment_types
SET hindi_name = 'मोबाइल वाटर टैंकर व प्रेशर स्प्रेयर (5000L)',
    local_language_name = 'पानी का टैंकर / वाटर टैंकर',
    description = 'Multi-use 5000L water tanker for construction site curing/compaction and agricultural irrigation',
    hindi_description = 'निर्माण स्थल पर तराई (क्यूरिंग) और खेतों में पानी सप्लाई या छिड़काव के लिए स्प्रे बार युक्त 5000 लीटर ट्रैक्टर टैंकर।'
WHERE code = 'TYPE-MULTI-TNK';

-- 12. Dual-Use Silent Diesel Generator 7.5kVA
UPDATE equipment_types
SET hindi_name = 'साइलेंट डीजल जनरेटर (7.5kVA ड्यूल आउटपुट)',
    local_language_name = 'साइलेंट जनरेटर / 7.5kVA जेनसेट',
    description = 'Heavy mobile silent generator for powering construction machinery and agricultural tubewells',
    hindi_description = 'साइलेंट कैनोपी युक्त 7.5kVA जनरेटर जो निर्माण उपकरणों के साथ-साथ खेतों के ट्यूबवेल और सबमर्सिबल चलाने के लिए उपयुक्त है।'
WHERE code = 'TYPE-MULTI-GEN';

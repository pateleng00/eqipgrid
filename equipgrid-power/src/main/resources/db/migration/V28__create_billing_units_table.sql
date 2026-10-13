-- EquipGrid V28: Create Dynamic Billing Units Master Table & Seed Multilingual Catalog
-- Decouples billing units from static code enum into dynamic, database-backed configurations
-- Allows runtime addition of new units (Per-Km, Per-Shift, Per-Ton, Monthly, etc.) without code deployments

-- 1. CREATE MASTER TABLE: billing_units
CREATE TABLE IF NOT EXISTS billing_units (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    hindi_name VARCHAR(128) NOT NULL,
    unit_label VARCHAR(32) NOT NULL,
    hindi_unit_label VARCHAR(32) NOT NULL,
    unit_label_long VARCHAR(64),
    hindi_unit_label_long VARCHAR(64),
    description TEXT,
    hindi_description TEXT,
    default_shift_terms VARCHAR(256),
    hindi_default_shift_terms VARCHAR(256),
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. SEED INITIAL BILLING UNITS (Preserving Existing Enum IDs 1-5 + Adding High-Demand Units)
INSERT INTO billing_units (
    id, code, name, hindi_name, unit_label, hindi_unit_label, 
    unit_label_long, hindi_unit_label_long, description, hindi_description, 
    default_shift_terms, hindi_default_shift_terms, display_order, active
) VALUES
(
    1, 'DAILY', 
    'Per Day (Daily Shift / 24-hr)', 'प्रति दिन (24 घंटे की शिफ्ट)',
    'day', 'दिन', 
    '24-hr day', '24-घंटे का दिन',
    'Standard daily 24-hour equipment lease with flexible field operation.',
    'मानक 24 घंटे का दैनिक उपकरण किराया, खेत व साइट पर लचीला उपयोग।',
    'Full 24-hr day site deployment • Flexible field usage',
    'पूरे 24 घंटे की साइट तैनाती • फील्ड में लचीला उपयोग',
    1, true
),
(
    2, 'HOURLY', 
    'Per Hour (Metered Run Time)', 'प्रति घंटा (मीटर समय अनुसार)',
    'hr', 'घंटा', 
    'metered hour', 'मीटर किया गया घंटा',
    'Hourly metered pricing suitable for pumps, trenchers, and short-duration machinery.',
    'पंप, ट्रेंचर और कम समय के काम के लिए घंटे के हिसाब से मीटर किराया।',
    'Hourly metered operation • Pay for actual run time',
    'घंटे के हिसाब से संचालन • केवल वास्तविक उपयोग समय का भुगतान',
    2, true
),
(
    3, 'PER_TRIP', 
    'Per Trip (Transportation / Haulage)', 'प्रति चक्कर (परिवहन / ढुलाई)',
    'trip', 'ट्रिप', 
    'transport trip', 'परिवहन चक्कर',
    'Fixed charge per single transport haulage trip without time boundation.',
    'बिना समय सीमा के प्रति चक्कर निश्चित ढुलाई किराया।',
    'Per transport trip • No daily shift restriction',
    'प्रति परिवहन चक्कर • कोई दैनिक शिफ्ट पाबंदी नहीं',
    3, true
),
(
    4, 'PER_HOLE', 
    'Per Hole (Earth Auger / Drilling)', 'प्रति गड्ढा (बरमा / पोल ड्रिलिंग)',
    'hole', 'गड्ढा', 
    'hole drilled', 'खोदा गया गड्ढा',
    'Flat charge per pole hole drilled for solar installations, fencing, and plantation.',
    'सोलर पोल, बाड़बंदी और वृक्षारोपण के लिए प्रति गड्ढा निश्चित दर।',
    'Per hole drilled • Includes 6" & 8" bits • Zero time boundation',
    'प्रति गड्ढा ड्रिल • 6" व 8" बिट्स शामिल • समय की कोई बाध्यता नहीं',
    4, true
),
(
    5, 'PER_ACRE', 
    'Per Acre (Field Operation / Harvesting)', 'प्रति एकड़ (खेत जुताई / कटाई)',
    'acre', 'एकड़', 
    'acre worked', 'जुताई या कटाई एकड़',
    'Area-based pricing for combine harvesters, laser levelers, and sprayers.',
    'कंबाइन हार्वेस्टर, लेजर लेवलर और बड़े स्प्रेयर के लिए रकबा (एकड़) अनुसार किराया।',
    'Per acre worked • Rate based on land area covered',
    'प्रति एकड़ कार्य • भूमि रकबे के आधार पर दर',
    5, true
),
(
    6, 'PER_KM', 
    'Per Kilometer (Distance / Towing)', 'प्रति किलोमीटर (दूरी / टोविंग)',
    'km', 'किमी', 
    'kilometer traveled', 'तय की गई दूरी',
    'Distance-based pricing for water tankers, tipper haulage, and flatbed transport.',
    'वाटर टैंकर, टिपर ढुलाई और लंबी दूरी के लिए प्रति किलोमीटर किराया।',
    'Per kilometer traveled • Mileage-based logistics billing',
    'प्रति किलोमीटर यात्रा • माइलेज आधारित लॉजिस्टिक्स बिलिंग',
    6, true
),
(
    7, 'PER_SHIFT', 
    'Per Shift (8-Hour Working Shift)', 'प्रति शिफ्ट (8 घंटे का कार्य)',
    'shift', 'शिफ्ट', 
    '8-hr operator shift', '8-घंटे की ऑपरेटर शिफ्ट',
    'Standard commercial 8-hour operator shift for heavy civil excavation equipment.',
    'भारी निर्माण व खोदाई मशीनों के लिए 8 घंटे की मानक कार्य शिफ्ट।',
    'Standard 8-hour work shift • Operator allowance included',
    'मानक 8 घंटे की शिफ्ट • ऑपरेटर भत्ता शामिल',
    7, true
),
(
    8, 'PER_TON', 
    'Per Ton (Bulk Material Haulage)', 'प्रति टन (थोक सामग्री वजन)',
    'ton', 'टन', 
    'metric ton', 'मीट्रिक टन वजन',
    'Weight-based pricing for aggregate, gravel, sand, and grain transport.',
    'गिट्टी, बालू, अनाज आदि भारी वजन की ढुलाई के लिए प्रति टन दर।',
    'Per metric ton payload weighed at certified weighbridge',
    'प्रमाणित धर्मकांटा वजन के अनुसार प्रति मीट्रिक टन दर',
    8, true
),
(
    9, 'MONTHLY', 
    'Per Month (Long-Term Site Lease)', 'प्रति माह (दीर्घकालिक साइट पट्टा)',
    'mo', 'माह', 
    'calendar month', 'कैलेंडर महीना',
    'Discounted monthly enterprise lease with scheduled yard maintenance.',
    'नियमित सर्विसिंग व मेंटेनेंस सहित रियायती मासिक प्रोजेक्ट पट्टा।',
    'Monthly lease contract • Dedicated on-site maintenance support',
    'मासिक पट्टा अनुबंध • साइट पर समर्पित मेंटेनेंस सहायता',
    9, true
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    hindi_name = EXCLUDED.hindi_name,
    unit_label = EXCLUDED.unit_label,
    hindi_unit_label = EXCLUDED.hindi_unit_label,
    unit_label_long = EXCLUDED.unit_label_long,
    hindi_unit_label_long = EXCLUDED.hindi_unit_label_long,
    description = EXCLUDED.description,
    hindi_description = EXCLUDED.hindi_description,
    default_shift_terms = EXCLUDED.default_shift_terms,
    hindi_default_shift_terms = EXCLUDED.hindi_default_shift_terms,
    display_order = EXCLUDED.display_order,
    active = true;

-- Ensure sequence matches max id
SELECT setval('billing_units_id_seq', (SELECT COALESCE(MAX(id), 1) FROM billing_units));

-- 3. LINK ASSETS & RENTAL CONFIGURATIONS TO billing_units TABLE
ALTER TABLE assets 
    ADD COLUMN IF NOT EXISTS billing_unit_id BIGINT REFERENCES billing_units(id);

ALTER TABLE rental_configurations
    ADD COLUMN IF NOT EXISTS billing_unit_id BIGINT REFERENCES billing_units(id);

-- 4. BACKFILL billing_unit_id FROM EXISTING billing_unit VALUES
UPDATE assets a
SET billing_unit_id = bu.id
FROM billing_units bu
WHERE a.billing_unit = bu.id AND a.billing_unit_id IS NULL;

UPDATE rental_configurations rc
SET billing_unit_id = bu.id
FROM billing_units bu
WHERE rc.billing_unit = bu.id AND rc.billing_unit_id IS NULL;

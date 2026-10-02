-- V8: Seed Complete Operational Data (Models, Customers, Bookings, Dispatches, Payments, Commissions)

-- 1. Additional Machine Models
INSERT INTO machine_models (type_id, manufacturer_id, name, model_number, specs, active)
VALUES 
    (6, 3, 'PowerGen 3500 AVR Generator', 'PG-3500-AVR', 'Single phase 3.5kVA, 230V AVR regulated, 4-stroke', true),
    (8, 7, 'KisanForce 7HP Petrol Weeder', 'KF-700-ROT', '7HP 212cc engine, dual inter-row rototiller blades', true),
    (9, 8, 'Agritech Pro Auger 68cc', 'AA-68-PRO', '68cc 2-stroke engine, 8-inch spiral drill bit', true)
ON CONFLICT (type_id, manufacturer_id, model_number) DO NOTHING;

-- 2. Customers
INSERT INTO customers (id, full_name, phone, email, address, aadhaar_number, gst_number, tier, verified, notes)
VALUES
    (2, 'Shyam Sundar Kisan Agro', '+919833445566', 'shyamsundar@kisanagro.in', 'Village Tatyora, Post Bilgram, Hardoi', '6655-4433-2211', NULL, 2, true, 'Farmer Producer Group coordinator (Wheat & Mustard)'),
    (3, 'Awadh Infra Projects Ltd', '+919877889900', 'contracts@awadhinfra.in', 'Plot 12, Sandila Industrial Phase II', NULL, '09AAACA9999K1Z2', 2, true, 'Industrial warehouse builder with recurring fleet contracts'),
    (4, 'Virendra Yadav (Local Mason)', '+919899001122', NULL, 'Mohalla Chauraha, Bilgram', '4433-2211-0099', NULL, 1, false, 'Walk-in client. Strictly zero-credit policy apply.')
ON CONFLICT (phone) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    address = EXCLUDED.address,
    gst_number = EXCLUDED.gst_number,
    tier = EXCLUDED.tier,
    verified = EXCLUDED.verified;

SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));

-- 3. Bookings
INSERT INTO bookings (
    id, booking_number, customer_id, asset_id, start_date, end_date,
    delivery_address, distance_km, operator_required,
    base_rent, delivery_fee, operator_fee, deposit_amount, total_amount,
    advance_paid, deposit_paid, status, dealer_id, notes, created_at, updated_at
) VALUES
(
    1, 'BK-2026-0001', 1, 2, '2026-10-01', '2026-10-05',
    'Bilgram Highway Site KM-14', 8.5, true,
    4800.00, 35.00, 2000.00, 5000.00, 11835.00,
    4800.00, 5000.00, 7, 1, 'Dispatched on 01/10 morning. Challan CH-2026-0001 active.',
    '2026-10-01 08:30:00', '2026-10-01 08:30:00'
),
(
    2, 'BK-2026-0002', 3, 4, '2026-10-01', '2026-10-03',
    'Sandila Phase II Warehouse 4', 4.2, false,
    800.00, 0.00, 0.00, 2000.00, 2800.00,
    800.00, 2000.00, 7, 2, 'Self-operated poker vibrator for floor casting.',
    '2026-10-01 09:15:00', '2026-10-01 09:15:00'
)
ON CONFLICT (booking_number) DO NOTHING;

SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));

-- 4. Dispatch Records
INSERT INTO dispatch_records (
    id, challan_number, booking_id, asset_id, dispatch_timestamp,
    fuel_level, engine_hours_out, accessories_verified, condition_notes,
    driver_name, customer_signature_confirmed
) VALUES
(
    1, 'CH-2026-0001', 1, 2, '2026-10-01 08:30:00',
    '100%', 42.00, true, 'Tow bar & crank handle inspected before loading onto transport truck',
    'Raju Pal (Tata Ace UP-30-T-4411)', true
),
(
    2, 'CH-2026-0002', 2, 4, '2026-10-01 09:15:00',
    '100%', 21.00, true, '40mm needle shaft verified and secured',
    'Mahesh (Hub Pickup)', true
)
ON CONFLICT (challan_number) DO NOTHING;

SELECT setval('dispatch_records_id_seq', (SELECT MAX(id) FROM dispatch_records));

-- 5. Payments
INSERT INTO payments (
    id, booking_id, customer_id, amount, payment_type, payment_mode,
    transaction_ref, notes, created_at
) VALUES
(
    1, 1, 1, 5000.00, 2, 2,
    'UPI-SBI-99118822', 'Security Deposit Escrow verified before dispatch', '2026-10-01 08:10:00'
),
(
    2, 1, 1, 4800.00, 1, 2,
    'UPI-SBI-99118823', 'Full Advance Rent 4 days cleared', '2026-10-01 08:15:00'
),
(
    3, 2, 3, 2800.00, 1, 3,
    'NEFT-HDFC-001928', 'Deposit + Advance combined transaction', '2026-10-01 09:05:00'
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('payments_id_seq', (SELECT MAX(id) FROM payments));

-- 6. Dealer Commissions
INSERT INTO dealer_commissions (
    id, dealer_id, booking_id, gross_rental_revenue, commission_rate,
    commission_amount, status, settled_at, created_at
) VALUES
(
    1, 1, 1, 4800.00, 0.0600,
    288.00, 1, NULL, '2026-10-01 08:30:00'
),
(
    2, 2, 2, 800.00, 0.0600,
    48.00, 1, NULL, '2026-10-01 09:15:00'
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('dealer_commissions_id_seq', (SELECT MAX(id) FROM dealer_commissions));

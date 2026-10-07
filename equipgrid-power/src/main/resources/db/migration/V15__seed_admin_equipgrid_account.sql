-- EquipGrid V15: Seed Dedicated admin@equipgrid.in as ADMIN (Role 7)
-- Preserves root@equipgrid.in as ROOT (Role 8) Super Administrator

INSERT INTO users (username, email, password_hash, full_name, role, phone, active)
VALUES (
    'admin@equipgrid.in',
    'admin@equipgrid.in',
    '$2a$10$7zB3cW0L1t4.F9jH1m0e2u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6',
    'Operations Administrator',
    7, -- ADMIN (Role 7)
    '+919876543215',
    true
)
ON CONFLICT (username) DO UPDATE 
SET role = 7, email = 'admin@equipgrid.in';

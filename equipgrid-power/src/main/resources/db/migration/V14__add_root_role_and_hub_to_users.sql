-- EquipGrid V14: Add ROOT Role, Email, and Hub Assignment to Users
-- Enforces RBAC Hierarchy: ROOT (8) > ADMIN (7) > MANAGER (6) > OPERATOR (2) / USER (1)

-- 1. Add email column to users if not present
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(128);
CREATE UNIQUE INDEX IF NOT EXISTS uk_users_email ON users(email);

-- 2. Add hub_id reference to hubs table
ALTER TABLE users ADD COLUMN IF NOT EXISTS hub_id BIGINT REFERENCES hubs(id) ON DELETE SET NULL;

-- 3. Upgrade default admin to ROOT (Role 8) and assign email admin@equipgrid.in
UPDATE users 
SET username = 'root@equipgrid.in', 
    email = 'root@equipgrid.in', 
    role = 8, 
    full_name = 'Akash Kumar'
WHERE username = 'admin' OR username = 'admin@equipgrid.in';

-- If root@equipgrid.in did not exist, insert it
INSERT INTO users (username, email, password_hash, full_name, role, phone, active)
VALUES (
    'root@equipgrid.in',
    'root@equipgrid.in',
    '$2a$10$7zB3cW0L1t4.F9jH1m0e2u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6',
    'Akash Kumar',
    8, -- ROOT
    '+919876543210',
    true
)
ON CONFLICT (username) DO UPDATE 
SET role = 8, 
    email = 'root@equipgrid.in',
    full_name = 'Akash Kumar';

-- 4. Seed Operations Administrator (Role 7: ADMIN)
INSERT INTO users (username, email, password_hash, full_name, role, phone, active)
VALUES (
    'admin.ops@equipgrid.in',
    'admin.ops@equipgrid.in',
    '$2a$10$7zB3cW0L1t4.F9jH1m0e2u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6',
    'Priya Singhania',
    7, -- ADMIN
    '+919876543215',
    true
)
ON CONFLICT (username) DO UPDATE 
SET role = 7, email = 'admin.ops@equipgrid.in';

-- 5. Seed Yard Manager assigned to Hardoi Central Yard (Role 6: MANAGER)
INSERT INTO users (username, email, password_hash, full_name, role, hub_id, phone, active)
SELECT 
    'manager.hardoi@equipgrid.in',
    'manager.hardoi@equipgrid.in',
    '$2a$10$7zB3cW0L1t4.F9jH1m0e2u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6',
    'Rajesh Sharma',
    6, -- MANAGER
    h.id,
    '+919876543211',
    true
FROM hubs h 
WHERE h.code = 'HUB-HRD-01' 
LIMIT 1
ON CONFLICT (username) DO UPDATE 
SET hub_id = EXCLUDED.hub_id, 
    role = 6, 
    email = EXCLUDED.email;

-- 6. Seed Booking Desk Operator for Hardoi Yard (Role 2: OPERATOR)
INSERT INTO users (username, email, password_hash, full_name, role, hub_id, phone, active)
SELECT 
    'booking.desk@equipgrid.in',
    'booking.desk@equipgrid.in',
    '$2a$10$7zB3cW0L1t4.F9jH1m0e2u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6',
    'Amit Verma',
    2, -- OPERATOR
    h.id,
    '+919876543212',
    true
FROM hubs h 
WHERE h.code = 'HUB-HRD-01' 
LIMIT 1
ON CONFLICT (username) DO UPDATE 
SET hub_id = EXCLUDED.hub_id, 
    role = 2, 
    email = EXCLUDED.email;

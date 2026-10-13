-- EquipGrid V17: Fix default password hashes for all users to 'admin123'
-- Hash: $2a$10$vAuZ6.GMrris.ZCStmpemuTiK1ptdPAcU0DX.oiVHULW7WtjmQTCK (matches 'admin123')

UPDATE users 
SET password_hash = '$2a$10$vAuZ6.GMrris.ZCStmpemuTiK1ptdPAcU0DX.oiVHULW7WtjmQTCK'
WHERE active = true;

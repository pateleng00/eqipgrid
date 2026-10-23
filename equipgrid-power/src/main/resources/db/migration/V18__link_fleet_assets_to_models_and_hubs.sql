-- EquipGrid V18: Link all baseline fleet assets to machine_models, equipment_types, manufacturers, and stationed hubs

-- 1. Link Concrete Mixers (C-MIX)
UPDATE assets
SET model_id        = 1,
    type_id         = 1,
    manufacturer_id = 1,
    hub_id          = COALESCE(hub_id, 1)
WHERE asset_tag LIKE 'C-MIX%';

-- 2. Link Concrete Vibrators (C-VIB)
UPDATE assets
SET model_id        = 2,
    type_id         = 2,
    manufacturer_id = 2,
    hub_id          = COALESCE(hub_id, 1)
WHERE asset_tag LIKE 'C-VIB%';

-- 3. Link Plate Compactors (C-CMP)
UPDATE assets
SET model_id        = 3,
    type_id         = 3,
    manufacturer_id = 3,
    hub_id          = COALESCE(hub_id, 2)
WHERE asset_tag LIKE 'C-CMP%';

-- 4. Link Jackhammers (C-JKH)
UPDATE assets
SET model_id        = 4,
    type_id         = 4,
    manufacturer_id = 4,
    hub_id          = COALESCE(hub_id, 1)
WHERE asset_tag LIKE 'C-JKH%';

-- 5. Link Trash / Mud Pumps (C-PMP)
UPDATE assets
SET model_id        = 5,
    type_id         = 5,
    manufacturer_id = 5,
    hub_id          = COALESCE(hub_id, 1)
WHERE asset_tag LIKE 'C-PMP%';

-- 6. Link Power Reapers (A-REP)
UPDATE assets
SET model_id        = 6,
    type_id         = 7,
    manufacturer_id = 6,
    hub_id          = COALESCE(hub_id, 3)
WHERE asset_tag LIKE 'A-REP%';

-- 7. Link Portable Generators (C-GEN)
UPDATE assets
SET model_id        = 7,
    type_id         = 6,
    manufacturer_id = 3,
    hub_id          = COALESCE(hub_id, 1)
WHERE asset_tag LIKE 'C-GEN%';

-- 8. Link Power Weeders (A-WED)
UPDATE assets
SET model_id        = 8,
    type_id         = 8,
    manufacturer_id = 7,
    hub_id          = COALESCE(hub_id, 3)
WHERE asset_tag LIKE 'A-WED%';

-- 9. Link Earth Augers (A-AUG)
UPDATE assets
SET model_id        = 9,
    type_id         = 9,
    manufacturer_id = 8,
    hub_id          = COALESCE(hub_id, 3)
WHERE asset_tag LIKE 'A-AUG%';

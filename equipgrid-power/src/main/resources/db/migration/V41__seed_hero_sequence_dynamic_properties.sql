-- EquipGrid V41: Seed Hero Sequence Dynamic Properties
-- Configures S3 media paths for the 12 hero sequence machinery backgrounds

INSERT INTO dynamic_properties ("key", "value", "url", created_at, updated_at)
VALUES ('website_hero_shot_01', 'Tractor Hero Shot', 's3://equipgrid-assets-dev/static/hero-sequence/01-tractor.webp',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('website_hero_shot_02', 'Tractor Trolley Hero Shot',
        's3://equipgrid-assets-dev/static/hero-sequence/02-tractor-trolley.webp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('website_hero_shot_03', 'Crop Reaper Hero Shot',
        's3://equipgrid-assets-dev/static/hero-sequence/03-crop-reaper.webp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('website_hero_shot_04', 'Combine Harvester Hero Shot',
        's3://equipgrid-assets-dev/static/hero-sequence/04-combine-harvester.webp', CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP),
       ('website_hero_shot_05', 'Thresher Hero Shot', 's3://equipgrid-assets-dev/static/hero-sequence/05-thresher.webp',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('website_hero_shot_06', 'Rotavator Hero Shot',
        's3://equipgrid-assets-dev/static/hero-sequence/06-rotavator.webp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('website_hero_shot_07', 'Concrete Mixer Hero Shot',
        's3://equipgrid-assets-dev/static/hero-sequence/07-concrete-mixer.webp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('website_hero_shot_08', 'Plate Compactor Hero Shot',
        's3://equipgrid-assets-dev/static/hero-sequence/08-plate-compactor.webp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('website_hero_shot_09', 'Jackhammer Hero Shot',
        's3://equipgrid-assets-dev/static/hero-sequence/09-jackhammer.webp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('website_hero_shot_10', 'Diesel Generator Hero Shot',
        's3://equipgrid-assets-dev/static/hero-sequence/10-diesel-generator.webp', CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP),
       ('website_hero_shot_11', 'Slurry Pump Hero Shot',
        's3://equipgrid-assets-dev/static/hero-sequence/11-slurry-pump.webp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       ('website_hero_shot_12', 'Power Tiller Hero Shot',
        's3://equipgrid-assets-dev/static/hero-sequence/12-power-tiller.webp', CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP) ON CONFLICT ("key") DO
UPDATE
    SET "url" = EXCLUDED."url",
    "value" = EXCLUDED."value",
    updated_at = CURRENT_TIMESTAMP;

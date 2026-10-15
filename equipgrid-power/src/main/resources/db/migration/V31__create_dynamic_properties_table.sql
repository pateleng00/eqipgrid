-- EquipGrid V31: Dynamic Properties Table
-- Stores configurable key-value pairs, dynamic asset URLs (such as S3 media), and system parameters

CREATE TABLE IF NOT EXISTS dynamic_properties (
    id BIGSERIAL PRIMARY KEY,
    "key" VARCHAR(128) NOT NULL UNIQUE,
    "value" TEXT,
    "url" TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by BIGINT DEFAULT 1,
    updated_by BIGINT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_dynamic_properties_key ON dynamic_properties("key");

-- Seed the background video and dynamic configuration
INSERT INTO dynamic_properties ("key", "value", "url", created_at, updated_at)
VALUES 
    ('website_hero_video', 'Hero Machinery Showcase Background Video', 's3://equipgrid-assets-dev/static/website_video.mp4', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('hero_background_video', 'Hero Machinery Showcase Background Video', 's3://equipgrid-assets-dev/static/website_video.mp4', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('website_video', 'Hero Machinery Showcase Background Video', 's3://equipgrid-assets-dev/static/website_video.mp4', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE
SET "url" = EXCLUDED."url",
    "value" = EXCLUDED."value",
    updated_at = CURRENT_TIMESTAMP;

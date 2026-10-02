-- V6: Asset Media Table
-- Supports up to 4 images + 1 short video per machine (20-30s)

CREATE TABLE asset_media (
    id                BIGSERIAL PRIMARY KEY,
    asset_id          BIGINT       NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    media_type        VARCHAR(16)  NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO')),
    s3_key            VARCHAR(512) NOT NULL,
    display_order     INT          NOT NULL DEFAULT 0,
    file_name         VARCHAR(255),
    content_type      VARCHAR(64),
    file_size_bytes   BIGINT,
    duration_seconds  INT,          -- NULL for images
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(128),
    updated_by        VARCHAR(128),

    -- Only one video allowed per asset
    CONSTRAINT uq_asset_single_video EXCLUDE USING btree (asset_id WITH =)
        WHERE (media_type = 'VIDEO'),

    -- Display order unique within same asset+type
    CONSTRAINT uq_asset_media_order UNIQUE (asset_id, media_type, display_order)
);

CREATE INDEX idx_asset_media_asset_id ON asset_media (asset_id);
CREATE INDEX idx_asset_media_type ON asset_media (asset_id, media_type);

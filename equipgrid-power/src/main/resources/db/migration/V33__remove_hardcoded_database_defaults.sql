-- V33: Remove hardcoded database-level fallback defaults
-- Drop default unsplash image on assets and make image_url nullable
ALTER TABLE assets
    ALTER COLUMN image_url DROP DEFAULT;
ALTER TABLE assets
    ALTER COLUMN image_url DROP NOT NULL;

-- Drop default 25km radius on hubs
ALTER TABLE hubs
    ALTER COLUMN operating_radius_km DROP DEFAULT;

-- Drop default operator rate and transit pricing on rental configurations
ALTER TABLE rental_configurations
    ALTER COLUMN operator_daily_rate DROP DEFAULT;
ALTER TABLE rental_configurations
    ALTER COLUMN free_delivery_distance_km DROP DEFAULT;
ALTER TABLE rental_configurations
    ALTER COLUMN free_delivery_distance_km DROP NOT NULL;
ALTER TABLE rental_configurations
    ALTER COLUMN rate_per_km_after_free DROP DEFAULT;
ALTER TABLE rental_configurations
    ALTER COLUMN rate_per_km_after_free DROP NOT NULL;

-- Make address optional on customers so unregistered users are not assigned fake addresses
ALTER TABLE customers
    ALTER COLUMN address DROP NOT NULL;


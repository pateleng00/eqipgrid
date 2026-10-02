#!/usr/bin/env bash
# ==============================================================================
# LocalStack S3 Initialization Hook
# Automatically executed by LocalStack when the S3 service is ready.
# ==============================================================================

set -euo pipefail

echo "[LocalStack Init] Waiting for LocalStack S3 service..."
awslocal s3 mb s3://equipgrid-tmp-dev --region ap-south-1 || true
awslocal s3 mb s3://equipgrid-assets-dev --region ap-south-1 || true

echo "[LocalStack Init] Configuring CORS..."
cat << 'EOF' > /tmp/cors.json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

awslocal s3api put-bucket-cors --bucket equipgrid-tmp-dev --cors-configuration file:///tmp/cors.json || true
awslocal s3api put-bucket-cors --bucket equipgrid-assets-dev --cors-configuration file:///tmp/cors.json || true

echo "[LocalStack Init] ✅ EquipGrid S3 buckets initialized: equipgrid-tmp-dev, equipgrid-assets-dev"

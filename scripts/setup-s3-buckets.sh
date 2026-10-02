#!/usr/bin/env bash
# ==============================================================================
# EquipGrid S3 Bucket Setup & Configuration Script
#
# Creates and configures both the staging (tmp) and production (common)
# S3 buckets required by EquipGrid with:
#   1. AWS S3 Bucket Creation in specified Region
#   2. Default Server-Side Encryption (SSE-S3 AES256)
#   3. Strict Public Access Block (Presigned URLs only)
#   4. Cross-Origin Resource Sharing (CORS) for Station & Web frontends
#   5. 2-Day Automatic Purge Lifecycle Rule on the temporary bucket
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORS_FILE="${SCRIPT_DIR}/cors-config.json"
LIFECYCLE_FILE="${SCRIPT_DIR}/tmp-lifecycle-rule.json"

# Defaults
REGION="ap-south-1"
ENV_NAME="dev"
TMP_BUCKET=""
COMMON_BUCKET=""
AWS_PROFILE=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  -r, --region <region>       AWS Region (default: ap-south-1)
  -e, --env <environment>     Environment name e.g. dev, staging, prod (default: dev)
  -t, --tmp-bucket <name>     Custom name for temporary bucket (default: equipgrid-tmp-<env>)
  -c, --common-bucket <name>  Custom name for assets bucket (default: equipgrid-assets-<env>)
  -p, --profile <profile>     AWS CLI profile to use (optional)
  -h, --help                  Show this help message

Examples:
  ./scripts/setup-s3-buckets.sh
  ./scripts/setup-s3-buckets.sh --env prod --region ap-south-1
  ./scripts/setup-s3-buckets.sh --tmp-bucket my-equipgrid-tmp --common-bucket my-equipgrid-assets
EOF
  exit 0
}

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    -r|--region)
      REGION="$2"
      shift 2
      ;;
    -e|--env)
      ENV_NAME="$2"
      shift 2
      ;;
    -t|--tmp-bucket)
      TMP_BUCKET="$2"
      shift 2
      ;;
    -c|--common-bucket)
      COMMON_BUCKET="$2"
      shift 2
      ;;
    -p|--profile)
      AWS_PROFILE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1"
      usage
      ;;
  esac
done

# Set defaults if not provided
if [[ -z "$TMP_BUCKET" ]]; then
  TMP_BUCKET="equipgrid-tmp-${ENV_NAME}"
fi
if [[ -z "$COMMON_BUCKET" ]]; then
  COMMON_BUCKET="equipgrid-assets-${ENV_NAME}"
fi

# Build AWS CLI base command
AWS_CMD="aws"
if [[ -n "$AWS_PROFILE" ]]; then
  AWS_CMD="aws --profile ${AWS_PROFILE}"
fi

echo "======================================================================"
echo " EquipGrid — S3 Bucket Infrastructure Setup"
echo "======================================================================"
echo " AWS Region:      ${REGION}"
echo " Environment:     ${ENV_NAME}"
echo " Staging Bucket:  ${TMP_BUCKET}"
echo " Assets Bucket:   ${COMMON_BUCKET}"
if [[ -n "$AWS_PROFILE" ]]; then
  echo " AWS Profile:     ${AWS_PROFILE}"
fi
echo "======================================================================"

# Step 0: Verify AWS CLI authentication
echo ""
echo "[1/6] Verifying AWS CLI credentials..."
if ! CALLER_IDENTITY=$($AWS_CMD sts get-caller-identity --output json 2>&1); then
  echo "❌ Error: AWS authentication failed. Please configure AWS credentials or re-login:"
  echo "   aws configure"
  echo "   or: aws sso login"
  echo "Details: $CALLER_IDENTITY"
  exit 1
fi
ACCOUNT_ID=$(echo "$CALLER_IDENTITY" | grep -o '"Account": "[^"]*' | cut -d'"' -f4)
ARN=$(echo "$CALLER_IDENTITY" | grep -o '"Arn": "[^"]*' | cut -d'"' -f4)
echo "✅ Authenticated as Account: ${ACCOUNT_ID} (${ARN})"

# Helper function to create a bucket
create_bucket() {
  local BUCKET="$1"
  echo "Checking if bucket 's3://${BUCKET}' already exists..."
  if $AWS_CMD s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
    echo "  ℹ️  Bucket '${BUCKET}' already exists and is accessible."
  else
    echo "  Creating bucket '${BUCKET}' in region '${REGION}'..."
    if [[ "$REGION" == "us-east-1" ]]; then
      $AWS_CMD s3api create-bucket \
        --bucket "$BUCKET" \
        --region "$REGION"
    else
      $AWS_CMD s3api create-bucket \
        --bucket "$BUCKET" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
    fi
    echo "  ✅ Created bucket '${BUCKET}'"
  fi
}

# Step 1: Create buckets
echo ""
echo "[2/6] Creating S3 Buckets..."
create_bucket "$TMP_BUCKET"
create_bucket "$COMMON_BUCKET"

# Step 2: Enable Default Encryption (SSE-S3 AES256)
echo ""
echo "[3/6] Enabling Default Server-Side Encryption (AES256)..."
ENCRYPTION_CONFIG='{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
for BUCKET in "$TMP_BUCKET" "$COMMON_BUCKET"; do
  echo "  Applying SSE-S3 to '${BUCKET}'..."
  $AWS_CMD s3api put-bucket-encryption \
    --bucket "$BUCKET" \
    --server-side-encryption-configuration "$ENCRYPTION_CONFIG"
done
echo "✅ Default encryption configured for both buckets."

# Step 3: Block Public Access
echo ""
echo "[4/6] Enforcing Block Public Access (Presigned URLs only)..."
for BUCKET in "$TMP_BUCKET" "$COMMON_BUCKET"; do
  echo "  Enforcing Public Access Block on '${BUCKET}'..."
  $AWS_CMD s3api put-public-access-block \
    --bucket "$BUCKET" \
    --public-access-block-configuration \
      "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
done
echo "✅ Public access blocked. All access mediated through backend presigned URLs."

# Step 4: Apply CORS configuration
echo ""
echo "[5/6] Applying CORS Configuration..."
if [[ ! -f "$CORS_FILE" ]]; then
  echo "❌ Error: CORS configuration file missing at: $CORS_FILE"
  exit 1
fi
for BUCKET in "$TMP_BUCKET" "$COMMON_BUCKET"; do
  echo "  Applying CORS to '${BUCKET}'..."
  $AWS_CMD s3api put-bucket-cors \
    --bucket "$BUCKET" \
    --cors-configuration "file://${CORS_FILE}"
done
echo "✅ CORS configuration applied (allows web presigned PUT uploads and GET media)."

# Step 5: Apply Lifecycle Rule on TMP Bucket (2-day auto-expiry)
echo ""
echo "[6/6] Applying 2-day auto-purge Lifecycle Rule to Staging Bucket..."
if [[ ! -f "$LIFECYCLE_FILE" ]]; then
  echo "❌ Error: Lifecycle configuration file missing at: $LIFECYCLE_FILE"
  exit 1
fi
$AWS_CMD s3api put-bucket-lifecycle-configuration \
  --bucket "$TMP_BUCKET" \
  --lifecycle-configuration "file://${LIFECYCLE_FILE}"
echo "✅ Lifecycle policy applied to '${TMP_BUCKET}' (unpromoted uploads automatically expire in 2 days)."

echo ""
echo "======================================================================"
echo " 🎉 EquipGrid S3 Infrastructure Successfully Configured!"
echo "======================================================================"
echo ""
echo "Add the following to your 'equipgrid-power/src/main/resources/application.properties':"
echo "----------------------------------------------------------------------"
echo "aws.s3.region=${REGION}"
echo "aws.s3.tmp-bucket-name=${TMP_BUCKET}"
echo "aws.s3.common-bucket-name=${COMMON_BUCKET}"
echo "aws.s3.signed-url-expiry-minutes=60"
echo "----------------------------------------------------------------------"
echo ""
echo "Or configure these environment variables on your server / container:"
echo "----------------------------------------------------------------------"
echo "export AWS_S3_REGION=${REGION}"
echo "export AWS_S3_TMP_BUCKET_NAME=${TMP_BUCKET}"
echo "export AWS_S3_COMMON_BUCKET_NAME=${COMMON_BUCKET}"
echo "----------------------------------------------------------------------"

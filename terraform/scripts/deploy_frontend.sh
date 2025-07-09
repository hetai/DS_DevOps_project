#!/bin/bash
# Frontend Deployment Script for S3 + CloudFront
# Part of AWS Architecture Optimization Plan - Phase 1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${ENVIRONMENT:-dev}"
BUILD_DIR="${BUILD_DIR:-../app/frontend/scenario-tool-suite/dist}"
AWS_REGION="${AWS_REGION:-eu-west-3}"

# S3 bucket name (should match terraform configuration)
S3_BUCKET="${ENVIRONMENT}-frontend-assets"

echo -e "${YELLOW}🚀 Frontend Deployment Script${NC}"
echo -e "${YELLOW}===============================${NC}"
echo "Environment: $ENVIRONMENT"
echo "Build Directory: $BUILD_DIR"
echo "S3 Bucket: $S3_BUCKET"
echo "AWS Region: $AWS_REGION"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if build directory exists
if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ Build directory not found: $BUILD_DIR${NC}"
    echo -e "${YELLOW}💡 Please build the frontend first:${NC}"
    echo "   cd ../app/frontend/scenario-tool-suite"
    echo "   npm run build"
    exit 1
fi

# Check if S3 bucket exists
if ! aws s3 ls "s3://$S3_BUCKET" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo -e "${RED}❌ S3 bucket does not exist: $S3_BUCKET${NC}"
    echo -e "${YELLOW}💡 Please deploy the infrastructure first:${NC}"
    echo "   terraform apply -var-file=terraform.$ENVIRONMENT.tfvars"
    exit 1
fi

echo -e "${YELLOW}📦 Syncing files to S3...${NC}"

# Sync files to S3 with appropriate cache headers
aws s3 sync "$BUILD_DIR" "s3://$S3_BUCKET" \
    --region "$AWS_REGION" \
    --delete \
    --exclude "*.map" \
    --cache-control "public, max-age=31536000" \
    --metadata-directive REPLACE

# Set specific cache headers for HTML files (no cache)
aws s3 cp "$BUILD_DIR/index.html" "s3://$S3_BUCKET/index.html" \
    --region "$AWS_REGION" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --metadata-directive REPLACE

echo -e "${GREEN}✅ Files synced to S3${NC}"

# Get CloudFront distribution ID
echo -e "${YELLOW}🔍 Finding CloudFront distribution...${NC}"

DISTRIBUTION_ID=$(aws cloudfront list-distributions \
    --region "$AWS_REGION" \
    --query "DistributionList.Items[?Origins.Items[0].DomainName==\`$S3_BUCKET.s3.$AWS_REGION.amazonaws.com\`].Id" \
    --output text)

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" = "None" ]; then
    echo -e "${YELLOW}⚠️  CloudFront distribution not found. Deployment complete but cache may not be invalidated.${NC}"
    echo -e "${GREEN}✅ Frontend deployment completed!${NC}"
    exit 0
fi

echo "Distribution ID: $DISTRIBUTION_ID"

# Create CloudFront invalidation
echo -e "${YELLOW}🔄 Creating CloudFront invalidation...${NC}"

INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text)

echo "Invalidation ID: $INVALIDATION_ID"

# Wait for invalidation to complete (optional)
if [ "${WAIT_FOR_INVALIDATION:-false}" = "true" ]; then
    echo -e "${YELLOW}⏳ Waiting for invalidation to complete...${NC}"
    aws cloudfront wait invalidation-completed \
        --distribution-id "$DISTRIBUTION_ID" \
        --id "$INVALIDATION_ID"
    echo -e "${GREEN}✅ Invalidation completed${NC}"
else
    echo -e "${YELLOW}💡 Invalidation is running in the background. It may take 5-15 minutes to complete.${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Frontend deployment completed successfully!${NC}"
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "   1. Wait for CloudFront invalidation to complete (~5-15 minutes)"
echo "   2. Test the website functionality"
echo "   3. Monitor CloudWatch metrics for any issues"

# Get CloudFront domain name
DOMAIN_NAME=$(aws cloudfront get-distribution \
    --id "$DISTRIBUTION_ID" \
    --query "Distribution.DomainName" \
    --output text)

if [ -n "$DOMAIN_NAME" ] && [ "$DOMAIN_NAME" != "None" ]; then
    echo ""
    echo -e "${GREEN}🌐 Website URL: https://$DOMAIN_NAME${NC}"
fi
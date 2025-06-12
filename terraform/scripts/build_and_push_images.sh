#!/bin/bash

# Script to build and push Docker images to ECR
# Usage: ./build_and_push_images.sh <environment> <aws_region>

set -e

# Check if environment and region are provided
if [ $# -lt 2 ]; then
  echo "Usage: $0 <environment> <aws_region>"
  echo "Example: $0 dev eu-west-3"
  exit 1
fi

ENVIRONMENT=$1
AWS_REGION=$2
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Building and pushing Docker images for environment: $ENVIRONMENT in region: $AWS_REGION"

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push frontend image
echo "Building frontend image..."
cd ../../app/frontend/scenario-tool-suite
FRONTEND_REPO="$ENVIRONMENT-frontend"
FRONTEND_IMAGE="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$FRONTEND_REPO:latest"

# Check if repository exists, create if not
aws ecr describe-repositories --repository-names $FRONTEND_REPO --region $AWS_REGION || \
aws ecr create-repository --repository-name $FRONTEND_REPO --region $AWS_REGION

docker build -t $FRONTEND_REPO .
docker tag $FRONTEND_REPO $FRONTEND_IMAGE
docker push $FRONTEND_IMAGE

echo "Frontend image pushed to ECR: $FRONTEND_IMAGE"

# Build and push backend image
echo "Building backend image..."
cd ../../backend/openscenario-api-service
BACKEND_REPO="$ENVIRONMENT-backend"
BACKEND_IMAGE="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$BACKEND_REPO:latest"

# Check if repository exists, create if not
aws ecr describe-repositories --repository-names $BACKEND_REPO --region $AWS_REGION || \
aws ecr create-repository --repository-name $BACKEND_REPO --region $AWS_REGION

docker build -t $BACKEND_REPO .
docker tag $BACKEND_REPO $BACKEND_IMAGE
docker push $BACKEND_IMAGE

echo "Backend image pushed to ECR: $BACKEND_IMAGE"

echo "Done! Images have been built and pushed to ECR."
echo "Frontend image: $FRONTEND_IMAGE"
echo "Backend image: $BACKEND_IMAGE"

echo "You can now update your terraform.tfvars file with these image URLs."
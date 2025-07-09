#!/bin/bash
# Health Check Script for DS_DevOps_project
# This script performs health checks on the deployed infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if AWS CLI is installed and configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_status "AWS CLI is installed and configured"
}

# Function to check S3 buckets
check_s3_buckets() {
    print_status "Checking S3 buckets..."
    
    # Get list of buckets from Terraform output
    FRONTEND_BUCKET=$(cd .. && terraform output -raw frontend_bucket_name 2>/dev/null || echo "")
    
    if [ -z "$FRONTEND_BUCKET" ]; then
        print_warning "Could not get frontend bucket name from Terraform output"
    else
        # Check if bucket exists
        if aws s3api head-bucket --bucket "$FRONTEND_BUCKET" 2>/dev/null; then
            print_status "Frontend bucket '$FRONTEND_BUCKET' exists and is accessible"
        else
            print_error "Frontend bucket '$FRONTEND_BUCKET' does not exist or is not accessible"
        fi
    fi
}

# Function to check RDS instance
check_rds() {
    print_status "Checking RDS instance..."
    
    # Get RDS endpoint from Terraform output
    DB_ENDPOINT=$(cd .. && terraform output -raw db_endpoint 2>/dev/null || echo "")
    
    if [ -z "$DB_ENDPOINT" ]; then
        print_warning "Could not get DB endpoint from Terraform output"
    else
        # Check if RDS instance is available
        DB_IDENTIFIER=$(echo "$DB_ENDPOINT" | cut -d'.' -f1)
        DB_STATUS=$(aws rds describe-db-instances --db-instance-identifier "$DB_IDENTIFIER" --query "DBInstances[0].DBInstanceStatus" --output text 2>/dev/null || echo "")
        
        if [ "$DB_STATUS" == "available" ]; then
            print_status "RDS instance '$DB_IDENTIFIER' is available"
        else
            print_warning "RDS instance '$DB_IDENTIFIER' status: $DB_STATUS"
        fi
    fi
}

# Function to check ECS services
check_ecs_services() {
    print_status "Checking ECS services..."
    
    # Get ECS cluster name from Terraform output
    CLUSTER_NAME=$(cd .. && terraform output -raw ecs_cluster_name 2>/dev/null || echo "")
    
    if [ -z "$CLUSTER_NAME" ]; then
        print_warning "Could not get ECS cluster name from Terraform output"
        return
    fi
    
    # Get list of services
    SERVICES=$(aws ecs list-services --cluster "$CLUSTER_NAME" --query "serviceArns" --output text 2>/dev/null || echo "")
    
    if [ -z "$SERVICES" ]; then
        print_warning "No services found in ECS cluster '$CLUSTER_NAME'"
        return
    fi
    
    # Check service status
    for SERVICE in $SERVICES; do
        SERVICE_NAME=$(echo "$SERVICE" | rev | cut -d'/' -f1 | rev)
        SERVICE_STATUS=$(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$SERVICE_NAME" --query "services[0].status" --output text 2>/dev/null || echo "")
        
        if [ "$SERVICE_STATUS" == "ACTIVE" ]; then
            print_status "ECS service '$SERVICE_NAME' is active"
            
            # Check deployment status
            DEPLOYMENT_STATUS=$(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$SERVICE_NAME" --query "services[0].deployments[0].status" --output text 2>/dev/null || echo "")
            RUNNING_COUNT=$(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$SERVICE_NAME" --query "services[0].deployments[0].runningCount" --output text 2>/dev/null || echo "0")
            DESIRED_COUNT=$(aws ecs describe-services --cluster "$CLUSTER_NAME" --services "$SERVICE_NAME" --query "services[0].deployments[0].desiredCount" --output text 2>/dev/null || echo "0")
            
            if [ "$DEPLOYMENT_STATUS" == "PRIMARY" ] && [ "$RUNNING_COUNT" -eq "$DESIRED_COUNT" ]; then
                print_status "ECS service '$SERVICE_NAME' deployment is healthy ($RUNNING_COUNT/$DESIRED_COUNT tasks running)"
            else
                print_warning "ECS service '$SERVICE_NAME' deployment status: $DEPLOYMENT_STATUS ($RUNNING_COUNT/$DESIRED_COUNT tasks running)"
            fi
        else
            print_error "ECS service '$SERVICE_NAME' status: $SERVICE_STATUS"
        fi
    done
}

# Function to check CloudFront distribution
check_cloudfront() {
    print_status "Checking CloudFront distribution..."
    
    # Get CloudFront distribution ID from Terraform output
    DISTRIBUTION_ID=$(cd .. && terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
    
    if [ -z "$DISTRIBUTION_ID" ]; then
        print_warning "Could not get CloudFront distribution ID from Terraform output"
        return
    fi
    
    # Check distribution status
    DISTRIBUTION_STATUS=$(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" --query "Distribution.Status" --output text 2>/dev/null || echo "")
    
    if [ "$DISTRIBUTION_STATUS" == "Deployed" ]; then
        print_status "CloudFront distribution '$DISTRIBUTION_ID' is deployed"
    else
        print_warning "CloudFront distribution '$DISTRIBUTION_ID' status: $DISTRIBUTION_STATUS"
    fi
}

# Function to check ALB health
check_alb_health() {
    print_status "Checking ALB health..."
    
    # Get ALB DNS name from Terraform output
    ALB_DNS=$(cd .. && terraform output -raw alb_dns_name 2>/dev/null || echo "")
    
    if [ -z "$ALB_DNS" ]; then
        print_warning "Could not get ALB DNS name from Terraform output"
        return
    fi
    
    # Check if ALB is responding
    if curl -s -f "http://$ALB_DNS/health" &>/dev/null; then
        print_status "ALB health check passed"
    else
        print_warning "ALB health check failed"
    fi
}

# Function to check all resources
check_all_resources() {
    print_status "Starting comprehensive health check..."
    
    check_s3_buckets
    check_rds
    check_ecs_services
    check_cloudfront
    check_alb_health
    
    print_status "Health check completed"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --s3)
            check_s3_buckets
            shift
            ;;
        --rds)
            check_rds
            shift
            ;;
        --ecs)
            check_ecs_services
            shift
            ;;
        --cloudfront)
            check_cloudfront
            shift
            ;;
        --alb)
            check_alb_health
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --s3           Check S3 buckets"
            echo "  --rds          Check RDS instance"
            echo "  --ecs          Check ECS services"
            echo "  --cloudfront   Check CloudFront distribution"
            echo "  --alb          Check ALB health"
            echo "  --help         Show this help message"
            echo ""
            echo "If no options are provided, all checks will be performed."
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# If no arguments are provided, check all resources
if [ $# -eq 0 ]; then
    check_aws_cli
    check_all_resources
fi

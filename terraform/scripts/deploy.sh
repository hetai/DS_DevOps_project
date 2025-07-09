#!/bin/bash
# Complete Deployment Script for OpenSCENARIO AWS Infrastructure
# This script handles the complete deployment process

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_ENVIRONMENT="dev"
DEFAULT_REGION="us-east-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] COMMAND"
    echo ""
    echo "Commands:"
    echo "  plan      Create and show execution plan"
    echo "  apply     Apply the Terraform configuration"
    echo "  destroy   Destroy the infrastructure"
    echo "  init      Initialize Terraform"
    echo "  validate  Validate the configuration"
    echo "  output    Show output values"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Environment to deploy (dev, staging, prod)"
    echo "  -r, --region REGION      AWS region (default: us-east-1)"
    echo "  -a, --auto-approve       Auto-approve apply/destroy"
    echo "  -v, --verbose            Verbose output"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev plan"
    echo "  $0 -e staging apply"
    echo "  $0 -e prod destroy"
}

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if required tools are installed
    local required_tools=("terraform" "aws" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            print_error "$tool is not installed. Please install it first."
            exit 1
        fi
    done
    
    # Check AWS CLI configuration
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if terraform.tfvars exists for the environment
    if [ ! -f "$TERRAFORM_DIR/terraform.${ENVIRONMENT}.tfvars" ]; then
        print_error "terraform.${ENVIRONMENT}.tfvars file not found."
        print_error "Please create this file with the required variables."
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Function to initialize Terraform
init_terraform() {
    print_step "Initializing Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Check if backend configuration exists
    if [ -f "backend-${ENVIRONMENT}.tf" ]; then
        print_status "Using backend configuration for $ENVIRONMENT"
        terraform init -backend-config="backend-${ENVIRONMENT}.tf"
    else
        print_warning "No backend configuration found for $ENVIRONMENT"
        print_warning "Using local state (not recommended for production)"
        terraform init
    fi
    
    print_status "Terraform initialized"
}

# Function to validate configuration
validate_terraform() {
    print_step "Validating Terraform configuration..."
    
    cd "$TERRAFORM_DIR"
    terraform validate
    
    print_status "Terraform configuration is valid"
}

# Function to plan deployment
plan_deployment() {
    print_step "Creating Terraform execution plan..."
    
    cd "$TERRAFORM_DIR"
    
    # Select or create workspace
    terraform workspace select "$ENVIRONMENT" 2>/dev/null || terraform workspace new "$ENVIRONMENT"
    
    # Create plan
    terraform plan \
        -var-file="terraform.${ENVIRONMENT}.tfvars" \
        -out="terraform-${ENVIRONMENT}.plan"
    
    print_status "Execution plan created: terraform-${ENVIRONMENT}.plan"
}

# Function to apply deployment
apply_deployment() {
    print_step "Applying Terraform configuration..."
    
    cd "$TERRAFORM_DIR"
    
    # Select workspace
    terraform workspace select "$ENVIRONMENT"
    
    # Apply configuration
    if [ "$AUTO_APPROVE" = true ]; then
        terraform apply -auto-approve "terraform-${ENVIRONMENT}.plan"
    else
        terraform apply "terraform-${ENVIRONMENT}.plan"
    fi
    
    print_status "Deployment applied successfully"
}

# Function to destroy infrastructure
destroy_infrastructure() {
    print_step "Destroying infrastructure..."
    
    # Safety check for production
    if [ "$ENVIRONMENT" = "prod" ]; then
        print_warning "You are about to destroy PRODUCTION infrastructure!"
        read -p "Type 'yes' to confirm: " confirmation
        if [ "$confirmation" != "yes" ]; then
            print_error "Destruction cancelled"
            exit 1
        fi
    fi
    
    cd "$TERRAFORM_DIR"
    
    # Select workspace
    terraform workspace select "$ENVIRONMENT"
    
    # Destroy infrastructure
    if [ "$AUTO_APPROVE" = true ]; then
        terraform destroy -auto-approve -var-file="terraform.${ENVIRONMENT}.tfvars"
    else
        terraform destroy -var-file="terraform.${ENVIRONMENT}.tfvars"
    fi
    
    print_status "Infrastructure destroyed"
}

# Function to show outputs
show_outputs() {
    print_step "Showing Terraform outputs..."
    
    cd "$TERRAFORM_DIR"
    
    # Select workspace
    terraform workspace select "$ENVIRONMENT"
    
    # Show outputs
    terraform output
}

# Function to build and push Docker images
build_and_push_images() {
    print_step "Building and pushing Docker images..."
    
    # Get ECR repository URLs
    cd "$TERRAFORM_DIR"
    terraform workspace select "$ENVIRONMENT"
    
    BACKEND_REPO=$(terraform output -raw backend_repository_url 2>/dev/null || echo "")
    FRONTEND_REPO=$(terraform output -raw frontend_repository_url 2>/dev/null || echo "")
    
    if [ -z "$BACKEND_REPO" ] || [ -z "$FRONTEND_REPO" ]; then
        print_error "Could not get ECR repository URLs. Make sure infrastructure is deployed."
        exit 1
    fi
    
    # Login to ECR
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$(echo "$BACKEND_REPO" | cut -d'/' -f1)"
    
    # Build and push backend image
    print_status "Building backend image..."
    cd "$TERRAFORM_DIR/../app/backend/openscenario-api-service"
    docker build -t "$BACKEND_REPO:latest" .
    docker push "$BACKEND_REPO:latest"
    
    # Build frontend
    print_status "Building frontend..."
    cd "$TERRAFORM_DIR/../app/frontend/scenario-tool-suite"
    npm ci
    npm run build
    
    # Upload frontend to S3
    FRONTEND_BUCKET=$(cd "$TERRAFORM_DIR" && terraform output -raw frontend_bucket_name 2>/dev/null || echo "")
    if [ -n "$FRONTEND_BUCKET" ]; then
        print_status "Uploading frontend to S3..."
        aws s3 sync dist/ "s3://$FRONTEND_BUCKET/" --delete
        
        # Invalidate CloudFront cache
        CLOUDFRONT_ID=$(cd "$TERRAFORM_DIR" && terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
        if [ -n "$CLOUDFRONT_ID" ]; then
            aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_ID" --paths "/*"
        fi
    fi
    
    print_status "Images built and pushed successfully"
}

# Function to run post-deployment tasks
run_post_deployment() {
    print_step "Running post-deployment tasks..."
    
    cd "$TERRAFORM_DIR"
    
    # Get outputs
    local alb_dns=$(terraform output -raw alb_dns_name 2>/dev/null || echo "")
    local cloudfront_domain=$(terraform output -raw cloudfront_domain_name 2>/dev/null || echo "")
    
    if [ -n "$alb_dns" ]; then
        print_status "ALB DNS: $alb_dns"
        print_status "Backend API URL: http://$alb_dns/api"
    fi
    
    if [ -n "$cloudfront_domain" ]; then
        print_status "CloudFront Domain: $cloudfront_domain"
        print_status "Frontend URL: https://$cloudfront_domain"
    fi
    
    # Run health checks
    print_status "Running health checks..."
    if [ -f "$SCRIPT_DIR/health_check.sh" ]; then
        bash "$SCRIPT_DIR/health_check.sh"
    else
        print_warning "Health check script not found at $SCRIPT_DIR/health_check.sh"
    fi
    
    print_status "Post-deployment tasks completed"
}

# Function to create sample tfvars files
create_sample_tfvars() {
    print_step "Creating sample tfvars files..."
    
    for env in dev staging prod; do
        if [ ! -f "$TERRAFORM_DIR/terraform.${env}.tfvars" ]; then
            cat > "$TERRAFORM_DIR/terraform.${env}.tfvars" << EOF
# Terraform variables for $env environment
environment = "$env"
aws_region = "$AWS_REGION"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
availability_zones = ["${AWS_REGION}a", "${AWS_REGION}b"]
public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]

# Database Configuration
db_name = "openscenario_${env}"
db_username = "openscenario_user"
db_password = "CHANGE_ME_$(openssl rand -base64 12)"
db_instance_class = "db.t3.micro"

# Application Configuration
openai_api_key = "CHANGE_ME_YOUR_OPENAI_API_KEY"
log_level = "INFO"

# SSL Certificate ARN (create in ACM first)
certificate_arn = "arn:aws:acm:${AWS_REGION}:ACCOUNT_ID:certificate/CERTIFICATE_ID"

# Default tags
default_tags = {
  Environment = "$env"
  Project     = "OpenSCENARIO"
  ManagedBy   = "Terraform"
}
EOF
            print_status "Created terraform.${env}.tfvars"
        fi
    done
}

# Parse command line arguments
ENVIRONMENT="$DEFAULT_ENVIRONMENT"
AWS_REGION="$DEFAULT_REGION"
AUTO_APPROVE=false
VERBOSE=false
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -a|--auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        plan|apply|destroy|init|validate|output)
            COMMAND="$1"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if command is provided
if [ -z "$COMMAND" ]; then
    print_error "No command provided"
    show_usage
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_error "Valid environments: dev, staging, prod"
    exit 1
fi

# Set verbose output
if [ "$VERBOSE" = true ]; then
    set -x
fi

# Main execution
print_status "Starting deployment process..."
print_status "Environment: $ENVIRONMENT"
print_status "Region: $AWS_REGION"
print_status "Command: $COMMAND"

case $COMMAND in
    init)
        check_prerequisites
        init_terraform
        ;;
    validate)
        check_prerequisites
        validate_terraform
        ;;
    plan)
        check_prerequisites
        init_terraform
        validate_terraform
        plan_deployment
        ;;
    apply)
        check_prerequisites
        init_terraform
        validate_terraform
        plan_deployment
        apply_deployment
        build_and_push_images
        run_post_deployment
        show_outputs
        ;;
    destroy)
        check_prerequisites
        init_terraform
        destroy_infrastructure
        ;;
    output)
        show_outputs
        ;;
    *)
        print_error "Invalid command: $COMMAND"
        show_usage
        exit 1
        ;;
esac

print_status "Deployment process completed successfully!"

# Show helpful next steps
case $COMMAND in
    apply)
        echo ""
        echo "🎉 Deployment completed successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Check the outputs above for important URLs and endpoints"
        echo "2. Configure your domain DNS to point to the ALB"
        echo "3. Set up monitoring and alerting"
        echo "4. Run tests to verify everything is working"
        echo ""
        echo "Useful commands:"
        echo "- View outputs: $0 -e $ENVIRONMENT output"
        echo "- Update infrastructure: $0 -e $ENVIRONMENT apply"
        echo "- Destroy infrastructure: $0 -e $ENVIRONMENT destroy"
        ;;
esac
# DS_DevOps_project - EKS Terraform Variables

# AWS Region
aws_region      = "eu-west-3"
environment     = "eks-prod"
existing_vpc_id = ""

# Default Tags
default_tags = {
  Project     = "DS_DevOps_project"
  Environment = "eks-prod"
  ManagedBy   = "Terraform"
  Architecture = "EKS"
}

# VPC and Networking (optimized for EKS)
vpc_cidr             = "10.1.0.0/16"  # Different CIDR to avoid conflicts
availability_zones   = ["eu-west-3a", "eu-west-3b"]
public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
private_subnet_cidrs = ["10.1.3.0/24", "10.1.4.0/24"]

# Database (simplified for EKS)
db_name           = "dsdevops"
db_username       = "dbadmin"
db_password       = "DS_DevOps_EKS_Secure_Password_2025!"
db_instance_class = "db.t3.micro"

# Application Configuration
openai_api_key = "sk-example-openai-api-key-for-eks-deployment"
log_level      = "INFO"

# EKS Specific Configuration
kubernetes_version = "1.30"
node_instance_types = ["t3.small"]
desired_capacity = 1
min_capacity = 1
max_capacity = 2
use_spot_instances = true

# ECS Configuration (not used for EKS, but required by modules)
frontend_container_port = 80
backend_container_port  = 8080
frontend_cpu            = 256
frontend_memory         = 512
backend_cpu             = 512
backend_memory          = 1024

# Service Configuration
frontend_desired_count  = 2
backend_desired_count   = 2

# SSL Certificate Configuration
certificate_arn = ""

# Domain Configuration
domain_name = "eks.ds-devops.com"
api_subdomain = "api"
www_subdomain = "www"

# Route 53 Configuration
create_route53_zone = false
route53_zone_id = ""
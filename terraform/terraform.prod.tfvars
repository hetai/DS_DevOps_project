# DS_DevOps_project - Production Environment Configuration

# AWS Region
aws_region = "eu-west-3"

# Environment
environment = "prod"

# Default Tags
default_tags = {
  Project     = "DS_DevOps_project"
  Environment = "prod"
  ManagedBy   = "Terraform"
}

# VPC and Networking
vpc_cidr             = "10.2.0.0/16"
availability_zones   = ["eu-west-3a", "eu-west-3b", "eu-west-3c"]
public_subnet_cidrs  = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
private_subnet_cidrs = ["10.2.4.0/24", "10.2.5.0/24", "10.2.6.0/24"]

# Database (secrets will be managed by AWS Secrets Manager)
db_name           = "dsdevops_prod"
db_username       = "dbadmin"
db_password       = "placeholder" # Will be overridden by secrets manager
db_instance_class = "db.t3.medium"

# Application Configuration
openai_api_key = "placeholder" # Will be managed by secrets manager
log_level      = "INFO"

# ECS Configuration
frontend_container_port = 80
backend_container_port  = 8080
frontend_cpu            = 1024
frontend_memory         = 2048
backend_cpu             = 2048
backend_memory          = 4096

# Production-specific settings
frontend_desired_count = 2
backend_desired_count  = 2
# DS_DevOps_project - Staging Environment Configuration

# AWS Region
aws_region = "eu-west-3"

# Environment
environment = "staging"

# Default Tags
default_tags = {
  Project     = "DS_DevOps_project"
  Environment = "staging"
  ManagedBy   = "Terraform"
}

# VPC and Networking
vpc_cidr             = "10.1.0.0/16"
availability_zones   = ["eu-west-3a", "eu-west-3b"]
public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
private_subnet_cidrs = ["10.1.3.0/24", "10.1.4.0/24"]

# Database (secrets will be managed by AWS Secrets Manager)
db_name           = "dsdevops_staging"
db_username       = "dbadmin"
db_password       = "placeholder" # Will be overridden by secrets manager
db_instance_class = "db.t3.small"

# Application Configuration
openai_api_key = "placeholder" # Will be managed by secrets manager
log_level      = "INFO"

# ECS Configuration
frontend_container_port = 80
backend_container_port  = 8080
frontend_cpu            = 512
frontend_memory         = 1024
backend_cpu             = 1024
backend_memory          = 2048

# Staging-specific settings
frontend_desired_count = 1
backend_desired_count  = 1
# DS_DevOps_project - Development Environment Configuration

# AWS Region
aws_region = "eu-west-3"

# Environment
environment = "dev"

# Default Tags
default_tags = {
  Project     = "DS_DevOps_project"
  Environment = "dev"
  ManagedBy   = "Terraform"
}

# VPC and Networking
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["eu-west-3a", "eu-west-3b"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.3.0/24", "10.0.4.0/24"]

# Database (secrets will be managed by AWS Secrets Manager)
db_name           = "dsdevops_dev"
db_username       = "dbadmin"
db_password       = "placeholder" # Will be overridden by secrets manager
db_instance_class = "db.t3.micro"

# Application Configuration
openai_api_key = "placeholder" # Will be managed by secrets manager
log_level      = "DEBUG"

# ECS Configuration
frontend_container_port = 80
backend_container_port  = 8080
frontend_cpu            = 256
frontend_memory         = 512
backend_cpu             = 512
backend_memory          = 1024

# Development-specific settings
frontend_desired_count = 1
backend_desired_count  = 1
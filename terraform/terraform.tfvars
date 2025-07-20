# DS_DevOps_project - Terraform Variables

# AWS Region
aws_region      = "eu-west-3"
environment     = "dev"
existing_vpc_id = ""


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

# Database (secrets managed by AWS Secrets Manager)
db_name           = "dsdevops"
db_username       = "dbadmin"
db_password       = "DS_DevOps_Secure_Password_2025!" # Strong password for database
db_instance_class = "db.t3.micro"

# Application Configuration
openai_api_key = "sk-example-openai-api-key-for-deployment" # Will be managed by secrets manager
log_level      = "INFO"

# ECS Configuration
frontend_container_port = 80
backend_container_port  = 8080
frontend_cpu            = 256
frontend_memory         = 512
backend_cpu             = 512
backend_memory          = 1024

# Service Configuration
frontend_desired_count  = 1
backend_desired_count   = 1

# SSL Certificate Configuration
certificate_arn = "" # Will be updated with actual certificate ARN after creation

# Domain Configuration
domain_name = "example.com" # Replace with your actual domain name
api_subdomain = "api" # Subdomain for backend API (api.example.com)
www_subdomain = "www" # Subdomain for frontend (www.example.com)

# Route 53 Configuration
create_route53_zone = true # Set to true to create a new hosted zone, false to use existing
route53_zone_id = "" # ID of existing Route 53 hosted zone if create_route53_zone is false
# DS_DevOps_project - Terraform Variables

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

# Database
db_name           = "dsdevops"
db_username       = "dbadmin"
db_password       = "DS_DevOps_Secure_Pwd_2025!" 
db_instance_class = "db.t3.micro"

# ECS
frontend_container_port = 80
backend_container_port  = 8080
frontend_cpu            = 256
frontend_memory         = 512
backend_cpu             = 512
backend_memory          = 1024
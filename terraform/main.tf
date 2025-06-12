# DS_DevOps_project - Terraform Configuration

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region
  default_tags {
    tags = var.default_tags
  }
}

# Terraform Backend Configuration (Uncomment and configure when ready for production)
# terraform {
#   backend "s3" {
#     bucket         = "ds-devops-project-terraform-state"
#     key            = "terraform.tfstate"
#     region         = "eu-west-3"
#     dynamodb_table = "ds-devops-terraform-locks"
#     encrypt        = true
#   }
# }

# Networking Module - Creates VPC, Subnets, Internet Gateway, NAT Gateway, Route Tables
module "networking" {
  source = "./modules/networking"
  
  vpc_cidr             = var.vpc_cidr
  environment          = var.environment
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

# ECR Module - Creates repositories for Docker images
module "ecr" {
  source = "./modules/ecr"
  
  environment = var.environment
  repositories = [
    "frontend",
    "backend"
  ]
}

# RDS Module - Creates PostgreSQL database
module "rds" {
  source = "./modules/rds"
  
  environment        = var.environment
  subnet_ids         = module.networking.private_subnet_ids
  vpc_security_group_ids = [module.networking.db_security_group_id]
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
  db_instance_class  = var.db_instance_class
}

# IAM Module - Creates IAM roles and policies
module "iam" {
  source = "./modules/iam"
  
  environment = var.environment
}

# ECS Module - Creates ECS cluster and services
module "ecs" {
  source = "./modules/ecs_service"
  
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  alb_subnet_ids     = module.networking.public_subnet_ids
  ecs_security_group_id = module.networking.ecs_security_group_id
  alb_security_group_id = module.networking.alb_security_group_id
  ecs_task_execution_role_arn = module.iam.ecs_task_execution_role_arn
  frontend_image_url = "${module.ecr.repository_urls["frontend"]}:latest"
  backend_image_url  = "${module.ecr.repository_urls["backend"]}:latest"
  db_endpoint        = module.rds.db_endpoint
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
}

# AWS credentials will be provided through environment variables or AWS CLI configuration
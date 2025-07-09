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
  existing_vpc_id      = var.existing_vpc_id
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

# Secrets Manager Module - Manages sensitive configuration
module "secrets_manager" {
  source = "./modules/secrets_manager"
  
  environment     = var.environment
  db_username     = var.db_username
  db_password     = var.db_password
  openai_api_key  = var.openai_api_key
  log_level       = var.log_level
}

# IAM Module - Creates IAM roles and policies
module "iam" {
  source = "./modules/iam"
  
  environment = var.environment
  secrets_policy_arn = module.secrets_manager.ecs_secrets_policy_arn
}

# S3 + CloudFront Module - Hosts frontend static files
module "s3_cloudfront" {
  source = "./modules/s3_cloudfront"
  
  environment     = var.environment
  bucket_name     = "${var.environment}-frontend-assets"
  certificate_arn = var.certificate_arn
  domain_name     = var.domain_name
  www_subdomain   = var.www_subdomain
}

# ECS Module - Creates ECS cluster and services (backend only)
module "ecs" {
  source = "./modules/ecs_service"
  
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  alb_subnet_ids     = module.networking.public_subnet_ids
  ecs_security_group_id = module.networking.ecs_security_group_id
  alb_security_group_id = module.networking.alb_security_group_id
  ecs_task_execution_role_arn = module.iam.ecs_task_execution_role_arn
  backend_image_url  = module.ecr.repository_urls["backend"]
  db_endpoint        = module.rds.db_endpoint
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
  # Use secrets instead of hardcoded values
  db_secret_arn      = module.secrets_manager.db_secret_arn
  app_secret_arn     = module.secrets_manager.app_secret_arn
  # Domain configuration
  certificate_arn    = var.certificate_arn
  domain_name        = var.domain_name
  api_subdomain      = var.api_subdomain
}

# Route 53 Module - Manages DNS records for the application
# module "route53" {
#   source = "./modules/route53"
  
#   environment           = var.environment
#   domain_name           = var.domain_name
#   api_subdomain         = var.api_subdomain
#   www_subdomain         = var.www_subdomain
#   create_zone           = var.create_route53_zone
#   zone_id               = var.route53_zone_id
#   alb_dns_name          = module.ecs.alb_dns_name
#   alb_zone_id           = module.ecs.alb_zone_id
#   cloudfront_domain_name = module.s3_cloudfront.cloudfront_distribution_domain_name
#   certificate_arn       = var.certificate_arn
# }

# AWS credentials will be provided through environment variables or AWS CLI configuration
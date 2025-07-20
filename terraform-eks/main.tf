# DS_DevOps_project - EKS Infrastructure Main Configuration

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.default_tags
  }
}

# Data sources for existing infrastructure
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {}

# Networking Module
module "networking" {
  source = "./modules/networking"

  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  existing_vpc_id      = var.existing_vpc_id
}

# IAM Module
module "iam" {
  source = "./modules/iam"

  environment = var.environment
}

# EKS Module
module "eks" {
  source = "./modules/eks"

  environment               = var.environment
  default_tags              = var.default_tags
  kubernetes_version        = var.kubernetes_version
  cluster_service_role_arn  = module.iam.eks_cluster_role_arn
  node_group_role_arn       = module.iam.eks_node_group_role_arn
  subnet_ids                = concat(module.networking.public_subnet_ids, module.networking.private_subnet_ids)
  private_subnet_ids        = module.networking.private_subnet_ids
  cluster_security_group_id = module.networking.eks_cluster_security_group_id
  node_instance_types       = var.node_instance_types
  desired_capacity          = var.desired_capacity
  min_capacity              = var.min_capacity
  max_capacity              = var.max_capacity
  use_spot_instances        = var.use_spot_instances

  depends_on = [
    module.networking,
    module.iam
  ]
}

# Database Module (for data persistence)
module "database" {
  source = "./modules/rds"

  environment            = var.environment
  subnet_ids             = module.networking.private_subnet_ids
  vpc_security_group_ids = [module.networking.db_security_group_id]
  db_name                = var.db_name
  db_username            = var.db_username
  db_password            = var.db_password
  db_instance_class      = var.db_instance_class

  depends_on = [module.networking]
}
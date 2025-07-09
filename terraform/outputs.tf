# DS_DevOps_project - Terraform Outputs

# Networking Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

# ECR Outputs
output "ecr_repository_urls" {
  description = "URLs of the ECR repositories"
  value       = module.ecr.repository_urls
}

# RDS Outputs
output "db_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = module.rds.db_endpoint
}

output "db_name" {
  description = "Name of the database"
  value       = var.db_name
}

# ECS Outputs
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.ecs.alb_dns_name
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "frontend_url" {
  description = "URL to access the frontend application"
  value       = "https://${module.ecs.alb_dns_name}"
}

output "backend_url" {
  description = "URL to access the backend API"
  value       = "https://${module.ecs.alb_dns_name}/api"
}

# S3 + CloudFront Outputs
output "frontend_bucket_name" {
  description = "Name of the S3 bucket for frontend static files"
  value       = module.s3_cloudfront.s3_bucket_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.s3_cloudfront.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.s3_cloudfront.cloudfront_distribution_domain_name
}
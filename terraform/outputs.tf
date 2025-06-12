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

# ECR Outputs (Uncomment when ECR module is enabled)
# output "ecr_repository_urls" {
#   description = "URLs of the ECR repositories"
#   value       = module.ecr.repository_urls
# }

# RDS Outputs (Uncomment when RDS module is enabled)
# output "db_endpoint" {
#   description = "Endpoint of the RDS instance"
#   value       = module.rds.db_endpoint
# }
# 
# output "db_name" {
#   description = "Name of the database"
#   value       = var.db_name
# }

# ECS Outputs (Uncomment when ECS module is enabled)
# output "alb_dns_name" {
#   description = "DNS name of the Application Load Balancer"
#   value       = module.ecs.alb_dns_name
# }
# 
# output "frontend_url" {
#   description = "URL to access the frontend application"
#   value       = "http://${module.ecs.alb_dns_name}"
# }
# 
# output "backend_url" {
#   description = "URL to access the backend API"
#   value       = "http://${module.ecs.alb_dns_name}/api"
# }
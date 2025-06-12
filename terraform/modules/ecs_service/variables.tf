# DS_DevOps_project - ECS Service Module Variables

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-3"
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the ECS services"
  type        = list(string)
}

variable "alb_subnet_ids" {
  description = "List of subnet IDs for the ALB"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "ID of the ECS security group"
  type        = string
}

variable "alb_security_group_id" {
  description = "ID of the ALB security group"
  type        = string
}

variable "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  type        = string
}

variable "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  type        = string
  default     = ""
}

variable "frontend_image_url" {
  description = "URL of the frontend Docker image"
  type        = string
}

variable "backend_image_url" {
  description = "URL of the backend Docker image"
  type        = string
}

variable "frontend_cpu" {
  description = "CPU units for the frontend container"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory for the frontend container in MiB"
  type        = number
  default     = 512
}

variable "backend_cpu" {
  description = "CPU units for the backend container"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memory for the backend container in MiB"
  type        = number
  default     = 1024
}

variable "frontend_desired_count" {
  description = "Desired number of frontend tasks"
  type        = number
  default     = 2
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 2
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS"
  type        = string
  default     = "arn:aws:acm:eu-west-3:123456789012:certificate/example-certificate-arn"
}

variable "db_endpoint" {
  description = "Endpoint of the RDS instance"
  type        = string
}

variable "db_name" {
  description = "Name of the database"
  type        = string
}

variable "db_username" {
  description = "Username for the database"
  type        = string
}

variable "db_password" {
  description = "Password for the database"
  type        = string
  sensitive   = true
}
# Variables for CodeBuild module

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "codebuild_role_arn" {
  description = "ARN of the CodeBuild service role"
  type        = string
}

# Build configuration
variable "compute_type" {
  description = "CodeBuild compute type"
  type        = string
  default     = "BUILD_GENERAL1_MEDIUM"
}

variable "build_image" {
  description = "CodeBuild build image"
  type        = string
  default     = "aws/codebuild/standard:7.0"
}

variable "log_retention_days" {
  description = "Number of days to retain CodeBuild logs"
  type        = number
  default     = 30
}

# ECR configuration
variable "backend_ecr_repository_name" {
  description = "Name of the backend ECR repository"
  type        = string
}

variable "frontend_ecr_repository_name" {
  description = "Name of the frontend ECR repository"
  type        = string
  default     = ""
}

# S3 and CloudFront configuration
variable "frontend_s3_bucket_name" {
  description = "Name of the frontend S3 bucket"
  type        = string
}

variable "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  type        = string
}

variable "api_url" {
  description = "API URL for frontend configuration"
  type        = string
}

# ECS configuration
variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "ecs_service_name" {
  description = "Name of the ECS service"
  type        = string
}

variable "task_definition_family" {
  description = "Task definition family name"
  type        = string
}

variable "container_name" {
  description = "Container name in task definition"
  type        = string
}

# Security scanning configuration
variable "sonar_token" {
  description = "Secrets Manager secret name for SonarQube token"
  type        = string
  default     = ""
}

variable "snyk_token" {
  description = "Secrets Manager secret name for Snyk token"
  type        = string
  default     = ""
}

# Testing configuration
variable "test_database_url" {
  description = "Secrets Manager secret name for test database URL"
  type        = string
  default     = ""
}

variable "openai_api_key_secret_name" {
  description = "Secrets Manager secret name for OpenAI API key"
  type        = string
}

# Build timeout configuration
variable "build_timeout_minutes" {
  description = "Build timeout in minutes"
  type        = number
  default     = 20
}

variable "queued_timeout_minutes" {
  description = "Queued timeout in minutes"
  type        = number
  default     = 8
}

# Notification configuration
variable "sns_topic_arn" {
  description = "SNS topic ARN for build notifications"
  type        = string
  default     = ""
}

# Additional configuration
variable "enable_badge" {
  description = "Enable build badge"
  type        = bool
  default     = true
}

variable "concurrent_build_limit" {
  description = "Maximum number of concurrent builds"
  type        = number
  default     = 1
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
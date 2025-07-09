# DS_DevOps_project - Terraform Variables

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-west-3" # Paris region as specified in requirements
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "default_tags" {
  description = "Default tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "DS_DevOps_project"
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}

# VPC and Networking Variables
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "existing_vpc_id" {
  description = "ID of an existing VPC to use. If empty, a new VPC will be created."
  type        = string
  default     = ""
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
  default     = ["eu-west-3a", "eu-west-3b"] # Using two AZs in Paris region
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the private subnets"
  type        = list(string)
  default     = ["10.0.3.0/24", "10.0.4.0/24"]
}

# Database Variables
variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "dsdevops"
}

variable "db_username" {
  description = "Username for the database"
  type        = string
  default     = "dbadmin"
  sensitive   = true
}

variable "db_password" {
  description = "Password for the database"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "Instance class for the RDS instance"
  type        = string
  default     = "db.t3.micro" # As specified in requirements
}

# ECS Variables
variable "frontend_container_port" {
  description = "Port the frontend container listens on"
  type        = number
  default     = 80
}

variable "backend_container_port" {
  description = "Port the backend container listens on"
  type        = number
  default     = 8080
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

# Application Configuration Variables
variable "openai_api_key" {
  description = "OpenAI API key for AI services"
  type        = string
  sensitive   = true
  default     = ""
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "INFO"
  
  validation {
    condition     = contains(["DEBUG", "INFO", "WARN", "ERROR"], var.log_level)
    error_message = "Log level must be one of: DEBUG, INFO, WARN, ERROR."
  }
}

# ECS Service Configuration
variable "frontend_desired_count" {
  description = "Desired number of frontend tasks"
  type        = number
  default     = 1
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 1
}

# SSL Certificate Configuration
variable "certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS"
  type        = string
  default     = ""
}

# Domain Configuration
variable "domain_name" {
  description = "Main domain name for the application"
  type        = string
  default     = "example.com"
}

variable "api_subdomain" {
  description = "Subdomain for backend API"
  type        = string
  default     = "api"
}

variable "www_subdomain" {
  description = "Subdomain for frontend application"
  type        = string
  default     = "www"
}

# Route 53 Configuration
variable "create_route53_zone" {
  description = "Whether to create a new Route 53 hosted zone or use an existing one"
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "ID of an existing Route 53 hosted zone (if create_route53_zone is false)"
  type        = string
  default     = ""
}
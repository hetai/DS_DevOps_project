# DS_DevOps_project - S3 and CloudFront Module Variables

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "bucket_name" {
  description = "Name of the S3 bucket (without environment prefix)"
  type        = string
  default     = "frontend-assets"
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for CloudFront"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Main domain name for the application"
  type        = string
  default     = "example.com"
}

variable "www_subdomain" {
  description = "Subdomain for frontend application"
  type        = string
  default     = "www"
}
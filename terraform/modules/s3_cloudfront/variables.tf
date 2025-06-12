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
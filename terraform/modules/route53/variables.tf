# DS_DevOps_project - Route 53 Module Variables

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "domain_name" {
  description = "Main domain name for the application"
  type        = string
}

variable "api_subdomain" {
  description = "Subdomain for backend API"
  type        = string
  default     = "api"
}

variable "www_subdomain" {
  description = "Subdomain for frontend"
  type        = string
  default     = "www"
}

variable "create_zone" {
  description = "Whether to create a new Route 53 hosted zone or use an existing one"
  type        = bool
  default     = false
}

variable "zone_id" {
  description = "ID of an existing Route 53 hosted zone (if create_zone is false)"
  type        = string
  default     = ""
}

variable "alb_dns_name" {
  description = "DNS name of the ALB for API subdomain"
  type        = string
  default     = ""
}

variable "alb_zone_id" {
  description = "Route 53 zone ID of the ALB for API subdomain"
  type        = string
  default     = ""
}

variable "cloudfront_domain_name" {
  description = "CloudFront distribution domain name for www subdomain"
  type        = string
  default     = ""
}

variable "cloudfront_zone_id" {
  description = "Route 53 zone ID of the CloudFront distribution"
  type        = string
  default     = "Z2FDTNDATAQYW2" # This is the fixed CloudFront hosted zone ID
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS"
  type        = string
  default     = ""
}

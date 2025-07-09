# DS_DevOps_project - WAF Module Variables

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "alb_arn" {
  description = "ARN of the Application Load Balancer to protect"
  type        = string
}

variable "rate_limit" {
  description = "Rate limit for requests per 5-minute period"
  type        = number
  default     = 2000
}
# DS_DevOps_project - IAM Module Variables

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "secrets_policy_arn" {
  description = "ARN of the secrets policy to attach to ECS task role"
  type        = string
  default     = ""
}
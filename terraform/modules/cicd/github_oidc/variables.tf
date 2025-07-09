# Variables for GitHub OIDC module

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
}

variable "github_organization" {
  description = "GitHub organization name"
  type        = string
  default     = ""
}

# Branch configurations
variable "dev_branch" {
  description = "Development branch name"
  type        = string
  default     = "develop"
}

variable "staging_branch" {
  description = "Staging branch name"
  type        = string
  default     = "staging"
}

variable "prod_branch" {
  description = "Production branch name"
  type        = string
  default     = "main"
}

# Additional repository patterns for more granular control
variable "additional_dev_patterns" {
  description = "Additional repository patterns for development access"
  type        = list(string)
  default     = []
}

variable "additional_staging_patterns" {
  description = "Additional repository patterns for staging access"
  type        = list(string)
  default     = []
}

variable "additional_prod_patterns" {
  description = "Additional repository patterns for production access"
  type        = list(string)
  default     = []
}

# Security constraints
variable "max_session_duration" {
  description = "Maximum session duration in seconds"
  type        = number
  default     = 3600
}

variable "enable_mfa_requirement" {
  description = "Require MFA for production deployments"
  type        = bool
  default     = true
}

# CodeBuild configuration
variable "codebuild_compute_type" {
  description = "CodeBuild compute type"
  type        = string
  default     = "BUILD_GENERAL1_MEDIUM"
}

variable "codebuild_image" {
  description = "CodeBuild image"
  type        = string
  default     = "aws/codebuild/standard:5.0"
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
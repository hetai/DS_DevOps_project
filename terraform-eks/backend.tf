# DS_DevOps_project - EKS Backend Configuration

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Using local backend for initial testing
  # Will be migrated to S3 after successful validation
}
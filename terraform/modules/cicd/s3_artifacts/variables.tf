# Variables for S3 artifacts module

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  type        = string
}

# Artifact retention periods
variable "artifacts_retention_days" {
  description = "Retention days for build artifacts"
  type        = number
  default     = 90
}

variable "artifacts_standard_to_ia_days" {
  description = "Days to transition artifacts from Standard to IA"
  type        = number
  default     = 30
}

variable "artifacts_ia_to_glacier_days" {
  description = "Days to transition artifacts from IA to Glacier"
  type        = number
  default     = 60
}

# Test reports retention
variable "test_reports_retention_days" {
  description = "Retention days for test reports"
  type        = number
  default     = 365
}

variable "test_reports_standard_to_ia_days" {
  description = "Days to transition test reports from Standard to IA"
  type        = number
  default     = 60
}

# Security reports retention
variable "security_reports_retention_days" {
  description = "Retention days for security scan reports"
  type        = number
  default     = 365
}

variable "security_reports_standard_to_ia_days" {
  description = "Days to transition security reports from Standard to IA"
  type        = number
  default     = 90
}

# Deployment logs retention
variable "deployment_logs_retention_days" {
  description = "Retention days for deployment logs"
  type        = number
  default     = 365
}

variable "deployment_logs_standard_to_ia_days" {
  description = "Days to transition deployment logs from Standard to IA"
  type        = number
  default     = 30
}

variable "deployment_logs_ia_to_glacier_days" {
  description = "Days to transition deployment logs from IA to Glacier"
  type        = number
  default     = 90
}

# CodePipeline artifacts retention
variable "codepipeline_artifacts_retention_days" {
  description = "Retention days for CodePipeline artifacts"
  type        = number
  default     = 30
}

# Backup storage retention
variable "backup_retention_days" {
  description = "Retention days for backup storage"
  type        = number
  default     = 2555  # 7 years
}

variable "backup_standard_to_ia_days" {
  description = "Days to transition backups from Standard to IA"
  type        = number
  default     = 30
}

variable "backup_ia_to_glacier_days" {
  description = "Days to transition backups from IA to Glacier"
  type        = number
  default     = 90
}

variable "backup_glacier_to_deep_archive_days" {
  description = "Days to transition backups from Glacier to Deep Archive"
  type        = number
  default     = 365
}

# Configuration backup retention
variable "config_backup_retention_days" {
  description = "Retention days for configuration backups"
  type        = number
  default     = 365
}

variable "config_backup_standard_to_ia_days" {
  description = "Days to transition config backups from Standard to IA"
  type        = number
  default     = 30
}

variable "config_backup_ia_to_glacier_days" {
  description = "Days to transition config backups from IA to Glacier"
  type        = number
  default     = 90
}

# Temporary artifacts retention
variable "temp_artifacts_retention_days" {
  description = "Retention days for temporary artifacts"
  type        = number
  default     = 1
}

# Noncurrent version expiration
variable "noncurrent_version_expiration_days" {
  description = "Days to expire noncurrent versions"
  type        = number
  default     = 30
}

# Monitoring thresholds
variable "bucket_size_threshold" {
  description = "Bucket size threshold in bytes for CloudWatch alarm"
  type        = number
  default     = 10737418240  # 10GB
}

variable "bucket_objects_threshold" {
  description = "Bucket objects threshold for CloudWatch alarm"
  type        = number
  default     = 10000
}

# Cost optimization
variable "enable_intelligent_tiering" {
  description = "Enable S3 Intelligent Tiering"
  type        = bool
  default     = true
}

variable "enable_request_payer" {
  description = "Enable request payer configuration"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
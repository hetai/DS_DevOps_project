# Variables for S3 lifecycle management module

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

# Lifecycle transition days
variable "standard_to_ia_days" {
  description = "Days to transition from Standard to IA storage"
  type        = number
  default     = 30
}

variable "ia_to_glacier_days" {
  description = "Days to transition from IA to Glacier storage"
  type        = number
  default     = 90
}

variable "glacier_to_deep_archive_days" {
  description = "Days to transition from Glacier to Deep Archive storage"
  type        = number
  default     = 365
}

variable "retention_days" {
  description = "Total retention days for log data"
  type        = number
  default     = 2555  # 7 years
}

variable "noncurrent_version_expiration_days" {
  description = "Days to expire noncurrent versions"
  type        = number
  default     = 90
}

# Metrics-specific lifecycle
variable "metrics_standard_to_ia_days" {
  description = "Days to transition metrics from Standard to IA"
  type        = number
  default     = 7
}

variable "metrics_ia_to_glacier_days" {
  description = "Days to transition metrics from IA to Glacier"
  type        = number
  default     = 30
}

variable "metrics_retention_days" {
  description = "Total retention days for metrics data"
  type        = number
  default     = 365
}

variable "temp_data_retention_days" {
  description = "Retention days for temporary data"
  type        = number
  default     = 1
}

# Archival schedule
variable "archival_schedule" {
  description = "Cron expression for data archival schedule"
  type        = string
  default     = "cron(0 2 * * ? *)"  # Daily at 2 AM
}

# Lambda configuration
variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 900
}

variable "lambda_memory_size" {
  description = "Lambda memory size in MB"
  type        = number
  default     = 512
}

# Cost optimization
variable "enable_intelligent_tiering" {
  description = "Enable S3 Intelligent Tiering"
  type        = bool
  default     = true
}

variable "enable_metrics_storage_analytics" {
  description = "Enable S3 storage analytics for metrics"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
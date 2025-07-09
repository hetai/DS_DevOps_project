# Variables for AMP monitoring module

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "webhook_url" {
  description = "Webhook URL for alert notifications"
  type        = string
  default     = ""
}

variable "critical_alerts_topic_arn" {
  description = "SNS topic ARN for critical alerts"
  type        = string
}

variable "warning_alerts_topic_arn" {
  description = "SNS topic ARN for warning alerts"
  type        = string
}

variable "cost_alert_topic_arn" {
  description = "SNS topic ARN for cost alerts"
  type        = string
}

variable "cost_threshold" {
  description = "Cost threshold for AMP billing alerts"
  type        = number
  default     = 100
}

variable "enable_long_term_storage" {
  description = "Enable long-term storage workspace"
  type        = bool
  default     = false
}

# Alert thresholds
variable "response_time_threshold" {
  description = "Response time threshold in seconds"
  type        = number
  default     = 2
}

variable "error_rate_threshold" {
  description = "Error rate threshold"
  type        = number
  default     = 0.1
}

variable "openai_failure_threshold" {
  description = "OpenAI API failure threshold"
  type        = number
  default     = 5
}

variable "workflow_failure_threshold" {
  description = "Workflow failure threshold"
  type        = number
  default     = 3
}

variable "database_failure_threshold" {
  description = "Database connection failure threshold"
  type        = number
  default     = 5
}

variable "validation_failure_threshold" {
  description = "Scenario validation failure threshold"
  type        = number
  default     = 10
}

variable "memory_usage_threshold" {
  description = "Memory usage threshold (0.0-1.0)"
  type        = number
  default     = 0.9
}

variable "cpu_usage_threshold" {
  description = "CPU usage threshold (0-100)"
  type        = number
  default     = 80
}

variable "disk_usage_threshold" {
  description = "Disk usage threshold (0.0-1.0)"
  type        = number
  default     = 0.1
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
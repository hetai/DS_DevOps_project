# Variables for SNS notification module

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "critical_email_addresses" {
  description = "List of email addresses for critical alerts"
  type        = list(string)
  default     = []
}

variable "warning_email_addresses" {
  description = "List of email addresses for warning alerts"
  type        = list(string)
  default     = []
}

variable "cost_email_addresses" {
  description = "List of email addresses for cost alerts"
  type        = list(string)
  default     = []
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

variable "enable_sms_alerts" {
  description = "Enable SMS alerts for critical notifications"
  type        = bool
  default     = false
}

variable "sms_phone_numbers" {
  description = "List of phone numbers for SMS alerts"
  type        = list(string)
  default     = []
  sensitive   = true
}

variable "lambda_timeout" {
  description = "Timeout for Lambda functions in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory_size" {
  description = "Memory size for Lambda functions in MB"
  type        = number
  default     = 128
}

variable "log_retention_days" {
  description = "Number of days to retain Lambda logs"
  type        = number
  default     = 14
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
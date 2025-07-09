# Variables for CloudWatch monitoring module

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

variable "cluster_name" {
  description = "ECS cluster name"
  type        = string
}

variable "alb_arn_suffix" {
  description = "ALB ARN suffix for CloudWatch metrics"
  type        = string
}

variable "rds_instance_id" {
  description = "RDS instance identifier"
  type        = string
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  type        = string
}

# Optional variables with defaults
variable "alarm_evaluation_periods" {
  description = "Number of evaluation periods for alarms"
  type        = number
  default     = 2
}

variable "alarm_period" {
  description = "Period for alarm evaluation in seconds"
  type        = number
  default     = 300
}

variable "cpu_threshold" {
  description = "CPU utilization threshold for alarms"
  type        = number
  default     = 80
}

variable "memory_threshold" {
  description = "Memory utilization threshold for alarms"
  type        = number
  default     = 90
}

variable "response_time_threshold" {
  description = "Response time threshold in seconds"
  type        = number
  default     = 2.0
}

variable "error_rate_threshold" {
  description = "Error rate threshold for 5XX errors"
  type        = number
  default     = 10
}

variable "openai_failure_threshold" {
  description = "OpenAI API failure threshold"
  type        = number
  default     = 5
}

variable "validation_failure_threshold" {
  description = "Scenario validation failure threshold"
  type        = number
  default     = 10
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
# Outputs for S3 lifecycle management module

output "monitoring_archive_bucket_name" {
  description = "Name of the monitoring data archive bucket"
  value       = aws_s3_bucket.monitoring_data_archive.bucket
}

output "monitoring_archive_bucket_arn" {
  description = "ARN of the monitoring data archive bucket"
  value       = aws_s3_bucket.monitoring_data_archive.arn
}

output "monitoring_archive_bucket_domain_name" {
  description = "Domain name of the monitoring data archive bucket"
  value       = aws_s3_bucket.monitoring_data_archive.bucket_domain_name
}

output "grafana_dashboards_bucket_name" {
  description = "Name of the Grafana dashboards backup bucket"
  value       = aws_s3_bucket.grafana_dashboards_backup.bucket
}

output "grafana_dashboards_bucket_arn" {
  description = "ARN of the Grafana dashboards backup bucket"
  value       = aws_s3_bucket.grafana_dashboards_backup.arn
}

output "data_archival_lambda_function_name" {
  description = "Name of the data archival Lambda function"
  value       = aws_lambda_function.data_archival.function_name
}

output "data_archival_lambda_function_arn" {
  description = "ARN of the data archival Lambda function"
  value       = aws_lambda_function.data_archival.arn
}

output "archival_schedule_rule_name" {
  description = "Name of the archival schedule CloudWatch rule"
  value       = aws_cloudwatch_event_rule.data_archival_schedule.name
}

output "archival_schedule_rule_arn" {
  description = "ARN of the archival schedule CloudWatch rule"
  value       = aws_cloudwatch_event_rule.data_archival_schedule.arn
}

output "archival_failures_alarm_arn" {
  description = "ARN of the archival failures CloudWatch alarm"
  value       = aws_cloudwatch_metric_alarm.archival_failures.arn
}

output "lambda_archival_role_arn" {
  description = "ARN of the Lambda archival IAM role"
  value       = aws_iam_role.lambda_archival_role.arn
}

output "lambda_archival_policy_arn" {
  description = "ARN of the Lambda archival IAM policy"
  value       = aws_iam_policy.lambda_archival_policy.arn
}

# Storage classes and lifecycle information
output "lifecycle_configuration" {
  description = "S3 lifecycle configuration details"
  value = {
    standard_to_ia_days           = var.standard_to_ia_days
    ia_to_glacier_days           = var.ia_to_glacier_days
    glacier_to_deep_archive_days = var.glacier_to_deep_archive_days
    retention_days               = var.retention_days
    metrics_retention_days       = var.metrics_retention_days
    temp_data_retention_days     = var.temp_data_retention_days
  }
}

# Cost optimization features
output "cost_optimization_features" {
  description = "Enabled cost optimization features"
  value = {
    intelligent_tiering_enabled = var.enable_intelligent_tiering
    storage_analytics_enabled   = var.enable_metrics_storage_analytics
    lifecycle_rules_count       = 3
    archival_automation_enabled = true
  }
}
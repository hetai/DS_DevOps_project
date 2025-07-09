# Outputs for CloudWatch monitoring module

output "backend_log_group_name" {
  description = "Name of the backend log group"
  value       = aws_cloudwatch_log_group.openscenario_backend.name
}

output "backend_log_group_arn" {
  description = "ARN of the backend log group"
  value       = aws_cloudwatch_log_group.openscenario_backend.arn
}

output "frontend_log_group_name" {
  description = "Name of the frontend log group"
  value       = aws_cloudwatch_log_group.openscenario_frontend.name
}

output "frontend_log_group_arn" {
  description = "ARN of the frontend log group"
  value       = aws_cloudwatch_log_group.openscenario_frontend.arn
}

output "dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.openscenario_dashboard.dashboard_name}"
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.openscenario_dashboard.dashboard_name
}

# Alarm outputs
output "cpu_alarm_arn" {
  description = "ARN of the CPU alarm"
  value       = aws_cloudwatch_metric_alarm.high_cpu_backend.arn
}

output "memory_alarm_arn" {
  description = "ARN of the memory alarm"
  value       = aws_cloudwatch_metric_alarm.high_memory_backend.arn
}

output "alb_response_time_alarm_arn" {
  description = "ARN of the ALB response time alarm"
  value       = aws_cloudwatch_metric_alarm.alb_high_response_time.arn
}

output "alb_error_rate_alarm_arn" {
  description = "ARN of the ALB error rate alarm"
  value       = aws_cloudwatch_metric_alarm.alb_high_error_rate.arn
}

output "rds_cpu_alarm_arn" {
  description = "ARN of the RDS CPU alarm"
  value       = aws_cloudwatch_metric_alarm.rds_high_cpu.arn
}

output "rds_connections_alarm_arn" {
  description = "ARN of the RDS connections alarm"
  value       = aws_cloudwatch_metric_alarm.rds_high_connections.arn
}

output "openai_failures_alarm_arn" {
  description = "ARN of the OpenAI API failures alarm"
  value       = aws_cloudwatch_metric_alarm.openai_api_failures.arn
}

output "validation_failures_alarm_arn" {
  description = "ARN of the scenario validation failures alarm"
  value       = aws_cloudwatch_metric_alarm.scenario_validation_failures.arn
}

# Query definition outputs
output "error_analysis_query_name" {
  description = "Name of the error analysis query"
  value       = aws_cloudwatch_query_definition.error_analysis.name
}

output "performance_analysis_query_name" {
  description = "Name of the performance analysis query"
  value       = aws_cloudwatch_query_definition.performance_analysis.name
}
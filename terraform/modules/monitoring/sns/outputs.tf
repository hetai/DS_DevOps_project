# Outputs for SNS notification module

output "critical_alerts_topic_arn" {
  description = "ARN of the critical alerts SNS topic"
  value       = aws_sns_topic.critical_alerts.arn
}

output "critical_alerts_topic_name" {
  description = "Name of the critical alerts SNS topic"
  value       = aws_sns_topic.critical_alerts.name
}

output "warning_alerts_topic_arn" {
  description = "ARN of the warning alerts SNS topic"
  value       = aws_sns_topic.warning_alerts.arn
}

output "warning_alerts_topic_name" {
  description = "Name of the warning alerts SNS topic"
  value       = aws_sns_topic.warning_alerts.name
}

output "cost_alerts_topic_arn" {
  description = "ARN of the cost alerts SNS topic"
  value       = aws_sns_topic.cost_alerts.arn
}

output "cost_alerts_topic_name" {
  description = "Name of the cost alerts SNS topic"
  value       = aws_sns_topic.cost_alerts.name
}

output "slack_notifier_function_arn" {
  description = "ARN of the Slack notifier Lambda function"
  value       = var.slack_webhook_url != "" ? aws_lambda_function.slack_notifier[0].arn : null
}

output "slack_notifier_function_name" {
  description = "Name of the Slack notifier Lambda function"
  value       = var.slack_webhook_url != "" ? aws_lambda_function.slack_notifier[0].function_name : null
}

output "lambda_role_arn" {
  description = "ARN of the Lambda IAM role"
  value       = var.slack_webhook_url != "" ? aws_iam_role.lambda_role[0].arn : null
}

output "sns_delivery_failures_alarm_arn" {
  description = "ARN of the SNS delivery failures alarm"
  value       = aws_cloudwatch_metric_alarm.sns_delivery_failures.arn
}

# Topic subscription outputs
output "critical_email_subscription_arns" {
  description = "ARNs of critical email subscriptions"
  value       = aws_sns_topic_subscription.critical_email[*].arn
}

output "warning_email_subscription_arns" {
  description = "ARNs of warning email subscriptions"
  value       = aws_sns_topic_subscription.warning_email[*].arn
}

output "cost_email_subscription_arns" {
  description = "ARNs of cost email subscriptions"
  value       = aws_sns_topic_subscription.cost_email[*].arn
}

output "slack_subscription_arn" {
  description = "ARN of the Slack subscription"
  value       = var.slack_webhook_url != "" ? aws_sns_topic_subscription.critical_slack[0].arn : null
}
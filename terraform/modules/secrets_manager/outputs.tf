# DS_DevOps_project - Secrets Manager Module Outputs

output "db_secret_arn" {
  description = "ARN of the database secret"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "db_secret_name" {
  description = "Name of the database secret"
  value       = aws_secretsmanager_secret.db_password.name
}

output "app_secret_arn" {
  description = "ARN of the application secret"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "app_secret_name" {
  description = "Name of the application secret"
  value       = aws_secretsmanager_secret.app_secrets.name
}

output "ecs_secrets_policy_arn" {
  description = "ARN of the ECS secrets policy"
  value       = aws_iam_policy.ecs_secrets_policy.arn
}

output "ecs_secrets_policy_name" {
  description = "Name of the ECS secrets policy"
  value       = aws_iam_policy.ecs_secrets_policy.name
}
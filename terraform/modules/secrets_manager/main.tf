# DS_DevOps_project - Secrets Manager Module
# Phase 0: Basic Security Hardening

# Create secret for database password
resource "aws_secretsmanager_secret" "db_password" {
  name        = "${var.environment}-db-password"
  description = "Database password for ${var.environment} environment"
  
  tags = {
    Name        = "${var.environment}-db-password"
    Environment = var.environment
    Purpose     = "Database"
  }
}

# Store the database password value
resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
  })
}

# Create secret for other sensitive configuration
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${var.environment}-app-secrets"
  description = "Application secrets for ${var.environment} environment"
  
  tags = {
    Name        = "${var.environment}-app-secrets"
    Environment = var.environment
    Purpose     = "Application"
  }
}

# Store application secrets
resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id     = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    openai_api_key = var.openai_api_key
    log_level      = var.log_level
  })
}

# Create IAM policy for ECS tasks to access secrets
resource "aws_iam_policy" "ecs_secrets_policy" {
  name        = "${var.environment}-ecs-secrets-policy"
  description = "Policy for ECS tasks to access secrets"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_password.arn,
          aws_secretsmanager_secret.app_secrets.arn
        ]
      }
    ]
  })
  
  tags = {
    Name        = "${var.environment}-ecs-secrets-policy"
    Environment = var.environment
  }
}
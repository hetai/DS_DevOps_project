# SNS notification module for OpenSCENARIO monitoring
# Phase 2: Hybrid Monitoring Platform Deployment

# Critical alerts SNS topic
resource "aws_sns_topic" "critical_alerts" {
  name = "${var.environment}-openscenario-critical-alerts"

  tags = {
    Name        = "${var.environment}-openscenario-critical-alerts"
    Environment = var.environment
    Service     = "monitoring"
    Purpose     = "Critical alerts"
  }
}

# Warning alerts SNS topic
resource "aws_sns_topic" "warning_alerts" {
  name = "${var.environment}-openscenario-warning-alerts"

  tags = {
    Name        = "${var.environment}-openscenario-warning-alerts"
    Environment = var.environment
    Service     = "monitoring"
    Purpose     = "Warning alerts"
  }
}

# Cost alerts SNS topic
resource "aws_sns_topic" "cost_alerts" {
  name = "${var.environment}-openscenario-cost-alerts"

  tags = {
    Name        = "${var.environment}-openscenario-cost-alerts"
    Environment = var.environment
    Service     = "monitoring"
    Purpose     = "Cost alerts"
  }
}

# Email subscriptions for critical alerts
resource "aws_sns_topic_subscription" "critical_email" {
  count     = length(var.critical_email_addresses)
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "email"
  endpoint  = var.critical_email_addresses[count.index]
}

# Email subscriptions for warning alerts
resource "aws_sns_topic_subscription" "warning_email" {
  count     = length(var.warning_email_addresses)
  topic_arn = aws_sns_topic.warning_alerts.arn
  protocol  = "email"
  endpoint  = var.warning_email_addresses[count.index]
}

# Email subscriptions for cost alerts
resource "aws_sns_topic_subscription" "cost_email" {
  count     = length(var.cost_email_addresses)
  topic_arn = aws_sns_topic.cost_alerts.arn
  protocol  = "email"
  endpoint  = var.cost_email_addresses[count.index]
}

# Slack integration for critical alerts
resource "aws_sns_topic_subscription" "critical_slack" {
  count     = var.slack_webhook_url != "" ? 1 : 0
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.slack_notifier[0].arn
}

# Lambda function for Slack notifications
resource "aws_lambda_function" "slack_notifier" {
  count            = var.slack_webhook_url != "" ? 1 : 0
  filename         = "${path.module}/slack_notifier.zip"
  function_name    = "${var.environment}-slack-notifier"
  role            = aws_iam_role.lambda_role[0].arn
  handler         = "index.handler"
  runtime         = "python3.9"
  timeout         = 30

  environment {
    variables = {
      SLACK_WEBHOOK_URL = var.slack_webhook_url
      ENVIRONMENT       = var.environment
    }
  }

  depends_on = [data.archive_file.slack_notifier_zip[0]]

  tags = {
    Name        = "${var.environment}-slack-notifier"
    Environment = var.environment
    Service     = "monitoring"
    Purpose     = "Slack notifications"
  }
}

# Lambda function code
data "archive_file" "slack_notifier_zip" {
  count       = var.slack_webhook_url != "" ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/slack_notifier.zip"
  
  source {
    content = templatefile("${path.module}/slack_notifier.py", {
      webhook_url = var.slack_webhook_url
      environment = var.environment
    })
    filename = "index.py"
  }
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_role" {
  count = var.slack_webhook_url != "" ? 1 : 0
  name  = "${var.environment}-slack-notifier-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-slack-notifier-role"
    Environment = var.environment
    Service     = "monitoring"
  }
}

# IAM policy for Lambda
resource "aws_iam_policy" "lambda_policy" {
  count       = var.slack_webhook_url != "" ? 1 : 0
  name        = "${var.environment}-slack-notifier-policy"
  description = "Policy for Slack notifier Lambda"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-slack-notifier-policy"
    Environment = var.environment
    Service     = "monitoring"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attachment" {
  count      = var.slack_webhook_url != "" ? 1 : 0
  role       = aws_iam_role.lambda_role[0].name
  policy_arn = aws_iam_policy.lambda_policy[0].arn
}

# Lambda permission for SNS
resource "aws_lambda_permission" "sns_invoke" {
  count         = var.slack_webhook_url != "" ? 1 : 0
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.slack_notifier[0].function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.critical_alerts.arn
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_logs" {
  count             = var.slack_webhook_url != "" ? 1 : 0
  name              = "/aws/lambda/${aws_lambda_function.slack_notifier[0].function_name}"
  retention_in_days = 14

  tags = {
    Name        = "${var.environment}-slack-notifier-logs"
    Environment = var.environment
    Service     = "monitoring"
  }
}

# SNS topic policies
resource "aws_sns_topic_policy" "critical_alerts_policy" {
  arn = aws_sns_topic.critical_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = [
            "cloudwatch.amazonaws.com",
            "aps.amazonaws.com"
          ]
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.critical_alerts.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

resource "aws_sns_topic_policy" "warning_alerts_policy" {
  arn = aws_sns_topic.warning_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = [
            "cloudwatch.amazonaws.com",
            "aps.amazonaws.com"
          ]
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.warning_alerts.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

resource "aws_sns_topic_policy" "cost_alerts_policy" {
  arn = aws_sns_topic.cost_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.cost_alerts.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Health check for SNS topics
resource "aws_cloudwatch_metric_alarm" "sns_delivery_failures" {
  alarm_name          = "${var.environment}-sns-delivery-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "NumberOfNotificationsFailed"
  namespace           = "AWS/SNS"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "This metric monitors SNS delivery failures"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]

  dimensions = {
    TopicName = aws_sns_topic.critical_alerts.name
  }

  tags = {
    Name        = "${var.environment}-sns-delivery-failures"
    Environment = var.environment
    Service     = "monitoring"
  }
}
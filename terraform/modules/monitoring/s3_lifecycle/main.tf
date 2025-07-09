# S3 lifecycle management for monitoring data
# Phase 2: Monitoring Data Tiered Storage Strategy

# S3 bucket for monitoring data archival
resource "aws_s3_bucket" "monitoring_data_archive" {
  bucket = "${var.environment}-openscenario-monitoring-archive"

  tags = {
    Name        = "${var.environment}-openscenario-monitoring-archive"
    Environment = var.environment
    Service     = "monitoring"
    Purpose     = "Data archive"
  }
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "monitoring_data_archive_versioning" {
  bucket = aws_s3_bucket.monitoring_data_archive.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "monitoring_data_archive_encryption" {
  bucket = aws_s3_bucket.monitoring_data_archive.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "monitoring_data_archive_pab" {
  bucket = aws_s3_bucket.monitoring_data_archive.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 lifecycle configuration for cost optimization
resource "aws_s3_bucket_lifecycle_configuration" "monitoring_data_lifecycle" {
  bucket = aws_s3_bucket.monitoring_data_archive.id

  rule {
    id     = "monitoring_data_lifecycle"
    status = "Enabled"

    # CloudWatch Logs archive
    filter {
      prefix = "cloudwatch-logs/"
    }

    transition {
      days          = var.standard_to_ia_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.ia_to_glacier_days
      storage_class = "GLACIER"
    }

    transition {
      days          = var.glacier_to_deep_archive_days
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = var.retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }

  rule {
    id     = "prometheus_metrics_lifecycle"
    status = "Enabled"

    # Prometheus metrics archive
    filter {
      prefix = "prometheus-metrics/"
    }

    transition {
      days          = var.metrics_standard_to_ia_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.metrics_ia_to_glacier_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.metrics_retention_days
    }
  }

  rule {
    id     = "temp_data_cleanup"
    status = "Enabled"

    # Temporary data cleanup
    filter {
      prefix = "temp/"
    }

    expiration {
      days = var.temp_data_retention_days
    }
  }

  depends_on = [aws_s3_bucket_versioning.monitoring_data_archive_versioning]
}

# S3 bucket for Grafana dashboards backup
resource "aws_s3_bucket" "grafana_dashboards_backup" {
  bucket = "${var.environment}-openscenario-grafana-dashboards"

  tags = {
    Name        = "${var.environment}-openscenario-grafana-dashboards"
    Environment = var.environment
    Service     = "monitoring"
    Purpose     = "Dashboard backup"
  }
}

# Grafana dashboards backup encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "grafana_dashboards_encryption" {
  bucket = aws_s3_bucket.grafana_dashboards_backup.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Grafana dashboards backup public access block
resource "aws_s3_bucket_public_access_block" "grafana_dashboards_pab" {
  bucket = aws_s3_bucket.grafana_dashboards_backup.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lambda function for automated data archival
resource "aws_lambda_function" "data_archival" {
  filename         = "${path.module}/data_archival.zip"
  function_name    = "${var.environment}-monitoring-data-archival"
  role            = aws_iam_role.lambda_archival_role.arn
  handler         = "index.handler"
  runtime         = "python3.9"
  timeout         = 900
  memory_size     = 512

  environment {
    variables = {
      ARCHIVE_BUCKET = aws_s3_bucket.monitoring_data_archive.bucket
      ENVIRONMENT    = var.environment
      RETENTION_DAYS = var.retention_days
    }
  }

  depends_on = [data.archive_file.data_archival_zip]

  tags = {
    Name        = "${var.environment}-monitoring-data-archival"
    Environment = var.environment
    Service     = "monitoring"
    Purpose     = "Data archival"
  }
}

# Lambda function code for data archival
data "archive_file" "data_archival_zip" {
  type        = "zip"
  output_path = "${path.module}/data_archival.zip"
  
  source {
    content = templatefile("${path.module}/data_archival.py", {
      archive_bucket = aws_s3_bucket.monitoring_data_archive.bucket
      environment    = var.environment
    })
    filename = "index.py"
  }
}

# IAM role for Lambda archival function
resource "aws_iam_role" "lambda_archival_role" {
  name = "${var.environment}-monitoring-data-archival-role"

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
    Name        = "${var.environment}-monitoring-data-archival-role"
    Environment = var.environment
    Service     = "monitoring"
  }
}

# IAM policy for Lambda archival function
resource "aws_iam_policy" "lambda_archival_policy" {
  name        = "${var.environment}-monitoring-data-archival-policy"
  description = "Policy for monitoring data archival Lambda"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:GetLogEvents",
          "logs:ExportTask",
          "logs:DescribeExportTasks"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.monitoring_data_archive.arn,
          "${aws_s3_bucket.monitoring_data_archive.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-monitoring-data-archival-policy"
    Environment = var.environment
    Service     = "monitoring"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_archival_policy_attachment" {
  role       = aws_iam_role.lambda_archival_role.name
  policy_arn = aws_iam_policy.lambda_archival_policy.arn
}

# CloudWatch Event Rule for scheduled archival
resource "aws_cloudwatch_event_rule" "data_archival_schedule" {
  name                = "${var.environment}-monitoring-data-archival-schedule"
  description         = "Trigger data archival Lambda"
  schedule_expression = var.archival_schedule

  tags = {
    Name        = "${var.environment}-monitoring-data-archival-schedule"
    Environment = var.environment
    Service     = "monitoring"
  }
}

# CloudWatch Event Target
resource "aws_cloudwatch_event_target" "data_archival_target" {
  rule      = aws_cloudwatch_event_rule.data_archival_schedule.name
  target_id = "DataArchivalTarget"
  arn       = aws_lambda_function.data_archival.arn
}

# Lambda permission for CloudWatch Events
resource "aws_lambda_permission" "allow_cloudwatch_events" {
  statement_id  = "AllowExecutionFromCloudWatchEvents"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.data_archival.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.data_archival_schedule.arn
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_archival_logs" {
  name              = "/aws/lambda/${aws_lambda_function.data_archival.function_name}"
  retention_in_days = 14

  tags = {
    Name        = "${var.environment}-monitoring-data-archival-logs"
    Environment = var.environment
    Service     = "monitoring"
  }
}

# CloudWatch Metric for monitoring archival success
resource "aws_cloudwatch_metric_alarm" "archival_failures" {
  alarm_name          = "${var.environment}-monitoring-data-archival-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors data archival failures"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    FunctionName = aws_lambda_function.data_archival.function_name
  }

  tags = {
    Name        = "${var.environment}-monitoring-data-archival-failures"
    Environment = var.environment
    Service     = "monitoring"
  }
}
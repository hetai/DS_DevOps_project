# CloudWatch monitoring module for OpenSCENARIO
# Phase 2: Hybrid Monitoring Platform Deployment

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "openscenario_backend" {
  name              = "/aws/ecs/${var.environment}-openscenario-backend"
  retention_in_days = var.log_retention_days
  
  tags = {
    Name        = "${var.environment}-openscenario-backend-logs"
    Environment = var.environment
    Service     = "backend"
    Purpose     = "Application Logs"
  }
}

resource "aws_cloudwatch_log_group" "openscenario_frontend" {
  name              = "/aws/ecs/${var.environment}-openscenario-frontend"
  retention_in_days = var.log_retention_days
  
  tags = {
    Name        = "${var.environment}-openscenario-frontend-logs"
    Environment = var.environment
    Service     = "frontend"
    Purpose     = "Application Logs"
  }
}

# CloudWatch Metrics for ECS
resource "aws_cloudwatch_metric_alarm" "high_cpu_backend" {
  alarm_name          = "${var.environment}-high-cpu-backend"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors backend CPU utilization"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ServiceName = "${var.environment}-backend"
    ClusterName = var.cluster_name
  }

  tags = {
    Name        = "${var.environment}-high-cpu-backend-alarm"
    Environment = var.environment
    Service     = "backend"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_memory_backend" {
  alarm_name          = "${var.environment}-high-memory-backend"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "This metric monitors backend memory utilization"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ServiceName = "${var.environment}-backend"
    ClusterName = var.cluster_name
  }

  tags = {
    Name        = "${var.environment}-high-memory-backend-alarm"
    Environment = var.environment
    Service     = "backend"
  }
}

# Application Load Balancer Metrics
resource "aws_cloudwatch_metric_alarm" "alb_high_response_time" {
  alarm_name          = "${var.environment}-alb-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2.0"
  alarm_description   = "This metric monitors ALB response time"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = {
    Name        = "${var.environment}-alb-high-response-time-alarm"
    Environment = var.environment
    Service     = "alb"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_high_error_rate" {
  alarm_name          = "${var.environment}-alb-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors ALB 5XX error rate"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = {
    Name        = "${var.environment}-alb-high-error-rate-alarm"
    Environment = var.environment
    Service     = "alb"
  }
}

# RDS Metrics
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${var.environment}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = {
    Name        = "${var.environment}-rds-high-cpu-alarm"
    Environment = var.environment
    Service     = "rds"
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_high_connections" {
  alarm_name          = "${var.environment}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "50"
  alarm_description   = "This metric monitors RDS connection count"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = {
    Name        = "${var.environment}-rds-high-connections-alarm"
    Environment = var.environment
    Service     = "rds"
  }
}

# Custom Application Metrics
resource "aws_cloudwatch_metric_alarm" "openai_api_failures" {
  alarm_name          = "${var.environment}-openai-api-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "openai_api_failures"
  namespace           = "OpenSCENARIO/Application"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors OpenAI API failures"
  alarm_actions       = [var.sns_topic_arn]

  tags = {
    Name        = "${var.environment}-openai-api-failures-alarm"
    Environment = var.environment
    Service     = "application"
  }
}

resource "aws_cloudwatch_metric_alarm" "scenario_validation_failures" {
  alarm_name          = "${var.environment}-scenario-validation-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "scenario_validation_failures"
  namespace           = "OpenSCENARIO/Application"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors scenario validation failures"
  alarm_actions       = [var.sns_topic_arn]

  tags = {
    Name        = "${var.environment}-scenario-validation-failures-alarm"
    Environment = var.environment
    Service     = "application"
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "openscenario_dashboard" {
  dashboard_name = "${var.environment}-openscenario-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", "${var.environment}-backend", "ClusterName", var.cluster_name],
            [".", "MemoryUtilization", ".", ".", ".", "."],
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ECS Backend Service Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix],
            [".", "HTTPCode_Target_5XX_Count", ".", "."],
            [".", "RequestCount", ".", "."],
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Application Load Balancer Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id],
            [".", "DatabaseConnections", ".", "."],
            [".", "FreeableMemory", ".", "."],
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "RDS Database Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["OpenSCENARIO/Application", "openai_api_failures"],
            [".", "scenario_validation_failures"],
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Application Specific Metrics"
          period  = 300
        }
      }
    ]
  })
}

# Log Insights Queries
resource "aws_cloudwatch_query_definition" "error_analysis" {
  name = "${var.environment}-error-analysis"

  log_group_names = [
    aws_cloudwatch_log_group.openscenario_backend.name,
    aws_cloudwatch_log_group.openscenario_frontend.name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)
| sort @timestamp desc
EOF
}

resource "aws_cloudwatch_query_definition" "performance_analysis" {
  name = "${var.environment}-performance-analysis"

  log_group_names = [
    aws_cloudwatch_log_group.openscenario_backend.name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /response_time/
| parse @message /response_time: (?<response_time>\d+)ms/
| stats avg(response_time), max(response_time), min(response_time) by bin(5m)
| sort @timestamp desc
EOF
}
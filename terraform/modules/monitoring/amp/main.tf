# Amazon Managed Prometheus (AMP) module for OpenSCENARIO
# Phase 2: Hybrid Monitoring Platform Deployment

# AMP Workspace
resource "aws_prometheus_workspace" "openscenario" {
  alias = "${var.environment}-openscenario-amp"

  tags = {
    Name        = "${var.environment}-openscenario-amp"
    Environment = var.environment
    Service     = "monitoring"
    Purpose     = "Prometheus"
  }
}

# AMP Rule Group for OpenSCENARIO specific alerts
resource "aws_prometheus_rule_group_namespace" "openscenario_alerts" {
  name         = "openscenario-alerts"
  workspace_id = aws_prometheus_workspace.openscenario.id
  data = yamlencode({
    groups = [
      {
        name = "openscenario-application-alerts"
        rules = [
          {
            alert = "HighAPIResponseTime"
            expr  = "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2"
            for   = "5m"
            labels = {
              severity = "warning"
            }
            annotations = {
              summary     = "High API response time detected"
              description = "95th percentile response time is {{ $value }}s for {{ $labels.job }}"
            }
          },
          {
            alert = "HighErrorRate"
            expr  = "rate(http_requests_total{status=~\"5..\"}[5m]) > 0.1"
            for   = "5m"
            labels = {
              severity = "critical"
            }
            annotations = {
              summary     = "High error rate detected"
              description = "Error rate is {{ $value }} for {{ $labels.job }}"
            }
          },
          {
            alert = "OpenAIAPIFailures"
            expr  = "increase(openai_api_calls_error[5m]) > 5"
            for   = "2m"
            labels = {
              severity = "warning"
            }
            annotations = {
              summary     = "OpenAI API failures detected"
              description = "{{ $value }} OpenAI API failures in the last 5 minutes"
            }
          },
          {
            alert = "WorkflowFailures"
            expr  = "increase(workflow_step_error_total[5m]) > 3"
            for   = "5m"
            labels = {
              severity = "warning"
            }
            annotations = {
              summary     = "Workflow failures detected"
              description = "{{ $value }} workflow failures in the last 5 minutes"
            }
          },
          {
            alert = "DatabaseConnectionFailures"
            expr  = "increase(database_connection_errors_total[5m]) > 5"
            for   = "2m"
            labels = {
              severity = "critical"
            }
            annotations = {
              summary     = "Database connection failures"
              description = "{{ $value }} database connection failures in the last 5 minutes"
            }
          },
          {
            alert = "ScenarioValidationFailures"
            expr  = "increase(scenario_validation_errors_total[5m]) > 10"
            for   = "5m"
            labels = {
              severity = "warning"
            }
            annotations = {
              summary     = "High scenario validation failure rate"
              description = "{{ $value }} scenario validation failures in the last 5 minutes"
            }
          }
        ]
      },
      {
        name = "openscenario-infrastructure-alerts"
        rules = [
          {
            alert = "InstanceDown"
            expr  = "up == 0"
            for   = "1m"
            labels = {
              severity = "critical"
            }
            annotations = {
              summary     = "Instance is down"
              description = "{{ $labels.instance }} has been down for more than 1 minute"
            }
          },
          {
            alert = "HighMemoryUsage"
            expr  = "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9"
            for   = "5m"
            labels = {
              severity = "warning"
            }
            annotations = {
              summary     = "High memory usage"
              description = "Memory usage is {{ $value | humanizePercentage }} for {{ $labels.instance }}"
            }
          },
          {
            alert = "HighCPUUsage"
            expr  = "100 - (avg by(instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100) > 80"
            for   = "5m"
            labels = {
              severity = "warning"
            }
            annotations = {
              summary     = "High CPU usage"
              description = "CPU usage is {{ $value | humanizePercentage }} for {{ $labels.instance }}"
            }
          },
          {
            alert = "HighDiskUsage"
            expr  = "(node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1"
            for   = "5m"
            labels = {
              severity = "critical"
            }
            annotations = {
              summary     = "High disk usage"
              description = "Disk usage is above 90% on {{ $labels.device }} for {{ $labels.instance }}"
            }
          }
        ]
      }
    ]
  })
}

# AMP Alert Manager Configuration
resource "aws_prometheus_alert_manager_definition" "openscenario" {
  workspace_id = aws_prometheus_workspace.openscenario.id
  definition = yamlencode({
    global = {
      smtp_smarthost = "localhost:587"
      smtp_from      = "alertmanager@openscenario.${var.environment}.local"
    }
    route = {
      group_by       = ["alertname"]
      group_wait     = "10s"
      group_interval = "10s"
      repeat_interval = "1h"
      receiver       = "web.hook"
      routes = [
        {
          match = {
            severity = "critical"
          }
          receiver        = "critical-alerts"
          group_wait     = "5s"
          repeat_interval = "30m"
        },
        {
          match = {
            severity = "warning"
          }
          receiver        = "warning-alerts"
          repeat_interval = "2h"
        }
      ]
    }
    receivers = [
      {
        name = "web.hook"
        webhook_configs = [
          {
            url           = var.webhook_url
            send_resolved = true
          }
        ]
      },
      {
        name = "critical-alerts"
        sns_configs = [
          {
            topic_arn = var.critical_alerts_topic_arn
            subject   = "[CRITICAL] OpenSCENARIO Alert: {{ .GroupLabels.alertname }}"
            message   = "Alert: {{ range .Alerts }}{{ .Annotations.summary }}\nDescription: {{ .Annotations.description }}{{ end }}"
          }
        ]
      },
      {
        name = "warning-alerts"
        sns_configs = [
          {
            topic_arn = var.warning_alerts_topic_arn
            subject   = "[WARNING] OpenSCENARIO Alert: {{ .GroupLabels.alertname }}"
            message   = "Alert: {{ range .Alerts }}{{ .Annotations.summary }}\nDescription: {{ .Annotations.description }}{{ end }}"
          }
        ]
      }
    ]
    inhibit_rules = [
      {
        source_match = {
          severity = "critical"
        }
        target_match = {
          severity = "warning"
        }
        equal = ["alertname", "instance"]
      }
    ]
  })
}

# IAM Role for AMP
resource "aws_iam_role" "amp_role" {
  name = "${var.environment}-amp-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-amp-role"
    Environment = var.environment
    Service     = "monitoring"
  }
}

# IAM Policy for AMP
resource "aws_iam_policy" "amp_policy" {
  name        = "${var.environment}-amp-policy"
  description = "Policy for AMP access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "aps:RemoteWrite",
          "aps:QueryMetrics",
          "aps:GetSeries",
          "aps:GetLabels",
          "aps:GetMetricMetadata"
        ]
        Resource = aws_prometheus_workspace.openscenario.arn
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-amp-policy"
    Environment = var.environment
    Service     = "monitoring"
  }
}

resource "aws_iam_role_policy_attachment" "amp_policy_attachment" {
  role       = aws_iam_role.amp_role.name
  policy_arn = aws_iam_policy.amp_policy.arn
}

# Data lifecycle policy for cost optimization
resource "aws_prometheus_workspace" "openscenario_long_term" {
  count = var.enable_long_term_storage ? 1 : 0
  alias = "${var.environment}-openscenario-amp-long-term"

  tags = {
    Name        = "${var.environment}-openscenario-amp-long-term"
    Environment = var.environment
    Service     = "monitoring"
    Purpose     = "Long-term storage"
  }
}

# CloudWatch integration for cost monitoring
resource "aws_cloudwatch_metric_alarm" "amp_cost_alert" {
  alarm_name          = "${var.environment}-amp-cost-alert"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "86400"
  statistic           = "Maximum"
  threshold           = var.cost_threshold
  alarm_description   = "This metric monitors AMP costs"
  alarm_actions       = [var.cost_alert_topic_arn]

  dimensions = {
    Currency    = "USD"
    ServiceName = "AmazonPrometheus"
  }

  tags = {
    Name        = "${var.environment}-amp-cost-alert"
    Environment = var.environment
    Service     = "monitoring"
  }
}
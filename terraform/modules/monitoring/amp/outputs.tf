# Outputs for AMP monitoring module

output "workspace_id" {
  description = "ID of the AMP workspace"
  value       = aws_prometheus_workspace.openscenario.id
}

output "workspace_arn" {
  description = "ARN of the AMP workspace"
  value       = aws_prometheus_workspace.openscenario.arn
}

output "workspace_endpoint" {
  description = "Endpoint of the AMP workspace"
  value       = aws_prometheus_workspace.openscenario.prometheus_endpoint
}

output "workspace_alias" {
  description = "Alias of the AMP workspace"
  value       = aws_prometheus_workspace.openscenario.alias
}

output "rule_group_namespace_name" {
  description = "Name of the rule group namespace"
  value       = aws_prometheus_rule_group_namespace.openscenario_alerts.name
}

output "amp_role_arn" {
  description = "ARN of the AMP IAM role"
  value       = aws_iam_role.amp_role.arn
}

output "amp_policy_arn" {
  description = "ARN of the AMP IAM policy"
  value       = aws_iam_policy.amp_policy.arn
}

output "long_term_workspace_id" {
  description = "ID of the long-term AMP workspace"
  value       = var.enable_long_term_storage ? aws_prometheus_workspace.openscenario_long_term[0].id : null
}

output "long_term_workspace_arn" {
  description = "ARN of the long-term AMP workspace"
  value       = var.enable_long_term_storage ? aws_prometheus_workspace.openscenario_long_term[0].arn : null
}

output "long_term_workspace_endpoint" {
  description = "Endpoint of the long-term AMP workspace"
  value       = var.enable_long_term_storage ? aws_prometheus_workspace.openscenario_long_term[0].prometheus_endpoint : null
}

output "cost_alarm_arn" {
  description = "ARN of the cost monitoring alarm"
  value       = aws_cloudwatch_metric_alarm.amp_cost_alert.arn
}

# Remote write configuration for Prometheus
output "remote_write_config" {
  description = "Remote write configuration for Prometheus"
  value = {
    url = "${aws_prometheus_workspace.openscenario.prometheus_endpoint}api/v1/remote_write"
    sigv4 = {
      region = var.aws_region
    }
  }
}

# Query configuration for Grafana
output "query_config" {
  description = "Query configuration for Grafana"
  value = {
    url = "${aws_prometheus_workspace.openscenario.prometheus_endpoint}api/v1/query"
    sigv4 = {
      region = var.aws_region
    }
  }
}
# Outputs for CodeBuild module

output "backend_build_project_name" {
  description = "Name of the backend build project"
  value       = aws_codebuild_project.backend_build.name
}

output "backend_build_project_arn" {
  description = "ARN of the backend build project"
  value       = aws_codebuild_project.backend_build.arn
}

output "frontend_build_project_name" {
  description = "Name of the frontend build project"
  value       = aws_codebuild_project.frontend_build.name
}

output "frontend_build_project_arn" {
  description = "ARN of the frontend build project"
  value       = aws_codebuild_project.frontend_build.arn
}

output "security_scan_project_name" {
  description = "Name of the security scan project"
  value       = aws_codebuild_project.security_scan.name
}

output "security_scan_project_arn" {
  description = "ARN of the security scan project"
  value       = aws_codebuild_project.security_scan.arn
}

output "test_suite_project_name" {
  description = "Name of the test suite project"
  value       = aws_codebuild_project.test_suite.name
}

output "test_suite_project_arn" {
  description = "ARN of the test suite project"
  value       = aws_codebuild_project.test_suite.arn
}

output "deployment_project_name" {
  description = "Name of the deployment project"
  value       = aws_codebuild_project.deployment.name
}

output "deployment_project_arn" {
  description = "ARN of the deployment project"
  value       = aws_codebuild_project.deployment.arn
}

output "infrastructure_validation_project_name" {
  description = "Name of the infrastructure validation project"
  value       = aws_codebuild_project.infrastructure_validation.name
}

output "infrastructure_validation_project_arn" {
  description = "ARN of the infrastructure validation project"
  value       = aws_codebuild_project.infrastructure_validation.arn
}

# Log Group outputs
output "backend_build_log_group_name" {
  description = "Name of the backend build log group"
  value       = aws_cloudwatch_log_group.backend_build_logs.name
}

output "frontend_build_log_group_name" {
  description = "Name of the frontend build log group"
  value       = aws_cloudwatch_log_group.frontend_build_logs.name
}

output "security_scan_log_group_name" {
  description = "Name of the security scan log group"
  value       = aws_cloudwatch_log_group.security_scan_logs.name
}

output "test_suite_log_group_name" {
  description = "Name of the test suite log group"
  value       = aws_cloudwatch_log_group.test_suite_logs.name
}

output "deployment_log_group_name" {
  description = "Name of the deployment log group"
  value       = aws_cloudwatch_log_group.deployment_logs.name
}

output "infrastructure_validation_log_group_name" {
  description = "Name of the infrastructure validation log group"
  value       = aws_cloudwatch_log_group.infrastructure_validation_logs.name
}

# All project names for pipeline configuration
output "all_project_names" {
  description = "List of all CodeBuild project names"
  value = [
    aws_codebuild_project.backend_build.name,
    aws_codebuild_project.frontend_build.name,
    aws_codebuild_project.security_scan.name,
    aws_codebuild_project.test_suite.name,
    aws_codebuild_project.deployment.name,
    aws_codebuild_project.infrastructure_validation.name
  ]
}

# All project ARNs for monitoring
output "all_project_arns" {
  description = "List of all CodeBuild project ARNs"
  value = [
    aws_codebuild_project.backend_build.arn,
    aws_codebuild_project.frontend_build.arn,
    aws_codebuild_project.security_scan.arn,
    aws_codebuild_project.test_suite.arn,
    aws_codebuild_project.deployment.arn,
    aws_codebuild_project.infrastructure_validation.arn
  ]
}
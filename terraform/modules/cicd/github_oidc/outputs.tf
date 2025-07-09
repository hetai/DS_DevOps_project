# Outputs for GitHub OIDC module

output "github_oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider"
  value       = aws_iam_openid_connect_provider.github_oidc.arn
}

output "github_oidc_provider_url" {
  description = "URL of the GitHub OIDC provider"
  value       = aws_iam_openid_connect_provider.github_oidc.url
}

# Role ARNs for different environments
output "github_actions_dev_role_arn" {
  description = "ARN of the GitHub Actions development role"
  value       = aws_iam_role.github_actions_dev.arn
}

output "github_actions_staging_role_arn" {
  description = "ARN of the GitHub Actions staging role"
  value       = aws_iam_role.github_actions_staging.arn
}

output "github_actions_prod_role_arn" {
  description = "ARN of the GitHub Actions production role"
  value       = aws_iam_role.github_actions_prod.arn
}

# Role names for GitHub Actions configuration
output "github_actions_dev_role_name" {
  description = "Name of the GitHub Actions development role"
  value       = aws_iam_role.github_actions_dev.name
}

output "github_actions_staging_role_name" {
  description = "Name of the GitHub Actions staging role"
  value       = aws_iam_role.github_actions_staging.name
}

output "github_actions_prod_role_name" {
  description = "Name of the GitHub Actions production role"
  value       = aws_iam_role.github_actions_prod.name
}

# CodeBuild role
output "codebuild_role_arn" {
  description = "ARN of the CodeBuild role"
  value       = aws_iam_role.codebuild_role.arn
}

output "codebuild_role_name" {
  description = "Name of the CodeBuild role"
  value       = aws_iam_role.codebuild_role.name
}

# Policy ARNs
output "github_actions_dev_policy_arn" {
  description = "ARN of the GitHub Actions development policy"
  value       = aws_iam_policy.github_actions_dev_policy.arn
}

output "github_actions_staging_policy_arn" {
  description = "ARN of the GitHub Actions staging policy"
  value       = aws_iam_policy.github_actions_staging_policy.arn
}

output "github_actions_prod_policy_arn" {
  description = "ARN of the GitHub Actions production policy"
  value       = aws_iam_policy.github_actions_prod_policy.arn
}

output "codebuild_policy_arn" {
  description = "ARN of the CodeBuild policy"
  value       = aws_iam_policy.codebuild_policy.arn
}

# Configuration for GitHub Actions workflows
output "github_actions_config" {
  description = "Configuration for GitHub Actions workflows"
  value = {
    dev = {
      role_arn = aws_iam_role.github_actions_dev.arn
      branch   = var.dev_branch
    }
    staging = {
      role_arn = aws_iam_role.github_actions_staging.arn
      branch   = var.staging_branch
    }
    prod = {
      role_arn = aws_iam_role.github_actions_prod.arn
      branch   = var.prod_branch
    }
  }
}
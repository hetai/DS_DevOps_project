# DS_DevOps_project - ECR Module Outputs

output "repository_urls" {
  description = "URLs of the ECR repositories"
  value       = { for repo in var.repositories : repo => aws_ecr_repository.repo[repo].repository_url }
}

output "repository_arns" {
  description = "ARNs of the ECR repositories"
  value       = { for repo in var.repositories : repo => aws_ecr_repository.repo[repo].arn }
}
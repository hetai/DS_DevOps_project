# Outputs for S3 artifacts module

output "artifacts_bucket_name" {
  description = "Name of the artifacts S3 bucket"
  value       = aws_s3_bucket.artifacts.bucket
}

output "artifacts_bucket_arn" {
  description = "ARN of the artifacts S3 bucket"
  value       = aws_s3_bucket.artifacts.arn
}

output "artifacts_bucket_domain_name" {
  description = "Domain name of the artifacts S3 bucket"
  value       = aws_s3_bucket.artifacts.bucket_domain_name
}

output "codepipeline_artifacts_bucket_name" {
  description = "Name of the CodePipeline artifacts S3 bucket"
  value       = aws_s3_bucket.codepipeline_artifacts.bucket
}

output "codepipeline_artifacts_bucket_arn" {
  description = "ARN of the CodePipeline artifacts S3 bucket"
  value       = aws_s3_bucket.codepipeline_artifacts.arn
}

output "codepipeline_artifacts_bucket_domain_name" {
  description = "Domain name of the CodePipeline artifacts S3 bucket"
  value       = aws_s3_bucket.codepipeline_artifacts.bucket_domain_name
}

output "backup_storage_bucket_name" {
  description = "Name of the backup storage S3 bucket"
  value       = aws_s3_bucket.backup_storage.bucket
}

output "backup_storage_bucket_arn" {
  description = "ARN of the backup storage S3 bucket"
  value       = aws_s3_bucket.backup_storage.arn
}

output "backup_storage_bucket_domain_name" {
  description = "Domain name of the backup storage S3 bucket"
  value       = aws_s3_bucket.backup_storage.bucket_domain_name
}

# Lifecycle configuration information
output "artifacts_lifecycle_configuration" {
  description = "Artifacts bucket lifecycle configuration details"
  value = {
    artifacts_retention_days          = var.artifacts_retention_days
    artifacts_standard_to_ia_days     = var.artifacts_standard_to_ia_days
    artifacts_ia_to_glacier_days      = var.artifacts_ia_to_glacier_days
    test_reports_retention_days       = var.test_reports_retention_days
    security_reports_retention_days   = var.security_reports_retention_days
    deployment_logs_retention_days    = var.deployment_logs_retention_days
    temp_artifacts_retention_days     = var.temp_artifacts_retention_days
  }
}

output "codepipeline_lifecycle_configuration" {
  description = "CodePipeline artifacts lifecycle configuration details"
  value = {
    codepipeline_artifacts_retention_days = var.codepipeline_artifacts_retention_days
    noncurrent_version_expiration_days    = var.noncurrent_version_expiration_days
  }
}

output "backup_lifecycle_configuration" {
  description = "Backup storage lifecycle configuration details"
  value = {
    backup_retention_days                = var.backup_retention_days
    backup_standard_to_ia_days          = var.backup_standard_to_ia_days
    backup_ia_to_glacier_days           = var.backup_ia_to_glacier_days
    backup_glacier_to_deep_archive_days = var.backup_glacier_to_deep_archive_days
    config_backup_retention_days        = var.config_backup_retention_days
  }
}

# CloudWatch alarm outputs
output "artifacts_bucket_size_alarm_arn" {
  description = "ARN of the artifacts bucket size alarm"
  value       = aws_cloudwatch_metric_alarm.artifacts_bucket_size.arn
}

output "artifacts_bucket_requests_alarm_arn" {
  description = "ARN of the artifacts bucket requests alarm"
  value       = aws_cloudwatch_metric_alarm.artifacts_bucket_requests.arn
}

# Bucket configurations for external use
output "bucket_configurations" {
  description = "S3 bucket configurations for external integrations"
  value = {
    artifacts = {
      bucket_name = aws_s3_bucket.artifacts.bucket
      bucket_arn  = aws_s3_bucket.artifacts.arn
      prefixes = {
        build_artifacts    = "build-artifacts/"
        test_reports      = "test-reports/"
        security_scans    = "security-scans/"
        deployment_logs   = "deployment-logs/"
        temp             = "temp/"
      }
    }
    codepipeline = {
      bucket_name = aws_s3_bucket.codepipeline_artifacts.bucket
      bucket_arn  = aws_s3_bucket.codepipeline_artifacts.arn
    }
    backup = {
      bucket_name = aws_s3_bucket.backup_storage.bucket
      bucket_arn  = aws_s3_bucket.backup_storage.arn
      prefixes = {
        database_backups = "database-backups/"
        config_backups   = "config-backups/"
      }
    }
  }
}

# Cost optimization features
output "cost_optimization_features" {
  description = "Enabled cost optimization features"
  value = {
    lifecycle_rules_enabled      = true
    intelligent_tiering_enabled  = var.enable_intelligent_tiering
    versioning_enabled          = true
    encryption_enabled          = true
    public_access_blocked       = true
    monitoring_enabled          = true
  }
}
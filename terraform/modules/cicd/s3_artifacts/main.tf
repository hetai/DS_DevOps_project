# S3 Artifacts storage module for CI/CD pipeline
# Phase 3: Enterprise CI/CD Pipeline

# S3 bucket for CI/CD artifacts
resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.environment}-openscenario-cicd-artifacts"

  tags = {
    Name        = "${var.environment}-openscenario-cicd-artifacts"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "CI/CD artifacts storage"
  }
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "artifacts_versioning" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts_encryption" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "artifacts_pab" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket lifecycle configuration
resource "aws_s3_bucket_lifecycle_configuration" "artifacts_lifecycle" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "cicd_artifacts_lifecycle"
    status = "Enabled"

    # Build artifacts
    filter {
      prefix = "build-artifacts/"
    }

    transition {
      days          = var.artifacts_standard_to_ia_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.artifacts_ia_to_glacier_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.artifacts_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }

  rule {
    id     = "test_reports_lifecycle"
    status = "Enabled"

    # Test reports
    filter {
      prefix = "test-reports/"
    }

    transition {
      days          = var.test_reports_standard_to_ia_days
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = var.test_reports_retention_days
    }
  }

  rule {
    id     = "security_scan_reports_lifecycle"
    status = "Enabled"

    # Security scan reports
    filter {
      prefix = "security-scans/"
    }

    transition {
      days          = var.security_reports_standard_to_ia_days
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = var.security_reports_retention_days
    }
  }

  rule {
    id     = "deployment_logs_lifecycle"
    status = "Enabled"

    # Deployment logs
    filter {
      prefix = "deployment-logs/"
    }

    transition {
      days          = var.deployment_logs_standard_to_ia_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.deployment_logs_ia_to_glacier_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.deployment_logs_retention_days
    }
  }

  rule {
    id     = "temp_artifacts_cleanup"
    status = "Enabled"

    # Temporary artifacts cleanup
    filter {
      prefix = "temp/"
    }

    expiration {
      days = var.temp_artifacts_retention_days
    }
  }

  depends_on = [aws_s3_bucket_versioning.artifacts_versioning]
}

# S3 bucket for CodePipeline artifacts
resource "aws_s3_bucket" "codepipeline_artifacts" {
  bucket = "${var.environment}-openscenario-codepipeline-artifacts"

  tags = {
    Name        = "${var.environment}-openscenario-codepipeline-artifacts"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "CodePipeline artifacts storage"
  }
}

# CodePipeline artifacts bucket versioning
resource "aws_s3_bucket_versioning" "codepipeline_artifacts_versioning" {
  bucket = aws_s3_bucket.codepipeline_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

# CodePipeline artifacts bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "codepipeline_artifacts_encryption" {
  bucket = aws_s3_bucket.codepipeline_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CodePipeline artifacts bucket public access block
resource "aws_s3_bucket_public_access_block" "codepipeline_artifacts_pab" {
  bucket = aws_s3_bucket.codepipeline_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CodePipeline artifacts bucket lifecycle
resource "aws_s3_bucket_lifecycle_configuration" "codepipeline_artifacts_lifecycle" {
  bucket = aws_s3_bucket.codepipeline_artifacts.id

  rule {
    id     = "codepipeline_artifacts_lifecycle"
    status = "Enabled"

    expiration {
      days = var.codepipeline_artifacts_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_expiration_days
    }
  }

  depends_on = [aws_s3_bucket_versioning.codepipeline_artifacts_versioning]
}

# S3 bucket for backup storage
resource "aws_s3_bucket" "backup_storage" {
  bucket = "${var.environment}-openscenario-backup-storage"

  tags = {
    Name        = "${var.environment}-openscenario-backup-storage"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "Backup storage"
  }
}

# Backup storage bucket versioning
resource "aws_s3_bucket_versioning" "backup_storage_versioning" {
  bucket = aws_s3_bucket.backup_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Backup storage bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "backup_storage_encryption" {
  bucket = aws_s3_bucket.backup_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Backup storage bucket public access block
resource "aws_s3_bucket_public_access_block" "backup_storage_pab" {
  bucket = aws_s3_bucket.backup_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Backup storage bucket lifecycle
resource "aws_s3_bucket_lifecycle_configuration" "backup_storage_lifecycle" {
  bucket = aws_s3_bucket.backup_storage.id

  rule {
    id     = "backup_storage_lifecycle"
    status = "Enabled"

    # Database backups
    filter {
      prefix = "database-backups/"
    }

    transition {
      days          = var.backup_standard_to_ia_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.backup_ia_to_glacier_days
      storage_class = "GLACIER"
    }

    transition {
      days          = var.backup_glacier_to_deep_archive_days
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = var.backup_retention_days
    }
  }

  rule {
    id     = "config_backups_lifecycle"
    status = "Enabled"

    # Configuration backups
    filter {
      prefix = "config-backups/"
    }

    transition {
      days          = var.config_backup_standard_to_ia_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.config_backup_ia_to_glacier_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.config_backup_retention_days
    }
  }

  depends_on = [aws_s3_bucket_versioning.backup_storage_versioning]
}

# CloudWatch metric for S3 bucket monitoring
resource "aws_cloudwatch_metric_alarm" "artifacts_bucket_size" {
  alarm_name          = "${var.environment}-artifacts-bucket-size-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "BucketSizeBytes"
  namespace           = "AWS/S3"
  period              = "86400"
  statistic           = "Average"
  threshold           = var.bucket_size_threshold
  alarm_description   = "This metric monitors artifacts bucket size"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    BucketName  = aws_s3_bucket.artifacts.bucket
    StorageType = "StandardStorage"
  }

  tags = {
    Name        = "${var.environment}-artifacts-bucket-size-alarm"
    Environment = var.environment
    Service     = "cicd"
  }
}

# CloudWatch metric for bucket request monitoring
resource "aws_cloudwatch_metric_alarm" "artifacts_bucket_requests" {
  alarm_name          = "${var.environment}-artifacts-bucket-requests-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "NumberOfObjects"
  namespace           = "AWS/S3"
  period              = "86400"
  statistic           = "Average"
  threshold           = var.bucket_objects_threshold
  alarm_description   = "This metric monitors artifacts bucket object count"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    BucketName  = aws_s3_bucket.artifacts.bucket
    StorageType = "AllStorageTypes"
  }

  tags = {
    Name        = "${var.environment}-artifacts-bucket-requests-alarm"
    Environment = var.environment
    Service     = "cicd"
  }
}
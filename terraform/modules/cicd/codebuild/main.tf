# CodeBuild module for OpenSCENARIO CI/CD pipeline
# Phase 3: Enterprise CI/CD Pipeline

# CodeBuild project for backend service
resource "aws_codebuild_project" "backend_build" {
  name         = "${var.environment}-openscenario-backend-build"
  description  = "Build project for OpenSCENARIO backend service"
  service_role = var.codebuild_role_arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = var.compute_type
    image                      = var.build_image
    type                       = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode            = true

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }

    environment_variable {
      name  = "IMAGE_REPO_NAME"
      value = var.backend_ecr_repository_name
    }

    environment_variable {
      name  = "IMAGE_TAG"
      value = "latest"
    }

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }
  }

  source {
    type = "CODEPIPELINE"
    buildspec = "buildspec-backend.yml"
  }

  tags = {
    Name        = "${var.environment}-openscenario-backend-build"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "Backend build"
  }
}

# CodeBuild project for frontend service
resource "aws_codebuild_project" "frontend_build" {
  name         = "${var.environment}-openscenario-frontend-build"
  description  = "Build project for OpenSCENARIO frontend service"
  service_role = var.codebuild_role_arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = var.compute_type
    image                      = var.build_image
    type                       = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode            = false

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "S3_BUCKET"
      value = var.frontend_s3_bucket_name
    }

    environment_variable {
      name  = "CLOUDFRONT_DISTRIBUTION_ID"
      value = var.cloudfront_distribution_id
    }

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }

    environment_variable {
      name  = "VITE_API_URL"
      value = var.api_url
    }
  }

  source {
    type = "CODEPIPELINE"
    buildspec = "buildspec-frontend.yml"
  }

  tags = {
    Name        = "${var.environment}-openscenario-frontend-build"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "Frontend build"
  }
}

# CodeBuild project for security scanning
resource "aws_codebuild_project" "security_scan" {
  name         = "${var.environment}-openscenario-security-scan"
  description  = "Security scanning project for OpenSCENARIO"
  service_role = var.codebuild_role_arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = var.compute_type
    image                      = var.build_image
    type                       = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode            = true

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }

    environment_variable {
      name  = "SONAR_TOKEN"
      value = var.sonar_token
      type  = "SECRETS_MANAGER"
    }

    environment_variable {
      name  = "SNYK_TOKEN"
      value = var.snyk_token
      type  = "SECRETS_MANAGER"
    }
  }

  source {
    type = "CODEPIPELINE"
    buildspec = "buildspec-security.yml"
  }

  tags = {
    Name        = "${var.environment}-openscenario-security-scan"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "Security scanning"
  }
}

# CodeBuild project for testing
resource "aws_codebuild_project" "test_suite" {
  name         = "${var.environment}-openscenario-test-suite"
  description  = "Test suite project for OpenSCENARIO"
  service_role = var.codebuild_role_arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = var.compute_type
    image                      = var.build_image
    type                       = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode            = true

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }

    environment_variable {
      name  = "TEST_DATABASE_URL"
      value = var.test_database_url
      type  = "SECRETS_MANAGER"
    }

    environment_variable {
      name  = "OPENAI_API_KEY"
      value = var.openai_api_key_secret_name
      type  = "SECRETS_MANAGER"
    }
  }

  source {
    type = "CODEPIPELINE"
    buildspec = "buildspec-test.yml"
  }

  tags = {
    Name        = "${var.environment}-openscenario-test-suite"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "Testing"
  }
}

# CodeBuild project for deployment
resource "aws_codebuild_project" "deployment" {
  name         = "${var.environment}-openscenario-deployment"
  description  = "Deployment project for OpenSCENARIO"
  service_role = var.codebuild_role_arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = var.compute_type
    image                      = var.build_image
    type                       = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode            = true

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }

    environment_variable {
      name  = "ECS_CLUSTER_NAME"
      value = var.ecs_cluster_name
    }

    environment_variable {
      name  = "ECS_SERVICE_NAME"
      value = var.ecs_service_name
    }

    environment_variable {
      name  = "TASK_DEFINITION_FAMILY"
      value = var.task_definition_family
    }

    environment_variable {
      name  = "CONTAINER_NAME"
      value = var.container_name
    }
  }

  source {
    type = "CODEPIPELINE"
    buildspec = "buildspec-deploy.yml"
  }

  tags = {
    Name        = "${var.environment}-openscenario-deployment"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "Deployment"
  }
}

# CodeBuild project for infrastructure validation
resource "aws_codebuild_project" "infrastructure_validation" {
  name         = "${var.environment}-openscenario-infra-validation"
  description  = "Infrastructure validation project for OpenSCENARIO"
  service_role = var.codebuild_role_arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = var.compute_type
    image                      = var.build_image
    type                       = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode            = false

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }

    environment_variable {
      name  = "TF_VAR_environment"
      value = var.environment
    }
  }

  source {
    type = "CODEPIPELINE"
    buildspec = "buildspec-infra-validation.yml"
  }

  tags = {
    Name        = "${var.environment}-openscenario-infra-validation"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "Infrastructure validation"
  }
}

# CloudWatch Log Groups for CodeBuild projects
resource "aws_cloudwatch_log_group" "backend_build_logs" {
  name              = "/aws/codebuild/${aws_codebuild_project.backend_build.name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.environment}-backend-build-logs"
    Environment = var.environment
    Service     = "cicd"
  }
}

resource "aws_cloudwatch_log_group" "frontend_build_logs" {
  name              = "/aws/codebuild/${aws_codebuild_project.frontend_build.name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.environment}-frontend-build-logs"
    Environment = var.environment
    Service     = "cicd"
  }
}

resource "aws_cloudwatch_log_group" "security_scan_logs" {
  name              = "/aws/codebuild/${aws_codebuild_project.security_scan.name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.environment}-security-scan-logs"
    Environment = var.environment
    Service     = "cicd"
  }
}

resource "aws_cloudwatch_log_group" "test_suite_logs" {
  name              = "/aws/codebuild/${aws_codebuild_project.test_suite.name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.environment}-test-suite-logs"
    Environment = var.environment
    Service     = "cicd"
  }
}

resource "aws_cloudwatch_log_group" "deployment_logs" {
  name              = "/aws/codebuild/${aws_codebuild_project.deployment.name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.environment}-deployment-logs"
    Environment = var.environment
    Service     = "cicd"
  }
}

resource "aws_cloudwatch_log_group" "infrastructure_validation_logs" {
  name              = "/aws/codebuild/${aws_codebuild_project.infrastructure_validation.name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.environment}-infrastructure-validation-logs"
    Environment = var.environment
    Service     = "cicd"
  }
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}
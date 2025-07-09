# GitHub OIDC Provider for AWS Integration
# Phase 3: Enterprise CI/CD Pipeline

# Data source for GitHub OIDC provider thumbprint
data "external" "github_oidc_thumbprint" {
  program = ["bash", "${path.module}/get_thumbprint.sh"]
}

# Create GitHub OIDC Identity Provider
resource "aws_iam_openid_connect_provider" "github_oidc" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.external.github_oidc_thumbprint.result.thumbprint]

  tags = {
    Name        = "${var.environment}-github-oidc-provider"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "GitHub Actions OIDC"
  }
}

# IAM Role for GitHub Actions - Development Environment
resource "aws_iam_role" "github_actions_dev" {
  name = "${var.environment}-github-actions-dev-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_oidc.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:ref:refs/heads/develop"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-github-actions-dev-role"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "Development deployment"
  }
}

# IAM Role for GitHub Actions - Staging Environment
resource "aws_iam_role" "github_actions_staging" {
  name = "${var.environment}-github-actions-staging-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_oidc.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:ref:refs/heads/staging"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-github-actions-staging-role"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "Staging deployment"
  }
}

# IAM Role for GitHub Actions - Production Environment
resource "aws_iam_role" "github_actions_prod" {
  name = "${var.environment}-github-actions-prod-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_oidc.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:ref:refs/heads/main"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-github-actions-prod-role"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "Production deployment"
  }
}

# IAM Policy for Development Environment
resource "aws_iam_policy" "github_actions_dev_policy" {
  name        = "${var.environment}-github-actions-dev-policy"
  description = "Policy for GitHub Actions in development environment"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "ecs:cluster" = "*dev*"
          }
        }
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
          "arn:aws:s3:::*-dev-*",
          "arn:aws:s3:::*-dev-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudformation:DescribeStacks",
          "cloudformation:CreateStack",
          "cloudformation:UpdateStack",
          "cloudformation:DeleteStack",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStackResources"
        ]
        Resource = "arn:aws:cloudformation:*:*:stack/*-dev-*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-github-actions-dev-policy"
    Environment = var.environment
    Service     = "cicd"
  }
}

# IAM Policy for Staging Environment
resource "aws_iam_policy" "github_actions_staging_policy" {
  name        = "${var.environment}-github-actions-staging-policy"
  description = "Policy for GitHub Actions in staging environment"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "ecs:cluster" = "*staging*"
          }
        }
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
          "arn:aws:s3:::*-staging-*",
          "arn:aws:s3:::*-staging-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudformation:DescribeStacks",
          "cloudformation:CreateStack",
          "cloudformation:UpdateStack",
          "cloudformation:DeleteStack",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStackResources"
        ]
        Resource = "arn:aws:cloudformation:*:*:stack/*-staging-*"
      },
      {
        Effect = "Allow"
        Action = [
          "codedeploy:CreateDeployment",
          "codedeploy:GetApplication",
          "codedeploy:GetApplicationRevision",
          "codedeploy:GetDeployment",
          "codedeploy:GetDeploymentConfig",
          "codedeploy:RegisterApplicationRevision"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-github-actions-staging-policy"
    Environment = var.environment
    Service     = "cicd"
  }
}

# IAM Policy for Production Environment (Most Restrictive)
resource "aws_iam_policy" "github_actions_prod_policy" {
  name        = "${var.environment}-github-actions-prod-policy"
  description = "Policy for GitHub Actions in production environment"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "ecs:cluster" = "*prod*"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::*-prod-*",
          "arn:aws:s3:::*-prod-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "codedeploy:CreateDeployment",
          "codedeploy:GetApplication",
          "codedeploy:GetApplicationRevision",
          "codedeploy:GetDeployment",
          "codedeploy:GetDeploymentConfig",
          "codedeploy:RegisterApplicationRevision"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-github-actions-prod-policy"
    Environment = var.environment
    Service     = "cicd"
  }
}

# Attach policies to roles
resource "aws_iam_role_policy_attachment" "github_actions_dev_policy_attachment" {
  role       = aws_iam_role.github_actions_dev.name
  policy_arn = aws_iam_policy.github_actions_dev_policy.arn
}

resource "aws_iam_role_policy_attachment" "github_actions_staging_policy_attachment" {
  role       = aws_iam_role.github_actions_staging.name
  policy_arn = aws_iam_policy.github_actions_staging_policy.arn
}

resource "aws_iam_role_policy_attachment" "github_actions_prod_policy_attachment" {
  role       = aws_iam_role.github_actions_prod.name
  policy_arn = aws_iam_policy.github_actions_prod_policy.arn
}

# IAM Role for CodeBuild projects
resource "aws_iam_role" "codebuild_role" {
  name = "${var.environment}-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-codebuild-role"
    Environment = var.environment
    Service     = "cicd"
    Purpose     = "CodeBuild execution"
  }
}

# IAM Policy for CodeBuild
resource "aws_iam_policy" "codebuild_policy" {
  name        = "${var.environment}-codebuild-policy"
  description = "Policy for CodeBuild projects"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:GetObjectVersion"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-codebuild-policy"
    Environment = var.environment
    Service     = "cicd"
  }
}

resource "aws_iam_role_policy_attachment" "codebuild_policy_attachment" {
  role       = aws_iam_role.codebuild_role.name
  policy_arn = aws_iam_policy.codebuild_policy.arn
}
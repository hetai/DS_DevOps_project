# DS_DevOps_project - ECR Module

# Create ECR repositories for Docker images
resource "aws_ecr_repository" "repo" {
  for_each = toset(var.repositories)

  name                 = "${var.environment}-${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.environment}-${each.key}"
    Environment = var.environment
  }
}

# Set repository policy to allow ECS to pull images
resource "aws_ecr_repository_policy" "repo_policy" {
  for_each = toset(var.repositories)

  repository = aws_ecr_repository.repo[each.key].name
  policy     = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPull"
        Effect = "Allow"
        Principal = {
          Service = "ecs.amazonaws.com"
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  })
}

# Set lifecycle policy to keep only the latest 5 images
resource "aws_ecr_lifecycle_policy" "lifecycle_policy" {
  for_each = toset(var.repositories)

  repository = aws_ecr_repository.repo[each.key].name
  policy     = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 5 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 5
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
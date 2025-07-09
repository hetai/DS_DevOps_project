# DS_DevOps_project - ECS Service Module

# Create ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.environment}-cluster"
    Environment = var.environment
  }
}

# Create CloudWatch Log Group for ECS tasks
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/${var.environment}"
  retention_in_days = 30

  tags = {
    Name        = "${var.environment}-ecs-logs"
    Environment = var.environment
  }
}

# Create Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.alb_subnet_ids

  enable_deletion_protection = var.environment == "prod" ? true : false

  tags = {
    Name        = "${var.environment}-alb"
    Environment = var.environment
  }
}

# Create ALB Target Groups (Backend only)

resource "aws_lb_target_group" "backend" {
  name        = "${var.environment}-backend-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    interval            = 30
    path                = "/"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    protocol            = "HTTP"
    matcher             = "200"
  }

  tags = {
    Name        = "${var.environment}-backend-tg"
    Environment = var.environment
  }
}

# Create ALB Listeners
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "API access only. Frontend served via CloudFront."
      status_code  = "404"
    }
  }
}

# HTTPS listener - enabled when certificate_arn is provided
resource "aws_lb_listener" "https" {
  count             = var.certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# Create ALB Listener Rules
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Create ECS Task Definitions
# Frontend task definition removed - frontend now served via S3 + CloudFront

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.environment}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.backend_image_url
      essential = true
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "VALIDATOR_PATH"
          value = "/app/OpenSCENARIOValidator"
        },
        {
          name  = "LD_LIBRARY_PATH"
          value = "/usr/local/lib"
        },
        {
          name  = "PORT"
          value = "8080"
        },
        {
          name  = "LOG_LEVEL"
          value = "INFO"
        },
        {
          name  = "MAX_UPLOAD_SIZE"
          value = "10485760"
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:PLACEHOLDER@${var.db_endpoint}/${var.db_name}"
        }
      ]
      secrets = var.db_secret_arn != "" ? [
        {
          name      = "DB_PASSWORD"
          valueFrom = "${var.db_secret_arn}:password::"
        },
        {
          name      = "DB_USERNAME"
          valueFrom = "${var.db_secret_arn}:username::"
        }
      ] : []
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${var.environment}-backend-task"
    Environment = var.environment
  }
}

# Create ECS Services
# Frontend ECS service removed - frontend now served via S3 + CloudFront

resource "aws_ecs_service" "backend" {
  name            = "${var.environment}-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [var.ecs_security_group_id]
    subnets          = var.subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  tags = {
    Name        = "${var.environment}-backend-service"
    Environment = var.environment
  }

  depends_on = [aws_lb_listener_rule.api]
}
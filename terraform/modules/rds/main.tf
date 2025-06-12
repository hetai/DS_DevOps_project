# DS_DevOps_project - RDS Module

# Create DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name        = "${var.environment}-db-subnet-group"
  description = "DB subnet group for ${var.environment}"
  subnet_ids  = var.subnet_ids

  tags = {
    Name        = "${var.environment}-db-subnet-group"
    Environment = var.environment
  }
}

# Create DB Parameter Group
resource "aws_db_parameter_group" "main" {
  name        = "${var.environment}-db-parameter-group"
  family      = "postgres14"
  description = "DB parameter group for ${var.environment}"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  tags = {
    Name        = "${var.environment}-db-parameter-group"
    Environment = var.environment
  }
}

# Create RDS Instance
resource "aws_db_instance" "main" {
  identifier             = "${var.environment}-db"
  engine                 = "postgres"
  engine_version         = "14.18"
  instance_class         = var.db_instance_class
  allocated_storage      = 20
  max_allocated_storage  = 100
  storage_type           = "gp2"
  storage_encrypted      = true
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  port                   = 5432
  publicly_accessible    = false
  vpc_security_group_ids = var.vpc_security_group_ids
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name
  multi_az               = true
  skip_final_snapshot    = true
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  deletion_protection    = var.environment == "prod" ? true : false

  tags = {
    Name        = "${var.environment}-db"
    Environment = var.environment
  }
}
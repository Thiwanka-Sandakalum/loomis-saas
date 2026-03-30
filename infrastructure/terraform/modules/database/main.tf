variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "db_subnet_ids" {
  description = "Subnet IDs for database"
  type        = list(string)
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 100
}

variable "instance_class" {
  description = "Instance class for RDS"
  type        = string
  default     = "db.t3.medium"
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Backup retention days"
  type        = number
  default     = 30
}

variable "mongodb_version" {
  description = "MongoDB version"
  type        = string
  default     = "7.0"
}

variable "mongodb_tier" {
  description = "MongoDB Atlas cluster tier"
  type        = string
  default     = "M10"
}

variable "mongodb_project_id" {
  description = "MongoDB Atlas project ID"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-subnet-group"
  subnet_ids = var.db_subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-subnet-group"
    }
  )
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for RDS"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-rds-sg"
    }
  )
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier              = "${var.project_name}-${var.environment}-db"
  engine                  = "postgres"
  engine_version          = "15.4"
  instance_class          = var.instance_class
  allocated_storage       = var.allocated_storage
  db_name                 = "loomis"
  username                = "admin"
  password                = random_password.db_password.result
  parameter_group_name    = "default.postgres15"
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  
  multi_az                = var.multi_az
  publicly_accessible     = false
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.rds.arn
  
  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"
  
  deletion_protection     = var.environment == "prod" ? true : false
  skip_final_snapshot     = var.environment != "prod"
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  enable_iam_database_authentication = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-db"
    }
  )
}

# KMS Key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-rds-key"
    }
  )
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.project_name}-${var.environment}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# Random password for RDS
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project_name}/${var.environment}/db/password"
  description             = "RDS database password"
  recovery_window_in_days = 7

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-db-password"
    }
  )
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id       = aws_secretsmanager_secret.db_password.id
  secret_string   = jsonencode({
    username = aws_db_instance.main.username
    password = random_password.db_password.result
    host     = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}

# MongoDB Security Group
resource "aws_security_group" "mongodb" {
  name        = "${var.project_name}-${var.environment}-mongodb-sg"
  description = "Security group for MongoDB"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 27017
    to_port     = 27017
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-mongodb-sg"
    }
  )
}

# Outputs
output "rds_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "rds_database_name" {
  value = aws_db_instance.main.db_name
}

output "rds_security_group_id" {
  value = aws_security_group.rds.id
}

output "mongodb_security_group_id" {
  value = aws_security_group.mongodb.id
}

output "mongodb_connection_string" {
  value = "mongodb://<username>:<password>@<mongodb-cluster-url>/loomis"
}

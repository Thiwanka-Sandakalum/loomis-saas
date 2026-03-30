variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-\\d{1}$", var.aws_region))
    error_message = "AWS region must be a valid region format."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "loomis"

  validation {
    condition     = length(var.project_name) <= 20
    error_message = "Project name must be 20 characters or less."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS database in GB"
  type        = number
  default     = 100

  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 65536
    error_message = "Allocated storage must be between 20 and 65536 GB."
  }
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30

  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 35
    error_message = "Backup retention days must be between 7 and 35."
  }
}

variable "mongodb_tier" {
  description = "MongoDB Atlas cluster tier"
  type        = string
  default     = "M10"

  validation {
    condition     = contains(["M0", "M2", "M5", "M10", "M20", "M30", "M40", "M50", "M60", "M70", "M80", "M90", "M100", "M200"], var.mongodb_tier)
    error_message = "Invalid MongoDB tier."
  }
}

variable "mongodb_project_id" {
  description = "MongoDB Atlas project ID"
  type        = string
}

variable "eks_version" {
  description = "EKS cluster version"
  type        = string
  default     = "1.29"
}

variable "node_desired_count" {
  description = "Desired number of EKS worker nodes"
  type        = number
  default     = 3

  validation {
    condition     = var.node_desired_count >= 1 && var.node_desired_count <= 100
    error_message = "Desired count must be between 1 and 100."
  }
}

variable "node_min_count" {
  description = "Minimum number of EKS worker nodes"
  type        = number
  default     = 1
}

variable "node_max_count" {
  description = "Maximum number of EKS worker nodes"
  type        = number
  default     = 10
}

variable "node_instance_types" {
  description = "EC2 instance types for EKS worker nodes"
  type        = list(string)
  default     = ["t3.large", "t3.xlarge"]
}

variable "ecr_registry" {
  description = "ECR registry URL"
  type        = string
  default     = ""
}

variable "docker_image_tags" {
  description = "Docker image tags"
  type        = string
  default     = "latest"
}

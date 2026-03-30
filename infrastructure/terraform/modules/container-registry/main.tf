variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "repository_names" {
  description = "List of ECR repository names"
  type        = list(string)
  default     = []
}

variable "enable_image_scanning" {
  description = "Enable image scanning on push"
  type        = bool
  default     = true
}

variable "image_tag_mutability" {
  description = "Enable image tag mutability"
  type        = string
  default     = "IMMUTABLE"
}

variable "lifecycle_days" {
  description = "Number of days to keep untagged images"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# ECR Repositories
resource "aws_ecr_repository" "main" {
  for_each = toset(var.repository_names)

  name                 = "${var.project_name}-${each.value}"
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.enable_image_scanning
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-${each.value}"
    }
  )
}

# ECR Repository Lifecycle Policies
resource "aws_ecr_lifecycle_policy" "main" {
  for_each = aws_ecr_repository.main

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Remove untagged images after ${var.lifecycle_days} days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.lifecycle_days
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# Outputs
output "ecr_repository_urls" {
  value = {
    for name, repo in aws_ecr_repository.main : name => repo.repository_url
  }
}

output "ecr_registry_id" {
  value = aws_ecr_repository.main[keys(aws_ecr_repository.main)[0]].registry_id
}

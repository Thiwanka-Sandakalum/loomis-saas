aws_region              = "us-east-1"
environment             = "dev"
project_name            = "loomis"
vpc_cidr                = "10.0.0.0/16"

# Database Configuration
db_allocated_storage    = 50
db_instance_class       = "db.t3.small"
enable_multi_az         = false
backup_retention_days   = 7

# MongoDB Configuration
mongodb_tier            = "M10"
mongodb_project_id      = "YOUR_MONGODB_PROJECT_ID"

# EKS Configuration
eks_version             = "1.29"
node_desired_count      = 2
node_min_count          = 1
node_max_count          = 5
node_instance_types     = ["t3.medium", "t3.large"]

aws_region              = "us-east-1"
environment             = "prod"
project_name            = "loomis"
vpc_cidr                = "10.0.0.0/16"

# Database Configuration
db_allocated_storage    = 500
db_instance_class       = "db.r6i.xlarge"
enable_multi_az         = true
backup_retention_days   = 30

# MongoDB Configuration
mongodb_tier            = "M30"
mongodb_project_id      = "YOUR_MONGODB_PROJECT_ID"

# EKS Configuration
eks_version             = "1.29"
node_desired_count      = 5
node_min_count          = 3
node_max_count          = 20
node_instance_types     = ["t3.xlarge", "t3.2xlarge", "m5.xlarge"]

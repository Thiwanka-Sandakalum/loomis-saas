output "vpc_id" {
  value       = module.networking.vpc_id
  description = "ID of the VPC"
}

output "vpc_cidr" {
  value       = module.networking.vpc_cidr
  description = "CIDR block of the VPC"
}

output "public_subnet_ids" {
  value       = module.networking.public_subnet_ids
  description = "IDs of public subnets"
}

output "private_subnet_ids" {
  value       = module.networking.private_subnet_ids
  description = "IDs of private subnets"
}

output "ecr_repository_urls" {
  value       = module.container_registry.ecr_repository_urls
  description = "URLs of ECR repositories"
}

output "eks_cluster_endpoint" {
  value       = module.kubernetes.eks_cluster_endpoint
  description = "EKS cluster API endpoint"
}

output "eks_cluster_name" {
  value       = module.kubernetes.eks_cluster_name
  description = "Name of the EKS cluster"
}

output "eks_cluster_security_group_id" {
  value       = module.kubernetes.eks_cluster_security_group_id
  description = "Security group ID of the EKS cluster"
}

output "eks_worker_security_group_id" {
  value       = module.kubernetes.eks_worker_security_group_id
  description = "Security group ID of EKS worker nodes"
}

output "rds_endpoint" {
  value       = module.database.rds_endpoint
  description = "RDS database endpoint"
  sensitive   = true
}

output "rds_database_name" {
  value       = module.database.rds_database_name
  description = "RDS database name"
}

output "mongodb_atlas_connection_string" {
  value       = module.database.mongodb_connection_string
  description = "MongoDB Atlas connection string"
  sensitive   = true
}

output "cloudwatch_log_group_name" {
  value       = "/aws/eks/${ module.kubernetes.eks_cluster_name}"
  description = "CloudWatch log group for EKS cluster"
}

output "alb_dns_name" {
  value       = try(module.kubernetes.alb_dns_name, "")
  description = "DNS name of the Application Load Balancer"
}

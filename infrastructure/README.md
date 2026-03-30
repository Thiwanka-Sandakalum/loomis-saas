# Loomis Platform - Infrastructure Directory Guide

This directory contains all DevOps infrastructure, Kubernetes manifests, Terraform configurations, and documentation for the Loomis platform.

## Directory Structure

```
infrastructure/
├── terraform/              # Infrastructure as Code
│   ├── main.tf            # Root module with providers and modules
│   ├── variables.tf       # Input variables with validation
│   ├── outputs.tf         # Output values for downstream use
│   ├── modules/           # Reusable terraform modules
│   │   ├── networking/    # VPC, subnets, security groups
│   │   ├── kubernetes/    # EKS cluster and node groups
│   │   ├── database/      # RDS, MongoDB, security
│   │   └── container-registry/  # ECR configuration
│   └── environments/      # Environment-specific variables
│       ├── dev.tfvars     # Development environment
│       └── prod.tfvars    # Production environment
├── k8s/                   # Kubernetes manifests
│   ├── namespace.yaml     # Namespace definitions
│   ├── configmaps.yaml    # Configuration management
│   ├── secrets.yaml       # Secrets (template)
│   ├── core-service-deployment.yaml
│   ├── brain-service-deployment.yaml
│   ├── admin-dashboard-deployment.yaml
│   ├── mongodb-statefulset.yaml
│   ├── services.yaml      # Service definitions
│   ├── ingress.yaml       # Load balancing and network policies
│   └── README.md          # K8s specific documentation
└── docs/                  # Infrastructure documentation
    ├── ARCHITECTURE.md    # System design and diagrams
    ├── DEPLOYMENT.md      # Step-by-step deployment guide
    ├── TROUBLESHOOTING.md # Common issues and solutions
    └── SCALING.md         # Auto-scaling configuration
```

## Quick Navigation

### For Deploying Infrastructure
- Start here: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Reference: [terraform/](terraform/)

### For Understanding Architecture
- Reference: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

### For Kubernetes Deployment
- Reference: [k8s/](k8s/)
- See: [k8s/README.md](k8s/README.md) if exists

### For Troubleshooting
- Reference: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

### For Scaling Operations
- Reference: [docs/SCALING.md](docs/SCALING.md)

## Prerequisites

### Required Tools
```bash
# Verify installations
aws --version        # >= 2.0
terraform --version  # >= 1.7.0
kubectl version      # >= 1.29
docker --version     # >= 24.0
git --version        # >= 2.30
```

### AWS Account
1. Create or use existing AWS account
2. Configure AWS CLI: `aws configure`
3. Create S3 bucket for Terraform state
4. Ensure IAM permissions for EKS, RDS, ECR, VPC

### GitHub
1. Access to repository with Actions enabled
2. Ability to manage secrets and variables
3. Appropriate branch protection rules

## Common Tasks

### Deploy Infrastructure
```bash
cd terraform
terraform init -backend-config="bucket=..." 
terraform plan -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/dev.tfvars"
```

### Deploy Applications
```bash
# First, get EKS config
aws eks update-kubeconfig --name loomis-dev-eks --region us-east-1

# Deploy Kubernetes resources
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmaps.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/mongodb-statefulset.yaml
kubectl apply -f k8s/core-service-deployment.yaml
kubectl apply -f k8s/brain-service-deployment.yaml
kubectl apply -f k8s/admin-dashboard-deployment.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/ingress.yaml
```

### Destroy Infrastructure
```bash
cd terraform
terraform destroy -var-file="environments/dev.tfvars"
```

### View Logs
```bash
# Application logs
kubectl logs deployment/core-service -n production

# CloudWatch logs
aws logs tail /aws/eks/loomis-dev-eks --follow
```

### Scale Services
```bash
# Manual scaling
kubectl scale deployment core-service --replicas=5 -n production

# Setup autoscaling
kubectl autoscale deployment core-service --min=2 --max=10 --cpu-percent=70 -n production
```

## Environment Variables

Key environment variables used in Terraform and Kubernetes:

- `AWS_REGION`: AWS region (default: us-east-1)
- `ENVIRONMENT`: Environment name (dev/staging/prod)
- `MONGO_PASSWORD`: MongoDB password
- `JWT_SECRET`: JWT signing secret
- `OPENAI_API_KEY`: OpenAI API key for Brain Service
- `TF_STATE_BUCKET`: S3 bucket for Terraform state

## Monitoring & Debugging

### Check Service Status
```bash
kubectl get deployments -n production
kubectl get pods -n production
kubectl top pods -n production
```

### Access Logs
```bash
# Stream logs from a deployment
kubectl logs -f deployment/core-service -n production

# View previous pod logs
kubectl logs deployment/core-service -n production --previous
```

### Debug a Pod
```bash
# Execute command in pod
kubectl exec -it <pod-name> -n production -- /bin/bash

# Port forward for local testing
kubectl port-forward svc/core-service 5000:5000 -n production
```

## CI/CD Pipeline

GitHub Actions workflows automatically:
1. Build and test on push/PR
2. Create Docker images
3. Push to ECR
4. Run security scans
5. Update infrastructure (on main)
6. Deploy to EKS
7. Run smoke tests

See [../.github/workflows/]() for workflow definitions.

## Documentation Structure

| Document | Purpose | Audience |
|----------|---------|----------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, diagrams | Architects, Leads |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Step-by-step deployment | Engineers |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues & fixes | Support, Engineers |
| [SCALING.md](docs/SCALING.md) | Auto-scaling setup | DevOps, SRE |

## File Descriptions

### Terraform Files

**main.tf**
- Provider configuration for AWS
- Module orchestration
- Resource dependencies

**variables.tf**
- All input variables with types and defaults
- Input validation rules
- Description for each variable

**outputs.tf**
- Output values from modules
- Values for kubectl configuration
- Database connection strings

**modules/networking/main.tf**
- VPC and subnet creation
- Internet Gateway and NAT setup
- Security groups and NACLs
- Route tables and associations

**modules/kubernetes/main.tf**
- EKS cluster definition
- Node group configuration
- IAM roles and policies
- OIDC provider setup

**modules/database/main.tf**
- RDS instance creation
- MongoDB integration
- Secrets Manager setup
- KMS encryption keys

**modules/container-registry/main.tf**
- ECR repositories
- Image lifecycle policies
- Repository access controls

### Kubernetes Manifests

**namespace.yaml**
- Production namespace
- Development namespace
- Monitoring namespace

**configmaps.yaml**
- Environment configurations
- Service-specific configs
- Nginx configuration

**secrets.yaml**
- Database credentials (template)
- API keys
- JWT secrets

**\*-deployment.yaml**
- Pod specifications
- Service accounts
- RBAC role bindings
- Resource limits

**services.yaml**
- Service definitions
- Port mappings
- Load balancing configuration

**ingress.yaml**
- ALB ingress rules
- SSL/TLS configuration
- Network policies
- Pod disruption budgets

**mongodb-statefulset.yaml**
- StatefulSet definition
- PersistentVolumeClaims
- Init scripts
- Storage configuration

## Secrets Management

Secrets are stored in:
- GitHub Actions Secrets (for CI/CD)
- AWS Secrets Manager (in cluster)
- Kubernetes Secrets (application runtime)

See [GITHUB_SECRETS.md](../GITHUB_SECRETS.md) for configuration.

## Troubleshooting Quick Links

Common issues:
- [Pod not starting](docs/TROUBLESHOOTING.md#issue-pods-stuck-in-crashloopbackoff)
- [Database connection issues](docs/TROUBLESHOOTING.md#issue-mongodb-connection-refused)
- [Network problems](docs/TROUBLESHOOTING.md#issue-service-unreachable)
- [Performance issues](docs/TROUBLESHOOTING.md#issue-high-cpumemory-usage)

## Support & Resources

- **Kubernetes Docs**: https://kubernetes.io/docs/
- **Terraform Docs**: https://www.terraform.io/docs
- **AWS EKS**: https://docs.aws.amazon.com/eks/
- **GitHub Actions**: https://docs.github.com/en/actions

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-30 | Initial production-ready release |

---

**Last Updated**: March 30, 2026  
**Status**: Production Ready ✅

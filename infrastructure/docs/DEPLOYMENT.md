# Loomis Platform - Deployment Guide

## Prerequisites

### Required Tools
```bash
# AWS CLI v2
aws --version

# kubectl
kubectl version --client

# Terraform >= 1.7.0
terraform version

# Docker
docker --version

# Git
git --version
```

### AWS Account Setup
1. Create AWS account (or use existing)
2. Configure AWS CLI credentials:
   ```bash
   aws configure
   # Enter: Access Key ID, Secret Access Key, Default region (us-east-1)
   ```
3. Create S3 bucket for Terraform state:
   ```bash
   aws s3 mb s3://loomis-terraform-state-${ACCOUNT_ID} --region us-east-1
   ```
4. Create DynamoDB table for state locking:
   ```bash
   aws dynamodb create-table \
     --table-name terraform-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
   ```

### GitHub Setup
1. Create GitHub repository
2. Configure GitHub secrets (see [GITHUB_SECRETS.md](./GITHUB_SECRETS.md))
3. Enable branch protection rules on `main`

## Deployment Steps

### Phase 1: Infrastructure Setup (Terraform)

#### 1. Initialize Terraform

```bash
cd infrastructure/terraform

# Create terraform.tfvars
cat > terraform.tfvars << EOF
aws_region         = "us-east-1"
environment        = "dev"
project_name       = "loomis"
vpc_cidr            = "10.0.0.0/16"
mongodb_project_id  = "YOUR_MONGODB_PROJECT_ID"
EOF

# Initialize Terraform backend
terraform init \
  -backend-config="bucket=loomis-terraform-state-${ACCOUNT_ID}" \
  -backend-config="key=dev.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="encrypt=true" \
  -backend-config="dynamodb_table=terraform-locks"
```

#### 2. Plan Infrastructure

```bash
# Plan changes
terraform plan -var-file="environments/dev.tfvars" -out=tfplan

# Review output
cat tfplan | grep -E '^[+~-]' | head -20
```

#### 3. Apply Infrastructure

```bash
# Apply infrastructure
terraform apply tfplan

# Save outputs
terraform output -json > infrastructure-outputs.json

# Extract important values
export EKS_CLUSTER_NAME=$(terraform output -raw eks_cluster_name)
export ECR_REGISTRY=$(terraform output -json ecr_repository_urls | jq -r '.["core-service"]' | cut -d'/' -f1)
```

### Phase 2: Container Registry Setup

#### 1. Configure Docker Authentication

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REGISTRY
```

#### 2. Push Base Images (Optional)

```bash
# Build and push images
for service in core-service brain-service admin-dashboard; do
  docker build -t $ECR_REGISTRY/loomis-$service:latest \
    ./$service
  docker push $ECR_REGISTRY/loomis-$service:latest
done
```

### Phase 3: Kubernetes Configuration

#### 1. Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --name $EKS_CLUSTER_NAME \
  --region us-east-1

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

#### 2. Create Namespaces

```bash
kubectl apply -f infrastructure/k8s/namespace.yaml

# Verify
kubectl get namespaces
```

#### 3. Create Secrets

```bash
# Generate secrets
export MONGO_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 32)
export DB_PASSWORD=$(openssl rand -base64 32)
export OPENAI_API_KEY="sk-..." # Add your OpenAI key

# Create secret file
cat > infrastructure/k8s/secrets-values.yaml << EOF
MONGO_PASSWORD: $MONGO_PASSWORD
JWT_SECRET: $JWT_SECRET
DB_PASSWORD: $DB_PASSWORD
OPENAI_API_KEY: $OPENAI_API_KEY
EOF

# Create secrets in Kubernetes
kubectl create secret generic core-service-secrets \
  --from-literal=JWT_SECRET=$JWT_SECRET \
  --from-literal=DB_PASSWORD=$DB_PASSWORD \
  -n production

kubectl create secret generic brain-service-secrets \
  --from-literal=OPENAI_API_KEY=$OPENAI_API_KEY \
  -n production

kubectl create secret generic mongodb-secrets \
  --from-literal=MONGO_PASSWORD=$MONGO_PASSWORD \
  -n production
```

#### 4. Create ConfigMaps

```bash
kubectl apply -f infrastructure/k8s/configmaps.yaml
```

#### 5. Deploy Applications

```bash
# Deploy in order
kubectl apply -f infrastructure/k8s/mongodb-statefulset.yaml
sleep 30

kubectl apply -f infrastructure/k8s/core-service-deployment.yaml
sleep 20

kubectl apply -f infrastructure/k8s/brain-service-deployment.yaml
sleep 20

kubectl apply -f infrastructure/k8s/admin-dashboard-deployment.yaml
sleep 20

# Deploy services and ingress
kubectl apply -f infrastructure/k8s/services.yaml
kubectl apply -f infrastructure/k8s/ingress.yaml
```

#### 6. Verify Deployments

```bash
# Check all deployments
kubectl get deployments -n production

# Check pod status
kubectl get pods -n production

# Check services
kubectl get services -n production

# Check ingress
kubectl get ingress -n production

# View ALB endpoint
kubectl describe ingress main-ingress -n production | grep Address
```

### Phase 4: Application Verification

#### 1. Wait for Load Balancer

```bash
# Get ALB DNS name
ALB_DNS=$(kubectl get ingress main-ingress -n production \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "ALB Endpoint: $ALB_DNS"

# Wait for DNS propagation (2-5 minutes)
until ping -c 1 $ALB_DNS 2>/dev/null; do
  echo "Waiting for ALB DNS..."
  sleep 10
done
```

#### 2. Test Endpoints

```bash
# Test admin dashboard
curl -I http://$ALB_DNS/

# Test core API
curl http://$ALB_DNS/api/health

# Test brain service
curl http://$ALB_DNS/brain-api/health

# Test with actual domain (if configured)
curl https://loomis.example.com/
```

#### 3. View Logs

```bash
# Pod logs
kubectl logs -n production deployment/core-service --tail=50

# Stream logs
kubectl logs -f -n production deployment/admin-dashboard

# Previous crashed pod logs
kubectl logs -n production deployment/core-service --previous
```

#### 4. Debug Issues

```bash
# Describe pod for events
kubectl describe pod <pod-name> -n production

# Execute commands in pod
kubectl exec -it <pod-name> -n production -- /bin/sh

# Port forward for local testing
kubectl port-forward -n production svc/core-service 5000:5000 &

# Check resource utilization
kubectl top nodes
kubectl top pods -n production
```

## Production Deployment

### Pre-Production Checklist

- [ ] All tests passing in GitHub Actions
- [ ] Security scanning completed (Trivy, SonarQube)
- [ ] Code review approved
- [ ] Infrastructure scaled appropriately
- [ ] Database backups configured
- [ ] Monitoring and alerting setup
- [ ] SSL certificates installed
- [ ] DNS records configured
- [ ] Runbooks for incident response created
- [ ] Team trained on procedures

### Production Deployment Process

```bash
# 1. Create prod tag
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0

# GitHub Actions will automatically:
# - Build images
# - Push to ECR
# - Run Terraform plan
# - Apply infrastructure changes
# - Deploy to EKS
# - Run smoke tests
# - Update DNS

# 2. Monitor deployment
watch -n 2 'kubectl get pods -n production'

# 3. Verify services
for endpoint in loomis.example.com api.loomis.example.com brain.loomis.example.com; do
  echo "Testing $endpoint..."
  curl -I https://$endpoint/
done
```

## Rollback Procedure

### If Deployment Fails

```bash
# Option 1: Previous image rollback (fastest)
kubectl rollout undo deployment/core-service -n production

# Option 2: Previous Terraform state
cd infrastructure/terraform
terraform plan -destroy -var-file="environments/prod.tfvars"
# Review and apply

# Option 3: Create previous git commit
git revert HEAD  # Reverts to previous commit
git push origin main  # Triggers GitHub Actions rollback

# Verify rollback
kubectl get pods -n production
```

## Scaling Operations

### Horizontal Pod Autoscaling (HPA)

```bash
# Create HPA
kubectl autoscale deployment core-service \
  --min=2 --max=10 \
  --cpu-percent=70 \
  -n production

# View HPA status
kubectl get hpa -n production
kubectl describe hpa core-service -n production
```

### Cluster Scaling

```bash
# Scale EKS node group
aws eks update-nodegroup-config \
  --cluster-name $EKS_CLUSTER_NAME \
  --nodegroup-name loomis-dev-ng \
  --scaling-config minSize=2,maxSize=10,desiredSize=5
```

## Maintenance Tasks

### Regular Backups

```bash
# Verify RDS automated backups
aws rds describe-db-instances \
  --db-instance-identifier loomis-dev-db \
  --query 'DBInstances[0].[BackupRetentionPeriod,PreferredBackupWindow]'

# Verify MongoDB backups
mongodump --uri "mongodb://<user>:<pass>@<host>/loomis" \
  --out ./mongodb-backup
```

### Log Rotation

```bash
# Check CloudWatch log retention
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/eks/loomis"
```

### Certificate Renewal

```bash
# AWS automatically renews ACM certificates
# Verify certificate status
aws acm describe-certificate \
  --certificate-arn $(terraform output -raw acm_certificate_arn)
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n production

# Common issues:
# - ImagePullBackOff: ECR authentication or image not pushed
# - CrashLoopBackOff: Application startup error
# - Pending: Insufficient resources or node selector mismatch
```

### Database Connection Issues

```bash
# Test MongoDB connectivity
mongosh "mongodb://<host>:<port>" --username admin --password

# Test PostgreSQL connectivity
psql -h <host> -U admin -d loomis

# Check security groups
aws ec2 describe-security-groups \
  --group-ids <security-group-id>
```

### Performance Issues

```bash
# Monitor resource utilization
kubectl top nodes
kubectl top pods -n production

# Check HPA status
kubectl get hpa -n production

# Scale manually if needed
kubectl scale deployment core-service --replicas=5 -n production
```

## Contact & Support

- **Documentation**: See README.md
- **Architecture**: See ARCHITECTURE.md
- **Troubleshooting**: See TROUBLESHOOTING.md
- **Scaling**: See SCALING.md

# GitHub Secrets Configuration Guide

This document outlines all required GitHub secrets for the Loomis platform CI/CD pipelines.

## Setting GitHub Secrets

### Using GitHub Web UI

1. Go to repository: **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Enter secret name and value
4. Click **Add secret**

### Using GitHub CLI

```bash
# Install GitHub CLI if not already installed
gh --version

# Login to GitHub
gh auth login

# Add secrets
gh secret set SECRET_NAME --body "SECRET_VALUE" --repo owner/repo
```

### Using GitHub Actions

```yaml
# Add to workflow file
env:
  MY_SECRET: ${{ secrets.MY_SECRET }}
```

## Required Secrets

### 1. AWS Credentials

#### AWS_ACCESS_KEY_ID
- **Purpose**: AWS API authentication for Terraform and deployment
- **Type**: AWS IAM Access Key
- **How to get**:
  ```bash
  # Create IAM user with programmatic access
  aws iam create-user --user-name github-actions
  
  # Attach policy (for testing, use AdminAccess; restrict in production)
  aws iam attach-user-policy \
    --user-name github-actions \
    --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
  
  # Create access key
  aws iam create-access-key --user-name github-actions
  ```

#### AWS_SECRET_ACCESS_KEY
- **Purpose**: AWS API secret key
- **Type**: AWS IAM Secret Access Key
- **Generated with**: AWS_ACCESS_KEY_ID above
- **Value**: Shown in `create-access-key` response

Example setup:
```bash
gh secret set AWS_ACCESS_KEY_ID --body "AKIAIOSFODNN7EXAMPLE"
gh secret set AWS_SECRET_ACCESS_KEY --body "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

### 2. AWS Role for OIDC (Recommended for Production)

#### AWS_ROLE_ARN
- **Purpose**: ARN of IAM role for GitHub Actions OIDC provider
- **Type**: IAM Role ARN
- **Security**: More secure alternative to long-term access keys
- **How to set up**:

```bash
# 1. Create OIDC provider in AWS
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# 2. Create IAM role for GitHub Actions
REPO="owner/repo"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws iam create-role \
  --role-name github-actions-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::'$ACCOUNT_ID':oidc-provider/token.actions.githubusercontent.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "token.actions.githubusercontent.com:sub": "repo:'$REPO':ref:refs/heads/main"
          }
        }
      }
    ]
  }'

# 3. Attach policies to role
aws iam attach-role-policy \
  --role-name github-actions-role \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# 4. Get role ARN
ROLE_ARN=$(aws iam get-role --role-name github-actions-role --query Role.Arn --output text)
echo $ROLE_ARN

# 5. Set secret
gh secret set AWS_ROLE_ARN --body "$ROLE_ARN"
```

### 3. Docker Registry Credentials

#### DOCKER_USERNAME
- **Purpose**: Docker Hub username for image push
- **Type**: String
- **How to get**:
  ```bash
  # Create Docker Hub account or use existing
  # Username is your Docker Hub username
  gh secret set DOCKER_USERNAME --body "your-docker-username"
  ```

#### DOCKER_PASSWORD
- **Purpose**: Docker Hub password or access token
- **Type**: String (preferably use access token for security)
- **How to get**:
  ```bash
  # Option 1: Docker Hub password (not recommended)
  gh secret set DOCKER_PASSWORD --body "your-docker-password"
  
  # Option 2: Docker Hub Personal Access Token (recommended)
  # 1. Go to Docker Hub → Settings → Security → Access Tokens
  # 2. Create new access token
  # 3. Set as secret:
  gh secret set DOCKER_PASSWORD --body "dckr_pat_xxxxx"
  ```

### 4. Container Registry Authentication

#### GITHUB_TOKEN
- **Purpose**: GitHub Container Registry (ghcr.io) authentication
- **Type**: Auto-provided by GitHub Actions
- **Note**: Already available in all workflows as `secrets.GITHUB_TOKEN`
- **Manual setup** (for outside GitHub Actions):
  ```bash
  # Create personal access token
  # Go to GitHub → Settings → Developer settings → Personal access tokens
  # Scopes: write:packages, read:packages, delete:packages
  gh secret set GITHUB_TOKEN --body "ghp_xxxxx"
  ```

### 5. Database Credentials

#### MONGODB_URI
- **Purpose**: MongoDB Atlas connection string
- **Type**: Encrypted connection string
- **Format**: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`
- **How to get**:
  ```bash
  # From MongoDB Atlas Console:
  # 1. Go to Clusters → Connect
  # 2. Choose "Connect your application"
  # 3. Copy connection string
  # 4. Replace <password> with actual password
  
  gh secret set MONGODB_URI --body "mongodb+srv://admin:password@cluster.mongodb.net/loomis?retryWrites=true&w=majority"
  ```

#### MONGODB_ADMIN_PASSWORD
- **Purpose**: MongoDB admin password for initialization
- **Type**: Encrypted string
- **How to create**:
  ```bash
  # Generate secure password
  PASSWORD=$(openssl rand -base64 32)
  gh secret set MONGODB_ADMIN_PASSWORD --body "$PASSWORD"
  ```

### 6. API Keys

#### OPENAI_API_KEY
- **Purpose**: OpenAI API for Brain Service AI agent
- **Type**: Encrypted API key
- **How to get**:
  ```bash
  # 1. Go to https://platform.openai.com/api-keys
  # 2. Create new API key
  # 3. Set secret:
  gh secret set OPENAI_API_KEY --body "sk-proj-xxxxx"
  ```

### 7. JWT Secrets

#### JWT_SECRET
- **Purpose**: JWT signing secret for authentication
- **Type**: Encrypted random string
- **How to create**:
  ```bash
  SECRET=$(openssl rand -base64 32)
  gh secret set JWT_SECRET --body "$SECRET"
  ```

### 8. Deployment Configuration

#### TF_STATE_BUCKET
- **Purpose**: S3 bucket for Terraform state files
- **Type**: String (bucket name)
- **How to create**:
  ```bash
  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  BUCKET_NAME="loomis-terraform-state-${ACCOUNT_ID}"
  
  # Create bucket
  aws s3 mb "s3://$BUCKET_NAME" --region us-east-1
  
  # Enable versioning for state protection
  aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled
  
  # Set secret
  gh secret set TF_STATE_BUCKET --body "$BUCKET_NAME"
  ```

### 9. Slack Integration (Optional)

#### SLACK_WEBHOOK
- **Purpose**: Slack notifications for deployment status
- **Type**: Encrypted webhook URL
- **How to get**:
  ```bash
  # 1. Go to https://api.slack.com/apps
  # 2. Create New App → From scratch
  # 3. Navigate to Incoming Webhooks
  # 4. Add New Webhook to Workspace
  # 5. Choose channel and authorize
  # 6. Copy webhook URL:
  
  gh secret set SLACK_WEBHOOK --body "https://hooks.slack.com/services/T00000000/B00000000/XXxxxxxxxxxxxxxx"
  ```

### 10. Sonarqube (Optional)

#### SONAR_TOKEN
- **Purpose**: SonarQube token for code quality analysis
- **Type**: Encrypted token
- **How to get**:
  ```bash
  # 1. Go to SonarQube server
  # 2. User Settings → Security → Generate Tokens
  # 3. Create token
  # 4. Set secret:
  gh secret set SONAR_TOKEN --body "squ_xxxxx"
  ```

### 11. Codecov (Optional)

#### CODECOV_TOKEN
- **Purpose**: Codecov token for coverage reports
- **Type**: Encrypted token
- **How to get**:
  ```bash
  # 1. Go to https://codecov.io
  # 2. Connect repository
  # 3. Get upload token:
  gh secret set CODECOV_TOKEN --body "xxxxxxxxxxxx"
  ```

## Verifying Secrets

### List All Secrets

```bash
# List secret names (values not shown)
gh secret list --repo owner/repo
```

### Test Secret Access in Workflow

```yaml
name: Test Secrets

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Check AWS credentials
        run: |
          echo "AWS credentials configured: ${{ secrets.AWS_ACCESS_KEY_ID != '' }}"
          echo "MongoDB URI configured: ${{ secrets.MONGODB_URI != '' }}"
          echo "OpenAI key configured: ${{ secrets.OPENAI_API_KEY != '' }}"
```

## Security Best Practices

### 1. Use Access Tokens Instead of Passwords
```bash
# For Docker Hub
# Generate at: https://hub.docker.com/settings/security
# Better security than password

# For GitHub
# Generate at: https://github.com/settings/tokens
# Mark as read-only where possible
```

### 2. Rotate Secrets Regularly
```bash
# Rotate AWS access keys every 90 days
# Rotate API keys every 180 days

# To rotate:
gh secret set SECRET_NAME --body "new_value"
```

### 3. Limit Secret Scope
```bash
# Restrict OIDC role to specific branches:
"Condition": {
  "StringEquals": {
    "token.actions.githubusercontent.com:ref": "refs/heads/main"
  }
}
```

### 4. Monitor Secret Usage
```bash
# Check workflow logs (in Actions tab)
# Secrets are masked in logs automatically
# Look for failed authentications

# Set up CloudTrail for AWS secrets usage
aws cloudtrail start-logging --trail-name github-actions-trail
```

### 5. Environment-Specific Secrets

For different environments (dev, staging, prod), you can:

```yaml
# In workflow file
env:
  AWS_ACCOUNT_ID: ${{ secrets[format('{0}_AWS_ACCOUNT_ID', matrix.environment)] }}

strategy:
  matrix:
    environment: [dev, staging, prod]
```

Then create secrets:
- `DEV_AWS_ACCOUNT_ID`
- `STAGING_AWS_ACCOUNT_ID`
- `PROD_AWS_ACCOUNT_ID`

## Troubleshooting

### Secret Not Found in Workflow

```bash
# Ensure secret name matches exactly (case-sensitive)
# Example: AWS_ACCESS_KEY_ID (not aws_access_key_id)

# Re-add the secret
gh secret set AWS_ACCESS_KEY_ID --body "value"
```

### Branch Protection Preventing Deployment

```bash
# Ensure the branch deploying has appropriate permissions
# Check Settings → Branches → Branch protection rules

# Token must have sufficient scopes
# GitHub Actions token is limited to current workflow branch
```

### Docker Push Failing

```bash
# Verify DOCKER_USERNAME and DOCKER_PASSWORD
docker login -u ${{ secrets.DOCKER_USERNAME }} \
  --password ${{ secrets.DOCKER_PASSWORD }}

# Or use GITHUB_TOKEN for ghcr.io
echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io \
  -u ${{ github.actor }} --password-stdin
```

## Complete Checklist

- [ ] AWS_ACCESS_KEY_ID
- [ ] AWS_SECRET_ACCESS_KEY
- [ ] AWS_ROLE_ARN (or use access keys above)
- [ ] DOCKER_USERNAME
- [ ] DOCKER_PASSWORD
- [ ] GITHUB_TOKEN (auto-provided)
- [ ] MONGODB_URI
- [ ] MONGODB_ADMIN_PASSWORD
- [ ] OPENAI_API_KEY
- [ ] JWT_SECRET
- [ ] TF_STATE_BUCKET
- [ ] SLACK_WEBHOOK (optional)
- [ ] SONAR_TOKEN (optional)
- [ ] CODECOV_TOKEN (optional)

## Automated Secret Setup Script

```bash
#!/bin/bash

# Set all required secrets
read -sp "Enter AWS Access Key: " AWS_ACCESS_KEY_ID
gh secret set AWS_ACCESS_KEY_ID --body "$AWS_ACCESS_KEY_ID"

read -sp "Enter AWS Secret Key: " AWS_SECRET_ACCESS_KEY
gh secret set AWS_SECRET_ACCESS_KEY --body "$AWS_SECRET_ACCESS_KEY"

read -p "Enter Docker Username: " DOCKER_USERNAME
gh secret set DOCKER_USERNAME --body "$DOCKER_USERNAME"

read -sp "Enter Docker Password: " DOCKER_PASSWORD
gh secret set DOCKER_PASSWORD --body "$DOCKER_PASSWORD"

read -p "Enter MongoDB URI: " MONGODB_URI
gh secret set MONGODB_URI --body "$MONGODB_URI"

read -sp "Enter OpenAI API Key: " OPENAI_API_KEY
gh secret set OPENAI_API_KEY --body "$OPENAI_API_KEY"

# Generate secrets if not provided
JWT_SECRET=$(openssl rand -base64 32)
gh secret set JWT_SECRET --body "$JWT_SECRET"

echo "All secrets configured successfully!"
gh secret list
```

## Support

For issues with secrets:
1. Check GitHub Actions documentation: https://docs.github.com/en/actions/security-guides/encrypted-secrets
2. Review workflow logs in Actions tab (secrets are masked)
3. Verify IAM permissions in AWS for OIDC provider
4. Check repository settings → Secrets and variables → Actions

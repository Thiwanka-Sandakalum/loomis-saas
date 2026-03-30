# Loomis SaaS Platform

## Overview
Loomis is a modern SaaS platform designed for courier and logistics businesses. It provides an AI-powered dashboard for managing shipments, rates, customer inquiries, integrations, and business analytics. Loomis leverages advanced AI agents to automate customer support, shipment booking, rate calculation, and system monitoring, streamlining operations for courier companies and their clients.

**Key Value Propositions:**
- **AI Automation:** Specialized agents handle customer inquiries, complaints, shipment tracking, rate calculation, and payments.
- **Unified Dashboard:** Real-time management of shipments, rates, and customer interactions.
- **Extensible Integrations:** Connect with external services (e.g., Telegram, webhooks).
- **Scalable Infrastructure:** Microservices architecture with robust backend and modern Angular frontend.
- **Customizable:** Multi-tenant support, flexible rate and settings management.

## Tech Stack

<p align="center">
<img src="https://img.shields.io/badge/Google%20ADK-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google ADK"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=c-sharp&logoColor=white" alt="C#"/>
<img src="https://img.shields.io/badge/.NET-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt=".NET Core"/>
<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
<img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular"/>
<img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
<img src="https://img.shields.io/badge/Auth0-EB5424?style=for-the-badge&logo=auth0&logoColor=white" alt="Auth0"/>
<img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"/>
<img src="https://img.shields.io/badge/Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini"/>
<img src="https://img.shields.io/badge/Pub%2FSub-336791?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Pub/Sub"/>
</p>

---

## Architecture

For a detailed system architecture, see [docs/architecture.md](docs/architecture.md).

---

## Screenshots

| ![Dashboard](docs/public/assets/screenshots/dashboard.png) | ![AI Agent Sandbox](docs/public/assets/screenshots/ai-agent-sandbox.png) | ![Integrations](docs/public/assets/screenshots/integrations.png) |
|:---------------------------------------------------------:|:-----------------------------------------------------------------------:|:---------------------------------------------------------------:|
| **Dashboard**                                             | **AI Agent Sandbox**                                                    | **Integrations**                                                |

---

## Key Features & Components

- **AI Agents:** adminAgent, customerAgent, financeAgent, shipmentAgent, supportAgent, trackingAgent (see `brain-service/src/application/agents/`)
- **Core Features:** Dashboard, Shipments, Rates, Inquiries, Integrations, Onboarding, Settings (see `admin-dashboard/src/app/features/`)
- **API:** OpenAPI specs in `brain-service/openapi.yaml` and `admin-dashboard/openapi.yaml`
- **Microservices:** Node.js AI service, .NET Core API, MongoDB (see `docker-compose.yml`)

---

## Project Structure

```
loomis/
├── admin-dashboard/          # Angular 21 SaaS frontend
│   ├── src/app/
│   │   ├── core/            # Guards, interceptors, services
│   │   ├── features/        # Feature modules (dashboard, shipments, etc.)
│   │   └── shared/          # Shared components & pipes
│   └── package.json
├── core-service/            # .NET Core 10 API backend
│   ├── src/
│   │   ├── CoreCourierService.Api/      # Controllers, DTOs, middleware
│   │   ├── CoreCourierService.Core/     # Entities, interfaces
│   │   └── CoreCourierService.Infrastructure/  # Repositories, DB context
│   └── CoreCourierService.slnx
├── brain-service/           # Node.js/TypeScript AI agent service
│   ├── src/
│   │   ├── application/agents/    # AI agents (customer, finance, routing)
│   │   ├── infra/                # API client, database setup
│   │   └── jobs/                 # Background job processing
│   └── package.json
├── infrastructure/          # DevOps & Infrastructure as Code
│   ├── docker/             # Dockerfiles and docker-compose
│   ├── kubernetes/         # K8s manifests (deployments, services, HPA)
│   ├── terraform/          # IaC for AWS (EKS, VPC, ECR, RDS)
│   └── docs/               # Architecture, deployment, scaling guides
└── docs/                   # Project documentation
```

---

## Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for frontend development)
- .NET 10 SDK (for backend development)
- MongoDB (containerized in docker-compose)

### Run with Docker Compose

```bash
# Navigate to infrastructure/docker directory
cd infrastructure/docker

# Start all services (MongoDB, Core Service, Brain Service, Admin Dashboard)
docker-compose up -d

# Services will be available at:
# - Admin Dashboard: http://localhost:3000
# - Core Service API: http://localhost:5000
# - Brain Service: http://localhost:3001
# - MongoDB: localhost:27017
```

### Local Development Setup

```bash
# Backend (.NET Core)
cd core-service
dotnet restore
dotnet build
dotnet run

# Frontend (Angular)
cd admin-dashboard
npm install
npm start
# Access at http://localhost:4200

# Brain Service (Node.js)
cd brain-service
npm install
npm run dev
```

---

## Production Deployment

### Option 1: Kubernetes (AWS EKS)

**Prerequisites:**
- AWS account
- Terraform 1.0+
- kubectl configured
- GitHub repository secrets configured

**Deploy:**

```bash
# 1. Configure environment variables
export AWS_REGION=us-east-1
export ENVIRONMENT=prod

# 2. Initialize and apply Terraform
cd infrastructure/terraform
terraform init
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars

# 3. Deploy Kubernetes manifests
kubectl apply -f ../kubernetes/namespace-config.yaml
kubectl apply -f ../kubernetes/core-service.yaml
kubectl apply -f ../kubernetes/brain-service.yaml
kubectl apply -f ../kubernetes/admin-dashboard.yaml

# 4. Verify deployments
kubectl get pods -n loomis
kubectl get svc -n loomis
```

**For detailed deployment guide, see [infrastructure/docs/DEPLOYMENT.md](infrastructure/docs/DEPLOYMENT.md)**

### Option 2: GitHub Actions CI/CD

Automated pipelines trigger on push/PR to main/develop branches:

**Workflows:**
- `.github/workflows/backend-ci.yml` - Build & test .NET Core service
- `.github/workflows/frontend-ci.yml` - Build & test Angular app
- `.github/workflows/brain-service-ci.yml` - Build & test Node.js service
- `.github/workflows/deploy.yml` - Production deployment

**Required GitHub Secrets:**
```
DOCKER_USERNAME            # DockerHub username
DOCKER_PASSWORD            # DockerHub access token
AWS_ACCESS_KEY_ID          # AWS credentials
AWS_SECRET_ACCESS_KEY      # AWS credentials
SONAR_TOKEN                # SonarCloud for code quality
```

---

## DevOps & Infrastructure

### Architecture Highlights

- **High Availability:** Multi-AZ AWS deployment across 3 availability zones
- **Auto-Scaling:** HPA configured for CPU/memory-based scaling (2-10 replicas per service)
- **Container Registry:** Amazon ECR with image scanning and vulnerability detection
- **Database:** AWS DocumentDB (MongoDB-compatible) with automated backups
- **Monitoring:** CloudWatch logs & metrics with Prometheus (optional)
- **Security:** Pod security policies, RBAC, TLS encryption, non-root containers

### Infrastructure as Code (Terraform)

Located in `infrastructure/terraform/`:
- **main.tf:** Core AWS resources (EKS, ALB, DocumentDB)
- **networking/** module: VPC, subnets, security groups
- **kubernetes/** module: EKS cluster configuration
- **container-registry/** module: ECR setup
- **environments/:** dev.tfvars, staging.tfvars, prod.tfvars

### Kubernetes Manifests

Located in `infrastructure/kubernetes/`:
- **Deployments:** core-service, brain-service, admin-dashboard (with HPA)
- **Services:** ClusterIP for internal communication, LoadBalancer for ingress
- **ConfigMaps & Secrets:** Environment configuration and sensitive data
- **Ingress:** HTTPS routing with cert-manager integration

### Docker Images

All services use optimized multi-stage builds:

```dockerfile
# Stage 1: Build
FROM [build-image] as builder
# ...build steps...

# Stage 2: Runtime
FROM [runtime-image]
# ...runtime configuration...
```

---

## Quality Improvements Implemented

### Backend (.NET Core)
✅ **MongoClient Singleton Pooling** - Prevents connection exhaustion  
✅ **Secure API Key Generation** - Uses RandomNumberGenerator instead of predictable Random  
✅ **Tenant Validation Middleware** - Returns 403 for deleted tenants  
✅ **Service Constants Extraction** - Eliminates magic strings  
✅ **Rate Caching** - 30-minute TTL for improved performance  
✅ **Input Validation** - DataAnnotations on all DTOs  
✅ **Secure Tracking Numbers** - Cryptographic randomness  

### Frontend (Angular)
✅ **HTTP Retry Logic** - Automatic retry with exponential backoff  
✅ **Mock Data Cleanup** - Removed silent fallbacks to catch real errors  
✅ **Correlation ID Tracking** - Backend error IDs propagated to client  

### Brain Service (Node.js)
✅ **API Retry Logic** - 3 attempts with 8-second timeout and exponential backoff  

### All Services
✅ **Health Checks** - Liveness & readiness probes configured  
✅ **Resource Limits** - CPU/memory requests and limits set  
✅ **Security** - Non-root containers, read-only filesystems  

---

## Code Quality & Testing

- **SonarCloud Integration:** Automated code quality scanning on every PR
- **Unit Tests:** Backend (xUnit), Frontend (Jasmine), Node.js (Jest)
- **Type Safety:** TypeScript with strict mode enabled
- **Linting:** ESLint (Angular), Roslyn analyzers (.NET)

---

## Monitoring & Logging

- **CloudWatch:** Centralized logging for all services
- **Prometheus Scraping:** Core Service exposes `/metrics` endpoint (optional)
- **Health Endpoints:** `/health` and `/health/ready` for all services
- **Distributed Tracing:** Correlation IDs for request tracking (coming soon)

---

## Support & Documentation

- **Architecture Details:** See [infrastructure/docs/ARCHITECTURE.md](infrastructure/docs/ARCHITECTURE.md)
- **Deployment Guide:** See [infrastructure/docs/DEPLOYMENT.md](infrastructure/docs/DEPLOYMENT.md)
- **Troubleshooting:** See [infrastructure/docs/TROUBLESHOOTING.md](infrastructure/docs/TROUBLESHOOTING.md)
- **Scaling Guide:** See [infrastructure/docs/SCALING.md](infrastructure/docs/SCALING.md)

---

## License

[MIT](LICENSE)

---

*For more details, see the documentation in the `docs/` and `infrastructure/docs/` folders.*

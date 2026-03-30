# Loomis Platform Architecture

## System Overview

The Loomis platform is a microservices-based application consisting of three main services orchestrated using Kubernetes on AWS EKS. The architecture follows cloud-native best practices with focus on scalability, reliability, and security.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Internet Users                           │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         AWS Application Load Balancer (ALB)                  │
│              (Multi-AZ, SSL/TLS Termination)                │
└────────────┬────────────────────┬───────────────┬───────────┘
             │                    │               │
             ▼                    ▼               ▼
        ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
        │   Admin     │  │     API      │  │    Brain     │
        │  Dashboard  │  │   (Core)     │  │   Service    │
        │  (Angular)  │  │  (.NET Core) │  │  (Node.js)   │
        └─────────────┘  └──────────────┘  └──────────────┘
             │                    │               │
             └────────┬───────────┴───────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │   Amazon EKS Cluster                │
        │  ┌───────────────────────────────┐  │
        │  │  Managed Kubernetes Control   │  │
        │  │        Plane                  │  │
        │  └───────────────────────────────┘  │
        │  ┌──────────┬──────────┬──────────┐ │
        │  │ Node #1  │ Node #2  │ Node #3  │ │
        │  │ (t3.xl)  │ (t3.xl)  │ (t3.xl)  │ │
        │  └──────────┴──────────┴──────────┘ │
        └─────────────────────────────────────┘
             │
             ▼
        ┌─────────────────────────────────────┐
        │   Data & Storage Layer              │
        │  ┌──────────────────────────────┐   │
        │  │   MongoDB Atlas (Primary DB) │   │
        │  │   (Multi-region, encrypted)  │   │
        │  └──────────────────────────────┘   │
        │  ┌──────────────────────────────┐   │
        │  │   Redis Cache                │   │
        │  │   (Session Management)       │   │
        │  └──────────────────────────────┘   │
        │  ┌──────────────────────────────┐   │
        │  │   RDS PostgreSQL             │   │
        │  │   (Backup/Analytics)         │   │
        │  └──────────────────────────────┘   │
        └─────────────────────────────────────┘
             │
             ▼
        ┌─────────────────────────────────────┐
        │   Monitoring & Logging              │
        │  ┌──────────────────────────────┐   │
        │  │  CloudWatch Metrics          │   │
        │  │  CloudWatch Logs             │   │
        │  │  Prometheus                  │   │
        │  │  Grafana                     │   │
        │  └──────────────────────────────┘   │
        └─────────────────────────────────────┘
```

## Component Details

### 1. Admin Dashboard (Angular)
- **Framework**: Angular 21
- **Deployment**: Kubernetes Deployment (2 replicas)
- **Container**: Nginx (Alpine)
- **Port**: 80/443
- **Features**:
  - Server-side rendering optimization
  - SPA routing with client-side navigation
  - API proxying to backend services
  - Health checks and auto-healing
  - Pod anti-affinity for HA

### 2. Core Service (.NET Core)
- **Framework**: .NET Core 10
- **Deployment**: Kubernetes Deployment (3 replicas)
- **Database**: MongoDB Atlas / PostgreSQL RDS
- **Port**: 5000
- **Features**:
  - REST API with OpenAPI/Swagger
  - Request/Response validation
  - JWT-based authentication
  - Database connection pooling
  - Graceful shutdown handling
  - Horizontal Pod Autoscaler capable

### 3. Brain Service (Node.js)
- **Framework**: Express.js / TypeScript
- **Deployment**: Kubernetes Deployment (2 replicas)
- **Database**: MongoDB
- **Port**: 8000
- **Features**:
  - AI agent orchestration
  - WebSocket support
  - Async job processing
  - Connection pooling
  - Comprehensive logging
  - Metrics exposure for Prometheus

### 4. Database Layer

#### MongoDB Atlas
- **Version**: 7.0
- **Tier**: M10+ (configurable by environment)
- **Region**: Multi-region replication
- **Features**:
  - Automatic backups
  - Point-in-time recovery
  - Encryption at rest and in transit
  - Network access control
  - Atlas search capabilities

#### RDS PostgreSQL
- **Version**: 15.4
- **Instance**: db.t3.medium+ (configurable)
- **Multi-AZ**: Enabled in production
- **Features**:
  - Automated backups with 30-day retention
  - Read replicas for scaling
  - Enhanced monitoring
  - Parameter groups for optimization

#### Redis Cache
- **Version**: 7
- **Purpose**: Session management, caching
- **Deployment**: Single instance (upgradable to cluster)
- **Persistence**: AOF enabled

### 5. Networking

#### VPC Architecture
- **CIDR**: 10.0.0.0/16
- **Public Subnets**: 3 (for NAT gateways and ALB)
- **Private Subnets**: 3 (for EKS nodes)
- **Availability Zones**: 3 (AZ-distributed)

#### Load Balancing
- **ALB**: Application Load Balancer
- **Target Groups**: Auto-created for each service
- **SSL/TLS**: AWS Certificate Manager integration
- **Health Checks**: Custom paths per service

#### Security Groups
- **ALB SG**: Inbound 80, 443 from anywhere
- **EKS Cluster SG**: Inbound 443 from ALB
- **EKS Node SG**: Inbound from ALB/other pods
- **Database SG**: Inbound 27017/5432 from EKS

### 6. CI/CD Pipeline

#### GitHub Actions Workflows
1. **backend-ci.yml**: .NET build, test, security scan, ECR push
2. **frontend-ci.yml**: Angular build, test, Lighthouse, ECR push
3. **brain-service-ci.yml**: Node build, test, ECR push
4. **deploy.yml**: Production deployment with Terraform and kubectl

#### Build Artifacts
- Multi-stage Docker builds
- Layer caching for faster builds
- Image scanning with Trivy
- Artifact registry (ECR)

### 7. Observability Stack

#### Monitoring
- **Prometheus**: Metrics collection (optional addon)
- **Grafana**: Visualization dashboard
- **CloudWatch**: AWS native monitoring
- **Custom Metrics**: Application-level metrics

#### Logging
- **CloudWatch Logs**: Centralized log aggregation
- **Log Groups**: Per-service organization
- **Log Retention**: 7 days (configurable)
- **Log Insights**: Query and analysis

#### Alerting
- **CloudWatch Alarms**: Threshold-based
- **SNS Topics**: Notification routing
- **Slack Integration**: On-call notifications
- **Email Alerts**: Critical issues

## Deployment Strategy

### Rolling Updates
- **Max Unavailable**: 0 (always available)
- **Max Surge**: 1 (new pod before old removal)
- **Health Checks**: Readiness and liveness probes

### Pod Disruption Budgets
- **Core Service**: Min available 2
- **Brain Service**: Min available 1
- **Admin Dashboard**: Min available 1

### Auto-Scaling
- **HPA**: Horizontal Pod Autoscaler
- **Metrics**: CPU and memory utilization
- **Min Replicas**: 2-3 per service
- **Max Replicas**: 10 per service

## Security Model

### Network Security
- VPC isolation with private subnets
- Security group-based access control
- Network policies for pod-to-pod communication
- ALB for public endpoint protection

### Identity & Access
- IAM roles for pod authentication (IRSA)
- RBAC for Kubernetes resource access
- Service accounts per application
- Secrets Manager for credential storage

### Data Security
- Encryption at rest (KMS keys)
- Encryption in transit (TLS)
- Database access controls
- Audit logging

### Container Security
- Non-root user execution
- Read-only root filesystems
- Dropped dangerous capabilities
- Image scanning (Trivy)
- Pod security policies

## Disaster Recovery

### Backup Strategy
- **RDS**: Automated daily backups, 30-day retention
- **MongoDB**: Weekly Atlas snapshots
- **Kubernetes State**: GitOps-based (Infrastructure as Code)

### Recovery Procedures
- **RTO**: < 4 hours (infrastructure recreation)
- **RPO**: < 24 hours (data loss acceptable)
- **Failover**: Automatic in multi-AZ setup
- **Documentation**: Runbooks for manual recovery

## Cost Optimization

### Resource Management
- Right-sized instance types per phase
- Spot instances for non-critical workloads
- Reserved instances for baseline capacity
- Auto-scaling during peak demand

### Networking
- NAT Gateway consolidation
- VPC Endpoint for AWS services
- CloudFront for static assets
- Data transfer optimization

## Future Roadmap

1. **Multi-region deployment**: Active-active setup
2. **Service mesh**: Istio for advanced traffic management
3. **Serverless functions**: Lambda for event-driven tasks
4. **Database replication**: Cross-region MongoDB replica sets
5. **Advanced observability**: Distributed tracing (Jaeger), APM (DataDog)

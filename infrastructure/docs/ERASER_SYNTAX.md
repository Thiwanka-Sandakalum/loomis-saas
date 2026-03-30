# ERASER.IO ARCHITECTURE DIAGRAM SYNTAX

## Copy/Paste this into Eraser.io Editor:

Users/Internet
↓ HTTPS
AWS ALB (Application Load Balancer)
├→ Admin Dashboard (Angular 21) [Container: 1-3 replicas]
│  ├→ SPA with Tailwind CSS
│  ├→ Real-time dashboards
│  ├→ HTTP Retry Logic
│  └→ Correlation ID Tracking
│
├→ Core Service (.NET Core 10) [Container: 2-10 replicas]
│  ├→ REST API (Port 5000)
│  ├→ Controllers
│  │  ├→ Shipments Controller
│  │  ├→ Invoices Controller
│  │  ├→ Rates Controller
│  │  └→ Account Controller
│  ├→ Services Layer
│  │  ├→ Shipment Service
│  │  ├→ Rate Service (30-min cache)
│  │  ├→ Invoice Service
│  │  └→ Authentication Service
│  ├→ Tenant Validation Middleware
│  ├→ Health Endpoints (/health, /health/ready)
│  ├→ Metrics Endpoint (/metrics - Prometheus)
│  └→ Input Validation (DataAnnotations)
│
└→ Brain Service (Node.js/TypeScript) [Container: 2-5 replicas]
   ├→ Express API (Port 3001)
   ├→ AI Agents
   │  ├→ Customer Service Agent
   │  ├→ Finance Agent
   │  ├→ Routing Agent
   │  └→ Admin Agent
   ├→ Tools
   │  ├→ Booking Tool
   │  ├→ Rate Calculation Tool
   │  ├→ Payment Tool
   │  ├→ Complaint Tool
   │  ├→ Inquiry Tool
   │  ├→ Tracking Tool
   │  └→ System Stats Tool
   ├→ Background Job Queue
   │  ├→ Status Updater Jobs
   │  └→ Event Processing
   ├→ HTTP Retry Logic (3 attempts)
   └→ Health Endpoints

ALL SERVICES ↓ (Connection Pooling, Secure)

AWS DocumentDB (MongoDB-compatible) [Multi-AZ, Auto-backups]
├─ Collections
│  ├─ Shipments
│  ├─ Incidents
│  ├─ Tracking Events
│  ├─ Customers
│  ├─ Agents
│  ├─ Rates Cache
│  └─ Audit Logs
├─ Encryption (At-rest + In-transit TLS)
├─ Replication (3 AZs)
└─ Backup Policy (Daily, 30-day retention)

═══════════════════════════════════════════════════════════

## INFRASTRUCTURE AS CODE LAYER (Terraform)

AWS Region: us-east-1 (Primary) [Optional: us-west-2]
│
├─ VPC (10.0.0.0/16)
│  ├─ Public Subnets (3 AZs)
│  │  ├─ Availability Zone A (10.0.1.0/24)
│  │  ├─ Availability Zone B (10.0.2.0/24)
│  │  └─ Availability Zone C (10.0.3.0/24)
│  ├─ Private Subnets (3 AZs)
│  │  ├─ Availability Zone A (10.0.11.0/24)
│  │  ├─ Availability Zone B (10.0.12.0/24)
│  │  └─ Availability Zone C (10.0.13.0/24)
│  ├─ NAT Gateways (1 per AZ = 3 total)
│  └─ Internet Gateway
│
├─ Security Groups (Micro-segmentation)
│  ├─ ALB Security Group
│  │  ├─ Inbound: 80, 443 from Internet
│  │  └─ Outbound: All (to K8s SG)
│  ├─ EKS Node Security Group
│  │  ├─ Inbound: 5000, 3001, 3000 from ALB SG
│  │  ├─ Inbound: 10250, 53 (kubelet, DNS)
│  │  └─ Outbound: All (to DocumentDB SG)
│  └─ DocumentDB Security Group
│     ├─ Inbound: 27017 from EKS SG
│     └─ Outbound: None (database)
│
├─ EKS Cluster (Kubernetes 1.30+)
│  ├─ Control Plane (AWS managed)
│  ├─ Node Groups (3+ nodes, auto-scaling enabled)
│  │  ├─ Node Pool 1 (us-east-1a)
│  │  ├─ Node Pool 2 (us-east-1b)
│  │  └─ Node Pool 3 (us-east-1c)
│  ├─ Namespaces
│  │  ├─ loomis (Production workloads)
│  │  ├─ kube-system (System components)
│  │  └─ monitoring (Prometheus, optional)
│  ├─ RBAC (Role-based access control)
│  │  ├─ Admin Role (Infrastructure team)
│  │  ├─ Developer Role (Read-only)
│  │  └─ CI/CD Role (GitHub Actions)
│  ├─ Network Policies (Ingress/Egress)
│  ├─ Pod Security Policies
│  │  ├─ Non-root containers
│  │  ├─ Read-only root filesystem
│  │  └─ Resource quotas
│  └─ Storage (EBS volumes)
│     ├─ PersistentVolumeClaim for DocumentDB backups
│     └─ ConfigMaps for app configuration
│
├─ Application Load Balancer (ALB)
│  ├─ Listeners: 80, 443
│  ├─ Target Groups
│  │  ├─ Dashboard TG (Port 3000)
│  │  ├─ Core Service TG (Port 5000)
│  │  └─ Brain Service TG (Port 3001)
│  ├─ Routing Rules
│  │  ├─ /api/* → Core Service
│  │  ├─ /brain/* → Brain Service
│  │  └─ /* → Dashboard
│  ├─ SSL/TLS Certificate (ACM)
│  └─ Health Check Endpoints
│     ├─ /health (Dashboard)
│     ├─ /health (Core Service)
│     └─ /health (Brain Service)
│
├─ ECR (Elastic Container Registry)
│  ├─ core-service repository
│  │  ├─ Image scanning enabled
│  │  ├─ Lifecycle policy (keep 10 latest)
│  │  └─ Multi-platform builds (x86_64, arm64)
│  ├─ brain-service repository
│  └─ admin-dashboard repository
│
├─ DocumentDB Cluster
│  ├─ Master Instance (Multi-AZ)
│  ├─ Reader Replicas (1+ per AZ)
│  ├─ Backup Retention (30 days)
│  ├─ Automated Backups (Daily)
│  ├─ Parameter Groups (Optimization)
│  └─ Monitoring (CloudWatch)
│
├─ CloudWatch
│  ├─ Log Groups
│  │  ├─ /aws/eks/loomis/core-service
│  │  ├─ /aws/eks/loomis/brain-service
│  │  └─ /aws/eks/loomis/admin-dashboard
│  ├─ Metrics & Alarms
│  │  ├─ Pod CPU/Memory utilization
│  │  ├─ Request latency (p50, p95, p99)
│  │  ├─ Error rates
│  │  └─ Container restarts
│  └─ Log Retention (30 days)
│
└─ IAM Roles & Policies
   ├─ EKS Cluster Role
   ├─ EKS Node Role
   ├─ CI/CD GitHub Actions Role
   ├─ Application Pods Role (IRSA)
   └─ Encryption Keys (KMS)

═══════════════════════════════════════════════════════════

## KUBERNETES MANIFESTS LAYER

Kubernetes Cluster (loomis namespace)
│
├─ ConfigMaps
│  ├─ app-config (Environment variables)
│  ├─ database-config (Connection strings)
│  └─ logging-config (Log levels)
│
├─ Secrets
│  ├─ db-credentials
│  ├─ api-keys
│  ├─ jwt-secret
│  └─ tls-certs
│
├─ Deployments
│  ├─ core-service-deployment
│  │  ├─ Replicas: 2 (min), 10 (max)
│  │  ├─ Strategy: RollingUpdate
│  │  ├─ Health Checks (Liveness, Readiness)
│  │  ├─ Resource Limits
│  │  │  ├─ Request: CPU 500m, Memory 512Mi
│  │  │  └─ Limit: CPU 1000m, Memory 1Gi
│  │  ├─ Security Context (non-root, read-only)
│  │  ├─ Pod Disruption Budget
│  │  └─ Anti-affinity rules
│  │
│  ├─ brain-service-deployment
│  │  ├─ Replicas: 2 (min), 5 (max)
│  │  ├─ Strategy: RollingUpdate
│  │  ├─ Health Checks
│  │  ├─ Resource Limits
│  │  │  ├─ Request: CPU 500m, Memory 768Mi
│  │  │  └─ Limit: CPU 1500m, Memory 1.5Gi
│  │  ├─ Security Context
│  │  └─ Anti-affinity rules
│  │
│  └─ admin-dashboard-deployment
│     ├─ Replicas: 1 (min), 3 (max)
│     ├─ Strategy: RollingUpdate
│     ├─ Health Checks
│     ├─ Resource Limits
│     │  ├─ Request: CPU 100m, Memory 256Mi
│     │  └─ Limit: CPU 500m, Memory 512Mi
│     ├─ Security Context
│     └─ Anti-affinity rules
│
├─ Services
│  ├─ core-service-svc (ClusterIP, Port 5000)
│  ├─ brain-service-svc (ClusterIP, Port 3001)
│  ├─ admin-dashboard-svc (ClusterIP, Port 3000)
│  └─ alb-loadbalancer-svc (LoadBalancer, 80/443)
│
├─ HorizontalPodAutoscaler (HPA)
│  ├─ core-service-hpa
│  │  ├─ Target: CPU 70%, Memory 75%
│  │  ├─ Min replicas: 2
│  │  ├─ Max replicas: 10
│  │  └─ Scale-down stabilization: 300s
│  │
│  ├─ brain-service-hpa
│  │  ├─ Target: CPU 70%
│  │  ├─ Min replicas: 2
│  │  ├─ Max replicas: 5
│  │  └─ Scale-down stabilization: 300s
│  │
│  └─ admin-dashboard-hpa
│     ├─ Target: Memory 80%
│     ├─ Min replicas: 1
│     ├─ Max replicas: 3
│     └─ Scale-down stabilization: 300s
│
├─ Ingress
│  ├─ Host: loomis.example.com
│  ├─ TLS: cert-manager (Let's Encrypt)
│  ├─ Routing Rules
│  │  ├─ /api → core-service-svc
│  │  ├─ /brain → brain-service-svc
│  │  └─ / → admin-dashboard-svc
│  └─ Rate Limiting (optional)
│
├─ NetworkPolicy
│  ├─ Ingress rules (ingress-from-outside)
│  ├─ Egress rules (to DocumentDB)
│  └─ Inter-pod communication
│
├─ ResourceQuota (per namespace)
│  ├─ CPU: 20 cores
│  ├─ Memory: 40Gi
│  ├─ Pods: 100
│  └─ Persistent Volumes: 10
│
├─ Pod Disruption Budget
│  ├─ core-service: min 1 available
│  ├─ brain-service: min 1 available
│  └─ admin-dashboard: min 1 available
│
└─ ServiceAccount & RBAC
   ├─ core-service-sa (IRSA to AWS DocumentDB)
   ├─ brain-service-sa (IRSA for Job execution)
   └─ admin-dashboard-sa

═══════════════════════════════════════════════════════════

## CI/CD PIPELINES (GitHub Actions)

GitHub Repository
│
├─ Workflows (.github/workflows/)
│  │
│  ├─ backend-ci.yml (ON: push/PR to main, develop)
│  │  ├─ Trigger: .NET Core changes detected
│  │  ├─ Build
│  │  │  ├─ Checkout code
│  │  │  ├─ Setup .NET 10 SDK
│  │  │  ├─ Restore dependencies
│  │  │  └─ Build solution
│  │  ├─ Test
│  │  │  ├─ Run xUnit tests
│  │  │  ├─ Generate code coverage (Cobertura)
│  │  │  └─ Upload to SonarCloud
│  │  ├─ Quality Gate
│  │  │  ├─ SonarCloud analysis
│  │  │  ├─ Security scanning
│  │  │  └─ SAST (static analysis)
│  │  ├─ Build Docker Image
│  │  │  ├─ Multi-stage build
│  │  │  ├─ Tag: ghcr.io/loomis/core-service:${{ github.sha }}
│  │  │  └─ Tag: ghcr.io/loomis/core-service:latest (if main)
│  │  └─ Push to ECR
│  │     ├─ Login to AWS (via OIDC)
│  │     ├─ Push to ECR
│  │     └─ Image scanning enabled
│  │
│  ├─ frontend-ci.yml (ON: push/PR to main, develop)
│  │  ├─ Trigger: Angular/TypeScript changes
│  │  ├─ Setup
│  │  │  ├─ Checkout code
│  │  │  ├─ Setup Node.js 20
│  │  │  └─ Restore npm cache
│  │  ├─ Lint & Format
│  │  │  ├─ ESLint
│  │  │  ├─ Prettier
│  │  │  └─ TypeScript compiler (strict mode)
│  │  ├─ Unit Tests
│  │  │  ├─ Jasmine test suite
│  │  │  ├─ Code coverage (Istanbul)
│  │  │  └─ Upload to SonarCloud
│  │  ├─ Build
│  │  │  ├─ ng build --configuration=production
│  │  │  └─ Minification, optimization
│  │  ├─ Build Docker Image
│  │  │  ├─ Multi-stage build (Node builder → nginx runtime)
│  │  │  ├─ Serve via Nginx
│  │  │  └─ Tag: latest commit SHA
│  │  └─ Push to ECR
│  │
│  ├─ brain-service-ci.yml (ON: push/PR to main, develop)
│  │  ├─ Trigger: Node.js/TypeScript changes
│  │  ├─ Setup
│  │  │  ├─ Checkout code
│  │  │  ├─ Setup Node.js 20
│  │  │  └─ Restore npm cache
│  │  ├─ Lint & Type Check
│  │  │  ├─ ESLint
│  │  │  ├─ TypeScript compiler
│  │  │  └─ Prettier format check
│  │  ├─ Unit Tests
│  │  │  ├─ Jest test runner
│  │  │  ├─ Code coverage
│  │  │  └─ Mutation testing (optional)
│  │  ├─ SonarCloud Analysis
│  │  │  ├─ Security scan
│  │  │  ├─ Dependency audit
│  │  │  └─ Code smells detection
│  │  ├─ Build Docker Image
│  │  │  ├─ Node.js runtime
│  │  │  ├─ Non-root user
│  │  │  └─ Health check script included
│  │  └─ Push to ECR
│  │
│  ├─ deploy.yml (ON: main branch push + all CIs pass)
│  │  ├─ Prerequisites
│  │  │  ├─ All CI checks passed
│  │  │  ├─ Code quality gate satisfied
│  │  │  └─ Security scans clean
│  │  ├─ Infrastructure as Code
│  │  │  ├─ Checkout Infrastructure repo
│  │  │  ├─ Setup Terraform
│  │  │  ├─ Terraform init
│  │  │  ├─ Terraform plan (review changes)
│  │  │  ├─ Terraform apply (create/update resources)
│  │  │  └─ Store terraform state (S3 backend)
│  │  ├─ Deploy to EKS
│  │  │  ├─ Configure kubectl
│  │  │  ├─ Update Kubernetes manifests
│  │  │  │  ├─ Set new image tags
│  │  │  │  ├─ Update ConfigMaps
│  │  │  │  └─ Apply YAML manifests
│  │  │  ├─ Wait for rollout (5 min timeout)
│  │  │  ├─ Health check verification
│  │  │  └─ Smoke tests
│  │  ├─ Notifications
│  │  │  ├─ Slack notification
│  │  │  ├─ Email notification
│  │  │  └─ Deployment dashboard update
│  │  └─ Rollback Plan (Manual triggered via GitHub)
│  │
│  ├─ security-scan.yml (ON: schedule + PR)
│  │  ├─ SAST (static code analysis)
│  │  │  ├─ Semgrep rules
│  │  │  ├─ Checkmarx scan
│  │  │  └─ Advanced analysis
│  │  ├─ DAST (dynamic scanning - optional)
│  │  ├─ Dependency check
│  │  │  ├─ OWASP DependencyCheck
│  │  │  ├─ Snyk scan
│  │  │  └─ npm audit
│  │  └─ Container image scan
│  │     ├─ Trivy scan
│  │     └─ CVE check
│  │
│  └─ performance-test.yml (ON: schedule + main branch)
│     ├─ Load Testing
│     │  ├─ k6 load test
│     │  ├─ 1000 concurrent users
│     │  ├─ 5 min duration
│     │  └─ Alert if p95 latency > 500ms
│     ├─ Environmental Monitoring
│     │  ├─ Pod resource usage
│     │  ├─ Database performance
│     │  └─ Error rates
│     └─ Report Generation & Archive
│
└─ Secrets (GitHub Repository Settings)
   ├─ Docker Registry Keys
   │  ├─ DOCKER_USERNAME
   │  ├─ DOCKER_PASSWORD
   │  └─ ECR_REGISTRY
   ├─ AWS Credentials (OIDC)
   │  ├─ AWS_ACCESS_KEY_ID
   │  └─ AWS_SECRET_ACCESS_KEY
   ├─ Code Quality
   │  ├─ SONAR_TOKEN
   │  └─ SONAR_HOST_URL
   ├─ Notifications
   │  ├─ SLACK_WEBHOOK
   │  └─ EMAIL_SMTP_PASSWORD
   └─ Database
      ├─ DB_CONNECTION_STRING (dev/staging/prod)
      └─ API_KEYS (external services)

═══════════════════════════════════════════════════════════

## DATA FLOW: ORDER CREATION

User Browser (Admin Dashboard)
     ↓
   POST /api/shipments
     ↓
ALB (port 443 → 5000)
     ↓
Core Service - Controllers Layer
│ ├─ ShipmentsController.CreateShipment()
│ ├─ Validate input DTO
│ ├─ Authorization check (JWT)
│ └─ Tenant validation middleware
     ↓
Core Service - Business Logic Layer
│ ├─ TenantValidationService validates tenant
│ ├─ ShipmentService processes order
│ ├─ Calculate base rates (cache check)
│ ├─ InvoiceService generates invoice record
│ └─ Publish event (ShipmentCreated)
     ↓
Core Service - Data Layer
│ ├─ DocumentDB write (Shipments collection)
│ ├─ DocumentDB write (Invoices collection)
│ └─ Write transaction log (audit)
     ↓
Response ← 201 Created + correlation ID
     ↓
Brain Service polling / Event consuming
│ ├─ RouterAgent picks up event
│ ├─ Rate Calculation Tool
│ ├─ Optimal route determination
│ └─ Customer Service Agent
│    ├─ Sends notification email
│    ├─ Logs communication
│    └─ Updates tracking
     ↓
DocumentDB updates
│ ├─ Shipments collection (route field updated)
│ └─ Tracking Events collection
     ↓
Frontend Polling / WebSocket
│ └─ Dashboard refreshes with new status

═══════════════════════════════════════════════════════════

## SCALING SCENARIOS

Scenario 1: Black Friday Traffic Spike
├─ ALB receives 5000 req/sec (vs normal 200)
├─ HPA detects CPU > 85%
├─ Scale up replicas:
│  ├─ Core Service: 2 → 10 (15 minutes)
│  ├─ Brain Service: 2 → 5 (10 minutes)
│  └─ Dashboard: 1 → 3 (5 minutes)
├─ EKS nodes auto-scale
│  ├─ Cluster Autoscaler adds nodes (5-10 min)
│  └─ Drain/add nodes with zero downtime
└─ DocumentDB read replicas handle load via routing

Scenario 2: Resource Exhaustion
├─ Memory pressure detected
├─ Pod eviction (low priority first)
├─ PDB prevents cascading failures
├─ Kubelet graceful shutdown (30s)
├─ Alerting to ops team
└─ Scale-down after load reduces

Scenario 3: Database Performance Degradation
├─ CloudWatch alarm triggers (query latency > 500ms)
├─ DocumentDB read replicas utilized
├─ Connection pool recycled
├─ Core Service cache disabled (force refresh)
└─ Investigate long-running queries

═══════════════════════════════════════════════════════════

Note: This syntax is formatted as a hierarchical tree for clarity.
In Eraser.io, you can recreate this as:
- Components (boxes/rectangles) for each service
- Arrows/edges for data flow
- Color coding: Blue=Frontend, Green=Backend, Orange=Infrastructure
- Grouping: Use containers to group related services
- Labels: Add detailed metadata to edges (protocols, ports, etc.)

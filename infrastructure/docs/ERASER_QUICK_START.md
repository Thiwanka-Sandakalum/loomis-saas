# ERASER.IO QUICK START GUIDE

## Files Created

### 1. **eraser-diagram.txt** 
Complete DSL (Domain Specific Language) format with:
- Component definitions (boxes/containers)
- Connection flows (arrows/edges)
- Detailed metadata (ports, protocols, configurations)
- Deployment flows & scaling scenarios
- Disaster recovery scenarios

### 2. **eraser-visual-diagram.txt**
Visual ASCII format with:
- Clear hierarchical tree structure
- Easy-to-read box diagrams
- All services and their relationships
- Step-by-step data flows
- Performance targets & SLA

---

## How to Use in Eraser.io

### Method 1: Direct Import (If available)
1. Go to [eraser.io](https://www.eraser.io)
2. Click "New Diagram"
3. Copy content from `eraser-diagram.txt`
4. Paste into editor
5. Auto-format and render

### Method 2: Manual Recreation (Recommended)
Follow the visual structure in `eraser-visual-diagram.txt`:

**Step 1: Create Components (Boxes)**
```
Dashboard (Angular)     Core Service (.NET)     Brain Service (Node.js)
1-3 replicas           2-10 replicas           2-5 replicas
Port: 3000             Port: 5000              Port: 3001
```

**Step 2: Connect to ALB (Load Balancer)**
```
                    AWS ALB
                   /  |  \
                  /   |   \
         Dashboard  Core  Brain
```

**Step 3: Connect to Database**
```
All Services
    |
    v
DocumentDB (MongoDB)
```

**Step 4: Add Configuration Boxes**
```
├─ ConfigMaps (app config)
├─ Secrets (credentials)
├─ HPA (auto-scaling)
└─ Health Checks (/health)
```

**Step 5: Add Infrastructure Layer**
```
Terraform
├─ VPC & Networking
├─ EKS Cluster
├─ ECR Registry
└─ CloudWatch Monitoring
```

**Step 6: Add CI/CD Pipeline**
```
GitHub → Backend CI → Docker build → ECR
GitHub → Frontend CI → Docker build → ECR
GitHub → Brain Service CI → Docker build → ECR
        ↓
     Deploy Pipeline → Terraform → Kubernetes
```

---

## Color Coding Scheme

| Color | Component | Example |
|-------|-----------|---------|
| 🔵 Blue | Frontend | Admin Dashboard (Angular) |
| 🟢 Green | Backend Services | Core Service, Brain Service |
| 🟠 Orange | AWS Infrastructure | ALB, EKS, ECR, DocumentDB |
| 🟣 Purple | Infrastructure as Code | Terraform modules |
| ⚫ Black | CI/CD | GitHub Actions pipelines |
| 🔴 Red | Monitoring/Security | CloudWatch, Security Groups |

---

## Key Services & Their Details

### Frontend: Admin Dashboard
- **Framework**: Angular 21
- **Port**: 3000
- **Replicas**: 1-3 (auto-scaled based on memory)
- **Resources**: 256Mi-512Mi memory, 100m-500m CPU
- **Health Check**: `/health` (30s interval)

### Backend: Core Service
- **Framework**: .NET Core 10
- **Port**: 5000
- **Replicas**: 2-10 (auto-scaled based on CPU/memory)
- **Resources**: 512Mi-1Gi memory, 500m-1000m CPU
- **Endpoints**: 
  - `/health` (liveness)
  - `/health/ready` (readiness)
  - `/metrics` (Prometheus)
- **Features**: Tenant validation, JWT auth, rate caching (30-min TTL)

### AI Engine: Brain Service
- **Framework**: Node.js/TypeScript
- **Port**: 3001
- **Replicas**: 2-5 (auto-scaled based on CPU)
- **Resources**: 768Mi-1.5Gi memory, 500m-1500m CPU
- **Agents**: Customer Service, Finance, Routing, Admin
- **Tools**: Booking, Rate Calc, Payment, Tracking, etc.
- **Background Jobs**: Status updater, event processor, notifications

### Database: DocumentDB
- **Type**: MongoDB-compatible (AWS)
- **Availability**: Multi-AZ with automatic failover
- **Backups**: Daily (30-day retention)
- **Encryption**: At-rest (KMS) + In-transit (TLS)
- **Collections**: Shipments, Invoices, Tracking Events, Customers, Rates Cache

---

## Connection Types & Protocols

| Connection | Protocol | Port | Description |
|------------|----------|------|-------------|
| Users → ALB | HTTPS | 443 | Encrypted external traffic |
| ALB → Services | HTTP | 3000, 5000, 3001 | Internal load balancing |
| Services ↔ Services | gRPC/HTTP | - | Event exchange, async jobs |
| Services → DocumentDB | MongoDB | 27017 | Database driver |
| Monitoring → Services | HTTP | - | Metrics scraping (/metrics) |
| K8s → Services | HTTP | - | Health checks |

---

## Data Flow: Example Shipment Creation

```
1. User submits shipment form
   ↓
2. Dashboard: POST /api/shipments (HTTPS to ALB:443)
   ↓
3. ALB routes to Core Service (port 5000)
   ↓
4. Core Service validates & creates record
   └─ Tenant validation
   └─ JWT authentication
   └─ Input validation (DTO)
   └─ Check rate cache
   ↓
5. Write to DocumentDB
   └─ Shipments collection
   └─ Invoices collection
   └─ Audit logs
   ↓
6. Response: 201 Created + Correlation ID
   ↓
7. Brain Service async processing
   └─ Router Agent: Calculate route
   └─ Finance Agent: Verify payment
   └─ Customer Agent: Send notification
   ↓
8. Frontend polling
   └─ GET /api/shipments/{id}
   └─ Dashboard updates with status
```

---

## Scaling Scenario: Black Friday

```
Normal Load:        200 req/sec
Black Friday:       5,000 req/sec (25x increase)

Timeline:
├─ T+0s:   ALB receives spike
├─ T+30s:  HPA detects CPU > 85%
├─ T+60s:  Scale Core Service: 2 → 10 replicas
├─ T+90s:  Scale Brain Service: 2 → 5 replicas
├─ T+120s: Scale Dashboard: 1 → 3 replicas
├─ T+5m:   Cluster Autoscaler adds EKS nodes
├─ T+10m:  All new pods running
└─ T+15m:  System handles peak at p95 latency < 300ms
```

---

## Creating Components in Eraser.io

### Box/Container Component
```
Name: Dashboard
Type: Service
Properties:
├─ Label: "Admin Dashboard (Angular 21)"
├─ Port: 3000
├─ Replicas: 1-3
├─ Memory: 256Mi-512Mi
├─ CPU: 100m-500m
└─ Color: Blue
```

### Connection/Edge
```
From: ALB
To: Dashboard
Label: "Port 3000 - HTTP"
Protocol: HTTP
Type: Routing
```

### Container/Grouping
```
Name: KubernetesCluster
Type: Container
Contains:
├─ Dashboard
├─ CoreService
├─ BrainService
└─ Add HPA, ConfigMaps, Secrets
Color: Orange border
```

---

## Performance & Reliability Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response Time (p95) | <200ms | >500ms |
| Dashboard Load Time | <2s | >3s |
| Uptime SLA | 99.9% | Any outage |
| Pod CPU Utilization | <70% | >80% trigger scale-up |
| Pod Memory Utilization | <75% | >85% trigger scale-up |
| Error Rate | <1% | >5% alert |
| Container Restart | 0 | Any restart alert |
| Database Query Latency | <100ms | >300ms |

---

## Auto-Scaling Thresholds

**Dashboard (1-3 replicas)**
- Trigger: Memory > 80%
- Scale-up: Add 1 replica
- Scale-down delay: 300 seconds
- Min replicas: 1
- Max replicas: 3

**Core Service (2-10 replicas)**
- Trigger: CPU > 70% OR Memory > 75%
- Scale-up: Add 2 replicas
- Scale-down delay: 300 seconds
- Min replicas: 2
- Max replicas: 10

**Brain Service (2-5 replicas)**
- Trigger: CPU > 70%
- Scale-up: Add 1 replica
- Scale-down delay: 300 seconds
- Min replicas: 2
- Max replicas: 5

---

## Network Architecture

```
Internet
   ↓ (HTTPS:443)
AWS ALB (Multi-AZ)
   ├─ Target Group 1: Dashboard (port 3000)
   ├─ Target Group 2: Core Service (port 5000)
   └─ Target Group 3: Brain Service (port 3001)
   ↓ (HTTP, internal)
Kubernetes Cluster (3 AZs)
   └─ All services in loomis namespace
   ↓ (MongoDB protocol)
DocumentDB (Multi-AZ replicas)
```

---

## Security Model

```
Pod Security:
├─ Run as non-root user
├─ Read-only root filesystem
├─ Resource limits enforced
└─ Network policies: strict ingress/egress

Network:
├─ ALB → Services: Port-specific
├─ Services ↔ DB: Only authenticated
└─ External: HTTPS only

Secrets Management:
├─ K8s Secrets (encrypted)
├─ Environment variables
└─ IRSA (IAM Roles for Service Accounts)

API Security:
├─ JWT authentication
├─ Tenant validation
├─ Correlation IDs
└─ Cryptographic API key generation
```

---

## Disaster Recovery

```
Failure: Database goes down
├─ T+0s: DocumentDB detects primary failure
├─ T+5s: Automatic failover initiates
├─ T+15s: Reader replica promoted to primary
├─ T+30s: Replication resync complete
├─ T+60s: Services reconnection successful
└─ Impact: <1 minute downtime, no data loss

Failure: Kubernetes node crash
├─ T+0s: Kubelet health check fails
├─ T+30s: CloudWatch alarm triggered
├─ T+60s: Pod eviction (graceful: 30s + force 5s)
├─ T+90s: New node provisioned by autoscaler
└─ Impact: <2-3 minutes per pod

Failure: Service crash
├─ T+0s: Liveness probe fails (3 failures)
├─ T+60s: Pod killed and restarted
├─ T+90s: New instance running with original volume
└─ Impact: <90 seconds per pod
```

---

## Monitoring Endpoints

```
Core Service:
├─ GET /health - Liveness probe
├─ GET /health/ready - Readiness probe
└─ GET /metrics - Prometheus metrics

Brain Service:
├─ GET /health - Liveness probe
└─ GET /health/ready - Readiness probe

Dashboard:
└─ GET /health - Liveness probe

CloudWatch Logs:
├─ /aws/eks/loomis/core-service
├─ /aws/eks/loomis/brain-service
└─ /aws/eks/loomis/admin-dashboard
```

---

## Tips for Eraser.io Diagram

1. **Use Containers**: Group related services (e.g., all Kubernetes components in one container)
2. **Color Zones**: Use background colors for layers (frontend=blue, backend=green, infra=orange)
3. **Label Connections**: Add port numbers and protocols on arrows
4. **Add Legends**: Include color coding reference
5. **Use Icons**: Leverage service-specific icons (AWS logos, Kubernetes logo, etc.)
6. **Add Notes**: Attach documentation boxes with SLA/target metrics
7. **Version Control**: Export diagram as code/JSON for Git tracking
8. **Share**: Export as image (PNG/SVG) or URL for presentations

---

## Next Steps

1. Open Eraser.io
2. Follow the structure in `eraser-visual-diagram.txt`
3. Create components as described above
4. Add connections with appropriate labels
5. Color-code by layer/type
6. Add monitoring and alerts boxes
7. Test with deployment scenarios
8. Export as image or keep in Eraser for live reference

For detailed architecture explanations, see:
- `/infrastructure/docs/ARCHITECTURE.eraser` - Full architecture details
- `/infrastructure/docs/ERASER_SYNTAX.md` - Hierarchical structure
- `/README.md` - Project overview

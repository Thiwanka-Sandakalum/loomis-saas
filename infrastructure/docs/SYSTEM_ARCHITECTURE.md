# Loomis System Architecture - Azure Native

## Architecture Diagram (Eraser.io Syntax)

```eraser
// ============================================
// LOOMIS COURIER SYSTEM ARCHITECTURE
// Azure Native Implementation
// ============================================

// ============================================
// EXTERNAL LAYER
// ============================================
[Internet Users] |http/https| [Azure Front Door]

// ============================================
// API GATEWAY & LOAD BALANCING
// ============================================
[Azure Front Door] |routes & global load balancing|
[Azure Front Door] --> [Azure Application Gateway]
[Azure Application Gateway] |SSL termination & routing| 
[Azure Application Gateway] --> [Azure Load Balancer]

// ============================================
// PRESENTATION LAYER
// ============================================
[Azure Load Balancer] --> [Admin Dashboard Container]
  [Admin Dashboard Container]
    - Angular 21 Frontend
    - Responsive UI (dashboard, shipments, rates)
    - Client-side caching (localStorage)

[Azure Load Balancer] --> [Azure CDN]
  [Azure CDN]
    - Static assets caching
    - Images, stylesheets, JavaScript

// ============================================
// AUTHENTICATION & AUTHORIZATION
// ============================================
[Admin Dashboard Container] |OAUTH2/OIDC| [Azure AD B2C]
[Core Service API] |JWT validation| [Azure AD B2C]
[Brain Service] |Service-to-Service Auth| [Azure AD B2C]

[Azure AD B2C]
  - User identity & access management
  - Role-based access control (RBAC)
  - Multi-factor authentication support
  - Tenant isolation

// ============================================
// API GATEWAY LAYER
// ============================================
[Azure Application Gateway] --> [Azure API Management]

[Azure API Management]
  - API versioning (v1, v2)
  - Rate limiting & throttling
  - API key management
  - Developer portal
  - Request/response transformation
  - CORS policy enforcement

// ============================================
// MICROSERVICES LAYER
// ============================================

// Core Service (.NET)
[Azure API Management] --> [Core Service - Container Instance 1]
[Azure API Management] --> [Core Service - Container Instance 2]
[Azure API Management] --> [Core Service - Container Instance 3]

[Core Service - Container Instance 1,2,3]
  - Shipment Management
  - Rate Calculation
  - Booking Management
  - Complaint Handling
  - Tracking Information
  - Status Updates
  - API Endpoints:
    * POST /api/v1/shipments
    * GET /api/v1/shipments/{id}
    * POST /api/v1/rates/calculate
    * POST /api/v1/bookings
    * PUT /api/v1/complaints/{id}

// Brain Service (Node.js)
[Azure API Management] --> [Brain Service - Container Instance 1]
[Azure API Management] --> [Brain Service - Container Instance 2]

[Brain Service - Container Instance 1,2]
  - Customer Service Agent
  - Finance Agent
  - Admin Agent
  - Router Agent
  - LLM Integration (Azure OpenAI)
  - Tool Execution Engine
  - Background Job Processing
  - API Endpoints:
    * POST /api/agent/chat
    * POST /api/agent/process-inquiry
    * GET /api/agent/status

// ============================================
// MESSAGE QUEUE & ASYNC PROCESSING
// ============================================

[Core Service - Container Instance 1,2,3] |publish events| [Azure Service Bus]
[Brain Service - Container Instance 1,2] |publish events| [Azure Service Bus]

[Azure Service Bus]
  - Shipment created events
  - Status update events
  - Complaint filed events
  - Payment processed events
  - Inquiry received events
  - Topics: shipments, payments, inquiries, tracking

[Azure Service Bus] |consume events| [Background Job Processor]
[Azure Service Bus] |consume events| [Status Update Worker]

[Background Job Processor]
  - Process async tasks
  - Cleanup operations
  - Report generation
  - Batch processing

[Status Update Worker]
  - Update shipment status
  - Send notifications
  - Trigger webhooks
  - Update client dashboards

// ============================================
// CACHING LAYER
// ============================================

[Admin Dashboard Container] |cache queries| [Azure Cache for Redis]
[Core Service - Container Instance 1,2,3] |cache rates, shipments| [Azure Cache for Redis]
[Brain Service - Container Instance 1,2] |cache agent state| [Azure Cache for Redis]

[Azure Cache for Redis]
  - TTL: 30 min (rates), 1 hour (shipments)
  - Session storage
  - Distributed locking
  - Real-time data caching
  - 6GB cluster with replication

// ============================================
// DATA PERSISTENCE LAYER
// ============================================

[Core Service - Container Instance 1,2,3] |read/write data| [Azure Cosmos DB]
[Brain Service - Container Instance 1,2] |read/write data| [Azure Cosmos DB]
[Background Job Processor] |read/write data| [Azure Cosmos DB]
[Status Update Worker] |read/write data| [Azure Cosmos DB]

[Azure Cosmos DB]
  - Collections:
    * shipments (partition key: senderId)
    * rates (partition key: origin)
    * bookings (partition key: customerId)
    * complaints (partition key: shipmentId)
    * inquiries (partition key: customerId)
    * users (partition key: tenantId)
    * tenants (partition key: tenantId)
    * payments (partition key: customerId)
    * audit_logs (partition key: timestamp)
  - RU/s: 10,000 (auto-scale)
  - Backup: Continuous, 30-day retention
  - Multi-region replication (optional)

// ============================================
// AI/ML SERVICES
// ============================================

[Brain Service - Container Instance 1,2] |API calls| [Azure OpenAI Service]
[Brain Service - Container Instance 1,2] |embedding & search| [Azure Cognitive Search]

[Azure OpenAI Service]
  - GPT-4 model
  - Prompt engineering
  - Agent orchestration
  - Context window: 8K tokens
  - Rate limiting: 90K TPM

[Azure Cognitive Search]
  - Full-text search
  - Semantic search
  - Indexing shipments & documents
  - Vector search (future)

// ============================================
// FILE STORAGE
// ============================================

[Core Service - Container Instance 1,2,3] |upload/download files| [Azure Blob Storage]
[Admin Dashboard Container] |download files| [Azure Blob Storage]

[Azure Blob Storage]
  - Containers:
    * documents (invoices, labels)
    * reports (analytics, exports)
    * attachments (complaint files)
  - Access tier: Hot (immediate access)
  - Backup: Geo-redundant storage (GRS)

// ============================================
// MONITORING & LOGGING
// ============================================

[Core Service - Container Instance 1,2,3] |logs & metrics| [Application Insights]
[Brain Service - Container Instance 1,2] |logs & metrics| [Application Insights]
[Background Job Processor] |logs & metrics| [Application Insights]
[Admin Dashboard Container] |performance metrics| [Application Insights]

[Application Insights]
  - Real-time monitoring
  - Performance tracking
  - Exception tracking
  - Dependency mapping
  - Custom events
  - Request tracing
  - Correlation IDs

[Application Insights] --> [Azure Log Analytics]

[Azure Log Analytics]
  - Centralized logging
  - KQL queries
  - Alerts & anomaly detection
  - Retention: 30 days

// ============================================
// ALERTING & NOTIFICATIONS
// ============================================

[Application Insights] |triggers alerts| [Azure Alert Management]
[Azure Cosmos DB] |quota alerts| [Azure Alert Management]
[Azure Service Bus] |dead letter alerts| [Azure Alert Management]

[Azure Alert Management] --> [Azure Action Groups]

[Azure Action Groups]
  - Email notifications
  - SMS alerts
  - Slack webhooks
  - PagerDuty integration
  - Runbooks (optional)

// ============================================
// CONTAINER ORCHESTRATION
// ============================================

All services |deployed to| [Azure Container Instances]
OR
All services |deployed to| [Azure Kubernetes Service (AKS)]

[Azure Container Registry]
  - Store container images
  - Image scanning
  - Vulnerability detection
  - Webhook triggers to CI/CD

// ============================================
// BACKUP & DISASTER RECOVERY
// ============================================

[Azure Cosmos DB] |automated backup| [Azure Backup]
[Azure Blob Storage] |geo-redundant backup| [Backup Service]

[Backup Service]
  - Cross-region redundancy
  - Point-in-time recovery
  - RPO: < 5 minutes
  - RTO: < 15 minutes

// ============================================
// COMMUNICATION FLOW EXAMPLES
// ============================================

// Example 1: Create Shipment Flow
[Client] --> [Admin Dashboard]
[Admin Dashboard] --> [Azure API Management]
[Azure API Management] --> [Core Service API]
[Core Service API] --> [Azure Cosmos DB] (store shipment)
[Core Service API] --> [Azure Service Bus] (publish: shipment.created)
[Core Service API] <-- [Admin Dashboard]
[Azure Service Bus] --> [Brain Service] (subscribe)
[Brain Service] --> [Azure OpenAI Service] (analyze shipment)
[Brain Service] --> [Azure Cosmos DB] (store analysis)

// Example 2: Calculate Rate
[Client] --> [Admin Dashboard]
[Admin Dashboard] --> [Azure Cache for Redis] (check cache)
[If miss in cache]:
  [Azure Cache for Redis] --> [Core Service API] (fetch rate)
  [Core Service API] --> [Azure Cosmos DB] (query rates)
  [Core Service API] --> [Azure Cache for Redis] (store with TTL: 30 min)
[Azure Cache for Redis] --> [Admin Dashboard] (return rate)

// Example 3: Process Inquiry
[Client] --> [Admin Dashboard]
[Admin Dashboard] --> [Azure API Management]
[Azure API Management] --> [Brain Service]
[Brain Service] --> [Azure OpenAI Service] (process inquiry)
[Brain Service] --> [Azure Cognitive Search] (search knowledge base)
[Brain Service] --> [Core Service API] (fetch related data)
[Brain Service] --> [Azure Service Bus] (publish: inquiry.processed)
[Brain Service] --> [Azure Cosmos DB] (store inquiry & response)
[Notification Service] |subscribes| [Azure Service Bus]
[Notification Service] --> [Azure Communication Services] (send email/SMS)

// ============================================
// SCALABILITY & HIGH AVAILABILITY
// ============================================

[Azure Application Gateway]
  - Scale: Automatic (multiple instances)
  - Health probes: Every 30 seconds

[Core Service - Container Instances]
  - Replicas: Auto-scale 2-10 based on CPU > 70%
  - Liveness probe: /health
  - Readiness probe: /health/ready

[Brain Service - Container Instances]
  - Replicas: Auto-scale 1-5 based on message queue length
  - Liveness probe: /health
  - Readiness probe: /health/ready

[Azure Cosmos DB]
  - Multi-region replication
  - Auto-failover regions
  - Throughput: Auto-scale 4,000-40,000 RU/s

[Azure Service Bus]
  - Premium tier for redundancy
  - Geo-disaster recovery enabled
  - Auto-forward to secondary region

// ============================================
// SECURITY & COMPLIANCE
// ============================================

[Network Security]
  - Azure Virtual Network (VNet)
  - Network Security Groups (NSG)
  - Azure Firewall
  - DDoS Protection Standard

[Data Security]
  - Encryption at rest (Azure managed keys)
  - Encryption in transit (TLS 1.3)
  - Azure Key Vault for secrets
  - Row-level security at DB level

[Access Control]
  - Azure AD B2C for authentication
  - RBAC for authorization
  - Service principals for service-to-service
  - API Management key-based access

[Compliance]
  - Azure Policy enforcement
  - Audit logging in Azure Cosmos DB
  - Compliance Manager tracking
  - Data residency: US-East (configurable)

// ============================================
// COST OPTIMIZATION
// ============================================

[Azure Reservations]
  - Reserved instances (1-year): 25% savings
  - Reserved capacity: Cosmos DB

[Azure Spot Instances]
  - Non-critical background jobs
  - Up to 90% discount

[Auto-scaling]
  - Scale down during off-peak hours
  - Based on CPU/memory metrics

[Caching Strategy]
  - 30-min TTL reduces DB queries
  - Estimated 40% cost reduction

// ============================================
// END OF ARCHITECTURE
// ============================================
```

---

## Component Summary

| Component | Service Type | Purpose | Scale |
|-----------|-------------|---------|-------|
| **Admin Dashboard** | Web Application | User interface for all operations | 2-4 instances |
| **Core Service API** | REST API | Business logic & data management | 2-10 instances (auto-scale) |
| **Brain Service** | AI Agent Service | Intelligent inquiry processing & routing | 1-5 instances (auto-scale) |
| **Azure Cosmos DB** | NoSQL Database | Primary data store | 10K-40K RU/s (auto-scale) |
| **Azure Cache for Redis** | In-Memory Cache | Performance optimization | 6GB cluster |
| **Azure Service Bus** | Message Queue | Async event processing | Premium tier |
| **Azure OpenAI** | AI/ML Service | LLM inference | 90K TPM quota |
| **Azure Cognitive Search** | Search Service | Full-text & semantic search | Standard tier |
| **Azure Blob Storage** | Object Storage | File storage (documents, reports) | Hot tier |
| **Application Insights** | Monitoring | Performance & error tracking | Unlimited |
| **Azure AD B2C** | Identity Provider | Authentication & authorization | Unlimited |
| **Azure API Management** | API Gateway | API versioning & rate limiting | Dedicated tier |

---

## Communication Protocols

| From | To | Protocol | Frequency |
|------|----|-----------|----|
| Dashboard | API Gateway | HTTPS/REST | Per user action |
| Core Service | Brain Service | HTTPS/REST | Event-driven |
| Core Service | Cosmos DB | TCP | Sequential reads/writes |
| Brain Service | Azure OpenAI | HTTPS/REST | On inquiry received |
| Services | Service Bus | HTTPS/AMQP | Event publication |
| Services | Redis Cache | TCP | Query optimization |
| All Services | App Insights | HTTPS | Continuous logging |

---

## Data Flow Patterns

### 1. **Synchronous (Request-Response)**
```
Client → Dashboard → API Gateway → Core Service → Cosmos DB
         ← Dashboard ← API Management ← Core Service ← Database
```

### 2. **Asynchronous (Event-Driven)**
```
Core Service → Service Bus → Brain Service
Brain Service → Service Bus → Status Update Worker
Status Update Worker → Notification Service → User
```

### 3. **Caching Pattern**
```
Client → Dashboard → Cache Check (Redis)
         If Miss: → Core Service → Database → Cache [TTL 30min] → Dashboard
         If Hit: → Dashboard (no DB call)
```

### 4. **AI Processing Pattern**
```
Inquiry → Brain Service → Azure OpenAI (analysis)
                       → Cognitive Search (knowledge base)
                       → Core Service (data retrieval)
                       → Cosmos DB (store result) → Notification
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│           Azure Subscription                         │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Resource Group: loomis-prod                │    │
│  ├─────────────────────────────────────────────┤    │
│  │                                               │    │
│  │  ┌─────────────────────────────────────┐    │    │
│  │  │ Networking                          │    │    │
│  │  ├─────────────────────────────────────┤    │    │
│  │  │ • VNet (10.0.0.0/16)               │    │    │
│  │  │ • Subnets: Frontend, Backend, Data │    │    │
│  │  │ • NSGs & Firewall Rules            │    │    │
│  │  │ • Front Door & Load Balancer       │    │    │
│  │  └─────────────────────────────────────┘    │    │
│  │                                               │    │
│  │  ┌─────────────────────────────────────┐    │    │
│  │  │ Compute                             │    │    │
│  │  ├─────────────────────────────────────┤    │    │
│  │  │ • ACI/AKS: Core Service             │    │    │
│  │  │ • ACI/AKS: Brain Service            │    │    │
│  │  │ • Static App Service: Dashboard     │    │    │
│  │  │ • Container Registry: Images        │    │    │
│  │  └─────────────────────────────────────┘    │    │
│  │                                               │    │
│  │  ┌─────────────────────────────────────┐    │    │
│  │  │ Data                                │    │    │
│  │  ├─────────────────────────────────────┤    │    │
│  │  │ • Cosmos DB: Collections            │    │    │
│  │  │ • Redis Cache: Cluster              │    │    │
│  │  │ • Blob Storage: Documents           │    │    │
│  │  │ • Key Vault: Secrets                │    │    │
│  │  └─────────────────────────────────────┘    │    │
│  │                                               │    │
│  │  ┌─────────────────────────────────────┐    │    │
│  │  │ Integration                         │    │    │
│  │  ├─────────────────────────────────────┤    │    │
│  │  │ • Service Bus: Message Broker       │    │    │
│  │  │ • API Management: Gateway            │    │    │
│  │  │ • Cognitive Search: Indexing        │    │    │
│  │  │ • OpenAI Service: LLM               │    │    │
│  │  └─────────────────────────────────────┘    │    │
│  │                                               │    │
│  │  ┌─────────────────────────────────────┐    │    │
│  │  │ Monitoring & Security               │    │    │
│  │  ├─────────────────────────────────────┤    │    │
│  │  │ • Application Insights: Telemetry   │    │    │
│  │  │ • Log Analytics: Centralized Logs   │    │    │
│  │  │ • AD B2C: Identity Management       │    │    │
│  │  │ • Backup: Disaster Recovery         │    │    │
│  │  └─────────────────────────────────────┘    │    │
│  │                                               │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## Service Dependencies Map

```
┌─ Admin Dashboard (Frontend)
│   ├─ Depends on: Azure AD B2C (auth)
│   ├─ Depends on: API Management (API routing)
│   ├─ Depends on: Redis Cache (session/data)
│   └─ Reports to: Application Insights
│
├─ Core Service API (.NET)
│   ├─ Depends on: Azure AD B2C (JWT validation)
│   ├─ Depends on: Cosmos DB (data)
│   ├─ Depends on: Redis Cache (caching)
│   ├─ Publishes to: Service Bus (events)
│   ├─ Reports to: Application Insights
│   └─ Stores files in: Blob Storage
│
├─ Brain Service (Node.js)
│   ├─ Depends on: Azure AD B2C (auth)
│   ├─ Depends on: Core Service API (data)
│   ├─ Depends on: Azure OpenAI (LLM)
│   ├─ Depends on: Cognitive Search (search)
│   ├─ Depends on: Cosmos DB (persistence)
│   ├─ Subscribes from: Service Bus (events)
│   ├─ Publishes to: Service Bus (events)
│   └─ Reports to: Application Insights
│
├─ Background Processors
│   ├─ Depend on: Service Bus (event subscription)
│   ├─ Depend on: Cosmos DB (read/write)
│   ├─ Depend on: Redis Cache (locking)
│   └─ Report to: Application Insights
│
└─ Notification Service (Optional)
    ├─ Subscribes from: Service Bus
    ├─ Uses: Azure Communication Services (email/SMS)
    └─ Reports to: Application Insights
```

---

## Azure Services Summary

| Service | Tier | Purpose | Redundancy |
|---------|------|---------|-----------|
| **App Service** | Standard B2/B3 | Host Admin Dashboard | 2+ instances, multi-region |
| **Cosmos DB** | Provisioned 10K RU/s | Primary database | Multi-region, auto-failover |
| **Cache for Redis** | Premium 6GB | Performance layer | Cluster with replication |
| **Service Bus** | Premium | Async messaging | Geo-DR enabled |
| **API Management** | Developer/Premium | API gateway | Multi-region (Premium) |
| **Application Insights** | Pay-as-you-go | Monitoring | Automatic retention |
| **Container Registry** | Standard | Image storage | Geo-replication |
| **Key Vault** | Standard | Secret management | Soft-delete enabled |
| **AD B2C** | Free tier | Identity | Unlimited users |
| **OpenAI Service** | Standard | LLM access | Regional deployment |
| **Cognitive Search** | Standard | Search indexing | Replicas for HA |
| **Blob Storage** | Hot tier | File storage | LRS/GRS options |
| **Front Door** | Premium | Global load balancing | Multi-region |
| **Load Balancer** | Standard | Internal balancing | Zone-redundant |

---

**Last Updated:** March 2026  
**Architecture Version:** 2.0 (Azure Native)

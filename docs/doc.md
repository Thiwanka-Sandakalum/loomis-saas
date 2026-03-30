# **LOOMIS - Complete Software Architecture Analysis**

## **Executive Summary**

Loomis is a cutting-edge **SaaS platform for courier and logistics management** built with a **microservices architecture** and **AI-powered automation**. The system implements a three-tier backend structure (Node.js AI service, .NET Core API, and MongoDB database) combined with a modern Angular SPA frontend. The architecture leverages Google's Agentic AI SDK for specialized agents that handle customer inquiries, shipment booking, tracking, payments, and system monitoring.

---

## **1. SYSTEM ARCHITECTURE OVERVIEW**

### **1.1 Core Components Stack**

```
┌─────────────────────────────────────────────────────────────────┐
│                          END USERS                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    ANGULAR SPA FRONTEND                         │
│         admin-dashboard (Angular 21, TypeScript 5.9)            │
│  - Role-Based Dashboard, Multi-tenant Support                   │
│  - Feature Modules: Shipments, Rates, Integrations              │
│  - Auth0 Integration with JWT                                   │
│  - Tailwind CSS, Chart.js for visualizations                    │
└─────────────────────────────────────────────────────────────────┘
                    ↙                    ↘
┌──────────────────────────────┐  ┌──────────────────────────────┐
│   AI AGENT SERVICE           │  │  .NET CORE API SERVICE       │
│ (Node.js/TypeScript - brain  │  │ (C# .NET 10 - core-service)  │
│  service)                    │  │                              │
│ - Intent Router Agent        │  │ - Business Logic Layer       │
│ - 6 Specialized Agents       │  │ - Multi-tenant Context       │
│ - Google Agentic AI SDK      │  │ - Repository Pattern         │
│ - MongoDB Memory Service     │  │ - Auth0 Integration          │
│ - Express.js API Server      │  │ - Swagger/OpenAPI Docs       │
└──────────────────────────────┘  └──────────────────────────────┘
                 ↓                           ↓
         ┌───────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│                  MONGODB DATABASE                               │
│          (MongoDB 8.0 Atlas / Docker Compose)                   │
│  - Collections: Tenants, Shipments, Rates, Payments, etc.       │
│  - Multi-tenant Isolation via TenantId                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## **2. FRONTEND ARCHITECTURE (admin-dashboard)**

### **2.1 Angular Application Structure**

```
src/app/
├── app.ts
│   └── OnboardingStatusService + Auth0 integration
│   └── Route-based loading with auth guards
│
├── core/
│   ├── api-client/          (Generated OpenAPI client)
│   ├── auth/                (Auth0 service with jwt interception)
│   ├── guards/              (authGuard - protects routes)
│   ├── interceptors/        (HTTP + JWT auth handlers)
│   ├── models/              (Generated TypeScript models)
│   └── services/            (Brain API, Onboarding Status services)
│
├── features/
│   ├── auth/                (Login component)
│   ├── dashboard/           (KPI cards, charts, inquiries)
│   ├── shipments/           (Create, List, Track, Detail views)
│   ├── rates/               (Create, Update, Delete rates)
│   ├── inquiries/           (Customer inquiry management)
│   ├── integrations/        (Telegram setup/configuration)
│   ├── settings/            (Tenant settings, company profile)
│   ├── ai-agent/            (Agent sandbox for testing)
│   └── onboarding/          (Company setup, service rates flow)
│
└── shared/
    ├── components/          (Layout, Preloader, Charts)
    └── pipes/               (TimeAgo, Markdown formatting)
```

### **2.2 Authentication Flow**

- **Auth Provider**: Auth0 (OIDC/OAuth2)
- **Token Storage**: JWT Token stored securely
- **Request Interceptor**: Auto-attaches Authorization header
- **Tenant Resolution**: Auth0 user ID → TenantUser lookup → TenantId context
- **Route Protection**: `authGuard` prevents unauthorized access

### **2.3 Feature Modules Overview**

| Feature | Purpose | Key Components |
|---------|---------|-----------------|
| **Dashboard** | Real-time KPIs, urgent inquiries, business metrics | KPI Cards, Line/Pie Charts, Status indicators |
| **Shipments** | Create, track, manage shipments | Create wizard, tracking, detail view |
| **Rates** | Configure pricing by service type | CRUD for Standard/Express/Overnight rates |
| **Integrations** | Connect external services (Telegram) | Setup wizard, webhook configuration |
| **AI Agent Sandbox** | Test AI agent with conversation UI | Chat interface, scenario templates |

---

## **3. AI SERVICE ARCHITECTURE (brain-service)**

### **3.1 Agent-Based Design Pattern**

The brain-service implements a **hierarchical agent architecture** using Google's Agentic AI SDK (ADK):

```
┌────────────────────────────────────────────┐
│     Intent Router Agent (Gemini 2.5)       │
│  - Analyzes user intent                     │
│  - Routes to specialized agents             │
│  - Never answers directly                   │
└────────────────────────────────────────────┘
           ↙  ↓  ↘  ↘  ↙  ↖
    ┌─────┴──┴──┴──┴──┴────┬──────────┐
    ↓        ↓       ↓      ↓         ↓
┌────────┐┌────────┐┌──────┐┌──────┐┌─────────┐┌─────────┐
│Shipment││Tracking││Support││Finance││Admin   ││Customer │
│Agent   ││Agent   ││Agent  ││Agent  ││Agent   ││Agent    │
│        ││        ││       ││       ││        ││ (unused)│
└────────┘└────────┘└──────┘└──────┘└─────────┘└─────────┘
```

### **3.2 Agent Specifications**

**Intent Router Agent** (routerAgent.ts)
- **Model**: Gemini 2.5 Flash Lite
- **Purpose**: Entry point; parses user intent, delegates to specialized agents
- **Strategy**: Rule-based routing with keyword matching
- **Sub-agents**: All 6 specialized agents

**1. Shipment Agent** (shipmentAgent.ts)
- **Tools**: `create_shipment`, `calculate_shipping_rate`
- **Purpose**: Handle shipment bookings and rate quotes
- **Smart Features**:
  - Auto-infer country from city names (New York → USA, London → UK)
  - Auto-convert weight units (lbs ↔ kg)
  - Provide preset package dimensions
  - Immediate rate calculation once weight + service type provided

**2. Tracking Agent** (trackingAgent.ts)
- **Tool**: `track_shipment`
- **Purpose**: Retrieve shipment status by tracking number
- **Returns**: Shipment data (status, location, estimated delivery)

**3. Support Agent** (supportAgent.ts)
- **Tools**: `handle_inquiry`, `create_complaint`
- **Purpose**: Customer support and complaint management
- **Capabilities**:
  - Answer FAQ about services, pricing, schedules
  - Log customer complaints with detailed context

**4. Finance Agent** (financeAgent.ts)
- **Tool**: `process_payment`
- **Purpose**: Payment processing and financial records
- **Returns**: Receipt ID and payment confirmation

**5. Admin Agent** (adminAgent.ts)
- **Tool**: `get_system_stats`
- **Purpose**: System monitoring and reporting
- **Returns**: Dashboard overview, shipment counts, revenue metrics

### **3.3 Tool System**

Each tool is a **FunctionTool** that bridges the LLM with backend APIs:

| Tool | Agent | API Endpoint | Parameters |
|------|-------|-------------|-----------|
| `create_shipment` | Shipment | `/api/ai/shipments/create` | Sender, Receiver, Parcel, ServiceType |
| `calculate_shipping_rate` | Shipment | `/api/ai/rates/inquiry` | Weight, Dimensions, ServiceType, Origin, Destination |
| `track_shipment` | Tracking | `/api/ai/shipments/tracking/{trackingNumber}` | TrackingNumber |
| `handle_inquiry` | Support/Customer | MongoDB knowledge_base | Topic (Services, Pricing, Schedules, Rates) |
| `create_complaint` | Support | `/api/ai/complaints/file` | TrackingNumber, ComplaintType, Description |
| `process_payment` | Finance | `/api/ai/payments/process` | TrackingNumber, Amount, Method |
| `get_system_stats` | Admin | `/api/ai/dashboard/overview` | (None) |

### **3.4 Memory System**

**MongoMemoryService** (MongoMemoryService.ts)
- Stores conversation sessions in MongoDB collection: `memories`
- Enables persistent context across conversations
- Methods:
  - `addSessionToMemory()`: Store session data
  - `searchMemory()`: Retrieve relevant past interactions

### **3.5 Infrastructure Layer** (`src/infra/`)

**Database Connection** (connection.ts)
- MongoDB Atlas connection with ServerAPI v1
- Automatic database initialization and seeding
- Collections initialized:
  - `knowledge_base`: FAQ content
  - `courier_rates`: Service rate templates
  - `package_types`: Predefined package dimensions

**API Client** (apiClient.ts)
- Singleton HTTP client for Core Service communication
- Base URL: `CORE_API_URL` (default: `http://localhost:5000`)
- API Key support via `X-API-KEY` header
- Methods: `createShipment()`, `trackShipment()`, `inquireRate()`, `fileComplaint()`, `processPayment()`, `getDashboardOverview()`

---

## **4. CORE SERVICE ARCHITECTURE (core-service)**

### **4.1 Project Structure**

```
CoreCourierService/
├── CoreCourierService.Api/          (ASP.NET Core 10 Web API)
│   ├── Program.cs                   (Startup configuration)
│   ├── Controllers/                 (14 endpoints)
│   ├── Services/                    (Business logic)
│   ├── DTOs/                        (Request/Response models)
│   ├── Middleware/                  (Auth, Tenant resolution)
│   └── Validators/                  (Input validation)
│
├── CoreCourierService.Core/         (Domain entities)
│   ├── Entities/                    (Data models)
│   └── Interfaces/                  (Repository contracts)
│
└── CoreCourierService.Infrastructure/ (Data access)
    ├── Repositories/                (MongoDB repositories)
    ├── Context/                     (Tenant context)
    └── Configuration/               (MongoDB settings)
```

### **4.2 Authentication & Multi-Tenancy**

**Auth0 Integration**
- JWT Bearer token validation with Auth0 issuer
- Authority: `https://dev-dtn8wjllia6xrmrl.us.auth0.com/`
- Audience: `https://loomis-main-srv/`

**Tenant Resolution Middleware** (TenantResolverMiddleware.cs)
- Extracts Auth0 user ID from JWT claims
- Looks up TenantUser by Auth0 ID
- Sets TenantContext for scoped dependency injection
- All repository queries automatically filtered by TenantId

**Tenant Context** (TenantContext.cs)
- Scoped service per HTTP request
- Stores current TenantId and ApiKey
- Injected into repositories and services

---

## **5. DATA ENTITIES & RELATIONSHIPS**

### **5.1 Core Entity Diagram**

```
┌──────────────┐
│   Tenant     │───many──→ ┌────────────────┐
│              │           │  TenantUser    │
│ - name       │           │ (Auth0 link)   │
│ - apiKey     │           └────────────────┘
│ - plan       │
│ - company    │
│ - onboarding │           ┌────────────────────┐
└──────────────┘───many──→ │  Shipment          │
                            │ - trackingNumber   │
                            │ - sender/receiver  │
                            │ - status           │
                            │ - serviceType      │
                            └────────────────────┘
                                     │
                                   many
                                     ↓
                            ┌────────────────────┐
                            │  ShipmentEvent     │
                            │ (Status updates)   │
                            └────────────────────┘

┌──────────────┐
│   Tenant     │───many──→ ┌──────────────┐
│              │           │   Rate       │
│              │           │ - serviceType│
│              │           │ - baseRate   │
│              │           │ - maxWeight  │
│              │           └──────────────┘
└──────────────┘

┌──────────────┐
│   Tenant     │───many──→ ┌──────────────────────┐
│              │           │   Payment            │
│              │           │ - trackingNumber     │
│              │           │ - amount             │
│              │           │ - method             │
│              │           │ - status             │
│              │           └──────────────────────┘
└──────────────┘

┌──────────────┐
│   Tenant     │───many──→ ┌──────────────────────┐
│              │           │   Complaint          │
│              │           │ - trackingNumber     │
│              │           │ - type (Delay/etc)   │
│              │           │ - description        │
│              │           └──────────────────────┘
└──────────────┘

┌──────────────┐
│   Tenant     │───many──→ ┌──────────────────────┐
│              │           │ TenantIntegration    │
│              │           │ - integrationType    │
│              │           │ - config (polymorphic)
│              │           │ - isActive           │
└──────────────┘           └──────────────────────┘
```

### **5.2 Entity Descriptions**

**BaseEntity** (Abstract)
- `Id` (ObjectId, auto-generated)
- `CreatedAt` (DateTime)
- `UpdatedAt` (DateTime)

**TenantEntity** (Extends BaseEntity)
- `TenantId` (Links to owning Tenant)

**Tenant**
```csharp
- Name: string
- ApiKey: string (for API authentication)
- Plan: string (free, pro, enterprise)
- Branding: TenantBranding (colors, tone, logo)
- CompanyProfile: CompanyProfile (organization details)
- OnboardingStatus: OnboardingStatus (profile_completed, rates_completed)
- EnabledServices: List<string> (which service types available)
- IsActive: bool
```

**Shipment**
```csharp
- TrackingNumber: string (e.g., "LMS-ABC12345")  [GENERATED]
- Sender: ContactInfo (name, address, phone, email)
- Receiver: ContactInfo
- Parcel: ParcelInfo (weight, dimensions, description, value)
- ServiceType: string (Standard, Express, Overnight)
- Status: string (Created → PickedUp → InTransit → Delivered)
- SpecialInstructions: string?
- EstimatedDelivery: DateTime? [CALCULATED]
```

**Rate**
```csharp
- ServiceType: string (Standard, Express, Overnight)
- BaseRate: decimal (first kg)
- AdditionalKgRate: decimal (per additional kg)
- MinWeight: decimal (0.5 kg default)
- MaxWeight: decimal (30 kg default)
```

**Payment**
```csharp
- TrackingNumber: string (links to shipment)
- Amount: decimal
- Method: string (CreditCard, DebitCard, Cash, BankTransfer)
- Status: string (Pending, Completed, Failed, Refunded)
- TransactionId: string?
```

**TenantIntegration** (Polymorphic pattern)
```csharp
- IntegrationType: string
- Config: IntegrationConfig (base, discriminated by subclass)
  - TelegramConfig | WhatsAppConfig (etc.)
- IsActive: bool
```

**TelegramConfig** (Integration subclass)
```csharp
- BotToken: string
- BotUsername: string
- WebhookUrl: string
- AllowedCommands: List<string>
- AutoReplyEnabled: bool
- ForwardToBrain: bool (route messages to AI agent)
- GreetingMessage: string?
```

---

## **6. CONTROLLER & API ENDPOINTS**

### **6.1 Endpoint Summary**

| Controller | Endpoints | Purpose |
|-----------|-----------|---------|
| **ShipmentsController** | POST /api/shipments<br/>GET /api/shipments<br/>GET /api/shipments/{trackingNumber}<br/>PATCH /api/shipments/{id} | Create, list, track, update shipments |
| **RatesController** | POST, GET, PATCH, DELETE /api/rates<br/>POST /api/rates/calculate | Manage shipping rates, calculate quotes |
| **PaymentsController** | POST, GET /api/payments | Process and track payments |
| **ComplaintsController** | POST, GET /api/complaints | File and retrieve complaints |
| **IntegrationsController** | POST /api/integrations/telegram/setup<br/>GET /api/integrations<br/>DELETE /api/integrations/{id} | Manage external integrations |
| **OnboardingController** | POST /api/onboarding/setup<br/>PATCH /api/onboarding/company-profile<br/>PATCH /api/onboarding/service-rates | Tenant onboarding flow |
| **TenantUsersController** | POST, GET /api/tenant-users | User management within tenant |
| **TelegramController** | POST /api/telegram/webhook | Webhook for Telegram messages |
| **DashboardController** | GET /api/ai/dashboard/overview | System stats and KPIs |
| **AIBrainController** | POST /api/ai/brain/chat | Chat interface to AI agents |

### **6.2 Key API Calls (from Tools)**

**Brain Service → Core Service Communication**

```
POST /api/ai/shipments/create
├── Payload: { sender, receiver, parcel, serviceType }
└── Response: { id, trackingNumber, status, estimatedDelivery }

POST /api/ai/rates/inquiry
├── Payload: { weight, serviceType, origin, destination }
└── Response: { price, currency, deliveryEstimate }

GET /api/ai/shipments/tracking/{trackingNumber}
├── Query: trackingNumber
└── Response: { shipment data with current status }

POST /api/ai/complaints/file
├── Payload: { trackingNumber, type, description, customerContact }
└── Response: { complaintId, status }

POST /api/ai/payments/process
├── Payload: { trackingNumber, amount, method, transactionId }
└── Response: { receiptId, status }

GET /api/ai/dashboard/overview
├── Query: none
└── Response: { shipmentStats, paymentStats, complaints, etc. }
```

---

## **7. SERVICE LAYER**

### **7.1 Business Logic Services**

Each service encapsulates domain logic for a specific aggregate:

**ShipmentService**
```typescript
- CreateShipmentAsync(shipment): Generates tracking number (LMS-XXXXX)
- GetByTrackingNumberAsync(trackingNumber)
- GetShipmentsAsync(page, pageSize, status): Multi-tenant filtered query
- UpdateStatusAsync(trackingNumber, status, location)
- CalculateEstimatedDelivery(serviceType): Returns DateTime based on service
```

**RateService**
```typescript
- CreateRateAsync(serviceType, baseRate, additionalKgRate, minWeight, maxWeight)
- GetAllRatesAsync(): Tenant-scoped rates
- GetRateByIdAsync(rateId)
- UpdateRateAsync(rateId, updates)
- DeleteRateAsync(rateId)
- CalculateRateAsync(serviceType, weight): Total = BaseRate + (Weight - 1) * AdditionalKgRate
```

**TenantService**
```typescript
- CreateTenantAsync(tenant): Onboarding flow
- GetByIdAsync(tenantId)
- UpdateOnboardingStatusAsync(tenantId, profileCompleted, ratesCompleted)
- GetPlanLimitsAsync(tenantId): Per-plan feature gating
```

**TenantUserService**
```typescript
- GetByAuth0UserIdAsync(auth0UserId): Tenant lookup from Auth0
- CreateTenantUserAsync(tenantId, auth0UserId, email)
- InviteUserAsync(tenantId, email): Send invite link
```

**PaymentService**
```typescript
- ProcessPaymentAsync(trackingNumber, amount, method)
- GetPaymentsAsync(tenantId, page, pageSize)
- UpdatePaymentStatusAsync(paymentId, status)
```

---

## **8. REPOSITORY PATTERN**

### **8.1 MongoDB Repository Implementation**

All repositories extend **MongoRepository<T>**:

```csharp
public abstract class MongoRepository<T> where T : BaseEntity
{
    protected IMongoCollection<T> Collection { get; }
    
    public async Task<T> CreateAsync(T entity)
    public async Task<T?> GetByIdAsync(string id)
    public async Task<(IEnumerable<T>, long)> GetPagedAsync(...)
    public async Task<bool> UpdateAsync(string id, T entity)
    public async Task<bool> DeleteAsync(string id)
}
```

**Specialized Repositories**

- **ShipmentRepository**: `GetByTrackingNumberAsync()`, tenant-scoped queries
- **RateRepository**: `GetByServiceTypeAsync()`, per-tenant rates
- **TenantUserRepository**: `GetByAuth0UserIdAsync()`
- **TenantIntegrationRepository**: Polymorphic integration configs
- **AuditLogRepository**: Audit trail for compliance

---

## **9. MIDDLEWARE & CROSS-CUTTING CONCERNS**

### **9.1 Middleware Pipeline**

```
Request
  ↓
[CorsMiddleware] → Allow all origins
  ↓
[AuthenticationMiddleware] → JWT validation
  ↓
[TenantResolverMiddleware] → Set TenantContext
  ↓
[RateLimitingMiddleware] → Per-tenant rate limits
  ↓
[GlobalExceptionMiddleware] → Structured error responses
  ↓
[MVC Routing] → Route to controller
  ↓
Response
```

**TenantResolverMiddleware**
- Runs AFTER authentication
- Extracts Auth0 user ID from claims
- Calls `TenantUserService.GetByAuth0UserIdAsync()`
- Sets `TenantContext.SetTenant(tenantId)`
- Scoped services in handlers get correct tenant

**GlobalExceptionMiddleware**
- Catches unhandled exceptions
- Logs with correlation IDs
- Returns standardized error response with error codes

**RateLimitingMiddleware**
- Per-plan rate limits (free, pro, enterprise)
- Returns 429 Too Many Requests with retry headers

---

## **10. ONBOARDING & MULTI-TENANCY FLOW**

### **10.1 New Tenant Creation Flow**

```
1. User logs in with Auth0 (first time)
   ↓
2. Frontend redirects to `/onboarding/company-setup`
   ↓
3. POST /api/onboarding/setup
   ├─ Create new Tenant
   ├─ Create TenantUser (Auth0 link)
   ├─ Set OnboardingStatus.status = "profile_completed"
   └─ Generate API key for tenant
   ↓
4. Frontend redirects to `/onboarding/service-rates`
   ↓
5. PATCH /api/onboarding/service-rates
   ├─ Create default Rate records
   ├─ Set OnboardingStatus.rates_completed = true
   ├─ Update status = "done"
   └─ Enable services (Standard, Express, Overnight)
   ↓
6. Frontend checks onboarding status
   ├─ If status = "profile" → Redirect to company setup
   ├─ If status = "rates" → Redirect to service rates
   ├─ If status = "done" → Redirect to dashboard
   └─ Load the dashboard
```

### **10.2 Multi-Tenant Isolation**

**Database Level**
- Each document stored with `TenantId` field
- MongoDB queries use `{ TenantId: tenantId }` filter in WHERE clauses
- Indexes on `(TenantId, CreatedAt)` for efficient querying

**Application Level**
- `TenantContext` injected as scoped service
- Every service receives tenant context
- No queries execute without tenant filtering

**API Level**
- Auth0 JWT → TenantUser lookup → TenantId in context
- If TenantUser not found → 401 Unauthorized

---

## **11. INTEGRATION ARCHITECTURE**

### **11.1 Telegram Integration**

**Setup Flow**
```
POST /api/integrations/telegram/setup
├── Input: botToken, webhookUrl
├── Validate bot token with Telegram API
├── Register webhook URL (Telegram → Core Service)
├── Save TelegramConfig to TenantIntegration
└── Response: botUsername, allowedCommands, autoReplyEnabled
```

**Message Flow**
```
Customer sends message in Telegram
  ↓
Telegram sends webhook to `/api/telegram/webhook`
  ↓
TelegramWebhookHandler processes message
  ├─ Extract message content
  ├─ If forwardToBrain = true:
  │   └─ POST to Brain Service with message
  ├─ If autoReplyEnabled = true:
  │   └─ Send greeting/auto-response
  └─ Store TelegramMessage in DB
```

**Config Storage** (Polymorphic inheritance in MongoDB)
```javascript
{
  _t: "TelegramConfig",  // Discriminator
  botToken: "token...",
  botUsername: "@loomis_bot",
  webhookUrl: "https://api.loomis.com/api/telegram/webhook",
  autoReplyEnabled: true,
  forwardToBrain: true,
  greetingMessage: "Welcome to Loomis Courier!"
}
```

---

## **12. DATA FLOW SCENARIOS**

### **Scenario 1: Customer Books a Shipment via AI Agent**

```
1. User (Frontend) → Brain Service: "Ship a package from NY to LA"
   
2. Brain Service → Intent Router Agent
   ├─ Analyze keywords: "Ship", "package", "from", "to"
   ├─ Route to shipmentAgent
   └─ Ask smart clarifying questions (weight, service type)

3. shimmentAgent uses calculate_shipping_rate tool
   ├─ API Call → Core Service POST /api/ai/rates/inquiry
   ├─ Core Service → RateService.CalculateRateAsync("Express", 5kg)
   └─ Returns: $45.00 + $10 (additional kg)

4. User confirms booking
   
5. shipmentAgent uses create_shipment tool
   ├─ API Call → Core Service POST /api/ai/shipments/create
   ├─ Core Service → ShipmentService.CreateShipmentAsync()
   │   ├─ Generate TrackingNumber: "LMS-XY9Z2K4P"
   │   ├─ Calculate EstimatedDelivery: Now + 2 days
   │   ├─ ShipmentRepository.CreateAsync(shipment)
   │   └─ Return shipment with tracking number
   └─ Brain returns confirmation + tracking number to user

6. Frontend displays tracking number and shipment details
```

### **Scenario 2: Customer Lodges Complaint via Telegram**

```
1. Customer sends message in Telegram: "My package is lost!"

2. Telegram Webhook → Core Service /api/telegram/webhook
   ├─ TelegramWebhookHandler.HandleWebhookAsync()
   ├─ Extract: user_id, text, chat_id
   ├─ If forwardToBrain = true:
   │   ├─ POST to Brain Service with message + user context
   │   └─ Brain: routerAgent identifies complaint intent
   └─ TelegramMessageRepository.Insert(message, user_id)

3. Brain Service → Intent Router
   ├─ Keywords: "lost", "complain"
   └─ Route to supportAgent

4. supportAgent uses create_complaint tool
   ├─ API Call → /api/ai/complaints/file
   ├─ Core Service → ComplaintService.FileComplaintAsync()
   │   ├─ Extract tracking number from context (if available)
   │   ├─ Create Complaint record
   │   ├─ ComplaintRepository.CreateAsync(complaint)
   │   ├─ Send notification to admin
   │   └─ Return complaint ID
   └─ supportAgent → "Your complaint (ID: COMP-XXX) has been logged"

5. Brain sends response back to Telegram via API
   ├─ API Call → Telegram bot.sendMessage()
   └─ Customer sees: "Your complaint has been logged. Ticket: COMP-123"

6. Admin sees complaint in Dashboard
```

### **Scenario 3: Admin Checks System Stats**

```
1. Admin clicks "Dashboard" in frontend

2. Frontend calls DashboardComponent
   ├─ Injects BrainApiService
   ├─ Sends message: "Show me system statistics"
   └─ BrainApiService.sendMessage() → POST to Brain Service

3. Brain Service → Intent Router
   ├─ Keywords: "stats", "system", "statistics", "dashboard"
   └─ Route to adminAgent

4. adminAgent uses get_system_stats tool
   ├─ API Call → /api/ai/dashboard/overview
   ├─ Core Service → DashboardController.GetOverview()
   │   ├─ DashboardService.GetStatsAsync(tenantId)
   │   ├─ ShipmentRepository: count total, by status, by service type
   │   ├─ PaymentRepository: sum by status, method, date range
   │   ├─ ComplaintRepository: count by type, status
   │   └─ Return aggregated stats object
   └─ adminAgent formats response

5. Brain returns: "Here are your stats: 
   - Total shipments: 243
   - Revenue: $4,521
   - Pending shipments: 12
   - Open complaints: 3"

6. Frontend displays KPI cards, charts, updates in real-time
```

---

## **13. API SECURITY & AUTHENTICATION**

### **13.1 JWT-Based Authentication**

**Token Validation**
- Issuer: Auth0 domain
- Audience: `https://loomis-main-srv/`
- Algorithm: RS256 (asymmetric)
- Claims extracted: `sub` (user ID), `email`, `name`

**Request Header**
```
Authorization: Bearer eyJhbGc...
```

**Request Interceptor** (Angular)
- Automatically adds JWT token to all HTTP requests
- Refreshes token before expiration (silent refresh)

### **13.2 API Key Authentication**

**Tenant API Access**
- Each Tenant has ApiKey generated during onboarding
- Header: `X-API-KEY: tenant_api_key`
- Used by external systems to call Core Service directly

### **13.3 CORS Policy**

- **Allowed Origins**: `*` (all origins)
- **Allowed Methods**: GET, POST, PATCH, DELETE, OPTIONS
- **Exposed Headers**: X-Correlation-ID, X-RateLimit-*

---

## **14. DEPLOYMENT ARCHITECTURE**

### **14.1 Docker Compose (Development)**

```yaml
services:
  mongodb:
    image: mongo:8.0
    ports: 27017:27017
    networks: courier_network
    volumes: mongodb_data

  api:
    build: .
    ports: 5000:5000
    depends_on: [mongodb]
    environment:
      ASPNETCORE_ENVIRONMENT: Development
      MongoDbSettings__ConnectionString: mongodb://mongodb:27017
      MongoDbSettings__DatabaseName: courier_service_db
    networks: courier_network
```

**Services Running**
- **MongoDB**: Data persistence + connection pooling
- **Core API (.NET)**: Business logic + API endpoints
- **Brain Service (Node.js)**: AI agents + tools (runs separately, not in compose)
- **Frontend (Angular)**: Dev server via `ng serve` + proxy to Core API

### **14.2 Production Deployment**

**Containerization**
- Each service has its own Dockerfile
- Images pushed to Docker registry
- Orchestrated via Kubernetes or Cloud Run

**Scaling**
- **Stateless**: Core API and Brain Service stateless → horizontal scaling
- **Database**: MongoDB Atlas managed cluster
- **Frontend**: Served via CDN (static files)

---

## **15. TECHNICAL PATTERNS & BEST PRACTICES**

### **15.1 Design Patterns Used**

| Pattern | Implementation | Purpose |
|---------|----------------|---------|
| **Repository** | MongoRepository<T> + specialized repos | Data access abstraction |
| **Dependency Injection** | ASP.NET Core DI container | Loose coupling, testability |
| **Middleware** | Tenant resolver, Exception handler | Cross-cutting concerns |
| **Scoped Services** | TenantContext, per-request services | Tenant isolation |
| **Polymorphic Inheritance** | IntegrationConfig with discriminator | Flexible extension (Telegram, WhatsApp) |
| **Agent Pattern** | LlmAgent hierarchy with tools | AI-driven automation |
| **Memory Service** | MongoDB-backed conversation memory | Context persistence |
| **API Client** | Singleton HTTP client with retry | Service-to-service communication |

### **15.2 Code Organization**

**Separation of Concerns**
- **Controllers**: HTTP handling only
- **Services**: Business logic
- **Repositories**: Data access
- **Entities**: Domain models
- **DTOs**: Request/response serialization
- **Middleware**: Cross-cutting concerns

**Naming Conventions**
- Controllers: `{Entity}Controller`
- Services: `{Entity}Service`
- Repositories: `{Entity}Repository`
- Interfaces: `I{Entity}Repository`, `I{Service}Service`
- DTOs: `{Action}{Entity}Request/Response`

---

## **16. DATA PERSISTENCE & QUERYING**

### **16.1 MongoDB Collections**

```javascript
// Tenants (Identity - multi-tenant root)
db.tenants.createIndex({ api_key: 1 }, { unique: true })
db.tenants.createIndex({ is_active: 1 })

// Shipments (Transactional - per-tenant)
db.shipments.createIndex({ tenant_id: 1, created_at: -1 })
db.shipments.createIndex({ tenant_id: 1, tracking_number: 1 }, { unique: true })
db.shipments.createIndex({ tenant_id: 1, status: 1 })

// Rates (Configuration - per-tenant)
db.rates.createIndex({ tenant_id: 1, service_type: 1 })

// Payments (Transactional)
db.payments.createIndex({ tenant_id: 1, tracking_number: 1 })
db.payments.createIndex({ tenant_id: 1, status: 1 })

// Complaints (Transactional)
db.complaints.createIndex({ tenant_id: 1, tracking_number: 1 })

// Tenant Integrations (Configuration)
db.tenant_integrations.createIndex({ tenant_id: 1, integration_type: 1 })

// Brain Service Collections
db.memories.createIndex({ session_id: 1 }, { unique: true })
db.knowledge_base.createIndex({ topic: 1 })
```

### **16.2 Query Examples**

**Get all shipments for a tenant**
```csharp
var shipments = await ShipmentRepository.GetPagedAsync(
    filter: s => s.TenantId == tenantId && s.Status == "InTransit",
    page: 1,
    pageSize: 20,
    orderBy: s => s.CreatedAt
);
```

**Track shipment by tracking number**
```csharp
var shipment = await ShipmentRepository.GetByTrackingNumberAsync("LMS-XY9Z2K4P");
```

---

## **17. ERROR HANDLING & RESILIENCE**

### **17.1 Exception Hierarchy**

```
Exception
├─ InvalidOperationException (Business rule violations)
├─ ArgumentException (Invalid input)
├─ HttpRequestException (External API failures)
└─ MongoException (Database failures)
```

**Handled by GlobalExceptionMiddleware**
- Logs with correlation ID
- Returns structured error response:
```json
{
  "error": {
    "code": "INVALID_BOT_TOKEN",
    "message": "The provided bot token is invalid",
    "correlation_id": "uuid-123"
  }
}
```

### **17.2 Resilience Strategies**

- **Timeout**: HTTP client has default timeout
- **Retry**: API client catches and logs failures
- **Circuit Breaker**: (Not implemented yet, but recommended for production)
- **Fallback**: Brain Service returns error message if API unavailable

---

## **18. MONITORING & OBSERVABILITY**

### **18.1 Logging**

- **Core Service**: ILogger<T> throughout
- **Brain Service**: Console logging (could integrate with Winston)
- **Frontend**: Console logs + error tracking

**Log Levels**
- **Info**: Request received, service created, connection established
- **Warning**: Deprecated API call, slow query, missing configuration
- **Error**: API failure, database error, validation failure

### **18.2 Metrics**

**Dashboard KPIs** (displayed in real-time)
- Total shipments (by status)
- Revenue (by service type, time period)
- Average delivery time
- Complaint count (by type)
- Payment success rate

**Admin Agent Reports**
- System statistics (shipment volume, revenue, active complaints)
- Service utilization (Standard vs Express vs Overnight)
- Customer metrics (inquiries, satisfaction)

---

## **19. EXTENSIBILITY & FUTURE ENHANCEMENTS**

### **19.1 New Integrations**

Current: Telegram, WhatsApp config exists (not fully implemented)
Future: Slack, Discord, Facebook Messenger

**Pattern** (TenantIntegration + polymorphic config):
```csharp
public class SlackConfig : IntegrationConfig
{
    public string WorkspaceId { get; set; }
    public string WebhookUrl { get; set; }
    public bool ForwardToBrain { get; set; }
}
```

### **19.2 New Agents**

Current: 7 agents (Route, Shipment, Tracking, Support, Finance, Admin, Customer)

Future patterns:
- **NotificationAgent**: Send SMS/email notifications
- **AnalyticsAgent**: Generate business reports
- **ComplianceAgent**: Audit trails, regulatory reporting
- **RecommendationAgent**: Upsell/cross-sell suggestions

---

## **20. KEY STATISTICS**

| Metric | Value |
|--------|-------|
| **Frontend Framework** | Angular 21 |
| **Backend Language** | C# (.NET 10) + TypeScript (Node.js) |
| **Database** | MongoDB 8.0 |
| **AI Model** | Google Gemini 2.5 Flash Lite |
| **Authentication** | Auth0 (OIDC/JWT) |
| **Controllers (Core Service)** | 14 endpoint groups |
| **Services (Core)** | 10+ business logic services |
| **Repositories** | 12 MongoDB repositories |
| **AI Agents** | 7 specialized agents |
| **Tools** | 7 agent tools |
| **Entities** | 15+ domain objects |
| **Middleware** | 4 custom middleware components |
| **Collections (MongoDB)** | 15+ collections |

---

## **21. ARCHITECTURE STRENGTHS**

1. ✅ **Scalable Microservices**: Independent services deployable
2. ✅ **AI-Powered Automation**: Specialized agents reduce manual work
3. ✅ **Multi-Tenant Isolation**: Secure data separation per customer
4. ✅ **Extensible Integrations**: Polymorphic config pattern for new channels
5. ✅ **SEPs**: Clear separation of concerns across layers
6. ✅ **Type Safety**: Strongly-typed C# and TypeScript
7. ✅ **API-First Design**: RESTful, OpenAPI documented
8. ✅ **Authentication**: Enterprise-grade Auth0 integration

---

## **22. POTENTIAL IMPROVEMENTS**

1. 🔲 **Circuit Breaker Pattern**: For resilience between services
2. 🔲 **Message Queue**: Async job processing (RabbitMQ, Kafka)
3. 🔲 **Caching Layer**: Redis for expensive queries
4. 🔲 **GraphQL**: Alternative to REST for complex queries
5. 🔲 **Comprehensive Logging**: Structured logging to ELK/Datadog
6. 🔲 **Unit/Integration Tests**: Currently missing test suites
7. 🔲 **Database Transactions**: Multi-document transactions for complex operations
8. 🔲 **Rate Limiting**: Per-user, per-API-key rate limiting
9. 🔲 **Webhook Retry Logic**: Exponential backoff for failed webhooks
10. 🔲 **API Versioning**: Support for v2 endpoints

---

## **CONCLUSION**

**Loomis** is a sophisticated, enterprise-grade SaaS platform that successfully combines:
- Modern frontend technologies (Angular 21, TypeScript)
- Robust backend services (.NET 10, Node.js)
- AI-powered automation (Google Agentic AI)
- Multi-tenant architecture with strict data isolation
- Extensible integration framework (Telegram, WhatsApp, etc.)

The **microservices architecture** enables independent scaling, the **AI agent pattern** provides intelligent automation, and the **repository-based data layer** ensures testability and maintainability. The system is well-positioned for growth and supports both B2B and B2C courier management workflows.

---
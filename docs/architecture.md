# Loomis Platform Architecture

## High-Level System Architecture

The Loomis SaaS platform is designed with a modular, microservices-based architecture to ensure scalability, maintainability, and extensibility. Below is a high-level overview of the system components and their interactions.

---

## Full Architecture Diagram

![Loomis Architecture Diagram](./loomis-architecture.png)

<details>
<summary>Mermaid Source</summary>

```mermaid
---
title: Loomis SaaS Platform - Full Architecture
---
flowchart TD
    subgraph User Side
        U1(User / Customer)
    end
    subgraph Frontend
        F1[Angular SPA (admin-dashboard)]
    end
    subgraph AI_Agent_Service
        A1[Node.js AI Service (brain-service)]
        A2[AI Agents (admin, customer, finance, shipment, support, tracking)]
        A1 --> A2
    end
    subgraph Core_API
        C1[.NET Core API (core-service)]
        C2[Business Logic, Tenants, Shipments, Rates, Payments, Integrations]
        C1 --> C2
    end
    subgraph Database
        DB1[(MongoDB)]
    end
    subgraph Integrations
        I1[Telegram]
        I2[Webhooks]
        I3[Other APIs]
    end
    U1 -->|Web/App| F1
    F1 -->|REST/GraphQL| A1
    A1 -->|API| C1
    C1 --> DB1
    A1 --> DB1
    I1 -.->|Webhook/API| A1
    I2 -.->|Webhook| C1
    I3 -.->|API| C1
    I3 -.->|API| A1
    F1 -->|Notifications| I1
    F1 -->|External Actions| I2
    F1 -->|External APIs| I3
    classDef ext fill:#f9f,stroke:#333,stroke-width:2px;
    class I1,I2,I3 ext;
```
</details>

---

## How Loomis Handles Customers

1. **User Onboarding & Authentication:**
   - Users sign up or log in via Auth0 in the Angular frontend.
   - Multi-tenant context is established by the backend.
2. **Customer Actions:**
   - Customers can book shipments, make inquiries, or manage their account in the dashboard.
   - All actions are sent to the Node.js AI service for validation, enrichment, or automation.
3. **AI-Powered Processing:**
   - The AI service (brain-service) uses specialized agents to process requests (e.g., booking, rate calculation, support).
   - The AI service may call the .NET Core API for business logic or direct database access.
4. **Business Logic & Persistence:**
   - The .NET Core API manages tenant context, business rules, and persists data to MongoDB.
5. **Feedback & Notifications:**
   - The frontend receives results, updates the UI, and may trigger notifications via integrations (Telegram, webhooks, etc.).

---

## How Integrations Work

- **Telegram:**
  - Receives webhooks from the backend for real-time updates (e.g., shipment status, support messages).
  - Can be used for customer notifications or support chat.
- **Webhooks:**
  - External systems can subscribe to events (e.g., shipment created, payment received) via webhooks from the .NET Core API.
- **Other APIs:**
  - The system can call or be called by other APIs for extensibility (e.g., payment gateways, analytics, third-party logistics).
- **Frontend Triggers:**
  - The Angular frontend can trigger external actions or APIs directly for integrations like analytics, notifications, or custom workflows.

---

For more details, see the main [README.md](../README.md) or explore the codebase.

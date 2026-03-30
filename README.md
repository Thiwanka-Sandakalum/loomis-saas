# Loomis SaaS Platform

## Overview
Loomis is a multi-tenant SaaS platform for courier and logistics businesses. It combines a modern operations dashboard with AI-powered agents that automate shipment workflows, tracking, customer support, finance operations, and administrative controls.

Built as a microservices architecture, Loomis includes:
- Angular frontend for operations teams
- .NET backend for core domain and APIs
- TypeScript AI orchestration service for routing and automation
- MongoDB (and optional Redis) for data and caching

**Key Value Propositions:**
- **AI Automation:** Specialized agents handle inquiries, complaints, tracking, rates, and payments.
- **Unified Operations:** One dashboard for shipments, rates, integrations, and settings.
- **API-First Integration:** OpenAPI-driven contracts for internal and external systems.
- **Scalable Platform:** Containerized services, Kubernetes-ready deployment assets.
- **Tenant-Aware Workflows:** Flexible settings and controls for B2B SaaS environments.

## Table of Contents
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Agent Design](#agent-design)
- [Screenshots](#screenshots)
- [Key Features & Components](#key-features--components)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Deployment & Infrastructure](#deployment--infrastructure)
- [Documentation](#documentation)
- [License](#license)

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

## Architecture
![alt text](infrastructure/docs/diagram-export-3-30-2026-1_55_52-PM.png)

For detailed architecture documentation, see [docs/architecture.md](docs/architecture.md).

## Agent Design

```mermaid
flowchart TB
	User["User Message / Event"] --> Router

	Router["Intent Router Agent (Gemini 2.5)<br/>- Classifies intent + confidence<br/>- Applies routing policy<br/>- Never answers directly"]
	Policy["Routing Guardrails<br/>- role/tenant validation<br/>- safety & policy checks"]
	Context["Shared Context Layer<br/>- conversation state<br/>- shipment/customer context"]
	Router --> Policy
	Policy --> Context

	subgraph OPS["Operational Agents"]
		direction LR
		Shipment["Shipment Agent"]
		Tracking["Tracking Agent"]
		Support["Support Agent"]
		Finance["Finance Agent"]
		Admin["Admin Agent"]
	end

	subgraph EXP["Experimental / Disabled"]
		direction LR
		Customer["Customer Agent (unused)"]
	end

	Context -->|"book / reschedule / cancel"| Shipment
	Context -->|"where is my package"| Tracking
	Context -->|"issue / complaint / escalation"| Support
	Context -->|"rate / invoice / payment"| Finance
	Context -->|"settings / tenants / controls"| Admin
	Context -.->|"disabled route"| Customer

	Shipment --> ResultBus["Agent Result Bus"]
	Tracking --> ResultBus
	Support --> ResultBus
	Finance --> ResultBus
	Admin --> ResultBus

	ResultBus --> Composer["Response Composer"]
	Composer --> UserResponse["Unified Response"]

	Audit["Observability + Audit Trail"]
	Router -.-> Audit
	Policy -.-> Audit
	ResultBus -.-> Audit

	classDef router fill:#eef6ff,stroke:#1d4ed8,color:#0f172a,stroke-width:2px;
	classDef agent fill:#f8fafc,stroke:#334155,color:#0f172a;
	classDef unused stroke-dasharray: 6 4,opacity:0.8;
	classDef infra fill:#f8fafc,stroke:#64748b,color:#0f172a;

	class Router router;
	class Shipment,Tracking,Support,Finance,Admin agent;
	class Customer unused;
	class Policy,Context,ResultBus,Composer,Audit infra;
```

Core orchestration principle: the router delegates, domain agents execute, and response composition stays centralized for consistency and auditability.

---

## Screenshots

| ![Dashboard](docs/public/assets/screenshots/dashboard.png) | ![AI Agent Sandbox](docs/public/assets/screenshots/ai-agent-sandbox.png) | ![Integrations](docs/public/assets/screenshots/integrations.png) |
|:---------------------------------------------------------:|:-----------------------------------------------------------------------:|:---------------------------------------------------------------:|
| **Dashboard**                                             | **AI Agent Sandbox**                                                    | **Integrations**                                                |

---

## Key Features & Components

- **AI Agents:** `adminAgent`, `customerAgent`, `financeAgent`, `shipmentAgent`, `supportAgent`, `trackingAgent` in `brain-service/src/application/agents/`
- **Frontend Domains:** Dashboard, Shipments, Rates, Inquiries, Integrations, Onboarding, Settings in `admin-dashboard/src/app/features/`
- **API Contracts:** OpenAPI specs in `brain-service/openapi.yaml` and `admin-dashboard/openapi.yaml`
- **Runtime Services:** Node.js AI service, .NET API, MongoDB, optional Redis
- **Ops Assets:** Docker Compose, Kubernetes manifests, Terraform modules

---

## Repository Structure

```text
loomis/
├── admin-dashboard/   # Angular frontend
├── brain-service/     # TypeScript AI orchestration and tools
├── core-service/      # .NET API and domain services
├── docs/              # Product and architecture documentation
├── infrastructure/    # Docker, Kubernetes, Terraform, operations docs
├── docker-compose.yml # Local full-stack runtime
└── Makefile           # Local + DevOps command shortcuts
```

---
## Documentation

- System architecture: [docs/architecture.md](docs/architecture.md)
- General docs: `docs/`
- Infrastructure docs: `infrastructure/docs/`

---

---

<p align="center">
	<img src="https://img.shields.io/badge/Scalable%20Microservices-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="Scalable Microservices"/>
	<img src="https://img.shields.io/badge/AI%20Automation-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="AI Automation"/>
	<img src="https://img.shields.io/badge/Multi--Tenant%20SaaS-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="Multi-Tenant SaaS"/>
	<img src="https://img.shields.io/badge/API--First%20Design-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="API-First Design"/>
	<img src="https://img.shields.io/badge/Type%20Safety-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="Type Safety"/>
	<img src="https://img.shields.io/badge/Auth0%20Integration-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="Auth0 Integration"/>
	<img src="https://img.shields.io/badge/Telegram%20Bot%20Flows-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="Telegram Bot Flows"/>
</p>

<p align="center">
	<img src="https://img.shields.io/badge/Webhook%20Integrations-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="Webhook Integrations"/>
	<img src="https://img.shields.io/badge/B2B%20API%20Integrations-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="B2B API Integrations"/>
	<img src="https://img.shields.io/badge/Kubernetes%20Native-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="Kubernetes Native"/>
	<img src="https://img.shields.io/badge/Production%20Reliability-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="Production Reliability"/>
	<img src="https://img.shields.io/badge/Observability%20Ready-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="Observability Ready"/>
	<img src="https://img.shields.io/badge/Domain--Driven%20Logistics-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="Domain-Driven Logistics"/>
	<img src="https://img.shields.io/badge/Full--Stack%20Engineering-1F2937?style=for-the-badge&labelColor=1F2937&color=1F2937&logoColor=E5E7EB" alt="Full-Stack Engineering"/>
</p>

---

*For more details, explore `docs/` and `infrastructure/docs/`.*

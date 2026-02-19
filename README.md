# Loomis SaaS Platform

## Overview
Loomis is a modern SaaS platform designed for courier and logistics businesses. It provides an AI-powered dashboard for managing shipments, rates, customer inquiries, integrations, and business analytics. Loomis leverages advanced AI agents to automate customer support, shipment booking, rate calculation, and system monitoring, streamlining operations for courier companies and their clients.

**Key Value Propositions:**
- **AI Automation:** Specialized agents handle customer inquiries, complaints, shipment tracking, rate calculation, and payments.
- **Unified Dashboard:** Real-time management of shipments, rates, and customer interactions.
- **Extensible Integrations:** Connect with external services (e.g., Telegram, webhooks).
- **Scalable Infrastructure:** Microservices architecture with robust backend and modern Angular frontend.
- **Customizable:** Multi-tenant support, flexible rate and settings management.

---

## Tech Stack

<img src="https://img.shields.io/badge/CI%2FCD-4285F4?style=for-the-badge&logo=github-actions&logoColor=white" alt="CI/CD"/>
<img src="https://img.shields.io/badge/Test%20Automation-6DB33F?style=for-the-badge&logo=testing-library&logoColor=white" alt="Test Automation"/>
<img src="https://img.shields.io/badge/LangChain-000000?style=for-the-badge&logo=langchain&logoColor=white" alt="LangChain"/>
<img src="https://img.shields.io/badge/LangGraph-000000?style=for-the-badge&logo=langgraph&logoColor=white" alt="LangGraph"/>
<img src="https://img.shields.io/badge/RAG-4B0082?style=for-the-badge&logo=databricks&logoColor=white" alt="RAG"/>
<img src="https://img.shields.io/badge/Pub%2FSub-336791?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Pub/Sub"/>
<img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular"/>
<img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
<img src="https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" alt="Chart.js"/>
<img src="https://img.shields.io/badge/Auth0-EB5424?style=for-the-badge&logo=auth0&logoColor=white" alt="Auth0"/>
<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
<img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"/>
<img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"/>
<img src="https://img.shields.io/badge/.NET-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt=".NET Core"/>
<img src="https://img.shields.io/badge/Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini"/>
<img src="https://img.shields.io/badge/Google%20ADK-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google ADK"/>
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
<img src="https://img.shields.io/badge/Docker%20Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Compose"/>
<img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx"/>
<img src="https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazonaws&logoColor=white" alt="AWS"/>
<img src="https://img.shields.io/badge/GCP-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white" alt="GCP"/>
<img src="https://img.shields.io/badge/Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white" alt="Azure"/>

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

## Getting Started

1. **Clone the repository**
2. **Install dependencies** for each service (see respective `package.json` or `.csproj` files)
3. **Run Docker Compose** for infrastructure
4. **Start frontend and backend services**
5. **Access the dashboard** at the configured URL

---

## License

[MIT](LICENSE)

---

*For more details, see the documentation in the `docs/` folder.*

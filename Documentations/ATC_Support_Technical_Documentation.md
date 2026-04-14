# ATC Support Platform — Technical Documentation

**Version:** 2.0  
**Last Updated:** April 14, 2026  
**Prepared by:** Engineering Team — Aarkay Techno Consultants Pvt. Ltd.  
**Classification:** Internal Use Only

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Backend API Reference](#6-backend-api-reference)
7. [Frontend Application](#7-frontend-application)
8. [Julia AI Engine](#8-julia-ai-engine)
9. [Email Integration](#9-email-integration)
10. [Environment Variables](#10-environment-variables)
11. [Project File Structure](#11-project-file-structure)

---

## 1. Platform Overview

**ATC Support** is a full-stack IT support management platform purpose-built for Aarkay Techno Consultants (ATCPL). It serves as the centralized system for managing client relationships, projects, hardware assets, support tickets, and AI-assisted troubleshooting.

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Client Support Portal** | Public-facing pages where end-users browse FAQs, submit tickets, and interact with Julia AI |
| **Julia AI Assistant** | LLM-powered chatbot (Groq / Llama 3.1) providing guided troubleshooting using project docs, runbooks, and support topics |
| **Ticket Lifecycle** | Full workflow engine — creation → assignment → escalation → resolution → reopen |
| **Agent Operations Console** | Internal dashboard for queue management, analytics, and operational tooling |
| **Email Integration** | Bidirectional email flow with automatic thread matching and status transitions |
| **Hardware Asset Tracking** | Brand/model catalog with per-client asset registry and AMC (Annual Maintenance Contract) linkage |
| **Support Sessions** | Multi-type interactive support flow (Software / Hardware / General) with client identification |
| **Knowledge Base** | Structured support topics (FAQ, SOP, Playbook, Vendor Link) with scoping rules |

### User Roles

| Role | Code | Access Level |
|------|------|-------------|
| **Project Manager** | `PM` | Full system access — manages users, clients, projects, and all tickets |
| **Support Engineer** | `SE` | Ticket workflow access; scope controlled by `ScopeMode` and `SupportLevel` |

**SE Sub-attributes:**

- **SupportLevel** — `SE1` (junior), `SE2` (mid), `SE3` (senior)
- **ScopeMode** — `GLOBAL` (sees all tickets) or `PROJECT_SCOPED` (sees only tickets from their linked projects)
- **AssignmentAuthority** — `SELF_ONLY` (can only assign tickets to themselves) or `SELF_AND_OTHERS` (can assign to any eligible SE)

---

## 2. System Architecture

### High-Level Diagram

```
                          ┌────────────────────────────────────┐
                          │          Client Browsers           │
                          │   (End-users, Support Agents)      │
                          └──────────┬───────────┬─────────────┘
                                     │           │
                              Port 4206     Port 3001
                                     │           │
┌────────────────────────────────────┐│           │┌──────────────────────────────────┐
│         IIS Web Server             ││           ││       Node.js Backend            │
│  ┌──────────────────────────────┐  ││           ││  ┌────────────────────────────┐  │
│  │  React SPA (Static Files)   │◀─┘│           │└─▶│  Express.js REST API       │  │
│  │  - index.html               │   │           │   │  - JWT Authentication      │  │
│  │  - /assets/*.js, *.css      │   │           │   │  - Prisma ORM              │  │
│  │  - widget.js                │   │           │   │  - Zod Validation          │  │
│  │  - web.config (URL rewrite) │   │           │   │  - Multer (File Uploads)   │  │
│  └──────────────────────────────┘  │           │   └──────────┬─────────────────┘  │
│  Physical: C:\inetpub\             │           │              │                    │
│            ATC_Support_Frontend\   │           │   ┌──────────▼─────────────────┐  │
└────────────────────────────────────┘           │   │  Services Layer            │  │
                                                 │   │  - Julia AI (Groq SDK)     │  │
                                                 │   │  - Mailer (Nodemailer)     │  │
                                                 │   │  - Notifications           │  │
                                                 │   │  - Ticket Emails           │  │
                                                 │   └──────────┬─────────────────┘  │
                                                 │              │                    │
                                                 │   ┌──────────▼─────────────────┐  │
                                                 │   │  PostgreSQL :5432          │  │
                                                 │   │  Database: atc_support_    │  │
                                                 │   │           backend          │  │
                                                 │   └────────────────────────────┘  │
                                                 └──────────────────────────────────┘
```

### Request Flow

1. **Browser** loads the React SPA from IIS (port 4206)
2. **SPA** makes API calls to the backend (port 3001) via `fetch` with `credentials: 'include'`
3. **Backend** validates JWT from `Authorization: Bearer <token>` header
4. **Prisma ORM** translates requests to SQL queries against PostgreSQL
5. **Responses** flow back as JSON to the SPA

---

## 3. Technology Stack

### Backend

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | ≥ 20 |
| Framework | Express.js | 4.x |
| Language | TypeScript | 5.9 |
| ORM | Prisma | 7.5 |
| Database | PostgreSQL | — |
| Auth | jsonwebtoken (JWT) + bcrypt | — |
| Validation | Zod | 4.x |
| AI / LLM | Groq SDK → Llama 3.1 8B Instant | — |
| Email | Nodemailer | 7.x |
| File Uploads | Multer | 2.x (10 MB limit) |
| Process Manager | NSSM (Non-Sucking Service Manager) | — |

### Frontend

| Component | Technology | Version |
|-----------|-----------|---------|
| UI Framework | React | 19 |
| Routing | React Router | 7.x |
| Build Tool | Vite | 6.x |
| Styling | Tailwind CSS | 4.x |
| Animations | Motion (Framer Motion) | — |
| Charts | Recharts | 3.x |
| Icons | Lucide React | — |
| AI (Widget) | Google GenAI SDK | — |
| Markdown Rendering | react-markdown | — |

### Production Infrastructure

| Component | Technology | Port | Details |
|-----------|-----------|------|---------|
| Frontend | IIS (W3SVC) | 4206 | Serves static SPA from `C:\inetpub\ATC_Support_Frontend\` |
| Backend | NSSM Windows Service | 3001 | Runs `node dist/index.js` |
| Database | PostgreSQL | 5432 | Database: `atc_support_backend`, schema: `public` |

---

## 4. Database Schema

### 4.1 Enumerations

| Enum | Values | Used By |
|------|--------|---------|
| `Role` | PM, SE | User |
| `SupportLevel` | SE1, SE2, SE3 | User |
| `ScopeMode` | GLOBAL, PROJECT_SCOPED | User |
| `AssignmentAuthority` | SELF_ONLY, SELF_AND_OTHERS | User |
| `UserStatus` | ACTIVE, INACTIVE | User |
| `ClientStatus` | ACTIVE, INACTIVE | Client |
| `ProjectStatus` | ACTIVE, INACTIVE | Project |
| `AmcStatus` | ACTIVE, EXPIRED, CANCELLED | Amc |
| `TicketPriority` | LOW, MEDIUM, HIGH, CRITICAL | Ticket |
| `TicketStatus` | NEW, ASSIGNED, IN_PROGRESS, WAITING_ON_CUSTOMER, ESCALATED, REOPENED, RESOLVED | Ticket |
| `TicketSource` | WIDGET, PROJECT_WIDGET, GENERAL_WIDGET, INTERNAL | Ticket |
| `SupportType` | GENERAL, SOFTWARE, HARDWARE | Ticket, SupportSession, SupportTopic |
| `MessageType` | REPLY, INTERNAL_NOTE, SYSTEM | TicketMessage |
| `ChatSessionStatus` | ACTIVE, ENDED, ESCALATED | ChatSession |
| `ChatRole` | USER, JULIA | ChatMessage |
| `SupportSessionStatus` | ACTIVE, ENDED, ESCALATED | SupportSession |
| `SupportSessionSource` | GENERAL_WIDGET, PROJECT_WIDGET, INTERNAL | SupportSession |
| `SupportSessionMessageRole` | USER, JULIA, SYSTEM | SupportSessionMessage |
| `HardwareCategory` | PRINTER, SCANNER, NETWORK_DEVICE, COMPUTER, PERIPHERAL, OTHER | HardwareBrand, HardwareModel, HardwareAsset, SupportTopic |
| `HardwareAssetStatus` | ACTIVE, INACTIVE, RETIRED | HardwareAsset |
| `SupportTopicScope` | GLOBAL, CLIENT, PROJECT, HARDWARE_CATEGORY, HARDWARE_ASSET | SupportTopic |
| `SupportTopicKind` | FAQ, SOP, PLAYBOOK, VENDOR_LINK | SupportTopic |
| `KnowledgeStatus` | DRAFT, PUBLISHED | SupportTopic, Runbook, ProjectDoc |
| `NotificationType` | TICKET_CREATED, TICKET_ASSIGNED, TICKET_ESCALATED, TICKET_RESOLVED, TICKET_REOPENED, TICKET_CUSTOMER_REPLIED | Notification |
| `TicketEmailDirection` | OUTBOUND, INBOUND | TicketEmail |
| `TicketEmailStatus` | SENT, LOGGED, RECEIVED, FAILED | TicketEmail |

### 4.2 Core Models

#### User Management
- **`User`** — Internal agents with role, support level, scope, and assignment authority
- **`ProjectMember`** — Many-to-many join mapping SEs to their assigned Projects

#### Client & CRM
- **`Client`** — Customer organizations (name, industry, address, contacts)
- **`ClientContact`** — Contact persons at each client
- **`Consignee`** — Delivery/shipping locations per client
- **`ConsigneeContact`** — Contact persons at each consignee location
- **`Amc`** — Annual Maintenance Contracts with hour budgeting and date tracking

#### Projects
- **`Project`** — Software/hardware projects per client; includes widget configuration (`widgetKey`, `widgetEnabled`, `widgetAllowedDomains`) and Julia AI settings (`juliaGreeting`, `juliaFallbackMessage`, `juliaEscalationHint`)
- **`Faq`** — Project-specific frequently asked questions
- **`ProjectDoc`** — Project documentation (fed into Julia AI as RAG context)
- **`Runbook`** — Global operational runbooks (also fed into Julia)

#### Ticket System
- **`Ticket`** — Core work item linked to projects, clients, hardware assets, and chat/support sessions. Tracks priority, status, requester info, resolution summary, and AI confidence score.
- **`TicketMessage`** — Threaded conversation (REPLY from agents/customers, INTERNAL_NOTE between agents, SYSTEM auto-generated status messages)
- **`TicketAttachment`** — File uploads attached to specific messages
- **`TicketEmail`** — Full audit trail of outbound/inbound email events
- **`EscalationHistory`** — Records every status transition and reassignment with timestamp and optional note
- **`Notification`** — In-app alerts delivered to agents

#### AI & Support Sessions
- **`ChatSession`** — Legacy project-widget chat sessions with Julia AI
- **`ChatMessage`** — Messages within a ChatSession (USER or JULIA role)
- **`SupportSession`** — v2 multi-type support sessions (General/Software/Hardware) with client identification, hardware linking, and topic selection
- **`SupportSessionMessage`** — Messages within a SupportSession (USER, JULIA, or SYSTEM role)
- **`SupportTopic`** — Knowledge base entries scoped by client, project, hardware category, or hardware asset. Types: FAQ, SOP, Playbook, Vendor Link.

#### Hardware Catalog
- **`HardwareBrand`** — Vendor catalog (e.g., HP, Zebra, Cisco) categorized by hardware type
- **`HardwareModel`** — Specific product models under a brand
- **`HardwareAsset`** — Individual deployed units linked to clients, projects, and AMCs

### 4.3 Ticket Workflow State Machine

```
                    ┌───────┐
                    │  NEW  │ ◀── Widget / Internal creation
                    └───┬───┘
                        │ assign (auto or manual)
                        ▼
                   ┌──────────┐
                   │ ASSIGNED │
                   └────┬─────┘
                        │ start work
                        ▼
                 ┌─────────────┐
          ┌─────▶│ IN_PROGRESS │◀──────────────────────────┐
          │      └──┬──────┬───┘                           │
          │         │      │                               │
          │         │      │ escalate                      │ customer reply
          │         │      ▼                               │ (email/widget)
          │         │  ┌───────────┐                  ┌────┴─────┐
          │         │  │ ESCALATED │──── work ──────▶ │ REOPENED │
          │         │  └───────────┘                  └──────────┘
          │         │
          │         │ wait on customer
          │         ▼
          │  ┌───────────────────┐
          │  │ WAITING_ON_CUSTOMER│
          └──┤ (customer replies)│
             └───────────────────┘

                 ┌─────────────┐
                 │ IN_PROGRESS │
                 └──────┬──────┘
                        │ resolve
                        ▼
                  ┌──────────┐     customer reply    ┌──────────┐
                  │ RESOLVED │ ───────────────────▶  │ REOPENED │
                  └──────────┘    (email/widget)     └──────────┘
```

### 4.4 Entity Relationship Summary

```
User ──┬── assignedProjects (Project[])          Client ──┬── contacts (ClientContact[])
       ├── projectMemberships (ProjectMember[])          ├── consignees (Consignee[])
       ├── assignedTickets (Ticket[])                    ├── amcs (Amc[])
       ├── ticketMessages (TicketMessage[])              ├── projects (Project[])
       ├── ticketAttachments (TicketAttachment[])        ├── tickets (Ticket[])
       ├── escalationEvents (EscalationHistory[])        ├── hardwareAssets (HardwareAsset[])
       ├── notifications (Notification[])                ├── supportSessions (SupportSession[])
       └── ticketEmails (TicketEmail[])                  └── supportTopics (SupportTopic[])

Project ──┬── tickets (Ticket[])                 Ticket ──┬── messages (TicketMessage[])
          ├── faqs (Faq[])                               ├── attachments (TicketAttachment[])
          ├── docs (ProjectDoc[])                        ├── emailEvents (TicketEmail[])
          ├── chatSessions (ChatSession[])               └── escalationHistory (EscalationHistory[])
          ├── supportSessions (SupportSession[])
          ├── supportTopics (SupportTopic[])
          ├── hardwareAssets (HardwareAsset[])
          └── memberships (ProjectMember[])
```

---

## 5. Authentication & Authorization

### Authentication Flow

```
   Client                    Backend                    PostgreSQL
     │                          │                           │
     │  POST /api/auth/login    │                           │
     │  { email, password }     │                           │
     │────────────────────────▶│   bcrypt.compare()         │
     │                          │───────────────────────▶   │
     │                          │    ◀── user record ────   │
     │   ◀── 200 ──────────────│                           │
     │   { token, user }        │                           │
     │   Set-Cookie: refresh_   │                           │
     │   token (httpOnly)       │                           │
     │                          │                           │
     │  GET /api/tickets        │                           │
     │  Authorization: Bearer   │                           │
     │  <access_token>          │                           │
     │────────────────────────▶│  verifyAccessToken()       │
     │                          │  lookup user by sub       │
     │   ◀── 200 ──────────────│  check user.status=ACTIVE │
     │   { tickets: [...] }     │                           │
     │                          │                           │
     │  POST /api/auth/refresh  │                           │
     │  Cookie: refresh_token   │                           │
     │────────────────────────▶│  verifyRefreshToken()      │
     │   ◀── 200 ──────────────│  issue new access_token   │
     │   { token, user }        │  rotate refresh cookie   │
     │   Set-Cookie: new        │                           │
     │   refresh_token          │                           │
```

- **Access Token**: Short-lived JWT in `Authorization: Bearer` header, stored in `localStorage`
- **Refresh Token**: Longer-lived JWT in `httpOnly` cookie, auto-rotated on each refresh
- **Password Hashing**: bcrypt with salt rounds = 10

### Authorization Model (Middleware)

| Middleware | Purpose |
|-----------|---------|
| `authMiddleware` | Validates JWT, loads user from DB, rejects inactive users |
| `requireRole(Role.PM, Role.SE)` | Restricts endpoints to specific roles |
| `ticketScopeForUser(user)` | Generates Prisma `where` clause based on user's scope mode and project memberships |
| `assertTicketAccess(user, ticketId)` | Verifies a user has access to a specific ticket |
| `assertWidgetOriginAllowed(req, project)` | Validates the request origin against `widgetAllowedDomains` |

---

## 6. Backend API Reference

### 6.1 Public Endpoints (No Authentication)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Health check — returns `{"status":"ok"}` |
| `POST` | `/api/auth/login` | Agent login — returns `{ token, user }` + sets refresh cookie |
| `POST` | `/api/auth/refresh` | Token refresh — reads httpOnly cookie, returns new access token |
| `POST` | `/api/auth/logout` | Logout — clears the refresh cookie |
| `POST` | `/api/tickets` | Public ticket creation via widget (requires `widgetKey` in body + origin validation) |
| `GET` | `/api/widget/:widgetKey/faqs` | Fetch FAQs and project metadata for a widget key |
| `POST` | `/api/widget/:widgetKey/chat` | Send a message to Julia AI in a chat session |
| `POST` | `/api/widget/:widgetKey/escalate` | Escalate a chat session into a human support ticket |
| `GET` | `/api/support/context` | Fetch support context (topics, client info, project metadata) for the general widget |
| `POST` | `/api/support/sessions` | Create a new multi-type support session |
| `POST` | `/api/support/sessions/:id/message` | Send a message in a support session (Julia replies automatically) |
| `POST` | `/api/support/sessions/:id/escalate` | Escalate a support session to a human ticket |
| `POST` | `/api/email/inbound` | Inbound email webhook (secured by `INBOUND_EMAIL_SECRET` header) |

### 6.2 Authenticated Endpoints (JWT Required)

#### Users (`/api/users`)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/users` | List users (filterable by role, status, support level) |
| `GET` | `/api/users/:id` | Get user details |
| `POST` | `/api/users` | Create user (PM only) |
| `PATCH` | `/api/users/:id` | Update user profile/role |
| `POST` | `/api/users/:id/reset-password` | Admin password reset |
| `POST` | `/api/auth/change-password` | Self-service password change |

#### Clients (`/api/clients`)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/clients` | List with search, pagination, status filter |
| `GET` | `/api/clients/:id` | Detail with contacts, consignees, hardware, AMCs |
| `POST` | `/api/clients` | Create client |
| `PATCH` | `/api/clients/:id` | Update client |
| `DELETE` | `/api/clients/:id` | Delete client (cascades) |

#### Projects (`/api/projects`)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/projects` | List with search and filters |
| `GET` | `/api/projects/:id` | Detail including docs, FAQs, Julia readiness |
| `POST` | `/api/projects` | Create project with widget configuration |
| `PATCH` | `/api/projects/:id` | Update project settings / Julia config |
| `POST` | `/api/projects/:id/members` | Add project member (SE) |
| `DELETE` | `/api/projects/:id/members/:userId` | Remove project member |

#### Tickets (`/api/tickets`)
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/tickets` | List with search, status/priority/project/client/assignee filters, pagination |
| `GET` | `/api/tickets/:id` | Full detail: messages, chat session, support session, escalation history, email events |
| `PATCH` | `/api/tickets/:id` | Update title, description, priority, resolution summary |
| `DELETE` | `/api/tickets/:id` | Delete ticket and all attachments |
| `POST` | `/api/tickets/:id/assign` | Assign/reassign/unassign (checks eligibility) |
| `POST` | `/api/tickets/:id/start` | Transition to IN_PROGRESS |
| `POST` | `/api/tickets/:id/escalate` | Escalate to project specialist |
| `POST` | `/api/tickets/:id/waiting-on-customer` | Transition to WAITING_ON_CUSTOMER (sends email) |
| `POST` | `/api/tickets/:id/reopen` | Reopen a resolved ticket (sends email) |
| `POST` | `/api/tickets/:id/resolve` | Resolve with resolution summary (sends email) |

#### Ticket Messages (`/api/tickets/:id/messages`)
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/tickets/:id/messages` | Post reply or internal note (with optional file attachments, sends email for replies) |
| `GET` | `/api/tickets/:id/messages/:messageId/attachments/:attachmentId` | Download an attachment |

#### Additional Domains
| Domain | Base Path | Operations |
|--------|-----------|-----------|
| Client Contacts | `/api/clients/:id/contacts` | CRUD |
| Consignees | `/api/clients/:id/consignees` | CRUD + nested contacts |
| AMCs | `/api/clients/:id/amcs` | CRUD with hour tracking |
| Hardware Assets | `/api/hardware-assets` | CRUD, link to clients/projects/AMCs |
| Hardware Catalog | `/api/hardware-catalog/brands`, `.../models` | Brand + Model CRUD |
| FAQs | `/api/projects/:id/faqs` | CRUD with sort ordering |
| Runbooks | `/api/runbooks` | CRUD, publish/draft status |
| Project Docs | `/api/projects/:id/docs` | CRUD, publish/draft status |
| Support Topics | `/api/support-topics` | CRUD (scoped knowledge entries) |
| Support Sessions | `/api/support-sessions` | List, detail |
| Chat Sessions | `/api/chat-sessions` | List, detail (legacy) |
| Dashboard | `/api/dashboard` | Aggregated metrics and statistics |
| Reports | `/api/reports` | Ticket analytics, CSV export |
| Notifications | `/api/notifications` | List, mark read, mark all read |

---

## 7. Frontend Application

### 7.1 Route Map

#### Public Routes

| URL | Component | Description |
|-----|-----------|-------------|
| `/` | `ClientLanding` | Widget-key driven landing; redirects to `/support` when key is `general` |
| `/support` | `GeneralSupportDemo` | ATC General Support page (multi-type: Software, Hardware, General) |
| `/general-support` | `GeneralSupportDemo` | Alias for `/support` |
| `/login` | `LoginPage` | Agent authentication form |
| `/dashboard` | `ClientDashboard` | Client resource browser |
| `/submit-ticket` | `FallbackTicketForm` | Standalone ticket form |
| `/widget-host` | `WidgetHostPage` | Widget embed host / preview container |

#### Authenticated Agent Routes (`/agent/*`)

| URL Pattern | Component | Description |
|-------------|-----------|-------------|
| `/agent/dashboard` | `Dashboard` | Metrics dashboard with charts and KPIs |
| `/agent/tickets/queue` | `InboundQueue` | Primary ticket queue — all unassigned/new tickets |
| `/agent/tickets/mine` | `InboundQueue` | My assigned tickets |
| `/agent/tickets/escalated` | `InboundQueue` | Escalated tickets |
| `/agent/tickets/waiting` | `InboundQueue` | Waiting on customer |
| `/agent/tickets/resolved` | `InboundQueue` | Resolved archive |
| `/agent/tickets/sessions` | `SupportSessions` | Live support session tracker |
| `/agent/tickets/:id/:tab` | `TicketDetail` | Ticket deep-dive (summary, messages, timeline) |
| `/agent/clients` | `ClientMasterList` | Client directory |
| `/agent/clients/:id/:tab` | `ClientDetail` | Client detail (overview, contacts, hardware, AMCs) |
| `/agent/hardware` | `HardwareMasterList` | Hardware asset registry |
| `/agent/projects` | `ProjectMasterList` | Project directory |
| `/agent/projects/:id/:tab` | `ProjectDetail` | Project detail (overview, docs, FAQs, runbooks, Julia, members) |
| `/agent/reports/overview` | `Reports` | Summary analytics |
| `/agent/reports/tickets` | `TicketReport` | Detailed ticket reporting / export |
| `/agent/account` | `AccountPage` | User profile / password change |

### 7.2 Component Architecture

```
src/
├── components/
│   ├── widget/          ChatWidget (Julia AI floating widget + support session forms)
│   ├── entities/        Reusable entity panels (ClientCrudPanel, ProjectCrudPanel,
│   │                    HardwareAssetCrudPanel, etc.)
│   └── layout/          PageHeader, DataToolbar, PaginationControls
├── contexts/            ModalContext, RoleContext (auth state), ToastContext
├── hooks/               useAsyncData, useResolvedWidgetKey
├── layouts/             AgentLayout, ClientLayout, SectionRouteLayout
├── lib/
│   ├── api.ts           apiFetch() wrapper with auto token refresh
│   ├── config.ts        API_BASE_URL, storage keys
│   ├── types.ts         TypeScript interfaces for all API responses
│   ├── navigation.ts    Centralized route path builders (appPaths)
│   ├── widgetRuntime.ts Widget key resolution and header helpers
│   ├── drafts.ts        Local draft persistence helpers
│   ├── format.ts        Date/number formatting utilities
│   └── tableSort.ts     Sortable table column helpers
└── pages/               See route map above
```

### 7.3 API Client (`lib/api.ts`)

The frontend uses a custom `apiFetch<T>()` wrapper that:

1. Prepends `VITE_API_BASE_URL` to all paths
2. Sets `Authorization: Bearer <token>` from `localStorage` (when `auth: true`)
3. Sends `credentials: 'include'` for cookie-based refresh tokens
4. **Auto-retries on 401**: If a request returns 401, it calls `/api/auth/refresh`, gets a new access token, stores it, and retries the original request exactly once
5. Dispatches custom events (`atc-auth-refreshed`, `atc-auth-expired`) for the `RoleContext` to react to

---

## 8. Julia AI Engine

### How Julia Works

Julia is powered by the **Groq API** using the **Llama 3.1 8B Instant** model. It operates in two modes:

#### Mode 1: Project-Widget Chat (`generateJuliaReply`)
- Triggered via `/api/widget/:widgetKey/chat`
- Context: Published **ProjectDocs** + global **Runbooks**
- Uses keyword scoring to rank the most relevant docs/runbooks for the current user message
- Max 2 context items per section, 900 chars each, 2400 chars per section total
- Conversation window: last 6 messages, 500 chars each

#### Mode 2: Support Session Chat (`generateSupportSessionReply`)
- Triggered via `/api/support/sessions/:id/message`
- Context: **SupportTopics** (scoped by client, project, hardware) + **ProjectDocs** + global **Runbooks**
- Support topics are filtered by `supportType` match and hierarchical scoping
- Includes hardware asset metadata (category, brand, model, serial number) in the system prompt

### System Prompt Structure

```
1. Identity and behavioral rules
2. Project/session context metadata
3. [Ranked] Support Topics (title + content)
4. [Ranked] Project Documents (title + content)
5. [Ranked] Runbooks (title + content)
```

### Configuration Knobs (per Project)

| Field | Purpose |
|-------|---------|
| `juliaGreeting` | Preferred first-message greeting |
| `juliaFallbackMessage` | Used when context is insufficient or LLM errors out |
| `juliaEscalationHint` | Appended to fallback to guide the user toward human escalation |

### Julia Readiness

A project is considered "Julia ready" when it has:
- At least 1 published ProjectDoc
- The GROQ_API_KEY environment variable is configured
- Widget is enabled

---

## 9. Email Integration

### Outbound Emails

Emails are sent automatically on ticket lifecycle events:

| Event | Subject Pattern | Trigger |
|-------|----------------|---------|
| Ticket Created | `We received your support request (TKT-XXX) [ATC:token]` | Widget/form ticket creation |
| Agent Reply | `Update on <title> (TKT-XXX) [ATC:token]` | Agent posts a REPLY message |
| Waiting on Customer | `We need more information on your ticket (TKT-XXX) [ATC:token]` | Agent marks waiting |
| Ticket Resolved | `Your ticket has been resolved (TKT-XXX) [ATC:token]` | Agent resolves ticket |
| Ticket Reopened | `Your ticket has been reopened (TKT-XXX) [ATC:token]` | Agent reopens ticket |

### Inbound Email Processing

1. Email provider forwards replies to `POST /api/email/inbound` (secured by `INBOUND_EMAIL_SECRET`)
2. System extracts thread token from subject pattern `[ATC:<token>]`
3. Matches token to a ticket via `emailThreadToken` field
4. Validates sender email against ticket requester
5. Creates a `TicketMessage` (type: REPLY) with the email body
6. Auto-transitions ticket status:
   - `WAITING_ON_CUSTOMER` → `IN_PROGRESS`
   - `RESOLVED` → `REOPENED`
7. Creates in-app notifications for assigned agent and project specialist

### Email Behavior Without SMTP

When `SMTP_HOST` is empty, the mailer operates in **LOG mode** — emails are logged to stdout with status `LOGGED` but not actually sent. This is the default for development.

---

## 10. Environment Variables

### Backend (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | HTTP listen port |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Comma-separated allowed origins, or `*` for all |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/dbname?schema=public`) |
| `JWT_SECRET` | **Yes** | — | ≥16 character secret for signing JWT tokens |
| `GROQ_API_KEY` | No | `""` | Groq API key for Julia AI (empty = Julia disabled) |
| `GROQ_MODEL` | No | `llama-3.1-8b-instant` | LLM model identifier |
| `MAIL_FROM_EMAIL` | No | `support@localhost` | Outbound sender address |
| `MAIL_FROM_NAME` | No | `ATC Support` | Outbound sender display name |
| `SMTP_HOST` | No | `""` | SMTP server (empty = log-only mode) |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_SECURE` | No | `false` | TLS enabled |
| `SMTP_USER` | No | `""` | SMTP auth username |
| `SMTP_PASS` | No | `""` | SMTP auth password |
| `INBOUND_EMAIL_SECRET` | No | `atc_dev_inbound_secret` | Shared secret for inbound email webhook |

### Frontend (`.env.production`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | **Yes** | Full backend API URL (e.g., `http://192.168.10.12:3001/api`) |
| `VITE_WIDGET_KEY` | **Yes** | Default widget key — `general` for general support, or a project's unique `widgetKey` |

---

## 11. Project File Structure

```
ATC_Support/
├── ATC_Support_Backend/
│   ├── .env                        # Runtime environment (NOT committed)
│   ├── .env.example                # Template for new environments
│   ├── ecosystem.config.cjs        # PM2 config (legacy — use NSSM)
│   ├── package.json                # Dependencies and scripts
│   ├── tsconfig.json               # TypeScript compiler config
│   ├── prisma.config.ts            # Prisma configuration
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema (source of truth)
│   │   ├── migrations/             # 9 SQL migration files
│   │   └── seed/                   # Database seeder (small.ts = demo data)
│   ├── src/
│   │   ├── index.ts                # Express app: routes, middleware, error handlers
│   │   ├── config/
│   │   │   └── env.ts              # Zod-validated environment variables
│   │   ├── lib/
│   │   │   └── prisma.ts           # Prisma client singleton
│   │   ├── middleware/
│   │   │   ├── auth.ts             # JWT bearer token validation
│   │   │   ├── role.ts             # Role-based access control
│   │   │   ├── validate.ts         # Zod request body validation
│   │   │   ├── requestContext.ts   # Request ID generation
│   │   │   └── requestLogger.ts    # Structured JSON request logging
│   │   ├── routes/                 # 24 route modules
│   │   │   ├── auth.ts             # Login, refresh, logout, change password
│   │   │   ├── tickets.ts          # Full ticket CRUD + workflow actions
│   │   │   ├── widget.ts           # Public widget API (FAQs, chat, escalate)
│   │   │   ├── support.ts          # General support context + sessions
│   │   │   └── ... (20 more)
│   │   ├── services/
│   │   │   ├── julia.ts            # LLM integration (Groq SDK)
│   │   │   ├── mailer.ts           # SMTP email sending
│   │   │   ├── notifications.ts    # In-app notification creation
│   │   │   ├── ticketEmails.ts     # Ticket email lifecycle (outbound + inbound)
│   │   │   └── tickets.ts          # Ticket creation business logic
│   │   ├── types/
│   │   │   └── auth.ts             # AuthenticatedUser type
│   │   └── utils/                  # 12 utility modules
│   │       ├── access.ts           # Ticket scope/access control
│   │       ├── serializers.ts      # API response serialization
│   │       ├── session.ts          # JWT sign/verify, cookie helpers
│   │       ├── userModel.ts        # User select fields, assignment checks
│   │       ├── widgetAccess.ts     # Widget key validation, origin checking
│   │       └── ... (7 more)
│   ├── dist/                       # Compiled JS (served by NSSM)
│   ├── logs/                       # NSSM-redirected stdout.log, stderr.log
│   └── uploads/                    # Ticket attachment file storage
│
├── ATC_Support_Frontend/
│   ├── .env.example                # Template
│   ├── .env.production             # Production env vars (baked into build)
│   ├── vite.config.ts              # Vite + Tailwind + React plugin config
│   ├── index.html                  # SPA entry HTML
│   ├── package.json
│   ├── tsconfig.json
│   ├── public/                     # Static assets (copied as-is to dist)
│   ├── src/                        # See Component Architecture (§7.2)
│   └── dist/                       # Production build → deploy to IIS
│
└── Docs/                           # This documentation
```

---

*End of Technical Documentation*

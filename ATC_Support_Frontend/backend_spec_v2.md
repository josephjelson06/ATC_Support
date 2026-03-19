# ATC Support Backend — Final Specification (v2)

## Overview

Backend for a small IT consultancy's support platform. The **core product is a chat widget** embedded in each client project's website. The widget provides **3 layers of support**:

1. **FAQs** (static, non-AI) — project-specific
2. **Julia AI** (LLM chat using that project's KB + docs as context)
3. **Human escalation** (creates a ticket for SE/PL to resolve)

Internally, a **Support Engineer** triages all tickets and **Project Leads** handle escalations for their own projects.

---

## Team Structure

| Role | Count | Responsibility |
|---|---|---|
| **Project Manager (PM)** | 1 | Admin — manages clients, projects, users, KB. Does NOT handle tickets. |
| **Project Lead (PL)** | 10–15 | Each owns one project. Handles escalated tickets for their project. |
| **Support Engineer (SE)** | 1 | First responder — sees all tickets, resolves or escalates to PL. |

---

## Human-Readable IDs

All entities use **auto-increment integers** with human-readable prefixes for display:

| Entity | Format | Example |
|---|---|---|
| Client | `CLT-001` | CLT-042 |
| Project | `PRJ-001` | PRJ-007 |
| Ticket | `TKT-001` | TKT-1234 |
| User | `USR-001` | USR-003 |
| Runbook | `RB-001` | RB-015 |
| AMC | `AMC-001` | AMC-008 |

> [!NOTE]
> DB stores integer `id`. The prefix is generated at display time (API response or frontend). No UUIDs anywhere.

---

## Roles & Permissions

| Resource | Project Manager | Project Lead | Support Engineer |
|---|---|---|---|
| **Clients + Sub-data** | CRUD | Read | Read |
| **Projects** | CRUD | Read (own) | Read |
| **Project Docs** | CRUD | CRUD (own project) | CRUD |
| **KB (Runbooks)** | CRUD | CRUD | CRUD |
| **FAQs** | CRUD | CRUD (own project) | CRUD |
| **Users** | CRUD | Read | Read |
| **Tickets** | Read | Read + Update (own project) | Read + Update (any) |
| **Ticket Messages** | Read | Create + Read (own project) | Create + Read |
| **Chat Sessions** | Read | Read (own project) | Read |
| **Dashboard** | Global counts | Own project counts | Own counts |

> [!IMPORTANT]
> - **Tickets are NEVER created by any internal role.** They only come from widget escalation.
> - **No ticket deletion** by any role.
> - PM can view tickets/chats but cannot reply or change status.

---

## The Widget — Core Product

### How It Works

Each **project** gets a unique **widget key** (generated when project is created). The client embeds a `<script>` tag with this key on their website. The widget is project-scoped — FAQs and Julia AI only use **that project's** runbooks + project docs as context.

### 3-Layer Support Flow

```
Client opens widget
       │
       ▼
 LAYER 1: FAQs (static, non-AI)
 Show project-specific FAQ list
       │
       ├── FAQ resolves issue → Done ✅
       │
       ▼
 LAYER 2: Julia AI Chat
 Client types question → Julia AI responds
 (uses project's KB + docs as context)
 Chat history is ALWAYS recorded
       │
       ├── Julia resolves issue → Done ✅
       │
       ▼
 LAYER 3: Escalate to Human
 Client clicks "Talk to a human"
 → Ticket is created (linked to chat session)
 → SE sees it in queue
```

### What Gets Collected

| Data | When | Stored In |
|---|---|---|
| **Chat session** | Every Julia AI conversation | `chat_sessions` + `chat_messages` |
| **Ticket** | Only on escalation | `tickets` + `ticket_messages` |
| **Client identity** | When they start chatting | `chat_sessions` (name, email) |

> [!NOTE]
> Feedback/ratings are **out of scope** for now. Can be added later.

---

## Ticket Flow (Post-Escalation)

```
Widget escalates → Ticket created (status: NEW)
                   Chat session linked to ticket
        │
        ▼
  SE sees it in Inbound Queue
        │
        ├── SE assigns to self → ASSIGNED → works → RESOLVED ✅
        │
        └── SE escalates → assigned_to changes to PL
                                │
                                └── PL works → RESOLVED ✅
```

### Ticket Statuses
```
NEW → ASSIGNED → IN_PROGRESS → RESOLVED
                      │
                      └── ESCALATED → IN_PROGRESS → RESOLVED
```

---

## Database Schema (~14 tables)

> [!NOTE]
> Columns listed are **core/minimal**. They will evolve over time. Keep the schema lean — don't over-engineer fields that aren't needed today.

```
users
  id (int, auto), name, email, password_hash, role (PM|PL|SE), status, created_at

clients
  id (int, auto), name, industry, status, created_at

client_contacts
  id, client_id (FK), name, email, phone, designation

consignees
  id, client_id (FK), name, address

consignee_contacts
  id, consignee_id (FK), name, email, phone, designation

amcs
  id, client_id (FK), project_id (FK), hours_included, hours_used, start_date, end_date, status

projects
  id (int, auto), client_id (FK), assigned_to (FK → users.id → the PL),
  name, description, widget_key (unique, auto-generated), status, created_at

tickets
  id (int, auto), project_id (FK), chat_session_id (FK, nullable),
  title, description, priority (LOW|MEDIUM|HIGH|CRITICAL),
  status (NEW|ASSIGNED|IN_PROGRESS|ESCALATED|RESOLVED),
  assigned_to (FK → users.id, nullable), created_at, resolved_at

ticket_messages
  id, ticket_id (FK), user_id (FK, nullable for system), content,
  type (REPLY|INTERNAL_NOTE|SYSTEM), created_at

chat_sessions
  id, project_id (FK), client_name, client_email,
  status (ACTIVE|ENDED|ESCALATED), created_at, ended_at

chat_messages
  id, chat_session_id (FK), role (USER|JULIA), content, created_at

faqs
  id, project_id (FK), question, answer, sort_order, created_at

runbooks
  id (int, auto), title, content (markdown), category,
  created_by (FK), created_at, updated_at

project_docs
  id, project_id (FK), title, content (markdown),
  created_by (FK), created_at, updated_at
```

---

## API Endpoints

### Auth (2)
```
POST   /api/auth/login              → { email, password } → { token, user }
GET    /api/auth/me                 → current user from token
```

---

### Widget — Public (identified by widget_key, no JWT) (5)
```
GET    /api/widget/:widgetKey/faqs           → project-specific FAQ list
POST   /api/widget/:widgetKey/chat/start     → start session → { sessionId }
POST   /api/widget/:widgetKey/chat/message   → { sessionId, message } → Julia AI response
POST   /api/widget/:widgetKey/escalate       → { sessionId, name, email, title } → creates ticket
GET    /api/widget/:widgetKey/chat/:sessionId → get chat history (for resuming)
```

> [!IMPORTANT]
> Widget endpoints use `widget_key` (not project ID) to prevent exposing internal IDs. Julia AI scopes its context to that project's runbooks + project docs only.

---

### Users (4) — PM only for CUD
```
GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id
```

### Clients (4) — PM only for CUD
```
GET    /api/clients
GET    /api/clients/:id
POST   /api/clients
PATCH  /api/clients/:id
DELETE /api/clients/:id
```

### Client Contacts (4) — PM only for CUD
```
GET    /api/clients/:id/contacts
POST   /api/clients/:id/contacts
PATCH  /api/contacts/:id
DELETE /api/contacts/:id
```

### Consignees (4) — PM only for CUD
```
GET    /api/clients/:id/consignees
POST   /api/clients/:id/consignees
PATCH  /api/consignees/:id
DELETE /api/consignees/:id
```

### Consignee Contacts (4) — PM only for CUD
```
GET    /api/consignees/:id/contacts
POST   /api/consignees/:id/contacts
PATCH  /api/consignee-contacts/:id
DELETE /api/consignee-contacts/:id
```

### AMCs (4) — PM only for CUD
```
GET    /api/clients/:id/amcs
POST   /api/clients/:id/amcs
PATCH  /api/amcs/:id
DELETE /api/amcs/:id
```

### Projects (4) — PM only for CUD
```
GET    /api/projects
GET    /api/projects/:id
POST   /api/projects               → auto-generates widget_key
PATCH  /api/projects/:id
DELETE /api/projects/:id
```

---

### Tickets (4) — Widget creates, SE/PL update
```
GET    /api/tickets                 → SE: all, PL: own project, PM: all (read-only)
GET    /api/tickets/:id             → detail with messages + linked chat session
POST   /api/tickets                 → ** WIDGET ONLY ** (called via escalate endpoint)
PATCH  /api/tickets/:id             → assign, change status, escalate
```

### Ticket Messages (2) — SE/PL only
```
GET    /api/tickets/:id/messages
POST   /api/tickets/:id/messages    → reply or internal note
```

### Chat Sessions (2) — Read-only for internal users
```
GET    /api/chat-sessions           → PL: own project, PM: all
GET    /api/chat-sessions/:id       → session detail with all messages
```

---

### FAQs (4) — Per-project, CRUD by all roles
```
GET    /api/projects/:id/faqs
POST   /api/projects/:id/faqs
PATCH  /api/faqs/:id
DELETE /api/faqs/:id
```

### Runbooks / KB (4) — Global, CRUD by all roles
```
GET    /api/runbooks
GET    /api/runbooks/:id
POST   /api/runbooks
PATCH  /api/runbooks/:id
DELETE /api/runbooks/:id
```

### Project Docs (4) — Per-project, CRUD by all roles
```
GET    /api/projects/:id/docs
POST   /api/projects/:id/docs
PATCH  /api/docs/:id
DELETE /api/docs/:id
```

---

### Dashboard (1)
```
GET    /api/dashboard/stats
```

**Returns (counts only):**
- **PM**: total clients, total projects, total open tickets, total resolved tickets, total runbooks
- **PL**: open tickets (my project), resolved tickets (my project), total docs + FAQs (my project)
- **SE**: unassigned tickets, my open tickets, my resolved tickets

### Reports (1)
```
GET    /api/reports/tickets         → filters: date range, project, status
```

---

## Summary

| | Count |
|---|---|
| **Tables** | 14 |
| **API Endpoints** | 53 |
| **Roles** | 3 |
| **Widget Endpoints** | 5 (public, no JWT) |
| **Complex Logic** | Ticket escalation + Julia AI context scoping |
| **IDs** | Integer auto-increment, human-readable prefixes on display |

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| Validation | Zod |
| AI | Gemini API (for Julia, called server-side with project-scoped context) |

## Out of Scope (For Now)

- ❌ Feedback / ratings
- ❌ AI-generated runbooks
- ❌ Integrations (Slack, Jira, etc.)
- ❌ File attachments
- ❌ Multiple SEs / load balancing
- ❌ Average/historical metrics
- ❌ SLA tracking
- ❌ Service codes / billing

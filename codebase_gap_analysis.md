# Codebase Analysis — What's Built vs What's Planned

> **This document compares the existing prototype against the system design docs to identify what exists, what's missing, and what needs to change.**

### Codebase Stats (from Repomix)

| | Backend | Frontend |
|---|---|---|
| **Files** | 40 | 62 |
| **Tokens** | 28,122 | 110,489 |
| **Characters** | 115,521 | 446,663 |
| **Largest file** | `migration.sql` (2,945 tokens) | [ChatWidget.tsx](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Frontend/src/components/widget/ChatWidget.tsx) (5,697 tokens) |

---

## ⚠️ Critical Finding: Tech Stack Mismatch

The prototype was built with a **different tech stack** than what was planned:

| Layer | Planned (from Docs) | Built (Prototype) | Impact |
|---|---|---|---|
| **Backend** | Python / FastAPI | Node.js / Express / TypeScript | **Major** — Julia's AI pipeline planning assumed Python ecosystem |
| **ORM** | SQLAlchemy (async) | Prisma | Moderate — Prisma is solid but different migration approach |
| **LLM** | Ollama (local, CPU) | Groq Cloud API | **Major** — data leaves the server, API costs, depends on internet |
| **RAG Pipeline** | pgvector + sentence-transformers | None — sends raw docs as context | **Major** — no embedding, no vector search, no confidence scoring |
| **IDs** | UUID v4 | Auto-increment integers | Minor — works fine for MVP |
| **Roles** | 5 (SE1, SE2, SE3, PM, Director) | 3 (SE, PL, PM) | Moderate — simpler but no escalation ladder |
| **Frontend** | React + Vite + Shadcn/ui | React + Vite + **Tailwind v4** (custom) | Minor — custom Tailwind components instead of Shadcn/ui. Tailwind v4 is latest |
| **Auth UI** | Login page with JWT flow | **Demo role-switcher** (sidebar dropdown) | **Major** — no real login page. Role is selected via dropdown, auto-matches to seed user |
| **Email** | Resend (outbound + inbound webhook) | Not implemented | Expected — Phase 5 feature |
| **File Storage** | Cloudflare R2 | Not implemented | Expected — Phase 5 feature |

> [!IMPORTANT]
> **Decision Required:** Do you continue with the Node.js/Express stack, or rebuild in Python/FastAPI as planned? This affects whether Julia can use local Ollama, pgvector, and sentence-transformers natively.

---

## Database Schema — Built vs Planned

### Models that EXIST (12 models in Prisma)

| # | Prisma Model | Maps to Planned Table | Status | Gaps |
|---|---|---|---|---|
| 1 | `User` | `users` | ✅ Built | Missing: `first_login`, `phone`. Roles are PM/PL/SE (not SE1/SE2/SE3/PM/Director) |
| 2 | `Client` | `clients` | ✅ Built | Missing: `city`, `address`, `phone`, `email`, `website`, `notes` |
| 3 | `ClientContact` | `contact_persons` | ✅ Built | Missing: `is_primary`, `status` |
| 4 | `Consignee` | `consignees` | ✅ Built | Missing: `city`, `state` (has `address` only) |
| 5 | `ConsigneeContact` | — | ⚠️ Extra | Not in planned schema — contacts at site level vs client level |
| 6 | [Project](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/widget.ts#33-55) | `projects` | ✅ Built | Has `widgetKey`. Missing: `widget_enabled` toggle, `description` is optional |
| 7 | `Amc` | `amcs` | ✅ Built | Different model: has `hoursIncluded`/`hoursUsed` (hour-based, not date-based). Missing: `contract_number`, `document_url` |
| 8 | `Ticket` | `tickets` | ✅ Built | Missing: `ticket_number` (TKT-XXXX), `current_level`, `source`, `resolution_summary`, `contact_id`, `client_id` references |
| 9 | `TicketMessage` | `ticket_messages` | ✅ Built | Missing: `author_type` (se/client/system), `message_type` variations (call_log) |
| 10 | `ChatSession` | `widget_sessions` | ✅ Built | Missing: `contact_id`, `resolution_layer`, `resolved` flag |
| 11 | `ChatMessage` | `widget_session_messages` | ✅ Built | Missing: `confidence_score`, `llm_latency_ms`, `message_index` |
| 12 | `Faq` | — | ⚠️ Different | In planned schema, FAQs are KB articles with `audience: julia`. Here they're a separate table with Q&A pairs |
| 13 | `Runbook` | — | ⚠️ Different | In planned schema, these are `julia_rulebooks`. Here they're generic knowledge docs |
| 14 | `ProjectDoc` | `kb_articles` | ⚠️ Partial | Similar concept but missing: `audience`, `status` (draft/published), `tags`, `embedding` vector, `category` |

### Tables that DON'T EXIST yet (Planned but not built)

| # | Planned Table | Purpose | Sprint |
|---|---|---|---|
| 1 | `project_consignees` | Junction: project ↔ consignee | Sprint 2 |
| 2 | `amc_projects` | Junction: AMC ↔ multiple projects | Sprint 2 |
| 3 | `julia_configs` | Per-project Julia settings (tone, threshold) | Sprint 3 |
| 4 | `julia_rulebooks` | Trigger-action rules for Julia | Sprint 3 (Phase 2) |
| 5 | `kb_articles` (with embeddings) | Full KB with vector embeddings | Sprint 3 |
| 6 | `escalation_history` | Escalation tracking (from → to) | Sprint 5 |
| 7 | `ticket_attachments` | File attachments on tickets | Sprint 5 |
| 8 | `ticket_feedback` | Client satisfaction rating | Sprint 5 (Phase 2) |
| 9 | `notifications` | In-app notification system | Sprint 6 |
| 10 | `email_templates` | Configurable email templates | Sprint 5 (Phase 2) |
| 11 | `canned_responses` | Pre-written SE replies | Sprint 5 (Phase 2) |
| 12 | `audit_logs` | Action history tracking | Phase 2 |

---

## Backend API Routes — Built vs Planned

### Routes that EXIST (17 route files)

| # | Route File | Endpoints | Status | Gaps vs Plan |
|---|---|---|---|---|
| 1 | [auth.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/auth.ts) | POST `/login`, GET `/me` | ⚠️ Partial | Missing: logout, refresh token, password reset, change password |
| 2 | [users.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/users.ts) | CRUD | ✅ Basic | Missing: status toggle, password reset by PM |
| 3 | [clients.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/clients.ts) | GET list, GET detail, POST, PATCH, DELETE | ✅ Good | Missing: search/filter query params |
| 4 | [clientContacts.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/clientContacts.ts) | CRUD nested under client | ✅ Good | Missing: `is_primary` logic |
| 5 | [consignees.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/consignees.ts) | CRUD nested under client | ✅ Good | — |
| 6 | [consigneeContacts.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/consigneeContacts.ts) | CRUD nested under consignee | ⚠️ Extra | Not in planned architecture |
| 7 | [projects.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/projects.ts) | CRUD | ✅ Good | Missing: widget toggle endpoint, widget-token endpoint |
| 8 | [amcs.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/amcs.ts) | CRUD | ✅ Good | Missing: project linking, expiring AMCs query |
| 9 | [tickets.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/tickets.ts) | POST (public), GET list, GET detail, PATCH | ✅ Good | Missing: reply, note, call-log, escalate, resolve, merge, assign, feedback as separate endpoints |
| 10 | [ticketMessages.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/ticketMessages.ts) | CRUD for messages | ✅ Good | Messages exist but not separated into reply/note/call-log types |
| 11 | [widget.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/widget.ts) | GET FAQs, POST start, POST message, POST escalate, GET session | ✅ Good | Core widget flow works |
| 12 | [chatSessions.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/chatSessions.ts) | List and detail | ✅ Basic | Missing: filters, transcript viewer |
| 13 | [faqs.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/faqs.ts) | CRUD | ✅ Basic | Different from planned KB articles approach |
| 14 | [runbooks.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/runbooks.ts) | CRUD | ✅ Basic | Different from planned julia_rulebooks |
| 15 | [projectDocs.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/projectDocs.ts) | CRUD | ✅ Basic | Serves as proto-KB but no embeddings/audience/status |
| 16 | [dashboard.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/dashboard.ts) | Stats by role | ✅ Good | Role-specific stats are working |
| 17 | [reports.ts](file:///c:/Users/josep/Desktop/ATC_Support/ATC_Support_Backend/src/routes/reports.ts) | Ticket report with filters | ⚠️ Basic | Only ticket listing with date filter. No aggregated reports |

### Routes that DON'T EXIST (Planned but not built)

| # | Planned Route | Purpose | Sprint |
|---|---|---|---|
| 1 | `POST /api/auth/logout` | JWT invalidation | Sprint 1 |
| 2 | `POST /api/auth/refresh` | Token refresh | Sprint 1 |
| 3 | `POST /api/auth/password-reset` | Reset via email | Phase 2 |
| 4 | KB Articles API (7 endpoints) | Full KB with publish/embed workflow | Sprint 3 |
| 5 | Julia Config API (8 endpoints) | Per-project AI config + rulebooks | Sprint 3 |
| 6 | Ticket lifecycle endpoints | Reply, Note, Call-log, Escalate, Resolve, Merge, Assign | Sprint 5 |
| 7 | Email Webhook (`POST /api/email/inbound`) | Inbound email parsing | Sprint 5 |
| 8 | Files API (upload/download) | R2 file storage | Sprint 5 |
| 9 | Notifications API (3 endpoints) | In-app notifications | Sprint 6 |
| 10 | Full Reports API (5 endpoints) | Aggregated reports | Sprint 6 / Phase 2 |

---

## Frontend Pages — Built vs Planned

### Pages that EXIST (35+ components)

| Section | Pages | Status |
|---|---|---|
| **Client-facing** | ClientLanding, ClientDashboard, FallbackTicketForm | ✅ Built |
| **Agent - Core** | Dashboard, InboundQueue (ticket queue), TicketDetail | ✅ Built |
| **Agent - Data** | ClientMasterList, ClientDetail, ProjectMasterList, ProjectDetail | ✅ Built |
| **Agent - Reports** | Reports list, TicketReport | ✅ Built |
| **Agent - Dashboards** | DirectorDashboard, ProjectLeadDashboard, PMDashboard, SEDashboard | ✅ Built |
| **KB** | RunbookLibrary, RunbookEditor, ReviewQueue, AutoDraftDetail | ✅ Built |
| **Analytics** | Overview, TicketAnalytics, KBAnalytics, EngineerPerformance | ✅ Built |
| **Settings** | General, UserManagement, ServiceCodes | ✅ Built |
| **Widget** | ChatWidget component | ✅ Built |
| **Layout** | Sidebar, Topbar | ✅ Built |
| **Components** | ClientCrudPanel, ProjectCrudPanel | ✅ Built |

### Frontend features MISSING

| # | Feature | Sprint |
|---|---|---|
| 1 | Login / Auth flow (separate login page, JWT handling) | Sprint 1 |
| 2 | AMC List + Detail pages | Sprint 2 |
| 3 | KB Article Editor (with audience, publish workflow) | Sprint 3 |
| 4 | Julia Config page (per-project) | Sprint 3 |
| 5 | Widget toggle + embed code display | Sprint 4 |
| 6 | Ticket reply/note/call-log UI in TicketDetail | Sprint 5 |
| 7 | Escalation UI (select target SE, add note) | Sprint 5 |
| 8 | Notification bell + dropdown | Sprint 6 |

---

## Julia AI — Built vs Planned

| Aspect | Planned | Built | Gap |
|---|---|---|---|
| **LLM Provider** | Ollama (local, CPU, Llama 3.1 8B) | Groq Cloud API | Data leaves server. Depends on internet. API costs |
| **Context Source** | pgvector similarity search on KB articles | Raw project docs + runbooks injected into prompt | No relevance ranking. All docs sent every time (up to 14K chars). Wasteful |
| **Embedding** | sentence-transformers (all-MiniLM-L6-v2, 384-dim) | None | No vector search. Top-5 article retrieval doesn't exist |
| **Confidence Scoring** | Multi-factor score (similarity + article count + specificity) | None | Julia can't know if she's confident — no fallback mechanism |
| **Rulebooks** | Keyword triggers → skip RAG, execute action | None | No emergency detection, no special handling |
| **Per-project Config** | Persona, tone, threshold, greeting, fallback message | Hardcoded system prompt | Every project gets same Julia behavior |
| **Session Logging** | Confidence scores, articles used, LLM latency per message | Only message content stored | No diagnostic data for PM review |
| **Conversation History** | Redis-cached session, PostgreSQL archive | Full conversation loaded from DB each message | Works but no optimization |

---

## Summary: What Percentage Is Done?

### By Sprint (against the plan)

| Sprint | Planned | Built | % | Notes |
|---|---|---|---|---|
| **Sprint 1: Foundation** | DB, Auth, Users | Schema exists, basic auth, users CRUD | **60%** | Missing: logout, refresh, password change, proper login page |
| **Sprint 2: Client/Project CRUD** | Clients, Contacts, Consignees, Projects, AMCs | All CRUD routes exist | **75%** | Missing: AMC multi-project linking, some fields on Client/Contact |
| **Sprint 3: KB + Julia** | KB articles, embeddings, RAG pipeline, Julia config | ProjectDocs + Groq-based Julia (no RAG) | **30%** | Julia works but without RAG, embeddings, configs, or confidence |
| **Sprint 4: Widget + Tickets** | Widget UI, ticket creation | Widget flow works, ticket creation works | **65%** | Missing: AMC check on escalation, widget toggle |
| **Sprint 5: Ticket Lifecycle + Email** | Reply, note, escalate, email in/out | Basic ticket messages exist, no email | **25%** | Missing: typed messages, escalation chain, all email functionality |
| **Sprint 6: Polish + Deploy** | Dashboards, notifications, deploy | Role-based dashboards exist | **30%** | Missing: notifications, proper deploy setup |

### Overall MVP Progress: **~45%**

---

## Recommended Next Steps

> [!WARNING]
> The biggest decision is: **Keep Node.js or switch to Python/FastAPI?**
>
> - **Keep Node.js:** Faster path (code exists). But Julia's RAG pipeline will need a Python sidecar or JS-native embedding library. pgvector still works from Node.js via Prisma.
> - **Switch to Python:** Aligns with planned architecture. Native access to sentence-transformers, Ollama, and pgvector. But means rewriting the backend.

**If keeping Node.js, the priority order is:**

1. **Strengthen Auth** — add logout, refresh, password change
2. **Enrich schema** — add missing fields to Client, Contact, Ticket
3. **Build the RAG pipeline** — add pgvector, embeddings (via `@xenova/transformers` for JS or Python sidecar), confidence scoring
4. **Add ticket lifecycle** — separate message types, escalation, status transitions
5. **Add email** — Resend outbound + inbound webhook
6. **Add notifications** — in-app notification system

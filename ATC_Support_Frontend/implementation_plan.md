# ATC Support Backend — Implementation Plan

> Reference: [backend_spec.md](file:///C:/Users/josep/.gemini/antigravity/brain/23b12261-2f45-4296-97c3-3a5fbb9a0616/backend_spec.md) for full specification.

## Project Location

New directory: `c:\Users\josep\Desktop\ATC_Support_Backend\`

## Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Runtime | Node.js | LTS (20+) |
| Framework | Express | 4.x |
| Database | PostgreSQL | 15+ (local install required) |
| ORM | Prisma | Latest |
| Auth | JWT (jsonwebtoken) + bcrypt | — |
| Validation | Zod | — |
| AI | @google/genai (Gemini API) | — |
| Dev | tsx (for running TS directly), nodemon | — |

## Folder Structure

```
ATC_Support_Backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── index.ts                  (Express app entry)
│   ├── config/
│   │   └── env.ts                (env vars, JWT secret, Gemini key)
│   ├── middleware/
│   │   ├── auth.ts               (JWT verify, attach user to req)
│   │   ├── role.ts               (requireRole('PM', 'PL', 'SE'))
│   │   └── validate.ts           (Zod schema validation middleware)
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── clients.ts
│   │   ├── clientContacts.ts
│   │   ├── consignees.ts
│   │   ├── consigneeContacts.ts
│   │   ├── amcs.ts
│   │   ├── projects.ts
│   │   ├── tickets.ts
│   │   ├── ticketMessages.ts
│   │   ├── runbooks.ts
│   │   ├── projectDocs.ts
│   │   ├── faqs.ts
│   │   ├── chatSessions.ts
│   │   ├── widget.ts             (public endpoints, no JWT)
│   │   ├── dashboard.ts
│   │   └── reports.ts
│   ├── services/
│   │   └── julia.ts              (Gemini AI — context builder + chat)
│   └── utils/
│       ├── idPrefix.ts           (CLT-001 display formatting)
│       └── widgetKey.ts          (generate unique widget keys)
├── .env
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## Phase 1: Foundation

### 1.1 Project Initialization
- `npm init`, install dependencies (express, prisma, @prisma/client, jsonwebtoken, bcrypt, zod, cors, @google/genai, dotenv)
- Dev deps: typescript, tsx, @types/*, nodemon
- `tsconfig.json` setup
- `.env` with `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`

### 1.2 Prisma Schema (All 14 Tables)
- [NEW] `prisma/schema.prisma` — all models from spec
- Enums: `Role (PM, PL, SE)`, `TicketStatus (NEW, ASSIGNED, IN_PROGRESS, ESCALATED, RESOLVED)`, `TicketPriority (LOW, MEDIUM, HIGH, CRITICAL)`, `ChatSessionStatus (ACTIVE, ENDED, ESCALATED)`, `MessageType (REPLY, INTERNAL_NOTE, SYSTEM)`, `ChatRole (USER, JULIA)`
- Relations: client → contacts, consignees; consignee → contacts; client → AMCs, projects; project → tickets, docs, FAQs, chat_sessions; ticket → messages, chat_session
- Run `npx prisma migrate dev` to create DB

### 1.3 Express Server Setup
- [NEW] `src/index.ts` — Express app, cors, JSON body parser, route mounting, error handler
- [NEW] `src/config/env.ts` — read env vars with defaults

### 1.4 Auth System
- [NEW] `src/middleware/auth.ts` — JWT verification, attaches `req.user`
- [NEW] `src/middleware/role.ts` — `requireRole(...roles)` middleware
- [NEW] `src/middleware/validate.ts` — Zod middleware factory
- [NEW] `src/routes/auth.ts` — `POST /login`, `GET /me`

### 1.5 Seed Script
- [NEW] `prisma/seed.ts` — creates 1 PM, 1 SE, 3-5 PLs, sample clients/projects/tickets
- Configured in `package.json` under `prisma.seed`

---

## Phase 2: Core CRUD

All follow the same pattern: route file + Zod schemas + role-guarded handlers.

### 2.1 Users CRUD
- [NEW] `src/routes/users.ts` — GET (all), POST, PATCH, DELETE — PM only for CUD

### 2.2 Clients CRUD
- [NEW] `src/routes/clients.ts` — GET (list + detail), POST, PATCH, DELETE — PM only for CUD

### 2.3 Client Sub-entities
- [NEW] `src/routes/clientContacts.ts` — scoped under `/clients/:id/contacts`
- [NEW] `src/routes/consignees.ts` — scoped under `/clients/:id/consignees`
- [NEW] `src/routes/consigneeContacts.ts` — scoped under `/consignees/:id/contacts`
- [NEW] `src/routes/amcs.ts` — scoped under `/clients/:id/amcs`
- All PM-only for CUD

### 2.4 Projects CRUD
- [NEW] `src/routes/projects.ts` — auto-generates `widget_key` on create
- [NEW] `src/utils/widgetKey.ts` — generates unique alphanumeric key
- PL sees own project, PM sees all

### 2.5 Knowledge Base & Docs
- [NEW] `src/routes/runbooks.ts` — global KB, CRUD by all roles
- [NEW] `src/routes/projectDocs.ts` — scoped under `/projects/:id/docs`, CRUD by all
- [NEW] `src/routes/faqs.ts` — scoped under `/projects/:id/faqs`, CRUD by all

### 2.6 Dashboard & Reports
- [NEW] `src/routes/dashboard.ts` — `GET /dashboard/stats` — role-aware count queries
- [NEW] `src/routes/reports.ts` — `GET /reports/tickets` — filtered ticket list
- [NEW] `src/utils/idPrefix.ts` — helper to format `id: 42` → `"TKT-042"`

---

## Phase 3: Widget & Julia AI

### 3.1 Widget Public Endpoints
- [NEW] `src/routes/widget.ts` — no JWT middleware, identified by `widget_key`
  - `GET /:widgetKey/faqs` — return project's FAQs
  - `POST /:widgetKey/chat/start` — create chat session, return sessionId
  - `POST /:widgetKey/chat/message` — send message, get Julia AI response
  - `POST /:widgetKey/escalate` — create ticket from chat, link session
  - `GET /:widgetKey/chat/:sessionId` — retrieve chat history

### 3.2 Julia AI Service
- [NEW] `src/services/julia.ts`
  - Fetches project's runbooks + project docs from DB
  - Builds system prompt with project context
  - Calls Gemini API with conversation history
  - Returns AI response

### 3.3 Chat Sessions (Internal Read-Only)
- [NEW] `src/routes/chatSessions.ts` — `GET /chat-sessions` (PL: own project, PM: all), `GET /chat-sessions/:id`

---

## Phase 4: Ticket Handling

### 4.1 Tickets
- [NEW] `src/routes/tickets.ts`
  - `GET /tickets` — role-filtered (SE: all, PL: own project, PM: all read-only)
  - `GET /tickets/:id` — detail with messages + linked chat session
  - `POST /tickets` — internal route called by widget escalation only
  - `PATCH /tickets/:id` — assign to self, change status, escalate

### 4.2 Ticket Messages
- [NEW] `src/routes/ticketMessages.ts`
  - `GET /tickets/:id/messages`
  - `POST /tickets/:id/messages` — reply or internal note (SE/PL only)

### 4.3 Escalation Logic
- In `PATCH /tickets/:id`: when `status` → `ESCALATED`:
  - Look up `ticket.project.assigned_to` (the PL)
  - Set `ticket.assigned_to = PL's user_id`
  - Set `ticket.status = ESCALATED`

---

## Verification Plan

### Automated (via manual API testing with seed data)

After each phase, verify by running the server and hitting endpoints:

```bash
# Start server
npm run dev

# Phase 1: Auth
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"pm@atc.com","password":"password"}'
# Should return { token, user }

# Phase 2: CRUD (use token from above)
curl http://localhost:3000/api/clients -H "Authorization: Bearer <token>"
# Should return client list from seed data

# Phase 3: Widget
curl http://localhost:3000/api/widget/<widget_key>/faqs
# Should return FAQs for that project

# Phase 4: Tickets
curl http://localhost:3000/api/tickets -H "Authorization: Bearer <SE_token>"
# Should return all tickets
```

### Manual Verification (with the frontend)
1. Start backend on port 3000 (or configured port)
2. Update frontend to make API calls instead of hardcoded data
3. Test full flow: widget chat → escalation → ticket appears in SE queue → assign → resolve

### Role Permission Testing
- Try CUD operations on clients with SE token → should get 403
- Try ticket update with PM token → should get 403
- Try accessing another PL's project tickets → should get empty or 403

> [!IMPORTANT]
> **PostgreSQL must be installed and running locally** before Phase 1. User should confirm they have PostgreSQL available, or we can use SQLite for dev (Prisma supports both with a one-line change).

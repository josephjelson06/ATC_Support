# ATC Support Backend — Task List

## Phase 1: Foundation
- [ ] Initialize Node.js project (`npm init`, install deps, `tsconfig.json`)
- [ ] Create `.env` with `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`
- [ ] Write Prisma schema (14 tables, all enums, all relations)
- [ ] Run `prisma migrate dev` to create database
- [ ] Build Express server entry (`src/index.ts` — cors, JSON, error handler)
- [ ] Build env config (`src/config/env.ts`)
- [ ] Build auth middleware (JWT verify, role check, Zod validate)
- [ ] Build auth routes (`POST /login`, `GET /me`)
- [ ] Write seed script (1 PM, 1 SE, 3-5 PLs, sample data)
- [ ] Verify: login and `/me` works with seeded users

## Phase 2: Core CRUD
- [ ] Users CRUD (`/api/users`) — PM only for CUD
- [ ] Clients CRUD (`/api/clients`) — PM only for CUD
- [ ] Client Contacts (`/api/clients/:id/contacts`) — PM only for CUD
- [ ] Consignees (`/api/clients/:id/consignees`) — PM only for CUD
- [ ] Consignee Contacts (`/api/consignees/:id/contacts`) — PM only for CUD
- [ ] AMCs (`/api/clients/:id/amcs`) — PM only for CUD
- [ ] Projects CRUD (`/api/projects`) — auto-gen `widget_key`, PM only for CUD
- [ ] Runbooks CRUD (`/api/runbooks`) — all roles
- [ ] Project Docs CRUD (`/api/projects/:id/docs`) — all roles
- [ ] FAQs CRUD (`/api/projects/:id/faqs`) — all roles
- [ ] Dashboard stats (`/api/dashboard/stats`) — role-aware counts
- [ ] Reports (`/api/reports/tickets`) — filtered ticket list
- [ ] ID prefix utility (`idPrefix.ts`) for human-readable IDs
- [ ] Verify: all CRUD endpoints with role permissions

## Phase 3: Widget & Julia AI
- [ ] Widget FAQ endpoint (`GET /api/widget/:widgetKey/faqs`)
- [ ] Widget chat start (`POST /api/widget/:widgetKey/chat/start`)
- [ ] Julia AI service (`src/services/julia.ts` — context builder + Gemini call)
- [ ] Widget chat message (`POST /api/widget/:widgetKey/chat/message`)
- [ ] Widget escalation (`POST /api/widget/:widgetKey/escalate` — creates ticket)
- [ ] Widget chat history (`GET /api/widget/:widgetKey/chat/:sessionId`)
- [ ] Chat sessions read-only for internal (`/api/chat-sessions`)
- [ ] Verify: full widget flow — FAQs → AI chat → escalation creates ticket

## Phase 4: Ticket Handling
- [ ] Ticket listing (`GET /api/tickets`) — role-filtered
- [ ] Ticket detail (`GET /api/tickets/:id`) — with messages + chat session
- [ ] Ticket update (`PATCH /api/tickets/:id`) — assign, status change
- [ ] Escalation logic — auto-assigns to PL on escalate
- [ ] Ticket messages (`GET/POST /api/tickets/:id/messages`)
- [ ] Verify: SE assigns ticket → resolves OR escalates → PL resolves

## Final
- [ ] Full integration test: widget → ticket → SE → PL → resolved
- [ ] Permission matrix test: wrong role gets 403 on restricted endpoints

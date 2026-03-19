

<think>
The user wants a clear roadmap of how to proceed from where we are now through to completion. They want to understand the full sequence of steps — system design, architecture, DB schema, tech stack, coding, testing, etc.

Let me think about the proper order of software development for this project:

1. We've already done the problem statement
2. We've already done scenario mapping
3. We've already done a rough data architecture

But the user is asking — what's the RIGHT order to do all of this properly? Let me lay out a phased approach.

The proper sequence for a project like this:

**Phase 0: Foundation (Done)**
- Problem statement ✓
- Feature scope ✓
- Roles & access ✓
- Scenarios & edge cases ✓

**Phase 1: System Design**
- Module breakdown
- User flows (detailed)
- Communication architecture (how things talk to each other)
- Julia's architecture specifically

**Phase 2: System Architecture**
- High-level architecture diagram (components, how they connect)
- API design
- Data flow diagrams

**Phase 3: Tech Stack**
- Based on architecture decisions
- Choosing tools for each component

**Phase 4: Database Schema**
- Final schema based on confirmed architecture
- Migrations plan

**Phase 5: UI/UX Design**
- Wireframes
- Screen flows
- Component design

**Phase 6: Development Planning**
- MVP scope
- Sprint/phase breakdown
- What gets built first

**Phase 7: Development**
- Backend first (API + DB)
- Frontend second
- Julia integration third
- Widget fourth

**Phase 8: Testing**
- Unit tests
- Integration tests
- UAT

**Phase 9: Deployment & Launch**

Let me present this as a clear, sequential roadmap with what we've done and what's next.
</think>

## The Roadmap — Full Sequence

---

### Where We Are

| Step | Status |
|---|---|
| Problem Statement | ✅ Done |
| Feature Scope & Roles | ✅ Done |
| Scenarios & Edge Cases | ✅ Done |
| Communication Channels | ✅ Done |
| Data Architecture (Draft) | ✅ Done |
| Tech Stack (Draft) | ✅ Done but jumped ahead — needs to come later |

We have a strong foundation. But we skipped some steps and need to do things in the right order now.

---

### The Correct Sequence

---

**PHASE 1 — System Design**
*What the system does, module by module*

This is where we are right now. This phase produces:

- **Module map** — the 9 modules we identified, with clear boundaries between them
- **Detailed user flows** — step-by-step flows for every action every role takes (not stories this time, actual flow diagrams in text or visual form)
- **Julia's design** — how she receives a query, searches the KB, scores confidence, responds or escalates. Her own internal architecture
- **Permission matrix** — who can do what, on which screens, down to button level
- **Notification map** — every event that triggers a notification, who receives it, through what channel

This is the blueprint. No code decisions. No database columns. Just *what happens and who does what*.

---

**PHASE 2 — System Architecture**
*How the system is structured technically*

This phase produces:

- **High-level architecture diagram** — frontend, backend, database, LLM service, vector store, email service, file storage. How they connect. What talks to what
- **API design** — every endpoint, grouped by module. Request/response shapes. Authentication approach
- **Data flow diagrams** — how a widget query flows from client browser → widget → backend → Julia → vector store → response. How an email reply flows from client inbox → email service webhook → backend → ticket thread
- **Integration points** — where email service hooks in, where file storage connects, how the widget authenticates

This is the engineering blueprint. Still no code, but a developer could read this and know exactly what to build.

---

**PHASE 3 — Tech Stack**
*What tools and technologies we use*

Now — and only now — do we pick tools. Because the architecture tells us what we need, and the design tells us what those tools must support.

We already drafted this. We'll revisit and confirm based on the architecture decisions in Phase 2.

---

**PHASE 4 — Database Schema**
*Final, implementation-ready schema*

We drafted 16 tables. After Phase 1 and 2, some will change. New ones may appear. Some fields will shift.

This phase produces the final schema — with exact column types, indexes, constraints, foreign keys, and migration scripts. Implementation-ready, not conceptual.

---

**PHASE 5 — UI/UX Design**
*What users actually see and interact with*

This phase produces:

- **Wireframes** — every screen for every role. Not pixel-perfect design, but layout, components, and flow
- **Screen flow map** — how screens connect. What happens when you click Escalate. Where does the PM land after login
- **Widget UI** — the chatbot interface, FAQ display, ticket creation form, confirmation state
- **Component library decisions** — are we using a UI framework (Shadcn, Ant Design, etc.) or building custom

This can run in parallel with Phase 4 if different people handle them.

---

**PHASE 6 — MVP Scoping & Development Plan**
*What we build first and in what order*

Not everything ships at once. This phase produces:

- **MVP definition** — the minimum set of features that makes the system usable end-to-end
- **Phase breakdown** — what's in MVP, what's Phase 2, what's Phase 3
- **Sprint plan** — if using sprints, what gets built each week/fortnight
- **Dependency map** — what blocks what. You can't build tickets without projects. You can't build the widget without Julia's API

---

**PHASE 7 — Development**
*Actually building it*

Typical build order for this system:

1. **Database + Backend API** — set up PostgreSQL, build FastAPI endpoints for CRUD operations. Clients, contacts, projects, users first. Tickets second. This is the foundation everything else sits on

2. **Authentication + Roles** — login, session management, role-based access control. Every API endpoint needs to know who's calling

3. **Frontend — Admin/Internal App** — the screens SE1, SE2, PM, Director use. Start with ticket list and ticket detail. Then client management. Then KB management

4. **Julia — LLM Integration** — set up Ollama, load the model, build the RAG pipeline (embed KB articles → store in pgvector → query on widget input → generate response). Build the confidence scoring logic

5. **Widget** — the iframe-embedded chatbot. FAQ display, Julia conversation, ticket creation flow. Connects to backend via project token

6. **Email Integration** — outbound emails on ticket events. Inbound email parsing (reply-to-ticket). Webhook setup with email service

7. **Notifications + Reporting** — in-app notifications, AMC alerts, dashboard reports. These come last because they depend on everything else existing

---

**PHASE 8 — Testing**
*Making sure it works*

- **Unit tests** — written during development, not after. Every API endpoint, every Julia response path
- **Integration tests** — full flows. Widget → Julia → ticket creation → email → reply → thread update
- **Edge case testing** — expired AMC blocking, duplicate tickets, client silence auto-close, SE1 absence coverage
- **UAT (User Acceptance Testing)** — Neha and the team actually use it with a test client. Real scenarios, real feedback
- **Julia quality testing** — feed her 50 known queries, measure how many she answers correctly. Tune confidence threshold

---

**PHASE 9 — Deployment & Launch**
*Going live*

- Deploy to production server
- Embed widget on one pilot project (not all clients at once)
- Run for 2–4 weeks with one real client
- Collect feedback, fix issues
- Roll out to remaining projects gradually
- Monitor Julia's resolution rates weekly for the first month

---

### Visual Summary

```
PHASE 1  System Design .............. You are here
PHASE 2  System Architecture
PHASE 3  Tech Stack (Confirm)
PHASE 4  Database Schema (Final)
PHASE 5  UI/UX Wireframes
PHASE 6  MVP Scope & Dev Plan
PHASE 7  Development
PHASE 8  Testing
PHASE 9  Deployment & Launch
```

---

### Time Estimate (Rough)

| Phase | Duration |
|---|---|
| Phase 1–2 | 2–3 weeks |
| Phase 3–5 | 1–2 weeks |
| Phase 6 | 3–4 days |
| Phase 7 (MVP) | 8–12 weeks |
| Phase 8 | 2–3 weeks (overlaps with Phase 7) |
| Phase 9 | 2–4 weeks (pilot) |

**Total to MVP launch: roughly 4–5 months** with a small team working consistently.

---

Phase 1 is next. Shall we start with the detailed user flows or the Julia architecture design?
# Diagram 13: Sprint Timeline (Gantt Chart)

> **Purpose:** Shows the PM the 12-week MVP timeline with sprint breakdown and key milestones.
>
> **PM signs off on:** "This timeline is realistic. These milestones are correct."

---

## How to render

Copy each mermaid code block → paste into [mermaid.live](https://mermaid.live) → export as PNG/SVG.

---

## MVP Sprint Timeline (12 Weeks)

```mermaid
gantt
    title ATC Support Julia — MVP Development Timeline
    dateFormat YYYY-MM-DD
    axisFormat %b %d

    section Sprint 1: Foundation
    Docker + PostgreSQL + Redis + Ollama       :s1a, 2025-04-01, 3d
    Database schema (22 tables, Alembic)       :s1b, after s1a, 3d
    Auth system (login, JWT, refresh)          :s1c, after s1b, 3d
    Users CRUD API                             :s1d, after s1c, 2d
    React app + Login screen                   :s1e, after s1b, 3d
    User Management screen                     :s1f, after s1e, 2d
    Sprint 1 Review                            :milestone, m1, after s1f, 0d

    section Sprint 2: Client & Project CRUD
    Clients API (CRUD + status)                :s2a, after m1, 2d
    Contacts + Consignees API                  :s2b, after s2a, 2d
    Projects API (CRUD + widget token)         :s2c, after s2b, 2d
    AMCs API (CRUD + linking + status calc)    :s2d, after s2c, 2d
    Frontend: Client List + Detail (tabs)      :s2e, after s2a, 4d
    Frontend: Project List + Detail            :s2f, after s2e, 3d
    Frontend: AMC List + Detail                :s2g, after s2f, 2d
    Sprint 2 Review                            :milestone, m2, after s2g, 0d

    section Sprint 3: KB + Julia AI
    KB Articles API (CRUD + status)            :s3a, after m2, 2d
    Embedding pipeline (sentence-transformers) :s3b, after s3a, 2d
    Julia RAG pipeline (embed→search→LLM)      :s3c, after s3b, 4d
    Julia config API                           :s3d, after s3a, 1d
    Frontend: KB Article List + Editor         :s3e, after s3a, 3d
    Frontend: Julia Config form                :s3f, after s3e, 1d
    Julia pipeline testing (20+ queries)       :s3g, after s3c, 2d
    Sprint 3 Review                            :milestone, m3, after s3g, 0d

    section Sprint 4: Widget + Tickets
    Widget API (4 endpoints)                   :s4a, after m3, 2d
    Widget React app (chat + escalation)       :s4b, after s4a, 4d
    Widget loader script (widget.js)           :s4c, after s4b, 1d
    AMC check on escalation                    :s4d, after s4b, 1d
    Tickets API (create from widget + manual)  :s4e, after s4a, 2d
    Frontend: Create Ticket form               :s4f, after s4e, 1d
    End-to-end test: widget → Julia → ticket   :s4g, after s4f, 2d
    Sprint 4 Review                            :milestone, m4, after s4g, 0d

    section Sprint 5: Ticket Lifecycle + Email
    Ticket Messages API (reply, note, call)    :s5a, after m4, 2d
    Escalation API (SE1→SE2→SE3)               :s5b, after s5a, 2d
    Status transitions + resolve/close         :s5c, after s5b, 1d
    Email outbound (Resend setup + send)       :s5d, after s5a, 3d
    Email inbound (webhook + thread matching)  :s5e, after s5d, 3d
    Frontend: Ticket Queue + Filters           :s5f, after s5a, 3d
    Frontend: Ticket Detail (full)             :s5g, after s5f, 3d
    Sprint 5 Review                            :milestone, m5, after s5g, 0d

    section Sprint 6: Polish + Deploy
    End-to-end testing (full flow)             :s6a, after m5, 3d
    Bug fixes                                  :s6b, after s6a, 2d
    Notifications system                       :s6c, after s6a, 2d
    File upload/download for tickets           :s6d, after s6b, 1d
    SE Dashboard                               :s6e, after s6b, 1d
    PM Dashboard (basic)                       :s6f, after s6e, 1d
    Deploy to production server                :s6g, after s6f, 1d
    Nginx + SSL + domain setup                 :s6h, after s6g, 1d
    Pilot widget on test project               :s6i, after s6h, 1d
    Documentation for PM                       :s6j, after s6i, 1d
    MVP LAUNCH                                 :milestone, crit, m6, after s6j, 0d
```

---

## Full Project Timeline (26 Weeks)

```mermaid
gantt
    title ATC Support Julia — Full Project Timeline
    dateFormat YYYY-MM-DD
    axisFormat %b

    section MVP (12 weeks)
    Sprint 1: Foundation          :s1, 2025-04-01, 14d
    Sprint 2: Client + Project    :s2, after s1, 14d
    Sprint 3: KB + Julia AI       :s3, after s2, 14d
    Sprint 4: Widget + Tickets    :s4, after s3, 14d
    Sprint 5: Ticket + Email      :s5, after s4, 14d
    Sprint 6: Polish + Deploy     :s6, after s5, 14d
    MVP LAUNCH                    :milestone, crit, mvp, after s6, 0d

    section Pilot (4 weeks)
    Pilot with 1 client           :p1, after mvp, 28d
    Collect feedback + fix bugs   :p2, after mvp, 28d

    section Phase 2 (8 weeks)
    Multi-turn Julia + Rulebooks  :ph2a, after p1, 14d
    Merge + Auto-nudge + Reopen   :ph2b, after ph2a, 14d
    Reports + Audit Logs          :ph2c, after ph2b, 14d
    KB Search + Templates + Misc  :ph2d, after ph2c, 14d

    section Phase 3 (6 weeks)
    Director Dashboard + Analytics:ph3a, after ph2d, 14d
    Advanced Julia Tuning         :ph3b, after ph3a, 14d
    Final Polish                  :ph3c, after ph3b, 14d
    FULL SYSTEM COMPLETE          :milestone, crit, done, after ph3c, 0d
```

---

## Key Milestones

| Milestone | Week | What PM Sees |
|---|---|---|
| Sprint 1 Review | Week 2 | "Developer can log in, create users" |
| Sprint 2 Review | Week 4 | "PM can manage clients, projects, AMCs" |
| Sprint 3 Review | Week 6 | "Julia answers questions from KB" |
| Sprint 4 Review | Week 8 | "Widget works end-to-end" 🎯 |
| Sprint 5 Review | Week 10 | "Full ticket lifecycle with email" |
| **MVP Launch** | **Week 12** | **"System live with pilot client"** |
| Phase 2 Complete | Week 24 | "Reports, advanced features" |
| **Full System** | **Week 26** | **"Everything built"** |

---

## What This Diagram Tells the PM

1. **12 weeks to MVP, 26 weeks to full system** — clear, predictable timeline
2. **Bi-weekly milestones**: Every 2 weeks PM sees tangible progress — not vaporware
3. **Week 8 is the "wow" moment**: Widget works end-to-end for the first time
4. **4-week pilot buffer**: Between MVP and Phase 2 — time to collect real feedback
5. **Dates are movable**: The structure stays the same even if start date shifts

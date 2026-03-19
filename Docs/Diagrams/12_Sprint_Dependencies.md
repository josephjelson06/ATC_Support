# Diagram 12: Sprint Dependency Map

> **Purpose:** Shows the PM why features must be built in a specific order — what blocks what.
>
> **PM signs off on:** "This build order makes sense. Dependencies are correct."

---

## How to render

Copy each mermaid code block → paste into [mermaid.live](https://mermaid.live) → export as PNG/SVG.

---

## Full Dependency Map

```mermaid
graph TD
    DB["🗄️ Database Setup<br/>(22 tables via Alembic)"] --> AUTH["🔐 Auth + Users<br/>(login, JWT, roles)"]

    AUTH --> CLIENTS["👥 Clients + Contacts<br/>+ Consignees"]

    CLIENTS --> PROJECTS["📁 Projects<br/>(widget token, SE3 assign)"]

    PROJECTS --> AMC["📋 AMCs<br/>(contracts, project linking)"]

    PROJECTS --> KB["📚 KB Articles<br/>(content, embeddings)"]

    KB --> JULIA["🤖 Julia Pipeline<br/>(embed → search → LLM → score)"]

    AMC -.->|"AMC check on escalation"| JULIA

    JULIA --> WIDGET["📱 Widget<br/>(chat UI, FAQ, escalation)"]

    WIDGET --> TKT_CREATE["🎫 Ticket Creation<br/>(from widget)"]

    PROJECTS --> TKT_MANUAL["🎫 Ticket Creation<br/>(manual by SE/PM)"]

    TKT_CREATE --> TKT_THREAD["💬 Ticket Messages<br/>(reply, note, call log)"]
    TKT_MANUAL --> TKT_THREAD

    TKT_THREAD --> EMAIL_OUT["📤 Email Outbound<br/>(Resend: reply to client)"]

    EMAIL_OUT --> EMAIL_IN["📥 Email Inbound<br/>(webhook: client reply parsing)"]

    TKT_THREAD --> ESCALATION["⬆️ Escalation<br/>(SE1 → SE2 → SE3)"]

    EMAIL_IN --> NOTIFY["🔔 Notifications<br/>(in-app)"]
    ESCALATION --> NOTIFY

    NOTIFY --> DASHBOARD["📊 Dashboards<br/>(SE queue, PM overview)"]

    %% Sprint labels
    DB ~~~ S1
    AUTH ~~~ S1
    CLIENTS ~~~ S2
    PROJECTS ~~~ S2
    AMC ~~~ S2
    KB ~~~ S3
    JULIA ~~~ S3
    WIDGET ~~~ S4
    TKT_CREATE ~~~ S4
    TKT_MANUAL ~~~ S4
    TKT_THREAD ~~~ S5
    EMAIL_OUT ~~~ S5
    EMAIL_IN ~~~ S5
    ESCALATION ~~~ S5
    NOTIFY ~~~ S6
    DASHBOARD ~~~ S6

    subgraph S1["Sprint 1 (Weeks 1-2)"]
        s1label["Foundation"]
    end
    subgraph S2["Sprint 2 (Weeks 3-4)"]
        s2label["Data Backbone"]
    end
    subgraph S3["Sprint 3 (Weeks 5-6)"]
        s3label["AI Core"]
    end
    subgraph S4["Sprint 4 (Weeks 7-8)"]
        s4label["Client-Facing"]
    end
    subgraph S5["Sprint 5 (Weeks 9-10)"]
        s5label["Communication"]
    end
    subgraph S6["Sprint 6 (Weeks 11-12)"]
        s6label["Polish & Deploy"]
    end

    style DB fill:#bbdefb
    style AUTH fill:#bbdefb
    style CLIENTS fill:#c5e1a5
    style PROJECTS fill:#c5e1a5
    style AMC fill:#c5e1a5
    style KB fill:#ffe0b2
    style JULIA fill:#ffe0b2
    style WIDGET fill:#f8bbd0
    style TKT_CREATE fill:#f8bbd0
    style TKT_MANUAL fill:#f8bbd0
    style TKT_THREAD fill:#ce93d8
    style EMAIL_OUT fill:#ce93d8
    style EMAIL_IN fill:#ce93d8
    style ESCALATION fill:#ce93d8
    style NOTIFY fill:#80cbc4
    style DASHBOARD fill:#80cbc4

    style S1 fill:#e3f2fd,stroke:#1565C0
    style S2 fill:#f1f8e9,stroke:#558B2F
    style S3 fill:#fff3e0,stroke:#E65100
    style S4 fill:#fce4ec,stroke:#C62828
    style S5 fill:#f3e5f5,stroke:#6A1B9A
    style S6 fill:#e0f2f1,stroke:#00695C
```

---

## Critical Path (What Delays Everything If Late)

```mermaid
graph LR
    CP1["DB + Auth"] -->|"blocks everything"| CP2["Projects"]
    CP2 -->|"blocks AI core"| CP3["KB + Embeddings"]
    CP3 -->|"blocks widget"| CP4["Julia Pipeline"]
    CP4 -->|"blocks client use"| CP5["Widget"]
    CP5 -->|"blocks support flow"| CP6["Tickets + Email"]

    style CP1 fill:#ffcdd2,stroke:#C62828
    style CP2 fill:#ffcdd2,stroke:#C62828
    style CP3 fill:#ffcdd2,stroke:#C62828
    style CP4 fill:#ffcdd2,stroke:#C62828
    style CP5 fill:#ffcdd2,stroke:#C62828
    style CP6 fill:#ffcdd2,stroke:#C62828
```

---

## What This Diagram Tells the PM

1. **Linear dependency chain**: You can't build Julia without KB. You can't build Widget without Julia. Everything chains
2. **Sprint assignments are logical**: Each sprint builds on the previous — no jumping ahead
3. **Critical path is DB → Projects → KB → Julia → Widget → Tickets**: Any delay in these delays everything
4. **AMC connects sideways**: It's not in the main chain but connects to Julia (escalation AMC check)

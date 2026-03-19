# Diagram 1: Module Map

> **Purpose:** Shows the PM all 9 modules of the system, what each one owns, and how they relate to each other.
>
> **PM signs off on:** "These are the 9 modules. Nothing is missing. The boundaries are correct."

---

## How to render

Copy the mermaid code block below and paste it into [mermaid.live](https://mermaid.live) → export as PNG/SVG.

---

## Module Map — Full System

```mermaid
graph TB
    subgraph CORE["🔧 CORE MODULES"]
        M1["<b>Module 1: User & Access</b><br/>─────────────<br/>• User accounts & roles<br/>• Login / Auth / JWT<br/>• Permissions<br/>• Password management<br/><i>Owner: PM, Director</i>"]

        M2["<b>Module 2: Client Management</b><br/>─────────────<br/>• Client companies<br/>• Contact persons<br/>• Consignees (sites)<br/>• Client status<br/><i>Owner: PM</i>"]

        M3["<b>Module 3: AMC Management</b><br/>─────────────<br/>• AMC contracts<br/>• Project ↔ AMC linking<br/>• Expiry tracking & alerts<br/>• Coverage status checks<br/><i>Owner: PM, System</i>"]

        M4["<b>Module 4: Project Management</b><br/>─────────────<br/>• Project records<br/>• SE3 assignment<br/>• Widget token generation<br/>• Widget on/off control<br/><i>Owner: PM</i>"]
    end

    subgraph AI["🤖 AI LAYER"]
        M5["<b>Module 5: Knowledge Base</b><br/>─────────────<br/>• KB articles (create/edit/publish)<br/>• Audience tagging<br/>  (Julia / Internal / Both)<br/>• Vector embeddings<br/>• Article search<br/><i>Owner: PM, SE3 (drafts)</i>"]

        M6["<b>Module 6: Julia Management</b><br/>─────────────<br/>• Per-project AI config<br/>• Confidence thresholds<br/>• Tone & persona settings<br/>• Rulebook entries<br/>• Session logging<br/><i>Owner: PM</i>"]
    end

    subgraph SUPPORT["🎫 SUPPORT LAYER"]
        M7["<b>Module 7: Ticket Lifecycle</b><br/>─────────────<br/>• Ticket create/assign/reply<br/>• Internal notes & call logs<br/>• Escalation chain<br/>  (SE1 → SE2 → SE3)<br/>• Resolve / Close / Merge<br/><i>Owner: SE1, SE2, SE3, PM</i>"]

        M8["<b>Module 8: Communication</b><br/>─────────────<br/>• Email outbound (to client)<br/>• Email inbound (client reply)<br/>• In-app notifications<br/>• Auto-nudge & auto-close<br/>• Canned responses<br/><i>Owner: System, PM</i>"]
    end

    subgraph INSIGHTS["📊 INSIGHTS LAYER"]
        M9["<b>Module 9: Reporting</b><br/>─────────────<br/>• Ticket summary reports<br/>• Layer resolution stats<br/>• Engineer workload<br/>• AMC tracker<br/>• Julia performance<br/><i>Owner: PM, Director</i>"]
    end

    %% Relationships
    M2 -->|"clients have"| M4
    M4 -->|"projects have"| M5
    M4 -->|"projects covered by"| M3
    M5 -->|"feeds articles to"| M6
    M6 -->|"escalates to"| M7
    M7 -->|"sends emails via"| M8
    M7 -->|"data feeds"| M9
    M6 -->|"session data feeds"| M9
    M3 -->|"AMC status checked by"| M6
    M1 -->|"auth for all modules"| M7

    style CORE fill:#e8f4f8,stroke:#2196F3
    style AI fill:#fff3e0,stroke:#FF9800
    style SUPPORT fill:#fce4ec,stroke:#E91E63
    style INSIGHTS fill:#e8f5e9,stroke:#4CAF50
```

---

## Module Dependency Summary (Simplified)

```mermaid
graph LR
    M1[Users & Auth] --> M2[Clients]
    M2 --> M4[Projects]
    M4 --> M3[AMCs]
    M4 --> M5[Knowledge Base]
    M5 --> M6[Julia AI]
    M6 --> M7[Tickets]
    M3 -.->|"AMC check"| M6
    M7 --> M8[Communication]
    M7 --> M9[Reporting]
    M6 -.->|"session data"| M9

    style M1 fill:#bbdefb
    style M2 fill:#bbdefb
    style M3 fill:#bbdefb
    style M4 fill:#bbdefb
    style M5 fill:#ffe0b2
    style M6 fill:#ffe0b2
    style M7 fill:#f8bbd0
    style M8 fill:#f8bbd0
    style M9 fill:#c8e6c9
```

---

## What This Diagram Tells the PM

1. **4 layers**: Core data (blue) → AI layer (orange) → Support layer (pink) → Insights (green)
2. **Data flows left-to-right**: You can't have Tickets without Projects. You can't have Julia without KB articles. Everything builds on the layer before it.
3. **9 modules, clear boundaries**: Each module owns specific things. No overlap. If PM asks "where does AMC expiry live?" — Module 3, not Module 7.
4. **Build order follows the arrows**: You build blue first, then orange, then pink, then green. This is why the sprint plan is ordered the way it is.

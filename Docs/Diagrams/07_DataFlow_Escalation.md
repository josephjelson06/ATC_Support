# Diagram 7: Data Flow — SE1 → SE2 → SE3 Escalation

> **Purpose:** Shows the PM exactly what happens when a ticket gets escalated between support engineer tiers, who does what, and what the client sees.
>
> **PM signs off on:** "This is the escalation process. The hand-off is correct. The right people get notified."

---

## How to render

Copy each mermaid code block → paste into [mermaid.live](https://mermaid.live) → export as PNG/SVG.

---

## Full Escalation Sequence: SE1 → SE2 → SE3

```mermaid
sequenceDiagram
    autonumber
    participant C as 👤 Client (Email)
    participant FE as 🌐 Frontend
    participant SE1 as 🟦 Amit (SE1)
    participant B as ⚙️ Backend
    participant PG as 🐘 PostgreSQL
    participant RS as 📧 Resend
    participant SE2 as 🟨 Priya (SE2)
    participant SE3 as 🟥 Vikram (SE3)

    Note over C,SE3: PHASE 1 — SE1 TRIES TO RESOLVE

    SE1->>FE: Opens TKT-0043
    FE->>B: GET /api/tickets/TKT-0043
    B-->>FE: Ticket data + thread + Julia transcript

    SE1->>FE: Reads Julia transcript (expandable section)
    SE1->>FE: Writes reply to client
    FE->>B: POST /api/tickets/TKT-0043/messages<br/>{type: reply, content: "Can you check motor current?"}
    B->>RS: Email sent to client
    RS-->>C: 📧 Gets SE1's question

    C->>RS: Replies: "Motor current is normal but<br/>the drive board may be faulty"
    RS->>B: Inbound webhook
    B->>PG: Add to thread, notify SE1

    Note over SE1,SE3: PHASE 2 — SE1 ESCALATES TO SE2

    SE1->>FE: Writes internal note:<br/>"Sounds like a hardware issue.<br/>Priya should check drive board."
    FE->>B: POST /api/tickets/TKT-0043/messages<br/>{type: internal_note, content: "..."}
    Note right of B: Internal note NOT emailed to client

    SE1->>FE: Clicks "Escalate → SE2"
    FE->>FE: Shows escalation dialog:<br/>Select SE2: [Priya Singh ▼]<br/>Escalation note: [text area]
    SE1->>FE: Selects Priya, adds note, confirms

    FE->>B: POST /api/tickets/TKT-0043/escalate<br/>{target_level: "se2",<br/>target_user_id: priya_id,<br/>note: "Hardware issue likely"}

    B->>PG: Update ticket:<br/>current_level: se1 → se2<br/>assigned_to: amit → priya
    B->>PG: Insert escalation_history record<br/>(from: amit/se1, to: priya/se2)
    B->>PG: Insert system message in thread:<br/>"Escalated from SE1 (Amit) to SE2 (Priya)"

    B->>RS: Email to client:<br/>"Your ticket has been escalated<br/>to our hardware specialist"
    RS-->>C: 📧 Gets escalation notice

    B->>RS: Email to Priya:<br/>"TKT-0043 escalated to you"
    B->>PG: Notification for Priya

    RS-->>SE2: 📧 Gets notification + reads escalation note

    Note over SE1,SE3: PHASE 3 — SE2 WORKS TICKET

    SE2->>FE: Opens TKT-0043
    FE->>B: GET /api/tickets/TKT-0043
    Note right of SE2: SE2 sees EVERYTHING:<br/>• Julia transcript<br/>• SE1's replies<br/>• Client's replies<br/>• SE1's internal note<br/>• Escalation note

    SE2->>FE: Replies to client with diagnosis
    FE->>B: POST /api/tickets/TKT-0043/messages
    B->>RS: Email to client
    RS-->>C: 📧 Gets SE2's reply

    Note over SE1,SE3: PHASE 4 — SE2 ESCALATES TO SE3

    SE2->>FE: Clicks "Escalate → SE3"
    FE->>B: POST /api/tickets/TKT-0043/escalate<br/>{target_level: "se3",<br/>target_user_id: vikram_id,<br/>note: "Need project-specific code review"}

    B->>PG: Update: level → se3, assigned → vikram
    B->>PG: Insert escalation_history
    B->>RS: Notify client + Vikram
    RS-->>SE3: 📧 Gets notification

    Note over SE1,SE3: PHASE 5 — SE3 RESOLVES

    SE3->>FE: Opens ticket, reads full history
    SE3->>FE: Fixes issue, writes resolution
    FE->>B: POST /api/tickets/TKT-0043/resolve<br/>{resolution_summary: "Drive board firmware<br/>updated to v2.3. Motor OL relay<br/>recalibrated to 12A threshold."}

    B->>PG: Update status → resolved
    B->>PG: Store resolution_summary
    B->>RS: Resolution email to client<br/>(includes summary + feedback link +<br/>[Confirm] [Reopen] buttons)
    RS-->>C: 📧 Resolution email
```

---

## Escalation Rules — Who Can Escalate Where

```mermaid
graph LR
    subgraph RULES["Escalation Rules"]
        SE1["🟦 SE1<br/>Triage & Basic Support"] -->|"Can escalate to"| SE2["🟨 SE2<br/>Hardware / Network"]
        SE2 -->|"Can escalate to"| SE3["🟥 SE3<br/>Code / Project-Specific"]
    end

    subgraph CANT["❌ Cannot"]
        NO1["SE1 ✗→ SE3<br/>(must go through SE2)"]
        NO2["SE2 ✗→ SE1<br/>(cannot de-escalate)"]
        NO3["SE3 ✗→ anyone<br/>(highest level)"]
    end

    subgraph OVERRIDE["⚡ PM Override"]
        PM["PM can reassign<br/>any ticket to any<br/>SE at any level"]
    end

    style RULES fill:#e8f5e9,stroke:#2E7D32
    style CANT fill:#ffcdd2,stroke:#C62828
    style OVERRIDE fill:#fff9c4,stroke:#F9A825
```

---

## What Each SE Level Handles

```mermaid
graph TB
    subgraph LEVELS["Support Tiers"]
        L1["🟦 SE1 — First Responder<br/>─────────────<br/>• Initial triage of all tickets<br/>• Basic troubleshooting (restart, config check)<br/>• Follow KB instructions<br/>• Gather info from client<br/><br/><i>Handles: ~40% of tickets</i>"]

        L2["🟨 SE2 — Specialist<br/>─────────────<br/>• Hardware diagnostics<br/>• Network configuration<br/>• System integration issues<br/>• On-site guidance<br/><br/><i>Handles: ~35% of tickets</i>"]

        L3["🟥 SE3 — Project Expert<br/>─────────────<br/>• Project-specific code issues<br/>• Custom logic debugging<br/>• Firmware/software updates<br/>• Deep domain expertise<br/><br/><i>Handles: ~25% of tickets</i>"]
    end

    L1 -->|"Can't resolve"| L2
    L2 -->|"Can't resolve"| L3

    style L1 fill:#bbdefb,stroke:#1565C0
    style L2 fill:#fff9c4,stroke:#F9A825
    style L3 fill:#ffcdd2,stroke:#C62828
```

---

## What This Diagram Tells the PM

1. **Strict escalation ladder**: SE1 → SE2 → SE3. No skipping. No de-escalation. PM can override
2. **Full context preserved**: When SE2 opens a ticket escalated from SE1, they see everything — Julia transcript, all replies, internal notes, escalation notes. No information loss
3. **Client is notified at every escalation**: "Your ticket has been escalated to our specialist" — client never wonders what's happening
4. **Internal notes stay internal**: SE's can leave notes for each other that the client never sees in email
5. **PM has override power**: Can reassign any ticket to any SE regardless of level — handles edge cases

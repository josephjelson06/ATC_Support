# Diagram 4: Ticket Status Flow (State Diagram)

> **Purpose:** Shows the PM every status a ticket can be in, what action triggers each transition, and who triggers it.
>
> **PM signs off on:** "These are all the ticket states. These transitions are correct. No missing states."

---

## How to render

Copy each mermaid code block → paste into [mermaid.live](https://mermaid.live) → export as PNG/SVG.

---

## Ticket Status Flow — Complete

```mermaid
stateDiagram-v2
    [*] --> New : Ticket created<br/>(from widget or manual)

    New --> In_Progress : SE opens & starts working

    In_Progress --> Pending_Client : SE asks client for info<br/>(reply sent via email)
    Pending_Client --> In_Progress : Client replies via email

    In_Progress --> Resolved : SE marks as resolved<br/>(adds resolution summary)

    Resolved --> Closed : Client confirms resolution<br/>(clicks link in email)
    Resolved --> Reopened : Client reopens<br/>(clicks link in email)
    Reopened --> In_Progress : Ticket returns to assigned SE

    Pending_Client --> Closed_Inactive : No client response for 9 days<br/>(auto: nudge at 48hrs, warning at 7d)

    In_Progress --> Escalated_SE2 : SE1 escalates to SE2
    Escalated_SE2 --> In_Progress : SE2 starts working

    In_Progress --> Escalated_SE3 : SE2 escalates to SE3
    Escalated_SE3 --> In_Progress : SE3 starts working

    New --> Closed_Merged : Merged into another ticket

    Closed --> [*]
    Closed_Inactive --> [*]
    Closed_Merged --> [*]

    note right of New
        Created by:
        • Widget escalation
        • Manual by SE/PM
    end note

    note right of Pending_Client
        Auto-nudge: 48 hours
        Final warning: 7 days
        Auto-close: 9 days
    end note

    note right of Resolved
        Client gets email with:
        • Confirm Resolution button
        • Reopen Ticket button
        • Feedback form link
    end note
```

---

## Simplified Linear Flow (For Quick Reference)

```mermaid
graph LR
    A[🆕 New] -->|SE triages| B[🔧 In Progress]
    B -->|asks client| C[⏳ Pending Client]
    C -->|client replies| B
    B -->|SE escalates| D[⬆️ Escalated]
    D -->|next SE works| B
    B -->|SE resolves| E[✅ Resolved]
    E -->|client confirms| F[🔒 Closed]
    E -->|client reopens| B
    C -->|9 days silence| G[💤 Closed - Inactive]
    A -->|merged| H[🔗 Closed - Merged]

    style A fill:#bbdefb
    style B fill:#fff9c4
    style C fill:#ffe0b2
    style D fill:#f8bbd0
    style E fill:#c8e6c9
    style F fill:#e0e0e0
    style G fill:#e0e0e0
    style H fill:#e0e0e0
```

---

## Escalation Sub-Flow

```mermaid
graph TD
    T["Ticket arrives<br/>(Status: New)"] --> SE1["🟦 SE1 — Layer 1<br/>Triage & basic support"]
    
    SE1 -->|"Can handle"| SE1_Work["SE1 works on it<br/>(Status: In Progress)"]
    SE1 -->|"Can't handle"| ESC1["Escalate to SE2"]
    
    ESC1 --> SE2["🟨 SE2 — Layer 2<br/>Hardware / Network"]
    SE2 -->|"Can handle"| SE2_Work["SE2 works on it"]
    SE2 -->|"Can't handle"| ESC2["Escalate to SE3"]
    
    ESC2 --> SE3["🟥 SE3 — Layer 3<br/>Code / Project-specific"]
    SE3 --> SE3_Work["SE3 works on it"]

    SE1_Work --> Resolve[✅ Resolved]
    SE2_Work --> Resolve
    SE3_Work --> Resolve

    style SE1 fill:#bbdefb,stroke:#1565C0
    style SE2 fill:#fff9c4,stroke:#F9A825
    style SE3 fill:#ffcdd2,stroke:#C62828
    style Resolve fill:#c8e6c9,stroke:#2E7D32
```

---

## Auto-Close Timeline

```mermaid
gantt
    title Pending Client — Auto-Close Timeline
    dateFormat X
    axisFormat %d

    section Ticket Status
    Pending Client (waiting)        :a1, 0, 48
    First Nudge Email Sent          :milestone, m1, 48, 0
    Still Waiting                   :a2, 48, 168
    Final Warning Email Sent        :milestone, m2, 168, 0
    Last Chance                     :a3, 168, 216
    Auto-Closed (Inactive)          :milestone, m3, 216, 0
```

| Event | Timing | Action |
|---|---|---|
| Ticket enters Pending Client | Day 0 | Waiting for client response |
| First nudge | 48 hours | System sends reminder email |
| Final warning | 7 days | System sends "closing in 48 hours" email |
| Auto-close | 9 days | System closes ticket, notifies PM |

---

## What This Diagram Tells the PM

1. **7 distinct statuses**: New → In Progress → Pending Client → Resolved → Closed / Inactive / Merged
2. **Escalation is lateral, not a status**: The ticket stays "In Progress" when escalated — only the assigned engineer and level changes
3. **Client controls closure**: SE marks as Resolved, but the ticket only becomes Closed when the client confirms. This prevents premature closure
4. **Auto-close prevents ticket rot**: If a client ghosts for 9 days, the system closes it automatically. PM gets notified
5. **Reopen has a 30-day limit**: After 30 days, reopening creates a new ticket with a reference. Old tickets stay clean

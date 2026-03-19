# Diagram 9: Wireflow — SE Handles Ticket

> **Purpose:** Shows the PM every screen an SE sees and every action they take when working a ticket.
>
> **PM signs off on:** "This is the SE workflow. These are the screens. The actions are correct."

---

## How to render

Copy each mermaid code block → paste into [mermaid.live](https://mermaid.live) → export as PNG/SVG.

---

## SE Ticket Handling Wireflow

```mermaid
graph TD
    LOGIN["🖥️ Login Screen<br/>Email + Password"] -->|"Logs in"| DASH

    DASH["🖥️ SE Dashboard<br/>─────────────<br/>• Summary cards (New: 4, Active: 8, Pending: 3)<br/>• Ticket queue table<br/>• Filters: Status, Priority, Client<br/>• Sort by: Last Activity<br/>• [+ Create Ticket] button"] 

    DASH -->|"Clicks ticket row"| DETAIL
    DASH -->|"Clicks + Create Ticket"| CREATE

    CREATE["🖥️ Create Ticket Form<br/>─────────────<br/>• Client dropdown<br/>• Project dropdown (filtered)<br/>• Contact dropdown (filtered)<br/>• Subject, Description<br/>• Priority radio buttons<br/>• Assign To dropdown<br/>• [📎 Attach files]<br/>• ☑ Notify client by email<br/>• [Create Ticket]"] -->|"Submits"| DETAIL

    DETAIL["🖥️ Ticket Detail<br/>─────────────<br/>• Header: TKT-XXXX, subject, status, priority<br/>• Info bar: Client, Project, Contact, SE, Level<br/>• LEFT: Action buttons<br/>• CENTER: Conversation thread<br/>• BOTTOM: Reply box"]

    DETAIL --> ACTIONS

    subgraph ACTIONS["Actions Panel (left side)"]
        A1["📝 Reply<br/><i>Sends email to client</i>"]
        A2["🔒 Internal Note<br/><i>Only visible to SEs</i>"]
        A3["📞 Log Call<br/><i>Records phone summary</i>"]
        A4["⬆️ Escalate<br/><i>SE1→SE2 or SE2→SE3</i>"]
        A5["✅ Resolve<br/><i>Adds resolution summary</i>"]
        A6["🔗 Merge<br/><i>Merge into another ticket</i>"]
    end

    A1 -->|"Types reply, clicks Send"| REPLY_SENT["Reply added to thread<br/>Email sent to client<br/>Status → in_progress"]
    REPLY_SENT --> DETAIL

    A2 -->|"Types note, clicks Save"| NOTE_SAVED["Note added to thread<br/>(marked INTERNAL)<br/>No email sent"]
    NOTE_SAVED --> DETAIL

    A3 -->|"Fills call summary + duration"| CALL_LOGGED["Call log added to thread<br/>with 📞 icon + duration"]
    CALL_LOGGED --> DETAIL

    A4 -->|"Selects target SE, adds note"| ESCALATED["Ticket reassigned<br/>Level changed<br/>Client + target SE notified"]
    ESCALATED -->|"Ticket leaves SE's queue"| DASH

    A5 -->|"Writes resolution summary"| RESOLVED["Status → Resolved<br/>Resolution email to client<br/>with [Confirm] [Reopen]"]
    RESOLVED --> DASH

    A6 -->|"Selects target ticket"| MERGED["This ticket → Closed (Merged)<br/>Redirect to target ticket"]
    MERGED --> DETAIL

    DETAIL -->|"🔔 Notification arrives"| NOTIF["Notification Dropdown<br/>─────────────<br/>• 'Client replied on TKT-0043'<br/>• 'TKT-0045 assigned to you'<br/>• 'AMC expiring: Tata Steel'<br/>• Click → opens relevant page"]
    NOTIF -->|"Clicks notification"| DETAIL

    style DASH fill:#e3f2fd,stroke:#1565C0
    style DETAIL fill:#fff3e0,stroke:#E65100
    style CREATE fill:#e8f5e9,stroke:#2E7D32
    style ACTIONS fill:#fce4ec,stroke:#C62828
```

---

## Thread Message Types (What SE Sees in Conversation)

```mermaid
graph TD
    subgraph THREAD["Conversation Thread (chronological)"]
        T1["📎 JULIA TRANSCRIPT<br/><i>Expandable, grey background</i><br/>Shows full widget conversation"]
        T2["🟢 SYSTEM MESSAGE<br/><i>Centered, grey text</i><br/>'Ticket created from widget escalation'"]
        T3["👤 SE REPLY<br/><i>Right-aligned, blue background</i><br/>'Hi Suresh, can you check motor current?'<br/>[Sent via ✉️]"]
        T4["👤 CLIENT REPLY<br/><i>Left-aligned, white background</i><br/>'Motor current is normal but drive board seems faulty'<br/>[Received via ✉️]"]
        T5["🔒 INTERNAL NOTE<br/><i>Bordered, yellow background</i><br/>'Sounds like hardware issue. Priya should check.'<br/><i>Client cannot see this</i>"]
        T6["📞 CALL LOG<br/><i>Phone icon, light grey</i><br/>'Called Suresh. Confirmed motor overheating.'<br/>Duration: 12 min"]
        T7["⬆️ ESCALATION NOTE<br/><i>System message style</i><br/>'Escalated from SE1 (Amit) to SE2 (Priya)'"]

        T1 --> T2 --> T3 --> T4 --> T5 --> T6 --> T7
    end

    style T1 fill:#f5f5f5,stroke:#9e9e9e
    style T2 fill:#e0e0e0,stroke:#616161
    style T3 fill:#bbdefb,stroke:#1565C0
    style T4 fill:#ffffff,stroke:#9e9e9e
    style T5 fill:#fff9c4,stroke:#F9A825
    style T6 fill:#f5f5f5,stroke:#9e9e9e
    style T7 fill:#e0e0e0,stroke:#616161
```

---

## What This Diagram Tells the PM

1. **Dashboard is work-focused**: SE sees their queue, summary stats, and can jump to any ticket
2. **Ticket Detail is the workhorse screen**: Everything happens here — reply, note, call, escalate, resolve
3. **6 actions on every ticket**: Reply, Internal Note, Log Call, Escalate, Resolve, Merge
4. **7 message types in the thread**: Julia transcript, system messages, SE replies, client replies, internal notes, call logs, escalation notes — all visually distinct
5. **Internal notes never reach the client**: Clearly separated, different background color

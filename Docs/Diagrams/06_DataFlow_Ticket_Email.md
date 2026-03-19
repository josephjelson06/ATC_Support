# Diagram 6: Data Flow — Escalation → Ticket → Email → Client Reply

> **Purpose:** Shows the PM the complete chain from when a client escalates through the widget (or an SE creates a ticket manually) all the way through email communication and client replies.
>
> **PM signs off on:** "This is how tickets get created and how email communication works end-to-end."

---

## How to render

Copy each mermaid code block → paste into [mermaid.live](https://mermaid.live) → export as PNG/SVG.

---

## Flow A: Widget Escalation → Ticket Creation

```mermaid
sequenceDiagram
    autonumber
    participant C as 👤 Client
    participant W as 📱 Widget
    participant B as ⚙️ Backend
    participant PG as 🐘 PostgreSQL
    participant RD as ⚡ Redis
    participant RS as 📧 Resend

    Note over C,RS: CLIENT DECIDES TO ESCALATE

    C->>W: Clicks "Connect with support team"
    W-->>C: Shows escalation form<br/>(name, email, description)

    C->>W: Fills form & submits
    W->>B: POST /api/widget/escalate<br/>{session_id, name, email, description}

    Note over B,PG: VALIDATION CHECKS

    B->>PG: Is contact email recognized?<br/>(exists in contact_persons?)
    PG-->>B: Contact found ✅

    B->>PG: Check AMC status for this project
    PG-->>B: AMC status: active ✅

    alt AMC Expired
        B-->>W: "Your maintenance contract<br/>has expired. Contact PM to renew."
        W-->>C: Shows AMC expired message<br/>(PM contact details shown)
        Note over C: Escalation BLOCKED<br/>Julia still answers FAQs & questions
    end

    Note over B,RS: TICKET CREATION

    B->>PG: Generate next ticket number<br/>(TKT-0043)
    PG-->>B: TKT-0043

    B->>PG: Create ticket record<br/>status: new<br/>priority: medium<br/>source: widget<br/>level: se1<br/>assigned_to: auto (round-robin or PM assigns)
    PG-->>B: Ticket created ✅

    B->>PG: Attach Julia transcript<br/>(link widget_session → ticket)
    B->>PG: Create first ticket_message<br/>(client's description from form)

    B->>RD: End widget session<br/>(mark as L3 resolution)

    Note over B,RS: EMAIL NOTIFICATIONS

    B->>RS: Send "Ticket Created" email to Client<br/>To: suresh@tatasteel.com<br/>Subject: [TKT-0043] PLC error E-45<br/>Reply-To: support+tkt0043@yourdomain.com
    RS-->>C: 📧 Email delivered

    B->>PG: Find assigned SE / available SE1
    B->>RS: Send "New Ticket" notification to SE<br/>To: amit@company.com<br/>"You've been assigned TKT-0043"
    
    B->>PG: Create in-app notification for SE

    B-->>W: {ticket_number: "TKT-0043", success: true}
    W-->>C: "Ticket TKT-0043 created!<br/>You'll receive updates at<br/>suresh@tatasteel.com"
```

---

## Flow B: SE Replies → Client Gets Email → Client Replies Back

```mermaid
sequenceDiagram
    autonumber
    participant SE as 🔧 SE (Browser)
    participant FE as 🌐 Frontend
    participant B as ⚙️ Backend
    participant PG as 🐘 PostgreSQL
    participant RS as 📧 Resend
    participant C as 👤 Client (Email)

    Note over SE,C: SE REPLIES TO CLIENT

    SE->>FE: Opens Ticket Detail screen<br/>Reads Julia transcript + client description
    SE->>FE: Types reply in reply box
    SE->>FE: Clicks "Send Reply"

    FE->>B: POST /api/tickets/TKT-0043/messages<br/>{type: "reply", content: "Hi Suresh..."}

    B->>PG: Insert ticket_message<br/>(type: reply, author: amit)
    B->>PG: Update ticket status → in_progress
    B->>PG: Update last_activity timestamp

    B->>RS: Send email to client<br/>To: suresh@tatasteel.com<br/>Subject: Re: [TKT-0043] PLC error E-45<br/>Reply-To: support+tkt0043@yourdomain.com<br/>Body: SE's reply + "Reply to this email to respond"
    RS-->>C: 📧 Email delivered

    Note over SE,C: CLIENT REPLIES VIA EMAIL

    C->>RS: Replies to email<br/>(hits support+tkt0043@yourdomain.com)

    RS->>B: POST /api/email/inbound (webhook)<br/>{from, to, subject, text, headers}

    B->>B: Verify Resend webhook signature
    B->>B: Extract ticket reference from<br/>Reply-To address: "tkt0043"
    B->>PG: Find ticket by number
    PG-->>B: TKT-0043 found ✅

    B->>B: Strip email signature & quoted text
    B->>PG: Insert ticket_message<br/>(type: reply, author_type: client)
    
    B->>PG: Update ticket status<br/>pending_client → in_progress
    
    B->>PG: Create notification for assigned SE
    B->>RS: Send notification email to SE<br/>"Client replied on TKT-0043"

    SE->>FE: Sees notification 🔔<br/>Opens ticket → sees client reply in thread
```

---

## Flow C: Manual Ticket Creation (No Widget)

```mermaid
sequenceDiagram
    autonumber
    participant SE as 🔧 SE / PM
    participant FE as 🌐 Frontend
    participant B as ⚙️ Backend
    participant PG as 🐘 PostgreSQL
    participant RS as 📧 Resend
    participant C as 👤 Client

    Note over SE,C: CLIENT CALLS / EMAILS DIRECTLY

    SE->>FE: Navigates to Tickets → Create Ticket
    SE->>FE: Selects Client → Projects dropdown filters
    SE->>FE: Selects Project → Contacts dropdown filters
    SE->>FE: Fills subject, description, priority
    SE->>FE: Assigns to self or another SE
    SE->>FE: Optionally attaches files
    SE->>FE: ☑ "Send notification email to client"
    SE->>FE: Clicks "Create Ticket"

    FE->>B: POST /api/tickets<br/>{client_id, project_id, contact_id,<br/>subject, description, priority,<br/>assigned_to, notify_client: true}

    B->>PG: Validate all IDs (client, project, contact)
    B->>PG: Check contact belongs to client
    B->>PG: Check project belongs to client
    B->>PG: Generate TKT-0044
    B->>PG: Create ticket (source: manual)
    B->>PG: Create first ticket_message

    alt Notify Client checked
        B->>RS: Send "Ticket Created" email to client
        RS-->>C: 📧 Email delivered
    end

    B->>PG: Create notification for assigned SE
    B-->>FE: Ticket created: TKT-0044
    FE-->>SE: Redirects to Ticket Detail screen
```

---

## Email Threading — How Reply Matching Works

```mermaid
graph TD
    A["SE sends reply on TKT-0043"] --> B["Email sent via Resend<br/>Reply-To: support+tkt0043@yourdomain.com<br/>Subject: Re: [TKT-0043] PLC error"]
    B --> C["Client receives email"]
    C --> D["Client clicks Reply in Gmail/Outlook"]
    D --> E["Email goes to:<br/>support+tkt0043@yourdomain.com"]
    E --> F["Resend receives email<br/>Fires webhook to /api/email/inbound"]
    F --> G{"Extract ticket reference<br/>from address: tkt0043"}
    G -->|"Found"| H["Insert as ticket_message<br/>Update status<br/>Notify SE"]
    G -->|"Not found"| I["Log as unmatched email<br/>Notify PM for manual routing"]

    style G fill:#fff9c4,stroke:#F9A825
    style H fill:#c8e6c9,stroke:#2E7D32
    style I fill:#ffcdd2,stroke:#C62828
```

---

## What This Diagram Tells the PM

1. **Two ticket creation paths**: Widget (automated, Julia transcript attached) and Manual (SE creates from phone call or email)
2. **AMC is checked on escalation**: No active AMC = no ticket creation through widget. Client gets PM's contact info instead
3. **Email is the communication channel**: Clients never log into the system. They reply to emails. Replies appear in the ticket thread automatically
4. **Ticket matching uses Reply-To address**: `support+tkt0043@yourdomain.com` — the ticket number is embedded. No parsing needed, works with all email clients
5. **Unmatched emails don't get lost**: If a reply can't be matched, PM gets notified and manually routes it
6. **Cascading dropdowns prevent errors**: Client → Project → Contact all filter each other. Can't create a mismatched ticket

# Diagram 10: Wireflow — PM Sets Up a Client

> **Purpose:** Shows the PM the exact screen-by-screen flow for onboarding a new client into the system.
>
> **PM signs off on:** "This is how I set up a client. The steps are correct and complete."

---

## How to render

Copy each mermaid code block → paste into [mermaid.live](https://mermaid.live) → export as PNG/SVG.

---

## PM Client Setup Wireflow

```mermaid
graph TD
    LOGIN["🖥️ Login (PM)"] -->|"Logs in"| DASH

    DASH["🖥️ PM Dashboard<br/>─────────────<br/>• Overview cards<br/>• Tickets by Priority chart<br/>• Engineer Workload chart<br/>• Recent Tickets list<br/>• AMC Alerts list"] -->|"Sidebar → Clients"| CL_LIST

    CL_LIST["🖥️ Client List<br/>─────────────<br/>• Search bar<br/>• Filters: Status, Industry<br/>• Table: Company, City, Projects, AMC Status, Open Tickets<br/>• [+ Add Client] button"] -->|"Clicks + Add Client"| CL_FORM

    CL_FORM["🖥️ Add Client Form<br/>─────────────<br/>• Company name<br/>• Industry<br/>• City, Address<br/>• Phone, Email, Website<br/>• Notes<br/>• [Save Client]"] -->|"Saves"| CL_DETAIL

    CL_DETAIL["🖥️ Client Detail (Tabbed)<br/>─────────────<br/>Tabs: Overview | Contacts | Consignees | Projects | AMCs"]

    CL_DETAIL -->|"Contacts tab"| ADD_CONTACT
    CL_DETAIL -->|"Consignees tab"| ADD_CONSIGNEE
    CL_DETAIL -->|"Projects tab"| ADD_PROJECT
    CL_DETAIL -->|"AMCs tab"| ADD_AMC

    ADD_CONTACT["🖥️ Add Contact<br/>─────────────<br/>• Name<br/>• Email<br/>• Phone<br/>• Designation<br/>• ☑ Primary contact?<br/>• [Save Contact]"] -->|"Saves"| CL_DETAIL

    ADD_CONSIGNEE["🖥️ Add Consignee (Site)<br/>─────────────<br/>• Site name<br/>• City, State<br/>• Address<br/>• [Save Consignee]"] -->|"Saves"| CL_DETAIL

    ADD_PROJECT["🖥️ Add Project<br/>─────────────<br/>• Project name<br/>• Description<br/>• Assigned SE3 dropdown<br/>• Link to consignee(s)<br/>• [Save Project]"] -->|"Saves"| PROJ_DETAIL

    PROJ_DETAIL["🖥️ Project Detail (Tabbed)<br/>─────────────<br/>Tabs: Overview | KB | Julia Config | Widget | Tickets"]

    PROJ_DETAIL -->|"KB tab"| ADD_KB
    PROJ_DETAIL -->|"Julia Config tab"| JULIA_CFG
    PROJ_DETAIL -->|"Widget tab"| WIDGET_SETUP

    ADD_KB["🖥️ Article Editor<br/>─────────────<br/>• Title<br/>• Category dropdown<br/>• Audience: Julia / Internal / Both<br/>• Tags<br/>• Rich text content editor<br/>• [Save Draft] [Publish]"] -->|"Publishes article<br/>(embedding auto-generated)"| PROJ_DETAIL

    JULIA_CFG["🖥️ Julia Config<br/>─────────────<br/>• Persona name<br/>• Greeting message<br/>• Fallback message<br/>• Confidence threshold slider<br/>• Tone: Professional / Friendly / Technical<br/>• Max turns<br/>• [Save Configuration]"] -->|"Saves"| PROJ_DETAIL

    WIDGET_SETUP["🖥️ Widget Settings<br/>─────────────<br/>• Widget Status: 🟢 Enabled / 🔴 Disabled<br/>• [Enable Widget] / [Disable Widget]<br/>• Embed Code box with copy button<br/>  〈script src='.../widget.js?token=proj_xxx'〉"] -->|"Copies embed code<br/>to give to client"| DONE

    ADD_AMC["🖥️ Add AMC<br/>─────────────<br/>• Contract number<br/>• Start date<br/>• End date<br/>• Link to projects (multi-select)<br/>• Upload contract PDF<br/>• [Save AMC]"] -->|"Saves"| CL_DETAIL

    DONE["✅ Client Fully Onboarded<br/>─────────────<br/>• Client record created<br/>• Contacts added<br/>• Sites added<br/>• Project(s) created<br/>• KB articles published<br/>• Julia configured<br/>• Widget enabled<br/>• AMC linked<br/>• Embed code ready for client"]

    style DASH fill:#e3f2fd,stroke:#1565C0
    style CL_LIST fill:#e3f2fd,stroke:#1565C0
    style CL_FORM fill:#e8f5e9,stroke:#2E7D32
    style CL_DETAIL fill:#fff3e0,stroke:#E65100
    style PROJ_DETAIL fill:#fff3e0,stroke:#E65100
    style ADD_CONTACT fill:#e8f5e9,stroke:#2E7D32
    style ADD_CONSIGNEE fill:#e8f5e9,stroke:#2E7D32
    style ADD_PROJECT fill:#e8f5e9,stroke:#2E7D32
    style ADD_AMC fill:#e8f5e9,stroke:#2E7D32
    style ADD_KB fill:#fce4ec,stroke:#C62828
    style JULIA_CFG fill:#fce4ec,stroke:#C62828
    style WIDGET_SETUP fill:#fce4ec,stroke:#C62828
    style DONE fill:#c8e6c9,stroke:#2E7D32
```

---

## PM Setup Checklist (Minimum for Widget Go-Live)

```mermaid
graph LR
    S1["1️⃣ Create Client"] --> S2["2️⃣ Add Primary Contact"]
    S2 --> S3["3️⃣ Add Consignee"]
    S3 --> S4["4️⃣ Create Project<br/>(assign SE3)"]
    S4 --> S5["5️⃣ Write 5-10<br/>KB Articles"]
    S5 --> S6["6️⃣ Configure Julia<br/>(tone, threshold)"]
    S6 --> S7["7️⃣ Enable Widget<br/>(copy embed code)"]
    S7 --> S8["8️⃣ Link AMC"]
    S8 --> LIVE["🟢 Widget Live!"]

    style S1 fill:#bbdefb
    style S2 fill:#bbdefb
    style S3 fill:#bbdefb
    style S4 fill:#bbdefb
    style S5 fill:#ffe0b2
    style S6 fill:#ffe0b2
    style S7 fill:#c8e6c9
    style S8 fill:#c8e6c9
    style LIVE fill:#81c784,stroke:#2E7D32,color:#fff
```

---

## What This Diagram Tells the PM

1. **8-step onboarding process**: Client → Contact → Consignee → Project → KB → Julia Config → Widget → AMC
2. **PM does everything**: No other role can set up a client or enable a widget
3. **KB articles MUST exist before widget goes live**: Julia can't answer without content — minimum 5-10 articles
4. **Embed code is self-service**: PM copies a single script tag, gives it to the client's IT team
5. **AMC must be linked**: Otherwise widget blocks ticket creation on escalation



<thinking>
The user wants Phase 5 (UI/UX Wireframes) and Phase 6 (MVP Scoping & Dev Plan). Let me go through both comprehensively.

Phase 5 needs to cover:
- Every screen for every role
- Widget UI
- Screen flow maps
- Component decisions

Phase 6 needs to cover:
- MVP definition (what's in, what's out)
- Phase breakdown
- Sprint plan
- Dependency map
- Build order

Let me think about the screens:

**Login / Auth screens:**
- Login page
- Password reset
- Change password (first login)

**Dashboard screens (role-specific):**
- SE1 Dashboard → ticket queue focused
- SE2 Dashboard → similar but filtered
- SE3 Dashboard → project-focused + tickets
- PM Dashboard → overview with metrics
- Director Dashboard → high-level metrics

**Client Management:**
- Client list
- Client detail (with tabs: Overview, Contacts, Consignees, Projects, AMCs)
- Add/Edit client form
- Add/Edit contact form
- Add/Edit consignee form

**Project Management:**
- Project list
- Project detail (with tabs: Overview, KB, Julia Config, Widget, Tickets)
- Add/Edit project form

**AMC Management:**
- AMC list / tracker view
- AMC detail
- Add/Edit AMC form

**Knowledge Base:**
- KB article list (per project)
- Article detail / editor
- KB search

**Julia Management:**
- Julia config form (per project)
- Rulebook list + add/edit
- Session logs list
- Session detail / transcript viewer

**Ticket Management:**
- Ticket queue / list
- Ticket detail page (the most complex screen)
- Create ticket form
- Merge ticket dialog

**Reports:**
- Ticket summary dashboard
- Layer resolution report
- Engineer workload
- AMC tracker
- Julia performance

**Settings:**
- User management (list + add/edit)
- Email templates (list + edit)
- Canned responses (list + add/edit)

**Widget:**
- Chat interface
- FAQ display
- Escalation form
- Confirmation states

Let me create text-based wireframes for the key screens. I'll focus on layout and functionality, not pixel-perfect design.

For Phase 6, I need to define:
- What's MVP vs Phase 2 vs Phase 3
- Sprint breakdown
- Dependencies

This is going to be long but the user clearly wants comprehensive documentation.
</thinking>

# Phase 5 — UI/UX Design

---

## Screen Inventory

Every screen in the system, organized by section.

---

### Auth Screens (3)

1. Login
2. Forgot Password
3. Force Change Password (first login)

### Dashboard Screens (3)

4. SE Dashboard (SE1, SE2, SE3 — same layout, different data)
5. PM Dashboard
6. Director Dashboard

### Client Management (5)

7. Client List
8. Client Detail (tabbed)
9. Add/Edit Client
10. Add/Edit Contact Person
11. Add/Edit Consignee

### Project Management (4)

12. Project List
13. Project Detail (tabbed)
14. Add/Edit Project
15. Widget Settings (sub-page of Project Detail)

### AMC Management (3)

16. AMC List / Tracker
17. AMC Detail
18. Add/Edit AMC

### Knowledge Base (3)

19. Article List (per project)
20. Article Editor (create/edit)
21. KB Search (global)

### Julia Management (4)

22. Julia Config (per project)
23. Rulebook Manager
24. Session Log List
25. Session Transcript Viewer

### Ticket Management (3)

26. Ticket Queue / List
27. Ticket Detail (the big one)
28. Create Ticket

### Reports (5)

29. Ticket Summary Report
30. Layer Resolution Report
31. Engineer Workload Report
32. AMC Tracker Report
33. Julia Performance Report

### Settings (3)

34. User Management
35. Email Template Editor
36. Canned Response Manager

### Widget (Client-Facing) (4)

37. Widget — Initial State (greeting + FAQs)
38. Widget — Chat Interface
39. Widget — Escalation Form
40. Widget — Confirmation / Status

**Total: 40 screens.**

---

## Layout Architecture

---

### Internal App Layout

Every internal screen shares the same shell:

```
┌──────────────────────────────────────────────────────────────┐
│  TOP BAR                                                      │
│  ┌──────┐                              ┌────┐ ┌────┐ ┌─────┐│
│  │ Logo │  Support Operations Platform  │🔔  │ │👤  │ │Logout││
│  └──────┘                              └────┘ └────┘ └─────┘│
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│  SIDEBAR   │              MAIN CONTENT AREA                  │
│            │                                                 │
│  Dashboard │                                                 │
│            │                                                 │
│  Clients   │                                                 │
│            │                                                 │
│  Projects  │                                                 │
│            │                                                 │
│  AMCs      │                                                 │
│            │                                                 │
│  Tickets   │                                                 │
│            │                                                 │
│  KB        │                                                 │
│            │                                                 │
│  Reports   │  (PM, Director only)                            │
│            │                                                 │
│  Settings  │  (PM only)                                      │
│            │                                                 │
│            │                                                 │
│            │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```

Sidebar items are role-filtered. SE1 doesn't see Reports or Settings. SE3 doesn't see Settings. Director sees everything but Settings is read-only.

The notification bell (🔔) shows unread count badge. Clicking opens a dropdown with recent notifications, each linking to the relevant entity.

---

## Screen Wireframes

---

### Screen 1: Login

```
┌──────────────────────────────────────────┐
│                                          │
│              ┌──────────┐                │
│              │   Logo   │                │
│              └──────────┘                │
│         Support Operations Platform      │
│                                          │
│         ┌──────────────────────┐         │
│         │  Email               │         │
│         └──────────────────────┘         │
│         ┌──────────────────────┐         │
│         │  Password            │         │
│         └──────────────────────┘         │
│                                          │
│         ┌──────────────────────┐         │
│         │       LOGIN          │         │
│         └──────────────────────┘         │
│                                          │
│         Forgot Password?                 │
│                                          │
└──────────────────────────────────────────┘
```

Simple. No registration (accounts are created by PM). No social login. Just email, password, submit.

---

### Screen 4: SE1 Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Welcome, Amit                                     🔔 3     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MY TICKET QUEUE                                            │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ New: 4  │  │ Active:8│  │Pending:3│  │Total: 15│       │
│  │  ●●●●   │  │  ●●●●●  │  │  ●●●    │  │         │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Filters: [Status ▼] [Priority ▼] [Client ▼] [Search] │  │
│  ├─────┬────────────┬──────────┬────────┬───────┬────────┤  │
│  │ TKT │ Subject    │ Client   │Priority│Status │ Last   │  │
│  │     │            │          │        │       │Activity│  │
│  ├─────┼────────────┼──────────┼────────┼───────┼────────┤  │
│  │0042 │ PLC fault  │ Tata Stl │ HIGH   │ New   │ 2m ago │  │
│  │     │ Line 3     │          │ 🔴     │       │        │  │
│  ├─────┼────────────┼──────────┼────────┼───────┼────────┤  │
│  │0041 │ HMI screen │ Reliance │ MED    │In Prog│ 1h ago │  │
│  │     │ freeze     │          │ 🟡     │       │        │  │
│  ├─────┼────────────┼──────────┼────────┼───────┼────────┤  │
│  │0039 │ Sensor     │ Adani    │ LOW    │Pending│ 2d ago │  │
│  │     │ calibrate  │ Power    │ 🟢     │Client │        │  │
│  ├─────┼────────────┼──────────┼────────┼───────┼────────┤  │
│  │ ... │            │          │        │       │        │  │
│  └─────┴────────────┴──────────┴────────┴───────┴────────┘  │
│                                                             │
│  [◄ Prev]  Page 1 of 3  [Next ►]                           │
│                                                             │
│  ┌──────────────────┐                                       │
│  │ + Create Ticket  │                                       │
│  └──────────────────┘                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

SE2 sees the same layout but filtered to tickets at SE2 level or assigned to them. SE3 sees only tickets for their assigned projects at SE3 level.

Clicking any row opens Ticket Detail.

---

### Screen 5: PM Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                                         🔔 5     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OVERVIEW CARDS                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│  │ Open       │ │ Pending    │ │ Resolved   │ │ AMCs     │ │
│  │ Tickets    │ │ Client     │ │ This Week  │ │ Expiring │ │
│  │    12      │ │     3      │ │     7      │ │    2     │ │
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘ │
│                                                             │
│  ┌──────────────────────────┐ ┌────────────────────────────┐│
│  │ TICKETS BY PRIORITY      │ │ ENGINEER WORKLOAD          ││
│  │                          │ │                            ││
│  │  Critical ██ 2           │ │  Amit (SE1)  ████████ 8   ││
│  │  High     ████ 4         │ │  Priya (SE2) █████ 5      ││
│  │  Medium   ██████ 6       │ │  Vikram (SE3)███ 3        ││
│  │  Low      ███ 3          │ │  Ravi (SE3)  ██ 2         ││
│  │                          │ │                            ││
│  └──────────────────────────┘ └────────────────────────────┘│
│                                                             │
│  ┌──────────────────────────┐ ┌────────────────────────────┐│
│  │ RECENT TICKETS           │ │ AMC ALERTS                 ││
│  │                          │ │                            ││
│  │ TKT-0042 PLC fault..    │ │ ⚠ Tata Steel AMC          ││
│  │ TKT-0041 HMI screen..   │ │   expires in 28 days      ││
│  │ TKT-0040 SCADA comm..   │ │                            ││
│  │ TKT-0039 Sensor cal..   │ │ 🔴 Adani Power AMC         ││
│  │                          │ │   expired 5 days ago      ││
│  │ [View All Tickets →]     │ │                            ││
│  └──────────────────────────┘ └────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Every card and section is clickable — navigates to the relevant detail page.

---

### Screen 6: Director Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Director Dashboard                                🔔 2     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  HIGH-LEVEL METRICS                                         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│  │ Active     │ │ Open       │ │ Avg Resol. │ │ Active   │ │
│  │ Clients    │ │ Tickets    │ │ Time       │ │ AMCs     │ │
│  │    18      │ │    15      │ │  2.4 days  │ │   14     │ │
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘ │
│                                                             │
│  ┌──────────────────────────┐ ┌────────────────────────────┐│
│  │ TICKETS THIS MONTH       │ │ TOP CLIENTS BY TICKETS     ││
│  │ vs Last Month            │ │                            ││
│  │                          │ │ 1. Tata Steel     ████ 12  ││
│  │  Created  ▲ 23 (+15%)    │ │ 2. Reliance Ind   ███ 8   ││
│  │  Resolved ▲ 19 (+22%)    │ │ 3. Adani Power    ██ 5    ││
│  │  Escalated  7 (same)     │ │ 4. Bajaj Auto     █ 3     ││
│  │                          │ │                            ││
│  └──────────────────────────┘ └────────────────────────────┘│
│                                                             │
│  ┌──────────────────────────┐ ┌────────────────────────────┐│
│  │ JULIA PERFORMANCE        │ │ AMC STATUS                 ││
│  │                          │ │                            ││
│  │  L1 (FAQ)     18%        │ │  Active    ████████ 14    ││
│  │  L2 (Julia)   27%        │ │  Expiring  ██ 2           ││
│  │  L3 (Ticket)  55%        │ │  Expired   █ 1            ││
│  │                          │ │                            ││
│  │  Target: <40% L3         │ │                            ││
│  └──────────────────────────┘ └────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Read-only. No action buttons. Director observes patterns.

---

### Screen 7: Client List

```
┌─────────────────────────────────────────────────────────────┐
│  Clients                                    [+ Add Client]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Search by name...          ] [Status: All ▼] [Industry ▼] │
│                                                             │
│  ┌──────────────┬──────────┬────────┬────────┬────────────┐ │
│  │ Company      │ City     │Projects│ AMC    │ Open       │ │
│  │              │          │        │ Status │ Tickets    │ │
│  ├──────────────┼──────────┼────────┼────────┼────────────┤ │
│  │ Tata Steel   │ Jamshedpr│   3    │ 🟢 Act │     5      │ │
│  │ Reliance Ind │ Mumbai   │   2    │ 🟡 28d │     3      │ │
│  │ Adani Power  │ Ahmedabad│   1    │ 🔴 Exp │     2      │ │
│  │ Bajaj Auto   │ Pune     │   2    │ 🟢 Act │     1      │ │
│  │ ...          │          │        │        │            │ │
│  └──────────────┴──────────┴────────┴────────┴────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

AMC Status column shows at-a-glance health: green (active), amber (expiring within 60 days), red (expired). Derived from the client's AMCs.

---

### Screen 8: Client Detail (Tabbed)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Clients                                          │
│                                                             │
│  TATA STEEL                          Status: Active  [Edit] │
│  Industry: Manufacturing  │  City: Jamshedpur               │
│  Phone: +91-XXX  │  Email: info@tatasteel.com               │
│                                                             │
├───────┬──────────┬────────────┬──────────┬──────────────────┤
│Overview│ Contacts │ Consignees │ Projects │ AMCs            │
├────────┴──────────────────────────────────────────────────── │
│                                                             │
│  (Tab content changes based on selection)                   │
│                                                             │
│  ─── CONTACTS TAB ───                                       │
│                                                             │
│  ┌────────────┬────────────────────┬────────┬─────────────┐ │
│  │ Name       │ Email              │ Phone  │ Type        │ │
│  ├────────────┼────────────────────┼────────┼─────────────┤ │
│  │ Suresh K.  │ suresh@tatasteel.. │ +91-XX │ Primary ⭐  │ │
│  │ Meena R.   │ meena@tatasteel..  │ +91-XX │ Secondary   │ │
│  └────────────┴────────────────────┴────────┴─────────────┘ │
│                                                             │
│  [+ Add Contact]                                            │
│                                                             │
│  ─── PROJECTS TAB ───                                       │
│                                                             │
│  ┌────────────────┬──────────┬────────┬──────┬────────────┐ │
│  │ Project        │ SE3      │ Widget │ AMC  │ Tickets    │ │
│  ├────────────────┼──────────┼────────┼──────┼────────────┤ │
│  │ SCADA Line 1   │ Vikram   │ 🟢 On  │ 🟢   │ 3 open     │ │
│  │ PLC Upgrade    │ Ravi     │ 🔴 Off │ 🟢   │ 1 open     │ │
│  │ HMI Panel 4    │ Vikram   │ 🟢 On  │ 🟢   │ 1 open     │ │
│  └────────────────┴──────────┴────────┴──────┴────────────┘ │
│                                                             │
│  ─── AMCs TAB ───                                           │
│                                                             │
│  ┌──────────────┬────────────┬────────────┬───────────────┐ │
│  │ Contract #   │ Start      │ End        │ Status        │ │
│  ├──────────────┼────────────┼────────────┼───────────────┤ │
│  │ AMC-2024-015 │ 2024-04-01 │ 2025-03-31 │ 🟢 Active     │ │
│  │ AMC-2023-008 │ 2023-04-01 │ 2024-03-31 │ ⚫ Expired    │ │
│  └──────────────┴────────────┴────────────┴───────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Each tab shows relevant data with inline action buttons. The Overview tab shows the client's notes and a summary.

---

### Screen 13: Project Detail (Tabbed)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Projects                                         │
│                                                             │
│  SCADA Line 1 — Tata Steel              Status: Active      │
│  SE3: Vikram Patel  │  Widget: 🟢 On     │  AMC: 🟢 Active   │
│                                                     [Edit]  │
├──────────┬────┬──────────────┬──────────┬───────────────────┤
│ Overview │ KB │ Julia Config │ Widget   │ Tickets           │
├──────────┴────────────────────────────────────────────────── │
│                                                             │
│  ─── KB TAB ───                                             │
│                                                             │
│  Articles: 12 published, 2 drafts        [+ New Article]    │
│                                                             │
│  ┌──────────────────────┬──────────┬────────┬─────────────┐ │
│  │ Title                │ Audience │ Status │ Updated     │ │
│  ├──────────────────────┼──────────┼────────┼─────────────┤ │
│  │ PLC Error Code E-45  │ Julia    │ Pub    │ 2025-01-15  │ │
│  │ Firmware Update v2.3 │ Both     │ Pub    │ 2025-01-10  │ │
│  │ Network Config Guide │ Internal │ Pub    │ 2024-12-20  │ │
│  │ Sensor Calibration   │ Julia    │ Draft  │ 2025-01-18  │ │
│  └──────────────────────┴──────────┴────────┴─────────────┘ │
│                                                             │
│  ─── JULIA CONFIG TAB ───                                   │
│                                                             │
│  Persona Name:     [Julia                         ]         │
│  Greeting:         [Hi! How can I help you today? ]         │
│  Fallback Message: [I'm not confident I can help..]         │
│  Confidence:       [====●=====] 60%                         │
│  Tone:             (●) Professional  ( ) Friendly           │
│                    ( ) Technical                             │
│  Max Turns:        [10]                                     │
│                                                             │
│  [Save Configuration]                                       │
│                                                             │
│  ─── RULEBOOKS ───                              [+ Add Rule]│
│  ┌──────────────────────┬───────────────┬────┬────────────┐ │
│  │ Rule Name            │ Trigger       │ Pri│ Status     │ │
│  ├──────────────────────┼───────────────┼────┼────────────┤ │
│  │ Production Down      │ "production   │  1 │ 🟢 Active   │ │
│  │ Emergency Escalate   │  down, halt"  │    │            │ │
│  │ Firmware Redirect    │ "firmware,    │  5 │ 🟢 Active   │ │
│  │                      │  update"      │    │            │ │
│  └──────────────────────┴───────────────┴────┴────────────┘ │
│                                                             │
│  ─── WIDGET TAB ───                                         │
│                                                             │
│  Widget Status: 🟢 Enabled           [Disable Widget]       │
│                                                             │
│  Embed Code:                                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ <script src="https://support.yourdomain.com/widget.js? ││
│  │ token=proj_abc123def456"></script>                      ││
│  └─────────────────────────────────────────────────────────┘│
│  [📋 Copy to Clipboard]                                     │
│                                                             │
│  ─── TICKETS TAB ───                                        │
│                                                             │
│  (Same table as ticket queue, filtered to this project)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Screen 20: KB Article Editor

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to KB — SCADA Line 1                                │
│                                                             │
│  CREATE NEW ARTICLE                                         │
│                                                             │
│  Title:                                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ PLC Error Code E-45: Motor Overload Fault               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Category:                    Audience:                      │
│  [Troubleshooting ▼]         ( ) Julia Only                 │
│                               (●) Both (Julia + Internal)   │
│  Tags:                        ( ) Internal Only             │
│  [plc] [error] [motor] [+]                                  │
│                                                             │
│  Content:                                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [B] [I] [H1] [H2] [Code] [Link] [Image]               ││
│  │─────────────────────────────────────────────────────────││
│  │                                                         ││
│  │ ## Problem                                              ││
│  │ Error E-45 indicates a motor overload condition on      ││
│  │ the specified drive unit. This typically occurs when... ││
│  │                                                         ││
│  │ ## Solution                                             ││
│  │ 1. Check the motor current draw on the HMI panel...    ││
│  │ 2. Verify the overload relay settings...               ││
│  │                                                         ││
│  │                                                         ││
│  │                                                    400px││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌────────────────┐  ┌────────────────┐                     │
│  │  Save as Draft │  │    Publish     │   (PM only)         │
│  └────────────────┘  └────────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

SE3 sees only "Save as Draft." PM sees both buttons. When creating from a resolved ticket, the content area is pre-filled with the resolution notes.

---

### Screen 25: Session Transcript Viewer

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Session Logs                                      │
│                                                             │
│  SESSION: sess_abc123                                       │
│  Project: SCADA Line 1  │  Contact: suresh@tatasteel.com   │
│  Started: 2025-01-18 14:32  │  Duration: 8 min             │
│  Resolution: L3 (Escalated) │  Ticket: TKT-0042            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🤖 Julia                                    14:32   │    │
│  │ Hi! How can I help you with SCADA Line 1 today?    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 👤 Client                                   14:33   │    │
│  │ PLC on drive unit 3 is showing error E-45           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🤖 Julia                                    14:33   │    │
│  │ Error E-45 indicates a motor overload...            │    │
│  │                                                     │    │
│  │ Confidence: 72%  │  Articles: "PLC Error E-45"      │    │
│  │ Similarity: 0.81 │  Latency: 1.2s                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 👤 Client                                   14:35   │    │
│  │ I tried that but the error keeps coming back        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🤖 Julia                                    14:35   │    │
│  │ I'm not confident I can resolve this further.       │    │
│  │ Would you like to connect with our support team?    │    │
│  │                                                     │    │
│  │ Confidence: 38%  │  Articles: none above threshold  │    │
│  │ → Client chose: ESCALATE                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ⚡ SYSTEM                                   14:36   │    │
│  │ Ticket TKT-0042 created. Session ended.             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

PM sees the metadata (confidence, articles, similarity, latency) that the client never sees. This is the diagnostic view for understanding Julia's behavior.

---

### Screen 27: Ticket Detail — The Most Complex Screen

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Tickets                                          │
│                                                             │
│  TKT-0042: PLC fault on drive unit 3 — Line 1              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Client: Tata Steel       │ Contact: Suresh K.       │   │
│  │ Project: SCADA Line 1    │ Consignee: Jamshedpur P1 │   │
│  │ Created: 2025-01-18      │ Source: Widget            │   │
│  │ Status: [In Progress ▼]  │ Priority: [High ▼] 🔴     │   │
│  │ Level: SE1               │ Assigned: Amit Kumar      │   │
│  │ AMC: 🟢 Active            │                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
├──────────────┬───────────────────────────────────────────── │
│              │                                              │
│  ACTIONS     │  CONVERSATION THREAD                         │
│              │                                              │
│ ┌──────────┐ │  ┌────────────────────────────────────────┐  │
│ │ Reply    │ │  │ 📎 JULIA TRANSCRIPT        14:32      │  │
│ └──────────┘ │  │ (Expandable — click to view full       │  │
│ ┌──────────┐ │  │  widget conversation)                  │  │
│ │ Internal │ │  └────────────────────────────────────────┘  │
│ │ Note     │ │                                              │
│ └──────────┘ │  ┌────────────────────────────────────────┐  │
│ ┌──────────┐ │  │ 🟢 SYSTEM                   14:36      │  │
│ │ Log Call │ │  │ Ticket created from widget escalation.  │  │
│ └──────────┘ │  │ Assigned to Amit Kumar (SE1).           │  │
│ ┌──────────┐ │  └────────────────────────────────────────┘  │
│ │ Escalate │ │                                              │
│ │ → SE2    │ │  ┌────────────────────────────────────────┐  │
│ └──────────┘ │  │ 👤 Amit (SE1)               15:10      │  │
│ ┌──────────┐ │  │ Hi Suresh, I can see the E-45 error    │  │
│ │ Resolve  │ │  │ on your system. Can you confirm — is    │  │
│ └──────────┘ │  │ this happening on startup or during     │  │
│ ┌──────────┐ │  │ operation?                              │  │
│ │ Merge    │ │  │                          [Sent via ✉️]  │  │
│ └──────────┘ │  └────────────────────────────────────────┘  │
│              │                                              │
│ ──────────── │  ┌────────────────────────────────────────┐  │
│              │  │ 👤 Suresh (Client)         16:45      │  │
│ ATTACHMENTS  │  │ It happens during operation, about 30   │  │
│              │  │ minutes after startup. Motor gets hot.   │  │
│ ┌──────────┐ │  │                     [Received via ✉️]  │  │
│ │ photo.jpg│ │  └────────────────────────────────────────┘  │
│ │ 245 KB   │ │                                              │
│ │ [⬇ Down] │ │  ┌────────────────────────────────────────┐  │
│ └──────────┘ │  │ 🔒 INTERNAL NOTE — Amit      17:00     │  │
│              │  │ Sounds like a cooling issue, not PLC.    │  │
│ ──────────── │  │ Priya should check hardware side.       │  │
│              │  └────────────────────────────────────────┘  │
│ ESCALATION   │                                              │
│ HISTORY      │  ┌────────────────────────────────────────┐  │
│              │  │ 📞 CALL LOG — Amit           17:30     │  │
│ (none yet)   │  │ Called Suresh. Confirmed motor is       │  │
│              │  │ overheating. Fan unit may be blocked.    │  │
│              │  │ Duration: 12 min                        │  │
│              │  └────────────────────────────────────────┘  │
│              │                                              │
│              │  ─── REPLY BOX ───                           │
│              │  ┌────────────────────────────────────────┐  │
│              │  │ [Insert Canned Response ▼]             │  │
│              │  │                                        │  │
│              │  │ Type your reply to the client...       │  │
│              │  │                                        │  │
│              │  │                                        │  │
│              │  ├────────────────────────────────────────┤  │
│              │  │ [📎 Attach]              [Send Reply]  │  │
│              │  └────────────────────────────────────────┘  │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

This is the workhorse screen. Everything SE needs is here: context at the top, actions on the left, full thread in the center, reply box at the bottom.

The thread shows all message types in chronological order, visually distinct:
- Client messages → left-aligned, different background
- SE replies → right-aligned
- Internal notes → bordered, marked "Internal"
- Call logs → icon-marked, distinct style
- System messages → grey, centered

Action buttons on the left change based on role and ticket state. SE1 sees "Escalate → SE2." SE2 sees "Escalate → SE3." Resolved tickets show "Reopen" instead of "Resolve."

---

### Screen 28: Create Ticket (Manual)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Tickets                                          │
│                                                             │
│  CREATE NEW TICKET                                          │
│                                                             │
│  Client:          [Select Client          ▼]                │
│                                                             │
│  Project:         [Select Project         ▼]  (filtered)    │
│                                                             │
│  Contact Person:  [Select Contact         ▼]  (filtered)    │
│                                                             │
│  Consignee:       [Select Consignee       ▼]  (optional)    │
│                                                             │
│  Subject:                                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Description:                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │                                                         ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Priority:  ( ) Low  (●) Medium  ( ) High  ( ) Critical     │
│                                                             │
│  Assign To: [Amit Kumar (SE1)     ▼]                        │
│                                                             │
│  Attachments: [📎 Add Files]                                 │
│                                                             │
│  ☐ Send notification email to client                        │
│                                                             │
│  ┌──────────────────┐                                       │
│  │   Create Ticket  │                                       │
│  └──────────────────┘                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Dropdowns cascade: selecting a Client filters Projects, selecting a Project filters Contacts and Consignees. This prevents mismatched data.

---

### Screen 34: User Management

```
┌─────────────────────────────────────────────────────────────┐
│  Users                                       [+ Add User]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────┬──────────────────┬──────┬─────────────┐ │
│  │ Name           │ Email            │ Role │ Status      │ │
│  ├────────────────┼──────────────────┼──────┼─────────────┤ │
│  │ Neha Sharma    │ neha@company..   │ PM   │ 🟢 Active    │ │
│  │ Rajiv Mehta    │ rajiv@company..  │ Dir  │ 🟢 Active    │ │
│  │ Amit Kumar     │ amit@company..   │ SE1  │ 🟢 Active    │ │
│  │ Priya Singh    │ priya@company..  │ SE2  │ 🟢 Active    │ │
│  │ Vikram Patel   │ vikram@company.. │ SE3  │ 🟢 Active    │ │
│  │ Ravi Desai     │ ravi@company..   │ SE3  │ 🟢 Active    │ │
│  │ Deepak Joshi   │ deepak@company.. │ SE1  │ ⚫ Inactive  │ │
│  └────────────────┴──────────────────┴──────┴─────────────┘ │
│                                                             │
│  Click any row to edit                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Screens 37–40: Widget UI (Client-Facing)

```
┌──────────────────────────────┐
│  ┌──────────────────────┐    │
│  │                      │    │
│  │    Client's App /    │    │
│  │    Dashboard         │    │
│  │                      │    │
│  │                      │    │
│  │                      │    │
│  │                      │    │
│  │                      │    │
│  │                 ┌────┤    │
│  │                 │ 💬 │    │   ← Floating button
│  │                 └────┤    │
│  └──────────────────────┘    │
└──────────────────────────────┘

Client clicks the button → widget expands:

┌──────────────────────────────┐
│  ┌──────────────────────┐    │
│  │                 ┌────────┐│
│  │                 │ WIDGET ││
│  │                 │        ││
│  │                 │ ┌────┐ ││
│  │                 │ │Julia│ ││
│  │                 │ └────┘ ││
│  │                 │ Hi!    ││
│  │                 │ How can││
│  │                 │ I help?││
│  │                 │        ││
│  │                 │ FAQs:  ││
│  │                 │ ┌────┐ ││
│  │                 │ │Q1  │ ││
│  │                 │ ├────┤ ││
│  │                 │ │Q2  │ ││
│  │                 │ ├────┤ ││
│  │                 │ │Q3  │ ││
│  │                 │ └────┘ ││
│  │                 │        ││
│  │                 │[Type..]││
│  │                 │        ││
│  │                 └────────┘│
│  └──────────────────────┘    │
└──────────────────────────────┘
```

#### Widget State 1: Initial

```
┌────────────────────────────┐
│  🤖 Julia    Support    ✕  │
├────────────────────────────┤
│                            │
│  Hi! How can I help you    │
│  with SCADA Line 1 today?  │
│                            │
│  Common Questions:         │
│  ┌────────────────────────┐│
│  │ How to reset PLC?      ││
│  ├────────────────────────┤│
│  │ Firmware update steps  ││
│  ├────────────────────────┤│
│  │ Error code reference   ││
│  ├────────────────────────┤│
│  │ Network configuration  ││
│  └────────────────────────┘│
│                            │
│  Or type your question:    │
│  ┌──────────────────┐ ┌──┐ │
│  │                  │ │➤ │ │
│  └──────────────────┘ └──┘ │
└────────────────────────────┘
```

#### Widget State 2: Conversation

```
┌────────────────────────────┐
│  🤖 Julia    Support    ✕  │
├────────────────────────────┤
│                            │
│  🤖 Hi! How can I help?    │
│                            │
│      PLC showing E-45  👤  │
│      on drive unit 3       │
│                            │
│  🤖 Error E-45 indicates   │
│  a motor overload. Here    │
│  are the steps to check:   │
│                            │
│  1. Open HMI panel...      │
│  2. Check motor current... │
│                            │
│  Did this help?            │
│  ┌──────┐  ┌─────────────┐ │
│  │ Yes  │  │ Need help   │ │
│  └──────┘  └─────────────┘ │
│                            │
│  ┌──────────────────┐ ┌──┐ │
│  │                  │ │➤ │ │
│  └──────────────────┘ └──┘ │
└────────────────────────────┘
```

#### Widget State 3: Escalation Form

```
┌────────────────────────────┐
│  🤖 Julia    Support    ✕  │
├────────────────────────────┤
│                            │
│  🤖 I'll connect you with  │
│  our support team.         │
│                            │
│  Please confirm your       │
│  details:                  │
│                            │
│  Name:                     │
│  ┌────────────────────────┐│
│  │ Suresh Kumar           ││
│  └────────────────────────┘│
│                            │
│  Email:                    │
│  ┌────────────────────────┐│
│  │ suresh@tatasteel.com   ││
│  └────────────────────────┘│
│                            │
│  Brief description:        │
│  ┌────────────────────────┐│
│  │ PLC E-45 error persists││
│  │ after restart           ││
│  └────────────────────────┘│
│                            │
│  ┌────────────────────────┐│
│  │    Submit Ticket        ││
│  └────────────────────────┘│
│                            │
└────────────────────────────┘
```

#### Widget State 4: Confirmation

```
┌────────────────────────────┐
│  🤖 Julia    Support    ✕  │
├────────────────────────────┤
│                            │
│         ✅                  │
│                            │
│  Ticket TKT-0042 created!  │
│                            │
│  Our team will reach out   │
│  to you at:                │
│  suresh@tatasteel.com      │
│                            │
│  You can close this window │
│  and track updates via     │
│  email.                    │
│                            │
│  ┌────────────────────────┐│
│  │    Start New Chat       ││
│  └────────────────────────┘│
│                            │
└────────────────────────────┘
```

#### Widget — AMC Expired State

```
┌────────────────────────────┐
│  🤖 Julia    Support    ✕  │
├────────────────────────────┤
│                            │
│         ⚠️                  │
│                            │
│  Your maintenance contract │
│  for this project has      │
│  expired.                  │
│                            │
│  To renew your support     │
│  coverage, please contact: │
│                            │
│  Neha Sharma (PM)          │
│  neha@company.com          │
│  +91-XXXXXXXXXX            │
│                            │
│  Julia can still answer    │
│  general questions from    │
│  the FAQ above.            │
│                            │
└────────────────────────────┘
```

Note: Julia still provides Layer 1 (FAQ) and Layer 2 (KB answers) even with expired AMC. Only Layer 3 (ticket creation) is blocked.

---

### Component Library Decision

**Shadcn/ui + Tailwind CSS** for the internal app. Reasons:

- Not a monolithic component library — individual components installed as needed
- Fully customizable (source code lives in your project)
- Built on Radix UI primitives — accessible by default
- Tailwind keeps styling consistent without fighting a framework
- Clean, professional look appropriate for an internal tool

**Widget** uses custom styling — minimal dependencies, smaller bundle. No full component library. Just hand-built chat UI with Tailwind.

---

### Responsive Design

Internal app: designed for desktop first. Minimum viewport 1280px. Tablet (768px) as secondary support for PM checking dashboards on the go. No mobile optimization needed — this is a work tool used on office machines.

Widget: responsive by nature — it's a small floating panel. Works on any screen size. On mobile, the widget expands to full screen.

---

That completes Phase 5. Every screen accounted for.

---

---

# Phase 6 — MVP Scoping & Development Plan

---

## What Is MVP?

The minimum set of features that lets a PM set up a client, deploy the widget, have Julia answer questions, create tickets, and have SEs resolve them via email.

If the system can do this end-to-end for one real client, it's an MVP.

---

## MVP vs Phase 2 vs Phase 3

---

### MVP — Must Ship

| Module | What's Included | What's Excluded |
|---|---|---|
| **Auth** | Login, logout, password change, first-login force change | Password reset via email (manual reset by PM for now) |
| **Users** | PM creates/edits/deactivates users, role assignment | — |
| **Clients** | Full CRUD, status management | — |
| **Contacts** | Full CRUD, primary/secondary flag | — |
| **Consignees** | Full CRUD, project linking | — |
| **Projects** | Full CRUD, SE3 assignment, widget token generation, widget on/off | — |
| **AMCs** | Full CRUD, project linking, status auto-calculation | Expiry alerts (manual tracking for MVP) |
| **KB** | Create/edit/publish/archive articles, audience tagging, embedding generation | KB search, create-from-ticket shortcut |
| **Julia Config** | Per-project config (persona, threshold, tone, greeting, fallback) | Rulebooks (Julia uses defaults only) |
| **Julia Pipeline** | FAQ display (L1), RAG query-response (L2), escalation trigger (L3), AMC check, confidence scoring | Multi-turn conversation history (single-turn only in MVP) |
| **Widget** | Session init, FAQ display, single message → response, escalation form, confirmation, AMC expired state | Session analytics in widget |
| **Tickets** | Create (from widget + manual), assign, reply, internal note, escalate (SE1→SE2→SE3), resolve, close | Call logging, merge, auto-nudge, auto-close, reopen, feedback |
| **Email — Outbound** | Ticket created notification, SE reply to client, escalation notice, resolution notice | Nudge emails, AMC alerts, customizable templates |
| **Email — Inbound** | Client reply parsing via webhook, thread matching, status update | Attachment extraction from emails |
| **Notifications** | In-app notification list, mark as read | — |
| **Files** | Upload/download attachments on tickets | AMC document uploads |
| **Reports** | None | All reports are Phase 2 |
| **Audit Logs** | None | Phase 2 |
| **Canned Responses** | None | Phase 2 |
| **Email Templates** | Hardcoded in backend code | Editable via UI in Phase 2 |

---

### Phase 2 — Ship After MVP Validation

| Feature | Reason for Deferral |
|---|---|
| Julia multi-turn conversations | Needs testing with real data to tune properly |
| Julia rulebooks | PM needs experience with Julia before writing rules |
| Call logging on tickets | Useful but not blocking ticket resolution |
| Ticket merge | Edge case handling — rare in early usage |
| Ticket auto-nudge and auto-close | Needs confidence in email reliability first |
| Ticket reopen (by client) | Can be done manually by PM for now |
| Ticket feedback collection | Needs enough closed tickets to be meaningful |
| KB search (global) | PM can navigate by project for now |
| Create KB article from ticket | Shortcut — PM can copy-paste for now |
| AMC expiry alerts (automated) | PM tracks manually in MVP, 10–20 AMCs is manageable |
| AMC document uploads | Store PDFs locally or in email for now |
| All reports and dashboards | PM has direct DB access or basic admin views |
| Audit logs | Important but not user-facing in MVP |
| Canned responses | SEs can use text snippets externally for now |
| Editable email templates | Hardcoded templates work for MVP |
| Password reset via email | PM resets passwords manually in MVP |

---

### Phase 3 — Ship After 3+ Months of Usage

| Feature | Reason for Deferral |
|---|---|
| Director dashboard | Director can view PM's screens initially |
| Julia performance analytics | Needs months of data to be useful |
| Widget session analytics | Same |
| Engineer workload reports | PM knows intuitively with a small team |
| Layer resolution reports | Needs volume |
| Client satisfaction scoring | Needs volume |
| Email attachment extraction (inbound) | Complex parsing, edge cases |
| Advanced Julia confidence tuning | Needs real interaction data |
| Bulk KB import | Nice to have, not blocking |

---

## Dependency Map

What blocks what. Build order must respect this.

```
Database Setup
    └──► Users + Auth
            └──► Clients + Contacts + Consignees
                    └──► Projects
                            ├──► AMCs + AMC-Project linking
                            ├──► KB Articles + Embeddings
                            │       └──► Julia Pipeline
                            │               └──► Widget
                            │                      └──► Ticket Creation (from widget)
                            └──► Tickets (manual creation)
                                    └──► Ticket Messages + Thread
                                            └──► Email Outbound (reply to client)
                                                    └──► Email Inbound (client reply parsing)
                                                            └──► Notifications
```

You cannot build Tickets without Projects. You cannot build Julia without KB. You cannot build the Widget without Julia. Email inbound depends on email outbound (need ticket emails to exist before replies can come in).

---

## Sprint Plan — MVP

**Sprint duration: 2 weeks each. 6 sprints = 12 weeks for MVP.**

Assumes one full-stack developer working full-time. Adjust timeline if team is larger.

---

### Sprint 1: Foundation

**Goal:** Backend skeleton, database, auth, user management.

**Tasks:**
- Set up project: FastAPI project structure, Docker Compose (Postgres, Redis, Ollama)
- Implement database schema (all 22 tables via Alembic migrations)
- Build auth system: login, JWT token flow, refresh, password change
- Build users CRUD API
- Set up React project: Vite, Tailwind, Shadcn/ui, routing
- Build Login screen
- Build User Management screen (PM only)
- Connect frontend auth flow end-to-end

**Deliverable:** Developer can log in, create users, manage accounts. Database is ready.

---

### Sprint 2: Client & Project Management

**Goal:** Full client/project CRUD in both backend and frontend.

**Tasks:**
- Build Clients API: CRUD, status management
- Build Contacts API: CRUD, primary flag
- Build Consignees API: CRUD
- Build Projects API: CRUD, SE3 assignment, widget token generation
- Build AMCs API: CRUD, project linking, status calculation
- Build Project-Consignee linking
- Build frontend: Client List, Client Detail (all tabs), Add/Edit forms
- Build frontend: Project List, Project Detail (Overview tab), Add/Edit forms
- Build frontend: AMC List, AMC Detail, Add/Edit forms

**Deliverable:** PM can manage clients, contacts, consignees, projects, and AMCs. Full data entry is possible.

---

### Sprint 3: Knowledge Base & Julia Pipeline

**Goal:** KB management and Julia's RAG pipeline working end-to-end.

**Tasks:**
- Build KB Articles API: CRUD, status management, audience tagging
- Implement embedding generation (sentence-transformers, store in pgvector)
- Auto-embed on publish, re-embed on edit
- Build Julia config API: per-project settings
- Build Julia pipeline: query embedding → pgvector search → context relevance check → prompt construction → Ollama call → confidence scoring → response
- Test pipeline with sample KB articles and queries
- Build frontend: KB Article List, Article Editor, publish/archive flow
- Build frontend: Julia Config form on Project Detail page

**Deliverable:** PM can write KB articles. Julia can answer questions about them via API call. Pipeline works in isolation.

---

### Sprint 4: Widget & Ticket Creation

**Goal:** Widget deployed and creating tickets.

**Tasks:**
- Build Widget API: session init, FAQ fetch, message endpoint, escalate endpoint
- Build widget React app: initial state with FAQs, chat interface, escalation form, confirmation, AMC expired state
- Build widget loader script (widget.js)
- Build iframe embedding logic
- Implement AMC status check on escalation
- Implement contact email validation on escalation
- Build Tickets API: create (from widget + manual), read, status management
- Build ticket number generation (sequence)
- Attach Julia transcript to widget-created tickets
- Build frontend: Create Ticket form (manual)
- Test full flow: widget opens → Julia answers → client escalates → ticket created

**Deliverable:** Widget is functional. Julia answers questions. Escalation creates tickets. Full L1 → L2 → L3 flow works.

---

### Sprint 5: Ticket Lifecycle & Email

**Goal:** SEs can work tickets. Email communication works.

**Tasks:**
- Build Ticket Messages API: reply, internal note
- Build ticket escalation API: SE1→SE2→SE3, with assignment changes
- Build ticket status transitions: new → in_progress → pending_client → resolved → closed
- Build escalation history recording
- Set up Resend account, configure domain
- Build email outbound: ticket created notification, SE reply sends email, escalation notice, resolution notice
- Configure reply-to header with ticket reference
- Build email inbound: Resend webhook endpoint, signature verification, ticket matching, thread insertion, status update
- Build frontend: Ticket Queue/List with filters and sorting
- Build frontend: Ticket Detail page (full thread, reply box, internal note, escalate button, resolve button)
- Build frontend: Notification dropdown (basic)

**Deliverable:** SE1 sees tickets, replies, escalates. Client gets emails, replies, replies appear in thread. Full ticket lifecycle works.

---

### Sprint 6: Integration Testing & Polish

**Goal:** End-to-end testing, bug fixes, deployment.

**Tasks:**
- Full end-to-end testing: PM creates client → creates project → adds KB articles → deploys widget → client asks question → Julia answers → client escalates → ticket created → SE1 replies → client replies via email → SE1 escalates to SE2 → SE2 resolves → client gets resolution email
- Fix bugs found during testing
- Build Notifications API and frontend (in-app notification list)
- File upload/download for ticket attachments
- Build SE dashboard (ticket queue with summary cards)
- Build PM dashboard (basic overview cards — hardcoded queries, no fancy reports)
- Performance testing: Julia response time, concurrent widget sessions
- Security review: auth flow, widget token validation, email webhook verification
- Deploy to production server
- Configure Nginx, SSL, domain
- Deploy widget on one test project
- Write basic documentation for PM (how to add clients, articles, configure Julia)

**Deliverable:** MVP is live. One pilot client is using the widget. Team is working tickets through the system.

---

## Sprint Calendar (Example)

| Sprint | Dates | Focus |
|---|---|---|
| Sprint 1 | Weeks 1–2 | Foundation, Auth, Users |
| Sprint 2 | Weeks 3–4 | Clients, Projects, AMCs |
| Sprint 3 | Weeks 5–6 | KB, Julia Pipeline |
| Sprint 4 | Weeks 7–8 | Widget, Ticket Creation |
| Sprint 5 | Weeks 9–10 | Ticket Lifecycle, Email |
| Sprint 6 | Weeks 11–12 | Integration, Polish, Deploy |

**MVP live by end of Week 12.**

---

## Post-MVP Timeline

| Phase | Duration | Key Features |
|---|---|---|
| Phase 2 | Weeks 13–20 (8 weeks) | Multi-turn Julia, rulebooks, call logging, merge, auto-nudge/close, reopen, feedback, KB search, create-from-ticket, AMC alerts, reports, audit logs, canned responses, email templates UI, password reset |
| Phase 3 | Weeks 21–26 (6 weeks) | Director dashboard, Julia analytics, widget analytics, engineer workload reports, layer resolution reports, advanced confidence tuning |

**Full system complete by Week 26 (~6 months).**

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Julia gives wrong answers on industrial topics | High — could cause harm | Conservative confidence threshold (70%+ to answer without caveat). Human review of all KB articles. Julia never invents technical info |
| Email deliverability issues | High — client never sees replies | Use Resend with proper domain verification (SPF, DKIM, DMARC). Test with Gmail, Outlook, corporate mail servers before launch |
| Ollama/LLM crashes or hangs | Medium — widget becomes unresponsive | Health check endpoint for Ollama. If LLM is down, widget shows "Our AI assistant is temporarily unavailable" and offers direct ticket creation |
| Client replies from wrong email | Medium — reply doesn't match ticket | Catch-all inbox for unmatched emails. PM manually routes them. Log unmatched emails in admin panel |
| KB too sparse at launch | High — Julia can't answer anything | Write minimum 5 articles per pilot project before widget goes live. Use existing documentation, SOPs, FAQs as source material |
| Single server failure | High — entire system down | Daily automated backups (DB + files). Documented recovery procedure. Move to redundant setup in Phase 2 if needed |

---

## Launch Checklist

Before going live with the first pilot client:

- [ ] PM has created the client, contacts, consignees, project in the system
- [ ] At least 5–10 KB articles published for the pilot project
- [ ] Julia tested with 20+ sample queries — acceptable answer quality confirmed
- [ ] Widget deployed on client's dashboard/app
- [ ] Widget tested from client's network (firewall, proxy considerations)
- [ ] Email domain verified (SPF, DKIM, DMARC records set)
- [ ] Test emails sent and received from major providers (Gmail, Outlook)
- [ ] Inbound email webhook tested — reply appears in ticket thread
- [ ] AMC for pilot project is active and linked
- [ ] All SE1, SE2, SE3 accounts created and tested
- [ ] SE team has been shown the system — basic training (1 hour)
- [ ] PM has been shown client management, KB, Julia config — PM training (2 hours)
- [ ] Backup system configured and tested
- [ ] Monitoring set up (server health, Ollama health, basic uptime check)
- [ ] Rollback plan documented (if widget causes issues on client's app, how to disable)

---

## What You Now Have

A complete project blueprint:

| Document | Status |
|---|---|
| Problem Statement | ✅ |
| Feature Scope & Roles | ✅ |
| Scenarios & Edge Cases | ✅ |
| Module Map | ✅ |
| Detailed User Flows (all modules) | ✅ |
| Julia Architecture (RAG pipeline) | ✅ |
| Permission Matrix | ✅ |
| Notification Map | ✅ |
| System Architecture (component diagram) | ✅ |
| Authentication Architecture | ✅ |
| Data Flow Diagrams | ✅ |
| Full API Specification (60+ endpoints) | ✅ |
| Tech Stack (final) | ✅ |
| Cost Breakdown (INR) | ✅ |
| Database Schema (22 tables, implementation-ready) | ✅ |
| UI/UX Wireframes (40 screens) | ✅ |
| MVP Scope Definition | ✅ |
| Phase 2 & Phase 3 Scope | ✅ |
| Sprint Plan (6 sprints, 12 weeks) | ✅ |
| Dependency Map | ✅ |
| Risk Register | ✅ |
| Launch Checklist | ✅ |

---

This is everything needed to start Sprint 1 tomorrow. The next thing that needs to happen is someone opening an IDE, running `docker compose up`, and writing the first migration file.

Ready to build?
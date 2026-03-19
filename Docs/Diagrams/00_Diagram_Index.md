# Diagram 14: Diagram Index & Wireframe Reference

> **Purpose:** Master index of all diagrams + links to existing wireframes in Phase 5.

---

## Complete Diagram Index

| # | Diagram Name | Type | File |
|---|---|---|---|
| 1 | Module Map | Flowchart | [01_Module_Map.md](file:///c:/Users/josep/Documents/ATC_Support_Julia/Docs/Diagrams/01_Module_Map.md) |
| 2 | System Architecture + Tech Stack | Flowchart | [02_System_Architecture.md](file:///c:/Users/josep/Documents/ATC_Support_Julia/Docs/Diagrams/02_System_Architecture.md) |
| 3 | ER Diagram (Database) | ER Diagram | [03_ER_Diagram.md](file:///c:/Users/josef/Documents/ATC_Support_Julia/Docs/Diagrams/03_ER_Diagram.md) |
| 4 | Ticket Status Flow | State Diagram | [04_Ticket_Status_Flow.md](file:///c:/Users/josep/Documents/ATC_Support_Julia/Docs/Diagrams/04_Ticket_Status_Flow.md) |
| 5 | Data Flow: Widget → Julia → Answer | Sequence Diagram | [05_DataFlow_Widget_Julia.md](file:///c:/Users/josep/Documents/ATC_Support_Julia/Docs/Diagrams/05_DataFlow_Widget_Julia.md) |
| 6 | Data Flow: Escalation → Ticket → Email | Sequence Diagram | [06_DataFlow_Ticket_Email.md](file:///c:/Users/josep/Documents/ATC_Support_Julia/Docs/Diagrams/06_DataFlow_Ticket_Email.md) |
| 7 | Data Flow: SE1 → SE2 → SE3 Escalation | Sequence Diagram | [07_DataFlow_Escalation.md](file:///c:/Users/josep/Documents/ATC_Support_Julia/Docs/Diagrams/07_DataFlow_Escalation.md) |
| 8 | Wireflow: Client Uses Widget | Flowchart | [08_Wireflow_Client_Widget.md](file:///c:/Users/josep/Documents/ATC_Support_Julia/Docs/Diagrams/08_Wireflow_Client_Widget.md) |
| 9 | Wireflow: SE Handles Ticket | Flowchart | [09_Wireflow_SE_Ticket.md](file:///c:/Users/josep/Documents/ATC_Support_Julia/Docs/Diagrams/09_Wireflow_SE_Ticket.md) |
| 10 | Wireflow: PM Sets Up Client | Flowchart | [10_Wireflow_PM_Setup.md](file:///c:/Users/josep/Documents/ATC_Support_Julia/Docs/Diagrams/10_Wireflow_PM_Setup.md) |
| 11 | MVP Scope Map | Flowchart | [11_MVP_Scope.md](file:///c:/Users/josep/Documents/ATC_Support_Julia/Docs/Diagrams/11_MVP_Scope.md) |
| 12 | Sprint Dependency Map | Flowchart | [12_Sprint_Dependencies.md](file:///c:/Users/josep/Documents/ATC_Support_Julia/Docs/Diagrams/12_Sprint_Dependencies.md) |
| 13 | Sprint Timeline (Gantt) | Gantt Chart | [13_Sprint_Timeline.md](file:///c:/Users/josep/Documents/ATC_Support_Julia/Docs/Diagrams/13_Sprint_Timeline.md) |

---

## Wireframes (Text-Based — Already Exist)

The detailed screen wireframes (ASCII art) are in the existing Phase 5 document. **Key screens for PM review:**

| Screen | Lines in Phase 5 Doc | Contents |
|---|---|---|
| Login | Lines 231-257 | Email + Password + Forgot Password |
| SE1 Dashboard | Lines 261-304 | Ticket queue with stats |
| PM Dashboard | Lines 308-347 | Overview cards, charts, alerts |
| Director Dashboard | Lines 350-387 | High-level metrics, read-only |
| Client List | Lines 391-415 | Search, filters, AMC status |
| Client Detail (Tabbed) | Lines 418-467 | Contacts, Consignees, Projects, AMCs tabs |
| Project Detail (Tabbed) | Lines 471-535 | KB, Julia Config, Rulebooks, Widget, Tickets tabs |
| KB Article Editor | Lines 539-582 | Rich text editor, audience, draft/publish |
| Session Transcript Viewer | Lines 586-639 | Julia diagnostic view with confidence scores |
| **Ticket Detail** | **Lines 643-728** | **The most complex screen — full thread + actions** |
| Create Ticket | Lines 732-775 | Cascading dropdowns, priority, attachments |
| User Management | Lines 779-801 | User list, role, status |
| Widget (4 states) | Lines 805-999 | Initial, Chat, Escalation, Confirmation, AMC Expired |

**Reference:** [Phase 5 and Phase 6.md](file:///c:/Users/josep/Documents/ATC_Support_Julia/Docs/Phase%205%20and%20Phase%206.md)

---

## How to Render All Diagrams

### Quick Method (Recommended)
1. Open [mermaid.live](https://mermaid.live) in your browser
2. Open any diagram file
3. Copy the content between ` ```mermaid ` and ` ``` `
4. Paste into the left panel of mermaid.live
5. Diagram renders instantly on the right
6. Click **Actions → Export PNG** (or SVG for scalable)
7. Save the image

### For Presentations
- Export as **SVG** for slide decks (scales without blur)
- Export as **PNG** at 2x scale for documents
- Use a white background for print, dark background for screen presentations

### For VS Code Preview
- Install the **Markdown Preview Mermaid Support** extension
- Open any diagram `.md` file
- Press `Ctrl+Shift+V` to see live preview with rendered diagrams

---

## PM Presentation Order

When presenting to PM, show diagrams in this order:

```
1. Module Map (Diagram 1)           ← "Here's what we're building"
2. System Architecture (Diagram 2)  ← "Here's how it fits together"
3. Data Flow: Julia (Diagram 5)     ← "Here's how the AI works"
4. Data Flow: Tickets (Diagram 6)   ← "Here's how tickets flow"
5. Data Flow: Escalation (Diagram 7)← "Here's how escalation works"
6. Wireflow: Widget (Diagram 8)     ← "Here's what the client sees"
7. Wireflow: SE (Diagram 9)         ← "Here's what engineers see"
8. Wireflow: PM (Diagram 10)        ← "Here's what YOU will do"
9. ER Diagram (Diagram 3)           ← "Here's the data structure"
10. Ticket Status (Diagram 4)       ← "Here's the ticket lifecycle"
11. MVP Scope (Diagram 11)          ← "Here's what's in and out"
12. Sprint Timeline (Diagram 13)    ← "Here's the timeline"
13. Sprint Dependencies (Diagram 12)← "Here's the build order"
```



<thinking>
The user wants to start Phase 1 — System Design. Let me think about what to tackle first.

Phase 1 includes:
1. Module map with clear boundaries
2. Detailed user flows
3. Julia's design
4. Permission matrix
5. Notification map

I think the right order is:
1. Module map first (we have a draft, let's finalize)
2. User flows (the biggest piece)
3. Permission matrix
4. Notification map
5. Julia's design (its own deep dive)

Let me start with the Module Map and then move into detailed User Flows.

For user flows, I need to cover every action every role takes. Let me organize by module and role:

**Module 1: User & Access Management**
- Director creates PM account
- PM creates SE accounts
- Login/logout
- Password reset
- Profile management

**Module 2: Client & Account Management**
- PM adds a client
- PM adds contact persons
- PM adds consignees
- PM edits/deactivates a client
- PM views client list/detail

**Module 3: AMC Management**
- PM creates AMC
- PM links projects to AMC
- PM updates AMC dates
- System checks AMC status
- System sends expiry alerts
- AMC expires — what happens

**Module 4: Project Management**
- PM creates project
- PM assigns SE3
- PM generates widget token
- PM enables/disables widget
- PM links consignees to project
- PM configures widget branding

**Module 5: Knowledge Base**
- PM/SE3 creates article
- PM reviews draft articles
- PM tags articles (Julia/Internal/Both)
- PM edits/archives articles
- Resolved ticket → KB article workflow

**Module 6: Julia Management**
- PM configures Julia per project (confidence threshold, tone, persona)
- PM creates/edits rulebook entries
- Julia receives query → processes → responds (internal flow)
- Julia escalation trigger
- Widget session logging

**Module 7: Ticket Lifecycle**
- Ticket creation (from widget)
- Ticket creation (manual by SE/PM)
- SE1 receives and triages
- SE1 responds to client
- Client replies via email
- SE1 adds internal note
- SE1 escalates to SE2
- SE2 escalates to SE3
- Any SE logs a call
- Any SE attaches files
- Ticket status changes (flow)
- Ticket pending client → nudge → auto-close
- Ticket resolution → feedback
- Ticket reopen
- Ticket merge
- PM monitors tickets

**Module 8: Communication & Notifications**
- Email sent on ticket creation
- Email sent on reply
- Email sent on escalation
- Email sent on resolution
- Email nudge on pending
- AMC expiry notification
- In-app notifications

**Module 9: Reporting & Analytics**
- PM views ticket summary
- PM views layer resolution stats
- PM views engineer workload
- PM views AMC tracker
- Director views high-level dashboard
- Widget session analytics

This is a LOT of content. Let me be thorough but organized. I'll structure it as detailed user flows with clear steps.

Let me start writing this out. Given the volume, I'll cover the Module Map finalization and then start with the detailed user flows module by module.

This is going to be a long response but the user clearly wants comprehensive documentation.
</thinking>

## Phase 1 — System Design

### Part 1: Module Map (Final)

---

Nine modules. Each one has a clear owner, clear boundaries, and no overlap.

---

**Module 1 — User & Access Management**

Owns: user accounts, roles, login, authentication, permissions.

Does not own: project assignments (that's Module 4), ticket assignments (that's Module 7).

Primary user: PM (creates accounts), Director (oversight).

---

**Module 2 — Client & Account Management**

Owns: client records, contact persons, consignees, client status.

Does not own: AMCs (Module 3), projects (Module 4), tickets (Module 7).

Primary user: PM.

---

**Module 3 — AMC Management**

Owns: AMC records, AMC-project linking, expiry tracking, status checks, renewal alerts.

Does not own: client data (Module 2), billing/invoicing (out of scope).

Primary user: PM. System (automated checks).

---

**Module 4 — Project Management**

Owns: project records, SE3 assignment, widget token generation, widget on/off, consignee-project linking.

Does not own: KB content (Module 5), Julia config (Module 6), tickets (Module 7).

Primary user: PM.

---

**Module 5 — Knowledge Base**

Owns: KB articles, article tagging (Julia/Internal/Both), article lifecycle (draft → published → archived), document uploads, search.

Does not own: Julia's behavior rules (Module 6), ticket content (Module 7).

Primary users: PM (manages), SE3 (contributes), Julia (reads).

---

**Module 6 — Julia Management**

Owns: Julia's per-project configuration, confidence thresholds, tone settings, rulebook entries, escalation triggers, widget session logs.

Does not own: KB content (Module 5), ticket creation logic (Module 7), widget deployment (Module 4).

Primary user: PM (configures). Julia (executes).

---

**Module 7 — Ticket Lifecycle**

Owns: ticket creation, assignment, status transitions, conversation thread, internal notes, call logs, attachments, escalation chain, merge, reopen, close, feedback.

Does not own: email delivery mechanics (Module 8), reporting aggregation (Module 9).

Primary users: SE1, SE2, SE3, PM (oversight). Client (via email).

---

**Module 8 — Communication & Notifications**

Owns: email templates, email delivery and tracking, inbound email parsing, in-app notifications, automated nudges, AMC alert delivery, canned responses.

Does not own: ticket content (Module 7), AMC logic (Module 3).

Primary users: System (automated). PM (template management).

---

**Module 9 — Reporting & Analytics**

Owns: dashboards, ticket reports, layer resolution stats, engineer workload, AMC tracker, widget session analytics, data exports.

Does not own: raw data (reads from other modules).

Primary users: PM, Director.

---

---

### Part 2: Detailed User Flows

Every action, every role, step by step.

---

## MODULE 1 — User & Access Management

---

### Flow 1.1: PM Creates a New User Account

**Actor:** PM

1. PM navigates to Users → Add User
2. Fills in: full name, email, phone, role (dropdown: SE1, SE2, SE3, PM, Director)
3. If role is SE3 — no project assignment yet (that happens in Module 4)
4. PM clicks Save
5. System creates the account, generates a temporary password
6. System sends an email to the new user: "Your account has been created. Here are your login credentials. Please change your password on first login."
7. User appears in the Users list with status Active

**Edge cases:**
- Email already exists in system → error: "A user with this email already exists"
- PM tries to create a Director account → allowed only if current user is also Director
- PM tries to create another PM account → allowed (system supports multiple PMs)

---

### Flow 1.2: User Logs In

**Actor:** Any internal user

1. User opens the web app login page
2. Enters email and password
3. System validates credentials
4. If first login → forced password change screen
5. On success → redirected to role-appropriate dashboard:
   - SE1 → Ticket Queue
   - SE2 → Ticket Queue (filtered to SE2 assignments)
   - SE3 → My Projects + Ticket Queue
   - PM → Dashboard (overview)
   - Director → Dashboard (high-level)

**Edge cases:**
- Wrong password 3 times → account temporarily locked for 15 minutes
- Deactivated account → "Your account is inactive. Contact your administrator."

---

### Flow 1.3: PM Deactivates a User

**Actor:** PM

1. PM goes to Users → selects user → Edit
2. Changes status from Active to Inactive
3. System checks: does this user have open tickets assigned?
4. If yes → warning: "This user has 3 open tickets. Reassign before deactivating."
5. PM reassigns tickets first (from ticket management), then deactivates
6. Deactivated user can no longer log in
7. Their name remains on historical records

---

### Flow 1.4: User Resets Password

**Actor:** Any internal user

1. User clicks "Forgot Password" on login screen
2. Enters their email
3. System sends a password reset link (time-limited, single-use)
4. User clicks link, sets new password
5. Redirected to login

---

---

## MODULE 2 — Client & Account Management

---

### Flow 2.1: PM Adds a New Client

**Actor:** PM

1. PM navigates to Clients → Add Client
2. Fills in: company name, industry, city, address, phone, email (general), notes
3. Clicks Save
4. Client record is created with status Active
5. PM is redirected to the Client Detail page — empty tabs for Contacts, Consignees, Projects, AMCs

**Edge cases:**
- Duplicate company name → warning: "A client with this name already exists. Continue anyway?" (Different branches of same company are valid)

---

### Flow 2.2: PM Adds Contact Persons

**Actor:** PM (from Client Detail page)

1. PM clicks Contacts tab → Add Contact
2. Fills in: name, email, phone, designation, marks as Primary or Secondary
3. Clicks Save
4. Contact is linked to the client
5. This email is what the system uses to identify the person in the widget and in email replies

**Edge cases:**
- Same email used across two clients → blocked. One email = one contact = one client. If a person works across two client companies, they need separate entries with different emails
- No primary contact set → warning when trying to link to a project: "This client has no primary contact"

---

### Flow 2.3: PM Adds Consignees

**Actor:** PM (from Client Detail page)

1. PM clicks Consignees tab → Add Consignee
2. Fills in: site name, address, city, site contact person name and phone
3. Clicks Save
4. Consignee is linked to the client
5. Can later be linked to specific projects

---

### Flow 2.4: PM Edits Client Details

**Actor:** PM

1. PM opens Client Detail → clicks Edit
2. Modifies fields
3. Clicks Save
4. Audit log records: field changed, old value, new value, changed by, timestamp

---

### Flow 2.5: PM Deactivates a Client

**Actor:** PM

1. PM opens Client Detail → changes status to Inactive
2. System checks: are there active projects? Active AMCs? Open tickets?
3. If any exist → warning with details: "This client has 2 active projects and 1 open ticket"
4. PM must resolve those first or confirm deactivation
5. On deactivation: widget stops working for all projects under this client. No new tickets can be created. Existing open tickets remain accessible but flagged

---

---

## MODULE 3 — AMC Management

---

### Flow 3.1: PM Creates an AMC

**Actor:** PM

1. PM navigates to AMCs → Add AMC
2. Fills in: contract number, linked client (dropdown), start date, end date, coverage description (text), notes
3. Uploads signed contract PDF (file attachment)
4. Clicks Save
5. AMC is created with status auto-calculated: Active (if today is between start and end), Upcoming (if start is future), Expired (if end is past)

---

### Flow 3.2: PM Links Projects to AMC

**Actor:** PM (from AMC Detail page)

1. PM clicks "Link Projects" → sees list of projects belonging to this AMC's client
2. Selects one or more projects
3. Clicks Save
4. Those projects now check this AMC for Layer 3 access

**Edge cases:**
- A project is linked to two AMCs → system uses the one with the latest end date
- Project already linked to an active AMC, PM tries to link to another → warning, but allowed (overlapping coverage periods are valid)

---

### Flow 3.3: System Sends AMC Expiry Alerts

**Actor:** System (automated)

1. System runs a daily check at midnight
2. Finds AMCs where end date is exactly 60 days away → sends notification to PM: "AMC for [Client] expires in 60 days"
3. Finds AMCs where end date is exactly 30 days away → sends notification to PM + Director
4. Finds AMCs where end date is today → marks AMC as Expired, sends notification to PM + Director: "AMC for [Client] has expired today"

---

### Flow 3.4: AMC Expires — What Happens

**Actor:** System

1. AMC status flips to Expired
2. Any project linked only to this AMC now has no active coverage
3. Next time a client on that project tries to escalate to Layer 3 via widget → blocked with renewal message
4. Existing open tickets on that project continue to be worked — no interruption
5. No new tickets can be created from the widget for uncovered projects
6. Manual ticket creation by SE/PM is still possible (for goodwill cases, Neha/Rajiv decide)

---

### Flow 3.5: PM Renews an AMC

**Actor:** PM

1. PM opens the expired AMC → clicks Edit
2. Updates end date to the new renewal date
3. Uploads new contract PDF
4. Status auto-recalculates to Active
5. Widget access for linked projects is restored immediately

---

---

## MODULE 4 — Project Management

---

### Flow 4.1: PM Creates a Project

**Actor:** PM

1. PM navigates to Projects → Add Project
2. Fills in: project name, linked client (dropdown), description, status (Active)
3. Assigns SE3 (dropdown of users with SE3 role)
4. Links consignees from the client's consignee list
5. Clicks Save
6. System auto-generates a unique widget token for this project
7. PM copies the widget embed snippet from the project detail page
8. Widget status defaults to Off

---

### Flow 4.2: PM Deploys the Widget

**Actor:** PM + SE3

1. PM sends the embed snippet to SE3
2. SE3 deploys it on the client's dashboard/application
3. SE3 confirms deployment to PM
4. PM goes to Project Detail → Widget Settings → toggles Widget to On
5. Widget is now live for that project

---

### Flow 4.3: PM Reassigns SE3

**Actor:** PM

1. PM opens Project Detail → clicks Edit
2. Changes SE3 assignment from one user to another
3. System checks: are there open tickets at SE3 level for this project?
4. If yes → "There are 2 open tickets assigned to [old SE3]. Reassign them?" PM confirms
5. Those tickets are reassigned to the new SE3
6. Audit log records the change

---

### Flow 4.4: PM Deactivates a Project

**Actor:** PM

1. PM opens Project Detail → changes status to Inactive
2. Widget is automatically turned off — clients see "Support for this service is currently unavailable"
3. Open tickets for this project remain accessible and workable
4. No new tickets can be created
5. KB articles remain but are no longer served by Julia

---

---

## MODULE 5 — Knowledge Base

---

### Flow 5.1: PM Creates a KB Article

**Actor:** PM

1. PM navigates to Knowledge Base → selects project → Add Article
2. Fills in: title, body (rich text), category/tags, audience (Julia Only / Internal Only / Both)
3. Saves as Draft or Published
4. If Published and tagged Julia → article is immediately available for Julia's RAG pipeline
5. If Internal Only → visible in the internal KB search, not used by Julia

---

### Flow 5.2: SE3 Submits a KB Article Draft

**Actor:** SE3

1. SE3 navigates to Knowledge Base → selects their assigned project → Add Article
2. Writes the article, saves as Draft
3. PM receives notification: "New KB draft submitted by [SE3] for [Project]"
4. PM reviews, edits if needed, changes audience tag, publishes

---

### Flow 5.3: Resolved Ticket → KB Article

**Actor:** PM

1. PM reviews a closed ticket with a useful resolution
2. Clicks "Create KB Article from Ticket"
3. System pre-fills the article body with the ticket's resolution notes
4. PM edits for clarity, adds title, sets audience tag
5. Publishes
6. Julia now knows this solution for future queries

---

### Flow 5.4: PM Archives an Article

**Actor:** PM

1. PM opens article → changes status to Archived
2. Article is removed from Julia's active search pool
3. Article remains in the system for historical reference but doesn't surface in searches unless filtered

---

### Flow 5.5: Anyone Searches the KB

**Actor:** Any internal user

1. User goes to Knowledge Base → types a search query
2. System searches across titles and body text
3. Results are filtered by the user's accessible projects
4. SE3 sees only their assigned projects' articles
5. PM and Director see all
6. Internal-only articles are visible to all internal users but never surfaced in the widget

---

---

## MODULE 6 — Julia Management

---

### Flow 6.1: PM Configures Julia for a Project

**Actor:** PM

1. PM goes to Project Detail → Julia Settings tab
2. Configures:
   - **Persona name**: what Julia calls herself for this project (default: "Julia")
   - **Greeting message**: customizable first message when widget opens
   - **Confidence threshold**: 0–100 scale. Below this, Julia offers escalation instead of answering (default: 60)
   - **Tone**: Professional / Friendly / Technical (affects prompt phrasing)
   - **Fallback message**: what Julia says when she can't help ("I'm not confident I can help with this. Would you like to connect with our support team?")
3. Saves configuration
4. Changes take effect immediately on the widget

---

### Flow 6.2: PM Creates a Rulebook Entry

**Actor:** PM

1. PM goes to Julia Settings → Rulebooks tab → Add Rule
2. Fills in:
   - **Rule name**: "Production Down Escalation"
   - **Trigger condition** (text-based): "If the client mentions production down, system halt, or emergency"
   - **Julia's action**: "Immediately offer escalation. Do not attempt to answer."
   - **Priority**: High (rules are evaluated in priority order)
   - **Status**: Active
3. Saves
4. This rule is injected into Julia's system prompt for this project

**How this works technically:** Rulebook entries are formatted as instructions in Julia's system prompt. They're not code logic — they're natural language directives that shape the LLM's behavior. "If the user mentions X, do Y." The LLM follows them as part of its instruction set.

---

### Flow 6.3: Julia Receives a Query (Internal Flow)

**Actor:** Julia (system)

This is the core flow. Step by step:

1. Client types a message in the widget
2. Widget sends the message + project token + session ID to the backend API
3. Backend identifies the project from the token
4. Backend checks: is this the first message in the session?
   - If yes → load FAQ list for this project, present alongside Julia's greeting
   - If the client clicked an FAQ → return that article directly (Layer 1)
   - If the client typed a question → proceed to Layer 2
5. Backend retrieves Julia's configuration for this project (confidence threshold, tone, persona, rulebooks)
6. Backend generates an embedding of the client's query
7. Backend searches the project's KB articles (tagged Julia or Both) via pgvector similarity search
8. Top 3–5 matching articles are retrieved with their similarity scores
9. Backend constructs Julia's prompt:
   - System prompt: persona, tone, rulebooks, instructions
   - Context: retrieved KB articles
   - Conversation history: previous messages in this session
   - User query: the client's current message
10. Backend sends the prompt to the LLM (Ollama)
11. LLM returns a response
12. Backend evaluates confidence:
    - Are the retrieved articles highly relevant (similarity score above threshold)?
    - Did Julia's response rely on the articles or did she generate from general knowledge?
    - If confidence is below the project's threshold → append the fallback message offering escalation
13. Response is sent back to the widget
14. Session log is updated: query, response, confidence score, articles used, timestamp

---

### Flow 6.4: Julia Escalates to Layer 3

**Actor:** Julia (system) + Client

1. Julia has offered escalation (either due to low confidence or client request)
2. Client clicks "Yes, connect me with support"
3. System checks AMC status for this project:
   - **Active** → proceed to ticket creation
   - **Expired** → show renewal message with PM contact info, notify PM. No ticket created
   - **No AMC exists** → same as expired
4. If AMC active → system presents a brief form:
   - Client's name (pre-filled from session if email was captured)
   - Client's email (required — must match a contact person registered under this project's client)
   - Brief description (pre-filled from the chat)
5. Client submits
6. System validates the email against registered contacts
   - Match → ticket created, linked to that contact person, project, client, consignee
   - No match → "This email is not registered for support. Please contact your account manager." This prevents random people from creating tickets through the widget
7. Ticket is created: status New, priority default, assigned to SE1
8. Full Julia transcript is attached to the ticket
9. Client sees: "Ticket TKT-XXXX has been created. You'll receive updates at [email]."
10. SE1 receives notification: new ticket
11. Client gets confirmation email

---

### Flow 6.5: PM Reviews Widget Session Analytics

**Actor:** PM

1. PM goes to Julia Settings → Session Logs
2. Sees a list of all widget sessions for this project
3. Each entry shows: date, contact email (if captured), query summary, resolution layer (L1 FAQ / L2 Julia / L3 Escalated), session duration
4. PM can filter by date range, resolution layer
5. PM identifies patterns: "Lots of queries about firmware updates — need more KB articles on this topic"

---

---

## MODULE 7 — Ticket Lifecycle

---

### Flow 7.1: Ticket Created from Widget

**Actor:** System (triggered by Julia escalation)

Already covered in Flow 6.4. The ticket arrives in SE1's queue.

---

### Flow 7.2: Ticket Created Manually

**Actor:** SE1, SE2, SE3, or PM

1. User navigates to Tickets → Create Ticket
2. Fills in:
   - Client (dropdown)
   - Project (filtered by selected client)
   - Contact person (filtered by selected client)
   - Subject
   - Description
   - Priority (Low / Medium / High / Critical)
   - Attachments (optional)
3. Clicks Create
4. Ticket is created with status New
5. If created by SE1 → assigned to SE1
6. If created by SE2/SE3/PM → they choose who to assign (default: SE1)
7. Client gets email notification: "A support ticket TKT-XXXX has been created for your query"

**When this happens:** Client emailed an SE directly, or called, or mentioned an issue in a meeting. The SE creates the ticket to formalize it.

---

### Flow 7.3: SE1 Triages a New Ticket

**Actor:** SE1

1. SE1 opens their ticket queue → sees TKT-XXXX with status New
2. Opens the ticket detail → reads description, Julia transcript (if widget-created), attachments
3. SE1 decides:
   - **Can handle it** → changes status to In Progress, starts working
   - **Needs more info from client** → writes a reply asking for details, status changes to Pending Client
   - **Not their domain** → escalates immediately to SE2 or SE3

---

### Flow 7.4: SE Replies to Client

**Actor:** SE1 (or whoever currently owns the ticket)

1. SE opens the ticket → types a reply in the reply box
2. Optionally attaches files
3. Clicks Send
4. System sends the reply as an email to the client's registered contact email
5. The email includes: SE's name, reply content, ticket reference number in subject
6. Reply appears in the ticket thread with timestamp and author
7. Ticket status stays In Progress (or moves to Pending Client if SE is waiting for a response)

---

### Flow 7.5: Client Replies via Email

**Actor:** Client (via email)

1. Client replies to the ticket email from their inbox
2. Email hits the system's inbound email processing (webhook from email service)
3. System parses: sender email, subject line (extracts ticket number), body text, attachments
4. Matches to the correct ticket
5. Reply appears in the ticket thread as a client message
6. If ticket was Pending Client → status automatically moves to In Progress
7. Assigned SE gets notification: "Client replied on TKT-XXXX"

**Edge cases:**
- Client replies from a different email → system can't match. Email goes to a catch-all inbox. PM manually adds it to the ticket
- Client CCs someone else → CC'd email is ignored by the system, only the direct reply is captured
- Client forwards the ticket email to a colleague who replies → sender email doesn't match registered contact → rejected or flagged for manual review

---

### Flow 7.6: SE Adds an Internal Note

**Actor:** Any SE or PM

1. Opens the ticket → switches to Internal Note tab (not Reply)
2. Types a note: "I think this is a network issue. Priya should look at it."
3. Clicks Save
4. Note appears in the ticket thread, visually distinct, marked "Internal — not visible to client"
5. No email is sent to the client
6. Other SEs and PM can see it

---

### Flow 7.7: SE Logs a Call

**Actor:** Any SE

1. SE calls the client outside the system (phone/WhatsApp)
2. After the call, SE opens the ticket → clicks "Log Call"
3. Fills in: called by, called to (name), date/time, duration (approximate), summary of discussion
4. Clicks Save
5. Call log appears in the ticket thread as a distinct entry
6. No email is sent to the client — the call already happened

---

### Flow 7.8: SE1 Escalates to SE2

**Actor:** SE1

1. SE1 opens the ticket → clicks Escalate
2. Selects escalation level: SE2
3. Selects specific SE2 from dropdown (if multiple SE2s exist)
4. Adds an escalation note: "Network-level packet loss confirmed. Need hardware expertise."
5. Clicks Confirm
6. Ticket current level changes to SE2, assigned engineer changes to selected SE2
7. SE2 receives notification: "TKT-XXXX escalated to you"
8. Client gets email: "Your ticket has been escalated to our specialist team for further investigation"
9. Audit log records: escalation from SE1 to SE2, timestamp, reason

---

### Flow 7.9: SE2 Escalates to SE3

**Actor:** SE2

Identical flow to 7.8 except:
- SE3 dropdown is filtered to show only SE3s assigned to this ticket's project
- If only one SE3 is assigned → auto-selected
- Client email: "Your ticket has been escalated to our project engineering team"

---

### Flow 7.10: SE Resolves a Ticket

**Actor:** Whoever currently owns the ticket

1. SE determines the issue is fixed
2. Adds a final reply to the client explaining the resolution
3. Clicks "Mark as Resolved"
4. Fills in resolution summary (short text field — stored separately from the thread for reporting)
5. Ticket status changes to Resolved
6. Client gets email: "We believe your issue has been resolved. [Confirm Resolution] [Reopen Ticket]"
7. PM gets notification: "TKT-XXXX resolved by [SE name]"

---

### Flow 7.11: Client Confirms Resolution

**Actor:** Client

1. Client receives resolution email
2. Clicks "Confirm Resolution"
3. Ticket status moves from Resolved to Closed
4. Feedback prompt (optional): "How was your experience? Any comments?"
5. If feedback is submitted → stored in ticket_feedback table, visible to PM

---

### Flow 7.12: Client Reopens a Ticket

**Actor:** Client

1. Client receives resolution email
2. Clicks "Reopen Ticket"
3. Optionally adds a comment: "Still seeing the error after the fix"
4. Ticket status moves back to In Progress
5. Assigned SE gets notification: "TKT-XXXX reopened by client"
6. SE reviews and continues working

**Edge case:** Client reopens a ticket 30 days after closure → system creates a new ticket with a reference to the old one instead of reopening. Stale tickets shouldn't be reopened.

---

### Flow 7.13: Auto-Nudge and Auto-Close on Client Silence

**Actor:** System (automated)

1. Ticket is Pending Client
2. After 48 hours of no client response → system sends automated email nudge: "We're waiting on information from you regarding TKT-XXXX. Please reply when you can."
3. After 5 more days (7 total) of no response → system sends final nudge: "We'll close this ticket in 48 hours if we don't hear from you."
4. After 48 more hours (9 days total) → system auto-closes the ticket with status Closed (Inactive)
5. PM gets notification: "TKT-XXXX auto-closed due to client inactivity"
6. Client gets email: "TKT-XXXX has been closed. If you still need help, please open a new ticket."

---

### Flow 7.14: Ticket Merge

**Actor:** SE1 or PM

1. SE1 notices two tickets from the same client about the same issue
2. Opens the newer ticket → clicks "Merge Into"
3. Searches for the target ticket by number or keyword
4. Selects the target ticket
5. Confirms merge
6. The newer ticket's thread is appended to the target ticket as a merged section
7. The newer ticket is closed with status "Merged into TKT-XXXX"
8. Client who raised the newer ticket gets email: "Your query has been linked to an existing case TKT-XXXX. You'll receive updates there."

---

### Flow 7.15: PM Monitors Tickets

**Actor:** PM

1. PM opens Tickets dashboard
2. Sees all tickets across all projects
3. Can filter by: status, project, client, assigned SE, priority, date range
4. Can sort by: date created, last activity, priority
5. Clicks into any ticket to read the full thread
6. Can add internal notes but typically does not reply to clients directly (SEs own that)
7. Can reassign a ticket to a different SE if needed
8. Can change priority if misclassified

---

### Flow 7.16: Director Views Tickets

**Actor:** Director

1. Director opens Tickets view
2. Sees all tickets — read-only
3. Cannot reply, reassign, escalate, or modify
4. Can filter and search
5. Can open ticket detail and read full thread including internal notes

---

### Ticket Status Flow — Complete Map

```
New
 ↓
In Progress ←←←←←←←←←←←←←←←←←←←←←
 ↓                    ↑               ↑
Pending Client        ↑               ↑
 ↓ (client replies)   ↑               ↑
In Progress ──────────┘               ↑
 ↓                                    ↑
Resolved                              ↑
 ↓              ↓                     ↑
Closed     Reopened ──────────────────┘
 
Pending Client (no response 9 days) → Closed (Inactive)

Merged → Closed (Merged into TKT-XXXX)
```

---

---

## MODULE 8 — Communication & Notifications

---

### Flow 8.1: Notification Map

Every event that triggers a notification:

**Ticket Events:**

| Event | Email to Client | Notification to | 
|---|---|---|
| Ticket created | ✅ Confirmation | SE1 |
| SE replies | ✅ Reply content | — |
| Client replies | — | Assigned SE |
| Escalated to SE2 | ✅ Escalation notice | SE2 |
| Escalated to SE3 | ✅ Escalation notice | SE3 |
| Resolved | ✅ Resolution + feedback links | PM |
| Closed | ✅ Closure confirmation | — |
| Reopened | — | Assigned SE |
| Auto-nudge (48hrs) | ✅ Reminder | — |
| Auto-nudge (7 days) | ✅ Final warning | — |
| Auto-closed | ✅ Closure notice | PM |
| Merged | ✅ Merge notice to secondary contact | — |

**AMC Events:**

| Event | Notification to |
|---|---|
| 60 days to expiry | PM |
| 30 days to expiry | PM + Director |
| Expired today | PM + Director |
| Layer 3 blocked (expired AMC) | PM |

**User Events:**

| Event | Notification to |
|---|---|
| Account created | New user (email) |
| Password reset requested | User (email) |

**KB Events:**

| Event | Notification to |
|---|---|
| Draft article submitted by SE3 | PM |

---

### Flow 8.2: Email Template Management

**Actor:** PM

1. PM goes to Settings → Email Templates
2. Sees list of all system email templates: Ticket Created, Ticket Reply, Escalation Notice, Resolution, Auto-Nudge, AMC Expiry Warning, etc.
3. Each template has: subject line, body (with variables like {{ticket_number}}, {{client_name}}, {{reply_content}}), sender name
4. PM can edit the template text and preview
5. Cannot delete system templates, only modify their content

---

### Flow 8.3: Canned Responses

**Actor:** SE (any level)

1. SE is replying to a ticket
2. Clicks "Insert Canned Response" in the reply box
3. Sees a list of saved responses, searchable by title/category
4. Selects one → template text is inserted into the reply box
5. SE edits as needed → sends

**Managing canned responses:**
- PM goes to Settings → Canned Responses → Add/Edit/Delete
- Each response has: title, category, body text
- Available to all SEs across all projects

---

---

## MODULE 9 — Reporting & Analytics

---

### Flow 9.1: PM Views Ticket Summary Report

**Actor:** PM

1. PM goes to Reports → Ticket Summary
2. Selects date range
3. Sees:
   - Total tickets created in period
   - Tickets by status (open, pending, resolved, closed)
   - Tickets by priority
   - Tickets by project
   - Tickets by client
   - Average resolution time (created → closed)
   - Tickets resolved at each level (SE1, SE2, SE3)

---

### Flow 9.2: PM Views Layer Resolution Report

**Actor:** PM

1. PM goes to Reports → Layer Resolution
2. Selects project and date range
3. Sees:
   - Total widget sessions
   - Resolved at Layer 1 (FAQ): count and percentage
   - Resolved at Layer 2 (Julia): count and percentage
   - Escalated to Layer 3 (ticket created): count and percentage
4. Trend over time — is Julia getting better or worse?

---

### Flow 9.3: PM Views Engineer Workload

**Actor:** PM

1. PM goes to Reports → Engineer Workload
2. Sees per engineer:
   - Open tickets count
   - Tickets resolved this month
   - Average resolution time
   - Current assignments list

---

### Flow 9.4: PM Views AMC Tracker

**Actor:** PM

1. PM goes to Reports → AMC Tracker
2. Sees all AMCs:
   - Active (green)
   - Expiring within 60 days (amber)
   - Expired (red)
3. Each row shows: client name, AMC number, end date, linked projects count, days remaining

---

### Flow 9.5: Director Dashboard

**Actor:** Director

1. Director logs in → lands on Dashboard
2. Sees high-level cards:
   - Total open tickets across all clients
   - Tickets opened this week vs last week
   - Clients with most open tickets (top 5)
   - AMCs expiring within 30 days
   - Engineer workload distribution (bar chart)
3. Can click into any card to see details
4. Read-only — no actions from this view

---

---

## PERMISSION MATRIX

---

| Action | SE1 | SE2 | SE3 | PM | Director |
|---|---|---|---|---|---|
| **Users** | | | | | |
| Create user | ✗ | ✗ | ✗ | ✅ | ✅ |
| Edit user | ✗ | ✗ | ✗ | ✅ | ✅ |
| Deactivate user | ✗ | ✗ | ✗ | ✅ | ✅ |
| **Clients** | | | | | |
| View clients | ✅ All | ✅ All | ✅ Assigned projects' clients | ✅ All | ✅ All |
| Add/edit client | ✗ | ✗ | ✗ | ✅ | ✗ |
| Deactivate client | ✗ | ✗ | ✗ | ✅ | ✗ |
| **Contacts & Consignees** | | | | | |
| View | ✅ | ✅ | ✅ Own projects | ✅ | ✅ |
| Add/edit | ✗ | ✗ | ✗ | ✅ | ✗ |
| **AMCs** | | | | | |
| View | ✅ | ✅ | ✅ Own projects | ✅ | ✅ |
| Create/edit | ✗ | ✗ | ✗ | ✅ | ✗ |
| **Projects** | | | | | |
| View all | ✅ | ✅ | ✗ Own only | ✅ | ✅ |
| Create/edit | ✗ | ✗ | ✗ | ✅ | ✗ |
| Assign SE3 | ✗ | ✗ | ✗ | ✅ | ✗ |
| Widget on/off | ✗ | ✗ | ✗ | ✅ | ✗ |
| **Knowledge Base** | | | | | |
| View articles | ✅ All | ✅ All | ✅ Own projects | ✅ | ✅ |
| Create article | ✗ | ✗ | ✅ Draft only | ✅ | ✗ |
| Edit/publish article | ✗ | ✗ | ✗ | ✅ | ✗ |
| Archive article | ✗ | ✗ | ✗ | ✅ | ✗ |
| **Julia Config** | | | | | |
| View settings | ✗ | ✗ | ✗ | ✅ | ✅ |
| Edit settings/rulebooks | ✗ | ✗ | ✗ | ✅ | ✗ |
| View session logs | ✗ | ✗ | ✗ | ✅ | ✅ |
| **Tickets** | | | | | |
| View all tickets | ✅ | ✅ Own level | ✅ Own projects | ✅ | ✅ |
| Create ticket manually | ✅ | ✅ | ✅ | ✅ | ✗ |
| Reply to client | ✅ | ✅ | ✅ | ✅ | ✗ |
| Add internal note | ✅ | ✅ | ✅ | ✅ | ✗ |
| Log call | ✅ | ✅ | ✅ | ✅ | ✗ |
| Escalate SE1→SE2 | ✅ | ✗ | ✗ | ✅ | ✗ |
| Escalate SE2→SE3 | ✗ | ✅ | ✗ | ✅ | ✗ |
| Resolve ticket | ✅ | ✅ | ✅ | ✅ | ✗ |
| Reopen ticket | ✗ | ✗ | ✗ | ✅ | ✗ |
| Merge tickets | ✅ | ✗ | ✗ | ✅ | ✗ |
| Reassign ticket | ✗ | ✗ | ✗ | ✅ | ✗ |
| Change priority | ✅ | ✅ | ✗ | ✅ | ✗ |
| **Canned Responses** | | | | | |
| Use | ✅ | ✅ | ✅ | ✅ | ✗ |
| Create/edit/delete | ✗ | ✗ | ✗ | ✅ | ✗ |
| **Email Templates** | | | | | |
| Edit | ✗ | ✗ | ✗ | ✅ | ✗ |
| **Reports** | | | | | |
| View all reports | ✗ | ✗ | ✗ | ✅ | ✅ |
| View own workload | ✅ | ✅ | ✅ | — | — |

---

That completes the **Module Map**, **Detailed User Flows**, **Notification Map**, and **Permission Matrix** for Phase 1.

Remaining in Phase 1 is **Julia's architecture design** — her internal processing pipeline deserves its own dedicated section. Want to go into that next, or move to Phase 2 (System Architecture)?
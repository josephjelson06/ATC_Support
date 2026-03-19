<think>
The user wants to take a step back and define the problem statement clearly before diving into technical decisions. They want me to improve/refine the prompt and then answer it comprehensively.

Let me craft a well-structured problem statement that covers:
1. What we're building
2. Why it's needed
3. Who it's for
4. What success looks like
5. The constraints and context

This should be a foundational document that everything else builds from.
</think>## Refined Prompt

> Define the product we are building. What problem does it solve, for whom, and why does it need to exist? Describe the current state of the world, the desired future state, the core value proposition, and the boundaries of what this system is and is not. Frame it in a way that anyone reading it — developer, stakeholder, or future team member — understands exactly what we are building and why.

---

## Problem Statement

---

### The Current State

Industrial automation companies that deploy SCADA, PLC, and HMI systems for clients face a recurring problem: support is unstructured, reactive, and invisible.

A client's machine throws an error. They email their contact — an engineer who worked on the project six months ago. That engineer may have left. May be on another site. May not remember the context. The email sits in a personal inbox. Days pass. Someone else gets cc'd. A call happens. Notes are lost. Resolution is eventually achieved, but nobody remembers how.

The next time the same error occurs — on the same project or a different one — the cycle repeats from zero. No knowledge is retained. No pattern is learned. The same people answer the same questions. Time bleeds. Engineers burn out on repetitive queries. Clients lose patience.

Account management is equally fragile. AMCs exist as signed PDFs in folders. Their expiry dates are remembered only when a client calls asking why nobody is helping them. New employees spend months asking "has anyone seen this before?" because nothing is written down.

There is no single source of truth. No memory. No leverage.

---

### The Desired Future State

A client opens a support widget on their dashboard. An AI assistant — Julia — answers their question immediately if the answer exists in the project's knowledge base. If the issue is new or complex, Julia creates a ticket and the right person is notified within minutes.

The ticket thread lives in one place. Every email, every internal note, every logged call, every attachment — organized and searchable. Resolution is recorded. The knowledge base grows. Julia gets smarter. Next time, the client might not need a human at all.

Support engineers see their queue clearly. They triage, escalate, resolve. They don't answer the same question twice. They don't dig through email threads to find context. They don't wonder what the AMC status is.

Project leads manage clients, projects, and AMCs in one view. They see what's expiring, what's active, what's breaking often. They build knowledge bases deliberately. They train Julia's behavior over time.

Directors see the big picture — which clients need attention, where the bottlenecks are, how the team is performing. They don't manage tickets. They manage patterns.

New employees read the internal KB and closed tickets. They're productive in weeks, not months. Institutional knowledge is no longer locked in heads. It lives in the system.

---

### Who This Is For

**Primary Users — Internal Team:**

| Role | What They Need |
|---|---|
| SE1 | Clear ticket queue, triage tools, client context, escalation path |
| SE2 | Hardware/network tickets, relevant project history, call logging |
| SE3 | Code-level issues, project ownership, KB contribution |
| PM | Client/account oversight, AMC tracking, KB management, Julia training, reporting |
| Director | High-level patterns, client health, team workload, escalations |

**Secondary Users — External:**

| Role | What They Need |
|---|---|
| Client Contact | Fast answers, clear communication, no system to learn, email-based interaction |

**Tertiary Users — Future Team Members:**

| Role | What They Need |
|---|---|
| New Employee | Onboarding material, historical context, project documentation |

---

### What We Are Building

A support operations platform for industrial automation service providers. Specifically:

**A client-facing AI assistant (Julia)** — embedded as a widget on client dashboards, trained on project-specific knowledge, capable of resolving queries at FAQ level and conversational level, escalating to humans when needed.

**A ticket management system** — capturing issues that need human intervention, routing them through a defined escalation chain, tracking communication across email and phone, and recording resolution.

**A knowledge base** — storing project-specific articles and documents, tagged by audience (Julia-facing, internal, or both), growing over time as tickets are resolved and insights are captured.

**A client and project management layer** — organizing clients, their contacts, their sites (consignees), their projects, and their AMCs in one place.

**A reporting and oversight layer** — giving PMs and directors visibility into ticket volume, resolution speed, engineer workload, AMC health, and Julia's effectiveness.

**A rule engine for Julia's behavior** — allowing PMs to define how Julia should respond to certain patterns, when to escalate, and what topics to avoid.

---

### The Core Value Proposition

**For the company:**
- Engineers stop answering the same questions repeatedly
- Knowledge is retained even when people leave
- Support becomes measurable, visible, and improvable
- Account management is proactive, not reactive
- New employees onboard faster

**For clients:**
- Immediate answers for known issues
- Clear, organized communication for complex issues
- No new system to learn — email-based interaction
- Faster resolution times

**For leadership:**
- Visibility into what's actually happening
- Data to make staffing and process decisions
- AMC revenue protected through proactive tracking

---

### What This System Is Not

**Not a CRM.** It doesn't manage sales pipelines, marketing campaigns, or deal stages. It knows clients exist, but only in the context of support and accounts.

**Not a project management tool.** It doesn't track tasks, milestones, or Gantt charts. Projects exist as containers for support context, not execution management.

**Not a general-purpose chatbot platform.** Julia is trained on specific project knowledge for specific clients. She doesn't answer generic questions or operate outside her scope.

**Not a call center system.** No built-in voice, no call routing, no IVR. Calls happen outside. The system only records what happened.

**Not an enterprise service desk.** No SLA engines, no asset management, no change management workflows. This is support operations for a small-to-mid industrial services team — not ITIL compliance.

**Not a replacement for human expertise.** Julia handles known issues. Complex problems still need engineers. The system routes and tracks — it doesn't solve.

---

### Success Criteria

How we know this is working:

| Metric | Target (After 6 Months) |
|---|---|
| Layer 1 + Layer 2 resolution rate | 40%+ of widget sessions resolved without human |
| Average ticket resolution time | 30% reduction from baseline |
| KB article coverage | 10+ articles per active project |
| Engineer time on repetitive queries | Qualitative reduction, measured via feedback |
| New employee onboarding time | 50% reduction (measured by time to first solo ticket) |
| AMC renewal follow-ups | 100% of expiring AMCs flagged and acted on 30+ days before expiry |

---

### The Boundaries

**In Scope:**
- Widget for client-side support queries
- Julia AI assistant with project-specific RAG
- Ticket lifecycle from creation to closure
- Email-based communication threading
- Call logging (manual)
- Knowledge base management
- Client, project, AMC management
- Internal user management and roles
- Reporting for PMs and directors
- Julia behavior rulebooks

**Out of Scope (For Now):**
- Voice/call integration
- Automated SLA enforcement
- Asset or configuration management
- Sales/CRM features
- Mobile app (web-only)
- Multi-tenant/SaaS architecture (single company deployment initially)
- Client portal (clients don't log in; they use email)

**Future Considerations:**
- Widget session analytics dashboard
- Client satisfaction scoring
- Proactive alerting based on system logs
- Integration with project management tools
- Multi-company deployment

---

### Why This Needs To Exist

Because industrial automation support is currently held together by spreadsheets, personal inboxes, and memory. Because every resolved ticket is a lesson that disappears. Because clients deserve faster answers and engineers deserve less repetition. Because a company's knowledge shouldn't walk out the door when an employee does.

This system is the memory, the structure, and the leverage that a small support team needs to operate like a larger one.

---

Does this capture it correctly? Anything to adjust?
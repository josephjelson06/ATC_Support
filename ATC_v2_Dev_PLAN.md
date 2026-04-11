# ATC Support V2 Development Plan

## Summary
- V2 should move the product from a project-only widget into a general support system for ATC: software support, hardware support, project-based support, and hardware-only client support.
- Keep the existing Node/Express/Prisma backend and React/Vite frontend. Do not rewrite architecture.
- Introduce `SupportSession` as a first-class concept separate from `Ticket`. Every chatbot/support interaction is logged as a session; only escalated or human-needed cases become tickets.
- Introduce client-owned hardware assets with optional project and AMC links. This supports project hardware, client-only hardware, and AMC-covered hardware without forcing everything under projects.
- Simplify V2 operations around one global PM/operator user for now. Keep the existing user/role code for compatibility, but do not expand user-management complexity in this phase.
- Keep AI lightweight: structured workflows, support topics, SOPs, hardware playbooks, and Groq fallback. No embeddings, pgvector, natural-language SQL, or heavy RAG in V2.

## Key Changes
- Add a new `SupportSession` model with session status, source, selected client, optional project, optional hardware asset, support type, issue summary, confidence score, escalation state, and linked ticket when escalated.
- Add `SupportSessionMessage` so Julia/user/system messages are stored independently from ticket messages.
- Add `HardwareAsset` under `Client`, with optional links to `Project` and `AMC`; fields should cover category, brand, model, serial number, location, status, notes, and vendor support URL.
- Add `SupportTopic` as the user-facing support knowledge unit. FAQs, SOPs, and troubleshooting playbooks should appear as “topics” in the widget, while existing FAQs/docs/runbooks can remain as backend knowledge sources during migration.
- Extend tickets so V2 tickets can come from a support session and do not require a project. Existing project-widget tickets must continue working.
- Keep current ticket status enum for compatibility, but V2 UI should treat `NEW` as “Open / Unassigned”, hide reopen actions, and make `RESOLVED` terminal.
- Keep Groq Julia, but use it only after structured topics/playbooks are insufficient or the user asks a free-form question.

## Product Flow
- General ATC support widget flow: identify client by UID/email/phone, choose support type, choose project or hardware asset when applicable, show relevant support topics, guide the user through steps, then either end session or escalate to a human.
- Project widget flow: keep current widget-key embedding, but internally create a `SupportSession`; project context is preselected, and the user sees project-specific topics/docs first.
- Hardware support flow: start with universal hardware categories such as printers, scanners, and network devices; use generalized troubleshooting playbooks first; hand off to vendor/model links or human escalation when the issue becomes brand-specific or risky.
- Software support flow: use project SOPs and how-to topics first; escalate to human support for bugs, data fixes, permission issues that cannot be solved from docs, or development-level problems.
- Escalation flow: collect final issue summary, attempted steps, selected client/project/hardware, Julia confidence score, and create a linked ticket for the operator.
- End-session flow: mark the session ended without creating a ticket, but keep the full log for traceability.

## Console Changes
- Add “Support Sessions” under the Tickets area so non-escalated and escalated chatbot sessions can be reviewed without treating every chat as a ticket.
- Keep Tickets as the human-action queue. Tickets should show escalated sessions, manually created tickets, assignments, status, priority, client, project, and hardware context when present.
- Add a Hardware tab or section inside Client Detail. PM/operator can add, edit, delete, and link hardware to a project or AMC.
- Project Detail should continue managing project docs/topics and widget delivery. Julia greeting/fallback/escalation copy can stay hidden or minimized until AI configuration becomes a focus again.
- Dashboard should become one global operator dashboard: active support sessions, open/unassigned tickets, escalated tickets, resolved tickets, hardware/software split, and weekly trends.
- Users & Access should remain available for future work, but V2 should not depend on multi-user assignment logic. The default implementation assumes one global operator sees and manages everything.

## API And Type Changes
- Add public support APIs for starting a support session, posting session messages, ending a session, escalating a session, and fetching safe widget context.
- Add authenticated support-session APIs for listing sessions, viewing a session detail, filtering by status/source/client/project/hardware/support type, and linking to tickets.
- Add hardware asset CRUD APIs, preferably nested under clients while still supporting project and AMC filters.
- Add support-topic CRUD APIs for global topics, project topics, and hardware category topics.
- Extend ticket creation APIs to accept `supportSessionId`, `clientId`, optional `projectId`, optional `hardwareAssetId`, and `supportType`.
- Preserve existing `/api/widget/:widgetKey/*` endpoints for backward compatibility, but route new widget behavior through the support-session model internally.
- Update frontend types for `SupportSession`, `SupportSessionMessage`, `HardwareAsset`, `SupportTopic`, `SupportType`, and expanded ticket source/context fields.

## Delivery Sequence
- Phase 1: Add database models and serializers for support sessions, support messages, hardware assets, and support topics; migrate existing project chat behavior safely without breaking old widget routes.
- Phase 2: Build backend APIs for support sessions, hardware assets, and support topics; extend ticket creation/escalation to support client-only and hardware-linked tickets.
- Phase 3: Refactor the widget into a workflow-first support flow with client identification, support-type selection, topic selection, Julia fallback, end session, and escalate.
- Phase 4: Add console views for Support Sessions and client hardware management; update dashboard and ticket detail pages to show support-session and hardware context.
- Phase 5: Seed realistic V2 data with clients, hardware assets, project software topics, hardware playbooks, ended sessions, escalated sessions, and linked tickets.
- Phase 6: Polish reports and operator workflows: session logs, escalation summaries, weekly support trends, hardware/software mix, and support topic usage.

## Test Plan
- Verify project widget compatibility: existing widget key, FAQ load, chat, escalation, and ticket creation still work.
- Verify general widget flow: client lookup, support type selection, hardware/project selection, topic display, Julia fallback, end session, and escalation.
- Verify hardware-only client flow: client has no project, hardware asset is selectable, session logs correctly, and escalation creates a ticket without project.
- Verify software project flow: client selects project, sees SOP/topics, ends or escalates, and session context is preserved.
- Verify every support session is logged even when no ticket is created.
- Verify escalated sessions create exactly one linked ticket and include attempted steps, confidence score, and selected context.
- Verify resolved tickets remain closed and cannot be reopened through UI actions.
- Verify PM/operator can create/edit/delete hardware assets and link them to project/AMC.
- Verify Support Sessions list filters by status, source, client, project, hardware asset, and support type.
- Verify dashboard counts match sessions and tickets across active, ended, escalated, open, and resolved states.
- Verify no client lookup leaks unrelated client/project/hardware data.

## Assumptions
- V2 keeps the current backend and frontend architecture.
- V2 uses one global PM/operator workflow first; deeper user-management and assignment rules are deferred.
- Chat/support sessions are separate from tickets; tickets exist only for human work.
- Hardware belongs to a client, with optional project and AMC links.
- “Topics” become the main user-facing support knowledge structure; FAQs remain a type/source of topic.
- AI remains Groq-based and lightweight for now; no vector DB, embeddings, NL-to-SQL, or autonomous database querying in V2.
- Feedback/rating is out of scope for V2 unless explicitly reintroduced later.

# Julia Phase A - Product and Dashboard Plan

## Purpose
Define exactly what Julia must be in Phase A as a packaged product, and define what dashboard management/config surfaces are required to operate it.

## Current Understanding
Julia should not yet be treated as:
- a database query assistant
- a full ticketing agent
- an autonomous support operator

For Phase A, Julia is:
- a project-specific support chatbot
- grounded in approved FAQ and docs
- embeddable into a PL's project
- safe enough to answer common support questions
- honest enough to fall back when it does not know

## Where We Are Currently
The system already has:
- project and FAQ concepts
- project docs concepts
- widget concepts
- chat widget/testing surface
- dashboard foundation

The system still needs work before Julia is a packaged product:
- clear Julia product boundary
- formal knowledge intake process
- session model that stands on its own even without ticket escalation
- project-specific Julia config workflow
- clear PL responsibilities
- repeatable widget delivery flow

## Current Implementation Progress
Implemented now:
- backend Julia readiness evaluation for project and widget responses
- PL-facing `Julia Readiness Summary` on the project detail page
- dedicated Julia config editing for project greeting, fallback message, escalation hint, and allowed widget origins
- public `widget.js` launcher script for packaged delivery
- widget host route for direct packaged preview/testing
- project-scoped public support/testing URLs driven by runtime widget key
- runtime allowed-origin enforcement across widget FAQ/chat/escalation and direct public ticket creation

Still pending:
- formal project knowledge intake workflow in product use
- internal sample-project validation and real PL handoff

## Phase A Product Shape
Julia should be deliverable as a packaged support widget for each project.

That package must include:
- embeddable script tag
- widget key
- project-specific chatbot behavior
- project-specific knowledge source scope
- fallback behavior
- internal testing path before external handoff

## What Julia Must Do In Phase A

### Must Have
- answer project-specific FAQ
- answer from approved project docs
- stay scoped to one project at a time
- ask basic clarifying questions when needed
- say when it is unsure
- suggest escalation when it cannot solve the issue
- save the conversation transcript
- remain fast and low-cost on Groq

### Should Have
- project-specific greeting
- project-specific fallback message
- project-specific escalation hint
- simple troubleshooting steps if found in docs
- internal source logging for debugging and trust

### Must Not Do Yet
- query live project databases
- make business-number claims without a source
- answer outside the current project's approved content
- create hidden tickets automatically without explicit fallback/escalation logic
- behave like it has human-level operational authority

## Packaged Product Requirements
To hand Julia to a PL for embedding, ATC must be able to produce:

### Delivery Artifacts
- widget script snippet
- widget key
- install note
- allowed domain/environment list
- support contact fallback path
- project knowledge pack version reference

### Runtime Behavior
- floating launcher icon
- expandable chat window
- FAQ-first support flow
- doc-grounded answers
- fallback when blocked
- chat session persistence

### Internal Operational Controls
- enable or disable widget
- regenerate or inspect widget key
- publish or unpublish project knowledge
- view whether Julia is deployable for that project

## Dashboard Management Requirements
For this phase, keep the dashboard role focus on `PL`.

### PL Should Be Able To Do
- review and update project FAQ
- review and update project docs used by Julia
- see widget status
- copy widget embed snippet
- know whether Julia is ready for deployment
- know whether project knowledge is draft or usable

### PM Should Still Control
- project creation
- project ownership/admin controls
- user creation/admin controls
- global system policies if needed later

### Dashboard Surfaces Needed For Julia
- `Project Docs`
- `FAQs`
- `Widget Status`
- `Embed Snippet / Widget Key`
- `Julia Readiness Summary`

## Recommended PL Dashboard View For Phase A
For a single project, the PL should be able to see:
- how many FAQ entries are ready
- how many docs are available
- whether widget is enabled
- whether Julia has enough approved content to be considered ready
- embed snippet copy area

## Readiness Rules
A project should be considered `Julia Ready` only when:
- widget is enabled
- at least one allowed widget origin is registered
- minimum FAQ exists
- minimum project docs exist
- escalation/fallback wording is defined
- content has been reviewed for chatbot use

## Model Strategy For Phase A
Use:
- `llama-3.1-8b-instant` as default model

Reason:
- cheapest and fastest workable Groq option
- sufficient for FAQ and doc-grounded support
- better fit for free-tier limits than a heavy 70B default

## Technical Product Constraints
- top-N retrieval only, not full-doc prompt stuffing
- prompt must remain compact
- each project must stay isolated
- widget delivery must not depend on the internal sample page

## Implementation Sequence
1. Treat Julia as a packaged support widget, not a sample page feature.
2. Finalize knowledge intake structure.
3. Finalize project-specific config surface for PL.
4. Finalize chat session persistence independent of ticket creation.
5. Finalize widget delivery and installation path.
6. Test internally on sample project.
7. Hand off to real PL embedding use.

## Biggest Gaps Right Now
- no formal project knowledge intake standard
- chatbot packaging is not yet the main productized output
- dashboard still needs a clearly defined Julia-management workflow
- chat session lifecycle needs to stand independently from ticket escalation

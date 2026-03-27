# Julia Phase A - Ground Zero

## Purpose
This is the living control document for `Julia Phase A`.

Phase A means:
- Julia is a packaged, embeddable, project-specific support chatbot.
- Julia answers from approved project knowledge only.
- Julia can fall back and prompt escalation to support when unsure.
- Julia stores chat sessions even when no ticket is created.
- Julia is managed through the ATC Support dashboard with `PL` as the main operating role for this phase.

This file should be updated as later Julia phases are implemented.

## Phase A Goal
Ship Julia as a usable support widget that can be handed to a `Project Lead` for embedding into their project with minimal integration effort.

## Core Outcome
By the end of Phase A, ATC should be able to:
- prepare a project knowledge pack
- configure Julia for that project
- generate an embeddable widget snippet
- deploy Julia into that project's UI
- answer FAQ and doc-grounded support questions
- save chat sessions
- fall back cleanly when Julia is unsure

## Scope In
- packaged support chatbot widget
- project-specific FAQ and docs grounding
- safe fallback behavior
- session transcript storage
- basic project-aware chatbot configuration
- dashboard management for project knowledge and widget delivery

## Scope Out
- database query capability
- deep ticket workflow automation from chat
- advanced long-term memory
- quality scoring and feedback loops beyond basic future hooks
- multi-model routing
- analytics-heavy chatbot reporting

## Working Docs In This Pack
1. [Julia Phase A - Product and Dashboard Plan](C:/Users/josep/Desktop/ATC_Support/Docs/Julia%20Phase%20A%20-%20Product%20and%20Dashboard%20Plan.md)
2. [Julia Phase A - Project Knowledge Intake Checklist for PLs](C:/Users/josep/Desktop/ATC_Support/Docs/Julia%20Phase%20A%20-%20Project%20Knowledge%20Intake%20Checklist%20for%20PLs.md)
3. [Julia Phase A - AI Editor Prompt for Project Knowledge Pack Generation](C:/Users/josep/Desktop/ATC_Support/Docs/Julia%20Phase%20A%20-%20AI%20Editor%20Prompt%20for%20Project%20Knowledge%20Pack%20Generation.md)

## Current Status
- product direction is clear
- Phase A scope is narrowed to doc-grounded support chatbot only
- Groq is the planned LLM provider
- `llama-3.1-8b-instant` is the default recommended first model
- project knowledge intake still needs formalization
- Julia readiness rules are now implemented in backend project/widget responses
- project detail now includes `Julia Readiness Summary`
- project detail now includes a dedicated Julia config surface for greeting, fallback, escalation hint, and allowed widget origins
- packaged launcher script now exists at `widget.js`
- project detail now exposes project-scoped handoff artifacts and preview/test URLs
- public support/testing pages now resolve project scope from runtime widget key instead of one hardcoded sample key
- allowed-domain enforcement is now active across widget FAQ/chat/escalation and the direct public ticket form
- localhost origins are now seeded by default for internal packaged-widget validation
- sample-project validation and first real PL handoff are the next execution step

## Exit Criteria For Phase A
- a PL can hand over a complete project knowledge pack
- Julia can be configured per project in a repeatable way
- Julia can be embedded with a script tag and widget key
- Julia can be restricted to explicitly approved widget origins
- Julia answers from approved project knowledge only
- Julia gives a clear fallback when uncertain
- Julia stores the full chat session
- Julia is testable on an internal sample project and deployable to real PL projects

## Phase A Build Order
1. Finalize Julia packaged product requirements.
2. Finalize dashboard management/config responsibilities for `PL`.
3. Finalize project knowledge intake checklist.
4. Finalize AI-editor prompt for reverse-engineering project documentation.
5. Build dashboard readiness/config workflow.
6. Build and test on sample project.
7. Hand off embed package to first PL project.

## Risks To Watch
- knowledge packs arrive incomplete or inconsistent
- Julia answers beyond available source material
- project docs are too raw for direct chatbot use
- widget integration varies across client projects
- chat sessions are still too tightly coupled to ticket creation

## Update Rules
Whenever a new Julia phase starts or lands:
- update this file first
- mark what moved from planned to implemented
- move items from `Scope Out` if they enter the next phase
- link new supporting docs here

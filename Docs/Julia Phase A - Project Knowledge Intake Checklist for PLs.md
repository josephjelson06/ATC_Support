# Julia Phase A - Project Knowledge Intake Checklist for PLs

## Purpose
This checklist defines exactly what a `Project Lead` should gather and hand over so Julia can support that project in Phase A.

## Output Goal
The PL should submit a project knowledge pack that is:
- project-specific
- support-focused
- usable by a chatbot
- safe for publication to Julia

## Mandatory Inputs

### 1. Project Context Summary
Provide:
- project name
- short purpose of the project
- who uses it
- major modules or screens
- business domain terminology

### 2. FAQ List
Provide:
- the most common user questions
- short and correct answers
- repeated support-call topics
- user confusion points

### 3. Troubleshooting Notes
Provide:
- common issues
- likely causes
- first checks to perform
- safe step-by-step resolution paths
- when the issue must be escalated

### 4. Error Message Catalog
Provide:
- exact error messages
- known meanings
- probable causes
- approved resolution steps

### 5. Module / Screen Guide
Provide:
- names of modules
- where users click
- menu paths
- common navigation flows

### 6. Escalation Rules
Provide:
- what Julia must never try to solve on its own
- what should immediately go to support
- what counts as urgent or production-blocking

## Strongly Recommended Inputs

### 7. SOP / Runbook Notes
Provide:
- repeatable support procedures
- operational checklists
- known recovery flows

### 8. Terminology Glossary
Provide:
- project-specific words
- abbreviations
- internal business terms
- alternate names used by users

### 9. Change / Release Notes
Provide:
- recent changes that affect user behavior
- features recently added or changed
- known temporary limitations

### 10. Support Boundaries
Provide:
- what Julia may answer
- what Julia must not answer
- sensitive topics to avoid

## Preferred File Formats
- Markdown
- PDF
- DOCX
- exported wiki pages
- structured notes in text form

## What To Avoid Sending As-Is
- raw database dumps
- passwords
- secrets or tokens
- highly sensitive business records
- unreviewed internal notes that should never surface in support answers

## Minimum Viable Knowledge Pack
For a project to enter Julia Phase A, the PL should provide at least:
- 1 project context summary
- 10 to 20 FAQ entries
- 5 to 10 troubleshooting notes
- 1 escalation rules note
- 1 module/screen map

## Quality Checklist Before Submission
Before handing over the pack, the PL should verify:
- answers are correct
- steps are still current
- unsupported topics are clearly marked
- escalation conditions are explicit
- internal-only sensitive details are removed
- docs are readable by someone outside the project team

## Packaging Recommendation
Ask the PL to submit the project knowledge in a folder like:

```text
Project-Knowledge-Pack/
  01-project-context.md
  02-faq.md
  03-troubleshooting.md
  04-escalation-rules.md
  05-module-map.md
  06-error-catalog.md
  07-glossary.md
  08-release-notes.md
```

## Review Note
This pack should be reviewed before Julia uses it live.

Even if the PL submits the content, ATC should still verify:
- clarity
- accuracy
- support suitability
- publish safety

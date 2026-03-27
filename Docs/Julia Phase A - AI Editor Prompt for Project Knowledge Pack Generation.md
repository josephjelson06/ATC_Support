# Julia Phase A - AI Editor Prompt for Project Knowledge Pack Generation

Use the prompt below in the PL's AI editor or internal AI workspace to help reverse engineer a project and produce the Phase A documentation pack for Julia.

---

## Prompt

You are helping prepare a project knowledge pack for an embedded support chatbot named `Julia`.

Your task is to reverse engineer the current project and produce a support-focused documentation pack for Phase A of Julia.

Important constraints:
- Do not invent facts.
- If information is missing, say it is missing.
- Prefer concise, support-usable documentation over long narrative descriptions.
- Write for a support chatbot and support team, not for marketing.
- Focus on user questions, operational issues, screens, modules, troubleshooting, and escalation boundaries.
- Exclude passwords, secrets, tokens, or highly sensitive internal data.
- Do not include database-query logic.
- Do not assume Julia has live database access.

The output must be project-specific and should help Julia do the following:
- answer FAQ
- answer from approved project docs
- guide basic troubleshooting
- know when to fall back or escalate

Create the following markdown files.

### File 1: `01-project-context.md`
Include:
- project name
- what the project does
- who uses it
- main modules or screens
- business domain summary
- important user terminology

### File 2: `02-faq.md`
Include:
- repeated user questions
- concise answers
- common misunderstandings
- operational how-to questions

Format each FAQ as:
- Question
- Answer
- Optional Notes

### File 3: `03-troubleshooting.md`
Include:
- common issues
- symptoms
- probable causes
- safe first checks
- step-by-step resolution path
- clear escalation trigger if unresolved

Format each issue as:
- Issue Name
- Symptoms
- Likely Causes
- Safe Checks
- Resolution Steps
- Escalate When

### File 4: `04-escalation-rules.md`
Include:
- what Julia must not try to solve
- when support engineer involvement is required
- what is urgent
- what is production-blocking
- what requires manual verification

### File 5: `05-module-map.md`
Include:
- major screens
- menu paths
- user navigation flow
- where key operations are performed

### File 6: `06-error-catalog.md`
Include:
- exact error messages when possible
- what they mean
- common causes
- known support guidance

### File 7: `07-glossary.md`
Include:
- abbreviations
- business terms
- alternate names used by users
- domain-specific keywords

### File 8: `08-release-notes.md`
Include:
- recent changes relevant to users or support
- features that recently changed behavior
- known temporary limitations

## Output Rules
- Use markdown only.
- Keep each file clean and structured.
- Use short sections and flat bullet lists.
- Mark unknown information as `Missing Information`.
- Mark unverified assumptions as `Assumption`.
- Mark support-dangerous areas as `Needs Human Review`.

## Final Goal
The final documentation pack should be usable by ATC to configure Julia Phase A for this project without needing live database access.

---

## Recommended Handoff Instruction
After generating the files, the PL or reviewer should:
- verify factual correctness
- remove sensitive/internal-only content
- confirm troubleshooting steps are safe
- confirm escalation boundaries are correct
- mark which files are approved for Julia

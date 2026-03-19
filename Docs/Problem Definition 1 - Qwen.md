<think>
Okay, let me think about this carefully. The user wants me to step back and define the problem statement correctly before discussing tech stacks or implementation details. They're saying "No tech stack nothing. What are we creating and what problem are we solving etc."

This is actually a very important step that many teams skip. The user is wise to want to clarify the fundamental problem before jumping into solutions. I should craft a clear, comprehensive problem statement that explains:

1. Who the target users are
2. What specific pain points they're experiencing
3. What outcomes would constitute success
4. What constraints exist
5. What the scope of the solution should be

Let me think about the context from our previous conversation. We've been discussing a support system for an industrial software company that serves clients in manufacturing, oil & gas, etc. The system has multiple layers of support (SE1, SE2, SE3), a chatbot named Julia that handles initial queries, and various management components.

The problem statement should capture the essence of what's broken in the current process that this system aims to fix. Based on our conversations, I believe the core issues are:

1. Support requests are disorganized (emails, direct calls, etc.) leading to lost tickets
2. No clear escalation path for complex issues
3. Knowledge isn't captured systematically so the same issues keep getting solved repeatedly
4. Clients don't know where their request stands
5. There's no way to measure support effectiveness
6. AMCs (Annual Maintenance Contracts) aren't properly tracked against support access

The problem statement should be written from the perspective of the business owner who's experiencing these pain points. It should be specific enough to guide solution design but not prescribe technical solutions.

I'll craft a problem statement that includes:
- Background context of the business
- Specific pain points with concrete examples
- Desired outcomes
- Constraints (budget, team size, etc.)
- Scope boundaries (what's in and out of scope)

This will help ensure we're solving the right problem before deciding how to solve it.</think># Industrial Software Support System — Problem Statement

---

## Who We Are

We're a small industrial software company (15-25 people) that builds and maintains mission-critical systems for manufacturing, oil & gas, and infrastructure clients. Our products include SCADA systems, PLC automation software, HMI panels, and related industrial control solutions.

We have long-term clients who rely on our software to keep their production lines running. When something breaks, it's not just inconvenient—it can cost them thousands of dollars per minute in downtime.

---

## The Problem We're Solving

### Current Reality

**1. Support requests fall through the cracks**  
Clients contact us through 5+ channels: email, WhatsApp, phone calls, direct messages to developers, and occasional tickets in Jira. There's no single place to see all open issues. Vikram (our lone SE1) spends 30% of his time hunting down where requests came from.

**2. Escalation is broken**  
When Vikram can't solve something, he emails Priya (SE2). She might be busy, so it sits. When she finally sees it, she emails Arjun (SE3). Arjun is deep in code and misses the email. The client waits 3 days for what should take 3 hours. There's no clear ownership, no visibility.

**3. We solve the same problems repeatedly**  
Ramesh at Acme Corp called last month about sensor calibration. This month he called again with the exact same issue. We fixed it both times manually, but never documented how. The knowledge stays trapped in people's heads or scattered across email threads.

**4. Clients don't know where they stand**  
Deepa at Acme emails "Is this fixed yet?" every 6 hours on a ticket because she has no visibility. She doesn't know Vikram escalated it to Priya yesterday. She doesn't know the switch config is being pushed remotely right now.

**5. AMC coverage is a guessing game**  
When Ramesh asks for help, we have to manually check if Acme's AMC is active. Sometimes we help clients who shouldn't be covered. Sometimes we delay help while checking contracts. We've had billing disputes because of this.

**6. New engineers take months to become productive**  
Rohan (new SE3 hire) spent 6 weeks learning "how things actually work" by digging through old emails and asking constant questions. There's no centralized knowledge base he can trust.

**7. We can't measure what matters**  
How many tickets did we close last month? How fast? Which clients need the most help? Which issues keep recurring? We have no data to answer these questions—just gut feelings.

---

## The Business Impact

- **Lost revenue**: 12% of support requests result in billing disputes due to AMC confusion
- **Wasted time**: Engineers spend 25+ hours/week just tracking down ticket status
- **Client frustration**: 3 clients reduced their AMC renewal because of "unresponsive support"
- **Knowledge loss**: When Arjun leaves next month, we lose institutional knowledge about the SCADA codebase
- **Growth bottleneck**: We can't take on more clients because our support process doesn't scale

---

## What Success Looks Like

We need a system where:

1. **Every request starts in one place** — the client opens a widget on their dashboard, gets immediate help from Julia for common issues, and creates a ticket if needed. No more hunting through WhatsApp.

2. **Tickets move predictably** — Vikram sees new tickets in one queue. If he can't solve it, one click escalates to Priya with full context. Priya sees it immediately. No more email ping-pong.

3. **Knowledge compounds automatically** — when Vikram solves something new, one click turns it into a KB article. Next time Ramesh asks, Julia already knows the answer.

4. **Clients always know status** — Deepa gets email updates at every step. She can see "Priya is working on this" without having to ask.

5. **AMC coverage is automatic** — Julia checks AMC status silently. If it's expired, she blocks Layer 3 access and tells the client how to renew. No more manual checks.

6. **New engineers onboard fast** — Rohan reads the KB, sees past tickets, understands common issues before his first client interaction.

7. **We measure what matters** — Neha sees weekly reports: "40% of tickets resolved by Julia, 8% AMC disputes, 2.1 day average resolution time." She spots trends before they become problems.

---

## Constraints & Non-Negotiables

- **Julia must run locally** — no external API calls for client data. Industrial clients won't allow their operational data leaving their network.
- **Small team reality** — we have 1 PM, 1 Director, 1 SE1, 2 SE2s, and 3 SE3s. The system must work for them, not require new hires.
- **No process overhaul** — we can't change how clients contact us overnight. The system must absorb existing channels (email replies must map to tickets).
- **Widget must embed cleanly** — clients' dashboards are often legacy systems. The widget can't break their UI.
- **KB must feed Julia** — not just a wiki. If it's in the KB, Julia must be able to use it to answer questions.

---

## What We're NOT Solving

- We're not building a full CRM (sales pipeline, deal tracking)
- We're not replacing Jira for development work (only support tickets)
- We're not creating real-time voice/video support
- We're not building custom client portals (they use their existing dashboard)

---

## The Core Problem Restated

**We lack a unified support system that turns client requests into tracked tickets, routes them through a clear escalation path, captures knowledge automatically, enforces AMC coverage rules, and gives everyone visibility—while running entirely on our infrastructure with minimal overhead for our small team.**

This isn't about replacing humans with AI. It's about making humans more effective by eliminating process friction, capturing knowledge systematically, and giving clients the transparency they deserve.

---

## Why This Matters Now

1. **We're losing clients** — 2 clients reduced contracts last quarter citing "support chaos"
2. **We can't scale** — we've turned down 3 new clients because we couldn't support them
3. **Engineers are burning out** — constant context-switching between support and development
4. **Knowledge is walking out the door** — Arjun's departure will cost us 6+ months of ramp-up time for his replacement

This system isn't a "nice to have." It's the foundation we need to survive and grow.

---

This is the problem we're solving. Everything else — tech stack, UI design, API structure — is just how we solve it.

**Next step:** Do you want to refine this problem statement further, or move to solution requirements?
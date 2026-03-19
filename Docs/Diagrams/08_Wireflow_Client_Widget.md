# Diagram 8: Wireflow — Client Uses Widget

> **Purpose:** Shows the PM every screen the client sees and every path they can take through the widget.
>
> **PM signs off on:** "These are the widget screens. These are the user paths. Nothing is missing."

---

## How to render

Copy each mermaid code block → paste into [mermaid.live](https://mermaid.live) → export as PNG/SVG.

---

## Complete Widget Wireflow

```mermaid
graph TD
    START["Client's Application Dashboard<br/><i>Shows floating 💬 button</i>"] -->|"Clicks chat button"| INIT

    INIT["🖥️ Screen: Widget Initial State<br/>─────────────<br/>• Julia's avatar + greeting<br/>• Project-specific welcome message<br/>• 4-5 clickable FAQ buttons<br/>• Text input field<br/>• Close (✕) button"]

    INIT -->|"Clicks ✕"| CLOSE["Widget closes<br/>💬 button remains"]

    INIT -->|"Clicks an FAQ"| FAQ["🖥️ Screen: FAQ Answer<br/>─────────────<br/>• Full article content displayed<br/>• Formatted text (headers, steps, code)<br/>• [Did this help?]<br/>• [Yes ✅] [No, need more help 🔄]<br/>• Text input still available"]

    INIT -->|"Types a question"| CHAT["🖥️ Screen: Chat Conversation<br/>─────────────<br/>• Julia's greeting (top)<br/>• Client message (right-aligned)<br/>• Typing indicator... <br/>• Julia's response (left-aligned)<br/>• [Did this help?]<br/>• [Yes ✅] [Need more help 🔄]<br/>• Text input for follow-up"]

    FAQ -->|"Clicks Yes"| THANKYOU["🖥️ Screen: Thank You<br/>─────────────<br/>• 'Glad I could help!'<br/>• [Start New Chat]<br/>• [Close Widget]"]

    FAQ -->|"Clicks No / types more"| CHAT

    CHAT -->|"Clicks Yes"| THANKYOU

    CHAT -->|"Clicks Need Help /<br/>Julia confidence low"| ESCALATE_OFFER["🖥️ Screen: Escalation Offer<br/>─────────────<br/>• 'I can connect you with our<br/>  support team.'<br/>• [Yes, connect me]<br/>• [No, let me try again]"]

    ESCALATE_OFFER -->|"No, try again"| CHAT
    ESCALATE_OFFER -->|"Yes, connect me"| AMC_CHECK{"System checks<br/>AMC status"}

    AMC_CHECK -->|"AMC Active ✅"| ESC_FORM["🖥️ Screen: Escalation Form<br/>─────────────<br/>• Name (pre-filled if known)<br/>• Email (pre-filled if known)<br/>• Brief description<br/>• [Submit Ticket]"]

    AMC_CHECK -->|"AMC Expired ❌"| AMC_EXPIRED["🖥️ Screen: AMC Expired<br/>─────────────<br/>• ⚠️ 'Your maintenance<br/>  contract has expired'<br/>• PM contact info shown<br/>• 'Julia can still answer<br/>  FAQs and questions'<br/>• [Back to Chat]"]

    AMC_EXPIRED -->|"Back to Chat"| CHAT

    ESC_FORM -->|"Submits form"| CONFIRM["🖥️ Screen: Confirmation<br/>─────────────<br/>• ✅ 'Ticket TKT-XXXX created!'<br/>• 'Our team will reach out<br/>  at your-email@client.com'<br/>• [Start New Chat]<br/>• [Close Widget]"]

    CONFIRM -->|"Start New Chat"| INIT
    CONFIRM -->|"Close Widget"| CLOSE

    THANKYOU -->|"Start New Chat"| INIT
    THANKYOU -->|"Close Widget"| CLOSE

    style START fill:#e3f2fd,stroke:#1565C0
    style INIT fill:#e8f5e9,stroke:#2E7D32
    style FAQ fill:#fff3e0,stroke:#E65100
    style CHAT fill:#fff3e0,stroke:#E65100
    style ESCALATE_OFFER fill:#fff9c4,stroke:#F9A825
    style AMC_CHECK fill:#fff9c4,stroke:#F9A825
    style ESC_FORM fill:#fce4ec,stroke:#C62828
    style AMC_EXPIRED fill:#ffcdd2,stroke:#C62828
    style CONFIRM fill:#c8e6c9,stroke:#2E7D32
    style THANKYOU fill:#c8e6c9,stroke:#2E7D32
    style CLOSE fill:#e0e0e0,stroke:#616161
```

---

## Widget States Summary

| # | Screen | When Shown | User Can |
|---|---|---|---|
| 1 | Initial State | Widget opens | Click FAQ, type question, close |
| 2 | FAQ Answer | Clicked a FAQ button | Say "helped" or "need more" |
| 3 | Chat Conversation | Typed a question | Continue chatting, escalate, close |
| 4 | Escalation Offer | Julia can't help or client clicks "Need help" | Accept escalation or go back |
| 5 | Escalation Form | Client accepts, AMC is active | Fill details, submit |
| 6 | AMC Expired | Client accepts, AMC is expired | See PM contact, go back to chat |
| 7 | Confirmation | Ticket created successfully | Start new chat or close |
| 8 | Thank You | Client says FAQ/answer helped | Start new chat or close |

---

## What This Diagram Tells the PM

1. **8 widget states** — every screen the client sees is accounted for
2. **AMC gate is clear** — expired AMC blocks ticket creation but not Julia's answers
3. **No dead ends** — every screen has a path forward or back
4. **Client never gets stuck** — even if Julia fails, escalation is always offered
5. **Pre-filled fields reduce friction** — if contact is known, name and email auto-fill

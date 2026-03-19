# Diagram 5: Data Flow — Widget → Julia → Answer

> **Purpose:** Shows the PM the exact step-by-step flow when a client asks Julia a question. Every API call, every internal process, every decision point.
>
> **PM signs off on:** "This is how Julia works. These are the steps. The API calls are correct."

---

## How to render

Copy each mermaid code block → paste into [mermaid.live](https://mermaid.live) → export as PNG/SVG.

---

##  

```mermaid
sequenceDiagram
    autonumber
    participant C as 👤 Client Browser
    participant W as 📱 Widget (iframe)
    participant N as 🔒 Nginx
    participant B as ⚙️ FastAPI Backend
    participant RD as ⚡ Redis
    participant PG as 🐘 PostgreSQL
    participant EMB as 📐 Embedding Model
    participant PGV as 🔍 pgvector
    participant OL as 🧠 Ollama (LLM)

    Note over C,OL: PHASE 1 — Widget Session Init

    C->>W: Opens widget (clicks chat button)
    W->>N: POST /api/widget/session<br/>Header: X-Widget-Token
    N->>B: Forward request
    
    B->>PG: Validate widget token<br/>→ Find project
    PG-->>B: Project found ✅
    
    B->>PG: Check project active?<br/>Client active? Widget enabled?
    PG-->>B: All checks pass ✅
    
    B->>PG: Load Julia config<br/>(persona, tone, greeting, threshold)
    PG-->>B: Config loaded
    
    B->>PG: Load FAQ articles<br/>(top 5-10 for this project)
    PG-->>B: FAQ list
    
    B->>RD: Create session<br/>(session_id, 30min TTL)
    RD-->>B: Session created
    
    B-->>W: Response: session_id +<br/>greeting message + FAQ list
    W-->>C: Shows Julia's greeting +<br/>clickable FAQ buttons

    Note over C,OL: PHASE 2a — FAQ Click (Layer 1)

    C->>W: Clicks an FAQ button
    W->>N: POST /api/widget/faq<br/>{session_id, article_id}
    N->>B: Forward
    B->>PG: Fetch full article by ID
    PG-->>B: Article content
    B->>PG: Log: Layer 1 resolution
    B-->>W: Article content formatted
    W-->>C: Shows article +<br/>"Did this help?" [Yes] [No]

    Note over C,OL: PHASE 2b — Free Question (Layer 2 — RAG Pipeline)

    C->>W: Types: "PLC showing error E-45<br/>on drive unit 3"
    W->>N: POST /api/widget/message<br/>{session_id, message}
    N->>B: Forward

    rect rgb(255, 249, 196)
        Note over B,OL: Julia's Brain — RAG Pipeline
        
        B->>RD: Fetch conversation history
        RD-->>B: Previous messages (if any)
        
        B->>PG: Load active rulebook entries<br/>(priority order)
        PG-->>B: Rules loaded
        
        B->>B: Check rules against message<br/>("production down"? "emergency"?)
        Note right of B: No rule match → proceed to RAG
        
        B->>EMB: Embed query → vector<br/>("PLC error E-45 drive unit 3")
        EMB-->>B: 384-dim vector (20ms)
        
        B->>PGV: Similarity search on kb_articles<br/>WHERE project_id = X<br/>AND audience IN ('julia','both')<br/>AND status = 'published'<br/>ORDER BY embedding <=> query<br/>LIMIT 5
        PGV-->>B: Top 5 articles +<br/>similarity scores
        
        B->>B: Relevance check:<br/>Best score = 0.81 ✅<br/>(above 0.3 minimum)
        
        B->>B: Construct prompt:<br/>System: persona + tone + rules<br/>Context: top articles<br/>History: prev messages<br/>Query: current message
        
        B->>OL: POST /api/chat<br/>{model: "llama3.1:8b",<br/>messages: prompt,<br/>temperature: 0.3}
        OL-->>B: Julia's response text<br/>(5-8 sec on CPU)
        
        B->>B: Calculate confidence:<br/>similarity(0.5) + article_count(0.2)<br/>+ specificity(0.1) + turns(0.2)<br/>= 0.72
        
        B->>B: 0.72 >= threshold(0.60)?<br/>YES → confident answer
    end

    B->>RD: Update session history
    B->>PG: Log: query, response,<br/>confidence: 0.72,<br/>articles used, latency
    
    B-->>W: Julia's answer +<br/>"Did this help?" [Yes] [Need Help]
    W-->>C: Shows answer with<br/>help/satisfaction buttons
```

---

## When Julia Is NOT Confident (Below Threshold)

```mermaid
sequenceDiagram
    autonumber
    participant C as 👤 Client
    participant W as 📱 Widget
    participant B as ⚙️ Backend
    participant PGV as 🔍 pgvector
    participant OL as 🧠 Ollama

    C->>W: "Motor is making grinding noise<br/>at startup"
    W->>B: POST /api/widget/message

    B->>PGV: Similarity search
    PGV-->>B: Best match: 0.25 ❌<br/>(below 0.3 minimum)

    Note over B: No relevant articles found<br/>SKIP LLM call entirely<br/>(saves compute, prevents hallucination)

    B-->>W: Fallback message +<br/>escalation offer
    W-->>C: "I don't have enough<br/>information to help with this.<br/>Would you like to connect<br/>with our support team?"<br/>[Yes, connect me] [No thanks]
```

---

## When a Rulebook Triggers (Skips RAG)

```mermaid
sequenceDiagram
    autonumber
    participant C as 👤 Client
    participant W as 📱 Widget
    participant B as ⚙️ Backend
    participant PG as 🐘 PostgreSQL

    C->>W: "Production line is DOWN,<br/>system halt!"
    W->>B: POST /api/widget/message

    B->>PG: Load rulebook entries
    PG-->>B: Rule: "Production Down Emergency"<br/>Trigger: "production down, halt"<br/>Action: "Immediately offer escalation"

    B->>B: Keyword match: "DOWN" + "halt"<br/>→ Rule triggered! ⚡

    Note over B: SKIP RAG entirely<br/>SKIP LLM call<br/>Execute rule action directly

    B-->>W: "This sounds urgent. Let me<br/>connect you with our support<br/>team immediately."<br/>[Create Urgent Ticket]
    W-->>C: Escalation form displayed
```

---

## What This Diagram Tells the PM

1. **Three pathways exist**: FAQ click (instant, no AI) → RAG answer (5-8 sec, AI) → Escalation (no AI, direct ticket)
2. **Julia doesn't guess**: If no relevant KB articles exist (similarity < 0.3), she skips the LLM entirely and offers human help
3. **Rulebooks bypass everything**: Emergency keywords trigger immediate escalation — no RAG, no LLM delay
4. **Every step is logged**: Session history, confidence scores, articles used, latency — all stored for PM to review
5. **API calls are clear**: Widget only ever calls 3 endpoints: `/session` (init), `/faq` (article), `/message` (question)
6. **CPU-only performance**: Embedding takes ~20ms, LLM takes ~5-8 seconds. Total response time: ~6-9 seconds per question

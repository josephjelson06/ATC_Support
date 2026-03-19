# Diagram 2: System Architecture (with Tech Stack & Infrastructure)

> **Purpose:** Shows the PM every technical component, what tools they use, and how they connect. This is the centerpiece architecture diagram.
>
> **PM signs off on:** "This is the architecture. These are the tools. This is how everything connects."

---

## How to render

Copy each mermaid code block → paste into [mermaid.live](https://mermaid.live) → export as PNG/SVG.

---

## System Architecture — Full View

```mermaid
graph TB
    subgraph CLIENT["☁️ CLIENT SIDE"]
        CApp["Client's Application<br/>(their existing dashboard)"]
        CEmail["Client's Email<br/>(Gmail / Outlook / Corporate)"]
        CApp --> Widget["📱 Support Widget<br/><i>React + Vite (iframe)</i><br/><i>Separate build, ~5KB loader</i>"]
    end

    subgraph SERVER["🖥️ YOUR SERVER (Single Ubuntu 22.04 Machine)"]
        subgraph PROXY["Nginx Reverse Proxy"]
            NG["🔒 Nginx<br/>─────────<br/>• SSL termination (Let's Encrypt)<br/>• /api/* → Backend<br/>• /widget/* → Widget files<br/>• /* → Frontend files<br/>• Rate limiting on widget"]
        end

        subgraph FRONTEND["Frontend Layer"]
            FE["🌐 Internal Web App<br/><i>React 18 + Vite + TypeScript</i><br/><i>Shadcn/ui + Tailwind CSS</i><br/>─────────<br/>Used by: SE1, SE2, SE3, PM, Director<br/>Served as static files"]
        end

        subgraph BACKEND["Backend Layer (FastAPI)"]
            API["⚙️ FastAPI Backend<br/><i>Python 3.11+ / Async</i><br/>─────────"]
            
            subgraph ROUTERS["API Routers (60+ endpoints)"]
                R1["Auth"]
                R2["Users"]
                R3["Clients / Contacts"]
                R4["Projects"]
                R5["AMCs"]
                R6["KB Articles"]
                R7["Julia Pipeline"]
                R8["Tickets"]
                R9["Notifications"]
                R10["Reports"]
                R11["Widget API"]
                R12["Email Webhook"]
                R13["Files"]
            end
        end

        subgraph DATA["Data Layer"]
            PG["🐘 PostgreSQL 16<br/>+ pgvector extension<br/>─────────<br/>• 22 tables<br/>• Vector similarity search<br/>• Connection pool: asyncpg<br/>• Single database"]

            RD["⚡ Redis 7<br/>─────────<br/>• Widget sessions (30min TTL)<br/>• JWT blacklist<br/>• Rate limit counters<br/>• Config cache"]
        end

        subgraph AI["AI Layer"]
            OL["🧠 Ollama<br/><i>Llama 3.1 8B (Q4 quantized)</i><br/>─────────<br/>• Runs on CPU (no GPU)<br/>• REST API on port 11434<br/>• Response time: 5-8 sec<br/>• Temperature: 0.3"]

            EMB["📐 Embedding Model<br/><i>all-MiniLM-L6-v2</i><br/><i>(via sentence-transformers)</i><br/>─────────<br/>• 384 dimensions<br/>• ~20ms per query<br/>• CPU only"]
        end
    end

    subgraph EXTERNAL["☁️ EXTERNAL SERVICES"]
        RESEND["📧 Resend<br/>─────────<br/>• Outbound emails to clients<br/>• Inbound webhook for replies<br/>• Free: 3,000 emails/month"]

        R2S["📁 Cloudflare R2<br/>─────────<br/>• Ticket attachments<br/>• AMC contract PDFs<br/>• KB document uploads<br/>• Free: 10GB storage"]
    end

    %% Connections
    Widget -->|"HTTPS"| NG
    CEmail -->|"SMTP"| RESEND
    NG --> FE
    NG --> API
    API --> PG
    API --> RD
    API --> OL
    API --> EMB
    API -->|"send emails"| RESEND
    RESEND -->|"inbound webhook"| API
    API -->|"file upload/download"| R2S

    style CLIENT fill:#e3f2fd,stroke:#1565C0
    style SERVER fill:#f5f5f5,stroke:#616161
    style PROXY fill:#fff9c4,stroke:#F9A825
    style FRONTEND fill:#e8f5e9,stroke:#2E7D32
    style BACKEND fill:#fce4ec,stroke:#C62828
    style DATA fill:#e8eaf6,stroke:#283593
    style AI fill:#fff3e0,stroke:#E65100
    style EXTERNAL fill:#f3e5f5,stroke:#6A1B9A
```

---

## Simplified Architecture (For Quick Reference)

```mermaid
graph LR
    subgraph Client
        W[Widget]
        E[Email]
    end

    subgraph Server["Single Server"]
        N[Nginx] --> F[React Frontend]
        N --> B[FastAPI Backend]
        B --> DB[(PostgreSQL<br/>+ pgvector)]
        B --> Cache[(Redis)]
        B --> LLM[Ollama<br/>Llama 3.1 8B]
        B --> Embed[Embedding<br/>Model]
    end

    subgraph External
        Mail[Resend<br/>Email Service]
        Files[Cloudflare R2<br/>File Storage]
    end

    W -->|HTTPS| N
    E -->|SMTP| Mail
    B <-->|API| Mail
    B <-->|S3 API| Files

    style Client fill:#e3f2fd
    style Server fill:#f5f5f5
    style External fill:#f3e5f5
```

---

## Why Each Tool Was Chosen

| Component | Chosen Tool | Why This Over Alternatives |
|---|---|---|
| **Backend** | FastAPI (Python) | Julia's AI pipeline is Python-native. Embedding models, Ollama client, pgvector — all first-class in Python. No bridge needed |
| **Frontend** | React + Vite | Largest component ecosystem. Vite is fast. TypeScript for type safety |
| **UI Library** | Shadcn/ui + Tailwind | Not a heavy framework — individual components, fully customizable, clean look |
| **Database** | PostgreSQL 16 | Relational + pgvector = no separate vector DB needed. One database does everything |
| **Vector Search** | pgvector (extension) | Lives inside PostgreSQL. No extra infrastructure. Handles thousands of articles |
| **LLM** | Ollama + Llama 3.1 8B | Runs locally on CPU. No API costs. No data leaves the server. Easy model swapping |
| **Embeddings** | all-MiniLM-L6-v2 | 384 dimensions, 20ms per query, CPU-friendly. Industry standard for RAG |
| **Cache** | Redis | Widget sessions need fast read/write. JWT blacklist. Rate limiting. Battle-tested |
| **Email** | Resend | Developer-friendly API, webhook support for inbound parsing, good deliverability |
| **File Storage** | Cloudflare R2 | S3-compatible, no egress fees, free tier covers MVP |
| **Reverse Proxy** | Nginx | SSL termination, routing, rate limiting. Standard |
| **Containerization** | Docker Compose | Everything in containers. One command to start all services |

---

## What This Diagram Tells the PM

1. **Everything runs on ONE server** — no cloud sprawl, no multi-region complexity
2. **No GPU** — Ollama runs on CPU. Slower responses (5-8 sec) but zero GPU cost
3. **One database** — PostgreSQL handles both relational data AND vector search (pgvector)
4. **Only 2 external services** — Resend (email) and R2 (files). Both have free tiers
5. **The AI is local** — no client data leaves the server. Critical for industrial clients
6. **Monthly cost: ₹4,000-6,000** — just the server rental

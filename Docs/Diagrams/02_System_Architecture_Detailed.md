# Diagram 2B: System Architecture — Deep Dive

> **Purpose:** A production-level detailed view showing internal backend layers, middleware pipeline, Docker services with ports, background workers, security boundaries, and every protocol/connection.
>
> **This complements the high-level diagram in `02_System_Architecture.md`.**

---

## How to render

Copy each mermaid code block → paste into [mermaid.live](https://mermaid.live) → export as PNG/SVG.

---

## 1. Infrastructure & Docker Compose Layout

```mermaid
graph TB
    subgraph INTERNET["🌐 INTERNET"]
        CLIENT_BROWSER["Internal Users<br/>(SE1, SE2, SE3, PM, Director)<br/><i>Browser: Chrome/Edge</i>"]
        CLIENT_APP["Client's Application<br/><i>Embeds widget via iframe</i>"]
        CLIENT_EMAIL["Client's Mail Server<br/><i>Gmail / Outlook / Corporate SMTP</i>"]
        RESEND_EXT["📧 Resend Cloud<br/><i>Email relay service</i>"]
        R2_EXT["📁 Cloudflare R2<br/><i>S3-compatible object storage</i>"]
    end

    subgraph FIREWALL["🔥 Firewall — Only ports 80 & 443 open"]
        direction TB
    end

    subgraph HOST["🖥️ HOST SERVER — Ubuntu 22.04 LTS (8 vCPU / 16GB RAM / 200GB SSD)"]
        subgraph DOCKER["🐳 Docker Compose — All Services"]
            direction TB

            subgraph NET_PUBLIC["docker network: public"]
                NGINX["📦 nginx<br/>─────────<br/>Image: nginx:1.25-alpine<br/>Ports: 80:80, 443:443<br/>Volumes: /etc/letsencrypt<br/>─────────<br/>• SSL termination<br/>• Gzip compression<br/>• /api/* → backend:8000<br/>• /widget/* → widget static<br/>• /* → frontend static<br/>• Rate limit: 30 req/min (widget)<br/>• Rate limit: 100 req/min (API)<br/>• Max upload: 10MB<br/>• CORS headers"]
            end

            subgraph NET_INTERNAL["docker network: internal"]
                BACKEND["📦 backend<br/>─────────<br/>Image: python:3.11-slim (custom)<br/>Port: 8000 (internal only)<br/>Workers: 4 (uvicorn)<br/>─────────<br/>Framework: FastAPI<br/>ASGI: Uvicorn<br/>ORM: SQLAlchemy 2.0 (async)<br/>Migration: Alembic<br/>Validation: Pydantic v2"]

                CELERY_WORKER["📦 celery-worker<br/>─────────<br/>Image: same as backend<br/>Concurrency: 2 workers<br/>─────────<br/>• Embedding generation<br/>• Email sending (async)<br/>• Auto-nudge scheduler<br/>• Auto-close scheduler<br/>• Notification dispatch<br/>• Audit log writes"]

                CELERY_BEAT["📦 celery-beat<br/>─────────<br/>Image: same as backend<br/>─────────<br/>• Every 1hr: check pending tickets<br/>• Every 24hr: AMC expiry check<br/>• Every 24hr: auto-close check<br/>• Every 6hr: health check"]

                POSTGRES["📦 postgres<br/>─────────<br/>Image: pgvector/pgvector:pg16<br/>Port: 5432 (internal only)<br/>Volume: /data/postgres<br/>─────────<br/>• 22 tables<br/>• pgvector extension<br/>• max_connections: 100<br/>• shared_buffers: 2GB<br/>• work_mem: 64MB<br/>• Backup: pg_dump daily @ 2AM"]

                REDIS["📦 redis<br/>─────────<br/>Image: redis:7-alpine<br/>Port: 6379 (internal only)<br/>Volume: /data/redis (AOF)<br/>─────────<br/>• DB 0: Widget sessions (TTL 30min)<br/>• DB 1: JWT blacklist (TTL 7 days)<br/>• DB 2: Rate limit counters (TTL 1min)<br/>• DB 3: Julia config cache (TTL 5min)<br/>• DB 4: Celery task broker"]

                OLLAMA["📦 ollama<br/>─────────<br/>Image: ollama/ollama:latest<br/>Port: 11434 (internal only)<br/>Volume: /data/ollama/models<br/>─────────<br/>• Model: llama3.1:8b-instruct-q4_K_M<br/>• CPU threads: 4 (of 8)<br/>• Context window: 4096 tokens<br/>• Temperature: 0.3<br/>• Top-p: 0.9<br/>• Health: /api/tags"]
            end
        end
    end

    %% External connections
    CLIENT_BROWSER -->|"HTTPS :443"| NGINX
    CLIENT_APP -->|"HTTPS :443<br/>(widget iframe)"| NGINX
    CLIENT_EMAIL <-->|"SMTP"| RESEND_EXT
    RESEND_EXT -->|"HTTPS POST<br/>/api/email/inbound"| NGINX
    BACKEND -->|"HTTPS API"| RESEND_EXT
    BACKEND -->|"S3 API (HTTPS)"| R2_EXT

    %% Internal connections
    NGINX -->|":8000"| BACKEND
    BACKEND -->|":5432<br/>asyncpg pool<br/>(min:5, max:20)"| POSTGRES
    BACKEND -->|":6379"| REDIS
    BACKEND -->|":11434<br/>POST /api/chat"| OLLAMA
    CELERY_WORKER -->|":5432"| POSTGRES
    CELERY_WORKER -->|":6379<br/>(broker)"| REDIS
    CELERY_WORKER -->|":11434"| OLLAMA
    CELERY_WORKER -->|"HTTPS"| RESEND_EXT
    CELERY_BEAT -->|":6379"| REDIS

    style INTERNET fill:#e3f2fd,stroke:#1565C0
    style FIREWALL fill:#ffcdd2,stroke:#C62828
    style HOST fill:#f5f5f5,stroke:#616161
    style DOCKER fill:#e8f5e9,stroke:#2E7D32
    style NET_PUBLIC fill:#fff9c4,stroke:#F9A825
    style NET_INTERNAL fill:#e8eaf6,stroke:#283593
```

---

## 2. Backend Internal Architecture (Layered)

```mermaid
graph TB
    subgraph FASTAPI["⚙️ FastAPI Application"]
        direction TB

        subgraph MIDDLEWARE["Middleware Pipeline (runs on every request)"]
            MW1["1. CORS Middleware<br/><i>Allow frontend + widget origins</i>"]
            MW2["2. Rate Limiter<br/><i>Redis-backed, per-IP</i>"]
            MW3["3. Request Logger<br/><i>Method, path, duration, user_id</i>"]
            MW4["4. Auth Middleware<br/><i>JWT validation + role extraction</i>"]
            MW5["5. Error Handler<br/><i>Catches exceptions → JSON responses</i>"]

            MW1 --> MW2 --> MW3 --> MW4 --> MW5
        end

        subgraph ROUTERS["API Router Layer (60+ endpoints)"]
            direction LR
            RA["🔐 /api/auth<br/>6 endpoints"]
            RU["👤 /api/users<br/>5 endpoints"]
            RC["🏢 /api/clients<br/>5 endpoints"]
            RCO["📇 /api/contacts<br/>4 endpoints"]
            RCS["📍 /api/consignees<br/>4 endpoints"]
            RP["📁 /api/projects<br/>7 endpoints"]
            RAM["📋 /api/amcs<br/>7 endpoints"]
            RK["📚 /api/kb<br/>7 endpoints"]
            RJ["🤖 /api/julia<br/>8 endpoints"]
            RT["🎫 /api/tickets<br/>12 endpoints"]
            RW["📱 /api/widget<br/>4 endpoints"]
            RE["📧 /api/email<br/>1 endpoint"]
            RF["📎 /api/files<br/>2 endpoints"]
            RN["🔔 /api/notifications<br/>3 endpoints"]
            RR["📊 /api/reports<br/>5 endpoints"]
        end

        subgraph SERVICES["Service Layer (Business Logic)"]
            SA["AuthService<br/><i>JWT create/verify/refresh<br/>Password hash/verify<br/>Role permission check</i>"]
            SC["ClientService<br/><i>CRUD operations<br/>Status management<br/>Cascade validation</i>"]
            SK["KBService<br/><i>Article CRUD<br/>Publish/archive flow<br/>Embedding trigger</i>"]
            SJ["JuliaService<br/><i>RAG pipeline orchestration<br/>Confidence scoring<br/>Rulebook evaluation</i>"]
            ST["TicketService<br/><i>Create/assign/escalate<br/>Status transitions<br/>Thread management</i>"]
            SE["EmailService<br/><i>Template rendering<br/>Outbound dispatch<br/>Inbound parsing</i>"]
            SN["NotificationService<br/><i>Create/deliver/mark read<br/>Type routing</i>"]
        end

        subgraph REPOS["Repository Layer (Data Access)"]
            REPO["Async SQLAlchemy Repositories<br/>─────────<br/>• One repo per table/entity<br/>• Parameterized queries only<br/>• Connection pool management<br/>• Transaction boundaries<br/>• No raw SQL (except pgvector)"]
        end

        subgraph MODELS["Data Models"]
            direction LR
            SQLM["SQLAlchemy Models<br/><i>22 ORM table classes<br/>with relationships</i>"]
            PYDM["Pydantic Schemas<br/><i>Request validation<br/>Response serialization<br/>Type safety</i>"]
        end
    end

    MW5 --> ROUTERS
    ROUTERS --> SERVICES
    SERVICES --> REPOS
    REPOS --> MODELS

    %% External connections from services
    SERVICES -->|"asyncpg"| PG[(PostgreSQL)]
    SERVICES -->|"aioredis"| RD[(Redis)]
    SJ -->|"HTTP POST"| OL[Ollama]
    SJ -->|"sentence-transformers"| EMB[Embedding Model]
    SE -->|"Resend SDK"| RS[Resend]

    style MIDDLEWARE fill:#fff9c4,stroke:#F9A825
    style ROUTERS fill:#e3f2fd,stroke:#1565C0
    style SERVICES fill:#fff3e0,stroke:#E65100
    style REPOS fill:#e8f5e9,stroke:#2E7D32
    style MODELS fill:#f3e5f5,stroke:#6A1B9A
```

---

## 3. Authentication & Security Architecture

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 User (Browser)
    participant NG as 🔒 Nginx
    participant API as ⚙️ FastAPI
    participant RD as ⚡ Redis
    participant PG as 🐘 PostgreSQL

    Note over U,PG: LOGIN FLOW

    U->>NG: POST /api/auth/login<br/>{email, password}
    NG->>API: Forward (rate limited: 5 attempts/min)
    API->>PG: Find user by email
    PG-->>API: User record (hashed password)
    API->>API: bcrypt.verify(password, hash)
    API->>API: Generate JWT access token (15min exp)<br/>Generate JWT refresh token (7 day exp)
    API->>RD: Store refresh token hash
    API-->>U: {access_token}<br/>Set-Cookie: refresh_token (httpOnly, secure, sameSite)

    Note over U,PG: AUTHENTICATED REQUEST

    U->>NG: GET /api/tickets<br/>Header: Authorization: Bearer {access_token}
    NG->>API: Forward
    API->>API: Middleware: decode JWT<br/>Extract: user_id, role, expiry
    API->>RD: Is token blacklisted? → NO ✅
    API->>API: Permission check:<br/>Does role "se1" have access to<br/>GET /api/tickets? → YES ✅
    API->>PG: Query tickets (filtered by role)
    PG-->>API: Ticket list
    API-->>U: 200 OK {tickets: [...]}

    Note over U,PG: TOKEN REFRESH

    U->>NG: POST /api/auth/refresh<br/>Cookie: refresh_token
    NG->>API: Forward
    API->>RD: Validate refresh token hash
    RD-->>API: Valid ✅
    API->>API: Generate new access token (15min)
    API->>RD: Rotate refresh token (old invalidated)
    API-->>U: {new_access_token}<br/>Set-Cookie: new_refresh_token

    Note over U,PG: WIDGET AUTH (SEPARATE FLOW)

    participant W as 📱 Widget
    W->>NG: POST /api/widget/session<br/>Header: X-Widget-Token: proj_abc123
    NG->>API: Forward
    API->>PG: Find project by widget_token
    PG-->>API: Project found, widget enabled ✅
    API->>RD: Create widget session<br/>(session_id, 30min TTL)
    API-->>W: {session_id, greeting, faqs}
```

---

## 4. Background Workers & Scheduled Jobs

```mermaid
graph TB
    subgraph TRIGGERS["What Triggers Background Jobs"]
        T1["KB article published"] -->|"Celery task"| BG_EMBED
        T2["SE clicks Reply"] -->|"Celery task"| BG_EMAIL_OUT
        T3["Ticket status changes"] -->|"Celery task"| BG_NOTIFY
        T4["Any data mutation"] -->|"Celery task"| BG_AUDIT
    end

    subgraph WORKERS["🔄 Celery Worker Tasks"]
        BG_EMBED["generate_embedding<br/>─────────<br/>• Load article content<br/>• sentence-transformers encode<br/>• Store 384-dim vector in pgvector<br/>• ~200ms per article"]

        BG_EMAIL_OUT["send_email<br/>─────────<br/>• Load email template<br/>• Fill variables (ticket#, name)<br/>• Send via Resend API<br/>• Log delivery status<br/>• Retry 3x on failure"]

        BG_NOTIFY["create_notification<br/>─────────<br/>• Determine target user(s)<br/>• Create notification record<br/>• Set type + reference link"]

        BG_AUDIT["write_audit_log<br/>─────────<br/>• Capture old_values / new_values<br/>• Record user_id, action, timestamp<br/>• Non-blocking (fire and forget)"]
    end

    subgraph SCHEDULER["⏰ Celery Beat — Scheduled Jobs"]
        SCHED1["Every 1 hour<br/>check_pending_tickets<br/>─────────<br/>• Find tickets in 'pending_client'<br/>• If 48hrs → send nudge email<br/>• If 7 days → send warning<br/>• If 9 days → auto-close"]

        SCHED2["Every 24 hours (6 AM)<br/>check_amc_expiry<br/>─────────<br/>• Find AMCs expiring in 60 days<br/>• Send alert email to PM<br/>• Create notification"]

        SCHED3["Every 24 hours (2 AM)<br/>database_backup<br/>─────────<br/>• pg_dump full database<br/>• Compress with gzip<br/>• Keep last 7 daily backups<br/>• Upload to R2 (optional)"]

        SCHED4["Every 6 hours<br/>health_check<br/>─────────<br/>• Ping PostgreSQL<br/>• Ping Redis<br/>• Ping Ollama /api/tags<br/>• Log status, alert on failure"]
    end

    BG_EMBED --> PG[(PostgreSQL)]
    BG_EMAIL_OUT --> RS[Resend]
    BG_NOTIFY --> PG
    BG_AUDIT --> PG
    SCHED1 --> PG
    SCHED1 --> RS
    SCHED2 --> PG
    SCHED2 --> RS
    SCHED3 --> PG

    style TRIGGERS fill:#e3f2fd,stroke:#1565C0
    style WORKERS fill:#fff3e0,stroke:#E65100
    style SCHEDULER fill:#fce4ec,stroke:#C62828
```

---

## 5. Frontend Application Architecture

```mermaid
graph TB
    subgraph REACT_APP["🌐 React Frontend Application"]
        direction TB

        subgraph SHELL["App Shell (always visible)"]
            TOPBAR["TopBar<br/><i>Logo, title, notifications 🔔, user menu</i>"]
            SIDEBAR["Sidebar<br/><i>Dashboard, Clients, Projects, AMCs,<br/>Tickets, KB, Reports, Settings</i><br/><i>(Role-filtered: SE1 sees 5 items,<br/>PM sees 8 items)</i>"]
        end

        subgraph ROUTING["React Router (Protected Routes)"]
            R_DASH["/dashboard"]
            R_CLI["/clients, /clients/:id"]
            R_PROJ["/projects, /projects/:id"]
            R_AMC["/amcs, /amcs/:id"]
            R_TKT["/tickets, /tickets/:id"]
            R_KB["/kb, /kb/:projectId, /kb/editor/:id"]
            R_RPT["/reports/*"]
            R_SET["/settings/*"]
        end

        subgraph STATE["State Management"]
            AUTH_CTX["AuthContext<br/><i>JWT token, user info, role<br/>Login/logout, auto-refresh</i>"]
            REACT_Q["React Query (TanStack)<br/><i>Server state cache<br/>Auto-refetch on focus<br/>Optimistic updates<br/>Pagination helpers</i>"]
        end

        subgraph UI_LIB["UI Components (Shadcn/ui)"]
            direction LR
            BTN["Button"]
            TBL["DataTable"]
            DLG["Dialog/Modal"]
            FRM["Form + Input"]
            SEL["Select/Dropdown"]
            TBS["Tabs"]
            TT["Tooltip"]
            ALT["Alert"]
            BDG["Badge"]
            SKE["Skeleton Loader"]
        end

        subgraph API_LAYER["API Client Layer"]
            AXIOS["Axios Instance<br/>─────────<br/>• baseURL: /api<br/>• Auto-attach JWT header<br/>• 401 → redirect to login<br/>• Response interceptor for errors<br/>• Request/response logging (dev)"]
        end
    end

    subgraph WIDGET_APP["📱 Widget Application (Separate Build)"]
        WIDGET_SHELL["Widget Shell<br/><i>Floating button + expandable panel</i>"]
        WIDGET_CHAT["Chat Component<br/><i>Message list, input, send button</i>"]
        WIDGET_FAQ["FAQ List<br/><i>Clickable question cards</i>"]
        WIDGET_ESC["Escalation Form<br/><i>Name, email, description, submit</i>"]
        WIDGET_LOADER["widget.js Loader<br/><i>~5KB, creates iframe<br/>Sets token from URL param<br/>Communicates via postMessage</i>"]
    end

    SHELL --> ROUTING
    ROUTING --> STATE
    STATE --> API_LAYER
    API_LAYER -->|"HTTPS /api/*"| BACKEND[FastAPI Backend]

    WIDGET_LOADER --> WIDGET_SHELL
    WIDGET_SHELL --> WIDGET_FAQ
    WIDGET_SHELL --> WIDGET_CHAT
    WIDGET_CHAT --> WIDGET_ESC
    WIDGET_APP -->|"HTTPS /api/widget/*"| BACKEND

    style REACT_APP fill:#e8f5e9,stroke:#2E7D32
    style WIDGET_APP fill:#e3f2fd,stroke:#1565C0
    style SHELL fill:#c8e6c9,stroke:#2E7D32
    style ROUTING fill:#fff9c4,stroke:#F9A825
    style STATE fill:#fff3e0,stroke:#E65100
    style UI_LIB fill:#f3e5f5,stroke:#6A1B9A
    style API_LAYER fill:#fce4ec,stroke:#C62828
```

---

## 6. Julia RAG Pipeline — Internal Architecture

```mermaid
graph TB
    INPUT["Client Message<br/>'PLC showing error E-45<br/>on drive unit 3'"] --> GATE

    subgraph PIPELINE["🤖 Julia RAG Pipeline"]
        GATE{"1. Rulebook Check<br/><i>Match keywords against<br/>active rules (priority order)</i>"}

        GATE -->|"Rule matched"| RULE_ACTION["Execute Rule Action<br/><i>e.g., immediate escalation</i>"]
        GATE -->|"No match"| EMBED

        EMBED["2. Query Embedding<br/><i>sentence-transformers<br/>all-MiniLM-L6-v2<br/>→ 384-dim vector<br/>~20ms</i>"]

        EMBED --> SEARCH["3. Vector Search<br/><i>pgvector: embedding \u003c=\u003e query_vec<br/>WHERE project_id = X<br/>AND audience IN ('julia','both')<br/>AND status = 'published'<br/>ORDER BY similarity DESC<br/>LIMIT 5</i>"]

        SEARCH --> RELEVANCE{"4. Relevance Gate<br/><i>Best similarity score<br/>\u003e 0.3?</i>"}

        RELEVANCE -->|"Below 0.3"| FALLBACK["Fallback Response<br/><i>No LLM call<br/>Show fallback message<br/>Offer escalation</i>"]

        RELEVANCE -->|"Above 0.3"| PROMPT["5. Prompt Construction<br/>─────────<br/>System: persona + tone + constraints<br/>Context: top 3-5 article excerpts<br/>History: previous messages (if any)<br/>Query: current message<br/>─────────<br/>Constraints injected:<br/>• Only use provided context<br/>• Never invent technical specs<br/>• Cite article titles<br/>• If unsure, say so"]

        PROMPT --> LLM["6. LLM Inference<br/><i>Ollama POST /api/chat<br/>Model: llama3.1:8b-instruct-q4_K_M<br/>Temperature: 0.3<br/>Max tokens: 512<br/>~5-8 sec on CPU</i>"]

        LLM --> SCORE["7. Confidence Scoring<br/>─────────<br/>score = weighted average:<br/>• similarity_score × 0.5<br/>• article_count_factor × 0.2<br/>• response_specificity × 0.1<br/>• conversation_turn × 0.2<br/>─────────<br/>Range: 0.0 → 1.0"]

        SCORE --> DECISION{"8. Confidence Check<br/><i>score ≥ threshold?<br/>(default: 0.60)</i>"}

        DECISION -->|"Confident"| RESPOND["✅ Respond directly<br/><i>Show answer + 'Did this help?'</i>"]
        DECISION -->|"Not confident"| CAVEAT["⚠️ Respond with caveat<br/><i>Show answer + disclaimer<br/>'I'm not fully confident...<br/>Would you like human help?'</i>"]
    end

    RESPOND --> LOG["9. Log Everything<br/>─────────<br/>• session_id<br/>• query text<br/>• response text<br/>• confidence score<br/>• articles used (IDs + scores)<br/>• LLM latency (ms)<br/>• resolution layer (L1/L2/L3)"]

    CAVEAT --> LOG
    FALLBACK --> LOG
    RULE_ACTION --> LOG

    style INPUT fill:#e3f2fd,stroke:#1565C0
    style PIPELINE fill:#fff3e0,stroke:#E65100
    style GATE fill:#fff9c4
    style RELEVANCE fill:#fff9c4
    style DECISION fill:#fff9c4
    style RESPOND fill:#c8e6c9,stroke:#2E7D32
    style CAVEAT fill:#ffe0b2,stroke:#E65100
    style FALLBACK fill:#ffcdd2,stroke:#C62828
    style LOG fill:#e0e0e0,stroke:#616161
```

---

## 7. Docker Compose Services Summary

| Service | Image | Internal Port | CPU | RAM | Disk | Depends On |
|---|---|---|---|---|---|---|
| `nginx` | nginx:1.25-alpine | 80, 443 | 0.5 core | 256MB | 100MB | backend |
| `backend` | python:3.11-slim (custom) | 8000 | 1 core | 1GB | 500MB | postgres, redis, ollama |
| `celery-worker` | same as backend | — | 1 core | 1GB | — | postgres, redis, ollama |
| `celery-beat` | same as backend | — | 0.25 core | 256MB | — | redis |
| `postgres` | pgvector/pgvector:pg16 | 5432 | 1 core | 2GB | 50GB | — |
| `redis` | redis:7-alpine | 6379 | 0.25 core | 512MB | 1GB | — |
| `ollama` | ollama/ollama:latest | 11434 | 4 cores | 6GB | 5GB (model) | — |
| **Total** | | | **8 cores** | **~11GB** | **~57GB** | |

---

## 8. Network & Port Map

```mermaid
graph LR
    subgraph EXTERNAL["External (Internet-facing)"]
        P80["Port 80<br/>HTTP → redirect to 443"]
        P443["Port 443<br/>HTTPS (SSL/TLS)"]
    end

    subgraph INTERNAL["Internal (Docker network only)"]
        P8000["Port 8000<br/>FastAPI (uvicorn)"]
        P5432["Port 5432<br/>PostgreSQL"]
        P6379["Port 6379<br/>Redis"]
        P11434["Port 11434<br/>Ollama REST API"]
    end

    P443 -->|"nginx routes"| P8000
    P8000 -->|"asyncpg TCP"| P5432
    P8000 -->|"aioredis TCP"| P6379
    P8000 -->|"HTTP POST"| P11434

    style EXTERNAL fill:#ffcdd2,stroke:#C62828
    style INTERNAL fill:#c8e6c9,stroke:#2E7D32
```

---

## What This Tells the PM (Beyond the High-Level Diagram)

1. **7 Docker containers** — not just "a server," but 7 isolated services managed by Docker Compose
2. **Background workers handle heavy lifting** — embedding generation, email sending, and scheduled jobs don't block the API
3. **4-layer backend** — Middleware → Routers → Services → Repositories. Clean separation, testable
4. **Security is layered** — Firewall → Nginx rate limiting → JWT validation → Role permission check → Parameterized queries
5. **Two separate React apps** — internal web app (heavy, full Shadcn/ui) and widget (lightweight, ~5KB loader)
6. **Server needs: 8 vCPU, 16GB RAM** — Ollama alone needs 4 cores + 6GB RAM for the quantized Llama model
7. **Only 2 ports face the internet** — 80 and 443. Everything else is isolated in Docker's internal network
8. **Automated maintenance** — daily backups, hourly ticket nudge checks, AMC expiry alerts, health monitoring — all via Celery Beat

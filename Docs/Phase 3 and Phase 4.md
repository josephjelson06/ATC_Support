

<thinking>
The user wants to move forward with Phase 3 (Tech Stack confirmation) and Phase 4 (Final Database Schema), and they also want expected costs in Indian Rupees (INR). They mentioned the tech stack could be Node.js or FastAPI, so I should present both options and their trade-offs.

Let me think about costs:

1. Server/VPS costs
2. Domain + SSL
3. Email service
4. File storage
5. GPU (if needed for LLM)
6. Any SaaS tools
7. Development costs (if hiring)
8. Ongoing maintenance

I should present costs in INR. Let me convert:
- 1 USD ≈ 83-85 INR (as of early 2025)

Let me think about Indian VPS providers too:
- DigitalOcean, Hetzner, Linode for international
- AWS Mumbai region
- Indian providers like Hostinger India, HostGator India

For the tech stack, since they said "node or fastapi", I should present both and make a recommendation based on our architecture requirements.

Let me also finalize the database schema properly with exact column types, constraints, etc.

Let me structure this:

Phase 3: Tech Stack (Final) + Cost Breakdown
Phase 4: Final Database Schema
</thinking>

# Phase 3 — Tech Stack (Final) + Cost Breakdown

---

## The Decision: Node.js vs FastAPI

Both work. Here's the honest comparison for this specific project.

---

### FastAPI (Python)

**Advantages for this project:**
- Julia's entire ML pipeline is Python-native. Embedding models (sentence-transformers), Ollama's Python client, pgvector's Python library — all first-class. No bridge, no subprocess calls, no inter-process communication. Julia's RAG pipeline lives inside the same application that serves the API.
- Async-native. Handles concurrent widget sessions without blocking.
- Auto-generated API docs (Swagger UI) — useful for development and debugging.
- SQLAlchemy + Alembic for database ORM and migrations — mature, well-documented.
- Type hints throughout — catches bugs early.

**Disadvantages:**
- Slightly smaller talent pool in India compared to Node.js (but growing fast).
- If the team is JavaScript-heavy, context-switching between frontend (React) and backend (Python) adds friction.

---

### Node.js (Express or Fastify)

**Advantages for this project:**
- Same language as frontend (React). One language across the stack. Easier for a small team.
- Massive talent pool in India. Easier to hire.
- Fastify is extremely fast — comparable to FastAPI in benchmarks.
- npm ecosystem is enormous.

**Disadvantages:**
- Julia's ML pipeline becomes a problem. Embedding models, vector search orchestration, LLM prompt construction — all need to happen in Python or through HTTP calls to a separate Python service. This means either running a sidecar Python service just for Julia, or calling Ollama's REST API directly from Node (possible, but embedding generation still needs Python or a separate service).
- Two runtimes to maintain if you add a Python sidecar.
- TypeScript adds type safety but also adds build complexity.

---

### The Practical Answer

**If the team knows Python or is willing to learn:** FastAPI. Julia integration is seamless. One codebase does everything.

**If the team is strictly JavaScript and won't touch Python:** Node.js (Fastify) for the API + a small Python microservice for Julia's pipeline (embedding, RAG, LLM calls). Two services, but each does what it's best at.

**Hybrid approach:** Node.js backend for all CRUD operations, authentication, tickets, email — the "web app" parts. Python service exclusively for Julia — receives queries, runs RAG, returns responses. They communicate over internal HTTP. This is clean separation but adds deployment complexity.

---

### Recommendation

**Go FastAPI.** For this project, the LLM integration is not a side feature — it's the core differentiator. Building it in the same language as the API eliminates an entire class of problems. The team writes Python for the backend and JavaScript for the frontend. Two languages, two concerns, clean split.

If hiring is a concern, Python FastAPI developers are abundant in India's market — especially with the AI/ML wave driving Python adoption.

---

## Final Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend (Web App) | React 18 + Vite + TypeScript | Component ecosystem, Vite speed, type safety |
| UI Component Library | Shadcn/ui + Tailwind CSS | Clean, customizable, no heavy framework dependency |
| Frontend (Widget) | React + Vite (separate build) | Same tooling, separate deployment |
| Backend API | Python 3.11+ with FastAPI | Async, Julia-native, auto-docs |
| ORM | SQLAlchemy 2.0 (async) | Mature, well-supported, async support |
| Migrations | Alembic | Standard for SQLAlchemy |
| Database | PostgreSQL 16 | Relational, JSONB, pgvector support |
| Vector Store | pgvector (PostgreSQL extension) | No extra infrastructure |
| Embedding Model | all-MiniLM-L6-v2 (via sentence-transformers) | Fast, CPU-friendly, 384 dimensions |
| LLM Runtime | Ollama | Simple API, model management, easy swap |
| LLM Model | Llama 3.1 8B (Q4 quantized) | Good quality, runs on modest hardware |
| Cache / Sessions | Redis 7 | Widget sessions, JWT blacklist, rate limiting |
| Email Service | Resend | Developer-friendly, webhook support, good deliverability |
| File Storage | Cloudflare R2 | S3-compatible, no egress fees, free tier |
| Reverse Proxy | Nginx | SSL, routing, rate limiting |
| Server OS | Ubuntu 22.04 LTS | Stable, well-supported |
| Containerization | Docker + Docker Compose | Consistent environments, easy deployment |
| Version Control | Git + GitHub | Standard |

---

## Cost Breakdown — Indian Rupees (₹)

---

### One-Time Setup Costs

| Item | Cost (₹) | Notes |
|---|---|---|
| Domain name (.com or .in) | ₹800–1,500/year | Via Namecheap, Cloudflare, or GoDaddy |
| SSL Certificate | ₹0 | Let's Encrypt (free, auto-renewing via Nginx) |
| Initial server setup | ₹0 | Self-managed, or team effort |
| **Total One-Time** | **~₹1,000–1,500** | |

---

### Monthly Infrastructure Costs — MVP Stage

**Option A: CPU-Only Server (No GPU)**

Julia runs on CPU. Responses take 5–10 seconds per query. Acceptable for early stage with low widget traffic.

| Item | Monthly Cost (₹) | Provider | Specs |
|---|---|---|---|
| VPS (primary server) | ₹3,500–5,000 | Hetzner (CPX31 or CPX41) | 4–8 vCPU, 16–32GB RAM, 240GB SSD |
| Redis (on same server) | ₹0 | Runs as Docker container | Minimal resource usage |
| PostgreSQL (on same server) | ₹0 | Runs as Docker container | Shared server resources |
| Email — Resend | ₹0–1,700 | Resend | Free: 3,000 emails/month. Pro: \$20/mo (~₹1,700) for 50,000 |
| File Storage — Cloudflare R2 | ₹0–400 | Cloudflare | Free: 10GB storage, 10M reads. Minimal cost after |
| Domain renewal (amortized) | ₹100 | — | ₹1,200/year ÷ 12 |
| **Total (CPU-only)** | **₹3,600–7,200/month** | | |

**Option B: GPU Server (Faster Julia)**

Julia runs on GPU. Responses in 1–3 seconds. Better experience, necessary once widget traffic grows.

| Item | Monthly Cost (₹) | Provider | Specs |
|---|---|---|---|
| GPU VPS | ₹8,000–15,000 | Vast.ai / RunPod / Lambda | RTX 4060–4090, 16–32GB RAM, varies |
| OR dedicated GPU server | ₹12,000–25,000 | Hetzner (EX44 + GPU) / OVH | Dedicated hardware, more reliable |
| Non-GPU VPS (for web app, DB) | ₹2,500–4,000 | Hetzner / DigitalOcean | 4 vCPU, 8GB RAM — runs everything except LLM |
| Email — Resend | ₹0–1,700 | Resend | Same as above |
| File Storage — Cloudflare R2 | ₹0–400 | Cloudflare | Same as above |
| Domain renewal (amortized) | ₹100 | — | Same |
| **Total (with GPU)** | **₹10,600–31,200/month** | | |

**Option C: Indian Cloud Providers**

If data residency matters or you prefer Indian billing.

| Item | Monthly Cost (₹) | Provider | Specs |
|---|---|---|---|
| VPS | ₹5,000–10,000 | AWS Mumbai (t3.xlarge) / DigitalOcean BLR | 4 vCPU, 16GB RAM |
| GPU Instance | ₹25,000–60,000 | AWS (g4dn.xlarge) Mumbai | T4 GPU, expensive for always-on |
| Managed PostgreSQL | ₹3,000–8,000 | AWS RDS / DigitalOcean Managed DB | Takes DB management off your plate |
| **Total (Indian cloud, with GPU)** | **₹33,000–78,000/month** | | Not recommended for MVP |

---

### Recommendation: Start with Option A

Run everything on a single Hetzner CPX41 (8 vCPU, 32GB RAM, ~₹5,000/month). Julia runs on CPU with the quantized 8B model. Widget responses take 5–8 seconds — tolerable for early clients.

When you have 5+ active projects with regular widget traffic, move Julia to a GPU box (Option B split architecture). That's probably month 3–6.

**MVP monthly burn: ₹4,000–6,000/month.** That's it.

---

### Monthly SaaS / Service Costs Summary

| Service | Free Tier | Paid Tier | When You'll Need Paid |
|---|---|---|---|
| Resend (email) | 3,000 emails/month | ₹1,700/month (50K emails) | When you have 20+ active tickets/month |
| Cloudflare R2 (files) | 10GB storage | ₹35/GB/month after | When attachments exceed 10GB total |
| GitHub (repo) | Free for private repos | ₹0 | Free is enough |
| Ollama (LLM) | Open source | ₹0 | Always free |
| pgvector | Open source | ₹0 | Always free |
| Redis | Open source | ₹0 | Always free (self-hosted) |
| Let's Encrypt (SSL) | Free | ₹0 | Always free |

**Total SaaS cost at MVP: ₹0.** Everything is either open source or within free tiers.

---

### Development Cost Estimates

If the team is building this themselves: ₹0 (just time).

If hiring developers:

| Role | Monthly Rate (₹) | Duration | Total |
|---|---|---|---|
| Full-stack developer (mid-level, India) | ₹60,000–1,20,000 | 4–5 months | ₹2,40,000–6,00,000 |
| Frontend developer (React) | ₹40,000–80,000 | 3 months | ₹1,20,000–2,40,000 |
| Backend developer (Python/FastAPI) | ₹50,000–1,00,000 | 4 months | ₹2,00,000–4,00,000 |
| ML/AI engineer (Julia pipeline) | ₹70,000–1,50,000 | 2 months | ₹1,40,000–3,00,000 |

**If hiring one good full-stack developer who can handle both React and Python:** ₹3,00,000–6,00,000 total for MVP over 4–5 months.

**If the founder/team builds it themselves:** ₹0 development cost. Infrastructure cost over 5 months: ₹20,000–30,000 total.

---

### Year 1 Total Cost Projection

**Scenario: Self-built, Option A infrastructure**

| Item | Year 1 Cost (₹) |
|---|---|
| Server (₹5,000 × 12) | ₹60,000 |
| Domain | ₹1,200 |
| Email (free → paid around month 6, ₹1,700 × 6) | ₹10,200 |
| File storage | ₹2,000 (estimate) |
| GPU upgrade at month 6 (₹12,000 × 6) | ₹72,000 |
| **Year 1 Total** | **₹1,45,400** |

Roughly **₹12,000/month average** for the full year, scaling up as usage grows.

**Scenario: Hired one developer, Option A → B infrastructure**

| Item | Year 1 Cost (₹) |
|---|---|
| Developer (5 months) | ₹4,00,000 |
| Infrastructure (12 months) | ₹1,45,400 |
| **Year 1 Total** | **₹5,45,400** |

---

---

# Phase 4 — Final Database Schema

---

### Conventions

- All tables use `id` as UUID primary key
- All tables have `created_at` and `updated_at` timestamps
- Soft deletes where applicable (status field, not row deletion)
- Foreign keys enforce referential integrity
- Indexes on all foreign keys and frequently queried columns

---

### Table 1: `users`

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('se1', 'se2', 'se3', 'pm', 'director')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    first_login BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

---

### Table 2: `clients`

```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_company_name ON clients(company_name);
```

---

### Table 3: `contact_persons`

```sql
CREATE TABLE contact_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    designation VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contacts_client_id ON contact_persons(client_id);
CREATE INDEX idx_contacts_email ON contact_persons(email);
```

---

### Table 4: `consignees`

```sql
CREATE TABLE consignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    site_name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    contact_person_name VARCHAR(255),
    contact_person_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consignees_client_id ON consignees(client_id);
```

---

### Table 5: `projects`

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_se3_id UUID REFERENCES users(id),
    widget_token VARCHAR(64) UNIQUE NOT NULL,
    widget_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_assigned_se3 ON projects(assigned_se3_id);
CREATE INDEX idx_projects_widget_token ON projects(widget_token);
CREATE INDEX idx_projects_status ON projects(status);
```

---

### Table 6: `project_consignees`

```sql
CREATE TABLE project_consignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    consignee_id UUID NOT NULL REFERENCES consignees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, consignee_id)
);

CREATE INDEX idx_pc_project_id ON project_consignees(project_id);
CREATE INDEX idx_pc_consignee_id ON project_consignees(consignee_id);
```

---

### Table 7: `amcs`

```sql
CREATE TABLE amcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    contract_number VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    coverage_description TEXT,
    document_url VARCHAR(500),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_amcs_client_id ON amcs(client_id);
CREATE INDEX idx_amcs_end_date ON amcs(end_date);
CREATE INDEX idx_amcs_status ON amcs(status);
```

---

### Table 8: `amc_projects`

```sql
CREATE TABLE amc_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_id UUID NOT NULL REFERENCES amcs(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(amc_id, project_id)
);

CREATE INDEX idx_ap_amc_id ON amc_projects(amc_id);
CREATE INDEX idx_ap_project_id ON amc_projects(project_id);
```

---

### Table 9: `kb_articles`

```sql
CREATE TABLE kb_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    audience VARCHAR(20) NOT NULL DEFAULT 'both' CHECK (audience IN ('julia', 'internal', 'both')),
    category VARCHAR(100),
    tags TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    author_id UUID NOT NULL REFERENCES users(id),
    published_at TIMESTAMP WITH TIME ZONE,
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kb_project_id ON kb_articles(project_id);
CREATE INDEX idx_kb_status ON kb_articles(status);
CREATE INDEX idx_kb_audience ON kb_articles(audience);
CREATE INDEX idx_kb_author ON kb_articles(author_id);

-- pgvector index for similarity search
CREATE INDEX idx_kb_embedding ON kb_articles
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

---

### Table 10: `julia_configs`

```sql
CREATE TABLE julia_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id),
    persona_name VARCHAR(100) NOT NULL DEFAULT 'Julia',
    greeting_message TEXT NOT NULL DEFAULT 'Hi! How can I help you today?',
    fallback_message TEXT NOT NULL DEFAULT 'I''m not confident I can help with this. Would you like to connect with our support team?',
    confidence_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.60,
    tone VARCHAR(20) NOT NULL DEFAULT 'professional' CHECK (tone IN ('professional', 'friendly', 'technical')),
    max_turns INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### Table 11: `julia_rulebooks`

```sql
CREATE TABLE julia_rulebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    rule_name VARCHAR(255) NOT NULL,
    trigger_condition TEXT NOT NULL,
    action_instruction TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rulebooks_project_id ON julia_rulebooks(project_id);
CREATE INDEX idx_rulebooks_status ON julia_rulebooks(status);
CREATE INDEX idx_rulebooks_priority ON julia_rulebooks(priority);
```

---

### Table 12: `widget_sessions`

```sql
CREATE TABLE widget_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    contact_email VARCHAR(255),
    contact_id UUID REFERENCES contact_persons(id),
    resolution_layer VARCHAR(10) CHECK (resolution_layer IN ('L1', 'L2', 'L3', NULL)),
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    ticket_id UUID REFERENCES tickets(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_ws_project_id ON widget_sessions(project_id);
CREATE INDEX idx_ws_contact_id ON widget_sessions(contact_id);
CREATE INDEX idx_ws_started_at ON widget_sessions(started_at);
CREATE INDEX idx_ws_resolution_layer ON widget_sessions(resolution_layer);
```

---

### Table 13: `widget_session_messages`

```sql
CREATE TABLE widget_session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES widget_sessions(id),
    message_index INTEGER NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    confidence_score DECIMAL(3,2),
    articles_used UUID[],
    similarity_scores DECIMAL(4,3)[],
    llm_latency_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wsm_session_id ON widget_session_messages(session_id);
CREATE INDEX idx_wsm_message_index ON widget_session_messages(session_id, message_index);
```

---

### Table 14: `tickets`

```sql
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    contact_id UUID NOT NULL REFERENCES contact_persons(id),
    consignee_id UUID REFERENCES consignees(id),
    subject VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'pending_client', 'resolved', 'closed', 'closed_inactive', 'closed_merged')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    current_level VARCHAR(10) NOT NULL DEFAULT 'se1' CHECK (current_level IN ('se1', 'se2', 'se3')),
    assigned_to UUID NOT NULL REFERENCES users(id),
    source VARCHAR(20) NOT NULL DEFAULT 'widget' CHECK (source IN ('widget', 'manual', 'email')),
    widget_session_id UUID REFERENCES widget_sessions(id),
    merged_into_ticket_id UUID REFERENCES tickets(id),
    resolution_summary TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    last_client_response_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tickets_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_project_id ON tickets(project_id);
CREATE INDEX idx_tickets_client_id ON tickets(client_id);
CREATE INDEX idx_tickets_contact_id ON tickets(contact_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_current_level ON tickets(current_level);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_last_activity ON tickets(last_activity_at);
```

Ticket number generation: sequential within the system. Format: `TKT-0001`, `TKT-0002`, etc. Generated by a database sequence:

```sql
CREATE SEQUENCE ticket_number_seq START WITH 1;
```

On ticket creation, the backend generates:
```python
ticket_number = f"TKT-{next_val:04d}"
```

---

### Table 15: `ticket_messages`

```sql
CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id),
    author_type VARCHAR(20) NOT NULL CHECK (author_type IN ('se', 'client', 'system')),
    author_id UUID REFERENCES users(id),
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('reply', 'internal_note', 'call_log', 'escalation_note', 'system_message', 'merged_transcript')),
    content TEXT NOT NULL,
    -- call log specific fields
    call_direction VARCHAR(10) CHECK (call_direction IN ('inbound', 'outbound')),
    call_to VARCHAR(255),
    call_duration_minutes INTEGER,
    -- email tracking
    email_message_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tm_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_tm_author_type ON ticket_messages(author_type);
CREATE INDEX idx_tm_message_type ON ticket_messages(message_type);
CREATE INDEX idx_tm_created_at ON ticket_messages(created_at);
```

---

### Table 16: `ticket_attachments`

```sql
CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id),
    message_id UUID REFERENCES ticket_messages(id),
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    storage_url VARCHAR(500) NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ta_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX idx_ta_message_id ON ticket_attachments(message_id);
```

---

### Table 17: `escalation_history`

```sql
CREATE TABLE escalation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id),
    from_level VARCHAR(10) NOT NULL,
    to_level VARCHAR(10) NOT NULL,
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_eh_ticket_id ON escalation_history(ticket_id);
```

---

### Table 18: `ticket_feedback`

```sql
CREATE TABLE ticket_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID UNIQUE NOT NULL REFERENCES tickets(id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    feedback_token VARCHAR(64) UNIQUE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tf_ticket_id ON ticket_feedback(ticket_id);
CREATE INDEX idx_tf_feedback_token ON ticket_feedback(feedback_token);
```

The `feedback_token` is a unique token embedded in the resolution email link. Client clicks it, lands on a simple page (no login required), submits rating and comment. Token is single-use.

---

### Table 19: `notifications`

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    reference_type VARCHAR(30),
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notif_user_id ON notifications(user_id);
CREATE INDEX idx_notif_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notif_created_at ON notifications(created_at);
```

`reference_type` and `reference_id` allow linking to any entity: `ticket` + ticket UUID, `amc` + amc UUID, etc. The frontend uses this to navigate to the relevant page when the notification is clicked.

---

### Table 20: `email_templates`

```sql
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key VARCHAR(50) UNIQUE NOT NULL,
    subject_template VARCHAR(500) NOT NULL,
    body_template TEXT NOT NULL,
    description VARCHAR(255),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Seeded with default templates on first deployment:

| template_key | Description |
|---|---|
| `ticket_created` | Confirmation to client when ticket is created |
| `ticket_reply` | SE reply sent to client |
| `ticket_escalated` | Escalation notice to client |
| `ticket_resolved` | Resolution notice with feedback links |
| `ticket_closed` | Closure confirmation |
| `ticket_nudge_48h` | First reminder after 48 hours |
| `ticket_nudge_7d` | Final warning before auto-close |
| `ticket_auto_closed` | Auto-closure notice |
| `ticket_merged` | Merge notification |
| `amc_expiry_60d` | AMC expiring in 60 days |
| `amc_expiry_30d` | AMC expiring in 30 days |
| `amc_expired` | AMC has expired |
| `user_welcome` | New user account created |
| `password_reset` | Password reset link |

---

### Table 21: `canned_responses`

```sql
CREATE TABLE canned_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    content TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cr_category ON canned_responses(category);
```

---

### Table 22: `audit_logs`

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
```

Every significant action is logged: client created, ticket escalated, user deactivated, AMC updated, article published. The `old_values` and `new_values` JSONB fields capture what changed.

---

### Final Schema Summary

| # | Table | Purpose | Row Growth |
|---|---|---|---|
| 1 | `users` | Internal team accounts | Low (5–20) |
| 2 | `clients` | Client companies | Low (10–100) |
| 3 | `contact_persons` | Client contacts | Low-Medium (50–500) |
| 4 | `consignees` | Client sites | Low-Medium (20–200) |
| 5 | `projects` | Deployed projects | Low-Medium (20–200) |
| 6 | `project_consignees` | Project ↔ site links | Low-Medium |
| 7 | `amcs` | Annual maintenance contracts | Low (10–100) |
| 8 | `amc_projects` | AMC ↔ project links | Low |
| 9 | `kb_articles` | Knowledge base content | Medium (100–2,000) |
| 10 | `julia_configs` | Per-project Julia settings | Low (1 per project) |
| 11 | `julia_rulebooks` | Per-project behavior rules | Low (5–50 per project) |
| 12 | `widget_sessions` | Chat sessions | High (grows daily) |
| 13 | `widget_session_messages` | Individual chat messages | High (grows daily) |
| 14 | `tickets` | Support tickets | Medium-High (grows weekly) |
| 15 | `ticket_messages` | Ticket thread messages | High (grows daily) |
| 16 | `ticket_attachments` | Files attached to tickets | Medium |
| 17 | `escalation_history` | Escalation audit trail | Low-Medium |
| 18 | `ticket_feedback` | Client satisfaction responses | Low-Medium |
| 19 | `notifications` | In-app notifications | High (grows daily, can be pruned) |
| 20 | `email_templates` | Email template content | Static (seeded once) |
| 21 | `canned_responses` | Reusable reply templates | Low (10–50) |
| 22 | `audit_logs` | System-wide change tracking | High (grows daily, can be archived) |

**22 tables total.** Up from the original 16 — the additions (audit logs, email templates, canned responses, ticket feedback, escalation history, widget session messages) came directly from the detailed user flows and architecture work.

---

### Entity Relationship Overview

```
clients ──────┬──── contact_persons
              ├──── consignees ──── project_consignees ──── projects
              └──── amcs ──── amc_projects ──── projects
                                                    │
                                                    ├──── kb_articles (with embeddings)
                                                    ├──── julia_configs
                                                    ├──── julia_rulebooks
                                                    ├──── widget_sessions ──── widget_session_messages
                                                    └──── tickets
                                                            ├──── ticket_messages
                                                            ├──── ticket_attachments
                                                            ├──── escalation_history
                                                            └──── ticket_feedback

users ──── (referenced by most tables as author/assignee)

standalone: notifications, email_templates, canned_responses, audit_logs
```

---

Phase 3 and Phase 4 are done. Tech stack is locked. Schema is implementation-ready. Costs are mapped.

**Next: Phase 5 (UI/UX Wireframes) and Phase 6 (MVP Scoping & Dev Plan).** These are the last two before actual development begins. Ready?
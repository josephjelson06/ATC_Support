

<think>
The user wants to continue. We've completed most of Phase 1. The remaining piece is Julia's architecture design, and then we move to Phase 2 (System Architecture).

Let me do Julia's architecture design first since it's part of Phase 1, then move into Phase 2 which covers the high-level architecture, API design, and data flow diagrams.

Let me think about Julia's architecture in detail:

**Julia's Pipeline:**
1. Query received from widget
2. Session management (conversation history)
3. FAQ check (Layer 1)
4. RAG pipeline (Layer 2):
   - Query embedding
   - Vector similarity search
   - Context retrieval
   - Prompt construction (system prompt + rulebooks + context + history + query)
   - LLM inference
   - Confidence scoring
   - Response delivery
5. Escalation trigger (Layer 3):
   - AMC check
   - Contact validation
   - Ticket creation

Then for Phase 2 - System Architecture:
- High-level architecture diagram (text-based)
- Component breakdown
- API design (all endpoints)
- Data flow diagrams
- Integration points
- Authentication architecture

This is going to be comprehensive. Let me structure it well.
</think>

## Phase 1 (Final) — Julia's Architecture Design

---

### What Julia Actually Is

Julia is not one thing. She's a pipeline — a sequence of steps that a query passes through, each step deciding what happens next. She's not a single LLM call. She's a decision engine with an LLM at her core.

---

### The Pipeline — Step by Step

---

**Step 1: Widget Session Initialization**

Client opens the widget. The widget sends a request to the backend:

```
POST /api/widget/session
Headers: X-Widget-Token: <project_token>
```

Backend validates the token. Identifies the project. Creates a session ID. Loads:
- Julia's configuration for this project (persona, tone, greeting, confidence threshold)
- FAQ articles tagged for this project (top 5–10 by category)
- Active rulebook entries for this project

Returns to widget:
- Session ID
- Greeting message
- FAQ list (title + article ID for each)

Client sees: Julia's greeting + clickable FAQ buttons.

---

**Step 2: Layer 1 — FAQ Resolution**

Client clicks an FAQ button.

```
POST /api/widget/faq
Body: { session_id, article_id }
```

Backend fetches the full article. Returns it as a formatted response in the chat window. No LLM involved. No embedding. No computation. Just a database read.

Julia asks: "Did this help?" Client clicks Yes → session ends, logged as Layer 1 resolution. Client clicks No → Julia says "Tell me more about your issue" → conversation moves to Layer 2.

---

**Step 3: Layer 2 — RAG Pipeline**

Client types a freeform question. This is where Julia thinks.

```
POST /api/widget/message
Body: { session_id, message }
```

**3a. Preprocessing**

Backend receives the message. Appends it to the session's conversation history (stored in memory/Redis for the duration of the session).

Backend checks rulebook entries first — before any RAG:
- Iterates through active rules in priority order
- Each rule has a trigger condition (natural language pattern)
- Simple keyword/phrase matching for trigger evaluation: does the message contain "production down," "system halt," "emergency," etc.?
- If a high-priority rule matches → skip RAG entirely, execute the rule's action (e.g., immediately offer escalation)
- If no rule matches → proceed to RAG

**3b. Query Embedding**

The client's message is converted into a vector embedding using an embedding model. This is a separate, smaller model — not the main LLM. It runs fast.

Model choice: `all-MiniLM-L6-v2` (384 dimensions, runs on CPU, ~20ms per query) or `nomic-embed-text` via Ollama.

The embedding represents the semantic meaning of the query as a numerical vector.

**3c. Vector Similarity Search**

The query embedding is compared against all KB article embeddings for this project (stored in pgvector).

```sql
SELECT id, title, content, 1 - (embedding <=> query_embedding) AS similarity
FROM kb_articles
WHERE project_id = :project_id
  AND audience IN ('julia', 'both')
  AND status = 'published'
ORDER BY embedding <=> query_embedding
LIMIT 5;
```

Returns the top 5 most semantically similar articles with their similarity scores (0 to 1, where 1 is identical).

**3d. Context Relevance Check**

Before sending anything to the LLM, the system checks: are the retrieved articles actually relevant?

- If the highest similarity score is below 0.3 → no relevant articles found. Julia should not attempt an answer from general knowledge.
  - Response: fallback message offering escalation
  - Skip LLM call entirely — saves compute, prevents hallucination
  - Log: Layer 2 failure, no relevant context

- If the highest similarity score is between 0.3 and the project's confidence threshold (e.g., 0.6) → articles are loosely relevant. Julia can attempt an answer but must flag uncertainty.

- If the highest similarity score is above the confidence threshold → strong match. Julia answers confidently.

**3e. Prompt Construction**

The system builds the full prompt for the LLM:

```
SYSTEM PROMPT:
You are {persona_name}, a technical support assistant for {project_name}.
Your tone is {tone_setting}.
You work for {company_name}.

RULES:
{All active rulebook entries, formatted as instructions}

IMPORTANT CONSTRAINTS:
- Only answer based on the provided context articles.
- If the context does not contain enough information, say so honestly.
- Never make up technical details, error codes, or procedures.
- Do not answer questions unrelated to {project_name}.

CONTEXT ARTICLES:
---
Article 1: {title}
{content}
---
Article 2: {title}
{content}
---
(up to 5 articles)

CONVERSATION HISTORY:
User: {previous message 1}
Assistant: {previous response 1}
User: {previous message 2}
Assistant: {previous response 2}

CURRENT QUERY:
User: {current message}
```

**3f. LLM Inference**

The constructed prompt is sent to Ollama's API:

```
POST http://localhost:11434/api/chat
Body: {
  model: "llama3.1:8b",
  messages: [constructed prompt],
  stream: false,
  options: { temperature: 0.3 }
}
```

Temperature is kept low (0.3) — Julia should be precise, not creative. Industrial support is not the place for improvisation.

LLM returns a response.

**3g. Confidence Scoring**

The system now evaluates confidence. This is not the LLM scoring itself — that's unreliable. The system uses the retrieval metrics:

```
confidence_score = weighted average of:
  - Top article similarity score (weight: 0.5)
  - Number of articles above 0.3 threshold (weight: 0.2)
  - Query length and specificity heuristic (weight: 0.1)
  - Conversation turn count — more turns = harder problem (weight: 0.2)
```

If `confidence_score >= project.confidence_threshold`:
- Julia responds with the answer. No caveat.
- Asks: "Did this resolve your issue?"

If `confidence_score < project.confidence_threshold`:
- Julia responds with whatever she has, but appends: "I'm not fully confident in this answer. Would you like me to connect you with our support team?"
- Both options presented: "Yes, this helped" / "Connect me with support"

**3h. Response Delivery**

Response is sent back to the widget. The session log is updated:

```
Session Log Entry:
- message_index: 3
- role: assistant
- content: Julia's response
- confidence_score: 0.72
- articles_used: [article_id_1, article_id_3]
- similarity_scores: [0.81, 0.64]
- timestamp: ...
- llm_latency_ms: 1200
```

---

**Step 4: Multi-Turn Conversation**

Client responds again — maybe a follow-up question, or clarification.

The same pipeline runs again (Steps 3a–3h), but now the conversation history includes previous turns. The LLM has context of what was already discussed.

Julia can handle 2–5 turns of back-and-forth before the conversation typically either resolves or escalates. The system doesn't hard-limit turns, but after 5 turns without resolution, Julia proactively suggests: "This seems complex. Would you like me to connect you with our support team?"

---

**Step 5: Layer 3 — Escalation Trigger**

Covered in Flow 6.4 earlier. Client agrees to escalate → AMC check → contact validation → ticket creation.

One addition here: the entire session transcript (all turns, including Julia's confidence scores and articles used) is serialized and attached to the ticket. When SE1 opens the ticket, they see exactly what Julia tried, what she found, and where she fell short. This prevents SE1 from repeating Julia's steps.

---

### Julia's Knowledge Lifecycle

How Julia gets smarter over time:

1. **Day 1:** PM adds initial KB articles. Julia knows very little.
2. **Month 1:** Tickets are resolved. PM creates KB articles from resolution notes (Flow 5.3). Julia's coverage grows.
3. **Month 3:** SE3s contribute draft articles from their resolved tickets. PM publishes them. Julia covers more edge cases.
4. **Month 6:** PM reviews session logs, identifies query patterns where Julia fails. Writes targeted articles for those gaps. Julia's Layer 2 resolution rate improves.
5. **Ongoing:** Every resolved ticket is a potential KB article. The system makes it easy (one-click article creation from ticket). The more tickets are resolved, the smarter Julia gets.

Julia never learns automatically from tickets. There is no automatic ingestion. Every piece of knowledge is human-reviewed and published deliberately. This prevents garbage from entering the KB.

---

### Julia's Limitations — By Design

- She cannot access the internet
- She cannot remember previous sessions (no cross-session memory)
- She cannot access ticket data (she doesn't know what's been escalated before)
- She cannot modify her own configuration or rulebooks
- She cannot answer questions outside her project's KB scope
- She will not guess when she doesn't know

These are features, not bugs. In industrial automation, a wrong answer from Julia could mean someone misconfigures a PLC or ignores a real fault. Conservative behavior is the right behavior.

---

### When KB Articles Are Embedded

Articles aren't embedded on every query. That would be wasteful.

Embeddings are generated:
- When an article is first published
- When an article is edited and re-published
- Stored in the `kb_article_embeddings` table (or an embedding column on `kb_articles` if using pgvector directly)

On query time, only the similarity search runs — comparing the query embedding against pre-computed article embeddings. This is fast (milliseconds for hundreds of articles).

If the KB grows to thousands of articles per project, pgvector handles it fine with an IVFFlat or HNSW index.

---

That completes Phase 1. Everything the system does, how it does it, who does it, and what Julia's brain looks like — all defined.

---

---

# Phase 2 — System Architecture

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT SIDE                          │
│                                                         │
│   ┌──────────────┐         ┌──────────────────────┐     │
│   │ Client's App │         │  Client's Email      │     │
│   │ (has widget) │         │  (Gmail/Outlook/etc) │     │
│   └──────┬───────┘         └──────────┬───────────┘     │
│          │                            │                 │
│   ┌──────▼───────┐                    │                 │
│   │ Widget       │                    │                 │
│   │ (iframe)     │                    │                 │
│   └──────┬───────┘                    │                 │
└──────────┼────────────────────────────┼─────────────────┘
           │ HTTPS                      │ SMTP/Webhook
           │                            │
┌──────────┼────────────────────────────┼─────────────────┐
│          │          YOUR SERVER                          │
│          │                            │                 │
│   ┌──────▼───────────────────────┐    │                 │
│   │        NGINX / Reverse Proxy │    │                 │
│   │   (SSL termination, routing) │    │                 │
│   └──────┬──────────┬────────────┘    │                 │
│          │          │                 │                 │
│   ┌──────▼──────┐  ┌▼─────────────┐  │                 │
│   │  Frontend   │  │  Backend API  │◄─┘                 │
│   │  (React)    │  │  (FastAPI)    │                    │
│   │  Static     │  │              │                    │
│   │  Files      │  │  ┌──────────┐│                    │
│   └─────────────┘  │  │ Auth     ││                    │
│                    │  │ Module   ││                    │
│                    │  ├──────────┤│                    │
│                    │  │ Widget   ││                    │
│                    │  │ API      ││     ┌────────────┐ │
│                    │  ├──────────┤│     │            │ │
│                    │  │ Ticket   ││◄───►│ PostgreSQL │ │
│                    │  │ API      ││     │ + pgvector │ │
│                    │  ├──────────┤│     │            │ │
│                    │  │ Client   ││     └────────────┘ │
│                    │  │ API      ││                    │
│                    │  ├──────────┤│     ┌────────────┐ │
│                    │  │ KB API   ││◄───►│   Redis    │ │
│                    │  ├──────────┤│     │ (sessions, │ │
│                    │  │ Report   ││     │  cache)    │ │
│                    │  │ API      ││     └────────────┘ │
│                    │  ├──────────┤│                    │
│                    │  │ Julia    ││     ┌────────────┐ │
│                    │  │ Pipeline ││◄───►│  Ollama    │ │
│                    │  │          ││     │  (LLM)     │ │
│                    │  └──────────┘│     └────────────┘ │
│                    │              │                    │
│                    │  ┌──────────┐│     ┌────────────┐ │
│                    │  │ Email    ││◄───►│  Resend /  │ │
│                    │  │ Service  ││     │  SES       │ │
│                    │  └──────────┘│     └────────────┘ │
│                    │              │                    │
│                    │  ┌──────────┐│     ┌────────────┐ │
│                    │  │ File     ││◄───►│  R2 /      │ │
│                    │  │ Service  ││     │  Wasabi    │ │
│                    │  └──────────┘│     └────────────┘ │
│                    └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

---

### 1. Nginx / Reverse Proxy

Single entry point. Handles:
- SSL termination (HTTPS)
- Routes `/api/*` → Backend API
- Routes `/widget/*` → Widget static files
- Routes everything else → Frontend static files
- Rate limiting on widget endpoints (prevent abuse)

---

### 2. Frontend (React)

The internal web application. Used by SE1, SE2, SE3, PM, Director.

Served as static files. Talks to the Backend API via REST. Authenticated via JWT stored in httpOnly cookie.

Routes map to modules:
- `/login` → Auth
- `/dashboard` → Role-appropriate dashboard
- `/clients` → Client management
- `/clients/:id` → Client detail (contacts, consignees, projects, AMCs)
- `/projects` → Project list
- `/projects/:id` → Project detail (settings, Julia config, KB, widget)
- `/tickets` → Ticket queue
- `/tickets/:id` → Ticket detail (thread, notes, escalation)
- `/kb` → Knowledge base
- `/kb/:project_id` → Project KB articles
- `/amcs` → AMC list and tracker
- `/reports` → Reports and analytics
- `/users` → User management (PM/Director only)
- `/settings` → Email templates, canned responses

---

### 3. Widget (React — Separate Build)

Completely separate from the main frontend. Separate build, separate bundle, separate deployment path.

Loaded via iframe. The parent page (client's app) includes:
```html
<script src="https://support.yourdomain.com/widget.js?token=TOKEN"></script>
```

`widget.js` is a tiny loader (~5KB) that creates an iframe pointing to:
```
https://support.yourdomain.com/widget/?token=TOKEN
```

Inside the iframe, the full widget React app runs. It communicates with the Backend API using the token for authentication. CORS is not an issue because the iframe runs on your domain.

The widget never touches the parent page's DOM. It's fully sandboxed.

---

### 4. Backend API (FastAPI)

The brain. Everything flows through here. Organized into routers (one per module):

```
/api/auth/          → login, logout, refresh token, password reset
/api/users/         → CRUD users
/api/clients/       → CRUD clients
/api/contacts/      → CRUD contact persons
/api/consignees/    → CRUD consignees
/api/projects/      → CRUD projects, widget settings
/api/amcs/          → CRUD AMCs, link projects
/api/kb/            → CRUD articles, search, embed
/api/julia/         → config, rulebooks, session logs
/api/tickets/       → CRUD tickets, thread, escalation, merge
/api/notifications/ → in-app notification list, mark read
/api/reports/       → aggregated data for dashboards
/api/widget/        → session init, FAQ, message, escalate (widget-facing)
/api/email/         → inbound webhook (email replies)
/api/files/         → upload, download
```

---

### 5. PostgreSQL + pgvector

Single database. All tables. Plus pgvector extension for KB article embeddings.

Connection pooling via `asyncpg` (FastAPI is async-native). Connection pool size: 10–20 for MVP.

---

### 6. Redis

Used for:
- Widget session storage (conversation history, expires after 30 minutes of inactivity)
- JWT token blacklist (for logout)
- Rate limiting counters
- Caching frequently accessed data (FAQ lists, Julia configs — invalidated on update)

Not used for: persistent data. Everything permanent lives in PostgreSQL.

---

### 7. Ollama

Runs as a separate process on the same server (or a dedicated GPU box). Exposes a local REST API on port 11434.

Backend calls Ollama for:
- LLM inference (chat completions)
- Embedding generation (if using Ollama's embedding models)

Alternatively, embedding generation can use a separate lightweight model loaded directly via Python (sentence-transformers library) to avoid Ollama overhead for embeddings.

---

### 8. Email Service (Resend / SES)

Two directions:

**Outbound:** Backend constructs emails using templates, sends via Resend/SES API. Each email includes a unique reply-to address or header that encodes the ticket ID.

**Inbound:** When a client replies to a ticket email, the email service receives it and fires a webhook to:
```
POST /api/email/inbound
```
Backend parses the webhook payload, extracts ticket ID from headers/reply-to address, matches sender email to contact, and appends the reply to the ticket thread.

---

### 9. File Storage (R2 / Wasabi)

Stores: ticket attachments, AMC contract PDFs, KB document uploads.

Backend handles uploads:
1. Frontend/widget sends file to Backend API
2. Backend uploads to R2/Wasabi, gets back a URL/key
3. Backend stores the URL/key in the database (in the relevant table — ticket_attachments, amc.document_url, etc.)
4. Frontend requests files through Backend (which generates a signed URL), not directly from storage

Files are never publicly accessible. Every download goes through the Backend which checks permissions.

---

## Authentication Architecture

---

### Internal Users (Web App)

**Method:** JWT (JSON Web Tokens)

Flow:
1. User logs in with email + password
2. Backend validates credentials against hashed password in database
3. Backend issues two tokens:
   - **Access token** — short-lived (15 minutes), contains user ID, role, permissions
   - **Refresh token** — long-lived (7 days), stored in httpOnly cookie
4. Access token is sent in Authorization header on every API request
5. When access token expires, frontend silently calls `/api/auth/refresh` with the refresh token cookie
6. On logout, refresh token is added to Redis blacklist

Every API endpoint checks:
- Is the access token valid and not expired?
- Does the user's role have permission for this action? (checked against permission matrix)

---

### Widget (External)

**Method:** Project Widget Token

No user login. The widget authenticates with the project token embedded in the script URL.

Flow:
1. Widget sends token in header: `X-Widget-Token: <token>`
2. Backend validates token against the `projects` table
3. Backend checks: is the widget enabled for this project? Is the project active? Is the client active?
4. If valid → session is created, widget proceeds
5. Token grants access only to widget endpoints (`/api/widget/*`) — nothing else

The token is not a secret (it's visible in the page source). It only grants chatbot access — no data access, no ticket reading, no admin functions. Rate limiting prevents abuse.

---

### Inbound Email Webhook

**Method:** Webhook signature verification

Email services (Resend, SES) sign their webhook payloads. Backend verifies the signature before processing. This prevents spoofed emails from injecting content into tickets.

---

## Data Flow Diagrams

---

### Flow A: Widget Query → Julia Response

```
Client Browser
    │
    ▼
Widget (iframe)
    │
    │ POST /api/widget/message
    │ { session_id, message }
    ▼
Backend API
    │
    ├──► Redis: fetch session history
    │
    ├──► Rulebook check (DB query)
    │    │
    │    ├─ Rule matches → return canned action, skip LLM
    │    │
    │    └─ No match → continue
    │
    ├──► Embedding model: embed query → vector
    │
    ├──► pgvector: similarity search against project KB
    │    │
    │    └─ Returns top 5 articles + similarity scores
    │
    ├──► Check: any article above minimum threshold (0.3)?
    │    │
    │    ├─ No → return fallback message, offer escalation
    │    │
    │    └─ Yes → continue
    │
    ├──► Construct prompt (system + rules + context + history + query)
    │
    ├──► Ollama: send prompt, receive response
    │
    ├──► Calculate confidence score
    │
    ├──► Redis: update session history
    │
    ├──► PostgreSQL: log session entry
    │
    └──► Return response + confidence flag to widget
```

---

### Flow B: Ticket Creation → Email Communication

```
Widget (escalation trigger)
    │
    │ POST /api/widget/escalate
    │ { session_id, client_email, description }
    ▼
Backend API
    │
    ├──► Validate client email against contacts table
    │
    ├──► Check AMC status for this project
    │    │
    │    ├─ Expired → return renewal message, notify PM, stop
    │    │
    │    └─ Active → continue
    │
    ├──► Create ticket in database
    │    (status: New, assigned: SE1, level: SE1)
    │
    ├──► Attach Julia transcript to ticket
    │
    ├──► Resend/SES: send confirmation email to client
    │
    ├──► Redis: push notification for SE1
    │
    └──► Return ticket number to widget


SE1 replies to ticket:
    │
    │ POST /api/tickets/:id/reply
    │ { content, attachments }
    ▼
Backend API
    │
    ├──► Save reply to ticket_messages table
    │
    ├──► Resend/SES: send reply email to client
    │    (includes ticket reference in subject + reply-to header)
    │
    └──► Done


Client replies via email:
    │
    │ Email → Resend/SES → Webhook
    │
    │ POST /api/email/inbound
    │ { from, subject, body, attachments, headers }
    ▼
Backend API
    │
    ├──► Verify webhook signature
    │
    ├──► Extract ticket ID from subject/headers
    │
    ├──► Match sender email to contacts table
    │
    ├──► Save reply to ticket_messages table
    │
    ├──► Upload attachments to R2 → save URLs
    │
    ├──► Update ticket status (Pending Client → In Progress)
    │
    ├──► Redis: push notification for assigned SE
    │
    └──► Done
```

---

### Flow C: Escalation Chain

```
SE1 escalates to SE2:
    │
    │ POST /api/tickets/:id/escalate
    │ { target_level: "SE2", target_user_id, note }
    ▼
Backend API
    │
    ├──► Validate: current level is SE1, user has SE1 role
    │
    ├──► Update ticket: level → SE2, assigned → target SE2
    │
    ├──► Save escalation note as internal message
    │
    ├──► Save to escalation_history table
    │
    ├──► Resend/SES: email client about escalation
    │
    ├──► Redis: push notification for SE2
    │
    └──► Done


SE2 escalates to SE3:
    │
    │ Same flow, but:
    │ - Validates current level is SE2
    │ - Target must be SE3 assigned to this project
    │ - Updates level → SE3
    │
    └──► Done
```

---

## API Design — Full Endpoint List

---

### Auth

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/auth/login` | Login, returns tokens | Public |
| POST | `/api/auth/logout` | Invalidates refresh token | Authenticated |
| POST | `/api/auth/refresh` | Refreshes access token | Has valid refresh token |
| POST | `/api/auth/password-reset` | Sends reset email | Public |
| POST | `/api/auth/password-reset/confirm` | Sets new password | Has valid reset token |
| PUT | `/api/auth/change-password` | Changes password (logged in) | Authenticated |

---

### Users

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/users` | List all users | PM, Director |
| GET | `/api/users/:id` | Get user detail | PM, Director, Self |
| POST | `/api/users` | Create user | PM, Director |
| PUT | `/api/users/:id` | Update user | PM, Director |
| PATCH | `/api/users/:id/status` | Activate/deactivate | PM, Director |

---

### Clients

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/clients` | List all clients | All (SE3 filtered) |
| GET | `/api/clients/:id` | Client detail | All (SE3 filtered) |
| POST | `/api/clients` | Create client | PM |
| PUT | `/api/clients/:id` | Update client | PM |
| PATCH | `/api/clients/:id/status` | Activate/deactivate | PM |

---

### Contacts

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/clients/:id/contacts` | List contacts for client | All |
| POST | `/api/clients/:id/contacts` | Add contact | PM |
| PUT | `/api/contacts/:id` | Update contact | PM |
| DELETE | `/api/contacts/:id` | Remove contact | PM |

---

### Consignees

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/clients/:id/consignees` | List consignees | All |
| POST | `/api/clients/:id/consignees` | Add consignee | PM |
| PUT | `/api/consignees/:id` | Update consignee | PM |
| DELETE | `/api/consignees/:id` | Remove consignee | PM |

---

### Projects

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/projects` | List projects | All (SE3 filtered) |
| GET | `/api/projects/:id` | Project detail | All (SE3 filtered) |
| POST | `/api/projects` | Create project | PM |
| PUT | `/api/projects/:id` | Update project | PM |
| PATCH | `/api/projects/:id/status` | Activate/deactivate | PM |
| PATCH | `/api/projects/:id/widget` | Toggle widget on/off | PM |
| GET | `/api/projects/:id/widget-token` | Get widget embed snippet | PM |

---

### AMCs

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/amcs` | List all AMCs | All |
| GET | `/api/amcs/:id` | AMC detail | All |
| POST | `/api/amcs` | Create AMC | PM |
| PUT | `/api/amcs/:id` | Update AMC | PM |
| POST | `/api/amcs/:id/projects` | Link projects to AMC | PM |
| DELETE | `/api/amcs/:id/projects/:pid` | Unlink project from AMC | PM |
| GET | `/api/amcs/expiring` | List AMCs expiring within N days | PM, Director |

---

### Knowledge Base

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/kb/projects/:id/articles` | List articles for project | All |
| GET | `/api/kb/articles/:id` | Article detail | All |
| POST | `/api/kb/projects/:id/articles` | Create article | PM, SE3 (draft only) |
| PUT | `/api/kb/articles/:id` | Update article | PM |
| PATCH | `/api/kb/articles/:id/status` | Publish/archive | PM |
| POST | `/api/kb/articles/:id/embed` | Re-generate embedding | PM (system also auto-triggers) |
| GET | `/api/kb/search` | Search across articles | All |

---

### Julia Configuration

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/julia/projects/:id/config` | Get Julia config for project | PM, Director |
| PUT | `/api/julia/projects/:id/config` | Update Julia config | PM |
| GET | `/api/julia/projects/:id/rulebooks` | List rulebook entries | PM, Director |
| POST | `/api/julia/projects/:id/rulebooks` | Add rulebook entry | PM |
| PUT | `/api/julia/rulebooks/:id` | Update rulebook entry | PM |
| DELETE | `/api/julia/rulebooks/:id` | Delete rulebook entry | PM |
| GET | `/api/julia/projects/:id/sessions` | List widget sessions | PM, Director |
| GET | `/api/julia/sessions/:id` | Session detail with transcript | PM, Director |

---

### Tickets

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/tickets` | List tickets (filtered by role) | All |
| GET | `/api/tickets/:id` | Ticket detail with thread | All |
| POST | `/api/tickets` | Create ticket manually | SE1, SE2, SE3, PM |
| PUT | `/api/tickets/:id` | Update ticket (priority, etc.) | SE1, SE2, PM |
| POST | `/api/tickets/:id/reply` | Reply to client | SE1, SE2, SE3, PM |
| POST | `/api/tickets/:id/note` | Add internal note | SE1, SE2, SE3, PM |
| POST | `/api/tickets/:id/call-log` | Log a phone call | SE1, SE2, SE3, PM |
| POST | `/api/tickets/:id/escalate` | Escalate ticket | SE1 (→SE2), SE2 (→SE3), PM (any) |
| PATCH | `/api/tickets/:id/status` | Change status (resolve, close, reopen) | Assigned SE, PM |
| POST | `/api/tickets/:id/merge` | Merge into another ticket | SE1, PM |
| PATCH | `/api/tickets/:id/assign` | Reassign ticket | PM |
| POST | `/api/tickets/:id/feedback` | Submit client feedback | Via email link (public token) |
| GET | `/api/tickets/:id/attachments` | List attachments | All |
| POST | `/api/tickets/:id/attachments` | Upload attachment | SE1, SE2, SE3, PM |

---

### Widget (Client-Facing)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/widget/session` | Initialize widget session | Widget token |
| POST | `/api/widget/faq` | Fetch FAQ article | Widget token + session |
| POST | `/api/widget/message` | Send message to Julia | Widget token + session |
| POST | `/api/widget/escalate` | Create ticket from widget | Widget token + session |

---

### Email Webhook

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/email/inbound` | Receive inbound email reply | Webhook signature verified |

---

### Files

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/files/upload` | Upload file | Authenticated |
| GET | `/api/files/:id` | Get signed download URL | Authenticated (permission checked) |

---

### Notifications

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/notifications` | List user's notifications | Authenticated |
| PATCH | `/api/notifications/:id/read` | Mark as read | Authenticated |
| PATCH | `/api/notifications/read-all` | Mark all as read | Authenticated |

---

### Reports

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/reports/ticket-summary` | Ticket summary (with filters) | PM, Director |
| GET | `/api/reports/layer-resolution` | Layer resolution stats | PM, Director |
| GET | `/api/reports/engineer-workload` | Per-engineer workload | PM, Director |
| GET | `/api/reports/amc-tracker` | AMC status overview | PM, Director |
| GET | `/api/reports/julia-performance` | Julia resolution rates by project | PM, Director |

---

That completes Phase 2 — System Architecture, component design, authentication, data flows, and full API specification.

**Next up: Phase 3 (Tech Stack confirmation) and Phase 4 (Final Database Schema).** These two are relatively quick now that the architecture is locked. Want to continue?
# ATC Support

A full-stack IT support management platform built for **Aarkay Techno Consultants Pvt. Ltd.** — managing clients, projects, hardware assets, support tickets, and AI-assisted troubleshooting from a single system.

---

## Features

- **Julia AI Assistant** — LLM-powered chatbot (Groq / Llama 3.1) for guided troubleshooting using project docs, runbooks, and support topics
- **Ticket Lifecycle** — Creation → Assignment → Escalation → Resolution → Reopen with full audit trail
- **Multi-Type Support** — Software, Hardware, and General support flows with client/hardware scoping
- **Embeddable Chat Widget** — Single `<script>` tag deploys Julia on any client website
- **Email Integration** — Outbound notifications and inbound reply threading with auto status transitions
- **Hardware Asset Tracking** — Brand/model catalog, per-client asset registry, AMC linkage
- **Knowledge Base** — Support topics (FAQ, SOP, Playbook, Vendor Link) with hierarchical scoping
- **Agent Console** — Dashboard, queue management, client/project/hardware CRM, and reporting
- **Role-Based Access** — PM and SE roles with support level, scope mode, and assignment authority controls

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js · Express · TypeScript · Prisma · PostgreSQL · Zod |
| **Frontend** | React 19 · Vite · Tailwind CSS 4 · React Router 7 · Recharts |
| **AI** | Groq SDK → Llama 3.1 8B Instant |
| **Email** | Nodemailer (SMTP) |
| **Infrastructure** | IIS (frontend) · NSSM Windows Service (backend) |

---

## Project Structure

```
ATC_Support/
├── ATC_Support_Backend/        # Node.js REST API
│   ├── prisma/                 # Schema, migrations, seed
│   ├── src/
│   │   ├── config/             # Validated environment config
│   │   ├── middleware/         # Auth, role, validation, logging
│   │   ├── routes/             # 24 route modules
│   │   ├── services/           # Julia AI, mailer, notifications, ticket emails
│   │   └── utils/              # Access control, serializers, pagination
│   └── dist/                   # Compiled output
│
├── ATC_Support_Frontend/       # React SPA
│   ├── src/
│   │   ├── components/         # Widget, entities, layout
│   │   ├── contexts/           # Auth, modal, toast providers
│   │   ├── layouts/            # Agent, client, section layouts
│   │   ├── lib/                # API client, types, navigation
│   │   └── pages/              # Agent, auth, client, settings
│   └── dist/                   # Production build
│
└── Docs/                       # Technical documentation & SOP
```

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **PostgreSQL** running on port 5432

### Backend

```bash
cd ATC_Support_Backend
npm install
cp .env.example .env            # Edit with your database credentials and JWT secret
npx prisma generate
npx prisma migrate dev
npm run dev                     # Starts on http://localhost:3001
```

### Frontend

```bash
cd ATC_Support_Frontend
npm install
cp .env.example .env            # Set VITE_API_BASE_URL and VITE_WIDGET_KEY
npm run dev                     # Starts on http://localhost:3000
```

### Verify

- Backend health: `http://localhost:3001/health` → `{"status":"ok"}`
- Frontend: `http://localhost:3000` → ATC Support landing page

---

## Environment Variables

### Backend (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | ≥16 char secret for JWT signing |
| `PORT` | No | `3001` | HTTP port |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed origins (comma-separated or `*`) |
| `GROQ_API_KEY` | No | `""` | Groq API key for Julia AI |
| `GROQ_MODEL` | No | `llama-3.1-8b-instant` | LLM model |
| `SMTP_HOST` | No | `""` | SMTP server (empty = log-only mode) |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | `""` | SMTP username |
| `SMTP_PASS` | No | `""` | SMTP password |
| `MAIL_FROM_EMAIL` | No | `support@localhost` | Sender email |
| `MAIL_FROM_NAME` | No | `ATC Support` | Sender display name |

### Frontend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | **Yes** | Backend API URL (e.g., `http://localhost:3001/api`) |
| `VITE_WIDGET_KEY` | **Yes** | Widget key (`general` or a project's `widgetKey`) |

---

## Deployment

The production server (`192.168.10.12`) runs:

| Component | Port | Managed By |
|-----------|------|-----------|
| Backend API | 3001 | NSSM Windows Service |
| Frontend SPA | 4206 | IIS |
| PostgreSQL | 5432 | Windows Service |

```bash
# Pull latest
git pull origin main

# Backend
cd ATC_Support_Backend
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
nssm restart ATC-Support-Backend

# Frontend
cd ../ATC_Support_Frontend
npm install && npm run build
# Copy dist/* → C:\inetpub\ATC_Support_Frontend\ (preserve web.config)
```

See [Docs/ATC_Support_SOP.md](Docs/ATC_Support_SOP.md) for the full step-by-step deployment procedure.

---

## Widget Embed

Deploy Julia AI on any client website with a single script tag:

```html
<script src="http://192.168.10.12:4206/widget.js" data-widget-key="widget_your_key" defer></script>
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Technical Documentation](Docs/ATC_Support_Technical_Documentation.md) | Architecture, database schema, API reference, auth flow, Julia AI internals |
| [Standard Operating Procedures](Docs/ATC_Support_SOP.md) | Setup, deployment, operations, troubleshooting, checklists |

---

## License

Proprietary — Aarkay Techno Consultants Pvt. Ltd. Internal use only.

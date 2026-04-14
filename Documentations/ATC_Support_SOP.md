# ATC Support Platform — Standard Operating Procedures

**Version:** 2.0  
**Last Updated:** April 14, 2026  
**Prepared by:** Engineering Team — Aarkay Techno Consultants Pvt. Ltd.  
**Classification:** Internal Use Only

---

## Table of Contents

1. [New Developer Onboarding](#1-new-developer-onboarding)
2. [Local Development Setup](#2-local-development-setup)
3. [Production Deployment](#3-production-deployment)
4. [Server Infrastructure Reference](#4-server-infrastructure-reference)
5. [Database Operations](#5-database-operations)
6. [Application Management](#6-application-management)
7. [Common Operational Workflows](#7-common-operational-workflows)
8. [Troubleshooting Playbook](#8-troubleshooting-playbook)
9. [Quick Reference Checklists](#9-quick-reference-checklists)

---

## 1. New Developer Onboarding

### 1.1 What You Need Before Starting

| Requirement | Details |
|------------|---------|
| **Git** | Access to the `ATC_Support` repository |
| **Node.js** | Version 20 or later (`node --version` to check) |
| **PostgreSQL** | Local instance or access to the development database |
| **Code Editor** | VS Code recommended with TypeScript + Tailwind extensions |
| **Server Access** | RDP access to `192.168.10.12` (production server) for deployment |

### 1.2 Understanding the Codebase

The project consists of **two separate applications** in one repository:

```
ATC_Support/
├── ATC_Support_Backend/     ← Node.js + Express + Prisma (REST API)
└── ATC_Support_Frontend/    ← React + Vite + Tailwind (SPA)
```

- **Backend** runs on port `3001`, serves the REST API
- **Frontend** runs on port `3000` (dev) or `4206` (production via IIS)
- They communicate via HTTP — the frontend calls the backend API

### 1.3 Key Files to Read First

| File | What It Tells You |
|------|------------------|
| `ATC_Support_Backend/prisma/schema.prisma` | The entire database structure — all tables, fields, relationships, and enums |
| `ATC_Support_Backend/src/index.ts` | All API routes registered and how middleware is layered |
| `ATC_Support_Frontend/src/App.tsx` | All frontend page routes and how navigation works |
| `ATC_Support_Frontend/src/lib/api.ts` | How the frontend communicates with the backend (auth, token refresh) |
| `ATC_Support_Backend/src/services/julia.ts` | How Julia AI works (LLM prompting, context ranking) |

---

## 2. Local Development Setup

### 2.1 Step-by-Step: Backend

Open a terminal and run each command in sequence:

```powershell
# 1. Navigate to the backend directory
cd C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend

# 2. Install all Node.js dependencies
npm install

# 3. Create your local environment file
#    Copy the example and fill in your values:
copy .env.example .env
```

Now **edit the `.env` file** with a text editor. You must set at minimum:

```ini
PORT=3001
CORS_ORIGIN=http://localhost:3000
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/atc_support_backend?schema=public"
JWT_SECRET="pick-a-random-string-at-least-16-chars-long"
GROQ_API_KEY=""
GROQ_MODEL="llama-3.1-8b-instant"
```

> **Note on GROQ_API_KEY**: Leave empty for now if you don't have a Groq account. Julia AI will simply return fallback messages instead of LLM responses. Get a free key at https://console.groq.com.

Continue in the terminal:

```powershell
# 4. Generate the Prisma Client (creates TypeScript types from your schema)
npx prisma generate

# 5. Create all database tables by running migrations
npx prisma migrate dev

# 6. (Optional) Seed the database with demo data
npm run prisma:seed

# 7. Start the development server (auto-reloads on file changes)
npm run dev
```

You should see:
```
ATC Support backend listening on port 3001
```

**Verify it works:**
- Open a browser and go to `http://localhost:3001/health`
- You should see: `{"status":"ok"}`

### 2.2 Step-by-Step: Frontend

Open a **second terminal** (keep the backend running):

```powershell
# 1. Navigate to the frontend directory
cd C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Frontend

# 2. Install all Node.js dependencies
npm install

# 3. Create your local environment file
#    For local development, create a .env file:
```

Create a file named `.env` in the frontend directory with:

```ini
VITE_API_BASE_URL="http://localhost:3001/api"
VITE_WIDGET_KEY="general"
```

Continue:

```powershell
# 4. Start the development server
npm run dev
```

You should see:
```
VITE v6.x.x  ready in XXXms

➜  Local:   http://localhost:3000/
```

**Open `http://localhost:3000`** in your browser. You should see the ATC General Support page.

### 2.3 Logging In as an Agent

If you ran the database seeder (`npm run prisma:seed`), demo accounts are available. Otherwise, you need to create a user manually:

```powershell
# Open Prisma Studio (visual database editor)
cd C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend
npx prisma studio
```

This opens a browser-based database editor at `http://localhost:5555`. You can inspect tables and add records.

To create a user via code, you need to hash a password:

```powershell
# In the backend directory, open a Node REPL
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourPassword123', 10).then(h => console.log(h))"
```

Copy the hash and insert a User record in Prisma Studio with:
- `name`: Your Name
- `email`: your@email.com
- `passwordHash`: The hash from above
- `role`: PM (or SE)
- `status`: ACTIVE

Then go to `http://localhost:3000/login` and sign in with your email and password.

### 2.4 Common Development Commands

| Command | Where | What It Does |
|---------|-------|-------------|
| `npm run dev` | Backend | Start dev server with auto-reload (tsx watch) |
| `npm run dev` | Frontend | Start Vite dev server with HMR on port 3000 |
| `npm run build` | Backend | Compile TypeScript to `dist/` |
| `npm run build` | Frontend | Build production bundle to `dist/` |
| `npx prisma generate` | Backend | Regenerate Prisma Client after schema changes |
| `npx prisma migrate dev` | Backend | Create + apply new migration for schema changes |
| `npx prisma migrate deploy` | Backend | Apply pending migrations (production-safe) |
| `npx prisma studio` | Backend | Open visual database browser |
| `npm run prisma:seed` | Backend | Seed database with demo data |
| `npm run typecheck` | Backend | Run TypeScript type checking without emitting |
| `npm run lint` | Frontend | Run TypeScript type checking |
| `npm run test` | Backend | Run integration tests |

### 2.5 Making Database Schema Changes

When you need to add/modify tables or fields:

1. **Edit** `prisma/schema.prisma`
2. **Run** `npx prisma migrate dev --name descriptive_name`
   - This creates a SQL migration file in `prisma/migrations/`
   - It applies the migration to your local database
   - It regenerates the Prisma Client
3. **Commit** the migration file along with the schema change
4. On deployment, run `npx prisma migrate deploy` (see §3)

---

## 3. Production Deployment

### 3.1 Production Server Details

| Item | Value |
|------|-------|
| **Server IP** | `192.168.10.12` |
| **OS** | Windows Server |
| **Project Location** | `C:\Users\Admin\Desktop\ATC_Support\` |
| **Backend Port** | `3001` |
| **Frontend Port** | `4206` |
| **Backend Service** | `ATC-Support-Backend` (NSSM Windows Service) |
| **Frontend Hosting** | IIS Site `ATC_Support` |
| **IIS Physical Path** | `C:\inetpub\ATC_Support_Frontend\` |
| **Database** | PostgreSQL on `localhost:5432`, database `atc_support_backend` |
| **Backend Logs** | `ATC_Support_Backend\logs\stdout.log` and `stderr.log` |

### 3.2 Full Deployment Procedure

> ⚠️ **IMPORTANT**: Follow every step in order. Skipping steps (especially database migrations) will cause runtime errors.

#### Step 1 — Pull the Latest Code

```powershell
cd C:\Users\Admin\Desktop\ATC_Support
git pull origin main
```

If there are merge conflicts, resolve them before proceeding. Search for conflict markers:
```powershell
git diff --check
```

#### Step 2 — Install Backend Dependencies

```powershell
cd ATC_Support_Backend
npm install
```

> Only needed if `package.json` has changed. Safe to run every time — it's a no-op if nothing changed.

#### Step 3 — Generate Prisma Client

```powershell
npx prisma generate
```

This ensures the Prisma Client matches the current schema. Always run this before building.

#### Step 4 — Apply Database Migrations

```powershell
npx prisma migrate deploy
```

**Check the output carefully.** You should see either:
- `All migrations have been successfully applied.` — Good, proceed.
- `Database schema is up to date!` — No new migrations, proceed.
- Any error — **STOP. Do not continue. Fix the migration issue first.**

> ⚠️ This is the most common source of deployment failures. If you skip this step and the code references new tables/columns, you'll get 500 Internal Server Errors.

#### Step 5 — Build the Backend

```powershell
npm run build
```

Expected output: TypeScript compiles with **zero errors**. The compiled output goes to `dist/`.

If there are errors:
- **Merge conflict markers** (`<<<<<<<`): You have unresolved git conflicts. Fix them.
- **Missing Prisma exports**: You didn't run `npx prisma generate`. Run it.
- **Type errors**: Fix the code before deploying.

#### Step 6 — Restart the Backend Service

```powershell
nssm restart ATC-Support-Backend
```

Expected output:
```
ATC-Support-Backend: STOP: The operation completed successfully.
ATC-Support-Backend: START: The operation completed successfully.
```

**Verify the service is running:**

```powershell
# Check service state
Get-CimInstance Win32_Service -Filter "Name='ATC-Support-Backend'" | Select-Object State

# Check for startup errors in the log
Get-Content ".\logs\stderr.log" -Tail 20

# Test the health endpoint
Invoke-WebRequest -Uri http://localhost:3001/health -UseBasicParsing
```

#### Step 7 — Install Frontend Dependencies

```powershell
cd ..\ATC_Support_Frontend
npm install
```

#### Step 8 — Build the Frontend

```powershell
npm run build
```

The production bundle is created in `dist/`. Vite hashes all JS/CSS files for cache busting.

#### Step 9 — Deploy Frontend to IIS

This is the critical step most people get wrong. The frontend is **not** served from the project directory. IIS serves it from `C:\inetpub\ATC_Support_Frontend\`.

```powershell
# Step 9a — Backup the IIS web.config (contains URL rewrite rules for SPA routing)
Copy-Item "C:\inetpub\ATC_Support_Frontend\web.config" "C:\inetpub\ATC_Support_Frontend\web.config.bak" -Force

# Step 9b — Remove old files from IIS directory
Remove-Item "C:\inetpub\ATC_Support_Frontend\assets" -Recurse -Force
Remove-Item "C:\inetpub\ATC_Support_Frontend\index.html" -Force
Remove-Item "C:\inetpub\ATC_Support_Frontend\widget.js" -Force -ErrorAction SilentlyContinue

# Step 9c — Copy new build output to IIS directory
Copy-Item -Path ".\dist\*" -Destination "C:\inetpub\ATC_Support_Frontend\" -Recurse -Force

# Step 9d — Restore the web.config
Move-Item "C:\inetpub\ATC_Support_Frontend\web.config.bak" "C:\inetpub\ATC_Support_Frontend\web.config" -Force
```

> **Why preserve web.config?** It contains IIS URL rewrite rules that route all non-file requests to `index.html`. Without it, refreshing any page other than `/` will return a 404.

#### Step 10 — Verify the Deployment

```powershell
# Check backend health
Invoke-WebRequest -Uri http://localhost:3001/health -UseBasicParsing

# Check frontend files are current
Get-ChildItem "C:\inetpub\ATC_Support_Frontend\index.html" | Select-Object LastWriteTime

# Check backend error log for any issues
Get-Content "C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend\logs\stderr.log" -Tail 10
```

Open `http://192.168.10.12:4206` in a browser and **hard refresh** (Ctrl+Shift+R) to confirm.

---

## 4. Server Infrastructure Reference

### 4.1 Backend Windows Service (NSSM)

The backend runs as a Windows Service managed by NSSM (Non-Sucking Service Manager):

| Property | Value |
|----------|-------|
| Service Name | `ATC-Support-Backend` |
| Application | `D:\Program Files\nodejs\node.exe` |
| AppDirectory | `C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend` |
| AppParameters | `C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend\dist\index.js` |
| Start Type | Automatic (starts with Windows) |
| Max Restarts | 10 |

**Common NSSM Commands:**

```powershell
# Check status
nssm status ATC-Support-Backend

# Stop the service
nssm stop ATC-Support-Backend

# Start the service
nssm start ATC-Support-Backend

# Restart (stop + start)
nssm restart ATC-Support-Backend

# View full configuration
nssm get ATC-Support-Backend Application
nssm get ATC-Support-Backend AppDirectory
nssm get ATC-Support-Backend AppParameters

# Edit configuration interactively
nssm edit ATC-Support-Backend
```

**To recreate the service from scratch** (e.g., on a fresh server):

```powershell
nssm install ATC-Support-Backend "D:\Program Files\nodejs\node.exe" "C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend\dist\index.js"
nssm set ATC-Support-Backend AppDirectory "C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend"
nssm set ATC-Support-Backend Start SERVICE_AUTO_START
nssm set ATC-Support-Backend AppStdout "C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend\logs\stdout.log"
nssm set ATC-Support-Backend AppStderr "C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend\logs\stderr.log"
nssm start ATC-Support-Backend
```

### 4.2 IIS Frontend Configuration

The IIS site `ATC_Support` serves the React SPA:

| Property | Value |
|----------|-------|
| Site Name | `ATC_Support` |
| Application Pool | `ATC_Support_Frontend` |
| Physical Path | `C:\inetpub\ATC_Support_Frontend\` |
| Binding | `http://192.168.10.12:4206` |

**The `web.config` file** in the IIS directory is critical:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReactRouterFallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

**What it does**: Routes all URLs that don't match a physical file to `index.html`, allowing React Router to handle client-side routing. Without this, navigating to `/agent/dashboard` directly would return a 404.

### 4.3 Port Reference

| Port | Process | Protocol | Description |
|------|---------|----------|-------------|
| `3001` | node.exe | HTTP | Backend REST API |
| `4206` | IIS (w3wp.exe) | HTTP | Frontend SPA |
| `5432` | PostgreSQL | TCP | Database |

**Check what's running on these ports:**
```powershell
netstat -ano | findstr ":3001 :4206 :5432"
```

---

## 5. Database Operations

### 5.1 Connection Details (Production)

```
Host:     localhost
Port:     5432
Database: atc_support_backend
Schema:   public
User:     atc_support_app
Password: (see .env file)
```

### 5.2 Checking Migration Status

```powershell
cd C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend
npx prisma migrate status
```

This shows:
- Total migrations found
- Which migrations have/haven't been applied
- If the schema is up to date

### 5.3 Applying Pending Migrations

```powershell
# Production-safe: only applies existing migration files, never creates new ones
npx prisma migrate deploy
```

### 5.4 Database Backup

```powershell
# Full backup
pg_dump -U atc_support_app -d atc_support_backend -F c -f "D:\Backups\atc_support_$(Get-Date -Format 'yyyyMMdd_HHmm').dump"

# Table-only backup (schema + data)
pg_dump -U atc_support_app -d atc_support_backend --format=plain > "D:\Backups\atc_support_$(Get-Date -Format 'yyyyMMdd').sql"
```

### 5.5 Database Restore

```powershell
# From custom-format dump
pg_restore -U atc_support_app -d atc_support_backend -c "D:\Backups\atc_support_20260414_1200.dump"

# From plain SQL
psql -U atc_support_app -d atc_support_backend -f "D:\Backups\atc_support_20260414.sql"
```

### 5.6 Inspecting the Database

```powershell
# Visual browser (development only)
npx prisma studio

# Command-line
psql -U atc_support_app -d atc_support_backend
```

Useful psql commands:
```sql
\dt                          -- List all tables
\d "Ticket"                  -- Describe a table
SELECT count(*) FROM "Ticket";  -- Count records
SELECT * FROM "User";        -- List all users
```

---

## 6. Application Management

### 6.1 Viewing Backend Logs

```powershell
# Latest errors (most useful)
Get-Content "C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend\logs\stderr.log" -Tail 30

# Latest general output
Get-Content "C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend\logs\stdout.log" -Tail 30

# Follow logs in real-time
Get-Content "C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend\logs\stderr.log" -Wait -Tail 5
```

The backend uses structured JSON logging. Each line is a JSON object with:
- `level`: `info`, `warn`, or `error`
- `msg`: Event type (e.g., `request.completed`, `request.failed`)
- `requestId`: Unique ID for tracing
- `method`, `path`, `status`, `durationMs`

### 6.2 Checking Service Health

```powershell
# Backend service status
Get-CimInstance Win32_Service -Filter "Name='ATC-Support-Backend'" | Select-Object Name, State, ProcessId

# IIS status
Get-Service -Name W3SVC | Select-Object Status, Name

# Health endpoint (should return 200)
Invoke-WebRequest -Uri http://localhost:3001/health -UseBasicParsing | Select-Object StatusCode
```

### 6.3 Managing the Frontend Widget Key

The `VITE_WIDGET_KEY` in `.env.production` controls what the default landing page shows:

| Value | Landing Page |
|-------|-------------|
| `general` | ATC General Support page (multi-type: Software, Hardware, General) |
| `widget_warehouse_portal` | Warehouse Portal project-specific support center |
| `widget_<any_project_key>` | That project's specific support center |

**To change the default landing:**
1. Edit `ATC_Support_Frontend\.env.production`
2. Change `VITE_WIDGET_KEY="general"` to your desired key
3. Rebuild: `npm run build`
4. Redeploy to IIS (see §3.2, Steps 9-10)

---

## 7. Common Operational Workflows

### 7.1 Adding a New Client and Project

1. Login to the agent console at `http://192.168.10.12:4206/login`
2. Navigate to `Clients` in the sidebar → Click **+ New Client**
3. Fill in: Company name, industry, address, phone, email
4. Save the client
5. Open the new client → **Projects** tab → **+ New Project**
6. Set the **Widget Key** — a unique identifier like `widget_clientname_project`
7. Enable the widget toggle if you want Julia AI accessible
8. Configure Julia AI:
   - **Greeting**: The first message Julia shows (e.g., "Hi! I'm Julia, ATC's support assistant for [Project].")
   - **Fallback Message**: Shown when Julia lacks context
   - **Escalation Hint**: Appended to the fallback to guide users to human support
9. Switch to the **Docs** tab → Add project documentation
   - Julia uses these docs for RAG (Retrieval-Augmented Generation)
   - Set status to **Published** for Julia to use them
10. Switch to the **FAQs** tab → Add frequently asked questions
    - These appear on the client-facing landing page
11. Assign a **Project Lead** (Support Engineer) who will handle escalated tickets

### 7.2 Deploying the Julia Widget on a Client Website

Add this single script tag to the client's website:

```html
<script
  src="http://192.168.10.12:4206/widget.js"
  data-widget-key="widget_your_project_key"
  defer
></script>
```

This injects a floating chat widget in the bottom-right corner of their website.

**To restrict access to specific domains** (recommended for production):
1. Go to the Project settings in the agent console
2. Add allowed domains to the `widgetAllowedDomains` list (e.g., `atcgroup.co.in`, `client-website.com`)
3. Requests from unlisted origins will be rejected

### 7.3 Creating a Support Engineer Account

As a PM:

1. Navigate to `http://192.168.10.12:4206/agent/account` → (or wherever user management is)
2. Use the Users API directly or Prisma Studio:

```powershell
# Generate a password hash
node -e "require('bcrypt').hash('TempPassword123', 10).then(h => console.log(h))"
```

3. Create the user record with:
   - `role`: `SE`
   - `supportLevel`: `SE1`, `SE2`, or `SE3`
   - `scopeMode`: `GLOBAL` (sees all tickets) or `PROJECT_SCOPED` (restricted)
   - `assignmentAuthority`: `SELF_ONLY` or `SELF_AND_OTHERS`
   - `status`: `ACTIVE`

4. If the SE is project-scoped, add them as a member to their assigned projects

### 7.4 Setting Up Email Integration

#### Outbound (Sending notifications to customers):

1. Edit the backend `.env` file:

```ini
MAIL_FROM_EMAIL=support@atcgroup.co.in
MAIL_FROM_NAME=ATC Support
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=support@atcgroup.co.in
SMTP_PASS=your-smtp-password
```

2. Restart the backend service: `nssm restart ATC-Support-Backend`
3. Test: Create a ticket through the widget with a real email — you should receive a confirmation

#### Inbound (Receiving customer email replies):

1. Configure your email provider to forward incoming replies to:
   ```
   POST http://192.168.10.12:3001/api/email/inbound
   Header: x-inbound-secret: <your INBOUND_EMAIL_SECRET>
   Body: { fromEmail, fromName, subject, text }
   ```
2. The system automatically matches the thread token `[ATC:xxx]` in the subject line
3. Customer replies auto-create ticket messages and trigger status transitions

### 7.5 Handling Support Session Escalations

When Julia AI can't resolve an issue, the customer can click "Escalate to support":

1. The system captures the full chat history, client details, hardware context, and identified support topic
2. A new **Ticket** is created automatically with:
   - Source: `GENERAL_WIDGET` or `PROJECT_WIDGET`
   - Status: `NEW`
   - Linked support session for full conversation history
   - AI-generated issue summary and confidence score
3. The ticket appears in the agent queue at `/agent/tickets/queue`
4. Agents can view the entire chat history in the ticket's **Session** tab

---

## 8. Troubleshooting Playbook

### 8.1 Backend Returns 500 — "table does not exist"

**Symptom**: API calls fail with errors like `The table 'public.SupportTopic' does not exist in the current database.`

**Cause**: Database migrations haven't been applied. The schema file defines new tables that don't exist in the database yet.

**Fix**:
```powershell
cd C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend
npx prisma migrate status      # Shows pending migrations
npx prisma migrate deploy       # Applies them
nssm restart ATC-Support-Backend  # Restart to use updated schema
```

---

### 8.2 Frontend Shows Old Version After Deployment

**Symptom**: You deployed new code but the browser still shows the old UI, even after hard refresh on multiple browsers.

**Cause**: This is almost always because the build output wasn't copied to the **IIS directory** (`C:\inetpub\ATC_Support_Frontend\`). The frontend builds to `ATC_Support_Frontend\dist\`, but IIS serves from a completely different path.

**Fix**:
```powershell
# Verify what IIS is actually serving
Get-ChildItem "C:\inetpub\ATC_Support_Frontend\index.html" | Select-Object LastWriteTime

# If the date is old, redeploy:
Copy-Item "C:\inetpub\ATC_Support_Frontend\web.config" "C:\inetpub\ATC_Support_Frontend\web.config.bak"
Remove-Item "C:\inetpub\ATC_Support_Frontend\assets" -Recurse -Force
Remove-Item "C:\inetpub\ATC_Support_Frontend\index.html" -Force
Copy-Item -Path "C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Frontend\dist\*" -Destination "C:\inetpub\ATC_Support_Frontend\" -Recurse -Force
Move-Item "C:\inetpub\ATC_Support_Frontend\web.config.bak" "C:\inetpub\ATC_Support_Frontend\web.config" -Force
```

---

### 8.3 Build Fails with Merge Conflict Markers

**Symptom**: `npm run build` fails with `error TS1185: Merge conflict marker encountered.`

**Cause**: There are unresolved git merge conflicts in `.ts` files (lines with `<<<<<<<`, `=======`, `>>>>>>>`).

**Fix**:
```powershell
# Find all conflict markers
Select-String -Path ".\src\**\*.ts" -Pattern "<<<<<<< " -Recurse

# Open each file, resolve conflicts, then rebuild
npm run build
```

---

### 8.4 Backend Service Won't Start or Crashes Immediately

**Symptom**: `nssm restart ATC-Support-Backend` succeeds but the service crashes within seconds.

**Diagnosis**:
```powershell
# Check service state
Get-CimInstance Win32_Service -Filter "Name='ATC-Support-Backend'" | Select-Object State

# Read the error log — this is usually the answer
Get-Content "C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend\logs\stderr.log" -Tail 30
```

**Common causes**:

| Error in Log | Cause | Fix |
|-------------|-------|-----|
| `DATABASE_URL is required` | Missing or broken `.env` file | Verify `.env` exists and has a valid `DATABASE_URL` |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL is not running | Start the PostgreSQL service |
| `EADDRINUSE :::3001` | Port 3001 already in use | `netstat -ano \| findstr :3001` → kill the process or change the port |
| `Cannot find module './dist/index.js'` | Backend wasn't built | Run `npm run build` |
| `Invalid prisma client` | Prisma Client out of sync with schema | Run `npx prisma generate` then `npm run build` |

---

### 8.5 Julia AI Not Responding

**Symptom**: The Julia chat widget shows fallback messages instead of AI responses.

**Diagnosis**:
```powershell
# Check if GROQ_API_KEY is set
Select-String "GROQ_API_KEY" "C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend\.env"
```

**Common causes**:

| Cause | Fix |
|-------|-----|
| `GROQ_API_KEY` is empty | Get a key from https://console.groq.com and add it to `.env` |
| Groq service outage | Check https://status.groq.com — use fallback messages until resolved |
| No published project docs | Julia needs at least some published docs for context. Add docs and set status to PUBLISHED |
| Rate limit exceeded | The logs will show `rate_limit_exceeded`. Wait or upgrade your Groq plan |

---

### 8.6 PM2 Permission Errors

**Symptom**: Running `pm2 list` or similar fails with `connect EPERM //./pipe/rpc.sock`

**Cause**: PM2 is **not** the process manager for this project. The system uses **NSSM**. Residual PM2 artifacts can cause errors.

**Fix**: Ignore PM2 entirely and use NSSM commands:
```powershell
nssm status ATC-Support-Backend
nssm restart ATC-Support-Backend
```

If PM2 artifacts are causing issues:
```powershell
Remove-Item "$env:USERPROFILE\.pm2" -Recurse -Force -ErrorAction SilentlyContinue
```

---

### 8.7 Cannot Access Agent Console (401 Errors)

**Symptom**: After logging in, API calls fail with 401 Unauthorized.

**Causes**:
- **JWT_SECRET changed**: If the `.env` `JWT_SECRET` was modified, all existing tokens are invalidated. Users need to log out and log back in.
- **User set to INACTIVE**: Check the User table — `status` must be `ACTIVE`
- **Clock skew**: JWT validation is time-sensitive. Ensure the server clock is accurate.

---

### 8.8 IIS Returns 404 on Page Refresh

**Symptom**: Going to `http://192.168.10.12:4206/agent/dashboard` directly (or refreshing) returns a 404 page.

**Cause**: The `web.config` file is missing from `C:\inetpub\ATC_Support_Frontend\`. This happens when it gets deleted during deployment.

**Fix**: Recreate the file:
```powershell
@"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReactRouterFallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
"@ | Out-File -Encoding utf8 "C:\inetpub\ATC_Support_Frontend\web.config"
```

---

## 9. Quick Reference Checklists

### 9.1 Deployment Checklist

```
□  git pull origin main
□  Resolve any merge conflicts (git diff --check)
□  cd ATC_Support_Backend
□    npm install
□    npx prisma generate
□    npx prisma migrate deploy
□    npm run build → zero errors
□    nssm restart ATC-Support-Backend
□    GET http://localhost:3001/health → {"status":"ok"}
□    Check logs\stderr.log for errors
□  cd ATC_Support_Frontend
□    npm install
□    npm run build → zero errors
□    Backup web.config from IIS directory
□    Clear old files from C:\inetpub\ATC_Support_Frontend\
□    Copy dist\* → C:\inetpub\ATC_Support_Frontend\
□    Restore web.config
□    Browse http://192.168.10.12:4206 (Ctrl+Shift+R)
□  Done
```

### 9.2 Emergency Rollback

If a deployment breaks production:

```powershell
# 1. Roll back to the previous known-good commit
cd C:\Users\Admin\Desktop\ATC_Support
git log --oneline -5                    # Find the good commit hash
git reset --hard <commit_hash>          # Reset to it

# 2. Rebuild and redeploy
cd ATC_Support_Backend
npx prisma generate
npm run build
nssm restart ATC-Support-Backend

cd ..\ATC_Support_Frontend
npm run build
# Copy dist to IIS directory (same steps as §3.2 Step 9)
```

> ⚠️ **Database migrations cannot be easily rolled back.** If a migration added tables, they'll remain in the database. This is usually harmless — unused tables don't affect the older code.

### 9.3 Common NSSM Commands

```powershell
nssm status ATC-Support-Backend       # Check if running
nssm start ATC-Support-Backend        # Start the service
nssm stop ATC-Support-Backend         # Stop the service
nssm restart ATC-Support-Backend      # Restart the service
nssm edit ATC-Support-Backend         # Open GUI config editor
```

### 9.4 Useful PowerShell One-Liners

```powershell
# What's using port 3001?
netstat -ano | findstr :3001

# Check all node processes
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Select ProcessId,CommandLine

# Tail the error log
Get-Content "C:\Users\Admin\Desktop\ATC_Support\ATC_Support_Backend\logs\stderr.log" -Wait -Tail 5

# Check IIS site configuration
Get-Content "$env:SystemRoot\System32\inetsrv\config\applicationHost.config" | Select-String "ATC_Support" -Context 3

# Quick health check
Invoke-WebRequest -Uri http://localhost:3001/health -UseBasicParsing | Select StatusCode
```

---

*End of Standard Operating Procedures*

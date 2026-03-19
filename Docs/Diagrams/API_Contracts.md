# API Contracts — Complete Reference

> **Every endpoint in the system with request/response schemas, status codes, and access control.**
>
> **Total: 77 endpoints across 15 modules.**

---

## Conventions

| Convention | Value |
|---|---|
| **Base URL** | `https://support.yourdomain.com/api` |
| **Auth Header** | `Authorization: Bearer <jwt_access_token>` |
| **Widget Auth** | `X-Widget-Token: <project_widget_token>` |
| **Content Type** | `application/json` (except file uploads: `multipart/form-data`) |
| **IDs** | UUID v4 format |
| **Timestamps** | ISO 8601: `2025-01-18T14:32:00Z` |
| **Pagination** | `?page=1&per_page=20` (default: page=1, per_page=20, max: 100) |
| **Sorting** | `?sort_by=created_at&sort_order=desc` |
| **Filtering** | Query params: `?status=active&priority=high` |

### Standard Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is already in use",
    "details": [
      {"field": "email", "message": "This email is already registered"}
    ]
  }
}
```

### Standard Paginated Response

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 142,
    "total_pages": 8
  }
}
```

---

---

## 1. Auth (6 endpoints)

---

### `POST /api/auth/login`

**Access:** Public

**Request:**
```json
{
  "email": "amit@company.com",
  "password": "SecurePass123!"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "amit@company.com",
    "full_name": "Amit Kumar",
    "role": "se1",
    "first_login": false
  }
}
```
*Also sets `refresh_token` in httpOnly cookie.*

**Errors:**
| Code | When |
|---|---|
| 401 | Invalid email or password |
| 403 | Account deactivated |
| 429 | Too many login attempts (5/min) |

---

### `POST /api/auth/logout`

**Access:** Authenticated

**Request:** No body. Uses refresh_token cookie.

**Response 200:**
```json
{ "message": "Logged out successfully" }
```
*Adds refresh token to Redis blacklist.*

---

### `POST /api/auth/refresh`

**Access:** Valid refresh token cookie required

**Request:** No body. Uses refresh_token cookie.

**Response 200:**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 900
}
```
*Rotates refresh token (old one invalidated, new one set in cookie).*

**Errors:** `401` — Refresh token expired or blacklisted

---

### `POST /api/auth/password-reset`

**Access:** Public

**Request:**
```json
{ "email": "amit@company.com" }
```

**Response 200:**
```json
{ "message": "If this email exists, a reset link has been sent" }
```
*Always returns 200 (prevents email enumeration).*

---

### `POST /api/auth/password-reset/confirm`

**Access:** Public (with valid reset token)

**Request:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass456!"
}
```

**Response 200:**
```json
{ "message": "Password reset successfully" }
```

**Errors:** `400` — Invalid or expired token | `422` — Password too weak

---

### `PUT /api/auth/change-password`

**Access:** Authenticated

**Request:**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewPass456!"
}
```

**Response 200:**
```json
{ "message": "Password changed successfully" }
```

**Errors:** `400` — Current password incorrect | `422` — New password too weak

---

---

## 2. Users (5 endpoints)

---

### `GET /api/users`

**Access:** PM, Director

**Query Params:** `?role=se1&status=active&search=amit`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "amit@company.com",
      "full_name": "Amit Kumar",
      "role": "se1",
      "status": "active",
      "first_login": false,
      "created_at": "2025-01-10T08:00:00Z",
      "last_login_at": "2025-01-18T09:15:00Z"
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total": 6, "total_pages": 1 }
}
```

---

### `GET /api/users/:id`

**Access:** PM, Director, Self

**Response 200:**
```json
{
  "id": "uuid",
  "email": "amit@company.com",
  "full_name": "Amit Kumar",
  "phone": "+91-9876543210",
  "role": "se1",
  "status": "active",
  "first_login": false,
  "created_at": "2025-01-10T08:00:00Z",
  "last_login_at": "2025-01-18T09:15:00Z",
  "assigned_projects_count": 0,
  "open_tickets_count": 8
}
```

---

### `POST /api/users`

**Access:** PM, Director

**Request:**
```json
{
  "email": "newhire@company.com",
  "full_name": "New Hire",
  "phone": "+91-9876543210",
  "role": "se1",
  "temporary_password": "TempPass123!"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "email": "newhire@company.com",
  "full_name": "New Hire",
  "role": "se1",
  "status": "active",
  "first_login": true
}
```

**Errors:** `409` — Email already exists | `422` — Invalid role

---

### `PUT /api/users/:id`

**Access:** PM, Director

**Request:**
```json
{
  "full_name": "Updated Name",
  "phone": "+91-9876543210",
  "role": "se2"
}
```

**Response 200:** Updated user object

---

### `PATCH /api/users/:id/status`

**Access:** PM, Director

**Request:**
```json
{ "status": "inactive" }
```

**Response 200:**
```json
{ "id": "uuid", "status": "inactive" }
```

**Errors:** `400` — Cannot deactivate yourself | `400` — Cannot deactivate last PM

---

---

## 3. Clients (5 endpoints)

---

### `GET /api/clients`

**Access:** All authenticated (SE3 sees only their assigned clients' projects)

**Query Params:** `?status=active&industry=manufacturing&search=tata&sort_by=company_name`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "company_name": "Tata Steel",
      "industry": "Manufacturing",
      "city": "Jamshedpur",
      "status": "active",
      "projects_count": 3,
      "open_tickets_count": 5,
      "amc_status": "active",
      "created_at": "2025-01-05T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### `GET /api/clients/:id`

**Response 200:**
```json
{
  "id": "uuid",
  "company_name": "Tata Steel",
  "industry": "Manufacturing",
  "city": "Jamshedpur",
  "address": "Steel Plant Road, Jamshedpur, Jharkhand",
  "phone": "+91-657-XXXXXXX",
  "email": "info@tatasteel.com",
  "website": "https://tatasteel.com",
  "notes": "Key client, handle with priority",
  "status": "active",
  "created_at": "2025-01-05T10:00:00Z",
  "updated_at": "2025-01-15T14:30:00Z",
  "contacts_count": 2,
  "consignees_count": 3,
  "projects_count": 3,
  "active_amcs_count": 1,
  "open_tickets_count": 5
}
```

---

### `POST /api/clients`

**Access:** PM

**Request:**
```json
{
  "company_name": "New Client Pvt Ltd",
  "industry": "Automotive",
  "city": "Pune",
  "address": "Industrial Area, Phase 2, Pune",
  "phone": "+91-20-XXXXXXX",
  "email": "info@newclient.com",
  "website": "https://newclient.com",
  "notes": "Referred by Tata Steel"
}
```

**Response 201:** Created client object

**Errors:** `409` — Company name already exists

---

### `PUT /api/clients/:id`

**Access:** PM

**Request:** Same fields as POST (partial update allowed)

**Response 200:** Updated client object

---

### `PATCH /api/clients/:id/status`

**Access:** PM

**Request:**
```json
{ "status": "inactive" }
```

**Response 200:** `{ "id": "uuid", "status": "inactive" }`

**Business Rule:** Deactivating a client deactivates all its projects' widgets. Existing tickets remain open.

---

---

## 4. Contacts (4 endpoints)

---

### `GET /api/clients/:clientId/contacts`

**Access:** All authenticated

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "client_id": "uuid",
      "name": "Suresh Kumar",
      "email": "suresh@tatasteel.com",
      "phone": "+91-9876543210",
      "designation": "Plant Manager",
      "is_primary": true,
      "status": "active"
    }
  ]
}
```

---

### `POST /api/clients/:clientId/contacts`

**Access:** PM

**Request:**
```json
{
  "name": "Suresh Kumar",
  "email": "suresh@tatasteel.com",
  "phone": "+91-9876543210",
  "designation": "Plant Manager",
  "is_primary": true
}
```

**Response 201:** Created contact object

**Business Rule:** If `is_primary: true`, existing primary contact is automatically demoted to secondary.

**Errors:** `409` — Email already exists for this client

---

### `PUT /api/contacts/:id`

**Access:** PM

**Request:** Same fields (partial update)

**Response 200:** Updated contact

---

### `DELETE /api/contacts/:id`

**Access:** PM

**Response 200:** `{ "message": "Contact deleted" }`

**Errors:** `400` — Cannot delete contact with open tickets

---

---

## 5. Consignees (4 endpoints)

---

### `GET /api/clients/:clientId/consignees`

**Access:** All authenticated

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "client_id": "uuid",
      "site_name": "Jamshedpur Plant 1",
      "city": "Jamshedpur",
      "state": "Jharkhand",
      "address": "Steel Plant Road",
      "projects_count": 2
    }
  ]
}
```

---

### `POST /api/clients/:clientId/consignees`

**Access:** PM

**Request:**
```json
{
  "site_name": "Jamshedpur Plant 1",
  "city": "Jamshedpur",
  "state": "Jharkhand",
  "address": "Steel Plant Road"
}
```

**Response 201:** Created consignee

---

### `PUT /api/consignees/:id`

**Access:** PM | **Response 200:** Updated consignee

---

### `DELETE /api/consignees/:id`

**Access:** PM

**Errors:** `400` — Cannot delete consignee linked to active projects

---

---

## 6. Projects (7 endpoints)

---

### `GET /api/projects`

**Access:** All (SE3 sees only assigned projects)

**Query Params:** `?client_id=uuid&status=active&widget_enabled=true&search=scada`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "SCADA Line 1",
      "client": { "id": "uuid", "company_name": "Tata Steel" },
      "assigned_se3": { "id": "uuid", "full_name": "Vikram Patel" },
      "widget_enabled": true,
      "status": "active",
      "kb_articles_count": 12,
      "open_tickets_count": 3,
      "amc_status": "active",
      "created_at": "2025-01-05T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### `GET /api/projects/:id`

**Response 200:** Full project object with nested client info, SE3 info, consignees list, AMC status.

---

### `POST /api/projects`

**Access:** PM

**Request:**
```json
{
  "name": "SCADA Line 1",
  "description": "SCADA monitoring for production line 1",
  "client_id": "uuid",
  "assigned_se3_id": "uuid",
  "consignee_ids": ["uuid", "uuid"]
}
```

**Response 201:** Created project (auto-generates `widget_token`)

---

### `PUT /api/projects/:id`

**Access:** PM | **Request:** Same fields (partial) | **Response 200:** Updated project

---

### `PATCH /api/projects/:id/status`

**Access:** PM

**Request:** `{ "status": "inactive" }`

**Business Rule:** Deactivating a project disables its widget automatically.

---

### `PATCH /api/projects/:id/widget`

**Access:** PM

**Request:**
```json
{ "widget_enabled": true }
```

**Response 200:**
```json
{ "id": "uuid", "widget_enabled": true, "widget_token": "proj_abc123def456" }
```

**Business Rule:** Cannot enable widget if project has 0 published KB articles.

---

### `GET /api/projects/:id/widget-token`

**Access:** PM

**Response 200:**
```json
{
  "widget_token": "proj_abc123def456",
  "embed_code": "<script src=\"https://support.yourdomain.com/widget.js?token=proj_abc123def456\"></script>",
  "widget_enabled": true
}
```

---

---

## 7. AMCs (7 endpoints)

---

### `GET /api/amcs`

**Access:** All

**Query Params:** `?client_id=uuid&status=active&expiring_within_days=60`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "contract_number": "AMC-2024-015",
      "client": { "id": "uuid", "company_name": "Tata Steel" },
      "start_date": "2024-04-01",
      "end_date": "2025-03-31",
      "status": "active",
      "days_remaining": 72,
      "linked_projects": [
        { "id": "uuid", "name": "SCADA Line 1" },
        { "id": "uuid", "name": "PLC Upgrade" }
      ],
      "document_url": "https://r2.../amc-2024-015.pdf"
    }
  ]
}
```

**`status` is computed:** active (end_date > today), upcoming (start_date > today), expired (end_date < today)

---

### `GET /api/amcs/:id` | `POST /api/amcs` | `PUT /api/amcs/:id`

Same pattern as above. POST requires: `client_id`, `contract_number`, `start_date`, `end_date`, `project_ids[]`.

---

### `POST /api/amcs/:id/projects`

**Access:** PM

**Request:** `{ "project_ids": ["uuid", "uuid"] }`

---

### `DELETE /api/amcs/:id/projects/:projectId`

**Access:** PM — Unlinks a project from an AMC.

---

### `GET /api/amcs/expiring`

**Access:** PM, Director

**Query Params:** `?days=60`

**Response 200:** List of AMCs expiring within N days, sorted by days_remaining ASC.

---

---

## 8. Knowledge Base (7 endpoints)

---

### `GET /api/kb/projects/:projectId/articles`

**Access:** All

**Query Params:** `?status=published&audience=julia&search=error+E-45`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "PLC Error Code E-45: Motor Overload Fault",
      "category": "troubleshooting",
      "audience": "both",
      "tags": ["plc", "error", "motor"],
      "status": "published",
      "author": { "id": "uuid", "full_name": "Vikram Patel" },
      "has_embedding": true,
      "created_at": "2025-01-10T10:00:00Z",
      "updated_at": "2025-01-15T14:30:00Z"
    }
  ]
}
```

---

### `GET /api/kb/articles/:id`

**Response 200:** Full article with `content` (markdown), all metadata.

---

### `POST /api/kb/projects/:projectId/articles`

**Access:** PM (can publish), SE3 (draft only)

**Request:**
```json
{
  "title": "PLC Error Code E-45: Motor Overload Fault",
  "content": "## Problem\nError E-45 indicates...\n\n## Solution\n1. Check motor current...",
  "category": "troubleshooting",
  "audience": "both",
  "tags": ["plc", "error", "motor"],
  "status": "draft"
}
```

**Response 201:** Created article. If `status: published` → embedding auto-generated asynchronously.

---

### `PUT /api/kb/articles/:id`

**Access:** PM | **Response 200:** Updated article. If content changed and article is published → re-embed triggered.

---

### `PATCH /api/kb/articles/:id/status`

**Access:** PM

**Request:** `{ "status": "published" }` or `{ "status": "archived" }`

**Business Rule:** Publishing triggers embedding generation. Archiving removes article from Julia's search scope.

---

### `POST /api/kb/articles/:id/embed`

**Access:** PM (manual re-embed trigger)

**Response 200:** `{ "message": "Embedding generation queued", "task_id": "celery_task_uuid" }`

---

### `GET /api/kb/search`

**Access:** All

**Query Params:** `?q=motor+overload&project_id=uuid`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "PLC Error Code E-45",
      "snippet": "...motor overload condition on the specified drive unit...",
      "similarity_score": 0.81,
      "project": { "id": "uuid", "name": "SCADA Line 1" }
    }
  ]
}
```

---

---

## 9. Julia Configuration (8 endpoints)

---

### `GET /api/julia/projects/:projectId/config`

**Access:** PM, Director

**Response 200:**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "persona_name": "Julia",
  "greeting_message": "Hi! How can I help you with SCADA Line 1 today?",
  "fallback_message": "I'm not confident I can help with this. Would you like to connect with our support team?",
  "confidence_threshold": 0.60,
  "tone": "professional",
  "max_turns": 10,
  "updated_at": "2025-01-15T14:30:00Z"
}
```

---

### `PUT /api/julia/projects/:projectId/config`

**Access:** PM

**Request:**
```json
{
  "persona_name": "Julia",
  "greeting_message": "Hi! How can I help you today?",
  "fallback_message": "I can't help with this. Let me connect you with our team.",
  "confidence_threshold": 0.65,
  "tone": "friendly",
  "max_turns": 8
}
```

**Validation:** `confidence_threshold` must be between 0.3 and 0.95. `tone` must be one of: `professional`, `friendly`, `technical`.

---

### `GET /api/julia/projects/:projectId/rulebooks`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "rule_name": "Production Down Emergency",
      "trigger_condition": "production down, line halt, emergency stop",
      "action_instruction": "Immediately offer escalation. Do not attempt to answer.",
      "priority": 1,
      "status": "active"
    }
  ]
}
```

---

### `POST /api/julia/projects/:projectId/rulebooks`

**Access:** PM

**Request:**
```json
{
  "rule_name": "Firmware Redirect",
  "trigger_condition": "firmware update, firmware version",
  "action_instruction": "Direct to KB article: Firmware Update Guide",
  "priority": 5,
  "status": "active"
}
```

---

### `PUT /api/julia/rulebooks/:id` | `DELETE /api/julia/rulebooks/:id`

**Access:** PM

---

### `GET /api/julia/projects/:projectId/sessions`

**Access:** PM, Director

**Query Params:** `?resolution_layer=L3&date_from=2025-01-01&date_to=2025-01-31`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "contact_email": "suresh@tatasteel.com",
      "resolution_layer": "L3",
      "resolved": false,
      "ticket_number": "TKT-0042",
      "message_count": 4,
      "started_at": "2025-01-18T14:32:00Z",
      "duration_seconds": 480
    }
  ]
}
```

---

### `GET /api/julia/sessions/:sessionId`

**Access:** PM, Director

**Response 200:**
```json
{
  "id": "uuid",
  "project": { "id": "uuid", "name": "SCADA Line 1" },
  "contact": { "email": "suresh@tatasteel.com", "name": "Suresh Kumar" },
  "resolution_layer": "L3",
  "ticket_id": "uuid",
  "ticket_number": "TKT-0042",
  "messages": [
    {
      "index": 0,
      "role": "assistant",
      "content": "Hi! How can I help you with SCADA Line 1 today?",
      "confidence_score": null,
      "articles_used": [],
      "llm_latency_ms": null,
      "timestamp": "2025-01-18T14:32:00Z"
    },
    {
      "index": 1,
      "role": "user",
      "content": "PLC on drive unit 3 is showing error E-45",
      "timestamp": "2025-01-18T14:33:00Z"
    },
    {
      "index": 2,
      "role": "assistant",
      "content": "Error E-45 indicates a motor overload condition...",
      "confidence_score": 0.72,
      "articles_used": [
        { "id": "uuid", "title": "PLC Error Code E-45", "similarity": 0.81 }
      ],
      "llm_latency_ms": 6200,
      "timestamp": "2025-01-18T14:33:06Z"
    }
  ]
}
```

---

---

## 10. Tickets (14 endpoints)

---

### `GET /api/tickets`

**Access:** All (filtered by role — SE1 sees SE1-level, SE3 sees own projects, PM/Director see all)

**Query Params:** `?status=in_progress&priority=high&client_id=uuid&project_id=uuid&assigned_to=uuid&level=se1&source=widget&search=PLC&sort_by=updated_at`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "ticket_number": "TKT-0042",
      "subject": "PLC fault on drive unit 3 — Line 1",
      "client": { "id": "uuid", "company_name": "Tata Steel" },
      "project": { "id": "uuid", "name": "SCADA Line 1" },
      "contact": { "name": "Suresh Kumar", "email": "suresh@tatasteel.com" },
      "assigned_to": { "id": "uuid", "full_name": "Amit Kumar", "role": "se1" },
      "status": "in_progress",
      "priority": "high",
      "current_level": "se1",
      "source": "widget",
      "has_widget_session": true,
      "amc_status": "active",
      "message_count": 5,
      "last_activity_at": "2025-01-18T17:30:00Z",
      "created_at": "2025-01-18T14:36:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### `GET /api/tickets/:id`

**Response 200:** Full ticket object + conversation thread + attachments + escalation history.

```json
{
  "id": "uuid",
  "ticket_number": "TKT-0042",
  "subject": "PLC fault on drive unit 3 — Line 1",
  "client": {...},
  "project": {...},
  "contact": {...},
  "consignee": {...},
  "assigned_to": {...},
  "status": "in_progress",
  "priority": "high",
  "current_level": "se1",
  "source": "widget",
  "resolution_summary": null,
  "widget_session_id": "uuid",
  "amc_status": "active",
  "created_at": "2025-01-18T14:36:00Z",
  "updated_at": "2025-01-18T17:30:00Z",
  "messages": [
    {
      "id": "uuid",
      "author": { "id": "uuid", "full_name": "System", "role": null },
      "author_type": "system",
      "message_type": "system",
      "content": "Ticket created from widget escalation. Assigned to Amit Kumar (SE1).",
      "created_at": "2025-01-18T14:36:00Z"
    },
    {
      "id": "uuid",
      "author": { "id": "uuid", "full_name": "Amit Kumar", "role": "se1" },
      "author_type": "se",
      "message_type": "reply",
      "content": "Hi Suresh, I can see the E-45 error...",
      "attachments": [],
      "sent_via_email": true,
      "created_at": "2025-01-18T15:10:00Z"
    },
    {
      "id": "uuid",
      "author": null,
      "author_type": "client",
      "message_type": "reply",
      "content": "It happens during operation, about 30 minutes after startup.",
      "received_via_email": true,
      "created_at": "2025-01-18T16:45:00Z"
    },
    {
      "id": "uuid",
      "author": { "id": "uuid", "full_name": "Amit Kumar", "role": "se1" },
      "author_type": "se",
      "message_type": "internal_note",
      "content": "Sounds like a cooling issue. Priya should check hardware.",
      "created_at": "2025-01-18T17:00:00Z"
    }
  ],
  "attachments": [
    {
      "id": "uuid",
      "file_name": "photo.jpg",
      "file_size": 245000,
      "uploaded_by": { "full_name": "Suresh Kumar" },
      "download_url": "/api/files/uuid",
      "created_at": "2025-01-18T16:45:00Z"
    }
  ],
  "escalation_history": []
}
```

---

### `POST /api/tickets`

**Access:** SE1, SE2, SE3, PM

**Request:**
```json
{
  "client_id": "uuid",
  "project_id": "uuid",
  "contact_id": "uuid",
  "consignee_id": "uuid",
  "subject": "Motor vibration on Line 2",
  "description": "Client called about unusual vibration...",
  "priority": "medium",
  "assigned_to": "uuid",
  "notify_client": true
}
```

**Response 201:** Created ticket object with `ticket_number`

**Validation:** project must belong to client. contact must belong to client. consignee must be linked to project.

---

### `PUT /api/tickets/:id`

**Access:** Assigned SE, PM

**Request (partial):**
```json
{
  "subject": "Updated subject",
  "priority": "critical"
}
```

---

### `POST /api/tickets/:id/reply`

**Access:** Assigned SE, PM

**Request:**
```json
{
  "content": "Hi Suresh, I can see the E-45 error on your system...",
  "attachment_ids": ["uuid"]
}
```

**Side effects:** Email sent to client via Resend. Ticket status → `in_progress` if was `new`.

---

### `POST /api/tickets/:id/note`

**Access:** SE1, SE2, SE3, PM

**Request:**
```json
{
  "content": "Sounds like a cooling issue. Priya should check hardware side."
}
```

**Side effects:** None — internal notes are NOT emailed to client.

---

### `POST /api/tickets/:id/call-log`

**Access:** SE1, SE2, SE3, PM

**Request:**
```json
{
  "content": "Called Suresh. Confirmed motor is overheating. Fan unit may be blocked.",
  "duration_minutes": 12
}
```

---

### `POST /api/tickets/:id/escalate`

**Access:** SE1 (→SE2), SE2 (→SE3), PM (→any)

**Request:**
```json
{
  "target_level": "se2",
  "target_user_id": "uuid",
  "note": "Hardware issue likely. Priya has experience with drive boards."
}
```

**Response 200:**
```json
{
  "ticket_number": "TKT-0042",
  "old_level": "se1",
  "new_level": "se2",
  "old_assignee": "Amit Kumar",
  "new_assignee": "Priya Singh"
}
```

**Validation:** SE1 can only escalate to SE2. SE2 can only escalate to SE3. Cannot de-escalate. PM can assign to any level.

**Side effects:** Email to client ("escalated to specialist"), notification to new assignee.

---

### `PATCH /api/tickets/:id/status`

**Access:** Assigned SE, PM

**Request:**
```json
{
  "status": "resolved",
  "resolution_summary": "Drive board firmware updated to v2.3. Motor OL relay recalibrated to 12A threshold."
}
```

**Valid transitions:** `new` → `in_progress` | `in_progress` → `pending_client` | `in_progress` → `resolved` | `resolved` → `closed` | `resolved` → `reopened` | `reopened` → `in_progress`

**Side effects on resolve:** Resolution email to client with [Confirm] [Reopen] [Feedback] links.

---

### `POST /api/tickets/:id/merge`

**Access:** SE1, PM

**Request:**
```json
{
  "target_ticket_id": "uuid",
  "note": "Duplicate of TKT-0041"
}
```

**Side effects:** This ticket → `closed_merged`. All messages copied/linked to target. Reference note added to both.

---

### `PATCH /api/tickets/:id/assign`

**Access:** PM only

**Request:**
```json
{
  "assigned_to": "uuid",
  "current_level": "se3"
}
```

---

### `POST /api/tickets/:id/feedback`

**Access:** Public (via unique `feedback_token` from email link)

**Request:**
```json
{
  "feedback_token": "fbk_unique_token",
  "rating": 4,
  "comment": "Issue resolved quickly. Good response time."
}
```

---

### `GET /api/tickets/:id/attachments` | `POST /api/tickets/:id/attachments`

**Upload:** `multipart/form-data` with `file` field. Max 10MB per file. Stored in R2.

---

---

## 11. Widget — Client-Facing (4 endpoints)

---

### `POST /api/widget/session`

**Auth:** `X-Widget-Token` header

**Request:** `{}` (empty body)

**Response 200:**
```json
{
  "session_id": "uuid",
  "project_name": "SCADA Line 1",
  "greeting": "Hi! How can I help you with SCADA Line 1 today?",
  "persona_name": "Julia",
  "faqs": [
    { "id": "uuid", "title": "How to reset PLC?" },
    { "id": "uuid", "title": "Firmware update steps" },
    { "id": "uuid", "title": "Error code reference" }
  ],
  "amc_status": "active"
}
```

**Errors:** `403` — Widget disabled | `404` — Invalid token | `403` — Client/project inactive

---

### `POST /api/widget/faq`

**Request:**
```json
{
  "session_id": "uuid",
  "article_id": "uuid"
}
```

**Response 200:**
```json
{
  "article": {
    "title": "How to Reset PLC",
    "content": "## Steps\n1. Open the HMI panel..."
  },
  "resolution_layer": "L1"
}
```

---

### `POST /api/widget/message`

**Request:**
```json
{
  "session_id": "uuid",
  "message": "PLC on drive unit 3 is showing error E-45"
}
```

**Response 200:**
```json
{
  "response": "Error E-45 indicates a motor overload condition...",
  "confident": true,
  "resolution_layer": "L2",
  "show_escalation_option": false
}
```

**If not confident:**
```json
{
  "response": "I don't have enough information to help with this. Would you like to connect with our support team?",
  "confident": false,
  "resolution_layer": null,
  "show_escalation_option": true
}
```

---

### `POST /api/widget/escalate`

**Request:**
```json
{
  "session_id": "uuid",
  "contact_name": "Suresh Kumar",
  "contact_email": "suresh@tatasteel.com",
  "description": "PLC E-45 error persists after restart"
}
```

**Response 200:**
```json
{
  "ticket_number": "TKT-0043",
  "message": "Ticket created! Our team will reach out at suresh@tatasteel.com."
}
```

**Errors:** `403` — AMC expired (returns PM contact info) | `400` — Email not recognized as a contact

---

---

## 12. Email Webhook (1 endpoint)

---

### `POST /api/email/inbound`

**Auth:** Resend webhook signature verification

**Payload (from Resend):**
```json
{
  "type": "email.received",
  "data": {
    "from": "suresh@tatasteel.com",
    "to": ["support+tkt0043@yourdomain.com"],
    "subject": "Re: [TKT-0043] PLC fault on drive unit 3",
    "text": "It happens during operation, about 30 minutes after startup.",
    "html": "<p>It happens during operation...</p>",
    "headers": {...},
    "attachments": [...]
  }
}
```

**Response 200:** `{ "processed": true }`

**Side effects:** Message added to ticket thread. Ticket status updated. SE notified.

---

---

## 13. Files (2 endpoints)

---

### `POST /api/files/upload`

**Access:** Authenticated | **Content-Type:** `multipart/form-data`

**Response 201:**
```json
{
  "id": "uuid",
  "file_name": "photo.jpg",
  "file_size": 245000,
  "content_type": "image/jpeg"
}
```

**Limits:** Max 10MB per file. Allowed types: jpg, png, pdf, doc, docx, xls, xlsx, txt, csv, zip.

---

### `GET /api/files/:id`

**Access:** Authenticated (permission check — must have access to parent ticket/entity)

**Response:** Redirects to signed R2 download URL (expires in 1 hour).

---

---

## 14. Notifications (3 endpoints)

---

### `GET /api/notifications`

**Access:** Authenticated (own notifications only)

**Query Params:** `?is_read=false&page=1`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "ticket_assigned",
      "title": "New Ticket Assigned",
      "message": "TKT-0043 has been assigned to you",
      "reference_type": "ticket",
      "reference_id": "uuid",
      "is_read": false,
      "created_at": "2025-01-18T14:36:00Z"
    }
  ],
  "unread_count": 3
}
```

---

### `PATCH /api/notifications/:id/read`

**Response 200:** `{ "id": "uuid", "is_read": true }`

---

### `PATCH /api/notifications/read-all`

**Response 200:** `{ "marked_read": 5 }`

---

---

## 15. Reports (5 endpoints)

---

### `GET /api/reports/ticket-summary`

**Access:** PM, Director

**Query Params:** `?date_from=2025-01-01&date_to=2025-01-31&client_id=uuid`

**Response 200:**
```json
{
  "period": { "from": "2025-01-01", "to": "2025-01-31" },
  "created": 23,
  "resolved": 19,
  "closed": 15,
  "open": 12,
  "avg_resolution_hours": 57.6,
  "by_priority": { "critical": 2, "high": 4, "medium": 6, "low": 3 },
  "by_source": { "widget": 14, "manual": 7, "email": 2 },
  "by_level": { "se1": 9, "se2": 8, "se3": 6 }
}
```

---

### `GET /api/reports/layer-resolution`

**Response 200:**
```json
{
  "total_sessions": 150,
  "l1_faq": { "count": 27, "percentage": 18 },
  "l2_julia": { "count": 41, "percentage": 27.3 },
  "l3_ticket": { "count": 82, "percentage": 54.7 },
  "target": "l3 < 40%"
}
```

---

### `GET /api/reports/engineer-workload`

**Response 200:**
```json
{
  "engineers": [
    {
      "user": { "full_name": "Amit Kumar", "role": "se1" },
      "open_tickets": 8,
      "resolved_this_month": 12,
      "avg_resolution_hours": 36.2,
      "escalated_count": 3
    }
  ]
}
```

---

### `GET /api/reports/amc-tracker`

**Response 200:**
```json
{
  "total": 17,
  "active": 14,
  "expiring_soon": 2,
  "expired": 1,
  "details": [
    {
      "contract_number": "AMC-2024-015",
      "client": "Tata Steel",
      "end_date": "2025-03-31",
      "days_remaining": 72,
      "status": "active",
      "linked_projects_count": 3
    }
  ]
}
```

---

### `GET /api/reports/julia-performance`

**Response 200:**
```json
{
  "total_sessions": 150,
  "avg_confidence": 0.68,
  "avg_response_time_ms": 6200,
  "by_project": [
    {
      "project": "SCADA Line 1",
      "sessions": 85,
      "l1_rate": 20,
      "l2_rate": 30,
      "l3_rate": 50,
      "avg_confidence": 0.71,
      "kb_articles_count": 12
    }
  ]
}
```

---

---

## Endpoint Count Summary

| Module | Endpoints |
|---|---|
| Auth | 6 |
| Users | 5 |
| Clients | 5 |
| Contacts | 4 |
| Consignees | 4 |
| Projects | 7 |
| AMCs | 7 |
| Knowledge Base | 7 |
| Julia Config | 8 |
| Tickets | 14 |
| Widget | 4 |
| Email | 1 |
| Files | 2 |
| Notifications | 3 |
| Reports | 5 |
| **Total** | **82** |

# REST API Plan

## 1. Resources

| Resource | Backing Table / View | Description |
|----------|----------------------|-------------|
| Auth / Session | Supabase Auth | User registration & login (email/password). |
| Group | groups | HAL camp group (name, timeframe, lore theme, status). |
| Group Membership | group_memberships | User participation & role (admin/editor/member). |
| Activity | activities | Planned activity (10 required content fields + status). |
| Activity Editors | activity_editors | Assignment of multiple editors to an activity. |
| Activity Schedule | activity_schedules | Placement of an activity in a specific camp day & time block. |
| Camp Day | camp_days | Day within group date range; optional theme. |
| AI Evaluation | ai_evaluations | Versioned AI scoring & feedback for an activity. |
| Group Task | group_tasks | Operational task optionally linked to an activity. |
| Dashboard Stats | group_dashboard_stats (view) | Aggregated group metrics. |
| User Group Permissions | user_group_permissions (view) | Derived permissions (optimization). |
| Invite | (derived from groups.invite_* fields) | Ephemeral group invite (code, limits, expiry). |

## 2. Endpoints

Conventions:
- Base path: `/api` (Astro server endpoints under `src/pages/api`).
- JSON only. UTF-8. `Content-Type: application/json`.
- Dates: ISO 8601 date (`YYYY-MM-DD`) for `date`, full ISO timestamp with `Z` for timestamptz fields.
- Times: `HH:MM` (24h) for `start_time` / `end_time`.
- Pagination: Cursor-based (`?limit=20&cursor=<opaque>`). Fallback offset pagination for simple lists: `?page=1&page_size=20`.
- Sorting: `?sort=field,-otherField` (whitelist per resource). Default sorts indicated below.
- Filtering: `?status=active&role=admin` etc., only whitelisted filters applied; unknown filters ignored.
- Response envelope (list): `{ "data": [...], "nextCursor": "...", "count": <optional> }`.
- Single resource: `{ "data": { ... } }`.
- Errors: `{ "error": { "code": "<UPPER_SNAKE>", "message": "human readable", "details": {...} } }`.
- Idempotent resource creation with UUID client supplied not required (server generates).
- ETag / Conditional: For mutable resources include `ETag` (hash of `updated_at`); updates require `If-Match` to avoid lost updates (optional MVP+1).


### 2.2 Groups
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/groups | Create new group (auth required). |
| GET | /api/groups | List groups current user belongs to. |
| GET | /api/groups/{group_id} | Get group details (membership required). |
| PATCH | /api/groups/{group_id} | Update group (admin only). |
| DELETE | /api/groups/{group_id} | Soft delete group (admin). |
| POST | /api/groups/{group_id}/restore | Restore soft-deleted group (admin, within retention). |
| POST | /api/groups/{group_id}/invite | Generate / rotate invite code (admin). |
| POST | /api/groups/join | Join by invite code. |

Create Request:
`{ "name": "Alpha", "description": "Summer camp", "lore_theme": "Middle Earth", "start_date": "2025-07-01", "end_date": "2025-07-14", "max_members": 40 }`
Response: group object.

Group Object:
```
{
  "id": "uuid",
  "name": "...",
  "description": "...",
  "lore_theme": "...",
  "status": "planning|active|archived",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "invite": { "code": "ABCDEFGH", "expires_at": "2025-06-01T10:00:00Z", "max_uses": 30, "current_uses": 5 },
  "max_members": 50,
  "created_at": "...",
  "updated_at": "...",
  "deleted_at": null
}
```

Validation highlights:
- `end_date >= start_date`
- `max_members 1..500`
- Invite code format `^[A-HJ-NP-Za-km-z1-9]{8}$` (server-generated)

Errors: GROUP_LIMIT_REACHED, DATE_RANGE_INVALID, NOT_MEMBER, FORBIDDEN_ROLE, INVITE_INVALID, INVITE_EXPIRED, INVITE_MAXED.

### 2.3 Group Memberships & Roles
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/groups/{group_id}/members | List members (admin/editor/member). |
| PATCH | /api/groups/{group_id}/members/{user_id} | Change role (admin only). |
| DELETE | /api/groups/{group_id}/members/{user_id} | Remove member (admin or self). |
| POST | /api/groups/{group_id}/members/{user_id}/promote | Convenience to set admin. |

Member Object: `{ "user_id": "uuid", "role": "admin|editor|member", "joined_at": "..." }`

Constraints:
- At least one admin (enforced DB). 409 if attempt removes last admin.
- Role must be in enum set.

Errors: LAST_ADMIN_REMOVAL, ROLE_INVALID.

### 2.4 Activities
| Method | Path |
|--------|------|
| POST | /api/groups/{group_id}/activities |
| GET | /api/groups/{group_id}/activities |
| GET | /api/activities/{activity_id} |
| PATCH | /api/activities/{activity_id} |
| DELETE | /api/activities/{activity_id} |
| POST | /api/activities/{activity_id}/restore |

List Query Params: `status`, `assigned=me`, `search=...`, pagination params.
Full-Text optional `search` across title/objective.

Activity Create Request (10 required fields):
```
{
  "title": "...",
  "objective": "...",
  "tasks": "...",
  "duration_minutes": 90,
  "location": "...",
  "materials": "...",
  "responsible": "...",
  "knowledge_scope": "...",
  "participants": "...",
  "flow": "...",
  "summary": "..."
}
```
Response includes status (default draft), editors array (initial empty or creator if auto-assign), last_evaluation_requested_at.

Validation:
- `duration_minutes 5..1440`
- All text fields required non-empty

Errors: ACTIVITY_NOT_FOUND, FORBIDDEN_ROLE, VALIDATION_ERROR.

### 2.5 Activity Editors (Assignments)
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/activities/{activity_id}/editors | Assign editor (admin only). |
| GET | /api/activities/{activity_id}/editors | List editors. |
| DELETE | /api/activities/{activity_id}/editors/{user_id} | Remove editor (admin). |

Payload POST: `{ "user_id": "uuid" }`
Errors: ALREADY_ASSIGNED, USER_NOT_IN_GROUP.

### 2.6 AI Evaluations
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/activities/{activity_id}/ai-evaluations | Request new AI evaluation (admin or assigned editor). |
| GET | /api/activities/{activity_id}/ai-evaluations | List evaluations (latest first). |
| GET | /api/ai-evaluations/{evaluation_id} | Get specific evaluation. |

Evaluation Object:
```
{
  "id": "uuid",
  "activity_id": "uuid",
  "version": 3,
  "lore_score": 8,
  "scouting_values_score": 7,
  "lore_feedback": "...",
  "scouting_feedback": "...",
  "suggestions": ["Question 1", "Question 2"],
  "tokens": 1234,
  "created_at": "..."
}
```
Server flow:
1. Validate cooldown (5 minutes since last request) else 429 AI_EVALUATION_COOLDOWN.
2. Persist placeholder row (or use job queue).
3. Call AI provider (stream suggestions). (Out-of-scope implementation detail; may respond 202 with polling).

Design choice: synchronous vs async.
- Option A (Sync): block until AI returns (risk latency). Simpler.
- Option B (Async chosen): Return 202 with `evaluation_request_id`; client polls list or dedicated status endpoint until new version appears.
Chosen: Async for UX resilience & rate limiting clarity.

Responses:
- POST 202 `{ "data": { "queued": true, "next_poll_after_sec": 5 } }`
- GET list returns array of evaluation objects.

### 2.7 Camp Days
| Method | Path |
|--------|------|
| POST | /api/groups/{group_id}/camp-days |
| GET | /api/groups/{group_id}/camp-days |
| GET | /api/camp-days/{camp_day_id} |
| PATCH | /api/camp-days/{camp_day_id} |
| DELETE | /api/camp-days/{camp_day_id} |

Validation:
- `day_number 1..30`
- `date` within group start/end
- Unique (group_id, day_number)

Errors: DAY_OUT_OF_RANGE, DATE_OUT_OF_GROUP_RANGE, DUPLICATE_DAY_NUMBER.

### 2.8 Activity Schedules (Placement)
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/camp-days/{camp_day_id}/schedules | Schedule activity in day. |
| GET | /api/camp-days/{camp_day_id}/schedules | List day schedule ordered by order_in_day. |
| PATCH | /api/activity-schedules/{schedule_id} | Update times/order. |
| DELETE | /api/activity-schedules/{schedule_id} | Remove scheduled slot. |

Create Request:
`{ "activity_id": "uuid", "start_time": "09:00", "end_time": "10:30", "order_in_day": 1 }`

Validation:
- `end_time > start_time`
- `order_in_day >=1` unique per day
- Optional (future) overlap prevention.

Errors: OVERLAPPING_TIME (future), ORDER_IN_DAY_CONFLICT.

### 2.9 Group Tasks
| Method | Path |
|--------|------|
| POST | /api/groups/{group_id}/tasks |
| GET | /api/groups/{group_id}/tasks |
| GET | /api/tasks/{task_id} |
| PATCH | /api/tasks/{task_id} |
| DELETE | /api/tasks/{task_id} |

Filters: `status=pending|in_progress|done|canceled`, `activity_id=uuid`.
Validation: status transitions allowed (any except to same? optional rules future).
Errors: TASK_NOT_FOUND.

### 2.10 Dashboard & Stats
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/groups/{group_id}/dashboard | Aggregated metrics + recent activity feed. |

Response:
```
{
  "data": {
    "group_id": "uuid",
    "total_activities": 42,
    "evaluated_activities": 30,
    "pct_evaluated_above_7": 0.71,
    "tasks": { "pending": 5, "done": 20 },
    "recent_activity": [ { "type": "activity_created", "id": "...", "at": "...", "user_id": "..." } ]
  }
}
```

### 2.11 Permissions Helper
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/groups/{group_id}/permissions | Returns current user's effective permissions. |

Response: `{ "data": { "role": "editor", "can_edit_all": false, "can_edit_assigned_only": true } }`

### 2.12 Search (Optional MVP+1)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/search | Cross-resource search within group (activities, tasks). |

Query: `q=string&group_id=uuid&type=activities,tasks`.

### 2.13 Health & Metadata
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Liveness + build info. |
| GET | /api/version | API version metadata. |

## 3. Authentication & Authorization

Mechanism:
- Supabase Auth (JWT) — client obtains access token via Supabase SDK or `/auth/login` convenience endpoint.
- All protected endpoints require `Authorization: Bearer <access_token>`.
- Middleware (`src/middleware/index.ts`) validates token & injects `locals.user` & `locals.supabase`.

Roles & Access Summary:
- admin: full within group (manage members, invites, all activities, tasks, scheduling, evaluations).
- editor: create/update activities they created or are assigned to; request AI evaluations; view all; cannot manage membership or invites.
- member: read-only (groups, activities, evaluations, schedule, tasks), cannot request evaluations.

Authorization Flow:
1. Extract group context from path param.
2. Query cached permissions (view or in-memory after first fetch) -> decision.
3. DB RLS also enforces final layer (defense in depth). API returns 403 BEFORE hitting DB for clearer error messages where possible.

Security Controls:
- Rate limiting (middleware): per token+IP bucket (e.g., 100 requests / 15 min) & separate stricter bucket for AI evaluation endpoint (e.g., 10 / hour / activity).
- Input validation with Zod schemas for each request body.
- Audit fields (`created_by`, `updated_by`) populated server-side from auth context.
- Soft delete ensures referential integrity; deleted resources excluded by default queries.
- ETag / If-Match for PATCH (optional initial skip, but structure prepared).
- Logging & structured error IDs for observability.

## 4. Validation & Business Logic

General Patterns:
- Use Zod per endpoint to validate shape & constraints (length ranges, enums, regex for invite code when supplied for join).
- Business rule violations -> 409 Conflict (state related) or 422 Unprocessable Entity (validation) or 403 (permission) as appropriate.

Per Resource Constraints:

Group:
- Required: name, description, lore_theme, start_date, end_date.
- `end_date >= start_date`.
- `max_members` within 1..500.
- Invite generation regenerates code & resets counters (reduces reuse collision) unless active code still valid & `reuse=true` query param.
- Status transitions allowed: planning -> active -> archived (no backward except admin override with explicit param `force=true`).

Membership:
- Role enum {admin, editor, member}.
- Cannot remove or demote last admin (detect via count query inside transaction).

Activity:
- All 10 textual fields required non-empty.
- `duration_minutes` 5..1440.
- State machine (future): draft -> review -> ready -> archived. For MVP allow PATCH of status to any of first three, archived only from ready.
- Deletion is soft (set `deleted_at`).

Activity Editors:
- User must already be member of group & not already assigned.
- Removing last editor allowed (admin remains overarching authority).

AI Evaluations:
- Rate limited: one request per activity per 5 minutes (`last_evaluation_requested_at`). 429 if violated.
- Version increments automatically; client cannot supply `version`.
- Scores 1..10 enforced; suggestions length 0..10.
- Async job may produce failure; failure recorded separately (future `ai_evaluation_failures`). For MVP return generic error if AI provider fails.

Camp Day:
- `day_number` unique per group 1..30.
- `date` must lie within group date window.
- Changing group date range triggers out-of-range check (reject if existing camp day outside new bounds unless `force=true`).

Activity Schedule:
- Validate activity.group_id matches camp_day.group_id.
- Unique `order_in_day` per camp_day.
- `end_time > start_time`.
- Optionally (future) detect overlapping time windows (will require retrieving existing schedules for same day prior to insert/update).

Group Task:
- Required fields: title, description.
- Status enum with transitions allowed to any (MVP flexibility). Future: restrict cancel/done transitions.
- If `activity_id` present: must belong to same group.

Common Validation Responses:
- 400 BAD_REQUEST for malformed JSON.
- 401 UNAUTHORIZED missing/invalid token.
- 403 FORBIDDEN no permission.
- 404 NOT_FOUND resource missing or soft-deleted.
- 409 CONFLICT business rule (e.g., LAST_ADMIN_REMOVAL, INVITE_MAXED, ORDER_IN_DAY_CONFLICT).
- 422 VALIDATION_ERROR field-level details.
- 429 RATE_LIMIT_EXCEEDED / AI_EVALUATION_COOLDOWN.
- 500 INTERNAL_ERROR unexpected.

Error Detail Format Example:
```
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "duration_minutes": "Must be between 5 and 1440"
    }
  }
}
```

Business Logic Highlights Mapping to Endpoints:
- Group creation & invite management -> `/api/groups`, `/api/groups/{id}/invite`.
- Joining via code -> `/api/groups/join` (validates code, expiry, uses).
- Role management -> `/api/groups/{id}/members` endpoints.
- Multi-editor assignment -> `/api/activities/{id}/editors`.
- AI evaluation request & versions -> `/api/activities/{id}/ai-evaluations`.
- Dashboard metrics -> `/api/groups/{id}/dashboard` + stats view.
- Day template usage (future) -> derive camp days & default schedule skeleton after group creation (optional POST to `/api/groups/{id}/camp-days/generate-template`). (MVP optional endpoint not enumerated above; can be added.)
- Soft delete / restore patterns for groups & activities ensure historical data for dashboard percentages.

Pagination & Sorting Defaults:
- Activities: sort `updated_at DESC`; filters by `status`, `assigned`.
- Tasks: sort `created_at DESC`; filters by `status`, `activity_id`.
- Camp days: sort `day_number ASC`.
- Schedules: implicit order `order_in_day ASC`.

Versioning Strategy:
- Initial API version `v1` implicit. Future break changes -> prefix `/api/v2/...` or use `Accept: application/vnd.loreprogrammer.v2+json`.

Idempotency:
- AI evaluation POST uses cooldown; client retries safe (will return 202 again if already processing).
- Other POST endpoints can support `Idempotency-Key` header (stored in short-lived table) (optional enhancement).

## Appendix: Example Activity Object
```
{
  "id": "uuid",
  "group_id": "uuid",
  "title": "Campfire Stories",
  "objective": "Teach lore immersion",
  "tasks": "Prepare scripts; assign roles",
  "duration_minutes": 90,
  "location": "Campfire circle",
  "materials": "Wood, props, lanterns",
  "responsible": "Alice,Bob",
  "knowledge_scope": "Camp lore basics",
  "participants": "All scouts",
  "flow": "Intro -> Story arcs -> Reflection",
  "summary": "Engaging storytelling session",
  "status": "draft",
  "last_evaluation_requested_at": null,
  "deleted_at": null,
  "created_at": "...",
  "updated_at": "..."
}
```

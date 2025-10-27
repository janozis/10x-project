<!--
NOTE: This README is auto-curated from project artefacts (PRD, tech stack, dependencies). Update those sources to keep this file accurate.
-->

# LoreProgrammer

Building collaborative, lore-driven programming for Harcerskie Akcje Letnie (HAL). LoreProgrammer helps scouts and instructors co-create coherent summer camp programmes that remain faithful to a chosen thematic "lore" while advancing scouting educational values.

![Node Version](https://img.shields.io/badge/node-22.14.0-43853d?logo=node.js) ![Astro](https://img.shields.io/badge/Astro-5.x-ff5d01?logo=astro) ![React](https://img.shields.io/badge/React-19-61dafb?logo=react) ![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

> Status: Early scaffold (feature implementation in progress)

---

## Table of Contents
1. [Project Name](#loreprogrammer)
2. [Project Description](#project-description)
3. [Tech Stack](#tech-stack)
4. [Getting Started Locally](#getting-started-locally)
5. [Available Scripts](#available-scripts)
6. [Project Scope](#project-scope)
7. [Project Status](#project-status)
8. [License](#license)

---

## Project Description
LoreProgrammer is a web application that enables HAL (Harcerska Akcja Letnia) programme teams to collaboratively plan, iterate and assess camp activities. It focuses on:
- Structured activity design (clear goals, materials, roles, flow, outcomes)
- AI-assisted on-demand evaluation (lore alignment & scouting values scoring)
- Iterative refinement via reflective AI question prompts
- Real-time collaboration within programme groups
- Role-based permissions (admin vs editor) with multi-editor assignment
- Day and full-camp schedule templating

The application deliberately avoids full automatic programme generation in favour of guided human creativity strengthened by targeted AI feedback.

## Tech Stack
Core technologies (current / planned):
- Astro 5 (hybrid SSR / static build framework)
- React 19 (interactive components only where needed)
- TypeScript 5
- Tailwind CSS 4 (utility-first styling)
- Shadcn/ui components (planned integration under `src/components/ui`)
- Supabase (Auth, Database, Realtime) – planned
- Zod (input & DTO validation) – planned

Supporting libraries present:
- class-variance-authority, clsx, tailwind-merge (styling ergonomics)
- lucide-react (icons)
- radix-ui Slot (composition primitive)
- tw-animate-css (animation utilities)

Tooling & Quality:
- ESLint 9 + TypeScript ESLint
- Prettier (with `prettier-plugin-astro`)
- Husky + lint-staged (pre-commit formatting & linting)

Runtime:
- Node.js 22.14.0 (see `.nvmrc`)

## Getting Started Locally

### Prerequisites
- Node.js 22.14.0 (use `nvm install 22.14.0 && nvm use`)
- npm (bundled with Node) or an alternative manager (pnpm / yarn) if you adapt scripts

### Clone & Install
```bash
git clone <your-fork-or-repo-url> loreprogrammer
cd loreprogrammer
nvm use # ensures Node 22.14.0
npm install
```

### Run in Development
```bash
npm run dev
```
Opens a local dev server (default: http://localhost:4321 — Astro will display the exact URL).

### Production Build & Preview
```bash
npm run build
npm run preview
```

### Recommended Workflow
1. Create a feature branch
2. Implement feature with small, focused commits
3. Run `npm run lint` and ensure no errors
4. Optionally add or update documentation / comments
5. Open a Pull Request

### Environment Variables (Upcoming)
Planned future variables (not yet required):
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
```
These will support authentication, group management, real-time updates, and storage once Supabase integration begins.

## Available Scripts
| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Start the Astro development server |
| `npm run build` | Build production output to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the project |
| `npm run lint:fix` | Auto-fix lint issues where possible |
| `npm run format` | Format all code & content with Prettier |

## Project Scope

### Functional Requirements (Planned / PRD)
- Group lifecycle: create, delete, invite via code, define HAL timeframe & lore
- Roles: admin (full), editor (edit assigned activities, view all)
- Activity form (structured fields: title, goal, tasks, time, location, materials, responsible, knowledge scope, participants, flow, summary)
- AI evaluation (on demand): two numeric scores (lore & scouting values 1–10) + textual feedback
- AI reflective questions post-evaluation
- Multi-editor assignment per activity
- Day template & full-camp schedule view
- Real-time updates for group members
- Admin dashboard: progress metrics, task assignment, recent activity stream
- Minimal personal data (login or name only)

### Explicit Boundaries (Out-of-Scope for MVP)
- Full automatic programme generation by AI
- External scenario databases / third-party scouting system integrations
- Advanced reporting for parents / external stakeholders
- Commenting system, PDF export
- Enforced limits on group counts
- Offline support (online-only operation)

## Project Status
Current codebase is a foundational Astro + React + Tailwind scaffold. Feature implementation from the PRD is pending. Below is the planned roadmap derived from user stories:

| Phase | Focus | Selected User Stories |
| ----- | ----- | --------------------- |
| 1 | Auth & Groups | US-001, US-002, US-003, US-012 |
| 2 | Roles & Activities | US-004, US-005, US-013, US-010 (day structure) |
| 3 | AI Evaluation & Suggestions | US-006, US-007 |
| 4 | Realtime & Dashboard | US-008, US-009 |
| 5 | Privacy & Polishing | US-011, performance & accessibility audit |

### Early Success Metrics (Defined in PRD)
- ≥90% of final activities achieve score ≥7 (both dimensions)
- Average iterations to reach ≥7
- % activities scoring 9–10
- User engagement: sessions & time in app
- Number of HAL groups created
- Programme completion rate (>80% activities planned)

### Contribution Guidelines (Interim)
Until a dedicated CONTRIBUTING file exists:
- Follow coding & structural guidelines in `.github/copilot-instructions.md`
- Prefer Astro components for static layout; React only where interactivity is necessary
- Use early returns & guard clauses for clarity
- Plan for Zod schemas when introducing API endpoints

### Temporary Auth Stub
During early development the middleware injects a fixed user id (`DEFAULT_USER_ID`) via `context.locals.user`. Requests to API endpoints (e.g. `POST /api/groups`) therefore assume this user automatically without requiring login. For manual API testing in Postman:
- Set `SUPABASE_URL` and `SUPABASE_KEY` in `.env` so the server can initialize the Supabase client.
- No Authorization header is needed; the server uses the stubbed user id internally.
Replace this stub with real Supabase Auth session handling once authentication is implemented.

## API Endpoints (Implemented)

### POST /api/groups
Create a new programme group (camp). Requires authentication (user id currently passed via `x-user-id` header — placeholder until proper auth session injection).

Request Body (JSON):
```
{
	"name": "Alpha",
	"description": "Summer camp",
	"lore_theme": "Middle Earth",
	"start_date": "2025-07-01",
	"end_date": "2025-07-14",
	"max_members": 40 // optional; if omitted DB default applies
}
```

Validation Rules:
- name: 1..200 chars (trimmed)
- description: 1..2000 chars (trimmed)
- lore_theme: 1..200 chars (trimmed)
- start_date & end_date: format YYYY-MM-DD
- end_date must be >= start_date
- max_members: integer 1..500 (optional)

Success Response (201):
```
{
	"data": {
		"id": "<uuid>",
		"name": "Alpha",
		"description": "Summer camp",
		"lore_theme": "Middle Earth",
		"status": "planning",
		"start_date": "2025-07-01",
		"end_date": "2025-07-14",
		"invite": null,
		"max_members": 40,
		"created_at": "2025-05-01T10:00:00Z",
		"updated_at": "2025-05-01T10:00:00Z",
		"deleted_at": null
	}
}
```

Error Responses:
| Status | Code | When |
| ------ | ---- | ---- |
| 400 | VALIDATION_ERROR | Invalid input fields |
| 400 | DATE_RANGE_INVALID | end_date < start_date |
| 400 | GROUP_LIMIT_REACHED | User exceeded group creation limit |
| 401 | UNAUTHORIZED | Missing or invalid user context |
| 500 | INTERNAL_ERROR | Unexpected server/database failure |

Notes:
- Group membership (admin) is established immediately after creation.
- Invite code related fields are null until rotated/generated via future endpoint.
- Atomicity improvement (transaction/RPC) planned for later to couple group & membership inserts.

### GET /api/groups
List all non-deleted groups ordered by newest first.

Request:
```
GET /api/groups
```
No query parameters yet (future: pagination & filters).

Success Response (200):
```
{
	"data": [
		{
			"id": "<uuid>",
			"name": "Alpha",
			"description": "Summer camp",
			"lore_theme": "Middle Earth",
			"status": "planning",
			"start_date": "2025-07-01",
			"end_date": "2025-07-14",
			"invite": null,
			"max_members": 40,
			"created_at": "2025-05-01T10:00:00Z",
			"updated_at": "2025-05-01T10:00:00Z",
			"deleted_at": null
		}
	],
	"count": 1
}
```

Error Response (500 example):
```
{
	"error": {
		"code": "INTERNAL_ERROR",
		"message": "Failed to list groups"
	}
}
```

Notes:
- Uses temporary auth stub (DEFAULT_USER_ID) only for creation; listing does not require user-specific filtering yet.
- Future enhancements: pagination (cursor or offset), filtering by status, search by name.

### Group Memberships & Roles

Endpoints for managing group members and roles. All responses follow `{ data: ... }` or `{ error: { code, message, details? } }` envelope. Authentication uses middleware stub (`context.locals.user.id`).

#### GET /api/groups/{group_id}/members
List all members of a group. Caller must be a member; otherwise `NOT_FOUND` (existence masked).

Success (200):
```
{ "data": [ { "user_id": "<uuid>", "role": "admin", "joined_at": "2025-05-01T10:00:00Z", "group_id": "<uuid>" } ] }
```
Errors:
| Status | Code | When |
| ------ | ---- | ---- |
| 400 | VALIDATION_ERROR | Invalid UUID format |
| 404 | NOT_FOUND | Caller not a member (masked) |
| 500 | INTERNAL_ERROR | DB failure |

#### PATCH /api/groups/{group_id}/members/{user_id}
Change role of an existing member. Body:
```
{ "role": "admin" | "editor" | "member" }
```
Success (200): returns updated member DTO (or unchanged if idempotent).
Errors:
| Status | Code | When |
| ------ | ---- | ---- |
| 400 | VALIDATION_ERROR | Invalid UUIDs |
| 400 | ROLE_INVALID | Body role outside enum |
| 403 | FORBIDDEN_ROLE | Caller not admin |
| 404 | NOT_FOUND | Member/group not found |
| 409 | LAST_ADMIN_REMOVAL | Trigger prevents losing last admin |
| 500 | INTERNAL_ERROR | Update failure |

#### DELETE /api/groups/{group_id}/members/{user_id}
Remove a member (self or admin). Success (200) returns removed member DTO.
Errors similar to PATCH (without ROLE_INVALID unless body expected) plus LAST_ADMIN_REMOVAL when deleting last admin.

#### POST /api/groups/{group_id}/members/{user_id}/promote
Promote member to admin. Idempotent if already admin (200).
Errors align with PATCH (excluding LAST_ADMIN_REMOVAL on promote — trigger not relevant).

Status Mapping Summary:
| Code | HTTP |
| ---- | ---- |
| UNAUTHORIZED | 401 |
| FORBIDDEN_ROLE | 403 |
| NOT_FOUND | 404 |
| VALIDATION_ERROR / ROLE_INVALID | 400 |
| LAST_ADMIN_REMOVAL | 409 |
| INTERNAL_ERROR | 500 |

Future Enhancements:
- Pagination & role filtering for GET members
- Bulk role changes
- Audit trail of membership modifications
- Replace stub auth with Supabase session handling

### Activity Editors (New)

Manage explicit editor assignments for an activity. Admins can grant/revoke edit rights; any group member can list editors. Editor assignments will gate future update permissions for non-admin users.

#### GET /api/activities/{activity_id}/editors
List all editor assignments.

Success (200):
```
{ "data": [ { "activity_id": "<uuid>", "user_id": "<uuid>", "assigned_at": "2025-10-26T12:34:56Z", "assigned_by_user_id": "<uuid>" } ] }
```
Errors:
| Status | Code | When |
| ------ | ---- | ---- |
| 400 | VALIDATION_ERROR | Invalid activity_id UUID |
| 400 | USER_NOT_IN_GROUP | Caller not a member of activity's group |
| 401 | UNAUTHORIZED | Missing auth (stub user absent) |
| 404 | ACTIVITY_NOT_FOUND | Activity does not exist or is soft-deleted |
| 500 | INTERNAL_ERROR | Database failure |

#### POST /api/activities/{activity_id}/editors
Assign a new editor (admin only).

Request Body:
```
{ "user_id": "<uuid>" }
```
Success (201):
```
{ "data": { "activity_id": "<uuid>", "user_id": "<uuid>", "assigned_at": "2025-10-26T12:34:56Z", "assigned_by_user_id": "<uuid>" } }
```
Errors:
| Status | Code | When |
| ------ | ---- | ---- |
| 400 | VALIDATION_ERROR | Body invalid (user_id not UUID) |
| 400 | USER_NOT_IN_GROUP | Target user not in group |
| 401 | UNAUTHORIZED | Missing auth |
| 403 | FORBIDDEN_ROLE | Caller not admin |
| 404 | ACTIVITY_NOT_FOUND | Activity missing / deleted |
| 409 | ALREADY_ASSIGNED | Duplicate assignment |
| 409 | CONFLICT | Other insertion conflict |
| 500 | INTERNAL_ERROR | Database failure |

#### DELETE /api/activities/{activity_id}/editors/{user_id}
Remove an existing editor assignment (admin only).

Success (200):
```
{ "data": { "activity_id": "<uuid>", "user_id": "<uuid>" } }
```
Errors:
| Status | Code | When |
| ------ | ---- | ---- |
| 400 | VALIDATION_ERROR | Invalid path UUID(s) |
| 400 | USER_NOT_IN_GROUP | Caller not in group |
| 401 | UNAUTHORIZED | Missing auth |
| 403 | FORBIDDEN_ROLE | Caller not admin |
| 404 | ACTIVITY_NOT_FOUND | Activity missing / deleted |
| 404 | NOT_FOUND | Editor assignment does not exist |
| 500 | INTERNAL_ERROR | Database failure |

Status Mapping Summary (Editors):
| Code | HTTP |
| ---- | ---- |
| UNAUTHORIZED | 401 |
| FORBIDDEN_ROLE | 403 |
| ACTIVITY_NOT_FOUND / NOT_FOUND | 404 |
| VALIDATION_ERROR / USER_NOT_IN_GROUP / BAD_REQUEST | 400 |
| ALREADY_ASSIGNED / CONFLICT | 409 |
| INTERNAL_ERROR | 500 |

### Camp Days (New)

Manage logical camp programme days within a group's date range. Each day has a sequential `day_number` (1..30), a `date` within the group's start/end range, and an optional `theme`.

#### POST /api/groups/{group_id}/camp-days
Create a new camp day (admin only).

Body:
```
{ "day_number": 1, "date": "2025-07-01", "theme": "Arrival & Setup" }
```
Business Rules:
- `day_number` 1..30 (else `DAY_OUT_OF_RANGE` 400)
- `date` must fall within group's `start_date`..`end_date` (else `DATE_OUT_OF_GROUP_RANGE` 400)
- `(group_id, day_number)` unique (duplicate => `DUPLICATE_DAY_NUMBER` 409)

Success (201): `{ "data": { "id": "<uuid>", "group_id": "<uuid>", "day_number": 1, "date": "2025-07-01", "theme": "Arrival & Setup", "created_at": "...", "updated_at": "..." } }`

Errors:
| Status | Code | When |
| ------ | ---- | ---- |
| 400 | VALIDATION_ERROR | Schema validation failed |
| 400 | DAY_OUT_OF_RANGE | day_number outside 1..30 |
| 400 | DATE_OUT_OF_GROUP_RANGE | date outside group range |
| 401 | UNAUTHORIZED | Caller not authenticated (stub missing) |
| 403 | FORBIDDEN_ROLE | Caller not admin |
| 404 | NOT_FOUND | Group not found / masked |
| 409 | DUPLICATE_DAY_NUMBER | day_number already exists |
| 500 | INTERNAL_ERROR | Unexpected failure |

#### GET /api/groups/{group_id}/camp-days
List all camp days (any group member). Ordered by ascending `day_number`.

Success (200): `{ "data": [ CampDayDTO... ], "count": <n> }`

Errors (subset): `UNAUTHORIZED` 401, `NOT_FOUND` 404 (group masked), `INTERNAL_ERROR` 500.

#### GET /api/camp-days/{camp_day_id}
Fetch a single camp day (members only).

Success (200): `{ "data": CampDayDTO }`

Errors: `VALIDATION_ERROR` (invalid UUID), `NOT_FOUND`, `UNAUTHORIZED`, `INTERNAL_ERROR`.

#### PATCH /api/camp-days/{camp_day_id}
Update mutable fields (`date`, `theme`) (admin only). Omitting fields results in no-op.

Body (example): `{ "date": "2025-07-02", "theme": null }`

Success (200): Updated DTO.

Errors: `DATE_OUT_OF_GROUP_RANGE` 400, `FORBIDDEN_ROLE` 403, plus standard ones.

#### DELETE /api/camp-days/{camp_day_id}
Hard delete camp day (admin only).

Success (200): `{ "data": { "id": "<uuid>" } }`

Errors: `FORBIDDEN_ROLE` 403, `NOT_FOUND` 404, etc.

Status Mapping Summary (Camp Days):
| Code | HTTP |
| ---- | ---- |
| VALIDATION_ERROR / DAY_OUT_OF_RANGE / DATE_OUT_OF_GROUP_RANGE | 400 |
| UNAUTHORIZED | 401 |
| FORBIDDEN_ROLE | 403 |
| NOT_FOUND | 404 |
| DUPLICATE_DAY_NUMBER | 409 |
| INTERNAL_ERROR | 500 |

Notes:
- Camp days are physically deleted (no soft delete) per plan.
- Empty PATCH body returns existing DTO unchanged.
- `theme: null` clears the theme.
- Range checks performed before insert/update to produce domain-specific error codes.

### AI Evaluations (New)

Versioned AI feedback for activities. Evaluation requests are queued asynchronously; client polls until a new version appears.

#### POST /api/activities/{activity_id}/ai-evaluations
Queue a new AI evaluation for the activity.

Constraints:
- Caller must be group member AND (admin OR assigned editor).
- Cooldown: minimum 5 minutes between requests (429 AI_EVALUATION_COOLDOWN).
- Body must be an empty object `{}` (any other content ⇒ VALIDATION_ERROR).

Request:
```bash
curl -X POST \
	http://localhost:4321/api/activities/ACTIVITY_UUID/ai-evaluations \
	-H 'Accept: application/json' \
	-d '{}'
```

Success (202):
```json
{ "data": { "queued": true, "next_poll_after_sec": 5 } }
```

Errors:
| Status | Code | When |
| ------ | ---- | ---- |
| 400 | VALIDATION_ERROR | Invalid UUID / body not empty object |
| 401 | UNAUTHORIZED | Not authenticated |
| 403 | FORBIDDEN_ROLE | Not admin nor assigned editor |
| 404 | ACTIVITY_NOT_FOUND | Activity missing / deleted |
| 429 | AI_EVALUATION_COOLDOWN | Cooldown active |
| 500 | INTERNAL_ERROR | RPC / DB failure |

#### GET /api/activities/{activity_id}/ai-evaluations
List all AI evaluation versions for the activity (newest first).

```bash
curl -X GET \
	http://localhost:4321/api/activities/ACTIVITY_UUID/ai-evaluations \
	-H 'Accept: application/json'
```

Success (200):
```json
{ "data": [ { "id": "<uuid>", "activity_id": "<uuid>", "version": 1, "lore_score": 7, "scouting_values_score": 8, "lore_feedback": "...", "scouting_feedback": "...", "tokens": 1234, "created_at": "2025-10-26T12:34:56Z", "suggestions": ["Refine objectives"] } ] }
```

Errors:
| Status | Code | When |
| ------ | ---- | ---- |
| 400 | VALIDATION_ERROR | Invalid activity_id UUID |
| 401 | UNAUTHORIZED | Not authenticated |
| 404 | ACTIVITY_NOT_FOUND | Activity missing / deleted |
| 500 | INTERNAL_ERROR | Database failure |

#### GET /api/ai-evaluations/{evaluation_id}
Fetch a single AI evaluation by its UUID.

```bash
curl -X GET \
	http://localhost:4321/api/ai-evaluations/EVALUATION_UUID \
	-H 'Accept: application/json'
```

Success (200):
```json
{ "data": { "id": "<uuid>", "activity_id": "<uuid>", "version": 2, "lore_score": 9, "scouting_values_score": 8, "lore_feedback": "Strong thematic consistency.", "scouting_feedback": "Excellent alignment with values.", "tokens": 1450, "created_at": "2025-10-26T12:40:00Z", "suggestions": ["Shorten intro", "Clarify materials"] } }
```

Errors:
| Status | Code | When |
| ------ | ---- | ---- |
| 400 | VALIDATION_ERROR | Invalid evaluation_id UUID |
| 401 | UNAUTHORIZED | Not authenticated |
| 404 | NOT_FOUND | Evaluation or activity not visible to caller |
| 500 | INTERNAL_ERROR | Database failure |

Polling Strategy Example:
```bash
# Request evaluation
curl -X POST http://localhost:4321/api/activities/ACTIVITY_UUID/ai-evaluations -d '{}' -H 'Accept: application/json'

# Poll every 5s until a new version appears
watch -n 5 curl -s http://localhost:4321/api/activities/ACTIVITY_UUID/ai-evaluations | jq '.data[0]'
```

Future Enhancements (planned):
- Include request ID in POST response
- SSE/WebSocket push when evaluation completes
- Adjustable model parameters (temperature, model) with admin controls
- Expose queue request statuses endpoint

Testing Examples (curl):
```
curl -X GET http://localhost:3000/api/activities/<activity_id>/editors -H 'Accept: application/json'
curl -X POST http://localhost:3000/api/activities/<activity_id>/editors -H 'Content-Type: application/json' -d '{"user_id":"<uuid>"}'
curl -X DELETE http://localhost:3000/api/activities/<activity_id>/editors/<user_id> -H 'Accept: application/json'
```

### Group Tasks (New)

Lightweight task tracking within a group, optionally linked to an activity (`activity_id`). Status workflow is simple (`pending` → `in_progress` → `done` or `canceled`) without enforced transitions.

#### Data Model (DTO)
```
GroupTaskDTO {
	id: string;
	group_id: string;
	activity_id: string | null; // optional link
	title: string; // 1..200 chars
	description: string; // 1..4000 chars
	due_date: YYYY-MM-DD | null;
	status: "pending" | "in_progress" | "done" | "canceled";
	created_at: ISO timestamp;
	updated_at: ISO timestamp;
}
```

#### POST /api/groups/{group_id}/tasks
Create a new task (admin or editor role).

Body example:
```
{ "title": "Prepare materials", "description": "Gather all needed items", "due_date": "2025-11-05" }
```
Optional `activity_id` may be included; it must exist and belong to the same group.

Validation:
| Field | Rules |
|-------|-------|
| title | trimmed, 1..200 |
| description | trimmed, 1..4000 |
| due_date | YYYY-MM-DD or null omitted |
| activity_id | UUID or null |

Success (201): `{ "data": GroupTaskDTO }`

Errors (selection):
| Status | Code | Notes |
|--------|------|-------|
| 400 | VALIDATION_ERROR | Schema/body invalid |
| 400 | BAD_REQUEST | `activity_id` mismatched_group / not_found details |
| 401 | UNAUTHORIZED | Caller not member |
| 403 | FORBIDDEN_ROLE | Role not admin/editor |
| 404 | NOT_FOUND | Group masked (if membership pattern evolves) |
| 500 | INTERNAL_ERROR | Insert failure |

#### GET /api/groups/{group_id}/tasks
List tasks for a group (any member). Supports filters & cursor pagination.

Query Params:
| Param | Type | Description |
|-------|------|-------------|
| status | enum | Filter by status |
| activity_id | UUID | Filter tasks linked to activity |
| limit | int 1..100 | Page size (default 20) |
| cursor | string (opaque) | From previous page `nextCursor` |

Cursor Format: base64 encoding of `created_at|id`.

Success (200): `{ "data": GroupTaskDTO[], "nextCursor": "..." }`

#### GET /api/tasks/{task_id}
Fetch a single task. Caller must be a group member.

Success (200): `{ "data": GroupTaskDTO }`
Errors: `VALIDATION_ERROR` (bad UUID), `TASK_NOT_FOUND`, `UNAUTHORIZED`, `INTERNAL_ERROR`.

#### PATCH /api/tasks/{task_id}
Partial update (admin/editor). Any subset of fields allowed, at least one required.

Body example:
```
{ "status": "in_progress", "due_date": "2025-12-01" }
```
Special cases:
- `activity_id: null` removes association.
- Changing `activity_id` validates existence + same group.

Success (200): Updated `GroupTaskDTO` (idempotent if values unchanged).
Errors include `BAD_REQUEST` (activity mismatch / not_found) & standard codes.

#### DELETE /api/tasks/{task_id}
Hard delete task (admin/editor).

Success (200): `{ "data": { "id": "<uuid>" } }`
Errors: `TASK_NOT_FOUND`, `FORBIDDEN_ROLE`, `UNAUTHORIZED`, `INTERNAL_ERROR`.

#### Status Mapping Summary (Group Tasks)
| Code | HTTP |
|------|------|
| VALIDATION_ERROR / BAD_REQUEST | 400 |
| UNAUTHORIZED | 401 |
| FORBIDDEN_ROLE | 403 |
| TASK_NOT_FOUND | 404 |
| CONFLICT | 409 |
| INTERNAL_ERROR | 500 |

#### Example curl
```bash
# List tasks
curl -X GET http://localhost:3000/api/groups/<group_id>/tasks -H 'Accept: application/json'

# Create task
curl -X POST http://localhost:3000/api/groups/<group_id>/tasks -H 'Content-Type: application/json' \\
	-d '{"title":"Prepare materials","description":"Gather all needed items","due_date":"2025-11-05"}'

# Get single task
curl -X GET http://localhost:3000/api/tasks/<task_id> -H 'Accept: application/json'

# Update status
curl -X PATCH http://localhost:3000/api/tasks/<task_id> -H 'Content-Type: application/json' \\
	-d '{"status":"in_progress"}'

# Delete task
curl -X DELETE http://localhost:3000/api/tasks/<task_id> -H 'Accept: application/json'
```

## License
MIT License. See the LICENSE file (to be added) or include one when forking.

---

Need something that is not covered yet? Open an issue describing the use case and referencing relevant PRD sections.

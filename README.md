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

## License
MIT License. See the LICENSE file (to be added) or include one when forking.

---

Need something that is not covered yet? Open an issue describing the use case and referencing relevant PRD sections.

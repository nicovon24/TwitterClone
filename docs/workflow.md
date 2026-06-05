# Workflow

## The Rule: SPEC → PLAN → CODE → REVIEW

Every feature, endpoint, or schema change starts with a written specification. **No plan without a spec first. No code without a plan first.**

### The Four Roles (separate Claude sessions)

| Role | Output | When to use |
|---|---|---|
| **Architect** | SPEC + PLAN | New feature, new endpoint, schema change, auth flow |
| **Developer** | Code + atomic commits | Any code change |
| **Reviewer** | BLOCK / FLAG / NOTE | After Developer finishes |
| *(collapse all)* | Single session | Typo, copy change, single-file tweak |

### SPEC Template (`docs/specs/NNN-feature-name.md`)

```markdown
# SPEC: [Feature Name]
## Context — why this is being built
## Requirements — bullet list of what it must do
## Acceptance Criteria — [ ] concrete, testable conditions
## Out of Scope — what this does NOT cover
## Affected files (estimated)
```

### Full flow for any non-trivial change

```
Idea → [Architect session] SPEC + PLAN → human approval
     → [Developer session] code + commits
     → [Reviewer session] BLOCK / FLAG / NOTE
     → human approves → git push
```

---

## Build Phases

This project uses a phase-based execution model. Each phase has a clear goal, deliverables, and a verification step before moving to the next.

---

## Phases

### Phase 0 — Documentation Base ✅
**Goal:** Every doc file exists before a line of code is written.

Deliverables:
- `AGENTS.md` — session protocol and invariants
- `docs/vision.md` — product scope
- `docs/architecture.md` — ADRs
- `docs/current.md` — active session tracker
- `docs/changelog.md` — shipped history
- `docs/workflow.md` — this file
- `docs/infrastructure.md` — Docker and env vars
- `docs/api.md` — REST endpoint reference
- `docs/testing.md` — testing strategy

Commit: `chore: docs base (AGENTS, vision, architecture, api, testing, infrastructure)`

---

### Phase 1 — Scaffolding & Infrastructure
**Goal:** Monorepo running, Docker up, DB connected, migrations applied.

Deliverables:
- `backend/` with Express + TypeScript + Drizzle configured
- `frontend/` with Next.js 14 App Router configured
- `docker-compose.yml` (postgres + backend + frontend)
- `backend/src/db/schema.ts` — users, tweets, follows, likes
- `backend/src/env.ts` — typed env vars
- `.env.example` — all variables documented
- Initial drizzle-kit migration applied

Commits:
```
chore: backend scaffold (Express + TypeScript + Drizzle)
chore: frontend scaffold (Next.js 14 App Router + Tailwind)
chore: docker-compose with postgres service
feat: db schema (users, tweets, follows, likes) and initial migration
```

Verification: `docker compose up` starts all services, backend responds on :4000, frontend on :3000, DB accepts connections.

---

### Phase 2 — Backend: API Core
**Goal:** All REST endpoints implemented, auth working end-to-end.

Deliverables:
- Auth routes: register, login, logout, me
- Tweet routes: create, delete (soft), timeline (cursor paginated)
- Follow routes: follow, unfollow, followers list, following list
- Like routes: like, unlike
- User routes: profile, search
- SSE route: timeline stream
- `requireAuth` middleware
- Global error handler
- Zod validation on all POST/DELETE body inputs

Commits (one per feature group):
```
feat: auth endpoints (register, login, logout, me)
test: auth integration tests
feat: tweets CRUD and timeline endpoint
test: tweets and timeline integration tests
feat: follows and likes endpoints
test: follows and likes integration tests
feat: user profile and search endpoints
test: user search integration tests
feat: SSE endpoint for real-time timeline
```

Verification: All integration tests pass. Manually hit endpoints with a REST client.

---

### Phase 3 — Frontend: UI Core
**Goal:** Complete UI working end-to-end, responsive on mobile and desktop.

Deliverables:
- Auth pages: login, register (with redirect if already logged in)
- Timeline page: tweet list with infinite scroll via Intersection Observer
- Tweet composer: textarea with 280-char counter, submit button
- User profile page: tweets tab, followers tab, following tab, follow/unfollow button
- Search page: user search with debounced input
- Layout: sidebar for desktop, bottom nav for mobile
- Axios instance with JWT interceptor (auto-add token, 401 → logout)
- Zustand store: auth state, timeline state

Commits:
```
feat: frontend auth pages (login, register)
feat: timeline page with tweet composer and infinite scroll
feat: user profile page with follow/unfollow
feat: search page
feat: responsive layout (sidebar + mobile bottom nav)
```

Verification: Full happy path usable in browser at mobile (375px) and desktop (1440px) widths.

---

### Phase 4 — Testing
**Goal:** ≥80% backend coverage, frontend integration tests, E2E happy path.

Deliverables:
- Backend: 6 integration test suites (auth, tweets, timeline, follows, likes, search)
- Frontend: 3 integration tests (login flow, create tweet, follow/unfollow)
- E2E: Playwright — register → login → create tweet → follow user → logout

Commits:
```
test: frontend integration tests (login, tweet, follow)
test: playwright e2e auth and main happy path
```

Verification: `npm run test` in backend shows ≥80% coverage. All frontend tests pass.

---

### Phase 5 — Bonus: SSE Real-time
**Goal:** New tweets appear in the timeline without page refresh.

Deliverables:
- Backend SSE connection management (keep-alive, client registry per user)
- Backend pushes tweet payload to follower SSE connections on tweet creation
- `useTimelineStream` hook in frontend with `EventSource`
- New tweet prepended to timeline on SSE message received

Commits:
```
feat: SSE real-time timeline updates (backend push + frontend hook)
```

Verification: Open two browser tabs (different accounts), post a tweet in one, see it appear in the other within 1s.

---

### Phase 6 — Seed + README/Runbook
**Goal:** App fully demonstrable from zero with one command. Runbook is evaluator-ready.

Deliverables:
- `backend/src/db/seed.ts` — 10 users, ~50 tweets, ~40 follows, ~100 likes
- Seed script in `package.json`: `npm run db:seed`
- `README.md` — complete runbook (prerequisites, install, seed, run, test, env vars, credentials, architecture decisions)
- Docker Compose polished for one-command startup: `docker compose up --build`

Commits:
```
chore: seed data (10 users, tweets, follows, likes)
docs: README runbook with setup, credentials, and architecture decisions
chore: docker-compose polish for one-command full-stack startup
```

Verification: Follow the README runbook from scratch on a clean machine (or clean Docker context). App is usable immediately after `docker compose up --build && npm run db:seed`.

---

## Execution Commands

```bash
# Start everything
docker compose up --build

# Backend only (local dev)
cd backend && npm run dev

# Frontend only (local dev)
cd frontend && npm run dev

# Run seed
cd backend && npm run db:seed

# Run migrations
cd backend && npm run db:migrate

# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run E2E tests
npm run test:e2e   # from root
```

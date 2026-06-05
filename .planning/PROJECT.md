# ClonTwitter — TheFlock AI Verified

## What This Is

A Twitter/X clone built for the TheFlock AI Verified certification challenge. It lets users register, post tweets, follow other users, like tweets, and see a real-time timeline of followed accounts. The stack is Next.js 14 App Router (frontend) + Node.js/Express + Drizzle ORM + PostgreSQL (backend), structured as a dual-package.json monorepo.

## Core Value

A working authenticated timeline — a logged-in user must be able to post, follow others, and see those tweets in their feed in real time.

## Requirements

### Validated

✓ Documentation base (AGENTS.md, ADRs 001–007, vision, architecture, api, testing, database, infrastructure, workflow) — Phase 0

### Active

- [ ] **Monorepo scaffolding** — `backend/package.json` and `frontend/package.json` with all dependencies, TypeScript config, docker-compose.yml, .env.example
- [ ] **Database schema** — Drizzle schema for `users`, `tweets`, `follows`, `likes`; auto-run migrations on startup
- [ ] **Auth API** — POST /auth/register, /auth/login, /auth/logout, GET /auth/me; JWT 15-min access + 30-day refresh stored in localStorage; Axios interceptor auto-refreshes on 401
- [ ] **Tweets API** — POST /tweets (max 280 chars), DELETE /tweets/:id (soft delete via `deleted_at`), GET /timeline (cursor pagination)
- [ ] **Follows API** — POST /users/:id/follow, DELETE /users/:id/follow; unique constraint (follower_id, following_id); no self-follow
- [ ] **Likes API** — POST /tweets/:id/like, DELETE /tweets/:id/like; unique constraint (user_id, tweet_id)
- [ ] **Search API** — GET /search/users (username prefix match)
- [ ] **SSE real-time timeline** — GET /timeline/stream; pushes new tweets from followed users to connected clients
- [ ] **Frontend UI** — Login/register page, timeline feed, compose tweet, follow/unfollow button, user profile, search bar; responsive, UI text in Spanish
- [ ] **Integration tests** — 6 backend suites (auth, tweets, follows, likes, timeline, search) against real PostgreSQL using Vitest + Supertest; ≥80% line coverage
- [ ] **Frontend tests** — 3 Vitest + Testing Library suites (login, tweet compose/delete, follow/unfollow)
- [ ] **Playwright E2E** — `happy-path.spec.ts` @smoke: register → login → tweet → follow → logout
- [ ] **Seed data + README runbook** — evaluator can run `docker compose up` and reach a working app; README documents every command

### Out of Scope

- Turborepo / Nx / pnpm workspaces — dual package.json is sufficient for this scope; added tooling is not required by the challenge
- WebSockets — SSE is unidirectional and simpler; real-time requirement is timeline push only
- Image/media uploads — challenge spec covers text tweets only
- Notifications beyond SSE timeline — no in-app notification center required
- DMs / direct messages — not in the challenge spec
- Retweets / quotes — not in the challenge spec
- OAuth / social login — JWT with email+password is what the spec calls for
- Offset-based pagination — cursor pagination is mandated in ADR-003; offset is unstable under concurrent inserts

## Context

- Challenge: TheFlock AI Verified certification. The evaluator runs the project locally with `docker compose up` and exercises the happy path. A clean README runbook is mandatory.
- Phase 0 (documentation) is complete. All architectural decisions are recorded in `docs/decisions/` (ADRs 001–007). All 19 API endpoints are fully spec'd in `docs/api.md`.
- `backend/` and `frontend/` directories exist but contain no code yet — Phase 1 starts from empty directories.
- Language convention: all code and documentation in English; all UI-facing text in Spanish.
- Database: PostgreSQL 16. UUIDs as PKs (prevents enumeration). Soft deletes on tweets (`deleted_at`). Composite PKs on `follows` and `likes` enforce uniqueness at DB level.
- Refresh token is hashed and stored in the `users` table (single active session per user); logout invalidates it.

## Constraints

- **Tech Stack**: Next.js 14 App Router, Node.js/Express, Drizzle ORM, PostgreSQL 16 — mandated by challenge spec; no substitutions
- **Auth**: JWT in localStorage (not httpOnly cookies) — required by challenge; access token 15 min, refresh token 30 days
- **Monorepo**: Dual package.json at `backend/` and `frontend/`; no workspace manager — per ADR-005
- **Pagination**: Cursor-based only — per ADR-003; offset pagination must not be used
- **Test database**: Integration tests must hit a real PostgreSQL instance (no mocks) — per ADR-007; prevents mock/prod divergence
- **Coverage**: Backend integration tests must reach ≥80% line coverage — evaluator requirement
- **Ports**: PostgreSQL :5432, Express :4000, Next.js :3000 — documented in infrastructure.md; evaluator expects these defaults

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| JWT in localStorage (not cookies) | Cross-origin simplicity; challenge explicitly specifies this | — Pending |
| Cursor pagination for timeline | Stable under concurrent inserts; offset causes duplicate/skipped tweets | — Pending |
| SSE over WebSockets for real-time | Unidirectional push is sufficient; simpler server setup, no upgrade handshake | — Pending |
| Drizzle ORM over Prisma/TypeORM | Minimal abstraction, fully type-safe, SQL-close mental model | — Pending |
| No turborepo | Scope doesn't justify the tooling overhead; `npm --prefix` scripts are enough | — Pending |
| Real PostgreSQL in tests | Mocks masked a prod migration failure in prior experience; integration fidelity is required | — Pending |
| Soft delete tweets | Preserves like/follow counts and audit trail; hard delete breaks referential consistency | — Pending |
| UUIDs as PKs | Prevents sequential ID enumeration attacks on public endpoints | — Pending |

---
*Last updated: 2026-06-04 after Phase 0 completion (documentation base) / PROJECT.md initialization*

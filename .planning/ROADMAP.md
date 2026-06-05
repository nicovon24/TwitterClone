# Roadmap: ClonTwitter

**Project:** ClonTwitter — TheFlock AI Verified
**Updated:** 2026-06-04
**Status:** Phase 1 — Pending

---

## Phase 1 — Scaffolding & Infrastructure

**Goal:** Monorepo running, Docker up, DB connected, migrations applied, env vars validated.

**Requirements:** INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, PROF-03, ERRH-01, ERRH-02, ERRH-03, ERRH-04, L10N-02

**Deliverables:**
- `backend/` with Express + TypeScript + Drizzle configured
- `frontend/` with Next.js 14 App Router + Tailwind configured
- `docker-compose.yml` (postgres + backend + frontend services)
- `backend/src/db/schema.ts` — users, tweets, follows, likes (Drizzle schema)
- `backend/src/env.ts` — typed env vars with fail-fast validation
- `backend/src/app.ts` — Express app with error handler and request logger
- `.env.example` — all variables documented with examples
- Initial drizzle-kit migration generated and applied on startup

**Verification:** `docker compose up --build` starts all services; backend responds on :4000 with `GET /health → 200`; frontend loads on :3000; DB accepts connections; migrations applied automatically.

---

## Phase 2 — Backend: Auth + Core API

**Goal:** All REST endpoints implemented, auth working end-to-end, integration tests passing.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, SOCL-01, SOCL-02, SOCL-03, SOCL-04, SOCL-05, LIKE-01, LIKE-02, LIKE-03, LIKE-04, TMEL-01, TMEL-02, TMEL-03, TMEL-04, SRCH-01, SRCH-02, PROF-01, PROF-02

**Deliverables:**
- Auth routes: POST /auth/register, /auth/login, /auth/logout, /auth/refresh; GET /auth/me
- Tweet routes: POST /tweets, DELETE /tweets/:id (soft), GET /timeline (cursor paginated)
- Follow routes: POST /users/:id/follow, DELETE /users/:id/follow, GET /users/:id/followers, GET /users/:id/following
- Like routes: POST /tweets/:id/like, DELETE /tweets/:id/like
- User routes: GET /users/:id/profile, GET /search/users
- `requireAuth` middleware (JWT validation)
- Global error handler (JSON `{ error: string }`, no stack traces in prod)
- Zod validation on all inputs
- 6 backend integration test suites (auth, tweets, follows, likes, timeline, search)

**Verification:** All integration tests pass; `npm test` in `backend/` shows ≥80% coverage.

---

## Phase 3 — Frontend: UI Core

**Goal:** Complete UI working end-to-end, responsive on mobile and desktop, all text in Spanish.

**Requirements:** REAL-01, REAL-02, REAL-03, REAL-04, L10N-01

**Deliverables:**
- Auth pages: login, register (redirect if already logged in)
- Timeline page: tweet list with infinite scroll (Intersection Observer)
- Tweet composer: textarea with 280-char counter, submit button
- User profile page: tweets tab, followers/following count, follow/unfollow button
- Search page: user search with debounced input
- Layout: sidebar for desktop, bottom nav for mobile
- Axios instance with JWT interceptor (auto-add token, 401 → refresh → retry)
- Zustand store: auth state
- SSE `useTimelineStream` hook: new tweets prepend to feed live
- 3 frontend unit test suites (login flow, tweet compose/delete, follow/unfollow)

**Verification:** Full happy path usable in browser at 375px and 1440px widths; SSE updates appear within 1s.

---

## Phase 4 — Testing & Seed + README

**Goal:** ≥80% backend coverage, E2E happy path passing, app fully demonstrable from zero.

**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, INFR-03

**Deliverables:**
- Playwright E2E `happy-path.spec.ts` @smoke: register → login → post tweet → follow user → logout
- `backend/src/db/seed.ts` — 10 users, ~50 tweets, ~40 follows, ~100 likes
- Seed script: `npm run db:seed`
- `README.md` — complete runbook: prerequisites, `docker compose up --build`, seed, access, test, env vars, credentials, architecture decisions

**Verification:** `npm run test:e2e` passes; `docker compose up --build && npm run db:seed` from a clean machine produces a working app.

---

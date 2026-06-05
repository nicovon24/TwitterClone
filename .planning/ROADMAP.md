# Roadmap — ClonTwitter

**4 phases** | **48 requirements mapped** | All v1 requirements covered ✓

## Overview

| # | Phase | Goal | Requirements | Plans |
|---|-------|------|--------------|-------|
| 1 | Scaffolding & Infrastructure | Monorepo running, Docker up, DB connected, migrations applied | INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, PROF-03, ERRH-01, ERRH-02, ERRH-03, ERRH-04, L10N-02 | 3 |
| 2 | Backend: Auth + Core API | All REST endpoints implemented, auth working end-to-end, integration tests passing | AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, SOCL-01, SOCL-02, SOCL-03, SOCL-04, SOCL-05, LIKE-01, LIKE-02, LIKE-03, LIKE-04, TMEL-01, TMEL-02, TMEL-03, TMEL-04, SRCH-01, SRCH-02, PROF-01, PROF-02 | 0 |
| 3 | Frontend: UI Core | Complete UI working end-to-end, responsive, all text in Spanish, SSE real-time | REAL-01, REAL-02, REAL-03, REAL-04, L10N-01, TEST-03 | 0 |
| 4 | Testing & Seed + README | E2E happy path passing, seed data, app fully demonstrable from zero | TEST-01, TEST-02, TEST-04, TEST-05, INFR-03 | 0 |

---

## Phase 1: Scaffolding & Infrastructure

**Goal:** Monorepo running, Docker up, DB connected, migrations applied, env vars validated.

**Requirements:** INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, PROF-03, ERRH-01, ERRH-02, ERRH-03, ERRH-04, L10N-02

**UI hint:** no

**Plans:** 3 plans

- [ ] 01-PLAN-backend-scaffold.md (wave 1) — Express + TypeScript + Drizzle schema, env validation, migrations, error handler, request logging
- [ ] 01-PLAN-frontend-scaffold.md (wave 1) — Next.js 14 + Tailwind, Axios auto-refresh instance, Zustand auth store
- [ ] 01-PLAN-docker-env.md (wave 2) — Docker Compose (3 services), Dockerfiles, .env.example, .gitignore, README runbook

### Plan 1.1 — Backend Scaffold (Express + TypeScript + Drizzle)

**Goal:** Backend boots on :4000 with typed env vars, Drizzle schema, and request logging.

**Tasks:**
1. Create `backend/package.json` with all deps: express, drizzle-orm, drizzle-kit, postgres (pg), dotenv, zod, bcrypt, jsonwebtoken, morgan, uuid; devDeps: typescript, ts-node, nodemon, @types/*
2. Create `backend/tsconfig.json` — target ES2020, module CommonJS, strict true, outDir dist
3. Create `backend/src/env.ts` — validate required vars with zod (DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET, PORT); `process.exit(1)` if any missing
4. Create `backend/src/db/index.ts` — postgres connection pool using DATABASE_URL from env
5. Create `backend/src/db/schema.ts` — Drizzle schema for users, tweets, follows, likes (per docs/database.md)
6. Create `backend/drizzle.config.ts` — drizzle-kit config pointing to schema.ts and migrations/ folder
7. Create `backend/src/app.ts` — Express app with morgan logger, JSON body parser, placeholder router
8. Create `backend/src/index.ts` — imports env.ts first, runs migrations via drizzle-kit, starts server on PORT
9. Add scripts to `backend/package.json`: dev (nodemon), build, start, db:migrate, db:seed (placeholder)

**Verification:**
- `cd backend && npm install && npm run dev` starts without errors
- GET :4000 returns 404 (no routes yet — expected)
- `npm run db:migrate` applies migrations without error

### Plan 1.2 — Frontend Scaffold (Next.js 14 App Router + Tailwind)

**Goal:** Frontend boots on :3000 with Axios instance and Zustand auth store configured.

**Tasks:**
1. Create `frontend/package.json` with all deps: next@14, react, react-dom, axios, zustand, tailwindcss, postcss, autoprefixer; devDeps: typescript, @types/react, @types/node, eslint, eslint-config-next
2. Create `frontend/tsconfig.json` — Next.js defaults with strict true
3. Create `frontend/tailwind.config.ts` and `frontend/postcss.config.js`
4. Create `frontend/src/app/layout.tsx` — root layout with Tailwind globals
5. Create `frontend/src/app/page.tsx` — placeholder home page (redirect to /login if not authed)
6. Create `frontend/src/lib/api.ts` — Axios instance with baseURL from NEXT_PUBLIC_API_URL; request interceptor adds `Authorization: Bearer <token>` from localStorage; response interceptor: on 401 → call POST /auth/refresh → retry original request; on refresh failure → clear localStorage and redirect to /login
7. Create `frontend/src/store/authStore.ts` — Zustand store: `{ user, accessToken, setAuth, clearAuth }`
8. Create `frontend/next.config.js` — basic config, no rewrites needed

**Verification:**
- `cd frontend && npm install && npm run dev` starts on :3000
- Page renders without errors; console shows no missing env var warnings

### Plan 1.3 — Docker Compose + .env.example

**Goal:** `docker compose up --build` starts all three services and they talk to each other.

**Tasks:**
1. Create `docker-compose.yml` at root — three services: postgres (image: postgres:16, port 5432, healthcheck), backend (build: ./backend, port 4000, depends_on postgres, env_file .env), frontend (build: ./frontend, port 3000, depends_on backend, env_file .env)
2. Create `backend/Dockerfile` — node:20-alpine, COPY package*.json, npm ci, COPY src, build, CMD node dist/index.js
3. Create `frontend/Dockerfile` — node:20-alpine, COPY package*.json, npm ci, COPY src app, npm run build, CMD npm start
4. Create `.env.example` at root documenting: DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET, PORT=4000, NEXT_PUBLIC_API_URL=http://localhost:4000
5. Create `.env` from `.env.example` with local dev values (gitignored)
6. Add `.gitignore` at root covering: .env, node_modules/, dist/, .next/

**Verification:**
- `docker compose up --build` completes without errors
- GET http://localhost:4000 returns a response (404 is fine — no routes yet)
- GET http://localhost:3000 loads the Next.js page
- `docker compose ps` shows all three containers as healthy/running

**Success Criteria:**
1. `docker compose up --build` starts all services with no manual steps
2. Backend responds on :4000, frontend on :3000, PostgreSQL on :5432
3. Drizzle migrations run automatically on backend startup
4. `.env.example` documents every required environment variable

---

## Phase 2: Backend: Auth + Core API

**Goal:** All REST endpoints implemented, auth working end-to-end, integration tests passing at ≥80% coverage.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, SOCL-01, SOCL-02, SOCL-03, SOCL-04, SOCL-05, LIKE-01, LIKE-02, LIKE-03, LIKE-04, TMEL-01, TMEL-02, TMEL-03, TMEL-04, SRCH-01, SRCH-02, PROF-01, PROF-02

**UI hint:** no

### Plan 2.1 — Auth Endpoints + requireAuth Middleware

**Goal:** Register, login, logout, refresh, and me endpoints working; JWT middleware protects routes.

**Tasks:**
1. Create `backend/src/middleware/requireAuth.ts` — verify JWT access token from `Authorization: Bearer` header; attach `req.user = { id, email }` on success; return 401 on missing/invalid/expired token
2. Create `backend/src/services/authService.ts` — register (bcrypt hash, insert user, return tokens), login (verify password, generate access+refresh tokens, store hashed refresh in users table), logout (clear refresh_token_hash), refresh (verify refresh token hash, issue new access token), me (return user by id)
3. Create `backend/src/routes/auth.routes.ts` — POST /auth/register, POST /auth/login, POST /auth/logout (requireAuth), POST /auth/refresh, GET /auth/me (requireAuth); use Zod for input validation; return consistent `{ error: string }` on failures
4. Wire auth router into `backend/src/app.ts`

**Verification:**
- POST /auth/register with valid body → 201 + `{ accessToken, refreshToken, user }`
- POST /auth/register with duplicate email → 409
- POST /auth/login with wrong password → 401
- GET /auth/me without token → 401
- POST /auth/refresh with valid refreshToken → 200 + new accessToken

### Plan 2.2 — Tweets + Timeline Endpoints

**Goal:** Tweet CRUD and cursor-paginated timeline working.

**Tasks:**
1. Create `backend/src/services/tweetService.ts` — createTweet (validate ≤280 chars, insert), softDeleteTweet (set deleted_at, verify ownership → 403 if wrong user), getTimeline (cursor pagination: decode cursor as `{created_at, id}`, WHERE followed users AND deleted_at IS NULL, ORDER BY created_at DESC, id DESC, LIMIT 20+1 to detect next page, return `{ tweets, nextCursor }`)
2. Create `backend/src/routes/tweet.routes.ts` — POST /tweets (requireAuth), DELETE /tweets/:id (requireAuth), GET /timeline (requireAuth, cursor query param)
3. Wire tweet router into `backend/src/app.ts`

**Verification:**
- POST /tweets with content > 280 chars → 400
- DELETE /tweets/:id by non-owner → 403
- GET /timeline returns max 20 tweets + nextCursor when more exist
- GET /timeline with cursor returns next page without duplicates

### Plan 2.3 — Follows + Likes + Profile + Search Endpoints

**Goal:** Social graph, likes, user profile, and search endpoints working.

**Tasks:**
1. Create `backend/src/services/followService.ts` — follow (insert with duplicate check → 409, self-follow → 400), unfollow (delete, not-found → 404), getFollowers, getFollowing
2. Create `backend/src/services/likeService.ts` — likeTweet (insert with duplicate check → 409), unlikeTweet (delete, not-found → 404)
3. Create `backend/src/services/userService.ts` — getProfile (user + tweet count + follower/following count), searchUsers (ILIKE username prefix)
4. Create routes: `follow.routes.ts`, `like.routes.ts`, `user.routes.ts` — all behind requireAuth; wire into app.ts

**Verification:**
- POST /users/:id/follow twice → 409 on second
- POST /users/:id/follow self → 400
- GET /users/:id/profile returns follower_count, following_count, tweet_count
- GET /search/users?q=test returns matching users array

### Plan 2.4 — Integration Tests (6 suites)

**Goal:** 6 integration test suites against real PostgreSQL; ≥80% line coverage.

**Tasks:**
1. Add Vitest + Supertest + test deps to `backend/package.json`; create `backend/vitest.config.ts`
2. Create `backend/src/__tests__/setup.ts` — connect to twitterclone_test DB, run migrations, TRUNCATE all tables in beforeEach
3. Create `backend/src/__tests__/auth.integration.test.ts` — register, login, logout, refresh, me flows
4. Create `backend/src/__tests__/tweets.integration.test.ts` — create, soft-delete, ownership check, 280-char limit
5. Create `backend/src/__tests__/timeline.integration.test.ts` — cursor pagination correctness, empty timeline, deleted tweet exclusion
6. Create `backend/src/__tests__/follows.integration.test.ts` — follow, unfollow, duplicate, self-follow, 404
7. Create `backend/src/__tests__/likes.integration.test.ts` — like, unlike, duplicate, 404
8. Create `backend/src/__tests__/search.integration.test.ts` — prefix match, empty result

**Verification:**
- `npm test` in backend passes all suites
- Coverage report shows ≥80% line coverage

**Success Criteria:**
1. All 6 integration test suites pass against real PostgreSQL
2. `npm test` in backend shows ≥80% line coverage
3. All 19 API endpoints respond with correct status codes per docs/api.md

---

## Phase 3: Frontend: UI Core

**Goal:** Complete UI end-to-end, responsive, all UI text in Spanish, SSE real-time working.

**Requirements:** REAL-01, REAL-02, REAL-03, REAL-04, L10N-01, TEST-03

**UI hint:** yes

### Plan 3.1 — Auth Pages (Login + Register)

**Goal:** Login and register pages working with redirect logic.

**Tasks:**
1. Create `frontend/src/app/login/page.tsx` — form with email + password fields, submit calls POST /auth/login, stores tokens in localStorage + Zustand, redirects to /; shows Spanish error messages on failure
2. Create `frontend/src/app/register/page.tsx` — form with email, username, password; calls POST /auth/register; same redirect logic
3. Update `frontend/src/app/page.tsx` — redirect to /login if no accessToken in localStorage; otherwise render timeline

**Verification:**
- Login with valid credentials → redirects to /
- Login with wrong password → shows Spanish error message
- Direct access to / without token → redirects to /login

### Plan 3.2 — Timeline, Composer, and SSE Hook

**Goal:** Timeline feed with infinite scroll, tweet composer, SSE real-time updates.

**Tasks:**
1. Create `frontend/src/hooks/useTimelineStream.ts` — EventSource to GET /timeline/stream?token=<accessToken>; on message: prepend tweet to timeline state; on error: reconnect with exponential backoff
2. Create `frontend/src/components/TweetComposer.tsx` — textarea (max 280 chars) with live char counter; POST /tweets on submit; prepends new tweet to local state
3. Create `frontend/src/components/TweetCard.tsx` — displays tweet content, author, timestamp, like count; like/unlike button; delete button if own tweet
4. Create `frontend/src/components/Timeline.tsx` — list of TweetCards with infinite scroll via IntersectionObserver; fetches next page via GET /timeline?cursor=<nextCursor>
5. Create `frontend/src/app/page.tsx` (update) — compose tweet at top, Timeline component below, useTimelineStream wired up

**Verification:**
- Composing a tweet adds it to the top of the feed
- Scrolling to bottom loads next page
- Tweet posted from another tab appears in feed via SSE within 1s

### Plan 3.3 — User Profile + Search + Layout

**Goal:** Profile page, search, and responsive layout (sidebar + mobile bottom nav).

**Tasks:**
1. Create `frontend/src/app/users/[id]/page.tsx` — shows display_name, username, bio, tweet count, follower/following count; follow/unfollow button; cursor-paginated list of user's tweets
2. Create `frontend/src/app/search/page.tsx` — input with 300ms debounce calls GET /search/users?q=; shows user cards with follow/unfollow buttons
3. Create `frontend/src/components/Sidebar.tsx` — desktop sidebar: logo, nav links (Inicio, Buscar, Perfil), compose button; hidden on mobile
4. Create `frontend/src/components/BottomNav.tsx` — mobile bottom nav (Inicio, Buscar, Perfil); hidden on desktop
5. Wrap root layout with sidebar/bottom-nav; apply responsive Tailwind classes

**Verification:**
- /users/:id shows correct follower/following counts
- Follow button toggles on click without page reload
- Layout shows sidebar on ≥1024px, bottom nav on <1024px

### Plan 3.4 — Frontend Unit Tests (3 suites)

**Goal:** 3 Vitest + Testing Library suites for login, tweet compose/delete, follow/unfollow.

**Tasks:**
1. Add Vitest + @testing-library/react + jsdom to frontend devDeps; create `frontend/vitest.config.ts`
2. Create `frontend/src/__tests__/login.test.tsx` — mock API, test: successful login stores tokens, failed login shows error, already-authed redirects
3. Create `frontend/src/__tests__/tweet.test.tsx` — mock API, test: compose submits and prepends tweet, delete removes tweet from list, 280-char limit blocks submit
4. Create `frontend/src/__tests__/follow.test.tsx` — mock API, test: follow button calls POST follow, unfollow calls DELETE follow, button toggles state

**Verification:**
- `npm test` in frontend passes all 3 suites

**Success Criteria:**
1. Full happy path usable in browser at 375px and 1440px
2. SSE new tweet appears in feed within 1s
3. All UI text is in Spanish
4. 3 frontend unit test suites pass

---

## Phase 4: Testing & Seed + README

**Goal:** Playwright E2E happy path passing, seed data populated, app fully demonstrable from zero.

**Requirements:** TEST-01, TEST-02, TEST-04, TEST-05, INFR-03

**UI hint:** no

### Plan 4.1 — Seed Data + README Runbook

**Goal:** One-command startup produces a working app with sample data; README is evaluator-ready.

**Tasks:**
1. Create `backend/src/db/seed.ts` — 10 users (hashed passwords), ~50 tweets, ~40 follows, ~100 likes; idempotent (skip if users already exist)
2. Add `db:seed` script to `backend/package.json`: `ts-node src/db/seed.ts`
3. Create `README.md` at root — sections: Prerequisites (Node 20, Docker), Quick Start (`docker compose up --build`), Seed (`docker exec backend npm run db:seed`), Test credentials (list seed users), Run tests (`cd backend && npm test`, `cd frontend && npm test`, `npm run test:e2e`), Environment variables table, Architecture decisions (links to docs/decisions/), Ports table
4. Verify docker-compose starts db:seed automatically on first run (or document manual step clearly)

**Verification:**
- `docker compose up --build` from clean state → app is accessible, seed data loaded
- README runbook followed step-by-step produces a working app

### Plan 4.2 — Playwright E2E Happy Path

**Goal:** @smoke E2E test passes: register → login → post tweet → follow user → logout.

**Tasks:**
1. Create `global-tests/package.json` with Playwright
2. Create `global-tests/playwright.config.ts` — baseURL http://localhost:3000, timeout 30s
3. Create `global-tests/happy-path.spec.ts` @smoke — full flow: register new user, login, compose tweet, navigate to another user's profile, follow them, verify follow count increments, logout, verify redirect to /login
4. Add root `package.json` with `test:e2e` script: `cd global-tests && npx playwright test`

**Verification:**
- `npm run test:e2e` from root passes against running stack
- Spec tagged @smoke

**Success Criteria:**
1. Playwright @smoke test passes against `docker compose up --build` stack
2. README runbook produces working app from zero on a clean machine
3. Seed data populates on first run automatically

---

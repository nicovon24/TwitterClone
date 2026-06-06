---
phase: 02-backend-auth-core-api
plan: "04"
subsystem: backend/testing
tags: [integration-tests, vitest, supertest, postgresql, adr-007]
dependency_graph:
  requires: [02-01, 02-02, 02-03]
  provides: [integration-test-suite]
  affects: [backend/src/__tests__]
tech_stack:
  added: [vitest@^1, supertest@^6, "@vitest/coverage-v8@^1", "@types/supertest@^6"]
  patterns: [real-db-integration-tests, beforeEach-truncate-isolation, supertest-app-export]
key_files:
  created:
    - backend/vitest.config.ts
    - backend/src/__tests__/globalSetup.ts
    - backend/src/__tests__/setup.ts
    - backend/src/__tests__/auth.integration.test.ts
    - backend/src/__tests__/tweets.integration.test.ts
    - backend/src/__tests__/timeline.integration.test.ts
    - backend/src/__tests__/follows.integration.test.ts
    - backend/src/__tests__/likes.integration.test.ts
    - backend/src/__tests__/search.integration.test.ts
  modified:
    - backend/package.json
decisions:
  - "Added globalSetup.ts in addition to setupFiles: globalSetup runs in main process before workers are forked, ensuring DATABASE_URL=TEST_DATABASE_URL before env.ts is evaluated in any worker"
  - "Used poolOptions.forks.singleFork=true to share one module cache across all test files — avoids multiple db client instances and ensures DATABASE_URL override applies uniformly"
  - "TRUNCATE TABLE likes, follows, tweets, users RESTART IDENTITY CASCADE in beforeEach guarantees FK-safe isolation"
  - "testDb exported from setup.ts so individual test files can run raw SQL for DB-state assertions (e.g. verify deleted_at set after soft-delete)"
metrics:
  duration: "~25 min"
  completed: "2026-06-04"
  tasks_completed: 3
  files_created: 9
---

# Phase 02 Plan 04: Integration Tests Summary

**One-liner:** 6 real-PostgreSQL integration test suites covering all Phase 2 API endpoints, with Vitest + Supertest, per-test TRUNCATE isolation, and zero mocks per ADR-007.

## What Was Built

### Task 1 — Vitest config + test dependencies
- Added `vitest@^1`, `supertest@^6`, `@vitest/coverage-v8@^1`, `@types/supertest@^6` to `backend/package.json` devDependencies
- Added `"test": "vitest run"` and `"test:coverage": "vitest run --coverage"` scripts
- Created `backend/vitest.config.ts` targeting `src/__tests__/**/*.test.ts` with node environment, v8 coverage provider, and 30 s test timeout

### Task 2 — Test setup: DB connect, migrations, TRUNCATE beforeEach
- Created `backend/src/__tests__/globalSetup.ts` — runs in the Vitest main process before any worker is forked; validates `TEST_DATABASE_URL`, sets `process.env.DATABASE_URL = TEST_DATABASE_URL`, and provides fallback JWT secrets for tests
- Created `backend/src/__tests__/setup.ts` — `beforeEach` TRUNCATE of all four tables in FK dependency order (`likes, follows, tweets, users RESTART IDENTITY CASCADE`); exports `testDb` postgres client for raw-SQL assertions in test files; `afterAll` closes the client

### Task 3 — 6 integration test suites
All six files import `supertest(app)` from `../app.js` (no server `listen()` needed).

| File | Cases |
|------|-------|
| `auth.integration.test.ts` | register (201, 409 dupe email, 409 dupe username, 400 bad email, 400 short pw), login (200, 401 wrong pw, 401 unknown), GET /me (200, 401 no token, 401 bad token), refresh (200, 401), logout+refresh-invalidation |
| `tweets.integration.test.ts` | create (201 + likes_count:0, 400 >280, 400 empty, 401), soft-delete (200 + DB deleted_at verified, 403 non-owner, 404 missing) |
| `timeline.integration.test.ts` | empty timeline, own tweets excluded, deleted tweet excluded, 25-tweet pagination (page1=20+cursor, page2=5+null), no duplicates across pages, 401 unauthenticated |
| `follows.integration.test.ts` | follow (201), duplicate (409), self-follow (400), 404 missing user, unfollow (200), not-following (400), 404 missing user |
| `likes.integration.test.ts` | like (201 + likes_count:1), duplicate (409), 404, unlike (200 + likes_count:0), not-liked (400), 404 |
| `search.integration.test.ts` | prefix match, case-insensitive ILIKE, empty result, missing q param (400), unauthenticated (401) |

## Deviations from Plan

### Auto-added: globalSetup.ts (Rule 2 — missing critical functionality)
- **Found during:** Task 2
- **Issue:** `env.ts` reads `process.env.DATABASE_URL` at module-evaluation time. Vitest `setupFiles` run in worker threads after module graphs are resolved. A plain `setupFiles`-only approach would not guarantee `DATABASE_URL` is set before `db/index.ts` is first evaluated.
- **Fix:** Added `src/__tests__/globalSetup.ts` as `globalSetup` in `vitest.config.ts`. This file runs in the Vitest orchestrator process before any worker is forked, ensuring `DATABASE_URL=TEST_DATABASE_URL` is set before any module loads.
- **Files modified:** `backend/vitest.config.ts`, `backend/src/__tests__/globalSetup.ts` (new)

### Auto-fixed: import path correction (Rule 3 — blocking issue)
- **Found during:** Task 3 verification (tsc --noEmit)
- **Issue:** Test files initially used `../../app.js` (two levels up from `src/__tests__/`), which resolves to the project root, not `src/app.ts`.
- **Fix:** Changed all six test files to `../app.js` (one level up from `src/__tests__/`).

## Known Stubs

None — no UI rendering, no placeholder data. All test assertions are structural checks against real endpoint responses.

## Threat Flags

None — tests are read-only relative to the production codebase. The T-02-15 mitigation (throw if TEST_DATABASE_URL not set) is implemented in both `globalSetup.ts` and `setup.ts`.

## Test Execution Requirements

**IMPORTANT:** `npm test` requires a live PostgreSQL test database.

```bash
# One-time setup
createdb clontwitter_test

# Run tests
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/clontwitter_test npm test

# Run with coverage
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/clontwitter_test npm run test:coverage
```

The executor cannot run tests without a live database — structural verification (tsc --noEmit + file existence) was performed instead.

## Self-Check

### Files verified to exist:
- `backend/vitest.config.ts` — FOUND
- `backend/src/__tests__/globalSetup.ts` — FOUND
- `backend/src/__tests__/setup.ts` — FOUND
- `backend/src/__tests__/auth.integration.test.ts` — FOUND
- `backend/src/__tests__/tweets.integration.test.ts` — FOUND
- `backend/src/__tests__/timeline.integration.test.ts` — FOUND
- `backend/src/__tests__/follows.integration.test.ts` — FOUND
- `backend/src/__tests__/likes.integration.test.ts` — FOUND
- `backend/src/__tests__/search.integration.test.ts` — FOUND

### TypeScript check:
- `npx tsc --noEmit` — PASSED (zero errors)

### Key content checks:
- `setup.ts` contains `TRUNCATE` — PASS
- `setup.ts` contains `beforeEach` — PASS
- `auth.integration.test.ts` contains `register` — PASS
- `vitest.config.ts` contains `coverage` — PASS

## Self-Check: PASSED

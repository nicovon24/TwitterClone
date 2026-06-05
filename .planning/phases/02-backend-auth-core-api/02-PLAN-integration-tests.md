---
phase: 02-backend-auth-core-api
plan: 04
type: execute
wave: 2
depends_on: [02-PLAN-auth, 02-PLAN-tweets-timeline, 02-PLAN-social-likes-profile-search]
files_modified:
  - backend/package.json
  - backend/vitest.config.ts
  - backend/src/__tests__/setup.ts
  - backend/src/__tests__/auth.integration.test.ts
  - backend/src/__tests__/tweets.integration.test.ts
  - backend/src/__tests__/timeline.integration.test.ts
  - backend/src/__tests__/follows.integration.test.ts
  - backend/src/__tests__/likes.integration.test.ts
  - backend/src/__tests__/search.integration.test.ts
autonomous: true
requirements: [AUTH-07]
user_setup:
  - "Ensure a PostgreSQL database named 'clontwitter_test' is accessible at the TEST_DATABASE_URL in .env (or run: createdb clontwitter_test)"

must_haves:
  truths:
    - "npm test in backend runs all 6 suites and exits 0 when all pass"
    - "Each test suite truncates all tables in beforeEach — no shared state between tests"
    - "Tests run against a real PostgreSQL database (clontwitter_test) — no mocks (ADR-007)"
    - "Coverage report shows ≥80% line coverage across all backend source files"
    - "auth suite covers: register, login, logout, refresh, me"
    - "tweets suite covers: create, soft-delete, ownership check, 280-char limit"
    - "timeline suite covers: cursor pagination, empty timeline, deleted tweet exclusion"
    - "follows suite covers: follow, unfollow, duplicate, self-follow, 404"
    - "likes suite covers: like, unlike, duplicate, 404"
    - "search suite covers: prefix match, case-insensitive, empty result"
  artifacts:
    - path: "backend/vitest.config.ts"
      provides: "Vitest config with coverage (v8), test environment, and test file glob"
      contains: "coverage"
    - path: "backend/src/__tests__/setup.ts"
      provides: "DB connection to clontwitter_test, migration runner, and TRUNCATE beforeEach"
      contains: "TRUNCATE"
    - path: "backend/src/__tests__/auth.integration.test.ts"
      provides: "Auth endpoint integration test suite"
      contains: "register"
  key_links:
    - from: "backend/src/__tests__/setup.ts"
      to: "backend/src/db/migrate.ts"
      via: "runMigrations() called once before all tests"
      pattern: "runMigrations"
    - from: "backend/src/__tests__/*.test.ts"
      to: "backend/src/app.ts"
      via: "supertest(app) — app exported without listen()"
      pattern: "supertest"
---

<objective>
Write 6 integration test suites that exercise all Phase 2 API endpoints against a real PostgreSQL test database.

Purpose: Per ADR-007, the project requires real database integration tests at ≥80% line coverage. Mocked tests were explicitly ruled out after a prior incident where mock/prod divergence masked a broken migration. This plan delivers the test suite that validates the full request-to-DB round trip for every endpoint.
Output: 6 .integration.test.ts files, a shared setup with beforeEach TRUNCATE, Vitest + Supertest configured, and npm test passing with coverage ≥80%.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/research/STACK.md
@docs/api.md
@docs/testing.md
@docs/decisions/007-testing-strategy.md
@AGENTS.md

<interfaces>
<!-- Test database: clontwitter_test (separate from clontwitter dev DB) -->
<!-- All tests import supertest(app) — app must export without calling listen() (already done in Plan 2.1) -->
<!-- setup.ts runs runMigrations() once; beforeEach truncates all 4 tables in dependency order: likes, follows, tweets, users -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Vitest config + test dependencies</name>
  <files>backend/package.json, backend/vitest.config.ts</files>
  <read_first>
    - .planning/research/STACK.md ("Testing" section) — vitest 1.x, supertest 6.x, @vitest/coverage-v8 1.x
    - backend/package.json (existing) — add to devDependencies only
  </read_first>
  <action>
    Add to backend/package.json devDependencies: vitest@^1, supertest@^6, @vitest/coverage-v8@^1, @types/supertest.
    Add scripts: "test": "vitest run", "test:coverage": "vitest run --coverage".

    Create backend/vitest.config.ts:
    - import { defineConfig } from 'vitest/config'
    - test: { globals: true, environment: 'node', include: ['src/__tests__/**/*.test.ts'], setupFiles: ['src/__tests__/setup.ts'], testTimeout: 30000 }
    - coverage: { provider: 'v8', reporter: ['text', 'lcov'], include: ['src/**/*.ts'], exclude: ['src/__tests__/**', 'src/db/seed.ts'] }
  </action>
  <verify>
    <automated>cd backend && npm install && npx tsc --noEmit && grep -q "vitest" package.json</automated>
  </verify>
  <acceptance_criteria>
    - vitest, supertest, @vitest/coverage-v8 appear in devDependencies
    - npm test script runs vitest run
    - vitest.config.ts targets src/__tests__/**/*.test.ts with node environment
    - tsc passes
  </acceptance_criteria>
  <done>Test deps installed; vitest.config.ts configured; npm test command wired.</done>
</task>

<task type="auto">
  <name>Task 2: Test setup — DB connect, migrations, TRUNCATE beforeEach</name>
  <files>backend/src/__tests__/setup.ts</files>
  <read_first>
    - backend/src/db/migrate.ts — runMigrations() signature
    - backend/src/db/schema.ts — all four table names (users, tweets, follows, likes)
    - .planning/research/STACK.md ("For integration tests") — beforeEach TRUNCATE pattern
    - docs/decisions/007-testing-strategy.md — real DB requirement
  </read_first>
  <action>
    Create backend/src/__tests__/setup.ts:
    - Read TEST_DATABASE_URL from process.env (required; throw if missing with a helpful message: "Set TEST_DATABASE_URL=postgres://... to run integration tests").
    - Create a postgres client connected to TEST_DATABASE_URL.
    - In a beforeAll: call runMigrations() with the test DB URL (temporarily override DATABASE_URL or pass client directly — use whichever pattern migrate.ts supports; create a test-specific migrate call if needed).
    - In beforeEach: execute a single SQL statement truncating all tables in dependency order (likes and follows first, then tweets, then users) to avoid FK violations: `TRUNCATE TABLE likes, follows, tweets, users RESTART IDENTITY CASCADE`.
    - In afterAll: close the postgres client.
    Export the test db client as `testDb` for use in test files that need to insert seed data directly.
  </action>
  <verify>
    <automated>cd backend && grep -q "TRUNCATE" src/__tests__/setup.ts && grep -q "beforeEach" src/__tests__/setup.ts</automated>
  </verify>
  <acceptance_criteria>
    - setup.ts throws a clear error when TEST_DATABASE_URL is not set
    - beforeEach truncates all four tables with RESTART IDENTITY CASCADE
    - afterAll closes the DB connection
    - testDb exported for seed helpers in test files
  </acceptance_criteria>
  <done>Test setup provides clean-slate isolation per test; migrations run once before all suites.</done>
</task>

<task type="auto">
  <name>Task 3: 6 integration test suites</name>
  <files>
    backend/src/__tests__/auth.integration.test.ts
    backend/src/__tests__/tweets.integration.test.ts
    backend/src/__tests__/timeline.integration.test.ts
    backend/src/__tests__/follows.integration.test.ts
    backend/src/__tests__/likes.integration.test.ts
    backend/src/__tests__/search.integration.test.ts
  </files>
  <read_first>
    - docs/api.md — all endpoint paths, request bodies, and expected response shapes
    - backend/src/app.ts — exported app for supertest
    - backend/src/__tests__/setup.ts (Task 2) — testDb for seeding
    - .planning/research/STACK.md ("For integration tests") — supertest pattern
  </read_first>
  <action>
    Each test file imports supertest(app) from '../../app.js'. All assertions use HTTP status codes and response body shapes from docs/api.md.

    auth.integration.test.ts:
    - register with valid body → 201 + accessToken, refreshToken, user
    - register with duplicate email → 409
    - register with duplicate username → 409
    - register with invalid email → 400
    - register with short password (< 8 chars) → 400
    - login with valid credentials → 200 + tokens
    - login with wrong password → 401
    - login with non-existent email → 401
    - GET /auth/me with valid token → 200 + user
    - GET /auth/me with no token → 401
    - GET /auth/me with expired token → 401
    - POST /auth/refresh with valid refreshToken → 200 + new accessToken
    - POST /auth/refresh with invalid token → 401
    - POST /auth/logout with valid token → 200; subsequent refresh fails 401

    tweets.integration.test.ts:
    - POST /tweets valid content → 201 + tweet object with likes_count: 0
    - POST /tweets content > 280 chars → 400
    - POST /tweets empty content → 400
    - POST /tweets unauthenticated → 401
    - DELETE /tweets/:id by owner → 200; tweet row has deleted_at set (verify via testDb)
    - DELETE /tweets/:id by non-owner → 403
    - DELETE /tweets/:id non-existent → 404

    timeline.integration.test.ts:
    - GET /timeline with no followings → 200 { tweets: [], next_cursor: null }
    - GET /timeline returns only tweets from followed users, not own tweets
    - GET /timeline excludes soft-deleted tweets
    - GET /timeline with 25 tweets → first page has 20 + nextCursor; second page has 5 + null
    - GET /timeline with cursor → no duplicates between pages
    - GET /timeline unauthenticated → 401

    follows.integration.test.ts:
    - POST /follows/:username valid → 201
    - POST /follows/:username again → 409
    - POST /follows self → 400
    - POST /follows non-existent user → 404
    - DELETE /follows/:username valid → 200
    - DELETE /follows/:username not following → 400
    - DELETE /follows non-existent user → 404

    likes.integration.test.ts:
    - POST /likes/:tweetId valid → 201 + likes_count: 1
    - POST /likes/:tweetId again → 409
    - POST /likes non-existent tweet → 404
    - DELETE /likes/:tweetId valid → 200 + likes_count: 0
    - DELETE /likes/:tweetId not liked → 400
    - DELETE /likes non-existent tweet → 404

    search.integration.test.ts:
    - GET /search/users?q=ni → returns user with username starting with "ni"
    - GET /search/users?q=NI (uppercase) → same result (ILIKE)
    - GET /search/users?q=zzz → 200 { users: [], next_cursor: null }
    - GET /search/users without q → 400
    - GET /search/users unauthenticated → 401
  </action>
  <verify>
    <automated>cd backend && TEST_DATABASE_URL=$TEST_DATABASE_URL npm test 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - All 6 suites exist with the test cases described
    - npm test passes with exit code 0 (given a running clontwitter_test DB)
    - npm run test:coverage shows ≥80% line coverage
    - No test mocks the database or the service layer — all use supertest against the real app
    - Each test file is self-contained; test order does not matter (beforeEach guarantees isolation)
  </acceptance_criteria>
  <done>6 integration test suites pass against real PostgreSQL; ≥80% line coverage confirmed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| test runner → test DB | Tests must connect to clontwitter_test, never clontwitter (production data contamination) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-15 | Tampering | TEST_DATABASE_URL | mitigate | setup.ts throws if TEST_DATABASE_URL not set; never falls back to DATABASE_URL; tests cannot accidentally hit the dev DB |
</threat_model>

<verification>
- `cd backend && TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/clontwitter_test npm test` exits 0
- All 6 suites listed in output with pass status
- `npm run test:coverage` shows ≥80% line coverage in the text reporter
- No `vi.mock` or `jest.mock` calls in any test file (real DB only, per ADR-007)
</verification>

<success_criteria>
1. All 6 integration test suites pass with npm test (exit 0)
2. Coverage ≥80% line coverage confirmed by npm run test:coverage
3. Tests run against real PostgreSQL (no mocks) — ADR-007 compliance
4. beforeEach TRUNCATE guarantees test isolation; test order is irrelevant
</success_criteria>

<output>
Create `.planning/phases/02-backend-auth-core-api/02-04-SUMMARY.md` when done
</output>

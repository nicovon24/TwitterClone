# 007 — Testing Strategy: Integration Tests with Real PostgreSQL (no mocks)

## Status
Accepted

## Context
The challenge requires ≥80% backend coverage. Mocking the database (in-memory, jest.mock) vs. running integration tests against a real PostgreSQL instance were evaluated. Past experience showed that mocks can pass all tests while failing in production due to divergence between mock behavior and the real database engine.

## Decision
- Backend tests are **integration tests** running against a dedicated real PostgreSQL database (`twitterclone_test`).
- Drizzle and the PostgreSQL driver are never mocked.
- Migrations run once before the full test suite.
- Data is cleaned between each test (`TRUNCATE` or `DELETE` in `beforeEach`).
- **Vitest + Supertest** is used to make real HTTP requests to the Express server.
- The frontend uses API mocks (jsdom) since DB integrity is not required there.
- E2E uses **Playwright** against the full stack running via Docker.

**Backend test suites:**
- `auth.integration.test.ts`
- `tweets.integration.test.ts`
- `follows.integration.test.ts`
- `likes.integration.test.ts`
- `timeline.integration.test.ts`
- `search.integration.test.ts`

## Consequences

**Advantages:**
- Tests validate real behavior: DB constraints, transactions, indexes.
- No mock/production divergence: if the test passes, the DB logic works.
- Catches errors like FK violations, deadlocks, and malformed queries.

**Disadvantages:**
- Requires a PostgreSQL instance available in CI and in local development.
- Tests are slower than unit tests with mocks (network/IO latency).
- Requires `twitterclone_test` DB to be set up before running the test suite.

## Date
2026-06-04

# Research Summary: ClonTwitter

**Researched:** 2026-06-04
**Stack:** Next.js 14 App Router · Node.js/Express · Drizzle ORM · PostgreSQL 16
**Depth:** Quick — architecture fully defined via 7 ADRs; research focuses on implementation traps and doc inconsistencies

---

## Critical Inconsistencies Found

These conflicts between docs must be resolved before implementation begins.

### 1. Token Storage: localStorage vs httpOnly Cookie

| Source | Says |
|--------|------|
| `docs/api.md` (POST /auth/login response) | "Sets `token` httpOnly cookie" |
| ADR-001 | JWT stored in **localStorage**; cross-origin setup with `Authorization: Bearer` header |
| REQUIREMENTS.md AUTH-02 | "tokens stored in **localStorage**" |

**Resolution required:** The challenge spec mandates localStorage. `docs/api.md` is incorrect — the `Sets token httpOnly cookie` note should be removed, and the response body must include both `accessToken` and `refreshToken` fields (not a single `token`).

### 2. Response Body Shape: single `token` vs dual tokens

`docs/api.md` register/login responses show `{ "token": "string" }` (singular). ADR-001 and AUTH-02 require both access and refresh tokens returned in the body. The response should be:
```json
{ "accessToken": "string", "refreshToken": "string", "user": { ... } }
```

### 3. Missing `/auth/refresh` Endpoint in api.md

ADR-001 explicitly defines `POST /auth/refresh` for the Axios interceptor. This endpoint is absent from `docs/api.md`. Must be added before implementation.

### 4. User IDs in api.md are Integers, Not UUIDs

API examples show `"id": 1` (integer). All entities use UUID PKs per ADR-006 and PROF-03. Examples must use UUID strings like `"id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"`.

### 5. Follows Route Discrepancy

| Source | Route |
|--------|-------|
| `docs/api.md` | `POST /follows/:username` |
| `docs/api.md` | `DELETE /follows/:username` |
| REQUIREMENTS.md (SOCL-01/02) | Implies `/users/:id/follow` |

The api.md version (`/follows/:username`) is more RESTful and consistent with the users namespace. Recommend keeping `/follows/:username`.

---

## Implementation Risks & Traps

### Auth — Axios Interceptor Race Condition

When multiple requests fire simultaneously with an expired token, a naive interceptor calls `POST /auth/refresh` for each one. Use a queuing pattern: the first 401 triggers a refresh; all subsequent 401s wait for the same refresh promise to resolve before retrying. Without this, concurrent requests on page load will issue N refresh calls and the first one to succeed will invalidate the others.

```typescript
// Pattern: shared refresh promise
let refreshPromise: Promise<string> | null = null;
interceptor: (err) => {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise.then(newToken => retry(err.config, newToken));
}
```

### SSE — Token in Query Parameter

`EventSource` cannot send custom headers, so the JWT must be passed as `?token=`. This means the access token appears in server logs and potentially browser history. Mitigation: use a short-lived one-time SSE token generated via a dedicated endpoint, or accept the risk for the challenge scope (Express logs can be filtered).

**For challenge scope:** Accept `?token=` with the access token. Log warning in code comment.

### SSE — In-Memory Client Map Won't Survive Restart

The `Set<Response>` per-user approach works for the single-process Docker deployment. If the process restarts, connected clients will reconnect via `EventSource` built-in retry. Acceptable for challenge scope.

### Drizzle — Migration Auto-Run on Startup

Two approaches:
1. `drizzle-kit migrate` as a separate step in Dockerfile CMD
2. `migrate()` call in Express startup before `app.listen()`

**Recommended:** `migrate()` in startup code (approach 2). Simpler for Docker — no multi-step CMD needed. Drizzle's `migrate()` is idempotent.

```typescript
import { migrate } from 'drizzle-orm/node-postgres/migrator';
await migrate(db, { migrationsFolder: './drizzle' });
await app.listen(4000);
```

### Docker — Backend Must Wait for PostgreSQL

`depends_on:` alone doesn't wait for PostgreSQL to be ready (only for the container to start). Use `depends_on: postgres: condition: service_healthy` combined with a PostgreSQL `healthcheck`. Without this, the backend starts, tries to run migrations, and crashes because the DB isn't ready.

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 5s
  timeout: 5s
  retries: 5
```

### Cursor Pagination — Encoding Strategy

The database schema doc specifies an opaque cursor encoding `(created_at, id)`. The recommended implementation:
- Cursor = base64(`${created_at.toISOString()}|${id}`)
- Query: `WHERE (created_at, id) < (cursor_ts, cursor_id) ORDER BY created_at DESC, id DESC`
- This ensures stable pagination even under concurrent inserts (no duplicates/skips)

Pitfall: using `id` as the only cursor (common mistake) breaks ordering stability when two tweets share the same millisecond timestamp (UUIDs are random, not time-ordered).

### Drizzle — `postgres` Driver vs `pg`

Drizzle supports both `node-postgres` (`pg`) and `postgres.js` (`postgres`). For this project:
- **Use `node-postgres` (`pg`)**: Better tested with Drizzle + Supertest integration test patterns; `pg.Pool` connection pooling is well-understood.
- `postgres.js` is faster but has subtle connection lifecycle differences that complicate test teardown.

### Frontend — Next.js App Router + SSE Hook

SSE requires `EventSource` which is browser-only. The custom hook must be marked `'use client'` and should handle cleanup:

```typescript
'use client';
useEffect(() => {
  const es = new EventSource(`/api/timeline/stream?token=${token}`);
  es.addEventListener('new_tweet', handler);
  return () => es.close(); // cleanup on unmount
}, [token]);
```

Without cleanup, navigating away leaves the SSE connection open.

### Testing — `twitterclone_test` DB Setup

The test database must exist before Vitest runs. Options:
1. Create it in `globalSetup.ts` if it doesn't exist
2. Document `createdb twitterclone_test` in the README runbook
3. Run it automatically via `docker-compose.test.yml`

**Recommended for challenge:** Create in `globalSetup.ts` and document in README. Add `process.env.DATABASE_URL` pointing to `twitterclone_test` in `.env.test`.

### CORS — Cross-Origin Express/Next.js

Express runs on :4000, Next.js on :3000. Express needs:
```typescript
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
```
Without `credentials: true`, cookies won't work (though for localStorage auth this matters less).

---

## Stack Validation

All tech choices are sound for the challenge scope.

| Component | Verdict | Notes |
|-----------|---------|-------|
| Next.js 14 App Router | ✓ Solid | Use `'use client'` for interactive components; no RSC for auth-gated pages |
| Node.js/Express | ✓ Solid | Mature, well-supported with Supertest |
| Drizzle ORM | ✓ Solid | Type-safe; `drizzle-kit` generates migration files |
| PostgreSQL 16 | ✓ Solid | `gen_random_uuid()` native; full composite PK support |
| Vitest + Supertest | ✓ Solid | Fast test runner; Supertest handles HTTP-level integration testing |
| Playwright | ✓ Solid | `@smoke` tag works via `--grep @smoke`; needs full stack running |
| SSE (EventSource) | ✓ Solid | Correct fit for unidirectional push; browser auto-reconnects |
| bcrypt | ✓ Required | For password hashing; `bcrypt` or `bcryptjs` both fine |

---

## Implications for Roadmap

Based on the requirements and the dependency graph, a 4-phase structure is natural:

**Phase 1 — Foundation**
Monorepo scaffolding, Docker, PostgreSQL schema, Drizzle migrations, auth API (register/login/logout/me/refresh), error middleware, structured logging. This is the bedrock everything else rests on. Auth must be complete before any protected endpoint can be tested.

**Phase 2 — Core Features (API)**
Tweets (create/soft-delete/timeline with cursor pagination), follows, likes, search, user profiles. All protected endpoints. This is the bulk of the backend work. No real-time yet — SSE depends on stable tweet creation.

**Phase 3 — Real-time + Frontend**
SSE stream endpoint + `useTimelineStream` hook. Full frontend UI (login, timeline, compose, follow, profile, search). Localisation (UI text in Spanish). SSE and frontend are decoupled enough that they could parallel but they share the same phase since both need the Phase 2 APIs.

**Phase 4 — Testing + Documentation**
All 6 backend integration suites, 3 frontend unit suites, Playwright E2E happy path. Seed data. README runbook. Coverage verification (≥80%). This phase has no new features — purely validates what was built.

**Risk areas to flag per phase:**
- Phase 1: API doc inconsistencies (resolve before coding auth)
- Phase 2: Cursor encoding correctness; follow/like idempotency at DB level
- Phase 3: SSE token-in-URL; Axios interceptor race condition; `'use client'` boundaries
- Phase 4: `twitterclone_test` DB setup; Playwright needs running stack

---

*Research complete: 2026-06-04*

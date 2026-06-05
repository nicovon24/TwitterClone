---
phase: 01-scaffolding-infrastructure
reviewed: 2026-06-04T22:24:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - backend/src/env.ts
  - backend/src/db/schema.ts
  - backend/src/db/index.ts
  - backend/src/db/migrate.ts
  - backend/src/db/seed.ts
  - backend/src/middleware/errorHandler.ts
  - backend/src/app.ts
  - backend/src/index.ts
  - backend/drizzle.config.ts
  - backend/package.json
  - backend/tsconfig.json
  - backend/Dockerfile
  - frontend/src/store/authStore.ts
  - frontend/src/lib/api.ts
  - frontend/src/app/page.tsx
  - frontend/src/app/layout.tsx
  - frontend/package.json
  - frontend/tsconfig.json
  - frontend/next.config.js
  - frontend/Dockerfile
  - docker-compose.yml
  - .env.example
  - README.md
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-06-04T22:24:00Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

The scaffolding is well-structured and adheres to most stated invariants: UUID primary keys with `gen_random_uuid()`, `content varchar(280)`, soft delete via `deleted_at`, composite primary keys for `follows`/`likes`, a `no_self_follow` CHECK constraint, env validation centralized in `backend/src/env.ts` via Zod, and the `{ error: string }` error shape in the global handler. The committed migration SQL matches the Drizzle schema, and the Docker `COPY` targets (`drizzle/`, lock files, `tailwind.config.ts`, `postcss.config.js`) all exist.

However, there is **one boot-breaking bug**: the Docker Compose backend command runs the seed *before* migrations, so on a fresh database the seed queries a `users` table that does not yet exist, fails, and the `&&` chain prevents the server from ever starting. There are also several quality/security warnings around the Drizzle Kit version/config mismatch, wide-open CORS, and frontend auth-state consistency.

## Critical Issues

### CR-01: Seed runs before migrations — backend fails to boot on a fresh database

**File:** `docker-compose.yml:32`
**Issue:** The backend container command is `sh -c "npm run db:seed && node dist/index.js"`. Migrations are only executed inside `bootstrap()` in `backend/src/index.ts` (`runMigrations()` is called at startup of `node dist/index.js`). The seed therefore runs first. On the very first `docker compose up` (empty `pgdata` volume), `seed()` executes `db.select().from(users).limit(1)` (`backend/src/db/seed.ts:5`) against a database where the `users` table does not yet exist. This throws `relation "users" does not exist`, the seed script calls `process.exit(1)` (`seed.ts:22-23`), the `&&` short-circuits, and `node dist/index.js` never runs. The entire stack fails on first boot — the documented Quick Start (`README.md:21`) does not work.
**Fix:** Run migrations before the seed (and before/within server startup). For example, expose `db:migrate` in the command and reorder:

```yaml
    command: sh -c "npm run db:migrate && npm run db:seed && node dist/index.js"
```

Since `index.ts` already runs migrations at startup, an alternative is to move the seed *after* the server's migration step, or have `bootstrap()` run migrations then seed before `app.listen`. The key requirement: migrations must complete before `seed()` touches any table.

## Warnings

### WR-01: Drizzle Kit command/config mismatch may break `db:generate`

**File:** `backend/package.json:9`, `backend/drizzle.config.ts:6`
**Issue:** `package.json` pins `drizzle-kit ^0.20.18` (resolves within the 0.20.x line). The `db:generate` script uses the legacy CLI form `drizzle-kit generate:pg`, while `drizzle.config.ts` uses the newer unified config field `dialect: 'postgresql'`. The `dialect` field and the unified `drizzle-kit generate` command were introduced in drizzle-kit 0.21+; 0.20.x expects `driver: 'pg'` with the `generate:pg` command. This inconsistency means `npm run db:generate` may error or ignore the config. Runtime is unaffected (migrations are applied via the postgres-js migrator in `migrate.ts`, and the SQL is already committed), so this only bites when regenerating migrations.
**Fix:** Align the toolchain. Either upgrade `drizzle-kit` and switch the script to `drizzle-kit generate`:

```json
"db:generate": "drizzle-kit generate"
```

or keep 0.20.x and change the config to `driver: 'pg'` to match the `generate:pg` command. Verify by running `npm run db:generate` after the change.

### WR-02: CORS is fully open to all origins

**File:** `backend/src/app.ts:9`
**Issue:** `app.use(cors())` enables the default configuration, which reflects/allows any origin. Because auth uses `Authorization: Bearer` tokens from localStorage (not cookies), this is not a CSRF vector, but an unrestricted API is still a security smell and should be locked to the known frontend origin before anything ships beyond local scaffolding.
**Fix:** Restrict to the configured frontend origin, ideally sourced from env per the project invariant (no hardcoded URLs):

```ts
app.use(cors({ origin: env.FRONTEND_ORIGIN }));
```

(Add `FRONTEND_ORIGIN` to `env.ts` / `.env.example`.)

### WR-03: Token refresh updates localStorage but not the Zustand store

**File:** `frontend/src/lib/api.ts:42-46`
**Issue:** On a successful silent refresh, the new access token is written to `localStorage` only. The Zustand `authStore` (`accessToken`) is never updated. Any component reading `accessToken` from the store (e.g. `frontend/src/app/page.tsx:9`) keeps the stale value until a full reload. This breaks the single-source-of-truth expectation between the store and persisted tokens and can produce inconsistent UI auth state.
**Fix:** Update the store after refresh, e.g. import and call a store setter:

```ts
useAuthStore.setState({ accessToken: newAccessToken })
```

or add a dedicated `setAccessToken` action to the store and call it here.

### WR-04: Auth store initial state risks SSR/client hydration mismatch

**File:** `frontend/src/store/authStore.ts:22-25`
**Issue:** `accessToken` is initialized synchronously from `localStorage` at store-creation time. During SSR `window` is undefined so the server renders with `accessToken: null` (e.g. `page.tsx` renders `Cargando...`), but on the client the store is created with the persisted token and immediately renders the authenticated view. This server/client divergence can trigger a React hydration mismatch warning and a content flash.
**Fix:** Initialize `accessToken` to `null` and hydrate from `localStorage` after mount (e.g. in a top-level `useEffect`/provider), or gate the authenticated render on a `hydrated` flag so server and first client render agree.

## Info

### IN-01: Backend image ships dev dependencies and runs as root

**File:** `backend/Dockerfile:6`, `backend/Dockerfile:16`
**Issue:** `npm ci` installs all dependencies (including `tsx`, `drizzle-kit`, `eslint`, etc.) into the runtime image, and the container runs as root with no production prune or multi-stage build. The Compose seed step also depends on `tsx` (a devDependency) being present at runtime, coupling production startup to dev tooling.
**Fix:** Use a multi-stage build (build stage with dev deps, runtime stage with `npm ci --omit=dev`), add a non-root `USER node`, and run the seed via a compiled script rather than `tsx` so the runtime image needs no dev dependencies.

### IN-02: No backend health endpoint / Compose readiness gating

**File:** `backend/src/app.ts:15`, `docker-compose.yml:41-42`
**Issue:** There is no `/health` (or similar) route, and the `frontend` service uses `depends_on: [backend]` without a `condition: service_healthy` (the backend has no healthcheck). Startup ordering for the frontend is therefore not actually gated on backend readiness. Low impact since the frontend only calls the backend at runtime from the browser, but a health endpoint is standard for evaluators and orchestration.
**Fix:** Add a lightweight `app.get('/health', (_req, res) => res.json({ status: 'ok' }))` and a corresponding Compose healthcheck for the backend.

### IN-03: `updated_at` is not auto-updated on row modification

**File:** `backend/src/db/schema.ts:17`
**Issue:** `updated_at` is set via `defaultNow()` at insert time only. Without a DB trigger or `$onUpdate`/explicit set in service code, subsequent updates will not refresh `updated_at`, so it will silently equal `created_at` forever.
**Fix:** Either add a Postgres trigger to maintain it, use Drizzle's `$onUpdate(() => new Date())`, or set `updated_at` explicitly in the relevant service update calls.

### IN-04: Migrate script self-execution guard only matches the `.ts` source

**File:** `backend/src/db/migrate.ts:17`
**Issue:** The direct-run guard checks `process.argv[1]?.endsWith('migrate.ts')`. The compiled output is `migrate.js`, so running `node dist/db/migrate.js` directly would not trigger `runMigrations()` (the `import.meta.url` comparison may also not match depending on argv formatting). Not currently exercised (migrations run via `index.ts` and the `db:migrate` tsx script), but it's a latent footgun if anyone invokes the compiled migrator directly.
**Fix:** Match both extensions, e.g. `process.argv[1]?.match(/migrate\.(ts|js)$/)`, or rely solely on the `import.meta.url` comparison.

---

_Reviewed: 2026-06-04T22:24:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

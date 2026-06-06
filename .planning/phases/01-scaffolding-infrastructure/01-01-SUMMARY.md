---
phase: 01-scaffolding-infrastructure
plan: "01"
subsystem: backend
tags: [express, drizzle, typescript, zod, postgres, migrations]
dependency_graph:
  requires: []
  provides: [backend-scaffold, db-schema, env-validation, error-handler, migrations]
  affects: [all-backend-phases]
tech_stack:
  added:
    - express@^4
    - drizzle-orm@^0.30
    - postgres@^3
    - zod@^3
    - jsonwebtoken@^9
    - bcryptjs@^2
    - dotenv@^16
    - cors@^2
    - express-async-errors@^3
    - morgan@^1
    - tsx@^4
    - drizzle-kit@^0.20
    - typescript@^5
  patterns:
    - Zod-validated env object with process.exit(1) on missing vars
    - Drizzle ORM with postgres driver (not pg)
    - Auto-run migrations on startup before listen
    - Global Express error handler returning { error: string }
    - Morgan request logging with method/url/status/response-time
key_files:
  created:
    - backend/package.json
    - backend/tsconfig.json
    - backend/.eslintrc.json
    - backend/.prettierrc
    - backend/.gitignore
    - backend/drizzle.config.ts
    - backend/src/env.ts
    - backend/src/db/schema.ts
    - backend/src/db/index.ts
    - backend/src/db/migrate.ts
    - backend/src/db/seed.ts
    - backend/src/middleware/errorHandler.ts
    - backend/src/app.ts
    - backend/src/index.ts
    - backend/drizzle/0000_faithful_la_nuit.sql
  modified: []
decisions:
  - "Used postgres@^3 driver (not pg) per STACK.md — cleaner async API, native ESM"
  - "ESM/NodeNext module resolution — tsx works cleanly, .js extensions on relative imports"
  - "bcryptjs (pure-JS) instead of bcrypt — no native build issues in Alpine Docker"
  - "No uuid package — Node 20 crypto.randomUUID() + gen_random_uuid() in DB"
  - "seed.ts is an idempotent placeholder — full sample data deferred to Phase 4"
  - "app.ts does not call app.listen() — exported for Supertest reuse in Phase 2 tests"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-06-04"
  tasks_completed: 3
  files_created: 15
---

# Phase 01 Plan 01: Backend Scaffold — Express + Drizzle + TypeScript Summary

Express + TypeScript + Drizzle backend skeleton that boots on port 4000 with Zod-validated env vars, a four-table Drizzle schema with UUID PKs, automatic migrations on startup, Morgan request logging, and a global JSON error handler.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Project config, dependencies, typed env validation | 10c7601 | package.json, tsconfig.json, .eslintrc.json, .prettierrc, src/env.ts |
| 2 | Drizzle schema, DB connection, drizzle config, migration runner | 311b076 | src/db/schema.ts, src/db/index.ts, drizzle.config.ts, src/db/migrate.ts, src/db/seed.ts |
| 3 | Express app, global error handler, request logging, entry point | e24e46a | src/middleware/errorHandler.ts, src/app.ts, src/index.ts, .gitignore |

## What Was Built

### Task 1 — Project Config and Env Validation
- `package.json` with `express@4`, `drizzle-orm@0.30`, `postgres@3` (not `pg`), `zod@3`, `bcryptjs@2`, `morgan@1`, `express-async-errors@3`; `"type": "module"` for ESM
- `tsconfig.json`: `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `strict: true`
- `src/env.ts`: Zod schema validates `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET` (required), `PORT` (default 4000), `NODE_ENV` (default development); `process.exit(1)` on failure with English message listing missing vars

### Task 2 — Drizzle Schema and DB Connection
- `src/db/schema.ts`: four tables with exact column specs from docs/database.md:
  - `users`: UUID PK via `gen_random_uuid()`, username/email UNIQUE, soft-delete-ready, username index
  - `tweets`: UUID PK, `user_id → users` CASCADE, `content` VARCHAR(280), `deleted_at` nullable (soft delete), partial index on `created_at WHERE deleted_at IS NULL`
  - `follows`: composite PK `(follower_id, following_id)`, CHECK `follower_id <> following_id`, `following_id` index
  - `likes`: composite PK `(user_id, tweet_id)`, both FKs CASCADE
- `src/db/index.ts`: `postgres(env.DATABASE_URL)` → `drizzle(client, { schema })`, exports `db` and raw `client`
- `src/db/migrate.ts`: `runMigrations()` creates a dedicated `max:1` postgres client, runs `migrate()` from `drizzle-orm/postgres-js/migrator`, closes client; runnable standalone
- `src/db/seed.ts`: idempotent placeholder — skips when users exist, logs skip message; full data deferred to Phase 4
- Generated migration: `backend/drizzle/0000_faithful_la_nuit.sql` with UUID defaults, composite PKs, CHECK constraint, and CASCADE deletes

### Task 3 — Express App and Entry Point
- `src/middleware/errorHandler.ts`: catches `ZodError` → 400 with joined messages; all others → `err.status ?? 500`; suppresses stack in production for 500s; always `{ error: string }` shape
- `src/app.ts`: imports `express-async-errors` first; wires `cors()`, `express.json()`, `morgan` (`:method :url :status :response-time ms`); placeholder comment for Phase 2 routes; registers `errorHandler` last; exported without `listen()` for Supertest
- `src/index.ts`: imports `env` first (fail-fast), `await runMigrations()` before `app.listen(env.PORT)`, wraps bootstrap in try/catch with `process.exit(1)` on failure

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `backend/src/db/seed.ts` | Placeholder seed — logs skip | Full sample data (10 users, ~50 tweets) deferred to Phase 4 per ROADMAP Plan 4.1 |
| `backend/src/app.ts` | No business routes | Auth, tweets, follows, likes routes arrive in Phase 2 |

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-01-01 | `errorHandler.ts` returns generic "Internal Server Error" when `NODE_ENV=production` for 500s; `err.stack` never serialized into response |
| T-01-02 | Secrets only from `env.ts` Zod validation; `process.exit(1)` when `JWT_SECRET`/`REFRESH_TOKEN_SECRET`/`DATABASE_URL` absent |
| T-01-03 | All PKs are UUID via `gen_random_uuid()` — prevents sequential ID enumeration on future endpoints |

## Self-Check

### Files Exist
- [x] backend/package.json (postgres@3, bcryptjs@2, tsx@4 — no uuid package)
- [x] backend/tsconfig.json (NodeNext, strict)
- [x] backend/src/env.ts (Zod schema, process.exit(1) on failure)
- [x] backend/src/db/schema.ts (4 tables, UUID PKs, composite PKs, CHECK, indexes)
- [x] backend/src/db/index.ts (drizzle + postgres client)
- [x] backend/src/db/migrate.ts (runMigrations() exported)
- [x] backend/src/db/seed.ts (idempotent placeholder)
- [x] backend/src/middleware/errorHandler.ts ({ error: string }, no stack in production)
- [x] backend/src/app.ts (express-async-errors first, errorHandler last, no listen())
- [x] backend/src/index.ts (runMigrations before listen, process.exit(1) on failure)
- [x] backend/drizzle/0000_faithful_la_nuit.sql (generated migration)

### Commits Exist
- [x] 10c7601 — Task 1: project config + env validation
- [x] 311b076 — Task 2: Drizzle schema + DB connection + migrations
- [x] e24e46a — Task 3: Express app + error handler + entry point

### Verification Commands Passed
- [x] `npm install` — exit 0
- [x] `npx drizzle-kit generate` — produced SQL migration with gen_random_uuid(), composite PKs, CHECK
- [x] `npx tsc --noEmit` — zero type errors

## Self-Check: PASSED

---
phase: 01-scaffolding-infrastructure
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/package.json
  - backend/tsconfig.json
  - backend/drizzle.config.ts
  - backend/.eslintrc.json
  - backend/.prettierrc
  - backend/src/env.ts
  - backend/src/db/index.ts
  - backend/src/db/schema.ts
  - backend/src/db/migrate.ts
  - backend/src/db/seed.ts
  - backend/src/middleware/errorHandler.ts
  - backend/src/app.ts
  - backend/src/index.ts
autonomous: true
requirements: [INFR-02, INFR-03, INFR-04, PROF-03, ERRH-01, ERRH-02, ERRH-03, ERRH-04, L10N-02]
user_setup: []

must_haves:
  truths:
    - "Backend boots on :4000 with no manual steps after npm install"
    - "Missing required env vars cause the process to exit(1) with a clear English message before the server starts"
    - "Drizzle migrations run automatically on backend startup before the server begins listening"
    - "All four tables (users, tweets, follows, likes) use UUID primary keys via gen_random_uuid()"
    - "Every request is logged with method, path, status, and duration"
    - "All API errors return JSON shaped { error: string } with an appropriate status code"
    - "Unhandled errors are caught by Express error middleware and never leak stack traces when NODE_ENV=production"
  artifacts:
    - path: "backend/src/env.ts"
      provides: "Zod-validated typed env object; process.exit(1) on missing vars"
      contains: "z.object"
    - path: "backend/src/db/schema.ts"
      provides: "Drizzle schema for users, tweets, follows, likes with UUID PKs"
      contains: "gen_random_uuid"
    - path: "backend/src/db/index.ts"
      provides: "postgres driver connection + drizzle instance"
      contains: "drizzle"
    - path: "backend/src/middleware/errorHandler.ts"
      provides: "Global Express error handler emitting { error: string }"
      contains: "res.status"
    - path: "backend/src/app.ts"
      provides: "Express app with morgan logging, express.json(), error handler wired last"
      min_lines: 15
    - path: "backend/src/index.ts"
      provides: "Entry point: load env, run migrations, then app.listen(PORT)"
      contains: "listen"
  key_links:
    - from: "backend/src/index.ts"
      to: "backend/src/db/migrate.ts"
      via: "await runMigrations() before listen"
      pattern: "migrat"
    - from: "backend/src/app.ts"
      to: "backend/src/middleware/errorHandler.ts"
      via: "app.use(errorHandler) registered last"
      pattern: "errorHandler"
    - from: "backend/src/db/index.ts"
      to: "backend/src/env.ts"
      via: "import env.DATABASE_URL"
      pattern: "env\\.DATABASE_URL"
---

<objective>
Scaffold the Express + TypeScript + Drizzle backend so it boots on port 4000 with validated environment variables, a Drizzle schema for all four tables, automatic migrations on startup, request logging, and a global JSON error handler.

Purpose: This is the foundation every Phase 2 endpoint builds on. Auth, tweets, follows, likes, timeline, and SSE all require this scaffold (schema, DB connection, env, error handling) to exist first.
Output: A runnable backend skeleton with no business routes yet (GET / returns 404, which is expected), migrations applied to the configured database, and structured request logging.
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
@docs/database.md
@AGENTS.md

<interfaces>
<!-- Schema contract derived from docs/database.md. Executor implements Drizzle table definitions matching these columns and constraints exactly. -->

users:        id UUID PK gen_random_uuid(), username VARCHAR(50) UNIQUE NOT NULL,
              email VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT NOT NULL,
              display_name VARCHAR(100), bio VARCHAR(160), avatar_url TEXT,
              refresh_token_hash TEXT, refresh_token_expires_at TIMESTAMP,
              created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now()

tweets:       id UUID PK gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              content VARCHAR(280) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT now(),
              deleted_at TIMESTAMP (nullable, soft delete)

follows:      follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              PRIMARY KEY (follower_id, following_id), CHECK (follower_id <> following_id)

likes:        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              tweet_id UUID NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
              created_at TIMESTAMP NOT NULL DEFAULT now(),
              PRIMARY KEY (user_id, tweet_id)

Indexes: tweets(user_id, created_at DESC); tweets(created_at DESC) WHERE deleted_at IS NULL;
         follows(following_id); users(username)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Project config, dependencies, and typed env validation</name>
  <files>backend/package.json, backend/tsconfig.json, backend/.eslintrc.json, backend/.prettierrc, backend/src/env.ts</files>
  <read_first>
    - .planning/research/STACK.md (sections "Core Technologies", "Auth Layer", "Validation", "Installation", "What NOT to Use") — defines the exact libraries and versions to use
    - .planning/PROJECT.md (Constraints section) — ports, stack mandates
    - AGENTS.md (Key Invariants) — "Secrets and URLs come from backend/src/env.ts — never hardcode values"
  </read_first>
  <action>
    Create backend/package.json with name "clontwitter-backend", "type": "module", and these dependencies per STACK.md (use the research-recommended libraries, NOT the alternatives the ROADMAP draft mentioned): express@^4, drizzle-orm@^0.30, postgres@^3 (the `postgres` driver, NOT `pg`), zod@^3, jsonwebtoken@^9, bcryptjs@^2, dotenv@^16, cors@^2, express-async-errors@^3, morgan@^1. devDependencies: typescript@^5, tsx@^4 (NOT ts-node — STACK.md "What NOT to Use"), drizzle-kit@^0.20, @types/express, @types/node, @types/jsonwebtoken, @types/bcryptjs, @types/morgan, @types/cors, eslint@^8, typescript-eslint@^7, prettier@^3. Do NOT add the `uuid` package — Node 20 ships crypto.randomUUID() and the DB generates UUIDs via gen_random_uuid().
    Add scripts: "dev": "tsx watch src/index.ts", "build": "tsc", "start": "node dist/index.js", "db:generate": "drizzle-kit generate", "db:migrate": "tsx src/db/migrate.ts", "db:seed": "tsx src/db/seed.ts", "lint": "eslint src", "format": "prettier --write src".
    Create backend/tsconfig.json: target ES2022, module NodeNext, moduleResolution NodeNext, strict true, esModuleInterop true, skipLibCheck true, outDir "dist", rootDir "src", include ["src"]. (Use ESM/NodeNext to match "type": "module"; this supersedes the ROADMAP draft's CommonJS note since tsx + postgres driver work cleanly under ESM.)
    Create backend/.eslintrc.json extending the typescript-eslint recommended config, and backend/.prettierrc with { "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }.
    Create backend/src/env.ts: import dotenv/config; define a Zod schema z.object with required string vars DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET, and PORT (z.coerce.number().default(4000)); also NODE_ENV (z.enum(['development','test','production']).default('development')). Call schema.safeParse(process.env); on failure, console.error a clear English message listing the missing/invalid var names from the ZodError and call process.exit(1). On success export the parsed typed object as `env`. All identifiers, comments, and messages in English (L10N-02).
  </action>
  <verify>
    <automated>cd backend && npm install && DATABASE_URL= JWT_SECRET= REFRESH_TOKEN_SECRET= npx tsx -e "import('./src/env.ts')" ; test $? -ne 0 && echo "EXIT-NONZERO-OK"</automated>
  </verify>
  <acceptance_criteria>
    - backend/package.json lists "postgres" (not "pg") and "bcryptjs" (not "bcrypt") and "tsx" (not "ts-node") in dependencies/devDependencies
    - backend/package.json does NOT contain a top-level "uuid" dependency
    - `cd backend && npm install` completes with exit code 0
    - Importing src/env.ts with DATABASE_URL/JWT_SECRET/REFRESH_TOKEN_SECRET unset causes a non-zero exit (process.exit(1)) and prints the names of the missing vars
    - All text in env.ts (comments, error messages) is in English
  </acceptance_criteria>
  <done>npm install succeeds; env.ts validates with Zod and exits non-zero with an English error naming missing vars when DATABASE_URL/JWT_SECRET/REFRESH_TOKEN_SECRET are absent.</done>
</task>

<task type="auto">
  <name>Task 2: Drizzle schema, DB connection, drizzle config, and migration runner</name>
  <files>backend/src/db/schema.ts, backend/src/db/index.ts, backend/drizzle.config.ts, backend/src/db/migrate.ts, backend/src/db/seed.ts</files>
  <read_first>
    - docs/database.md (full file) — exact columns, types, constraints, indexes, and ON DELETE CASCADE rules
    - backend/src/env.ts (created in Task 1) — to import env.DATABASE_URL
    - .planning/research/STACK.md ("Development Tools", "Docker Compose Service Order") — drizzle-kit + postgres driver pairing, migrate-on-startup pattern
  </read_first>
  <action>
    Create backend/src/db/schema.ts using drizzle-orm/pg-core. Define four tables exactly per docs/database.md and the <interfaces> block: users, tweets, follows, likes. Use uuid('id').primaryKey().default(sql`gen_random_uuid()`) for users.id and tweets.id (PROF-03 — UUID PKs prevent enumeration). For follows use a composite primaryKey(table.follower_id, table.following_id) plus a check constraint `follower_id <> following_id`. For likes use a composite primaryKey(table.user_id, table.tweet_id). Apply varchar length limits (username 50, email 255, display_name 100, bio 160, content 280) and NOT NULL / UNIQUE / references(...).onDelete('cascade') exactly as in docs/database.md. Define the four indexes from docs/database.md (including the partial index on tweets(created_at DESC) WHERE deleted_at IS NULL). Export all tables.
    Create backend/src/db/index.ts: import env from ../env.ts, create a postgres client via `postgres(env.DATABASE_URL)`, create and export `db = drizzle(client, { schema })`, and export the raw `client` for migration use. No business logic here.
    Create backend/drizzle.config.ts using drizzle-kit's defineConfig: schema "./src/db/schema.ts", out "./drizzle", dialect "postgresql", dbCredentials { url: process.env.DATABASE_URL }.
    Create backend/src/db/migrate.ts: export an async function runMigrations() that creates a dedicated postgres client (max:1) from env.DATABASE_URL, calls migrate(drizzle(client), { migrationsFolder: './drizzle' }) from drizzle-orm/postgres-js/migrator, then closes the client. When run directly (import.meta.url entry check), invoke runMigrations() and exit. This satisfies INFR-02 (auto-run migrations on startup) and backs the db:migrate script.
    Create backend/src/db/seed.ts as a runnable placeholder for INFR-03: export an async function seed() that connects, checks whether any users exist, logs "Seed skipped: users already exist" and returns early if so (idempotency contract), otherwise logs "Seed placeholder — full sample data added in Phase 4" and returns. Wire it to run when executed directly. Full sample data (10 users, ~50 tweets, follows, likes) is intentionally deferred to Phase 4 per ROADMAP Plan 4.1; this placeholder establishes the idempotent seed entry point now so docker startup can call it.
    After writing schema.ts, run `npx drizzle-kit generate` to produce the initial SQL migration in backend/drizzle/.
  </action>
  <verify>
    <automated>cd backend && npx drizzle-kit generate && ls drizzle/*.sql && grep -l "gen_random_uuid" drizzle/*.sql && grep -ri "follower_id" drizzle/*.sql</automated>
  </verify>
  <acceptance_criteria>
    - backend/src/db/schema.ts exports users, tweets, follows, likes tables
    - Generated SQL in backend/drizzle/*.sql contains "gen_random_uuid()" for users.id and tweets.id
    - Generated SQL contains a composite primary key on follows (follower_id, following_id) and a CHECK that follower_id differs from following_id
    - Generated SQL contains a composite primary key on likes (user_id, tweet_id)
    - Generated SQL contains "on delete cascade" for tweets.user_id, follows foreign keys, and likes foreign keys
    - backend/src/db/migrate.ts exports a runMigrations() async function importable by index.ts
    - backend/src/db/seed.ts seed() returns early and logs a skip message when users already exist (idempotent)
  </acceptance_criteria>
  <done>drizzle-kit generate produces a migration with UUID defaults, composite PKs, the no-self-follow CHECK, and cascade deletes; migrate.ts exposes runMigrations(); seed.ts is an idempotent placeholder.</done>
</task>

<task type="auto">
  <name>Task 3: Express app, global error handler, request logging, and entry point</name>
  <files>backend/src/middleware/errorHandler.ts, backend/src/app.ts, backend/src/index.ts</files>
  <read_first>
    - .planning/REQUIREMENTS.md (Error Handling & Observability section: ERRH-01..ERRH-04) — exact error shape and logging requirements
    - .planning/research/STACK.md ("Stack Patterns by Variant" → backend Express server) — express-async-errors usage and error handler shape
    - backend/src/env.ts and backend/src/db/migrate.ts (created in earlier tasks) — imports for index.ts
  </read_first>
  <action>
    Create backend/src/middleware/errorHandler.ts exporting an Express error-handling middleware with signature (err, req, res, next). If err is a ZodError, respond 400 with { error: <first issue message or a joined validation message> } (ERRH-03). Otherwise read err.status (default 500) and respond res.status(status).json({ error: status === 500 && env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message }) — never include err.stack in the response body (ERRH-02). Always log the full error server-side via console.error. The response shape is exactly { error: string } for every path (ERRH-01).
    Create backend/src/app.ts: import 'express-async-errors' at the very top, then create the express app, app.use(cors()), app.use(express.json()), app.use(morgan with a custom format string that includes :method :url :status :response-time ms so each request logs method, path, status, and duration (ERRH-04)). Add a placeholder router mount point comment for Phase 2 routes. Register app.use(errorHandler) as the LAST middleware. Export the app (do NOT call app.listen here — keep app importable for Supertest in Phase 2, per STACK.md integration-test pattern).
    Create backend/src/index.ts: import env from './env.js' first (forces fail-fast validation), import { runMigrations } from './db/migrate.js', import app from './app.js'. In an async bootstrap: await runMigrations() (INFR-02), then app.listen(env.PORT, () => console.log a startup message including the port). Wrap in try/catch that logs and process.exit(1) on bootstrap failure.
    All code, comments, and log strings in English (L10N-02). Use .js extension on relative imports since tsconfig uses NodeNext.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit && grep -q "errorHandler" src/app.ts && grep -q "runMigrations" src/index.ts && grep -q "response-time" src/app.ts</automated>
  </verify>
  <acceptance_criteria>
    - `cd backend && npx tsc --noEmit` reports no type errors
    - errorHandler.ts responds with { error: string } and references env.NODE_ENV to suppress messages in production for 500s
    - errorHandler.ts never writes err.stack into res.json
    - app.ts imports 'express-async-errors' as the first import and registers errorHandler.ts last
    - app.ts uses morgan with a format containing :method, :url, :status, and :response-time
    - index.ts calls runMigrations() before app.listen(env.PORT)
    - app.ts exports the app without calling app.listen()
  </acceptance_criteria>
  <done>tsc passes with no errors; app wires morgan request logging + JSON error handler returning { error: string }; index.ts runs migrations then listens on env.PORT; app is exported for test reuse.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| environment → process | Env vars (secrets, DB URL) cross into the app at boot; missing/invalid values must fail fast |
| package registry → node_modules | Third-party packages are installed and executed during build/run |
| client → API (future) | Phase 2 endpoints will accept untrusted input; this plan establishes the validation + error scaffolding they rely on |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Information Disclosure | errorHandler.ts | mitigate | 500 responses return generic "Internal Server Error" when NODE_ENV=production; err.stack never serialized into the response body (ERRH-02) |
| T-01-02 | Tampering | env.ts secrets | mitigate | Secrets read only from validated env (env.ts); no hardcoded fallbacks; process.exit(1) if JWT_SECRET/REFRESH_TOKEN_SECRET/DATABASE_URL absent (INFR-04) |
| T-01-03 | Spoofing/Information Disclosure | UUID primary keys | mitigate | All PKs are UUID via gen_random_uuid(), preventing sequential ID enumeration on future public endpoints (PROF-03) |
| T-01-SC | Tampering | npm installs (postgres, drizzle-orm, jsonwebtoken, bcryptjs, etc.) | accept | All packages are mainstream, high-download, mandated-by-research libraries from STACK.md; no [ASSUMED]/[SUS] packages introduced. No package legitimacy audit table exists in RESEARCH; packages match STACK.md "Installation" list verbatim |
</threat_model>

<verification>
- `cd backend && npm install` succeeds (exit 0)
- `npx tsc --noEmit` passes with zero type errors
- `npx drizzle-kit generate` produces a SQL migration containing gen_random_uuid(), composite PKs, no-self-follow CHECK, and cascade deletes
- Importing env.ts with required vars unset triggers process.exit(1) with an English message naming the missing vars
- errorHandler returns { error: string } and suppresses stack traces in production
</verification>

<success_criteria>
1. Backend dependencies install and the TypeScript project compiles with no errors
2. Drizzle schema for users, tweets, follows, likes matches docs/database.md (UUID PKs, composite PKs, soft-delete column, cascade deletes)
3. Migrations are generated and runMigrations() is wired to run on startup before listen (INFR-02)
4. Env validation fails fast with a clear English error when required vars are missing (INFR-04)
5. Global error handler returns consistent { error: string } JSON without leaking stack traces; request logging captures method/path/status/duration (ERRH-01..ERRH-04)
6. Idempotent seed placeholder exists as the entry point for Phase 4 data (INFR-03)
</success_criteria>

<output>
Create `.planning/phases/01-scaffolding-infrastructure/01-01-SUMMARY.md` when done
</output>

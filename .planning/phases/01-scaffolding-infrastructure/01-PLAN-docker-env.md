---
phase: 01-scaffolding-infrastructure
plan: 03
type: execute
wave: 2
depends_on: ["01-01", "01-02"]
files_modified:
  - docker-compose.yml
  - backend/Dockerfile
  - backend/.dockerignore
  - frontend/Dockerfile
  - frontend/.dockerignore
  - .env.example
  - .env
  - .gitignore
  - README.md
autonomous: false
requirements: [INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, L10N-02]

must_haves:
  truths:
    - "docker compose up --build starts postgres (:5432), backend (:4000), and frontend (:3000) with no manual steps"
    - "The backend container waits for postgres to be healthy, runs migrations, then starts listening"
    - "GET http://localhost:4000 returns a response (404 is acceptable — no routes yet)"
    - "GET http://localhost:3000 loads the Next.js home page"
    - ".env.example documents every required environment variable"
    - ".env and node_modules and build output are gitignored"
    - "README documents prerequisites, docker compose up, how to access the app, and how to run tests"
  artifacts:
    - path: "docker-compose.yml"
      provides: "Three-service orchestration with postgres healthcheck and depends_on ordering"
      contains: "postgres:16"
    - path: "backend/Dockerfile"
      provides: "Backend image: install, build, run migrations then start"
      contains: "node:20"
    - path: "frontend/Dockerfile"
      provides: "Frontend image: install, next build, next start"
      contains: "node:20"
    - path: ".env.example"
      provides: "Documented env var template"
      contains: "DATABASE_URL"
    - path: ".gitignore"
      provides: "Ignores .env, node_modules, dist, .next"
      contains: ".env"
    - path: "README.md"
      provides: "Runbook: prerequisites, startup, access, tests"
      min_lines: 25
  key_links:
    - from: "docker-compose.yml"
      to: "backend/Dockerfile"
      via: "backend service build: ./backend"
      pattern: "build:.*backend"
    - from: "docker-compose.yml"
      to: "postgres healthcheck"
      via: "backend depends_on postgres condition: service_healthy"
      pattern: "service_healthy"
    - from: "backend container start"
      to: "backend/src/db/migrate.ts"
      via: "migrations run on startup before listen (from Plan 01)"
      pattern: "migrat"
---

<objective>
Wire the three services together with Docker Compose so `docker compose up --build` starts PostgreSQL, the Express backend, and the Next.js frontend with no manual steps, document every env var in .env.example, set up .gitignore, and write the README runbook.

Purpose: This is the evaluator's entry point. The TheFlock evaluator runs `docker compose up --build` and expects a working stack. This plan turns the two scaffolds from Wave 1 into a one-command runnable system and proves all three services talk to each other.
Output: docker-compose.yml, a Dockerfile per service, .env.example + local .env, .gitignore, and a README runbook. Plus a human-verify checkpoint confirming the full stack boots.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/research/STACK.md
@AGENTS.md

# Wire-up depends on Wave 1 outputs:
@.planning/phases/01-scaffolding-infrastructure/01-01-SUMMARY.md
@.planning/phases/01-scaffolding-infrastructure/01-02-SUMMARY.md

<interfaces>
<!-- From Plan 01 (backend): env vars consumed by backend/src/env.ts -->
DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET, PORT (default 4000), NODE_ENV
Backend scripts: "build" (tsc), "start" (node dist/index.js), "db:migrate", "db:seed"
Backend runs migrations automatically on startup via index.ts -> runMigrations() (INFR-02)

<!-- From Plan 02 (frontend): env var consumed by frontend/src/lib/api.ts -->
NEXT_PUBLIC_API_URL (e.g. http://localhost:4000)
Frontend scripts: "build" (next build), "start" (next start)

<!-- STACK.md "Docker Compose Service Order" (reference target): -->
postgres: image postgres:16-alpine, port 5432, POSTGRES_DB clontwitter, user/pass postgres, healthcheck
backend:  build ./backend, port 4000, depends_on postgres service_healthy,
          DATABASE_URL postgres://postgres:postgres@postgres:5432/clontwitter
frontend: build ./frontend, port 3000, depends_on backend, NEXT_PUBLIC_API_URL http://localhost:4000
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Dockerfiles and .dockerignore for backend and frontend</name>
  <files>backend/Dockerfile, backend/.dockerignore, frontend/Dockerfile, frontend/.dockerignore</files>
  <read_first>
    - .planning/phases/01-scaffolding-infrastructure/01-01-SUMMARY.md — backend build/start scripts and entry point produced in Plan 01
    - .planning/phases/01-scaffolding-infrastructure/01-02-SUMMARY.md — frontend build/start scripts produced in Plan 02
    - .planning/research/STACK.md ("Core Technologies" Node 20 LTS, "Docker Compose Service Order") — node:20 base image; bcryptjs avoids native build issues in Alpine
  </read_first>
  <action>
    Create backend/Dockerfile FROM node:20-alpine, WORKDIR /app, COPY package.json package-lock.json ./, RUN npm ci, COPY the rest (src, tsconfig.json, drizzle.config.ts, drizzle/), RUN npm run build, EXPOSE 4000, CMD running node dist/index.js. Because index.ts runs runMigrations() before listen (from Plan 01), migrations apply automatically on container start (INFR-02) — do NOT add a separate migrate step in the Dockerfile CMD. Note: bcryptjs is pure-JS so no Alpine native build deps are needed (per STACK.md).
    Create frontend/Dockerfile FROM node:20-alpine, WORKDIR /app, COPY package.json package-lock.json ./, RUN npm ci, COPY the rest (src, next.config.js, tsconfig.json, tailwind.config.ts, postcss.config.js), set ENV NEXT_TELEMETRY_DISABLED=1, declare ARG NEXT_PUBLIC_API_URL and promote it to ENV NEXT_PUBLIC_API_URL so it is inlined at build time (Next.js bundles NEXT_PUBLIC_* during next build), RUN npm run build, EXPOSE 3000, CMD running npm start.
    Create backend/.dockerignore and frontend/.dockerignore each containing: node_modules, dist, .next, .env, npm-debug.log, .git.
    All file contents and comments in English (L10N-02).
  </action>
  <verify>
    <automated>test -f backend/Dockerfile && test -f frontend/Dockerfile && grep -q "node:20" backend/Dockerfile && grep -q "node:20" frontend/Dockerfile && grep -q "npm run build" backend/Dockerfile && grep -q "node_modules" backend/.dockerignore</automated>
  </verify>
  <acceptance_criteria>
    - backend/Dockerfile uses node:20-alpine, runs npm ci then npm run build, and CMD runs node dist/index.js
    - backend/Dockerfile does NOT run a separate migrate command (migrations run inside index.ts on startup)
    - frontend/Dockerfile uses node:20-alpine, runs npm run build, CMD runs npm start, and declares NEXT_PUBLIC_API_URL as ARG promoted to ENV before build
    - Both .dockerignore files exclude node_modules, .env, dist, and .next
    - All file contents are in English
  </acceptance_criteria>
  <done>Both Dockerfiles build from node:20-alpine, install with npm ci, build, and start their service; .dockerignore files exclude node_modules/.env/build output.</done>
</task>

<task type="auto">
  <name>Task 2: docker-compose.yml, .env.example, .env, .gitignore, README</name>
  <files>docker-compose.yml, .env.example, .env, .gitignore, README.md</files>
  <read_first>
    - .planning/research/STACK.md ("Docker Compose Service Order") — exact service shape, healthcheck guidance, depends_on ordering
    - .planning/REQUIREMENTS.md (INFR-01..INFR-05 in "Infrastructure & Operations") — one-command startup, auto-migrate, seed on first run, env documentation, README runbook
    - .planning/phases/01-scaffolding-infrastructure/01-01-SUMMARY.md and 01-02-SUMMARY.md — confirm env var names each service reads and the db:seed script name
    - AGENTS.md (Language, Commit Message Convention) — English docs; chore: prefix for infra
  </read_first>
  <action>
    Create docker-compose.yml at repo root with three services (INFR-01).
    postgres service: image postgres:16-alpine, ports "5432:5432", environment POSTGRES_DB=clontwitter / POSTGRES_USER=postgres / POSTGRES_PASSWORD=postgres, a named volume (e.g. pgdata:/var/lib/postgresql/data) for persistence, and a healthcheck running pg_isready -U postgres with interval 5s, timeout 5s, retries 5.
    backend service: build context ./backend with build arg/none needed, ports "4000:4000", depends_on postgres with condition: service_healthy so migrations only run after the DB is ready (INFR-02), environment DATABASE_URL=postgres://postgres:postgres@postgres:5432/clontwitter, JWT_SECRET=${JWT_SECRET}, REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}, PORT=4000, NODE_ENV=development. For seed-on-first-run (INFR-03), set the backend service command to run the idempotent seed then start: a shell wrapper equivalent to `npm run db:seed && node dist/index.js` (the seed from Plan 01 is idempotent — it skips when users already exist, so re-running on every container start is safe). If the seed must run after migrations and migrations run inside index.ts, instead chain `node dist/index.js` to invoke seed post-migration internally OR document `docker compose exec backend npm run db:seed` in the README as the populate step. Choose the wrapper-command approach as primary so first run produces data with no manual step.
    frontend service: build context ./frontend with build args NEXT_PUBLIC_API_URL=http://localhost:4000, ports "3000:3000", depends_on backend, environment NEXT_PUBLIC_API_URL=http://localhost:4000.
    Declare the named volume pgdata at the bottom of the compose file.
    Create .env.example at root documenting EVERY required var with example values and inline comments (INFR-04): DATABASE_URL=postgres://postgres:postgres@postgres:5432/clontwitter, JWT_SECRET=change-me-access-secret, REFRESH_TOKEN_SECRET=change-me-refresh-secret, PORT=4000, NODE_ENV=development, NEXT_PUBLIC_API_URL=http://localhost:4000.
    Create .env at root with concrete local dev values for the same keys (this file is gitignored).
    Create .gitignore at root covering: .env, .env.local, node_modules/, dist/, .next/, *.log, coverage/, playwright-report/, .DS_Store.
    Create README.md at root in English (INFR-05, L10N-02) with these sections: title + one-line description; Prerequisites (Node 20, Docker + Docker Compose); Quick Start (copy .env.example to .env, then docker compose up --build); Accessing the app (frontend http://localhost:3000, backend API http://localhost:4000, postgres :5432); Seed data (the db:seed command; note full sample data lands in Phase 4); Running tests (placeholder: backend `cd backend && npm test`, frontend `cd frontend && npm test`, e2e `npm run test:e2e` — implemented in later phases); Environment variables table (var | description | example); Ports table (service | port).
  </action>
  <verify>
    <automated>test -f docker-compose.yml && grep -q "postgres:16" docker-compose.yml && grep -q "service_healthy" docker-compose.yml && grep -q "4000:4000" docker-compose.yml && grep -q "3000:3000" docker-compose.yml && grep -q "DATABASE_URL" .env.example && grep -q ".env" .gitignore && grep -qi "docker compose up" README.md</automated>
  </verify>
  <acceptance_criteria>
    - docker-compose.yml defines exactly three services: postgres, backend, frontend (INFR-01)
    - postgres service has a healthcheck (pg_isready) and a named volume
    - backend service depends_on postgres with condition: service_healthy (INFR-02)
    - backend service command runs the idempotent db:seed before/with starting the server so first run is non-empty (INFR-03)
    - frontend service maps 3000:3000 and receives NEXT_PUBLIC_API_URL as both build arg and env
    - .env.example documents DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET, PORT, NODE_ENV, NEXT_PUBLIC_API_URL (INFR-04)
    - .gitignore ignores .env, node_modules/, dist/, .next/
    - README.md contains Prerequisites, Quick Start (docker compose up --build), Accessing the app, and Running tests sections (INFR-05); all text in English
  </acceptance_criteria>
  <done>docker-compose.yml orchestrates postgres+backend+frontend with healthcheck-gated startup and idempotent seed; .env.example documents all vars; .gitignore covers secrets/build output; README runbook is evaluator-ready.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Verify full stack boots with docker compose up --build</name>
  <what-built>
    A complete Docker Compose stack: PostgreSQL 16, the Express backend (with auto-migrations and idempotent seed), and the Next.js frontend, plus .env.example, .env, .gitignore, and the README runbook. This is the integration gate proving all three Wave 1 + Wave 2 outputs work together — it requires Docker running on the user's machine, which Claude cannot do headless.
  </what-built>
  <how-to-verify>
    1. From the repo root run: `cp .env.example .env` (if not already present).
    2. Run: `docker compose up --build`. Wait for all three containers to report ready (postgres healthy, backend "listening on 4000", frontend "ready on 3000").
    3. In a new terminal run: `docker compose ps` — confirm postgres, backend, and frontend are all Up/running (postgres should show healthy).
    4. Open http://localhost:3000 in a browser — the Next.js home page should load (it may redirect to /login, which 404s since that route arrives in Phase 3 — the page rendering at all is the pass condition).
    5. Run: `curl -i http://localhost:4000` — a response (HTTP 404 is expected and acceptable; no business routes exist yet).
    6. Check the backend container logs — confirm migrations ran ("migrations applied" or equivalent) and the seed either populated data or logged the idempotent skip message.
  </how-to-verify>
  <resume-signal>Type "approved" if all three services start and respond as described, or describe what failed (which container, what error in logs).</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| host → containers | Env vars (DB URL, JWT secrets) are passed into containers via compose; secrets must not be committed |
| postgres ↔ backend | Internal compose network carries the DB connection; credentials are dev-only defaults |
| docker image build | Dockerfiles install packages and build code inside the image |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-07 | Information Disclosure | .env secrets in git | mitigate | .gitignore excludes .env and .env.local; only .env.example (with placeholder values) is committed; JWT/refresh secrets are never hardcoded in compose (read via ${VAR}) |
| T-01-08 | Denial of Service | backend starts before DB ready | mitigate | backend depends_on postgres with condition: service_healthy and a pg_isready healthcheck, so migrations cannot run against an unready DB (INFR-02) |
| T-01-09 | Tampering | weak default DB credentials | accept | postgres/postgres are local-dev-only defaults for the challenge evaluator; the container is not exposed beyond localhost; production hardening is out of scope for this challenge |
| T-01-SC | Tampering | docker base images (node:20-alpine, postgres:16-alpine) | accept | Official Docker Hub images mandated by STACK.md "Docker Compose Service Order"; no third-party or unverified images introduced |
</threat_model>

<verification>
- `docker compose up --build` starts all three services with no manual steps (INFR-01)
- backend waits for postgres health, then runs migrations on startup (INFR-02) and the idempotent seed populates first-run data (INFR-03)
- GET http://localhost:4000 returns a response (404 acceptable); GET http://localhost:3000 loads the page
- `docker compose ps` shows postgres healthy and backend/frontend running
- .env.example documents every required var (INFR-04); .gitignore excludes .env and build output
- README runbook covers prerequisites, startup, access, and tests (INFR-05)
</verification>

<success_criteria>
1. `docker compose up --build` starts postgres (:5432), backend (:4000), and frontend (:3000) with no manual steps
2. Migrations run automatically on backend startup after postgres is healthy
3. Idempotent seed populates sample-data entry point on first run (full data in Phase 4)
4. Frontend loads at :3000 and backend responds at :4000
5. .env.example documents every required environment variable; .env and build artifacts are gitignored
6. README provides a complete, English runbook for an evaluator starting from zero
</success_criteria>

<output>
Create `.planning/phases/01-scaffolding-infrastructure/01-03-SUMMARY.md` when done
</output>

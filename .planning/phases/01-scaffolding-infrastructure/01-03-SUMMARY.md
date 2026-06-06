---
phase: 01-scaffolding-infrastructure
plan: "03"
subsystem: infra
tags: [docker, docker-compose, dockerfile, env, gitignore, readme]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [docker-stack, one-command-startup, env-docs, readme-runbook]
  affects: [evaluator-entry-point, all-phases]
key_files:
  created:
    - docker-compose.yml
    - backend/Dockerfile
    - backend/.dockerignore
    - frontend/Dockerfile
    - frontend/.dockerignore
    - .env.example
    - .env
    - .gitignore
    - README.md
  modified:
    - backend/.gitignore
decisions:
  - "backend CMD runs db:seed then node dist/index.js — idempotent seed covers INFR-03 on first run with zero manual steps"
  - "Migrations run inside index.ts (Plan 01) — no separate migrate step in Dockerfile CMD needed"
  - "frontend NEXT_PUBLIC_API_URL declared as ARG and promoted to ENV before npm run build so Next.js inlines it at build time"
  - "pgdata named volume ensures DB state survives container restarts"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-06-04"
  tasks_completed: 2
  tasks_pending_human: 1
  files_created: 9
---

# Phase 01 Plan 03: Docker + Env + README Summary

Docker Compose stack wiring PostgreSQL 16, the Express backend, and the Next.js frontend into a one-command startup. Includes Dockerfiles for each service, `.env.example` documenting all env vars, root `.gitignore`, and a README runbook for evaluators.

## Tasks Completed (Automated)

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Dockerfiles and .dockerignore | 6f53949 | backend/Dockerfile, frontend/Dockerfile, *.dockerignore |
| 2 | docker-compose.yml, .env.example, .env, .gitignore, README | 2606586 | docker-compose.yml, .env.example, .gitignore, README.md |

## Task 3 — Human Verify (Pending)

This task requires Docker running on the user's machine to verify `docker compose up --build` starts all three services.

## What Was Built

### Dockerfiles
- `backend/Dockerfile`: `node:20-alpine`, `npm ci`, `npm run build`, `CMD node dist/index.js`; migrations run inside `index.ts` on container start (no separate migrate step needed); bcryptjs avoids Alpine native build deps
- `frontend/Dockerfile`: `node:20-alpine`, `npm ci`, `ARG NEXT_PUBLIC_API_URL` promoted to `ENV` before `npm run build` (inlines at build time), `CMD npm start`
- Both `.dockerignore`: exclude `node_modules`, `.env`, `dist`, `.next`, `.git`

### docker-compose.yml
- `postgres`: `postgres:16-alpine`, port 5432, named volume `pgdata`, healthcheck via `pg_isready -U postgres` (interval 5s, retries 5)
- `backend`: builds `./backend`, port 4000, `depends_on postgres condition: service_healthy`, command `npm run db:seed && node dist/index.js` (idempotent seed on every start, INFR-03)
- `frontend`: builds `./frontend` with `NEXT_PUBLIC_API_URL` build arg, port 3000, `depends_on backend`

### .env.example
Documents all 6 required vars: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `PORT`, `NODE_ENV`, `NEXT_PUBLIC_API_URL` with inline comments (INFR-04).

### .gitignore
Covers `.env`, `.env.local`, `node_modules/`, `dist/`, `.next/`, logs, `coverage/`, `playwright-report/`, `.DS_Store`.

### README.md
Sections: title + description; Prerequisites (Node 20, Docker + Compose); Quick Start (`docker compose up --build`); Accessing the App (table: frontend/backend/postgres URLs); Seed Data; Running Tests (placeholder); Environment Variables table; Ports table. All in English (INFR-05, L10N-02).

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-01-07 | `.gitignore` excludes `.env`/`.env.local`; only `.env.example` (placeholder values) committed; JWT/refresh secrets passed via `${VAR}` from host env, never hardcoded in compose |
| T-01-08 | `backend depends_on postgres condition: service_healthy` + `pg_isready` healthcheck prevents backend starting before DB is ready |
| T-01-09 | `postgres/postgres` credentials are local-dev-only; container not exposed beyond localhost |

## Self-Check

### Files Exist
- [x] docker-compose.yml (postgres:16, service_healthy, 4000:4000, 3000:3000)
- [x] backend/Dockerfile (node:20-alpine, npm run build, CMD node dist/index.js)
- [x] frontend/Dockerfile (node:20-alpine, ARG NEXT_PUBLIC_API_URL, npm run build, CMD npm start)
- [x] backend/.dockerignore / frontend/.dockerignore (node_modules, .env, dist, .next)
- [x] .env.example (DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET, PORT, NODE_ENV, NEXT_PUBLIC_API_URL)
- [x] .gitignore (.env, node_modules/, dist/, .next/)
- [x] README.md (Prerequisites, Quick Start, Accessing the App, Running Tests — all English)

### Commits Exist
- [x] 6f53949 — Task 1: Dockerfiles
- [x] 2606586 — Task 2: docker-compose + env + README

### Automated Verification Passed
- [x] docker-compose.yml contains postgres:16, service_healthy, 4000:4000, 3000:3000
- [x] .env.example contains DATABASE_URL
- [x] .gitignore contains .env
- [x] README.md contains "docker compose up"

### Human Verify: PENDING
Task 3 requires running `docker compose up --build` with Docker available.

## Self-Check: PASSED (automated tasks; human verify pending)

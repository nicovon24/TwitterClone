# 005 — Monorepo: Dual package.json without turborepo/nx

## Status
Accepted

## Context
The project has a frontend (Next.js) and a backend (Express) as separate projects that must coexist in the same repository. Options considered: turborepo, nx, and two independent `package.json` files. The project is a scoped challenge, not an enterprise monorepo with dozens of shared packages.

## Decision
- Structure with independent `backend/package.json` and `frontend/package.json`.
- No `shared/` package and no shared TypeScript types between frontend and backend.
- Docker Compose orchestrates the three services (postgres, backend, frontend) from the root.
- The root `package.json` only orchestrates E2E commands and Docker scripts.

```
ClonTwitter/
  backend/
    package.json
    src/
  frontend/
    package.json
    src/
  docker-compose.yml
  package.json   ← root scripts only (test:e2e, docker:up)
```

## Consequences

**Advantages:**
- Simple and understandable setup without extra tooling.
- Docker Compose works without special workspace configuration.
- Each project can be run, built, and tested independently.
- No turborepo/nx configuration overhead for a challenge-scope project.

**Disadvantages:**
- TypeScript types are not shared: if a type changes in the backend, it must be updated manually in the frontend.
- No shared build cache (turborepo would provide this automatically).
- Accepted trade-off for the challenge scope; in a real production project, turborepo or nx would be preferred.

## Date
2026-06-04

---
phase: 02-backend-auth-core-api
plan: 01
subsystem: backend/auth
tags: [auth, jwt, bcrypt, express, drizzle]
dependency_graph:
  requires: [01-PLAN-backend-scaffold]
  provides: [requireAuth middleware, /auth endpoints]
  affects: [all Phase 2 routes that use requireAuth]
tech_stack:
  added: []
  patterns: [JWT access+refresh token rotation, bcryptjs hashing, express-async-errors propagation, Zod validation, NodeNext module resolution]
key_files:
  created:
    - backend/src/middleware/requireAuth.ts
    - backend/src/services/authService.ts
    - backend/src/routes/auth.routes.ts
  modified:
    - backend/src/app.ts
decisions:
  - Refresh token is a JWT signed with REFRESH_TOKEN_SECRET (not random UUID) so userId can be extracted without a DB scan; its bcrypt hash is stored in users.refresh_token_hash for replay prevention
  - Same 401 message for wrong email and wrong password to prevent user enumeration (STRIDE T-02-02)
  - requireAuth returns 401 immediately without calling next() on any failure path, preventing accidental passthrough
metrics:
  duration: ~15min
  completed: 2026-06-04
  tasks_completed: 3
  files_created: 3
  files_modified: 1
---

# Phase 02 Plan 01: Auth Endpoints Summary

JWT authentication layer with register, login, logout, refresh, and me endpoints plus requireAuth middleware protecting all subsequent routes.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | requireAuth middleware | 10c8936 | backend/src/middleware/requireAuth.ts |
| 2 | authService (register, login, logout, refresh, me) | 2862399 | backend/src/services/authService.ts |
| 3 | auth router + wire into app.ts | 354c8c5 | backend/src/routes/auth.routes.ts, backend/src/app.ts |

## What Was Built

**requireAuth.ts** — Express RequestHandler that reads `Authorization: Bearer <token>`, calls `jwt.verify` with `JWT_SECRET`, and attaches `req.user = { id, email }` to the request. Missing header, malformed format, expired token, and bad signature all return `401 { error: "Unauthorized" }`. Global `Express.Request.user` type declared inline.

**authService.ts** — Five async service functions:
- `register`: duplicate email/username → 409; bcrypt hash password (rounds=10); insert user; issue JWT access token (15m, JWT_SECRET) + refresh token JWT (30d, REFRESH_TOKEN_SECRET); store refresh token bcrypt hash in DB.
- `login`: find user by email; bcrypt.compare; same error message for missing user vs wrong password (anti-enumeration); issue + rotate tokens.
- `logout`: nulls out `refresh_token_hash` and `refresh_token_expires_at`.
- `refresh`: jwt.verify with REFRESH_TOKEN_SECRET to extract user id; load user with non-expired token; bcrypt.compare raw token vs stored hash; rotate on success.
- `me`: returns PublicUser (no password_hash, no refresh_token_hash).

**auth.routes.ts** — Express Router with 5 endpoints. Zod validates all request bodies before reaching service. ZodErrors propagate to errorHandler → 400. Service errors carry `.status` and propagate via express-async-errors.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all endpoints return real data from the database.

## Threat Flags

No new security surface beyond what the plan's threat model covers. All T-02-01 through T-02-05 mitigations are implemented:
- T-02-01: jwt.verify rejects tampered/forged/expired tokens
- T-02-02: same 401 message for wrong email or wrong password
- T-02-03: refresh token is signed JWT + bcrypt hash in DB; raw value never persisted
- T-02-04: password_hash and refresh_token_hash excluded from all API responses
- T-02-05: Zod validates all inputs before service layer; Drizzle ORM — no raw SQL interpolation

## Self-Check: PASSED

- backend/src/middleware/requireAuth.ts — FOUND
- backend/src/services/authService.ts — FOUND
- backend/src/routes/auth.routes.ts — FOUND
- Commits 10c8936, 2862399, 354c8c5 — verified in git log
- `npx tsc --noEmit` — zero errors

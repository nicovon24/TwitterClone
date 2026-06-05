# AGENTS.md — Twitter Clone (TheFlock Challenge)

> Read this file at the start of every session. It tells you where things live, what the rules are, and what to do at the end of every session.

---

## What to Read First Per Task

Always start with `docs/current.md` — it tells you what was done last session, what's in progress, and what comes next.

| Task type         | Start here                                          |
|-------------------|-----------------------------------------------------|
| Any session       | `docs/current.md` → then task-specific file below  |
| Backend feature   | `docs/api.md` → `backend/src/db/schema.ts`         |
| Frontend feature  | `docs/api.md` → `frontend/src/lib/api.ts`          |
| Auth flow         | `docs/architecture.md` ADR-001                     |
| DB schema change  | `backend/src/db/schema.ts` → run drizzle-kit       |
| Deploy / env vars | `docs/infrastructure.md`                           |
| Testing           | `docs/testing.md`                                  |
| Vision / scope    | `docs/vision.md`                                   |

---

## Workflow Rule

**Code always starts with a SPEC.** No PLAN without a SPEC first. No code without a PLAN first.  
See `docs/workflow.md` for the full SPEC → PLAN → CODE → REVIEW flow and the four role definitions.

---

## Key Invariants

- **Never access Drizzle/pg directly in controllers** — use service functions in `backend/src/services/`
- **Secrets and URLs come from `backend/src/env.ts`** — never hardcode values
- **JWT access token (15 min) + refresh token (30 days) stored in localStorage** — frontend sends `Authorization: Bearer <token>`, Axios interceptor refreshes automatically on 401; never use httpOnly cookies for auth
- **One like per `(user_id, tweet_id)`** — enforced at DB level (composite PK)
- **One follow per `(follower_id, following_id)`** — enforced at DB level (composite PK)
- **Tweet content max 280 chars** — validated with Zod on the backend, counted in real-time on the frontend
- **Soft delete for tweets** — set `deleted_at`, never hard delete
- **Timeline uses cursor pagination** — cursor is the last tweet's `id`, never use offset

---

## Language

All project documentation must be written in **English**. This applies to:
- All `.md` files (root, `backend/`, `frontend/`, `docs/`)
- Code comments, JSDoc, and inline documentation
- Commit messages

The app UI remains in **Spanish** (target: Argentine/Spanish-speaking users).

---

## Session-End Protocol (non-negotiable)

Before ending any session that produced code changes, perform these steps **in order**:

1. **Move stale entries out of `docs/current.md`** — anything in `## Recently shipped` older than ~7 days, or anything in `## Now` that is now done, gets cut and pasted into `docs/changelog.md` under a new dated heading (`## YYYY-MM-DD — feature-name`).
2. **Update `## Now`** — bump the date, rewrite the one-sentence "Working on" to reflect the next thing.
3. **Update `## Next`** — reorder, remove what was just done, add what surfaced during this session.
4. **Update `## Blocked / Known issues`** — add anything new, remove anything resolved.
5. **Update `## Recently shipped`** — prepend today's date with a one-line summary of what shipped this session.
6. **If an architectural decision was made** — add an ADR to `docs/architecture.md`. Do NOT log architectural decisions in `docs/current.md` or `docs/changelog.md`.
7. **Verify `docs/current.md` is still ≤ ~80 lines.** If it grew past that, more entries need to move to `docs/changelog.md`.

This is non-negotiable. Skipping it means the next session starts blind. The user does not need to ask for it — do it automatically as the final step of any session that produced changes.

---

## Commit Message Convention

```
chore: infrastructure and config changes
feat: new user-facing functionality
fix: bug fixes
test: adding or fixing tests
docs: documentation only
refactor: code changes with no behavior change
```

Commits must tell the story of the build — one feature at a time, no squash, no single giant commit.

---

## Project Structure

```
ClonTwitter/
├── AGENTS.md                   # This file
├── README.md                   # Runbook (mandatory for evaluators)
├── docker-compose.yml          # Full stack: postgres + backend + frontend
├── .env.example                # All env vars documented with examples
├── challenge/                  # Challenge brief (do not modify)
├── docs/
│   ├── vision.md               # Product scope and goals
│   ├── architecture.md         # ADRs — architectural decisions
│   ├── current.md              # Active session state
│   ├── changelog.md            # History of shipped features
│   ├── workflow.md             # GSD phases and execution plan
│   ├── infrastructure.md       # Docker, env vars, deploy
│   ├── api.md                  # REST endpoint reference
│   └── testing.md              # Testing strategy and coverage targets
├── backend/                    # Express + Drizzle + PostgreSQL
│   └── src/
│       ├── env.ts              # All env vars (single source of truth)
│       ├── app.ts              # Express app setup
│       ├── index.ts            # Server entry point
│       ├── db/
│       │   ├── schema.ts       # Drizzle schema (users, tweets, follows, likes)
│       │   └── index.ts        # DB connection pool
│       ├── routes/             # Express route handlers (thin, delegate to services)
│       ├── services/           # Business logic (DB access lives here)
│       ├── middleware/
│       │   ├── requireAuth.ts  # JWT validation middleware
│       │   └── errorHandler.ts # Global error handler
│       └── __tests__/
├── frontend/                   # Next.js 14 App Router
│   └── src/
│       ├── lib/api.ts          # Axios instance + interceptors
│       ├── store/              # Zustand stores
│       ├── app/                # Next.js pages
│       └── components/
└── global-tests/               # Playwright E2E
```

# Architecture Decisions

Each ADR records a decision, its context, and the rationale. Once logged, ADRs are not deleted — they are superseded by newer ones.

---

## ADR-001 — Authentication: JWT + httpOnly Cookie

**Date:** 2026-06-04
**Status:** Accepted

### Context
The challenge explicitly prohibits third-party auth solutions (Firebase Auth, Supabase Auth). We need a custom auth implementation.

### Decision
Use JWT signed with a secret (`JWT_SECRET`). On login/register:
- Backend sets the token as an `httpOnly` cookie (secure in production, prevents XSS access)
- Token is also returned in the response body so the frontend can store it in Zustand (in-memory, survives the current tab session)
- On page refresh, the frontend calls `GET /api/auth/me` using the httpOnly cookie to restore the session

### Auth middleware
`requireAuth` middleware reads from `Authorization: Bearer <token>` header first, falls back to the cookie. This supports both browser clients and API testing tools.

### Trade-offs
- httpOnly cookie prevents XSS from stealing the token
- Token in Zustand makes it easy to add to Axios headers without reading the cookie
- CSRF is mitigated by requiring `Content-Type: application/json` on state-changing requests (standard SameSite cookie behavior)

---

## ADR-002 — Stack: Next.js 14 + Express + Drizzle + PostgreSQL

**Date:** 2026-06-04
**Status:** Accepted

### Context
The challenge allows any stack. Evaluators score execution, not the stack choice — but the choice must be justified.

### Decision
- **Frontend:** Next.js 14 App Router — SSR capability, file-based routing, React Server Components, strong TypeScript support
- **Backend:** Node.js + Express — minimal, predictable, well-understood; fast to iterate
- **ORM:** Drizzle — type-safe SQL, no runtime magic, migrations via drizzle-kit, very fast
- **Database:** PostgreSQL — challenge's preferred option, relational integrity for follows/likes, ACID transactions

### Trade-offs
- Express is lower-level than Nest.js but faster to scaffold and easier to reason about for a challenge scope
- Drizzle is newer than Prisma but more performant and type-safe; slightly less documentation
- Two separate `package.json` files (not nx/turborepo) — simpler setup, good enough for this scope

---

## ADR-003 — Timeline: Cursor-Based Pagination

**Date:** 2026-06-04
**Status:** Accepted

### Context
The timeline must show tweets from followed users in chronological order. Infinite scroll requires pagination.

### Decision
Use cursor-based pagination where the cursor is the `id` of the last tweet received. The query fetches tweets with `id < cursor` ordered by `created_at DESC`, returning a batch of 20.

```sql
SELECT tweets.*, users.username, users.avatar_url, likes_count
FROM tweets
JOIN follows ON tweets.user_id = follows.following_id
WHERE follows.follower_id = :userId
  AND tweets.deleted_at IS NULL
  AND tweets.id < :cursor   -- cursor pagination
ORDER BY tweets.created_at DESC
LIMIT 20
```

### Why not offset?
Offset pagination breaks when new tweets are inserted while paginating (items shift). Cursor pagination is stable and more performant on large datasets (no full table scan to compute offset).

### Trade-offs
- Cannot jump to arbitrary pages (not needed for a Twitter-like feed)
- Cursor must be passed back to the client as `nextCursor` in the response

---

## ADR-004 — Real-time: Server-Sent Events (SSE) over WebSockets

**Date:** 2026-06-04
**Status:** Accepted

### Context
The bonus feature requires real-time timeline updates when new tweets are posted.

### Decision
Use SSE (`GET /api/timeline/stream`) instead of WebSockets.

### Why SSE over WebSockets
- The use case is **unidirectional** — server pushes new tweets to clients, clients don't need to send data through the same connection
- SSE is simpler: no upgrade handshake, works over standard HTTP/1.1, built-in reconnection
- `EventSource` API is native in all modern browsers, no extra library needed
- WebSockets would be overkill and add setup complexity (socket.io or ws library)

### Implementation
- Backend maintains a `Set<Response>` of active SSE clients per user
- When a tweet is created, the backend pushes the new tweet to all active SSE connections of the author's followers
- Frontend uses `useEffect` + `EventSource` to listen and prepend incoming tweets to the timeline

### Trade-offs
- SSE doesn't survive HTTP/2 multiplexing the same way WebSockets do, but irrelevant at this scale
- Requires keeping long-lived connections open; Express needs `res.flushHeaders()` and `Connection: keep-alive`

---

## ADR-005 — Monorepo: Dual package.json (no turborepo/nx)

**Date:** 2026-06-04
**Status:** Accepted

### Context
The project needs a shared repo with `backend/` and `frontend/` as separate apps.

### Decision
Keep two separate `package.json` files (`backend/package.json` and `frontend/package.json`). No monorepo tooling (turborepo, nx, pnpm workspaces).

### Why
- This is a challenge scope — not a production multi-package monorepo
- Simpler Docker setup (each service has its own `npm install`)
- No shared packages needed between frontend and backend in this app
- Proven pattern from the prior LDP challenge project

### Trade-offs
- No shared TypeScript types between backend and frontend — types are duplicated or inlined
- Running all tests requires `cd backend && npm test && cd ../frontend && npm test`

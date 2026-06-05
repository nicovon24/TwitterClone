# Feature Research

**Domain:** Social microblogging / Twitter clone (certification challenge)
**Researched:** 2026-06-04
**Confidence:** HIGH — spec is fully locked; out-of-scope items are explicitly enumerated in PROJECT.md and ADRs

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Register / Login | No auth = no product | LOW | POST /auth/register + /auth/login; JWT access 15 min + refresh 30 days in localStorage |
| Post a tweet (≤280 chars) | Core action of any Twitter clone | LOW | POST /tweets; 280-char hard limit enforced at API + UI layer |
| Timeline feed | Reason to log in | MEDIUM | GET /timeline with cursor pagination; shows tweets from followed users only |
| Follow / Unfollow user | Social graph without follow is a broadcast tool, not a social network | LOW | POST/DELETE /users/:id/follow; unique constraint + no self-follow |
| Like / Unlike tweet | Expected engagement primitive | LOW | POST/DELETE /tweets/:id/like; unique constraint at DB level |
| Delete own tweet | Users expect content control | LOW | DELETE /tweets/:id; soft delete via `deleted_at`, not hard delete |
| User profile page | Users need to see who they follow/are following | MEDIUM | Shows user's tweets, follower/following count |
| Search users by username | Discovery without search = closed network | LOW | GET /search/users; prefix match on username |
| Logout | Session termination | LOW | POST /auth/logout; invalidates refresh token in DB |

### Differentiators (Competitive Advantage)

For a certification challenge the "differentiator" is evaluator confidence — the features that prove real engineering judgment.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| SSE real-time timeline push | Timeline updates without polling shows real-time architecture competence | MEDIUM | GET /timeline/stream; server pushes new tweets from followed users to connected clients |
| Cursor-based pagination | Proves understanding of concurrent-insert stability vs offset | LOW-MEDIUM | `cursor` param on GET /timeline; stable under inserts, no duplicate/skipped tweets |
| Axios interceptor auto-refresh | Silent token renewal without UX interruption | MEDIUM | Intercepts 401, calls /auth/refresh, retries original request transparently |
| Real PostgreSQL in tests (no mocks) | Evaluator trust: proves schema + queries work end-to-end | HIGH | Vitest + Supertest against a real pg instance; ≥80% line coverage |
| Seed data + `docker compose up` | Evaluator can run the project in one command | LOW | Seed populates sample users/tweets so timeline is non-empty on first load |
| Spanish UI text | Demonstrates locale awareness; matches challenge convention | LOW | All UI-facing strings in Spanish; code/docs remain in English |

### Anti-Features (Explicitly Out of Scope)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| WebSockets | "SSE is just polling with extra steps" misconception | Bidirectional transport is over-engineered for unidirectional timeline push; adds upgrade handshake complexity | SSE via GET /timeline/stream — simpler, HTTP-native |
| Retweets / Quote tweets | Feels like a Twitter clone should have them | Not in the challenge spec; adds fan-out complexity to timeline query | Explicitly deferred; implement in v2 if challenge extends |
| Image / media uploads | Tweets feel richer with images | Adds S3/storage dependency, multipart handling, CDN concerns — out of scope for text-only spec | Text-only tweets as specified |
| DMs / direct messages | Social context implies messaging | Requires separate message store, read receipts, separate real-time channel — significant scope | Not in challenge spec; defer entirely |
| OAuth / social login | Better UX than email+password | Challenge spec mandates JWT with email+password; adding OAuth adds surface area without requirement | Standard email+password flow |
| Offset-based pagination | Simpler to implement | Unstable under concurrent inserts — duplicates/skips tweets at high write rates | Cursor pagination (mandated by ADR-003) |
| In-app notification center | Twitter has it | Not in challenge spec; would require a separate `notifications` table and UI | SSE timeline push is the only real-time mechanism needed |
| Turborepo / pnpm workspaces | Monorepo tooling is "best practice" | Scope doesn't justify overhead; adds tooling complexity for no evaluator benefit | Dual package.json + `npm --prefix` scripts |

---

## Feature Dependencies

```
Auth (register/login/JWT)
    └──required by──> All authenticated endpoints
                          ├── POST /tweets
                          ├── GET /timeline
                          ├── POST/DELETE /users/:id/follow
                          ├── POST/DELETE /tweets/:id/like
                          └── GET /timeline/stream (SSE)

User entity (users table)
    └──required by──> Follow graph (follower_id, following_id)
                           └──required by──> Timeline query (tweets from followed users)
                                                └──required by──> SSE stream (what to push)

Tweet entity (tweets table)
    └──required by──> Likes (user_id, tweet_id)
    └──required by──> Timeline feed
    └──required by──> SSE push

Follow graph
    └──required by──> Timeline (filters by followed users)
    └──required by──> SSE (which connections receive which pushes)

Cursor pagination
    └──enhances──> Timeline (stable result set)
    └──conflicts──> Offset pagination (never use both)

Soft delete (deleted_at)
    └──required by──> Tweet DELETE (preserves referential integrity for likes)
    └──required by──> Timeline query (must filter WHERE deleted_at IS NULL)

SSE stream
    └──enhances──> Timeline (real-time push)
    └──requires──> Follow graph (to scope which clients receive a new tweet)
```

### Dependency Notes

- **All authenticated endpoints require Auth:** JWT middleware must validate access token on every protected route; the Axios interceptor handles silent refresh on the frontend.
- **Timeline requires Follow graph:** `GET /timeline` queries tweets WHERE author_id IN (SELECT following_id FROM follows WHERE follower_id = :me); no follows = empty feed.
- **SSE requires both Follow graph and Tweet:** When a tweet is created, the server pushes it to all SSE clients that follow the author. This means follow data must be queryable at push time.
- **Soft delete required before Likes:** Hard-deleting a tweet with existing like rows would violate the foreign key on `likes.tweet_id`. Soft delete avoids this without cascading deletes.
- **Cursor pagination conflicts with offset:** Using both simultaneously would produce inconsistent result sets. The codebase must commit to cursor-only (enforced by ADR-003).

---

## MVP Definition

### Launch With (v1) — what the evaluator exercises

- [x] Email/password registration and login with JWT — gates everything else
- [x] Post tweet (≤280 chars) — core creation action
- [x] Delete own tweet (soft delete) — content control
- [x] Follow / Unfollow user — builds the social graph
- [x] Like / Unlike tweet — basic engagement
- [x] Timeline feed (cursor-paginated, followed users only) — proves social graph works
- [x] SSE real-time timeline push — proves real-time architecture
- [x] Search users by username prefix — discovery
- [x] User profile page (tweets + counts) — identity
- [x] Seed data so timeline is non-empty on first load — evaluator UX
- [x] `docker compose up` one-command startup — evaluator requirement

### Add After Validation (v1.x) — not for this challenge

- [ ] Retweets / Quote tweets — when extending beyond challenge spec
- [ ] Media uploads — when storage infrastructure is justified

### Future Consideration (v2+) — explicitly out of scope

- [ ] DMs — requires separate architecture
- [ ] In-app notifications — separate table + UI
- [ ] OAuth login — adds surface area beyond spec
- [ ] Algorithmic feed — replace chronological timeline

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth (register/login/logout) | HIGH | LOW | P1 |
| Post tweet | HIGH | LOW | P1 |
| Timeline feed (cursor-paginated) | HIGH | MEDIUM | P1 |
| Follow / Unfollow | HIGH | LOW | P1 |
| SSE real-time push | HIGH | MEDIUM | P1 |
| Like / Unlike | MEDIUM | LOW | P1 |
| Delete tweet (soft) | MEDIUM | LOW | P1 |
| Search users | MEDIUM | LOW | P1 |
| User profile page | MEDIUM | MEDIUM | P1 |
| Seed data + README runbook | HIGH (evaluator) | LOW | P1 |
| Axios interceptor auto-refresh | HIGH (UX) | MEDIUM | P1 |
| Integration tests ≥80% coverage | HIGH (evaluator) | HIGH | P1 |
| Playwright E2E happy path | HIGH (evaluator) | MEDIUM | P1 |
| Retweets | LOW (out of scope) | HIGH | P3 |
| Media uploads | LOW (out of scope) | HIGH | P3 |
| DMs | LOW (out of scope) | HIGH | P3 |

**Priority key:**
- P1: Must have for challenge pass
- P2: Should have, add when possible
- P3: Nice to have / explicitly out of scope for this challenge

---

## Competitor Feature Analysis

This is a certification challenge clone, so "competitors" are reference implementations and the original Twitter/X product.

| Feature | Twitter/X | Reference Clone Implementations | Our Approach |
|---------|-----------|----------------------------------|--------------|
| Auth | OAuth + email | Usually JWT or session-cookie | JWT in localStorage — mandated by challenge spec |
| Timeline | Algorithmic + chronological | Usually chronological | Chronological, cursor-paginated; no algorithm |
| Real-time | WebSocket + polling | Usually polling or WebSockets | SSE — simpler, HTTP-native, sufficient for push-only |
| Pagination | Cursor-based | Mix of offset and cursor | Cursor-only — ADR-003 mandates; offset forbidden |
| Media | Images, video, GIFs | Often included | Text-only — challenge spec |
| Retweets | Yes | Often included | Explicitly deferred — out of scope |
| Search | Full-text, hashtags | Varies | Username prefix match only — minimal viable discovery |
| Delete | Soft (archive) | Varies | Soft delete via `deleted_at` — preserves referential integrity |

---

## Sources

- ClonTwitter PROJECT.md (2026-06-04) — spec and constraints
- ClonTwitter ADRs 001–007 — architectural decisions constraining feature set
- ClonTwitter docs/api.md — 19 endpoint spec defining exact feature boundaries
- Twitter/X product (reference) — table stakes expectations
- Challenge spec (TheFlock AI Verified) — evaluator requirements shape all priority decisions

---
*Feature research for: Twitter/X clone (TheFlock AI Verified certification)*
*Researched: 2026-06-04*

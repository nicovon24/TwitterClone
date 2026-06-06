# Requirements: ClonTwitter

**Defined:** 2026-06-04
**Core Value:** A logged-in user can post, follow others, and see those tweets in their feed in real time.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can register with email and password; duplicate email returns 409
- [ ] **AUTH-02**: User can log in with email and password; receives JWT access token (15 min) and refresh token (30 days) stored in localStorage
- [ ] **AUTH-03**: User can log out; refresh token is invalidated in the database (single active session per user)
- [ ] **AUTH-04**: Authenticated user can retrieve their own profile via GET /auth/me
- [ ] **AUTH-05**: Expired access token is silently refreshed via Axios interceptor — original request is retried transparently without UX interruption
- [ ] **AUTH-06**: All protected endpoints reject requests with missing or invalid JWT with 401
- [ ] **AUTH-07**: Passwords are hashed (bcrypt) before storage; plaintext passwords never persisted

### Content (Tweets)

- [ ] **CONT-01**: Authenticated user can post a tweet with 1–280 characters; server enforces the 280-char limit with 400 on violation
- [ ] **CONT-02**: Authenticated user can soft-delete their own tweet (sets `deleted_at`); hard delete is never performed
- [ ] **CONT-03**: Deleted tweets (`deleted_at IS NOT NULL`) are excluded from all timeline, profile, and search responses
- [ ] **CONT-04**: User cannot delete another user's tweet; attempt returns 403
- [ ] **CONT-05**: Timeline and profile endpoints use cursor-based pagination (`cursor` query param); offset pagination is never used

### Social (Follows)

- [ ] **SOCL-01**: Authenticated user can follow another user; duplicate follow attempt returns 409
- [ ] **SOCL-02**: Authenticated user can unfollow a user they follow; unfollowing a non-followed user returns 404
- [ ] **SOCL-03**: User cannot follow themselves; attempt returns 400
- [ ] **SOCL-04**: Follow relationship is enforced by a unique composite constraint (`follower_id`, `following_id`) at the database level
- [ ] **SOCL-05**: User profile page displays follower count and following count

### Likes

- [ ] **LIKE-01**: Authenticated user can like a tweet; duplicate like attempt returns 409
- [ ] **LIKE-02**: Authenticated user can unlike a tweet they have liked; unliking a non-liked tweet returns 404
- [ ] **LIKE-03**: Like uniqueness is enforced by a composite constraint (`user_id`, `tweet_id`) at the database level
- [ ] **LIKE-04**: Like count is visible on tweet display

### Timeline

- [ ] **TMEL-01**: Authenticated user's timeline returns only tweets from users they follow, ordered by `created_at` descending
- [ ] **TMEL-02**: Timeline supports cursor-based pagination; passing a `cursor` returns the next page without duplicates or skips under concurrent inserts
- [ ] **TMEL-03**: Timeline excludes soft-deleted tweets
- [ ] **TMEL-04**: A user with no follows sees an empty timeline (not an error)

### Real-Time (SSE)

- [ ] **REAL-01**: Authenticated client can open a persistent SSE connection to GET /timeline/stream
- [ ] **REAL-02**: When any followed user posts a tweet, the server pushes that tweet to all active SSE connections belonging to their followers
- [ ] **REAL-03**: SSE connection is scoped to the authenticated user's follow graph; a user does not receive tweets from users they do not follow
- [ ] **REAL-04**: Client handles SSE reconnection gracefully (browser EventSource default retry behavior is acceptable)

### Search

- [ ] **SRCH-01**: Any authenticated user can search for users by username prefix via GET /search/users
- [ ] **SRCH-02**: Search returns matching users with at least `id`, `username`, and `display_name`; empty results return an empty array (not 404)

### User Profile

- [ ] **PROF-01**: Any authenticated user can view another user's public profile (tweets, follower count, following count)
- [ ] **PROF-02**: Profile page shows only the user's own non-deleted tweets, cursor-paginated
- [ ] **PROF-03**: UUIDs are used as primary keys for all entities, preventing sequential ID enumeration on public endpoints

### Infrastructure & Operations

- [ ] **INFR-01**: `docker compose up` starts PostgreSQL (:5432), Express (:4000), and Next.js (:3000) with no manual steps
- [ ] **INFR-02**: Database migrations run automatically on backend startup
- [ ] **INFR-03**: Seed data is applied on first run, populating sample users and tweets so the timeline is non-empty
- [ ] **INFR-04**: `.env.example` documents every required environment variable; app fails fast with a clear error if required vars are missing
- [ ] **INFR-05**: README contains a complete runbook: prerequisites, `docker compose up`, how to access the app, how to run tests

### Testing

- [ ] **TEST-01**: 6 backend integration test suites (auth, tweets, follows, likes, timeline, search) run against a real PostgreSQL instance (no mocks)
- [ ] **TEST-02**: Backend integration tests achieve ≥80% line coverage measured by Vitest
- [ ] **TEST-03**: 3 frontend unit test suites (login flow, tweet compose/delete, follow/unfollow) using Vitest + Testing Library
- [ ] **TEST-04**: Playwright E2E `happy-path.spec.ts` tagged `@smoke` covers: register → login → post tweet → follow user → logout
- [ ] **TEST-05**: All test suites pass in CI (or locally via `npm test`) before any feature is marked complete

### Error Handling & Observability

- [ ] **ERRH-01**: All API errors return JSON with a consistent shape (`{ error: string }`) and an appropriate HTTP status code
- [ ] **ERRH-02**: Unhandled errors are caught by Express error middleware; 500 responses never leak stack traces in production
- [ ] **ERRH-03**: Input validation errors (missing fields, wrong types, constraint violations) return 400 with a descriptive message
- [ ] **ERRH-04**: Server logs each request with method, path, status, and duration (structured logging or morgan acceptable)

### Localisation

- [ ] **L10N-01**: All UI-facing text (labels, buttons, placeholders, error messages shown to the user) is in Spanish
- [ ] **L10N-02**: All code, API responses, documentation, and log output remain in English

## v2 Requirements

### Retweets

- **RT-01**: User can retweet a tweet (adds to their followers' timelines)
- **RT-02**: User can quote-tweet with added comment

### Media

- **MDIA-01**: User can attach an image to a tweet (S3 or equivalent object storage)
- **MDIA-02**: Images are served via CDN URL embedded in the tweet payload

### Notifications

- **NOTF-01**: User receives in-app notification when someone follows them
- **NOTF-02**: User receives in-app notification when their tweet is liked
- **NOTF-03**: User can configure which notification types they receive

### Moderation

- **MODR-01**: User can block another user (blocked user's tweets do not appear in timeline)
- **MODR-02**: User can report a tweet

## Out of Scope

| Feature | Reason |
|---------|--------|
| WebSockets | SSE provides unidirectional push sufficient for timeline; WebSockets add bidirectional overhead not needed here |
| OAuth / social login | Challenge spec mandates JWT with email+password; OAuth adds surface area without requirement |
| Offset-based pagination | Unstable under concurrent inserts — duplicates/skips tweets; cursor pagination mandated by ADR-003 |
| Direct messages | Requires separate message store, read receipts, and real-time channel — significant scope beyond challenge spec |
| In-app notification center | Not in challenge spec; SSE timeline push is the only required real-time mechanism |
| Turborepo / pnpm workspaces | Scope doesn't justify tooling overhead; dual package.json + `npm --prefix` scripts are sufficient |
| Image / media uploads | Adds S3/storage dependency; challenge spec covers text tweets only |
| Algorithmic feed | Chronological cursor-paginated timeline is what the spec calls for |
| httpOnly cookie auth | Challenge explicitly specifies JWT in localStorage |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| AUTH-07 | Phase 1 | Pending |
| INFR-01 | Phase 1 | Pending |
| INFR-02 | Phase 1 | Pending |
| INFR-03 | Phase 1 | Pending |
| INFR-04 | Phase 1 | Pending |
| INFR-05 | Phase 1 | Pending |
| CONT-01 | Phase 2 | Pending |
| CONT-02 | Phase 2 | Pending |
| CONT-03 | Phase 2 | Pending |
| CONT-04 | Phase 2 | Pending |
| CONT-05 | Phase 2 | Pending |
| SOCL-01 | Phase 2 | Pending |
| SOCL-02 | Phase 2 | Pending |
| SOCL-03 | Phase 2 | Pending |
| SOCL-04 | Phase 2 | Pending |
| SOCL-05 | Phase 2 | Pending |
| LIKE-01 | Phase 2 | Pending |
| LIKE-02 | Phase 2 | Pending |
| LIKE-03 | Phase 2 | Pending |
| LIKE-04 | Phase 2 | Pending |
| TMEL-01 | Phase 2 | Pending |
| TMEL-02 | Phase 2 | Pending |
| TMEL-03 | Phase 2 | Pending |
| TMEL-04 | Phase 2 | Pending |
| REAL-01 | Phase 3 | Pending |
| REAL-02 | Phase 3 | Pending |
| REAL-03 | Phase 3 | Pending |
| REAL-04 | Phase 3 | Pending |
| SRCH-01 | Phase 2 | Pending |
| SRCH-02 | Phase 2 | Pending |
| PROF-01 | Phase 2 | Pending |
| PROF-02 | Phase 2 | Pending |
| PROF-03 | Phase 1 | Pending |
| ERRH-01 | Phase 1 | Pending |
| ERRH-02 | Phase 1 | Pending |
| ERRH-03 | Phase 1 | Pending |
| ERRH-04 | Phase 1 | Pending |
| L10N-01 | Phase 3 | Pending |
| L10N-02 | Phase 1 | Pending |
| TEST-01 | Phase 4 | Pending |
| TEST-02 | Phase 4 | Pending |
| TEST-03 | Phase 4 | Pending |
| TEST-04 | Phase 4 | Pending |
| TEST-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 48 total
- Mapped to phases: 48
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-04*
*Last updated: 2026-06-04 after Phase 0 completion and feature research*

---
phase: 02-backend-auth-core-api
plan: 02
type: execute
wave: 1
depends_on: [02-PLAN-auth]
files_modified:
  - backend/src/services/tweetService.ts
  - backend/src/routes/tweet.routes.ts
  - backend/src/sse/sseManager.ts
  - backend/src/app.ts
autonomous: true
requirements: [CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, TMEL-01, TMEL-02, TMEL-03, TMEL-04]
user_setup: []

must_haves:
  truths:
    - "POST /tweets returns 201 with the created tweet object (including likes_count and liked_by_me)"
    - "POST /tweets with content > 280 chars returns 400"
    - "DELETE /tweets/:id by a non-owner returns 403"
    - "DELETE /tweets/:id soft-deletes by setting deleted_at; row is not removed from DB"
    - "GET /timeline returns up to 20 tweets from followed users ordered by created_at DESC, id DESC"
    - "GET /timeline with a cursor returns the next page without duplicates"
    - "Soft-deleted tweets (deleted_at IS NOT NULL) are excluded from timeline results"
    - "GET /timeline/stream opens an SSE connection and pushes new_tweet events to followers of the author"
    - "SSE connections are cleaned up when the client disconnects (no memory leak)"
  artifacts:
    - path: "backend/src/services/tweetService.ts"
      provides: "createTweet, softDeleteTweet, getTimeline business logic"
      contains: "deleted_at"
    - path: "backend/src/sse/sseManager.ts"
      provides: "In-memory SSE connection registry and broadcast helpers"
      contains: "req.on('close'"
    - path: "backend/src/routes/tweet.routes.ts"
      provides: "Tweet + timeline router including SSE stream endpoint"
      contains: "text/event-stream"
  key_links:
    - from: "backend/src/routes/tweet.routes.ts"
      to: "backend/src/sse/sseManager.ts"
      via: "sseManager.addConnection / broadcast on POST /tweets"
      pattern: "sseManager"
    - from: "backend/src/app.ts"
      to: "backend/src/routes/tweet.routes.ts"
      via: "app.use('/tweets', ...) and app.use('/timeline', ...)"
      pattern: "tweetRouter"
---

<objective>
Implement tweet CRUD, cursor-paginated timeline, and the SSE real-time stream endpoint.

Purpose: Tweets and the timeline are the core data flow of the app. The SSE endpoint is also a backend concern (connection registry, broadcast logic) even though the frontend hook is Phase 3; implementing it here keeps all backend routes in one phase.
Output: POST/DELETE tweet endpoints, GET /timeline with cursor pagination, and GET /timeline/stream SSE endpoint. All three share the tweetService and the sseManager registry.
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
@docs/api.md
@docs/decisions/003-cursor-pagination.md
@docs/decisions/004-sse-realtime.md
@docs/decisions/006-database-design.md
@AGENTS.md

<interfaces>
<!-- Tweet + timeline contract from docs/api.md -->

POST /tweets  (requireAuth)
  Body: { content: string (1–280 chars) }
  201: { id, content, created_at, user: { id, username, avatar_url }, likes_count: 0, liked_by_me: false }
  400: empty or over 280 chars | 401

DELETE /tweets/:id  (requireAuth)
  200: { message: "Tweet deleted" }
  401 | 403: not the author | 404: not found

GET /timeline  (requireAuth)
  Query: cursor (optional, opaque base64 string), limit (default 20, max 50)
  200: { tweets: [...], next_cursor: string | null }
  tweet shape: { id, content, created_at, user: { id, username, avatar_url }, likes_count, liked_by_me }

GET /timeline/stream  (requireAuth via ?token= query param — EventSource cannot set headers)
  Upgrade to SSE: Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive
  Event: "event: new_tweet\ndata: <JSON>\n\n"
  Heartbeat: ": heartbeat\n\n" every 30s
  Cleanup on req close

Cursor encoding:
  cursor = base64(JSON.stringify({ created_at: ISO string, id: UUID }))
  Query: WHERE (created_at, id) < (cursor.created_at, cursor.id) AND deleted_at IS NULL
         AND user_id IN (followed users) ORDER BY created_at DESC, id DESC LIMIT N+1
  If result.length > N: nextCursor = encode last item in result slice [0..N-1]; return slice [0..N-1]
  If result.length <= N: nextCursor = null
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: sseManager — in-memory SSE connection registry</name>
  <files>backend/src/sse/sseManager.ts</files>
  <read_first>
    - .planning/research/STACK.md ("For SSE timeline streaming") — Map<userId, Set<Response>> pattern, heartbeat, close cleanup
    - docs/decisions/004-sse-realtime.md — design rationale
    - docs/api.md (Real-time section) — event format: "event: new_tweet\ndata: <JSON>"
  </read_first>
  <action>
    Create backend/src/sse/sseManager.ts. Maintain a module-level Map<string, Set<Response>> keyed by userId.

    Export:
    - addConnection(userId: string, res: Response): void — adds res to the user's set; sets up res.on('close', () => removeConnection(userId, res)) to clean up on disconnect.
    - removeConnection(userId: string, res: Response): void — removes res from the set; deletes the key if the set is empty.
    - broadcastToFollowers(followerIds: string[], payload: object): void — for each followerId that has active connections, serialize payload as JSON and write "event: new_tweet\ndata: <JSON>\n\n" to each active Response.
    - startHeartbeat(res: Response): NodeJS.Timeout — sends ": heartbeat\n\n" every 30 000ms; caller is responsible for clearInterval on close.

    Never import from routes (no circular deps). This module has no side effects on import.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit && grep -q "req.on\|res.on" src/sse/sseManager.ts</automated>
  </verify>
  <acceptance_criteria>
    - sseManager exports addConnection, removeConnection, broadcastToFollowers, startHeartbeat
    - removeConnection deletes the Map entry when the Set becomes empty (no memory leak)
    - broadcastToFollowers only writes to active connections (gracefully skips users with no open connections)
    - tsc compiles with no errors
  </acceptance_criteria>
  <done>sseManager provides the connection registry; connections self-clean on close; heartbeat helper exported.</done>
</task>

<task type="auto">
  <name>Task 2: tweetService — createTweet, softDeleteTweet, getTimeline</name>
  <files>backend/src/services/tweetService.ts</files>
  <read_first>
    - backend/src/db/schema.ts — tweets, follows, likes tables and their columns
    - docs/decisions/003-cursor-pagination.md — cursor encoding, composite index usage
    - docs/decisions/006-database-design.md — soft-delete pattern (deleted_at)
    - docs/api.md (Tweets + timeline sections) — response shapes
  </read_first>
  <action>
    Create backend/src/services/tweetService.ts with three exported async functions:

    createTweet(userId: string, content: string): TweetWithUser
      - content is already validated by Zod in the route (1–280 chars); insert directly.
      - Insert tweet with user_id = userId. Return the inserted tweet joined with user data (id, username, avatar_url), likes_count: 0, liked_by_me: false.
      - After insert, call followService.getFollowerIds(userId) and sseManager.broadcastToFollowers(followerIds, tweetPayload). Import followService lazily or via a passed-in helper to avoid circular deps if needed.

    softDeleteTweet(tweetId: string, requesterId: string): void
      - Fetch tweet by id; if not found throw { status: 404 }.
      - If tweet.user_id !== requesterId throw { status: 403 }.
      - SET deleted_at = now() WHERE id = tweetId.

    getTimeline(userId: string, cursor?: string, limit = 20): { tweets: TweetWithUser[], nextCursor: string | null }
      - Get the list of user IDs that userId follows (from follows table WHERE follower_id = userId).
      - If no followings, return { tweets: [], nextCursor: null }.
      - Base query: SELECT tweets.*, users.username, users.avatar_url, COUNT(likes.tweet_id) as likes_count, MAX(CASE WHEN likes.user_id = userId THEN 1 ELSE 0 END) as liked_by_me FROM tweets LEFT JOIN users ON tweets.user_id = users.id LEFT JOIN likes ON likes.tweet_id = tweets.id WHERE tweets.user_id IN (followingIds) AND tweets.deleted_at IS NULL GROUP BY tweets.id, users.username, users.avatar_url ORDER BY tweets.created_at DESC, tweets.id DESC LIMIT (limit + 1).
      - If cursor provided: decode base64 JSON → { created_at, id }; add WHERE clause (tweets.created_at, tweets.id) < (cursorDate, cursorId) using Drizzle's sql template literal for the composite comparison.
      - Slice: if results.length > limit, set nextCursor = encodeURIComponent(Buffer.from(JSON.stringify({ created_at: results[limit-1].created_at, id: results[limit-1].id })).toString('base64')); return results.slice(0, limit). Else nextCursor = null.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit && grep -q "deleted_at" src/services/tweetService.ts && grep -q "cursor" src/services/tweetService.ts</automated>
  </verify>
  <acceptance_criteria>
    - softDeleteTweet sets deleted_at; does not DELETE the row (ADR-006)
    - softDeleteTweet throws 403 when requesterId !== tweet.user_id
    - getTimeline excludes deleted_at IS NOT NULL tweets
    - Cursor is base64-encoded { created_at, id }; decode/encode is consistent
    - getTimeline returns at most `limit` tweets; nextCursor is null when no more pages
    - tsc passes with no type errors
  </acceptance_criteria>
  <done>tweetService implements create, soft-delete, and cursor-paginated timeline; SSE broadcast called after create.</done>
</task>

<task type="auto">
  <name>Task 3: tweet router (POST, DELETE, GET /timeline, GET /timeline/stream) + wire into app.ts</name>
  <files>backend/src/routes/tweet.routes.ts, backend/src/app.ts</files>
  <read_first>
    - docs/api.md (Tweets + Real-time sections) — all route paths and response shapes
    - backend/src/middleware/requireAuth.ts — import for standard auth
    - backend/src/sse/sseManager.ts (Task 1) — addConnection, startHeartbeat
    - backend/src/services/tweetService.ts (Task 2) — function signatures
  </read_first>
  <action>
    Create backend/src/routes/tweet.routes.ts with two routers: tweetRouter and timelineRouter.

    tweetRouter:
    POST / (requireAuth) — Zod validate body { content: z.string().min(1).max(280) }; call tweetService.createTweet; respond 201.
    DELETE /:id (requireAuth) — call tweetService.softDeleteTweet(req.params.id, req.user.id); respond 200 { message: "Tweet deleted" }.

    timelineRouter:
    GET / (requireAuth) — parse cursor query param (optional string), limit (default 20, max 50); call tweetService.getTimeline; respond 200.
    GET /stream — Auth via ?token= query param (EventSource cannot send headers): call jwt.verify(req.query.token, env.JWT_SECRET); on failure respond 401 and return. On success: set SSE headers (Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive); call sseManager.addConnection(userId, res); const interval = sseManager.startHeartbeat(res); res.on('close', () => { clearInterval(interval); sseManager.removeConnection(userId, res); }).

    Update backend/src/app.ts: add app.use('/tweets', tweetRouter) and app.use('/timeline', timelineRouter) before the errorHandler line.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit && grep -q "text/event-stream" src/routes/tweet.routes.ts && grep -q "tweetRouter" src/app.ts</automated>
  </verify>
  <acceptance_criteria>
    - POST /tweets validates content 1–280 chars; responds 201 with tweet object
    - DELETE /tweets/:id calls softDeleteTweet; responds 200 or propagates 403/404
    - GET /timeline parses cursor and limit; responds 200 with { tweets, next_cursor }
    - GET /timeline/stream sets SSE headers; cleans up on close; authenticates via ?token=
    - app.ts mounts both routers before errorHandler
    - tsc passes
  </acceptance_criteria>
  <done>All tweet and timeline routes wired; SSE stream endpoint authenticates, registers connection, and cleans up on disconnect.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → POST /tweets | Untrusted content (XSS risk if frontend renders unescaped) |
| client → DELETE /tweets/:id | Must verify ownership; cannot trust client-supplied id alone |
| client → GET /timeline/stream | Token supplied in query param (less secure than header); JWT still verified |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-06 | Spoofing | /timeline/stream ?token= | mitigate | jwt.verify with JWT_SECRET; 401 if missing, invalid, or expired |
| T-02-07 | Tampering | softDeleteTweet | mitigate | ownership check before update; 403 if requester is not the author |
| T-02-08 | DoS (resource) | SSE connections | mitigate | heartbeat + req.on('close') cleanup; Map/Set registry prevents accumulation of stale connections |
| T-02-09 | Information Disclosure | getTimeline | mitigate | Only returns tweets from followed users; deleted_at filter applied |
| T-02-10 | Injection | cursor decoding | mitigate | base64 decode wrapped in try/catch; JSON.parse result validated before use in query |
</threat_model>

<verification>
- POST /tweets with content > 280 chars → 400
- POST /tweets valid → 201 + tweet object with likes_count: 0
- DELETE /tweets/:id by a different user → 403
- DELETE /tweets/:id by owner → 200 { message: "Tweet deleted" }; row still in DB with deleted_at set
- GET /timeline → 200 { tweets: [...], next_cursor }; deleted tweets absent
- GET /timeline with cursor → next page, no duplicates
- GET /timeline/stream without ?token → 401; with valid token → SSE headers sent
- `cd backend && npx tsc --noEmit` passes
</verification>

<success_criteria>
1. Tweet CRUD endpoints respond correctly per docs/api.md
2. Soft delete sets deleted_at; deleted tweets never appear in timeline (ADR-006)
3. Cursor pagination returns pages of ≤20 tweets with consistent next_cursor (ADR-003)
4. SSE endpoint registers connections, sends heartbeats, and cleans up on disconnect (ADR-004)
5. tsc compiles with no errors
</success_criteria>

<output>
Create `.planning/phases/02-backend-auth-core-api/02-02-SUMMARY.md` when done
</output>

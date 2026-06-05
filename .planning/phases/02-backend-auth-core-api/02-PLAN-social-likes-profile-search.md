---
phase: 02-backend-auth-core-api
plan: 03
type: execute
wave: 1
depends_on: [02-PLAN-auth]
files_modified:
  - backend/src/services/followService.ts
  - backend/src/services/likeService.ts
  - backend/src/services/userService.ts
  - backend/src/routes/follow.routes.ts
  - backend/src/routes/like.routes.ts
  - backend/src/routes/user.routes.ts
  - backend/src/app.ts
autonomous: true
requirements: [SOCL-01, SOCL-02, SOCL-03, SOCL-04, SOCL-05, LIKE-01, LIKE-02, LIKE-03, LIKE-04, PROF-01, PROF-02, SRCH-01, SRCH-02]
user_setup: []

must_haves:
  truths:
    - "POST /follows/:username returns 201 on success; 409 if already following; 400 if self-follow; 404 if user not found"
    - "DELETE /follows/:username returns 200 on success; 400 if not currently following; 404 if user not found"
    - "POST /likes/:tweetId returns 201 with likes_count; 409 if already liked; 404 if tweet not found"
    - "DELETE /likes/:tweetId returns 200 with likes_count; 400 if not liked; 404 if tweet not found"
    - "GET /users/:username returns profile with followers_count, following_count, tweets_count, and is_following"
    - "GET /search/users?q= returns matching users by username prefix (ILIKE)"
    - "getFollowerIds is exported from followService so tweetService can broadcast SSE to correct users"
  artifacts:
    - path: "backend/src/services/followService.ts"
      provides: "follow, unfollow, getFollowers, getFollowing, getFollowerIds"
      contains: "follower_id"
    - path: "backend/src/services/likeService.ts"
      provides: "likeTweet, unlikeTweet"
      contains: "tweet_id"
    - path: "backend/src/services/userService.ts"
      provides: "getProfile (with counts), searchUsers"
      contains: "ILIKE"
  key_links:
    - from: "backend/src/services/tweetService.ts"
      to: "backend/src/services/followService.ts"
      via: "getFollowerIds used in createTweet SSE broadcast"
      pattern: "getFollowerIds"
    - from: "backend/src/app.ts"
      to: "backend/src/routes/follow.routes.ts"
      via: "app.use('/follows', followRouter)"
      pattern: "followRouter"
---

<objective>
Implement the social graph (follows), likes, user profile, and search endpoints.

Purpose: These endpoints complete the backend API surface. followService.getFollowerIds is also required by tweetService (Plan 2.2) to broadcast SSE events to the right connections. All three services (followService, likeService, userService) can be built in parallel since they are independent.
Output: Six routes (/follows/:username POST+DELETE, /likes/:tweetId POST+DELETE, /users/:username GET, /search/users GET) plus the underlying services, all wired into app.ts.
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
@docs/database.md
@AGENTS.md

<interfaces>
<!-- Social + likes + profile + search contract from docs/api.md -->

POST /follows/:username  (requireAuth)
  201: { message: "Now following <username>" }
  400: self-follow | 404: user not found | 409: already following

DELETE /follows/:username  (requireAuth)
  200: { message: "Unfollowed <username>" }
  400: not currently following | 404: user not found

POST /likes/:tweetId  (requireAuth)
  201: { message: "Tweet liked", likes_count: number }
  404: tweet not found (or deleted) | 409: already liked

DELETE /likes/:tweetId  (requireAuth)
  200: { message: "Tweet unliked", likes_count: number }
  400: not liked | 404: tweet not found

GET /users/:username  (no auth required; is_following = false without auth)
  200: { id, username, display_name, bio, avatar_url, followers_count, following_count, tweets_count, is_following }
  404: user not found

GET /users/:username/followers  (no auth required)
  200: { users: [...], next_cursor: string | null }

GET /users/:username/following  (no auth required)
  200: { users: [...], next_cursor: string | null }

GET /search/users?q=  (requireAuth)
  Query: q (min 1 char), cursor, limit (default 20)
  200: { users: [{ id, username, bio, avatar_url, is_following }], next_cursor: string | null }
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: followService — follow, unfollow, getFollowers, getFollowing, getFollowerIds</name>
  <files>backend/src/services/followService.ts</files>
  <read_first>
    - backend/src/db/schema.ts — follows table (follower_id, following_id composite PK; CHECK follower_id <> following_id)
    - docs/database.md — follows indexes
    - docs/api.md (Follows section)
  </read_first>
  <action>
    Create backend/src/services/followService.ts with these exported async functions:

    follow(followerId: string, targetUsername: string): void
      - Resolve targetUsername → targetId; if not found throw { status: 404 }.
      - If followerId === targetId throw { status: 400, message: "Cannot follow yourself" }.
      - INSERT INTO follows (follower_id, following_id); if unique constraint violation (already following) throw { status: 409 }.

    unfollow(followerId: string, targetUsername: string): void
      - Resolve targetUsername → targetId; if not found throw { status: 404 }.
      - DELETE FROM follows WHERE follower_id = followerId AND following_id = targetId.
      - If 0 rows affected throw { status: 400, message: "Not following this user" }.

    getFollowers(username: string, requesterId?: string, cursor?: string, limit = 20): { users: UserSummary[], nextCursor: string | null }
      - Resolve username → userId; if not found throw { status: 404 }.
      - JOIN follows WHERE following_id = userId; paginate with cursor on follower user id.
      - Include is_following: whether requesterId follows each result user.

    getFollowing(username: string, requesterId?: string, cursor?: string, limit = 20): same shape
      - JOIN follows WHERE follower_id = userId.

    getFollowerIds(userId: string): Promise<string[]>
      - SELECT follower_id FROM follows WHERE following_id = userId.
      - Used by tweetService.createTweet for SSE broadcast targeting.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit && grep -q "getFollowerIds" src/services/followService.ts</automated>
  </verify>
  <acceptance_criteria>
    - follow() throws 400 on self-follow, 404 if target not found, 409 on duplicate
    - unfollow() throws 400 if not currently following, 404 if target not found
    - getFollowerIds() returns array of user id strings
    - tsc passes
  </acceptance_criteria>
  <done>followService exports all five functions; self-follow and duplicate constraints enforced; getFollowerIds available for SSE broadcast.</done>
</task>

<task type="auto">
  <name>Task 2: likeService — likeTweet, unlikeTweet</name>
  <files>backend/src/services/likeService.ts</files>
  <read_first>
    - backend/src/db/schema.ts — likes table (user_id, tweet_id composite PK; CASCADE deletes)
    - docs/api.md (Likes section) — response includes likes_count
  </read_first>
  <action>
    Create backend/src/services/likeService.ts:

    likeTweet(userId: string, tweetId: string): { likes_count: number }
      - Verify tweet exists and deleted_at IS NULL; if not found throw { status: 404 }.
      - INSERT INTO likes (user_id, tweet_id); if unique violation throw { status: 409 }.
      - Return current likes_count: SELECT COUNT(*) FROM likes WHERE tweet_id = tweetId.

    unlikeTweet(userId: string, tweetId: string): { likes_count: number }
      - Verify tweet exists; if not found throw { status: 404 }.
      - DELETE FROM likes WHERE user_id = userId AND tweet_id = tweetId.
      - If 0 rows affected throw { status: 400, message: "Not liked" }.
      - Return current likes_count.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit && grep -q "likes_count" src/services/likeService.ts</automated>
  </verify>
  <acceptance_criteria>
    - likeTweet returns likes_count after insert; throws 409 on duplicate; throws 404 for deleted/nonexistent tweets
    - unlikeTweet returns likes_count after delete; throws 400 if not liked; throws 404 for nonexistent tweet
    - tsc passes
  </acceptance_criteria>
  <done>likeService implements like/unlike with correct duplicate and not-found handling; returns live likes_count.</done>
</task>

<task type="auto">
  <name>Task 3: userService — getProfile, searchUsers</name>
  <files>backend/src/services/userService.ts</files>
  <read_first>
    - backend/src/db/schema.ts — users, tweets, follows tables
    - docs/api.md (Users + Search sections) — response shapes
    - .planning/research/STACK.md ("Validation") — ILIKE pattern for search
  </read_first>
  <action>
    Create backend/src/services/userService.ts:

    getProfile(username: string, requesterId?: string): UserProfile
      - SELECT user WHERE username = username; if not found throw { status: 404 }.
      - Count followers: SELECT COUNT(*) FROM follows WHERE following_id = userId.
      - Count following: SELECT COUNT(*) FROM follows WHERE follower_id = userId.
      - Count tweets: SELECT COUNT(*) FROM tweets WHERE user_id = userId AND deleted_at IS NULL.
      - is_following: if requesterId provided, check follows row exists; else false.
      - Return { id, username, display_name, bio, avatar_url, followers_count, following_count, tweets_count, is_following }.

    searchUsers(query: string, requesterId: string, cursor?: string, limit = 20): { users: UserSummary[], nextCursor: string | null }
      - SELECT users WHERE username ILIKE query% OR display_name ILIKE query% ORDER BY username ASC.
      - Cursor-paginate on username (alphabetic cursor is simpler than UUID for search).
      - Include is_following for each result relative to requesterId.
      - Return { users, nextCursor }.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit && grep -q "ILIKE\|ilike" src/services/userService.ts</automated>
  </verify>
  <acceptance_criteria>
    - getProfile returns correct counts (followers, following, tweets); is_following false without requesterId
    - searchUsers uses ILIKE for case-insensitive prefix match on username or display_name
    - tsc passes
  </acceptance_criteria>
  <done>userService provides profile with counts and prefix search; is_following resolved per requester.</done>
</task>

<task type="auto">
  <name>Task 4: follow, like, user routes + wire into app.ts</name>
  <files>backend/src/routes/follow.routes.ts, backend/src/routes/like.routes.ts, backend/src/routes/user.routes.ts, backend/src/app.ts</files>
  <read_first>
    - docs/api.md (Follows, Likes, Users, Search sections) — all route paths
    - backend/src/middleware/requireAuth.ts — for protected routes
    - backend/src/services/followService.ts, likeService.ts, userService.ts (Tasks 1–3)
    - backend/src/app.ts — existing router mount points
  </read_first>
  <action>
    Create backend/src/routes/follow.routes.ts:
    POST /:username (requireAuth) — call followService.follow(req.user.id, req.params.username); 201.
    DELETE /:username (requireAuth) — call followService.unfollow(req.user.id, req.params.username); 200.

    Create backend/src/routes/like.routes.ts:
    POST /:tweetId (requireAuth) — call likeService.likeTweet(req.user.id, req.params.tweetId); 201.
    DELETE /:tweetId (requireAuth) — call likeService.unlikeTweet(req.user.id, req.params.tweetId); 200.

    Create backend/src/routes/user.routes.ts:
    GET /:username — optional auth (read req.user?.id if present); call userService.getProfile; 200.
    GET /:username/followers — optional auth; call followService.getFollowers; 200.
    GET /:username/following — optional auth; call followService.getFollowing; 200.

    Create backend/src/routes/search.routes.ts (or add to user.routes.ts):
    GET /search/users (requireAuth) — Zod validate q min 1 char; call userService.searchUsers; 200.

    Update backend/src/app.ts: mount followRouter at /follows, likeRouter at /likes, userRouter at /users, searchRouter at /search. All before errorHandler.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit && grep -q "followRouter\|likeRouter\|userRouter" src/app.ts</automated>
  </verify>
  <acceptance_criteria>
    - POST /follows/:username requires auth; DELETE /follows/:username requires auth
    - POST /likes/:tweetId requires auth; DELETE /likes/:tweetId requires auth
    - GET /users/:username does NOT require auth (public profile)
    - GET /search/users requires auth and validates q param
    - All routers mounted in app.ts before errorHandler
    - tsc passes
  </acceptance_criteria>
  <done>All six social/like/profile/search routes wired; auth requirements per docs/api.md respected; app.ts updated.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → POST /follows/:username | Must enforce no-self-follow and no-duplicate at service level |
| client → GET /users/:username | Public endpoint; is_following resolved only when requester identity is confirmed |
| client → GET /search/users | Authenticated; q param must be validated to prevent unbounded ILIKE scans |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-11 | Tampering | follow self | mitigate | followerId === targetId check before insert; also backed by DB CHECK constraint |
| T-02-12 | Spoofing | is_following | mitigate | is_following computed server-side from DB; never trusted from client |
| T-02-13 | DoS | ILIKE search | mitigate | q validated min 1 char by Zod; ILIKE only on indexed username column; limit capped at 50 |
| T-02-14 | Information Disclosure | getProfile | mitigate | password_hash and refresh_token_hash not selected; only public fields returned |
</threat_model>

<verification>
- POST /follows/:username (self) → 400
- POST /follows/:username twice → 409 on second
- DELETE /follows/:username not following → 400
- POST /likes/:tweetId twice → 409 on second
- GET /users/:username → 200 with counts and is_following
- GET /search/users?q=te → 200 array of matching users
- GET /search/users without q → 400 (Zod validation)
- `cd backend && npx tsc --noEmit` passes
</verification>

<success_criteria>
1. All social graph, like, profile, and search endpoints respond correctly per docs/api.md
2. followService.getFollowerIds exported and usable by tweetService for SSE broadcast
3. is_following resolved correctly in getProfile and searchUsers
4. Self-follow and duplicate-follow prevented at both service and DB constraint levels
5. tsc compiles with no errors
</success_criteria>

<output>
Create `.planning/phases/02-backend-auth-core-api/02-03-SUMMARY.md` when done
</output>

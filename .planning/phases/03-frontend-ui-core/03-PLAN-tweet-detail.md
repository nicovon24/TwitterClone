---
phase: 03-frontend-ui-core
plan: 05
type: execute
wave: 2
depends_on: [03-PLAN-timeline-composer-sse]
files_modified:
  - backend/src/services/tweetService.ts
  - backend/src/routes/tweet.routes.ts
  - backend/src/services/userService.ts
  - backend/src/routes/user.routes.ts
  - frontend/src/app/tweet/[id]/page.tsx
  - frontend/src/components/TweetCard.tsx
autonomous: true
requirements: [CONT-04, TMEL-02, PROF-01]
user_setup: []

must_haves:
  truths:
    - "GET /tweets/:id devuelve un tweet individual con user, likes_count y liked_by_me"
    - "GET /tweets/:id devuelve 404 si el tweet no existe o está soft-deleted (deleted_at no nulo)"
    - "GET /users/:username/tweets devuelve los tweets del usuario paginados por cursor, excluyendo los borrados"
    - "La vista /tweet/[id] muestra el tweet completo con autor, contenido, fecha y contador de likes"
    - "Hacer click en el cuerpo de un TweetCard navega a /tweet/[id]"
    - "El click en los botones de like/eliminar NO dispara la navegación al detalle (stopPropagation)"
    - "La vista de detalle permite dar like/unlike y eliminar (si es propio) igual que en el timeline"
  artifacts:
    - path: "backend/src/services/tweetService.ts"
      provides: "getTweetById y getUserTweets agregados al service de tweets"
      contains: "getTweetById"
    - path: "backend/src/routes/tweet.routes.ts"
      provides: "GET /tweets/:id route"
      contains: "tweetRouter.get('/:id'"
    - path: "backend/src/routes/user.routes.ts"
      provides: "GET /users/:username/tweets route"
      contains: "/:username/tweets"
    - path: "frontend/src/app/tweet/[id]/page.tsx"
      provides: "Vista de detalle de un tweet individual"
      contains: "GET /tweets/"
  key_links:
    - from: "backend/src/routes/tweet.routes.ts"
      to: "backend/src/services/tweetService.ts"
      via: "tweetService.getTweetById"
      pattern: "getTweetById"
    - from: "frontend/src/app/tweet/[id]/page.tsx"
      to: "frontend/src/lib/api.ts"
      via: "api.get(`/tweets/${id}`)"
      pattern: "api.get"
    - from: "frontend/src/components/TweetCard.tsx"
      to: "frontend/src/app/tweet/[id]/page.tsx"
      via: "router.push(`/tweet/${tweet.id}`)"
      pattern: "/tweet/"
---

<objective>
Add the tweet detail view and the two backend read-endpoints it depends on.

Purpose: Twitter's most-used view after the home feed is the individual tweet page. Today the backend has no way to fetch a single tweet (`GET /tweets/:id`) nor a user's own tweets (`GET /users/:username/tweets`) — both are gaps discovered while aligning the frontend plans with the real Phase 2 backend. This plan closes those gaps and builds the detail page on top of them.
Output: Two new backend endpoints returning the existing TweetWithUser shape, a `/tweet/[id]` page, and clickable TweetCards that navigate to it.
</objective>

<execution_context>
@AGENTS.md
@backend/src/services/tweetService.ts
@backend/src/routes/tweet.routes.ts
@backend/src/services/userService.ts
@backend/src/routes/user.routes.ts
@frontend/src/lib/api.ts
@frontend/src/store/timelineStore.ts
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@AGENTS.md

<interfaces>
<!-- REAL backend contract verified against Phase 2 code (NOT docs/api.md, which is stale) -->
<!-- Base URL: http://localhost:4000 (no /api prefix). Auth: Authorization: Bearer <accessToken> -->

Existing shape reused (from tweetService.ts):
  TweetWithUser = {
    id: string
    content: string
    created_at: Date   // serialized to ISO string over JSON
    user: { id: string; username: string; avatar_url: string | null }
    likes_count: number
    liked_by_me: boolean
  }

NEW endpoints this plan adds:

GET /tweets/:id   (requireAuth)
  200: TweetWithUser
  404: { error: "Tweet not found" }   // also when deleted_at is set

GET /users/:username/tweets?cursor=&limit=20   (auth optional — follow existing user.routes.ts pattern that reads req.user?.id)
  200: { tweets: TweetWithUser[], next_cursor: string | null }
  404: { error: "User not found" }

Existing mounting (app.ts):
  app.use('/tweets', tweetRouter)
  app.use('/users', userRouter)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: getTweetById + getUserTweets in tweetService</name>
  <files>backend/src/services/tweetService.ts</files>
  <read_first>
    - backend/src/services/tweetService.ts — reuse encodeCursor/decodeCursor, the likes join, and TweetWithUser mapping from getTimeline
    - backend/src/db/schema.ts — tweets, users, likes columns
  </read_first>
  <action>
    Add two exported functions to backend/src/services/tweetService.ts. Reuse the exact select/join/group-by pattern already used in getTimeline so the response shape is identical.

    export async function getTweetById(tweetId: string, requesterId: string): Promise<TweetWithUser>
      - Query tweets innerJoin users leftJoin likes, WHERE tweets.id = tweetId AND tweets.deleted_at IS NULL.
      - groupBy(tweets.id, users.username, users.avatar_url).
      - likes_count = CAST(COUNT(likes.tweet_id) AS INTEGER); liked_by_me = MAX(CASE WHEN likes.user_id = requesterId THEN 1 ELSE 0 END) === 1.
      - If no row → throw { status: 404, message: 'Tweet not found' }.
      - Return the mapped TweetWithUser.

    export async function getUserTweets(username: string, requesterId: string | undefined, cursor?: string, limit = 20): Promise<{ tweets: TweetWithUser[]; nextCursor: string | null }>
      - First resolve the user id by username (select id from users where username = username). If not found → throw { status: 404, message: 'User not found' }.
      - Then same composite-cursor query as getTimeline but WHERE tweets.user_id = <resolvedId> AND deleted_at IS NULL (NOT the following set).
      - liked_by_me uses requesterId if provided, otherwise always false (use a guard: when requesterId is undefined, select 0).
      - Apply the (created_at, id) < (cursorDate, cursorId) condition when cursor present; LIMIT safeLimit + 1; build nextCursor with encodeCursor exactly like getTimeline.
      - Return { tweets, nextCursor }.

    Keep all code/comments in English (L10N-02). Do not duplicate encode/decode — reuse the existing helpers.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - getTweetById returns TweetWithUser; throws 404 for missing or soft-deleted tweet
    - getUserTweets returns cursor-paginated tweets for a username; throws 404 for unknown username
    - liked_by_me is false when requesterId is undefined
    - Reuses encodeCursor/decodeCursor (no duplicated cursor logic)
    - tsc passes
  </acceptance_criteria>
  <done>tweetService exposes getTweetById and getUserTweets with the same shape as getTimeline.</done>
</task>

<task type="auto">
  <name>Task 2: GET /tweets/:id route</name>
  <files>backend/src/routes/tweet.routes.ts</files>
  <read_first>
    - backend/src/routes/tweet.routes.ts — existing tweetRouter, requireAuth import, error mapping pattern (DELETE handler)
    - backend/src/services/tweetService.ts (Task 1) — getTweetById signature
  </read_first>
  <action>
    Add to tweetRouter in backend/src/routes/tweet.routes.ts, AFTER the POST '/' handler and BEFORE/around the DELETE '/:id' handler (order does not conflict since methods differ):

    tweetRouter.get('/:id', requireAuth, async (req, res) => {
      try {
        const tweet = await tweetService.getTweetById(req.params.id, req.user!.id)
        res.status(200).json(tweet)
      } catch (err) {
        const typed = err as { status?: number }
        if (typed.status === 404) { res.status(404).json({ error: 'Tweet not found' }); return }
        throw err
      }
    })

    Follow the existing try/catch + typed status mapping style already used by the DELETE handler.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - GET /tweets/:id requires auth and returns the tweet
    - 404 returned for missing/deleted tweet
    - tsc passes
  </acceptance_criteria>
  <done>GET /tweets/:id wired into tweetRouter.</done>
</task>

<task type="auto">
  <name>Task 3: GET /users/:username/tweets route</name>
  <files>backend/src/routes/user.routes.ts</files>
  <read_first>
    - backend/src/routes/user.routes.ts — existing followers/following handlers (same cursor/limit parsing + req.user?.id pattern)
    - backend/src/services/tweetService.ts (Task 1) — getUserTweets signature
  </read_first>
  <action>
    Add to backend/src/routes/user.routes.ts. Import getUserTweets from the tweet service (import * as tweetService from '../services/tweetService.js').

    Register the route BEFORE the catch-all '/:username' if any ordering matters; with Express, '/:username/tweets' is more specific and registered as its own path so order is fine, but place it next to the followers/following routes for consistency:

    router.get('/:username/tweets', async (req, res) => {
      const requesterId = req.user?.id
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20
      try {
        const result = await tweetService.getUserTweets(req.params.username, requesterId, cursor, limit)
        res.status(200).json({ tweets: result.tweets, next_cursor: result.nextCursor })
      } catch (err) {
        const typed = err as { status?: number }
        if (typed.status === 404) { res.status(404).json({ error: 'User not found' }); return }
        throw err
      }
    })

    Mirror the exact cursor/limit parsing already used by the followers/following handlers.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - GET /users/:username/tweets returns { tweets, next_cursor }
    - 404 for unknown username
    - Matches the cursor/limit parsing of existing user routes
    - tsc passes
  </acceptance_criteria>
  <done>GET /users/:username/tweets wired into userRouter — unblocks the profile page tweet list (Plan 03-03).</done>
</task>

<task type="auto">
  <name>Task 4: Make TweetCard navigable to the detail view</name>
  <files>frontend/src/components/TweetCard.tsx</files>
  <read_first>
    - frontend/src/components/TweetCard.tsx (from Plan 03-02) — existing structure, like/delete handlers
  </read_first>
  <action>
    Update frontend/src/components/TweetCard.tsx so the card body navigates to the detail page, without breaking the action buttons.

    - Import useRouter from 'next/navigation'.
    - Wrap the clickable region (avatar + author + content) in an onClick that calls router.push(`/tweet/${tweet.id}`). Add role="link", tabIndex={0}, and a cursor-pointer class. Optionally support Enter key via onKeyDown.
    - On the like button and delete button handlers, call e.stopPropagation() FIRST so clicking them does not also navigate. (If the handlers receive the event, add the event param.)
    - Do not change the like/delete logic itself — only add stopPropagation and the navigation wrapper.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Clicking the tweet body navigates to /tweet/:id
    - Clicking like or delete does NOT navigate (stopPropagation)
    - Like/delete behavior unchanged
    - tsc passes
  </acceptance_criteria>
  <done>TweetCard body is a link to the detail view; action buttons stop propagation.</done>
</task>

<task type="auto">
  <name>Task 5: Tweet detail page /tweet/[id]</name>
  <files>frontend/src/app/tweet/[id]/page.tsx</files>
  <read_first>
    - frontend/src/components/TweetCard.tsx (Task 4) — reuse for rendering the tweet
    - frontend/src/store/timelineStore.ts — Tweet type
    - frontend/src/store/authStore.ts — current user id + auth guard
  </read_first>
  <action>
    Create frontend/src/app/tweet/[id]/page.tsx:

    'use client'

    Auth guard: if !accessToken → router.replace('/login') (same pattern as home page).

    Read params.id (Next.js App Router: props.params.id).
    State: tweet (Tweet | null), loading (boolean), notFound (boolean).

    On mount: api.get(`/tweets/${id}`).then(res => setTweet(res.data)).catch(err => { if 404 → setNotFound(true) }).finally(loading=false).

    JSX:
    - Header with a back button (← Volver) that calls router.back().
    - If loading → <p>Cargando...</p>
    - If notFound → <p>Este tweet no existe o fue eliminado.</p>
    - Else render the tweet. Reuse <TweetCard tweet={tweet} currentUserId={user?.id ?? null} /> for consistency.
    - Wrap in the same max-w-xl mx-auto border-x container as the home page for visual consistency.

    All text in Spanish.
    Note: since the detail page reuses TweetCard which itself navigates to /tweet/:id, that's fine (clicking the same card just re-navigates to the same page).
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - /tweet/:id fetches and renders the tweet via TweetCard
    - 404 shows "Este tweet no existe o fue eliminado."
    - Back button returns to previous page
    - Auth guard redirects to /login when unauthenticated
    - tsc passes
  </acceptance_criteria>
  <done>Tweet detail page renders a single tweet with like/delete and a back button.</done>
</task>

</tasks>

<verification>
- cd backend && npx tsc --noEmit → exits 0
- GET /tweets/<valid-id> with Bearer token → 200 + tweet
- GET /tweets/<deleted-or-missing-id> → 404
- GET /users/<username>/tweets → 200 + { tweets, next_cursor }
- cd frontend && npx tsc --noEmit → exits 0
- Click a tweet in the feed → navigates to /tweet/:id; like button does not navigate
</verification>

<success_criteria>
1. GET /tweets/:id returns a single tweet (TweetWithUser); 404 for missing/deleted
2. GET /users/:username/tweets returns cursor-paginated user tweets; 404 for unknown user
3. TweetCard body navigates to /tweet/:id; action buttons stopPropagation
4. /tweet/[id] page renders the tweet with like/delete and a back button
5. Both backend and frontend tsc pass
</success_criteria>

<output>
Create `.planning/phases/03-frontend-ui-core/03-05-SUMMARY.md` when done
</output>

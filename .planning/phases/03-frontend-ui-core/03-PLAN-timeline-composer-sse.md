---
phase: 03-frontend-ui-core
plan: 02
type: execute
wave: 2
depends_on: [03-PLAN-auth-pages]
files_modified:
  - frontend/src/store/timelineStore.ts
  - frontend/src/hooks/useTimelineStream.ts
  - frontend/src/components/TweetComposer.tsx
  - frontend/src/components/TweetCard.tsx
  - frontend/src/components/Timeline.tsx
  - frontend/src/app/page.tsx
autonomous: true
requirements: [REAL-01, REAL-02, REAL-03, REAL-04]
user_setup: []

must_haves:
  truths:
    - "Componer un tweet lo agrega al tope del feed sin recargar la página"
    - "Scroll al fondo del feed carga la siguiente página via cursor pagination sin duplicados"
    - "Un tweet posteado desde otra pestaña (misma cuenta) aparece en el feed via SSE dentro de 1 segundo"
    - "El contador de likes se actualiza optimistamente al hacer click, antes de que llegue la respuesta del servidor"
    - "El botón Eliminar solo es visible si tweet.user.id === currentUser.id"
    - "El textarea del composer muestra el contador de caracteres restantes (280 - content.length)"
    - "El botón de submit del composer está deshabilitado si content está vacío o supera 280 caracteres"
    - "Si el SSE cae, se reconecta con backoff exponencial [1000, 2000, 4000, 8000] ms"
  artifacts:
    - path: "frontend/src/store/timelineStore.ts"
      provides: "Zustand store con tweets[], nextCursor, y acciones prependTweet, appendTweets, deleteTweet, toggleLike"
      contains: "prependTweet"
    - path: "frontend/src/hooks/useTimelineStream.ts"
      provides: "Custom hook que abre EventSource y llama prependTweet en cada mensaje SSE"
      contains: "EventSource"
    - path: "frontend/src/components/TweetComposer.tsx"
      provides: "Formulario de composición con contador de 280 chars"
      contains: "maxLength"
    - path: "frontend/src/components/TweetCard.tsx"
      provides: "Card de tweet con like/unlike optimista y botón de borrado condicional"
      contains: "toggleLike"
    - path: "frontend/src/components/Timeline.tsx"
      provides: "Lista de TweetCards con infinite scroll via IntersectionObserver"
      contains: "IntersectionObserver"
    - path: "frontend/src/app/page.tsx"
      provides: "Home page con TweetComposer + Timeline + SSE hook montado"
      contains: "useTimelineStream"
  key_links:
    - from: "frontend/src/hooks/useTimelineStream.ts"
      to: "frontend/src/store/timelineStore.ts"
      via: "import { useTimelineStore } from '@/store/timelineStore'"
      pattern: "prependTweet"
    - from: "frontend/src/components/Timeline.tsx"
      to: "frontend/src/store/timelineStore.ts"
      via: "import { useTimelineStore } from '@/store/timelineStore'"
      pattern: "appendTweets"
    - from: "frontend/src/components/TweetCard.tsx"
      to: "frontend/src/lib/api.ts"
      via: "import api from '@/lib/api'"
      pattern: "api.post('/likes/')"
    - from: "frontend/src/app/page.tsx"
      to: "frontend/src/hooks/useTimelineStream.ts"
      via: "import { useTimelineStream } from '@/hooks/useTimelineStream'"
      pattern: "useTimelineStream()"
---

<objective>
Build the core timeline experience: tweet composer, tweet feed with infinite scroll, real-time SSE updates, like/unlike with optimistic updates, and tweet deletion.

Purpose: This is the main feature of the app. Auth pages get users in the door; this plan is what they actually use. The Zustand timelineStore is the central state for the feed — every component reads from and writes to it. The SSE hook bridges the backend push notifications to the frontend store.
Output: A fully functional home page where users can compose tweets, scroll through their feed, see new tweets appear in real-time, like/unlike tweets, and delete their own tweets — all without a page reload.
</objective>

<execution_context>
@AGENTS.md
@docs/api.md
@frontend/src/lib/api.ts
@frontend/src/store/authStore.ts
@frontend/src/app/page.tsx
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@docs/api.md
@AGENTS.md

<interfaces>
<!-- API contracts from docs/api.md -->

GET /timeline?cursor=<id>&limit=20
  Auth: required
  200: { tweets: Tweet[], next_cursor: string | null }
  Tweet shape: { id, content, created_at, user: { id, username, avatar_url }, likes_count, liked_by_me }

POST /tweets
  Auth: required
  Body: { content: string (1–280 chars) }
  201: { id, content, created_at, user: { id, username, avatar_url }, likes_count: 0, liked_by_me: false }

DELETE /tweets/:id
  Auth: required
  200: { message: "Tweet deleted" }
  403: not the author

POST /likes/:tweetId
  Auth: required
  201: { message, likes_count: number }

DELETE /likes/:tweetId
  Auth: required
  200: { message, likes_count: number }

GET /timeline/stream?token=<accessToken>
  Auth: via query param (EventSource cannot set headers)
  SSE event: event=new_tweet, data=Tweet (same shape as timeline tweet)

Tweet type (shared interface):
  interface Tweet {
    id: string
    content: string
    created_at: string
    user: { id: string; username: string; avatar_url: string | null }
    likes_count: number
    liked_by_me: boolean
  }
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: timelineStore — Zustand store for feed state</name>
  <files>frontend/src/store/timelineStore.ts</files>
  <read_first>
    - frontend/src/store/authStore.ts — follow the same Zustand pattern
    - docs/api.md (GET /timeline section) — Tweet shape and next_cursor
  </read_first>
  <action>
    Create frontend/src/store/timelineStore.ts:

    Define a Tweet interface (or export it for reuse):
      interface Tweet {
        id: string
        content: string
        created_at: string
        user: { id: string; username: string; avatar_url: string | null }
        likes_count: number
        liked_by_me: boolean
      }

    Define TimelineState:
      interface TimelineState {
        tweets: Tweet[]
        nextCursor: string | null
        isLoading: boolean
        prependTweet: (tweet: Tweet) => void
        appendTweets: (tweets: Tweet[], cursor: string | null) => void
        deleteTweet: (id: string) => void
        toggleLike: (id: string, liked: boolean, count: number) => void
        setLoading: (v: boolean) => void
        reset: () => void
      }

    Implement with create<TimelineState>((set) => ({ ... })):
    - prependTweet: prepend to tweets array (avoid duplicate by checking tweet.id not already present)
    - appendTweets: append new tweets to array, update nextCursor; deduplicate by id
    - deleteTweet: filter out by id
    - toggleLike(id, liked, count): map tweets; for matching id set liked_by_me=liked, likes_count=count
    - setLoading: set isLoading
    - reset: set tweets=[], nextCursor=null, isLoading=false

    Export Tweet type and useTimelineStore.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - useTimelineStore exports all 6 actions
    - Tweet interface is exported for use by other components
    - prependTweet deduplicates by id
    - appendTweets deduplicates by id and updates nextCursor
    - tsc passes
  </acceptance_criteria>
  <done>timelineStore created with all actions; Tweet type exported; tsc passes.</done>
</task>

<task type="auto">
  <name>Task 2: useTimelineStream — SSE hook with reconnect backoff</name>
  <files>frontend/src/hooks/useTimelineStream.ts</files>
  <read_first>
    - frontend/src/store/timelineStore.ts (Task 1) — prependTweet signature
    - frontend/src/store/authStore.ts — accessToken field
    - docs/api.md (GET /timeline/stream section) — event format and token query param
  </read_first>
  <action>
    Create frontend/src/hooks/useTimelineStream.ts:

    'use client' is NOT needed for a hook file, but the file uses browser APIs so must only run client-side.

    export function useTimelineStream(): void {
      const accessToken = useAuthStore(state => state.accessToken)
      const prependTweet = useTimelineStore(state => state.prependTweet)

      useEffect(() => {
        if (!accessToken) return

        const BACKOFF = [1000, 2000, 4000, 8000]
        let attempt = 0
        let es: EventSource | null = null
        let timeoutId: ReturnType<typeof setTimeout> | null = null

        function connect() {
          const url = `${process.env.NEXT_PUBLIC_API_URL}/timeline/stream?token=${accessToken}`
          es = new EventSource(url)

          es.addEventListener('new_tweet', (event) => {
            try {
              const tweet = JSON.parse(event.data)
              prependTweet(tweet)
              attempt = 0 // reset backoff on success
            } catch {
              // ignore malformed events
            }
          })

          es.onerror = () => {
            es?.close()
            const delay = BACKOFF[Math.min(attempt, BACKOFF.length - 1)]
            attempt++
            timeoutId = setTimeout(connect, delay)
          }
        }

        connect()

        return () => {
          es?.close()
          if (timeoutId) clearTimeout(timeoutId)
        }
      }, [accessToken, prependTweet])
    }

    Use NEXT_PUBLIC_API_URL from process.env. No direct window usage needed — EventSource is available globally in browsers.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Hook opens EventSource at /timeline/stream?token=<accessToken>
    - On 'new_tweet' event: parses JSON and calls prependTweet
    - On error: closes connection and reconnects after backoff delay
    - Backoff sequence is [1000, 2000, 4000, 8000] ms
    - Cleanup closes EventSource and clears any pending timeout
    - tsc passes
  </acceptance_criteria>
  <done>useTimelineStream hook connects via SSE, prepends tweets on event, reconnects with backoff on error.</done>
</task>

<task type="auto">
  <name>Task 3: TweetComposer component</name>
  <files>frontend/src/components/TweetComposer.tsx</files>
  <read_first>
    - frontend/src/store/timelineStore.ts (Task 1) — prependTweet signature and Tweet type
    - frontend/src/store/authStore.ts — user field
    - docs/api.md (POST /tweets section) — request body and response shape
  </read_first>
  <action>
    Create frontend/src/components/TweetComposer.tsx:

    'use client'

    State: content (string), loading (boolean), error (string | null).

    const MAX = 280
    const remaining = MAX - content.length
    const isValid = content.trim().length > 0 && content.length <= MAX

    JSX:
    - <div> wrapper with border-b border-gray-200 p-4
    - <textarea> rows=3 maxLength=285 (allow typing past limit but disable submit; showing red counter): value=content, onChange=e=>setContent(e.target.value), placeholder="¿Qué está pasando?"
    - Counter span: `{remaining}` characters; red if remaining < 0 or remaining <= 20
    - Submit <button> "Twittear": disabled={!isValid || loading}; onClick=handleSubmit
    - Error paragraph if error

    handleSubmit:
    1. Set loading=true, error=null.
    2. POST api.post('/tweets', { content: content.trim() }).
    3. On success: prependTweet(response.data); setContent('').
    4. On error: set error = "No se pudo publicar el tweet. Intentá de nuevo.".
    5. Always: loading=false.

    Note: the API response for POST /tweets returns the full tweet object directly (id, content, created_at, user, likes_count, liked_by_me).
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Textarea shows remaining character count; goes red at ≤20 and when negative
    - Submit button disabled when content empty or length > 280
    - On success: prependTweet called and textarea cleared
    - Placeholder text is "¿Qué está pasando?"
    - tsc passes
  </acceptance_criteria>
  <done>TweetComposer renders, validates, submits, and prepends the new tweet to the store.</done>
</task>

<task type="auto">
  <name>Task 4: TweetCard component</name>
  <files>frontend/src/components/TweetCard.tsx</files>
  <read_first>
    - frontend/src/store/timelineStore.ts (Task 1) — toggleLike, deleteTweet signatures
    - frontend/src/store/authStore.ts — user.id
    - docs/api.md (POST /likes/:tweetId, DELETE /likes/:tweetId, DELETE /tweets/:id sections)
  </read_first>
  <action>
    Create frontend/src/components/TweetCard.tsx:

    'use client'

    Props: tweet: Tweet (import from timelineStore), currentUserId: string | null.

    const isOwner = currentUserId !== null && tweet.user.id === currentUserId

    Like/Unlike (optimistic):
    async function handleLike() {
      const newLiked = !tweet.liked_by_me
      const optimisticCount = tweet.likes_count + (newLiked ? 1 : -1)
      toggleLike(tweet.id, newLiked, optimisticCount) // update store immediately
      try {
        if (newLiked) {
          const { data } = await api.post(`/likes/${tweet.id}`)
          toggleLike(tweet.id, true, data.likes_count) // reconcile with server count
        } else {
          const { data } = await api.delete(`/likes/${tweet.id}`)
          toggleLike(tweet.id, false, data.likes_count)
        }
      } catch {
        // rollback
        toggleLike(tweet.id, tweet.liked_by_me, tweet.likes_count)
      }
    }

    Delete:
    async function handleDelete() {
      try {
        await api.delete(`/tweets/${tweet.id}`)
        deleteTweet(tweet.id)
      } catch {
        // silently ignore — tweet stays in list
      }
    }

    JSX:
    - Card with border-b border-gray-200 p-4 flex gap-3
    - Avatar placeholder (circle with first letter of username)
    - Username @{tweet.user.username}, timestamp (relative — use toLocaleDateString or simple date format)
    - Tweet content paragraph
    - Footer: like button with heart icon (♥) + likes_count; delete button (🗑) only if isOwner
    - Like button: aria-label = liked_by_me ? "Quitar like" : "Dar like"; text color changes if liked

    All button labels/aria-labels in Spanish.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Like/unlike is optimistic: store updates before API response
    - Server count reconciles after API response
    - On API error: like state is rolled back
    - Delete button only renders when currentUserId === tweet.user.id
    - Delete removes tweet from store
    - tsc passes
  </acceptance_criteria>
  <done>TweetCard renders tweet with optimistic like/unlike and conditional delete button.</done>
</task>

<task type="auto">
  <name>Task 5: Timeline component with infinite scroll</name>
  <files>frontend/src/components/Timeline.tsx</files>
  <read_first>
    - frontend/src/store/timelineStore.ts (Task 1) — tweets, nextCursor, appendTweets, isLoading, setLoading, reset
    - frontend/src/store/authStore.ts — user.id for passing currentUserId to TweetCard
    - docs/api.md (GET /timeline section) — query params and response shape
  </read_first>
  <action>
    Create frontend/src/components/Timeline.tsx:

    'use client'

    On mount: fetch first page (GET /api/timeline, no cursor); call appendTweets(data.tweets, data.next_cursor); setLoading(false).

    Infinite scroll with IntersectionObserver:
    - Create a sentinel <div ref={sentinelRef}> at the bottom of the list
    - In useEffect: create new IntersectionObserver(entries => { if (entries[0].isIntersecting && nextCursor && !isLoading) { fetchNextPage() } }); observe sentinelRef.current
    - fetchNextPage: setLoading(true); GET /timeline?cursor=nextCursor; appendTweets(data.tweets, data.next_cursor); setLoading(false)

    Cleanup: call reset() on unmount to avoid stale data.

    JSX:
    - <div className="divide-y divide-gray-200">
    - {tweets.map(tweet => <TweetCard key={tweet.id} tweet={tweet} currentUserId={user?.id ?? null} />)}
    - {isLoading && <p className="text-center p-4 text-gray-400">Cargando...</p>}
    - {!nextCursor && tweets.length > 0 && <p className="text-center p-4 text-gray-400">No hay más tweets</p>}
    - {tweets.length === 0 && !isLoading && <p className="text-center p-4 text-gray-400">Tu timeline está vacío. ¡Seguí a alguien!</p>}
    - Sentinel <div ref={sentinelRef} className="h-4" />

    Get user from useAuthStore(state => state.user).
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Fetches first page on mount
    - IntersectionObserver triggers next page load when sentinel is visible
    - No duplicate tweets (store deduplicates by id)
    - Shows "Cargando..." while fetching
    - Shows "No hay más tweets" when next_cursor is null
    - Shows empty state message when timeline has no tweets
    - tsc passes
  </acceptance_criteria>
  <done>Timeline fetches first page, loads more on scroll, passes currentUserId to TweetCard.</done>
</task>

<task type="auto">
  <name>Task 6: Home page — wire TweetComposer + Timeline + SSE hook</name>
  <files>frontend/src/app/page.tsx</files>
  <read_first>
    - frontend/src/app/page.tsx — current state with auth guard
    - frontend/src/components/TweetComposer.tsx (Task 3)
    - frontend/src/components/Timeline.tsx (Task 5)
    - frontend/src/hooks/useTimelineStream.ts (Task 2)
  </read_first>
  <action>
    Update frontend/src/app/page.tsx:

    Keep the auth guard (useEffect redirect to /login if !accessToken).

    Add: useTimelineStream() call at the top of the component (after auth guard check).

    Replace the <p>Cargando timeline...</p> placeholder with:
    <main className="max-w-xl mx-auto min-h-screen border-x border-gray-200">
      <header className="sticky top-0 bg-white border-b border-gray-200 p-4 font-bold text-xl">
        Inicio
      </header>
      <TweetComposer />
      <Timeline />
    </main>

    Import TweetComposer from '@/components/TweetComposer'.
    Import Timeline from '@/components/Timeline'.
    Import useTimelineStream from '@/hooks/useTimelineStream'.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Home page renders TweetComposer above Timeline
    - useTimelineStream() is called on mount
    - Auth guard still redirects to /login if !accessToken
    - tsc passes with no errors
  </acceptance_criteria>
  <done>Home page fully assembled with composer, timeline feed, and SSE real-time hook.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| SSE token in URL | accessToken sent as query param (EventSource limitation per ADR-004); no custom headers possible |
| Optimistic like state | Client-side count can desync if API fails — must rollback on error |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01 | Information Disclosure | SSE token in URL | accept | ADR-004 decision; token is short-lived (15 min); URL is not logged by NGINX in this setup |
| T-03-02 | Tampering | Optimistic like | mitigate | Rollback to original state on API error; server count reconciles on success |
| T-03-03 | DoS | SSE reconnect | mitigate | Exponential backoff [1s, 2s, 4s, 8s] prevents hammering the server on sustained failure |
</threat_model>

<verification>
- npm run dev in frontend → no TypeScript errors in terminal
- Visit / → TweetComposer and Timeline both render
- Compose a tweet → appears at top of feed immediately
- Scroll to bottom → next page loads (requires seed data)
- Open two tabs, post from tab 2 → appears in tab 1 within 1s (SSE)
- Click like → likes_count increments immediately (optimistic)
- cd frontend && npx tsc --noEmit → exits 0
</verification>

<success_criteria>
1. Timeline loads first page of tweets on mount
2. Composing a tweet prepends it to the feed via prependTweet without page reload
3. Infinite scroll loads next page when sentinel div enters viewport
4. SSE hook connects, receives new_tweet events, and prepends to feed
5. Like/unlike updates optimistically; server count reconciles; error rolls back
6. Delete button only visible for own tweets; deletes from store on success
7. tsc compiles with no errors
</success_criteria>

<output>
Create `.planning/phases/03-frontend-ui-core/03-02-SUMMARY.md` when done
</output>

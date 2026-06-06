---
phase: 03-frontend-ui-core
plan: 03
type: execute
wave: 2
depends_on: [03-PLAN-auth-pages]
files_modified:
  - frontend/src/app/users/[id]/page.tsx
  - frontend/src/app/search/page.tsx
  - frontend/src/hooks/useDebounce.ts
  - frontend/src/components/Sidebar.tsx
  - frontend/src/components/BottomNav.tsx
  - frontend/src/app/layout.tsx
autonomous: true
requirements: [L10N-01]
user_setup: []

must_haves:
  truths:
    - "/users/:id muestra followers_count y following_count correctos obtenidos del backend"
    - "El botón Seguir/Dejar de seguir toglea sin recargar la página"
    - "No se puede seguir al propio usuario (el botón no se renderiza si id === currentUserId)"
    - "La búsqueda de usuarios es case-insensitive (ILIKE en backend)"
    - "El input de búsqueda tiene debounce de 300ms — no dispara peticiones en cada tecla"
    - "Sidebar visible en pantallas ≥768px, BottomNav visible en <768px"
    - "El layout aplica correctamente md:hidden y flex md:flex según el viewport"
    - "Todos los textos de navegación y botones están en español"
  artifacts:
    - path: "frontend/src/app/users/[id]/page.tsx"
      provides: "Página de perfil de usuario con stats, lista de tweets, y botón follow/unfollow"
      contains: "followers_count"
    - path: "frontend/src/app/search/page.tsx"
      provides: "Página de búsqueda con input debounced y lista de resultados"
      contains: "useDebounce"
    - path: "frontend/src/hooks/useDebounce.ts"
      provides: "Generic debounce hook: useDebounce<T>(value, delay) => T"
      contains: "useDebounce"
    - path: "frontend/src/components/Sidebar.tsx"
      provides: "Sidebar de escritorio con navegación y logo"
      contains: "hidden md:flex"
    - path: "frontend/src/components/BottomNav.tsx"
      provides: "Barra de navegación inferior para mobile"
      contains: "flex md:hidden"
    - path: "frontend/src/app/layout.tsx"
      provides: "Root layout con Sidebar izquierda, main centrado, BottomNav mobile"
      contains: "Sidebar"
  key_links:
    - from: "frontend/src/app/users/[id]/page.tsx"
      to: "frontend/src/lib/api.ts"
      via: "import api from '@/lib/api'"
      pattern: "api.get('/users/')"
    - from: "frontend/src/app/search/page.tsx"
      to: "frontend/src/hooks/useDebounce.ts"
      via: "import { useDebounce } from '@/hooks/useDebounce'"
      pattern: "useDebounce"
    - from: "frontend/src/app/layout.tsx"
      to: "frontend/src/components/Sidebar.tsx"
      via: "import Sidebar from '@/components/Sidebar'"
      pattern: "Sidebar"
    - from: "frontend/src/app/layout.tsx"
      to: "frontend/src/components/BottomNav.tsx"
      via: "import BottomNav from '@/components/BottomNav'"
      pattern: "BottomNav"
---

<objective>
Build the user profile page, search page, debounce hook, and the responsive layout shell (Sidebar + BottomNav).

Purpose: These three features complete the social graph interaction on the frontend. Users need to find other users (search), view their profiles, follow/unfollow them, and navigate the app on both desktop and mobile. The layout shell wraps every page.
Output: A working profile page with follow toggle, a debounced search page, and a responsive layout that shows the sidebar on desktop and the bottom nav on mobile.
</objective>

<execution_context>
@AGENTS.md
@docs/api.md
@frontend/src/lib/api.ts
@frontend/src/store/authStore.ts
@frontend/src/app/layout.tsx
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@docs/api.md
@AGENTS.md

<interfaces>
<!-- API contracts from docs/api.md -->

GET /users/:id/profile
  Auth: required
  200: { id, username, display_name, bio, avatar_url, followers_count, following_count, tweet_count, is_following }
  404: user not found

GET /users/:id/tweets?cursor=&limit=20
  Auth: required
  200: { tweets: Tweet[], next_cursor: string | null }

POST /follows/:username
  Auth: required
  201: { message }
  409: already following
  400: cannot follow yourself

DELETE /follows/:username
  Auth: required
  200: { message }

GET /search/users?q=<query>
  Auth: required
  200: { users: [{ id, username, display_name, bio, avatar_url, is_following }], next_cursor }
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: useDebounce hook</name>
  <files>frontend/src/hooks/useDebounce.ts</files>
  <read_first>
    - No specific files needed — this is a standalone generic hook
  </read_first>
  <action>
    Create frontend/src/hooks/useDebounce.ts:

    export function useDebounce<T>(value: T, delay: number): T {
      const [debounced, setDebounced] = useState<T>(value)
      useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(timer)
      }, [value, delay])
      return debounced
    }

    Import useState and useEffect from 'react'. Export the function as named export.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - useDebounce<T>(value, delay) returns the debounced value
    - Cleans up the timeout on re-render or unmount
    - tsc passes
  </acceptance_criteria>
  <done>useDebounce hook created; generic, typed, with cleanup.</done>
</task>

<task type="auto">
  <name>Task 2: User profile page</name>
  <files>frontend/src/app/users/[id]/page.tsx</files>
  <read_first>
    - docs/api.md (GET /users/:id/profile, POST /follows/:username, DELETE /follows/:username)
    - frontend/src/store/authStore.ts — user.id to detect own profile
    - frontend/src/store/timelineStore.ts — Tweet type
  </read_first>
  <action>
    Create frontend/src/app/users/[id]/page.tsx:

    'use client'

    Use params: { id: string } from the page props (Next.js App Router: props.params.id).

    State: profile (UserProfile | null), tweets (Tweet[]), nextCursor (string | null), isFollowing (boolean), loadingFollow (boolean), error (string | null).

    interface UserProfile {
      id: string; username: string; display_name: string | null
      bio: string | null; avatar_url: string | null
      followers_count: number; following_count: number; tweet_count: number
      is_following: boolean
    }

    On mount: fetch GET /users/:id/profile → set profile, set isFollowing = profile.is_following.
    Also fetch GET /users/:id/tweets → set tweets, nextCursor.

    Follow/Unfollow toggle:
    async function handleFollow() {
      if (!profile) return
      setLoadingFollow(true)
      try {
        if (isFollowing) {
          await api.delete(`/follows/${profile.username}`)
          setIsFollowing(false)
          setProfile(p => p ? { ...p, followers_count: p.followers_count - 1 } : p)
        } else {
          await api.post(`/follows/${profile.username}`)
          setIsFollowing(true)
          setProfile(p => p ? { ...p, followers_count: p.followers_count + 1 } : p)
        }
      } catch {
        // silently ignore — UI stays consistent with last known state
      } finally {
        setLoadingFollow(false)
      }
    }

    const isOwnProfile = currentUser?.id === profile?.id

    JSX:
    - Profile header: avatar circle (first letter), display_name, @username, bio
    - Stats row: {tweet_count} Tweets · {followers_count} Seguidores · {following_count} Siguiendo
    - Follow button (not rendered if isOwnProfile): text = isFollowing ? "Dejar de seguir" : "Seguir"; disabled while loadingFollow
    - Divider
    - tweets.map(t => <TweetCard key={t.id} tweet={t} currentUserId={currentUser?.id ?? null} />)
    - Load more button if nextCursor (simple button, not IntersectionObserver — profile page doesn't need infinite scroll)

    Get currentUser from useAuthStore(state => state.user).
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Displays username, display_name, bio, follower/following/tweet counts from backend
    - Follow button not rendered for own profile (isOwnProfile check)
    - Follow toggles isFollowing state and updates followers_count optimistically
    - tsc passes
  </acceptance_criteria>
  <done>Profile page shows user stats, tweet list, and working follow/unfollow toggle.</done>
</task>

<task type="auto">
  <name>Task 3: Search page</name>
  <files>frontend/src/app/search/page.tsx</files>
  <read_first>
    - frontend/src/hooks/useDebounce.ts (Task 1)
    - docs/api.md (GET /search/users section)
    - frontend/src/store/authStore.ts — user.id for follow buttons
  </read_first>
  <action>
    Create frontend/src/app/search/page.tsx:

    'use client'

    State: query (string), results (SearchUser[]), loading (boolean), followingMap (Record<string, boolean>).

    interface SearchUser {
      id: string; username: string; display_name: string | null
      bio: string | null; avatar_url: string | null; is_following: boolean
    }

    const debouncedQuery = useDebounce(query, 300)

    useEffect(() => {
      if (debouncedQuery.trim().length === 0) { setResults([]); return }
      setLoading(true)
      api.get(`/search/users?q=${encodeURIComponent(debouncedQuery)}`)
        .then(res => {
          setResults(res.data.users)
          // initialize followingMap from is_following field
          const map: Record<string, boolean> = {}
          res.data.users.forEach((u: SearchUser) => { map[u.id] = u.is_following })
          setFollowingMap(map)
        })
        .catch(() => {}) // ignore errors silently
        .finally(() => setLoading(false))
    }, [debouncedQuery])

    async function handleFollow(user: SearchUser) {
      const currently = followingMap[user.id] ?? false
      setFollowingMap(m => ({ ...m, [user.id]: !currently }))
      try {
        if (currently) {
          await api.delete(`/follows/${user.username}`)
        } else {
          await api.post(`/follows/${user.username}`)
        }
      } catch {
        setFollowingMap(m => ({ ...m, [user.id]: currently })) // rollback
      }
    }

    JSX:
    - Heading "Buscar usuarios"
    - <input> placeholder="Buscar por nombre de usuario..." value=query onChange=e=>setQuery(e.target.value)
    - Loading indicator while fetching
    - If results.length === 0 && debouncedQuery && !loading: <p>"Sin resultados para '{debouncedQuery}'"</p>
    - results.map(user => UserCard with: avatar circle, display_name, @username, follow button)
    - Follow button: hide if user.id === currentUserId; text = followingMap[user.id] ? "Dejar de seguir" : "Seguir"

    Get currentUserId from useAuthStore(state => state.user?.id).
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Input with 300ms debounce fires GET /search/users only after delay
    - Results list renders user cards with follow/unfollow button
    - Follow button hidden for own user
    - "Sin resultados" message shown when query returns empty array
    - tsc passes
  </acceptance_criteria>
  <done>Search page renders with debounced input, user results, and working follow toggle.</done>
</task>

<task type="auto">
  <name>Task 4: Sidebar component</name>
  <files>frontend/src/components/Sidebar.tsx</files>
  <read_first>
    - frontend/src/store/authStore.ts — user.id for profile link, clearAuth for logout
  </read_first>
  <action>
    Create frontend/src/components/Sidebar.tsx:

    'use client'

    const currentUserId = useAuthStore(state => state.user?.id)
    const clearAuth = useAuthStore(state => state.clearAuth)

    function handleLogout() {
      api.post('/auth/logout').catch(() => {}) // best effort
      clearAuth()
      window.location.assign('/login')
    }

    JSX: <nav className="hidden md:flex flex-col h-screen sticky top-0 w-64 border-r border-gray-200 p-4 gap-2">
      - Logo: <span className="text-xl font-bold mb-4">ClonTwitter</span>
      - <Link href="/">Inicio</Link>
      - <Link href="/search">Buscar</Link>
      - {currentUserId && <Link href={`/users/${currentUserId}`}>Perfil</Link>}
      - <button onClick={handleLogout}>Cerrar sesión</button>

    Each nav link: className with p-3 rounded-full hover:bg-gray-100 text-lg flex items-center gap-3.
    Logout button: same styling, text red on hover.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Sidebar hidden on mobile (hidden md:flex)
    - Nav links: Inicio (/), Buscar (/search), Perfil (/users/:id)
    - Logout button clears auth and redirects to /login
    - tsc passes
  </acceptance_criteria>
  <done>Sidebar renders with 3 nav links and logout; hidden on mobile.</done>
</task>

<task type="auto">
  <name>Task 5: BottomNav component</name>
  <files>frontend/src/components/BottomNav.tsx</files>
  <read_first>
    - frontend/src/store/authStore.ts — user.id for profile link
  </read_first>
  <action>
    Create frontend/src/components/BottomNav.tsx:

    'use client'

    const currentUserId = useAuthStore(state => state.user?.id)

    JSX: <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      - <Link href="/" className="flex-1 flex flex-col items-center py-3 text-sm">🏠 Inicio</Link>
      - <Link href="/search" className="flex-1 flex flex-col items-center py-3 text-sm">🔍 Buscar</Link>
      - {currentUserId && <Link href={`/users/${currentUserId}`} className="flex-1 flex flex-col items-center py-3 text-sm">👤 Perfil</Link>}

    All link labels in Spanish.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - BottomNav visible only on mobile (flex md:hidden)
    - Fixed at bottom of screen
    - 3 links: Inicio, Buscar, Perfil
    - tsc passes
  </acceptance_criteria>
  <done>BottomNav renders fixed at bottom on mobile only.</done>
</task>

<task type="auto">
  <name>Task 6: Root layout — Sidebar + main + BottomNav</name>
  <files>frontend/src/app/layout.tsx</files>
  <read_first>
    - frontend/src/app/layout.tsx — current state (minimal wrapper)
    - frontend/src/components/Sidebar.tsx (Task 4)
    - frontend/src/components/BottomNav.tsx (Task 5)
  </read_first>
  <action>
    Update frontend/src/app/layout.tsx:

    Since Sidebar and BottomNav are 'use client' components (they use Zustand), they can be imported directly into the layout. The layout itself does NOT need 'use client'.

    import Sidebar from '@/components/Sidebar'
    import BottomNav from '@/components/BottomNav'

    Replace the <body>{children}</body> with:
    <body>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </body>

    Keep the existing Metadata export. Keep <html lang="es">.
    Add className="bg-white text-gray-900" to <html>.
    Ensure globals.css is still imported.

    Note: pb-16 on main adds bottom padding on mobile to prevent content being hidden behind the fixed BottomNav.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Layout wraps all pages with Sidebar on the left and BottomNav fixed at bottom
    - Sidebar uses hidden md:flex (invisible on mobile)
    - BottomNav uses flex md:hidden (invisible on desktop)
    - main has pb-16 md:pb-0 to avoid content hidden under BottomNav on mobile
    - tsc passes
  </acceptance_criteria>
  <done>Root layout applies Sidebar + BottomNav shell; responsive breakpoint correct.</done>
</task>

</tasks>

<verification>
- cd frontend && npm run dev → no TypeScript errors
- Visit /search → input renders; type a username → results appear after 300ms
- Visit /users/:id → profile stats load; follow button toggles
- Viewport ≥768px → Sidebar visible, BottomNav hidden
- Viewport <768px → Sidebar hidden, BottomNav visible at bottom
- cd frontend && npx tsc --noEmit → exits 0
</verification>

<success_criteria>
1. /users/:id displays user stats fetched from backend; follow/unfollow toggles without page reload
2. /search debounces input by 300ms; shows user results with follow/unfollow; own user button hidden
3. Sidebar renders on ≥768px with Inicio, Buscar, Perfil, Cerrar sesión links
4. BottomNav renders on <768px fixed at bottom with same navigation
5. Root layout applies shell to all pages correctly
6. tsc compiles with no errors
</success_criteria>

<output>
Create `.planning/phases/03-frontend-ui-core/03-03-SUMMARY.md` when done
</output>

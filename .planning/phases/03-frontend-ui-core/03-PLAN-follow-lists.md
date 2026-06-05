---
phase: 03-frontend-ui-core
plan: 06
type: execute
wave: 3
depends_on: [03-PLAN-profile-search-layout]
files_modified:
  - frontend/src/components/UserCard.tsx
  - frontend/src/app/users/[username]/followers/page.tsx
  - frontend/src/app/users/[username]/following/page.tsx
  - frontend/src/app/users/[username]/page.tsx
autonomous: true
requirements: [SOCL-04, SOCL-05, L10N-01]
user_setup: []

must_haves:
  truths:
    - "/users/:username/followers lista los seguidores del usuario obtenidos de GET /users/:username/followers"
    - "/users/:username/following lista a quién sigue el usuario obtenido de GET /users/:username/following"
    - "Cada item de la lista permite seguir/dejar de seguir sin recargar (excepto el propio usuario)"
    - "Las listas usan cursor pagination con botón 'Cargar más' cuando next_cursor no es nulo"
    - "Desde el perfil, los contadores 'Seguidores' y 'Siguiendo' son links a sus respectivas listas"
    - "El componente UserCard es reutilizable entre search, followers y following"
    - "Todos los textos están en español"
  artifacts:
    - path: "frontend/src/components/UserCard.tsx"
      provides: "Card reutilizable de usuario con botón follow/unfollow"
      contains: "Seguir"
    - path: "frontend/src/app/users/[username]/followers/page.tsx"
      provides: "Vista de lista de seguidores"
      contains: "/followers"
    - path: "frontend/src/app/users/[username]/following/page.tsx"
      provides: "Vista de lista de seguidos"
      contains: "/following"
  key_links:
    - from: "frontend/src/app/users/[username]/followers/page.tsx"
      to: "frontend/src/lib/api.ts"
      via: "api.get(`/users/${username}/followers`)"
      pattern: "/followers"
    - from: "frontend/src/app/users/[username]/followers/page.tsx"
      to: "frontend/src/components/UserCard.tsx"
      via: "import UserCard from '@/components/UserCard'"
      pattern: "UserCard"
    - from: "frontend/src/app/users/[username]/page.tsx"
      to: "frontend/src/app/users/[username]/followers/page.tsx"
      via: "Link href={`/users/${username}/followers`}"
      pattern: "/followers"
---

<objective>
Add the followers and following list views, plus a reusable UserCard, and link the profile counters to them.

Purpose: Following the social graph is core to Twitter — seeing who follows a user and who they follow. The backend endpoints (`GET /users/:username/followers` and `/following`) already exist from Phase 2, so this is a frontend-only plan. It also extracts a reusable UserCard so search, followers, and following all share one component.
Output: Two new list pages, a shared UserCard component, and clickable follower/following counters on the profile page.
</objective>

<execution_context>
@AGENTS.md
@backend/src/routes/user.routes.ts
@backend/src/services/userService.ts
@frontend/src/lib/api.ts
@frontend/src/store/authStore.ts
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@AGENTS.md

<interfaces>
<!-- REAL backend contract (verified against Phase 2 code) -->
<!-- These endpoints ALREADY EXIST — this plan is frontend only -->

GET /users/:username/followers?cursor=&limit=20   (auth optional)
  200: { users: UserSummary[], next_cursor: string | null }

GET /users/:username/following?cursor=&limit=20   (auth optional)
  200: { users: UserSummary[], next_cursor: string | null }

UserSummary = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  is_following: boolean
}

POST /follows/:username   (requireAuth) → 201
DELETE /follows/:username (requireAuth) → 200

Note: cursor for these lists is the last user's username (see followService); pass it back verbatim as ?cursor=.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: UserCard reusable component</name>
  <files>frontend/src/components/UserCard.tsx</files>
  <read_first>
    - frontend/src/app/search/page.tsx (Plan 03-03) — existing inline user card markup + follow logic to extract
    - frontend/src/store/authStore.ts — current user id to hide the follow button on self
  </read_first>
  <action>
    Create frontend/src/components/UserCard.tsx as a reusable presentational + interactive card.

    'use client'

    Props:
      interface UserCardProps {
        user: { id: string; username: string; display_name: string | null; bio: string | null; avatar_url: string | null; is_following: boolean }
      }

    Internal state: following (boolean, init from user.is_following), loading (boolean).
    const currentUserId = useAuthStore(s => s.user?.id)
    const isSelf = currentUserId === user.id

    handleFollow(e): e.stopPropagation(); optimistic toggle of `following`; call POST/DELETE /follows/${user.username}; on error rollback.

    JSX:
    - Link wrapper (next/link) to `/users/${user.username}` for the avatar + name area.
    - Avatar circle (first letter of username), display_name (fallback username), @username, bio (truncated).
    - Follow button on the right: hidden when isSelf; text = following ? "Dejar de seguir" : "Seguir"; disabled while loading.

    This component replaces the inline card used by the search page; refactor search to use it in Task 4-note (optional — at minimum it must be used by the new list pages).
    All text in Spanish.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - UserCard renders avatar, display_name, @username, bio
    - Follow/unfollow toggles optimistically; hidden for self
    - Navigates to /users/:username when the name area is clicked
    - tsc passes
  </acceptance_criteria>
  <done>Reusable UserCard with follow toggle and profile link.</done>
</task>

<task type="auto">
  <name>Task 2: Followers list page</name>
  <files>frontend/src/app/users/[username]/followers/page.tsx</files>
  <read_first>
    - frontend/src/components/UserCard.tsx (Task 1)
    - backend/src/routes/user.routes.ts — followers endpoint shape { users, next_cursor }
  </read_first>
  <action>
    Create frontend/src/app/users/[username]/followers/page.tsx:

    'use client'

    Read params.username.
    State: users (UserSummary[]), nextCursor (string | null), loading (boolean).

    fetchPage(cursor?): api.get(`/users/${username}/followers`, { params: { cursor } }) → append users, set nextCursor = res.data.next_cursor.
    On mount: fetchPage().

    JSX:
    - Header: ← back button + title "Seguidores de @{username}"
    - users.map(u => <UserCard key={u.id} user={u} />)
    - If nextCursor: <button onClick={() => fetchPage(nextCursor)}>Cargar más</button>
    - Empty state: "@{username} todavía no tiene seguidores."

    Use the same max-w-xl mx-auto border-x container for consistency. All text in Spanish.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Fetches GET /users/:username/followers and renders UserCards
    - "Cargar más" loads the next cursor page and appends without duplicates
    - Empty state message in Spanish
    - tsc passes
  </acceptance_criteria>
  <done>Followers list page renders paginated followers with follow toggle.</done>
</task>

<task type="auto">
  <name>Task 3: Following list page</name>
  <files>frontend/src/app/users/[username]/following/page.tsx</files>
  <read_first>
    - frontend/src/app/users/[username]/followers/page.tsx (Task 2) — identical structure, different endpoint and copy
  </read_first>
  <action>
    Create frontend/src/app/users/[username]/following/page.tsx — identical to the followers page but:
    - Calls api.get(`/users/${username}/following`)
    - Title: "@{username} sigue a"
    - Empty state: "@{username} todavía no sigue a nadie."

    Reuse UserCard. Keep the same layout/container.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Fetches GET /users/:username/following and renders UserCards
    - Pagination via "Cargar más"
    - Empty state message in Spanish
    - tsc passes
  </acceptance_criteria>
  <done>Following list page renders paginated following with follow toggle.</done>
</task>

<task type="auto">
  <name>Task 4: Link profile counters to the lists</name>
  <files>frontend/src/app/users/[username]/page.tsx</files>
  <read_first>
    - frontend/src/app/users/[username]/page.tsx (from Plan 03-03) — the stats row with followers_count / following_count
  </read_first>
  <action>
    Update the profile page stats row so the follower and following counts are links:

    - "{followers_count} Seguidores" → <Link href={`/users/${username}/followers`}>
    - "{following_count} Siguiendo" → <Link href={`/users/${username}/following`}>
    - Leave "{tweets_count} Tweets" as plain text.

    Add hover:underline styling to the links. Do not change the rest of the profile page.

    Note: Plan 03-03 created the profile page at /users/[id]; this plan and Plan 03-05 standardize on [username] because the backend keys profiles by username (GET /users/:username). If the directory is still [id], rename the dynamic segment folder to [username] and update internal references (params.username). Flag this rename in the SUMMARY.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Followers count links to /users/:username/followers
    - Following count links to /users/:username/following
    - Profile dynamic segment is [username] (renamed from [id] if needed)
    - tsc passes
  </acceptance_criteria>
  <done>Profile counters link to the follower/following lists; route standardized on [username].</done>
</task>

</tasks>

<verification>
- cd frontend && npx tsc --noEmit → exits 0
- Visit /users/<username>/followers → list renders with follow buttons
- Visit /users/<username>/following → list renders
- On a profile, click "Seguidores" → navigates to the followers list
- "Cargar más" appends the next page
</verification>

<success_criteria>
1. UserCard is shared by search, followers, and following pages
2. /users/:username/followers and /users/:username/following render paginated lists
3. Follow/unfollow works from the lists (hidden for self)
4. Profile follower/following counters link to the lists
5. Route standardized on [username]; tsc passes
</success_criteria>

<output>
Create `.planning/phases/03-frontend-ui-core/03-06-SUMMARY.md` when done
</output>

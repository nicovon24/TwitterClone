# Changelog

Entries are moved here from `docs/current.md` when they are older than ~7 days or when the phase is complete. Ordered newest-first.

---

## 2026-06-05 — phase-3-frontend-ui-core

Phase 3 fully executed (6 plans, all TypeScript clean, 8/8 frontend tests passing).

### Shipped

**Wave 1 — Auth (Plan 03-01)**
- `app/login/page.tsx` — login form with Spanish error messages (401 → "Credenciales inválidas")
- `app/register/page.tsx` — register form with client-side validation + 409/400 errors in Spanish
- `app/page.tsx` — auth guard redirecting to /login when unauthenticated

**Wave 2 — Timeline + Layout + Backend gaps (Plans 03-02, 03-03, 03-05)**
- `store/timelineStore.ts` — Zustand store with prependTweet, appendTweets, toggleLike, deleteTweet
- `hooks/useTimelineStream.ts` — SSE hook with exponential-backoff reconnect [1s, 2s, 4s, 8s]
- `components/TweetComposer.tsx` — textarea with 280-char counter, optimistic submit
- `components/TweetCard.tsx` — optimistic like/unlike, owner-only delete, navigable to /tweet/:id
- `components/Timeline.tsx` — IntersectionObserver infinite scroll, cursor pagination
- `hooks/useDebounce.ts` — generic debounce hook
- `app/users/[username]/page.tsx` — user profile with bio, stats, tweet list, follow toggle
- `app/search/page.tsx` — debounced user search with follow/unfollow
- `components/Sidebar.tsx` — desktop nav (hidden md:flex) with logout
- `components/BottomNav.tsx` — mobile nav (flex md:hidden) fixed at bottom
- `app/layout.tsx` — root layout wrapping Sidebar + main + BottomNav
- Backend: `getTweetById` + `GET /tweets/:id` route (404 on missing/deleted)
- Backend: `getUserTweets` + `GET /users/:username/tweets` route (unblocked profile page)
- `app/tweet/[id]/page.tsx` — tweet detail with full timestamp, like/delete, back button

**Wave 3 — Tests + Follow Lists (Plans 03-04, 03-06)**
- `vitest.config.ts` + `__tests__/setup.ts` — Vitest + jsdom + jest-dom + next/navigation mock
- `__tests__/login.test.tsx` — 3 tests: success redirect, 401 error message, form labels
- `__tests__/tweet.test.tsx` — 3 tests: submit+prependTweet, 280-char disabled, empty disabled
- `__tests__/follow.test.tsx` — 2 tests: follow POST+button flip, unfollow DELETE+button flip
- **8/8 tests passing**
- `components/UserCard.tsx` — reusable card with optimistic follow toggle, shared by search/lists
- `app/users/[username]/followers/page.tsx` — paginated followers list
- `app/users/[username]/following/page.tsx` — paginated following list

### Invariants confirmed
- All UI text in Spanish ✅
- Bearer JWT + localStorage (no cookies) per ADR-001 ✅
- `docs/api.md` rewritten to match real backend ✅
- TypeScript: 0 errors backend, 0 errors frontend ✅

<!-- New entries go here -->

---

## 2026-06-05 — ux-pass-dark-mode

### Shipped

**Session persistence fix**
- `backend/src/services/authService.ts` — `refresh()` now returns `{ accessToken, refreshToken }` instead of `{ accessToken }` only. The refresh token is rotated on every use but was never sent back to the client, causing silent logout after the first rotation.
- `frontend/src/lib/api.ts` — 401 interceptor now saves the new `refreshToken` in `localStorage` after a successful refresh call. Session is now truly indefinite while the user is active.

**Seed data expanded**
- `backend/src/db/seed.ts` — expanded from 12 to 50 tweets (10 per user: martina, lucas\_dev, sofia\_g, tomas, valen). Stagger reduced from 7 min to 3 min between tweets. Likes increased from 10 to 25.
- `backend/src/services/tweetService.ts` — default page limit for `getTimeline` reduced from 20 to 10 so infinite scroll is visible with seed data.

**Explore page — all users on mount**
- `backend/src/routes/search.routes.ts` — `q` parameter is now optional (defaults to `''`), removing the `min(1)` validation.
- `backend/src/services/userService.ts` — `searchUsers()` uses `%` pattern when query is empty, returning all users ordered by username.
- `frontend/src/app/search/page.tsx` — fetches all users on mount (before user types anything). Shows section heading "Usuarios" / "Resultados". Each card links to the user's profile page.

**Profile page — button reorganization**
- `frontend/src/app/users/[username]/page.tsx` — own-profile header now shows only "Editar perfil". Logout removed (already in Sidebar). "Eliminar cuenta" moved to a "Zona de peligro" section at the bottom of the edit modal.

**Dark mode — Twitter-style**
- `frontend/tailwind.config.ts` — added `darkMode: 'class'`.
- `frontend/src/store/themeStore.ts` — new Zustand store: `isDark`, `toggle()`, `init()`. Reads/writes `localStorage('theme')`, respects `prefers-color-scheme` on first visit.
- `frontend/src/components/ThemeProvider.tsx` — client component that calls `init()` on mount, wraps the app in `layout.tsx`.
- `frontend/src/components/Sidebar.tsx` — moon/sun toggle button above account chip. Dark classes on bg, hover, text, logo, nav icons, "Postear" button (becomes white bg / dark text in dark mode).
- Dark classes added to: `AppShell.tsx`, `BottomNav.tsx`, `TweetCard.tsx`, `TweetComposer.tsx`, `Skeletons.tsx`, `app/page.tsx`, `app/search/page.tsx`, `app/users/[username]/page.tsx` (header, profile card, follow counts, edit modal, delete modal).

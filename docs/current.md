# Current

## Now — 2026-06-12

Working on: Docker rebuild is healthy after fixing reply schema typing and registering the replies/notifications migration.

## Next

- [ ] Phase 4 — Plan 04-03: GitHub Actions CI/CD → `04-PLAN-cicd.md`

## Blocked / Known issues

- Right sidebar "Qué está pasando" trends are static placeholders (no trends backend yet).
- To apply the 50-tweet seed, the DB volume must be reset: `docker compose down -v && docker compose up --build`.

## Recently shipped

- 2026-06-12 — Fixed Docker backend build by typing the self-referential `tweets.parent_tweet_id` column with `AnyPgColumn`; registered `0002_notifications_and_replies` in Drizzle's migration journal so replies/notifications schema applies before seed.
- 2026-06-09 — Fixed production hydration crash by deferring `AppShell` until client mount and making fallback avatars tolerate missing usernames. Fixed follow state on public profile/follower/following routes with optional auth, and restored Explore's empty-query user listing.
- 2026-06-05 — Timeline tabs now functional: `GET /timeline?feed=for-you|following`. "Para ti" = global feed of all tweets (chronological); "Siguiendo" = only followed accounts (empty if you follow nobody). `getTimeline` takes a `feed` param; home page tabs are clickable and refetch on switch (`Timeline` accepts a `feed` prop). Integration tests updated for the new feed semantics.
- 2026-06-05 — Sidebar account chip split: avatar/name link to own profile; logout is now its own dedicated button (no more accidental logout when tapping the chip).
- 2026-06-05 — Dark mode (Twitter-style): `darkMode: 'class'` in Tailwind, `themeStore.ts` (Zustand, persists in localStorage, respects `prefers-color-scheme`), `ThemeProvider.tsx` init on mount. Toggle button (luna/sol) in Sidebar above account chip. Dark classes added to: AppShell, Sidebar, BottomNav, TweetCard, TweetComposer, Skeletons, home header, search page, profile page and its modals.
- 2026-06-05 — Explore page: `GET /search/users` now accepts empty `q` (returns all users ordered by username, limit 50). Frontend loads all users on mount; typing filters debounced. Each card navigates to `/users/:username`.
- 2026-06-05 — Profile page reorganized: own-profile header shows only "Editar perfil". "Eliminar cuenta" moved to danger zone inside the edit modal. Logout stays in Sidebar account chip (already existed).
- 2026-06-05 — Seed expanded to 50 tweets (10 per user), stagger 3 min, 25 likes. Timeline default page size reduced from 20 to 10 so infinite scroll is visible with seed data.
- 2026-06-05 — Session persistence fix: `POST /auth/refresh` now returns `{ accessToken, refreshToken }` (was only `accessToken`). Frontend interceptor saves the new refresh token in localStorage so the session rotation chain never breaks.
- 2026-06-05 — Image upload in tweets: `POST /uploads/image` (Multer, PNG/JPG, 5 MB max), `image_url` column on tweets table (migration `0001_broken_miracleman.sql`), TweetComposer image picker + preview, TweetCard renders image below content.
- 2026-06-05 — Edit profile + delete account + skeleton loaders + fade-in animation shipped.
- 2026-06-05 — Dev hot-reload, "For you" fallback, demo seed (5 accounts, full follow mesh), UI redesign to X aesthetic — see changelog for full Phase 3 detail.

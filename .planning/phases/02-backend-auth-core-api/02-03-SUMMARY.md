---
phase: 02-backend-auth-core-api
plan: "03"
subsystem: backend-social
tags: [follows, likes, profile, search, drizzle, express]
dependency_graph:
  requires: [02-01-SUMMARY, 02-02-SUMMARY]
  provides: [followService, likeService, userService, follow.routes, like.routes, user.routes, search.routes]
  affects: [tweetService (getFollowerIds for SSE broadcast), app.ts]
tech_stack:
  added: []
  patterns: [cursor-pagination, ILIKE-search, composite-PK-guard, optional-auth]
key_files:
  created:
    - backend/src/services/followService.ts
    - backend/src/services/likeService.ts
    - backend/src/services/userService.ts
    - backend/src/routes/follow.routes.ts
    - backend/src/routes/like.routes.ts
    - backend/src/routes/user.routes.ts
    - backend/src/routes/search.routes.ts
  modified:
    - backend/src/app.ts
decisions:
  - "Cursor pagination on user.id (UUID) for followers/following lists; alphabetical cursor on username for search results"
  - "is_following resolved per-row with individual DB queries — acceptable for paginated lists; can be batched with IN query in a future optimization"
  - "search.routes.ts created as a separate file (not merged into user.routes.ts) to keep route files focused and allow distinct middleware chains"
  - "getTweetOrThrow in likeService checks deleted_at IS NULL so liking a soft-deleted tweet returns 404"
  - "unlikeTweet checks tweet existence without deleted_at filter so users can remove likes on soft-deleted tweets"
metrics:
  duration: ~15min
  completed: "2026-06-04"
  tasks_completed: 4
  files_created: 7
  files_modified: 1
---

# Phase 02 Plan 03: Social Graph, Likes, Profile & Search Summary

Implemented the full social and discovery API surface: follow/unfollow, like/unlike, user profiles with aggregated counts, and prefix search. `getFollowerIds` is exported from `followService` for use by `tweetService`'s SSE broadcast.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | followService | 42b452f | followService.ts |
| 2 | likeService | 42b452f | likeService.ts |
| 3 | userService | 42b452f | userService.ts |
| 4 | Routes + app.ts wiring | 7d719e1 | follow/like/user/search routes, app.ts |

## What Was Built

**followService.ts** — `follow`, `unfollow`, `getFollowers`, `getFollowing`, `getFollowerIds`. Self-follow throws 400; duplicate follow throws 409 (caught from PG error code 23505). Cursor-paginated on user.id.

**likeService.ts** — `likeTweet`, `unlikeTweet`. Both verify tweet existence; likeTweet enforces 409 on duplicate via PG 23505; unlikeTweet enforces 400 if no row deleted. Returns live `likes_count` after each mutation.

**userService.ts** — `getProfile` aggregates follower/following/tweet counts in separate COUNT queries; `is_following` only computed when `requesterId` provided. `searchUsers` uses `ILIKE query%` on both `username` and `display_name` with alphabetical cursor pagination; limit capped at 50 (T-02-13 DoS mitigation).

**Routes** — follow and like routes require auth; user profile/followers/following routes are public (no auth middleware); search requires auth and validates `q` via Zod (min 1 char). All four routers mounted in `app.ts` before `errorHandler`.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-02-11 | `followerId === targetId` check in `follow()` before DB insert |
| T-02-12 | `is_following` always queried from DB, never accepted from client |
| T-02-13 | Zod validates `q` min 1 char; limit capped at 50 |
| T-02-14 | `getProfile` selects only public fields; `password_hash` and `refresh_token_hash` never returned |

## Self-Check

- [x] followService.ts exists and exports `getFollowerIds`
- [x] likeService.ts exists and contains `likes_count`
- [x] userService.ts exists and uses `ILIKE`
- [x] All routers mounted in app.ts (`followRouter`, `likeRouter`, `userRouter`, `searchRouter`)
- [x] `npx tsc --noEmit` passes with zero errors
- [x] Commits 42b452f and 7d719e1 exist

## Self-Check: PASSED

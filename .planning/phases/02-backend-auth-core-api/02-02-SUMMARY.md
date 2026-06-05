---
phase: 02-backend-auth-core-api
plan: "02"
subsystem: backend
tags: [tweets, timeline, sse, cursor-pagination, soft-delete]
dependency_graph:
  requires: [02-01]
  provides: [tweet-crud, timeline-api, sse-stream]
  affects: [backend/src/app.ts]
tech_stack:
  added: []
  patterns: [cursor-pagination, soft-delete, sse-registry, keyset-pagination]
key_files:
  created:
    - backend/src/sse/sseManager.ts
    - backend/src/services/tweetService.ts
    - backend/src/routes/tweet.routes.ts
  modified:
    - backend/src/app.ts
decisions:
  - "Cursor encoded as base64(JSON.stringify({ created_at, id })) for opaque keyset pagination (ADR-003)"
  - "softDeleteTweet sets deleted_at; row is never DELETEd (ADR-006)"
  - "SSE auth via ?token= query param because EventSource cannot send headers"
  - "sseManager uses Map<userId, Set<Response>>; entry deleted when Set is empty to prevent memory leak"
metrics:
  duration: ~15min
  completed: "2026-06-04"
  tasks_completed: 3
  tasks_total: 3
---

# Phase 02 Plan 02: Tweets + Timeline + SSE Summary

Tweet CRUD with soft-delete, cursor-paginated timeline returning only followed-user tweets, and an SSE real-time stream endpoint backed by an in-memory connection registry.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | sseManager — in-memory SSE connection registry | 1e5b43a | backend/src/sse/sseManager.ts |
| 2 | tweetService — createTweet, softDeleteTweet, getTimeline | 220fe82 | backend/src/services/tweetService.ts |
| 3 | tweet router + wire into app.ts | 4f37dd7 | backend/src/routes/tweet.routes.ts, backend/src/app.ts |

## Acceptance Criteria Verification

- tsc --noEmit: passes (no errors)
- sseManager exports addConnection, removeConnection, broadcastToFollowers, startHeartbeat
- removeConnection deletes Map key when Set is empty
- softDeleteTweet sets deleted_at; never issues DELETE (ADR-006)
- softDeleteTweet throws { status: 403 } when requesterId !== tweet.user_id
- getTimeline filters deleted_at IS NULL; returns tweets from followed users only
- Cursor is base64(JSON.stringify({ created_at, id })); decode wrapped in try/catch (T-02-10)
- POST /tweets validates 1–280 chars with Zod; 400 on failure
- GET /timeline/stream authenticates via ?token= JWT verify (T-02-06); 401 on missing/invalid
- SSE connection cleaned up via req.on('close') (T-02-08)

## Deviations from Plan

None — plan executed exactly as written. requireAuth already existed from Plan 2.1 (ran in parallel); no stub needed.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-02-06 | jwt.verify on ?token=; 401 if missing, invalid, or expired |
| T-02-07 | Ownership check before update in softDeleteTweet; 403 if not author |
| T-02-08 | req.on('close') cleanup + Map/Set registry; heartbeat to detect dead connections |
| T-02-09 | getTimeline only queries tweets WHERE user_id IN (followingIds) AND deleted_at IS NULL |
| T-02-10 | decodeCursor wrapped in try/catch; validates shape before use in query |

## Known Stubs

None.

## Threat Flags

None — no new security surface beyond what the plan's threat model covers.

## Self-Check: PASSED

- backend/src/sse/sseManager.ts: EXISTS
- backend/src/services/tweetService.ts: EXISTS
- backend/src/routes/tweet.routes.ts: EXISTS
- Commit 1e5b43a: EXISTS
- Commit 220fe82: EXISTS
- Commit 4f37dd7: EXISTS

# 003 — Pagination: Cursor-Based (no offset)

## Status
Accepted

## Context
The Twitter timeline is a feed with constant updates. Offset-based pagination (`LIMIT 20 OFFSET 40`) is unstable: if new tweets are inserted while the user is scrolling, results shift and tweets appear duplicated or skipped. A strategy was needed that guarantees stable pages regardless of concurrent inserts.

## Decision
- The cursor is an opaque value encoding `(created_at, id)` of the last received tweet.
- Queries use `WHERE (created_at, id) < (cursor_created_at, cursor_id)` with `ORDER BY created_at DESC, id DESC`.
- Each response includes `nextCursor: string | null`. If `null`, there are no more tweets.
- The client sends the cursor as a query param: `GET /timeline?cursor=<value>`.
- Fixed page size: **20 tweets**.

## Consequences

**Advantages:**
- Stable pages even when new tweets are inserted between requests.
- Consistent performance: the query always uses indexes, no costly full scans at high offsets.
- Works naturally with infinite scroll on the frontend.

**Disadvantages:**
- Cannot jump to an arbitrary page (e.g. "go to page 5").
- The cursor must be opaque and must not expose database internals directly.
- Requires a composite index on `(created_at DESC, id DESC)` to be efficient.

## Date
2026-06-04

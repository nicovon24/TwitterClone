# 006 — Database Design: UUIDs, Soft Delete, Composite PKs

## Status
Accepted

## Context
When designing the PostgreSQL schema with Drizzle ORM, several decisions were made about ID types, deletion strategy, and how to enforce uniqueness in many-to-many relationships. Each decision has implications for security, integrity, and performance.

## Decision

### UUIDs instead of serial/autoincrement
All primary keys use `UUID DEFAULT gen_random_uuid()`.

### Soft delete only on tweets
The `tweets` table has a nullable `deleted_at TIMESTAMP` column. A "deleted" tweet has `deleted_at IS NOT NULL`. All queries filter `WHERE deleted_at IS NULL`. Hard DELETE is never used on tweets.

### Composite PKs on follows and likes
- `follows`: PK `(follower_id, following_id)` + CHECK `follower_id <> following_id`
- `likes`: PK `(user_id, tweet_id)`
No separate `id` columns are used on these tables.

### Refresh token storage on users
The `users` table stores `refresh_token_hash` and `refresh_token_expires_at` to support server-side refresh token invalidation on logout (see decision 001).

### ON DELETE CASCADE on foreign keys
Deleting a user removes their tweets, likes, and follows. Deleting a tweet removes its likes.

## Consequences

**UUIDs:**
- Prevent enumeration attacks (consecutive IDs cannot be guessed).
- `gen_random_uuid()` is native in PostgreSQL 13+, no extension required.
- Trade-off: UUIDs are larger than integers (16 bytes vs 4), indexes are slightly heavier.

**Soft delete:**
- Preserves referential integrity for likes and future features (retweets, replies).
- Allows audit trails and content recovery if needed.
- Trade-off: All queries must explicitly include `WHERE deleted_at IS NULL`.

**Composite PKs:**
- Uniqueness guaranteed at the DB level — no duplicates even if application code fails.
- No unnecessary extra `id` column on join tables.
- Trade-off: Both columns are needed to look up a row by PK.

## Date
2026-06-04

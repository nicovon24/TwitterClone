# Database Design

Stack: PostgreSQL · Drizzle ORM · UUID primary keys

---

## Tables

### users

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `username` | VARCHAR(50) | UNIQUE NOT NULL |
| `email` | VARCHAR(255) | UNIQUE NOT NULL |
| `password_hash` | TEXT | NOT NULL |
| `display_name` | VARCHAR(100) | |
| `bio` | VARCHAR(160) | |
| `avatar_url` | TEXT | |
| `refresh_token_hash` | TEXT | nullable — hashed refresh token for server-side invalidation |
| `refresh_token_expires_at` | TIMESTAMP | nullable — max 30 days from last login |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT now() |

---

### tweets

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `user_id` | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE |
| `content` | VARCHAR(280) | NOT NULL |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() |
| `deleted_at` | TIMESTAMP | nullable — soft delete marker |

---

### follows

| Column | Type | Constraints |
|---|---|---|
| `follower_id` | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE |
| `following_id` | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE |

- PRIMARY KEY `(follower_id, following_id)`
- CHECK `follower_id <> following_id` — no auto-follows

---

### likes

| Column | Type | Constraints |
|---|---|---|
| `user_id` | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE |
| `tweet_id` | UUID | NOT NULL, REFERENCES tweets(id) ON DELETE CASCADE |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() |

- PRIMARY KEY `(user_id, tweet_id)` — one like per user per tweet

---

## Entity Relationship Diagram

```
users
  ├── tweets       (1 user → N tweets)      via tweets.user_id
  ├── likes        (N users ↔ N tweets)     via likes.user_id / likes.tweet_id
  ├── follows [follower]   (1 user → N following)  via follows.follower_id
  └── follows [following]  (1 user → N followers)  via follows.following_id

tweets
  └── likes        (1 tweet → N likes)      via likes.tweet_id
```

---

## Indexes

| Index | Purpose |
|---|---|
| `tweets(user_id, created_at DESC)` | Profile timeline — tweets by a specific user sorted newest first |
| `tweets(created_at DESC)` WHERE `deleted_at IS NULL` | Global feed with cursor-based pagination |
| `follows(following_id)` | Count and list followers of a user |
| `users(username)` | User search by username (case-insensitive via LOWER() if needed) |

---

## Design Decisions

**UUIDs over serial integers**
Prevents enumeration attacks on user and tweet IDs. `gen_random_uuid()` is native in PostgreSQL 13+.

**Soft delete on tweets**
`deleted_at` timestamp instead of hard DELETE. Preserves referential integrity for likes/retweets and allows audit trails. Queries always filter `WHERE deleted_at IS NULL`.

**Composite primary keys on follows and likes**
Enforces uniqueness at the database level — one follow per pair, one like per (user, tweet). No extra UNIQUE constraint needed.

**Cursor-based pagination**
Timeline uses an opaque cursor encoding `(created_at, id)` to ensure stable pages even when new tweets are inserted. Never use OFFSET (see ADR-003).

**ON DELETE CASCADE**
Deleting a user removes their tweets, likes, and follow relationships automatically. Deleting a tweet removes its likes.

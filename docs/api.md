# API Reference

Base URL: `http://localhost:4000` (no path prefix)

## Authentication

This API uses **JWT bearer tokens stored in `localStorage`** (see ADR-001). There are **no cookies**.

- Access token (15 min) is sent on every request via the header:
  `Authorization: Bearer <accessToken>`
- Refresh token (30 days) is sent only to `POST /auth/refresh` in the request body.
- The frontend Axios interceptor adds the header automatically and silently refreshes on 401.
- **Exception:** the SSE endpoint (`GET /timeline/stream`) takes the access token via the
  `?token=` query param, because the browser `EventSource` API cannot send custom headers.

All request bodies must be `Content-Type: application/json`.

The canonical `user` object returned by auth endpoints:
```json
{
  "id": "uuid",
  "username": "nick",
  "email": "nick@example.com",
  "display_name": "Nick",
  "bio": null,
  "avatar_url": null
}
```

> All resource IDs are UUID strings.

---

## Auth

### POST /auth/register
Register a new user.

**Auth required:** No

**Body:**
```json
{
  "username": "string (3–20 chars, alphanumeric + underscores)",
  "email": "string (valid email)",
  "password": "string (min 8 chars)"
}
```

**Response 201:**
```json
{
  "accessToken": "string (JWT, 15m)",
  "refreshToken": "string (JWT, 30d)",
  "user": { "id": "uuid", "username": "nick", "email": "nick@example.com", "display_name": null, "bio": null, "avatar_url": null }
}
```

**Errors:** 400 (validation), 409 (username or email already taken)

---

### POST /auth/login
Login with email and password.

**Auth required:** No

**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response 200:**
```json
{
  "accessToken": "string (JWT, 15m)",
  "refreshToken": "string (JWT, 30d)",
  "user": { "id": "uuid", "username": "nick", "email": "nick@example.com", "display_name": null, "bio": null, "avatar_url": null }
}
```

**Errors:** 400 (validation), 401 (invalid credentials — same message for wrong email or password)

---

### POST /auth/refresh
Exchange a valid refresh token for a new access token (rotates the refresh token server-side).

**Auth required:** No (refresh token in body)

**Body:**
```json
{ "refreshToken": "string" }
```

**Response 200:**
```json
{
  "accessToken": "string (JWT, 15m)",
  "refreshToken": "string (JWT, 30d)"
}
```

The refresh token is rotated on every call — both the old and new tokens are stored server-side and the new one must be persisted by the client.

**Errors:** 400 (validation), 401 (invalid or expired refresh token)

---

### POST /auth/logout
Invalidate the stored refresh token for the current user.

**Auth required:** Yes

**Response 200:**
```json
{ "message": "Logged out" }
```

---

### GET /auth/me
Get the authenticated user's profile.

**Auth required:** Yes

**Response 200:**
```json
{
  "id": "uuid",
  "username": "nick",
  "email": "nick@example.com",
  "display_name": "string or null",
  "bio": "string or null",
  "avatar_url": "string or null"
}
```

**Errors:** 401 (no token or expired)

---

## Users

Profiles are keyed by **`username`** (not numeric id).

### GET /users/:username
Get a user's public profile.

**Auth required:** No (when called with a valid token, `is_following` reflects the requester)

**Response 200:**
```json
{
  "id": "uuid",
  "username": "nick",
  "display_name": "string or null",
  "bio": "string or null",
  "avatar_url": "string or null",
  "followers_count": 12,
  "following_count": 5,
  "tweets_count": 30,
  "is_following": true
}
```

`is_following` is `false` when called without auth.

**Errors:** 404 (user not found)

---

### GET /users/:username/tweets
List a user's own tweets (newest first), excluding soft-deleted ones.

**Auth required:** No (when authed, `liked_by_me` reflects the requester)

**Query params:** `cursor` (opaque, from previous `next_cursor`), `limit` (default 20, max 50)

**Response 200:**
```json
{
  "tweets": [
    {
      "id": "uuid",
      "content": "Hello world",
      "created_at": "2026-06-04T12:00:00Z",
      "user": { "id": "uuid", "username": "nick", "avatar_url": null },
      "likes_count": 5,
      "liked_by_me": true
    }
  ],
  "next_cursor": "opaque-string-or-null"
}
```

**Errors:** 404 (user not found)

---

### GET /users/:username/followers
List a user's followers.

**Auth required:** No

**Query params:** `cursor` (optional, last username), `limit` (default 20)

**Response 200:**
```json
{
  "users": [{ "id": "uuid", "username": "jane", "display_name": null, "bio": null, "avatar_url": null, "is_following": false }],
  "next_cursor": "jane"
}
```

`next_cursor` is `null` when there are no more results.

---

### GET /users/:username/following
List users that a user follows.

**Auth required:** No

**Query params:** `cursor`, `limit`

**Response 200:** Same shape as `/followers`

---

### PATCH /users/me
Update the authenticated user's profile.

**Auth required:** Yes

**Body (all fields optional):**
```json
{
  "display_name": "string (max 100) or null",
  "bio": "string (max 160) or null",
  "avatar_url": "string (valid URL) or null"
}
```

**Response 200:** updated public user object (same shape as `GET /users/:username` minus counts).

**Errors:** 400 (validation), 401

---

### DELETE /users/me
Permanently delete the authenticated user's account. Cascades to their tweets, follows, and likes.

**Auth required:** Yes

**Response 200:**
```json
{ "message": "Account deleted" }
```

**Errors:** 401

---

## Tweets

The canonical `tweet` object:
```json
{
  "id": "uuid",
  "content": "Hello world",
  "image_url": "string or null",
  "created_at": "2026-06-04T12:00:00Z",
  "user": { "id": "uuid", "username": "nick", "display_name": "Nick" , "avatar_url": null },
  "likes_count": 0,
  "liked_by_me": false
}
```

### POST /tweets
Create a tweet.

**Auth required:** Yes

**Body:**
```json
{
  "content": "string (1–280 chars)",
  "image_url": "string (valid URL) or null — optional"
}
```

**Response 201:** the created `tweet` object (see above).

**Errors:** 400 (validation — empty or over 280 chars), 401

---

### GET /tweets/:id
Fetch a single tweet by id.

**Auth required:** Yes

**Response 200:** a `tweet` object.

**Errors:** 401, 404 (not found or soft-deleted)

---

### DELETE /tweets/:id
Soft-delete a tweet (sets `deleted_at`). Only the tweet's author can delete it.

**Auth required:** Yes

**Response 200:**
```json
{ "message": "Tweet deleted" }
```

**Errors:** 401, 403 (not the author), 404

---

### GET /timeline
Fetch the authenticated user's timeline, sorted chronologically descending. Normally returns tweets from followed users. **"For you" fallback:** if the user follows nobody, it returns recent tweets from everyone so the home feed is never empty.

**Auth required:** Yes

**Query params:**
- `cursor` — opaque cursor from previous page's `next_cursor` (omit for first page)
- `limit` — default 10, max 50

**Response 200:**
```json
{
  "tweets": [
    {
      "id": "uuid",
      "content": "Hello world",
      "created_at": "2026-06-04T12:00:00Z",
      "user": { "id": "uuid", "username": "nick", "avatar_url": null },
      "likes_count": 5,
      "liked_by_me": true
    }
  ],
  "next_cursor": "opaque-string-or-null"
}
```

`next_cursor` is `null` when there are no more tweets. When the user follows no one, the response contains recent tweets from all users ("For you" fallback) instead of an empty array.

**Errors:** 400 (invalid cursor), 401

---

## Follows

### POST /follows/:username
Follow a user.

**Auth required:** Yes

**Response 201:**
```json
{ "message": "Now following nick" }
```

**Errors:** 400 (cannot follow yourself), 409 (already following), 404

---

### DELETE /follows/:username
Unfollow a user.

**Auth required:** Yes

**Response 200:**
```json
{ "message": "Unfollowed nick" }
```

**Errors:** 400 (not following), 404

---

## Likes

### POST /likes/:tweetId
Like a tweet.

**Auth required:** Yes

**Response 201:**
```json
{ "message": "Tweet liked", "likes_count": 6 }
```

**Errors:** 409 (already liked), 404

---

### DELETE /likes/:tweetId
Unlike a tweet.

**Auth required:** Yes

**Response 200:**
```json
{ "message": "Tweet unliked", "likes_count": 5 }
```

**Errors:** 400 (not liked), 404

---

## Search

### GET /search/users
Search users by username or display name (case-insensitive prefix match). When `q` is omitted or empty, returns **all users** ordered by username.

**Auth required:** Yes

**Query params:**
- `q` — search string (optional; empty = all users)
- `cursor`, `limit` — pagination (default 20, max 50)

**Response 200:**
```json
{
  "users": [{ "id": "uuid", "username": "jane", "display_name": null, "bio": null, "avatar_url": null, "is_following": false }],
  "next_cursor": null
}
```

---

## Uploads

### POST /uploads/image
Upload an image to attach to a tweet.

**Auth required:** Yes

**Body:** `multipart/form-data` with a single field `image` (PNG or JPG, max 5 MB).

**Response 200:**
```json
{ "url": "http://localhost:4000/uploads/filename-uuid.jpg" }
```

Pass the returned `url` as `image_url` when creating a tweet.

**Errors:** 400 (wrong file type or missing field), 413 (file too large), 401

---

## Real-time (SSE)

### GET /timeline/stream
Open a Server-Sent Events connection. The server pushes new tweets from followed users in real time.

**Auth required:** Yes — token via query param `?token=<accessToken>` (`EventSource` cannot send custom headers).

**Event format:**
```
event: new_tweet
data: {"id":"uuid","content":"Hello","created_at":"...","user":{...},"likes_count":0,"liked_by_me":false}
```

**Connection:** Keep-alive with periodic heartbeat. Client reconnects automatically via `EventSource` built-in retry (frontend adds exponential backoff).

**Errors:** 401 (missing or invalid token)

---

## Error Response Format

All errors return:
```json
{
  "error": "Human-readable message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (authenticated but not authorized) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 500 | Internal server error |

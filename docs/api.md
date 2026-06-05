# API Reference

Base URL: `http://localhost:4000/api`

All authenticated endpoints require a valid JWT. The token can be sent via:
- `Authorization: Bearer <token>` header, OR
- `token` httpOnly cookie (set automatically on login/register)

All request bodies must be `Content-Type: application/json`.

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
  "token": "string",
  "user": { "id": 1, "username": "nick", "email": "nick@example.com", "bio": null, "avatar_url": null }
}
```

Sets `token` httpOnly cookie.

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
  "token": "string",
  "user": { "id": 1, "username": "nick", "email": "nick@example.com", "bio": null, "avatar_url": null }
}
```

Sets `token` httpOnly cookie.

**Errors:** 400 (validation), 401 (invalid credentials)

---

### POST /auth/logout
Clear the auth cookie.

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
  "id": 1,
  "username": "nick",
  "email": "nick@example.com",
  "bio": "string or null",
  "avatar_url": "string or null"
}
```

**Errors:** 401 (no token or expired)

---

## Users

### GET /users/:username
Get a user's public profile.

**Auth required:** No

**Response 200:**
```json
{
  "id": 1,
  "username": "nick",
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

### GET /users/:username/followers
List a user's followers.

**Auth required:** No

**Query params:** `cursor` (optional, last user id), `limit` (default 20)

**Response 200:**
```json
{
  "users": [{ "id": 2, "username": "jane", "bio": null, "avatar_url": null, "is_following": false }],
  "next_cursor": 2
}
```

---

### GET /users/:username/following
List users that a user follows.

**Auth required:** No

**Query params:** `cursor`, `limit`

**Response 200:** Same shape as `/followers`

---

## Tweets

### POST /tweets
Create a tweet.

**Auth required:** Yes

**Body:**
```json
{
  "content": "string (1–280 chars)"
}
```

**Response 201:**
```json
{
  "id": 42,
  "content": "Hello world",
  "created_at": "2026-06-04T12:00:00Z",
  "user": { "id": 1, "username": "nick", "avatar_url": null },
  "likes_count": 0,
  "liked_by_me": false
}
```

**Errors:** 400 (validation — empty or over 280 chars), 401

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
Fetch the authenticated user's timeline (tweets from followed users), sorted chronologically descending.

**Auth required:** Yes

**Query params:**
- `cursor` — last tweet id from previous page (omit for first page)
- `limit` — default 20, max 50

**Response 200:**
```json
{
  "tweets": [
    {
      "id": 42,
      "content": "Hello world",
      "created_at": "2026-06-04T12:00:00Z",
      "user": { "id": 1, "username": "nick", "avatar_url": null },
      "likes_count": 5,
      "liked_by_me": true
    }
  ],
  "next_cursor": 20
}
```

`next_cursor` is `null` when there are no more tweets.

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
Search users by username or display name.

**Auth required:** Yes

**Query params:**
- `q` — search string (min 1 char)
- `cursor`, `limit` — pagination

**Response 200:**
```json
{
  "users": [{ "id": 2, "username": "jane", "bio": null, "avatar_url": null, "is_following": false }],
  "next_cursor": null
}
```

---

## Real-time (SSE)

### GET /timeline/stream
Open a Server-Sent Events connection. The server pushes new tweets from followed users in real time.

**Auth required:** Yes (token via query param `?token=` or cookie — `EventSource` does not support custom headers)

**Event format:**
```
event: new_tweet
data: {"id":42,"content":"Hello","created_at":"...","user":{...},"likes_count":0,"liked_by_me":false}
```

**Connection:** Keep-alive. Client reconnects automatically via `EventSource` built-in retry.

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

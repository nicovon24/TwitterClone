# Testing Strategy

## Coverage Targets

| Layer | Target | Tool |
|-------|--------|------|
| Backend | ≥ 80% line coverage | Vitest + Supertest |
| Frontend | Key user flows covered | Vitest + Testing Library |
| E2E | Auth + main happy path | Playwright |

---

## Backend Integration Tests

Framework: **Vitest** + **Supertest**
Environment: real PostgreSQL database (test DB, wiped between test suites)
Location: `backend/src/__tests__/integration/`

Each suite spins up the Express app and hits real HTTP endpoints against a real DB. No mocks.

### Suites

#### `auth.integration.test.ts`
- POST /auth/register — success, duplicate username, duplicate email, invalid email, short password
- POST /auth/login — success, wrong password, unknown email
- GET /auth/me — with valid token, without token, with expired token
- POST /auth/logout — clears cookie

#### `tweets.integration.test.ts`
- POST /tweets — success, empty content, content over 280 chars, no auth
- DELETE /tweets/:id — success, not the author (403), tweet not found (404)
- GET /timeline — returns tweets from followed users only, in chronological order, cursor pagination works

#### `follows.integration.test.ts`
- POST /follows/:username — success, cannot follow yourself, already following, user not found
- DELETE /follows/:username — success, not currently following, user not found
- GET /users/:username/followers — returns correct list
- GET /users/:username/following — returns correct list

#### `likes.integration.test.ts`
- POST /likes/:tweetId — success, already liked (409), tweet not found
- DELETE /likes/:tweetId — success, not liked (400), tweet not found
- likes_count increments and decrements correctly

#### `timeline.integration.test.ts`
- Timeline only includes tweets from followed users (not own tweets, not from non-followed users)
- Tweets are ordered by created_at DESC
- Cursor pagination: second page starts after cursor, no overlaps
- next_cursor is null on last page
- Soft-deleted tweets do not appear

#### `search.integration.test.ts`
- GET /search/users?q= — matches by username prefix
- Matches by partial username
- Case-insensitive search
- Returns empty array when no match
- Returns is_following flag correctly

---

## Running Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run a specific suite
npm test -- auth
```

Coverage report is generated in `backend/coverage/`. The challenge requires ≥ 80%.

---

## Frontend Integration Tests

Framework: **Vitest** + **@testing-library/react**
Environment: jsdom
Location: `frontend/src/__tests__/`

These tests render components and simulate user interactions. They mock the API layer (Axios) but test the full React component tree.

### Flows

#### `login.test.tsx`
- Renders login form
- Submit with valid credentials → calls POST /auth/login, redirects to timeline
- Submit with empty fields → shows validation error
- Submit with wrong credentials → shows error toast

#### `tweet.test.tsx`
- Renders tweet composer
- Type 280 chars → counter shows 0 remaining
- Type 281 chars → cannot submit, counter shows negative
- Submit valid tweet → calls POST /tweets, tweet appears in list
- Delete own tweet → calls DELETE /tweets/:id, tweet removed from list

#### `follow.test.tsx`
- Renders user profile with follow button
- Click Follow → calls POST /follows/:username, button changes to "Following"
- Click Unfollow → calls DELETE /follows/:username, button reverts

---

## Running Frontend Tests

```bash
cd frontend
npm test
```

---

## E2E Tests (Playwright)

Location: `global-tests/`
Target: running app (requires Docker Compose stack up)

### `happy-path.spec.ts` @smoke

```
1. Register new user (email, username, password)
2. Redirected to timeline
3. Compose and submit a tweet
4. Tweet appears in timeline
5. Navigate to search
6. Search for seed user
7. Click Follow on seed user
8. Navigate back to timeline
9. Seed user's tweets appear
10. Logout → redirected to login
```

### Running E2E

```bash
# From repo root (requires app running)
docker compose up -d
npm run test:e2e
```

---

## Test DB Setup

The backend test suite uses a separate database to avoid polluting development data.

```bash
# Set in backend/.env.test
DATABASE_URL=postgres://twitter:twitter@localhost:5432/twitterclone_test
```

Each integration test file:
1. Runs migrations on the test DB before the suite
2. Clears all data between tests (`beforeEach`)
3. Inserts only what the test needs

---

## What Good Tests Look Like

- Tests validate **behavior**, not implementation
- Test the HTTP response (status code + JSON shape), not internal functions
- Each test is independent — no test depends on another test's side effects
- Failure messages are readable enough to diagnose without reading the test body
- No empty tests, no tests that always pass regardless of the code

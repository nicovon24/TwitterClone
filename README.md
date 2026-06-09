# ClonTwitter — TheFlock Challenge

A full-stack Twitter/X clone built with Express + Drizzle (backend) and Next.js 14 + Tailwind (frontend), wired together with Docker Compose.

---

## Features

### Authentication
- [x] User registration (username, email, password) with Zod validation
- [x] Login / logout
- [x] JWT access token (15 min) + refresh token (30 days) stored in localStorage
- [x] Automatic silent token refresh on 401 (Axios interceptor)
- [x] Protected routes via `requireAuth` middleware

### Tweets
- [x] Create tweets (max 280 chars, live character counter)
- [x] Attach a PNG or JPG image to a tweet (uploaded via `POST /uploads/image`)
- [x] Soft delete own tweets (`deleted_at`, never hard delete)
- [x] Individual tweet detail view (`/tweet/:id`)
- [x] Like / unlike tweets with optimistic UI updates

### Timeline
- [x] Home feed with tweets from followed users ("Siguiendo" tab)
- [x] "Para ti" tab — global reverse-chronological feed (useful for new accounts)
- [x] Cursor-based pagination (no offset)
- [x] Infinite scroll via IntersectionObserver
- [x] Real-time new tweets via Server-Sent Events (SSE)
- [x] SSE auto-reconnect with exponential backoff

### Social Graph
- [x] Follow / unfollow users (one follow per pair, enforced at DB level)
- [x] Followers list view (`/users/:username/followers`)
- [x] Following list view (`/users/:username/following`)
- [x] Follow counts shown on profiles

### Profiles & Search
- [x] User profile page with bio, avatar, and follower/following/tweet counts
- [x] Edit profile (display name and bio) from own profile page
- [x] Delete account with confirmation dialog
- [x] List of a user's own tweets (paginated)
- [x] User search by username/display name (case-insensitive, debounced input)

### UI / UX
- [x] Fully responsive: desktop sidebar + mobile bottom nav
- [x] All UI text in Spanish (Argentine/Spanish-speaking target)
- [x] Built with Tailwind, no external UI library
- [x] Dark mode (class-based, persists in localStorage, respects `prefers-color-scheme`)
- [x] Skeleton loaders on timeline, profile, and search
- [x] Smooth fade-in animation on new tweets

### Infrastructure & Quality
- [x] One-command startup with Docker Compose (postgres + backend + frontend)
- [x] Idempotent seed data (10 demo accounts, 100 tweets, 50 follows, 50 likes)
- [x] Backend integration tests against real PostgreSQL (Vitest + Supertest)
- [x] Frontend unit tests (Vitest + Testing Library)

### Bonus features implemented
- [x] **Real-time updates** — SSE push from backend on tweet creation
- [x] **Image upload** — PNG/JPG attached to tweets (Multer, 5 MB max)
- [x] **Docker Compose** — full stack with one command

---

## Prerequisites

- [Node.js 20 LTS](https://nodejs.org/)
- [Docker](https://www.docker.com/) + [Docker Compose](https://docs.docker.com/compose/) (v2+)

---

## Quick Start

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Start all services (PostgreSQL + backend + frontend)
docker compose up --build
```

All three services start automatically. The backend waits for PostgreSQL to be healthy, then runs migrations and seeds demo data automatically on first boot.

> This default mode builds production images (`next build` / `tsc`). Code changes require a rebuild. For live development, use the hot-reload mode below.

---

## Development (hot reload)

For day-to-day development you don't want to rebuild the image on every change. Use the dev overlay, which mounts your source code and runs the dev servers (`next dev` + `tsx watch`):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Now edits under `backend/src/` and `frontend/src/` reload automatically — no rebuild needed. Stop with `Ctrl+C` (or `docker compose down`).

**Alternative — run apps directly on your machine** (fastest reload, only Postgres in Docker):

```bash
# 1. Start just the database
docker compose up -d postgres

# 2. Backend (uses localhost instead of the "postgres" host)
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev

# 3. Frontend (in a second terminal)
cd frontend
npm install
npm run dev
```

---

## Accessing the App

| Service  | URL                     | Description              |
|----------|-------------------------|--------------------------|
| Frontend | http://localhost:3000   | Next.js web application  |
| Backend  | http://localhost:4000   | Express REST API         |
| Postgres | localhost:5432          | PostgreSQL 16 database   |

---

## Seed Data

On first run, the backend runs an idempotent seed automatically. It creates **10 demo accounts**, **100 tweets** (10 per user), **50 follows** (each user follows 5 others), and **50 likes** distributed across tweets.

### Demo accounts

All demo accounts share the password **`password123`**. Log in with any of these emails:

| Email                       | Username      | Display name      |
|-----------------------------|---------------|-------------------|
| `martina@clontwitter.dev`   | `martina`     | Martina Rossi     |
| `lucas@clontwitter.dev`     | `lucas_dev`   | Lucas Fernández   |
| `sofia@clontwitter.dev`     | `sofia_g`     | Sofía González    |
| `tomas@clontwitter.dev`     | `tomas`       | Tomás Pérez       |
| `valen@clontwitter.dev`     | `valen`       | Valentina Díaz    |
| `nico@clontwitter.dev`      | `nico_photo`  | Nicolás Vargas    |
| `caro@clontwitter.dev`      | `caro_reads`  | Carolina López    |
| `mateo@clontwitter.dev`     | `mateo_ux`    | Mateo Herrera     |
| `juli@clontwitter.dev`      | `juli_runs`   | Julieta Moreno    |
| `pablo@clontwitter.dev`     | `pablito_ml`  | Pablo Castillo    |

To run the seed manually:

```bash
docker compose exec backend npm run db:seed
```

The seed is idempotent: it checks for the sentinel account (`martina`) and skips if the demo data is already present. To re-seed from scratch: `docker compose down -v && docker compose up --build`.

---

## Running Migrations Manually

Migrations run automatically on `docker compose up`. If you need to run them manually:

```bash
# With Docker
docker compose exec backend npm run db:migrate

# Without Docker (local dev)
cd backend && npm run db:migrate
```

---

## Running Tests

```bash
# Backend integration tests (runs against real PostgreSQL)
cd backend && npm test

# Backend test coverage report
cd backend && npm run test:coverage

# Frontend unit tests
cd frontend && npm test
```

---

## Environment Variables

| Variable               | Description                              | Example                                          |
|------------------------|------------------------------------------|--------------------------------------------------|
| `DATABASE_URL`         | PostgreSQL connection string             | `postgres://postgres:postgres@postgres:5432/clontwitter` |
| `JWT_SECRET`           | Secret for signing access tokens (15m)   | `change-me-access-secret`                        |
| `REFRESH_TOKEN_SECRET` | Secret for signing refresh tokens (30d)  | `change-me-refresh-secret`                       |
| `PORT`                 | Backend port                             | `4000`                                           |
| `NODE_ENV`             | Environment mode                         | `development`                                    |
| `NEXT_PUBLIC_API_URL`  | Backend URL consumed by the frontend     | `http://localhost:4000`                          |

See `.env.example` for a complete template.

---

## Ports

| Service  | Port  |
|----------|-------|
| Frontend | 3000  |
| Backend  | 4000  |
| Postgres | 5432  |

---

## Technical Decisions

### Why this stack?

**Backend: Node.js + Express + TypeScript**
Express is minimal, predictable, and fast to iterate — ideal for a challenge scope. TypeScript adds safety without ceremony. The alternative (NestJS) would add useful structure for a large team but slows down solo iteration.

**ORM: Drizzle**
Type-safe SQL without runtime magic. Drizzle generates real SQL you can read and debug. Migrations via `drizzle-kit` are explicit (SQL files checked into the repo). Prisma was the main alternative but adds a binary query engine and more abstraction than needed here.

**Database: PostgreSQL**
The challenge's preferred option. Relational integrity enforces the one-follow-per-pair and one-like-per-pair constraints at the DB level (composite primary keys), not just in application code. ACID transactions prevent race conditions on follow/like operations.

**Frontend: Next.js 14 App Router + Tailwind**
Next.js gives file-based routing and SSR capability. Tailwind avoids component-library lock-in and makes responsive design fast. All components are `'use client'` — SSR is used for routing, not for data fetching (the API is a separate service).

**State management: Zustand**
Lightweight, no boilerplate. The auth state and timeline state are simple enough that a full Redux setup would be overkill.

---

### How the timeline works

The timeline query joins `tweets` with `follows` to find all tweets from users that the requester follows, filters out soft-deleted tweets, and orders by `created_at DESC`.

**Pagination:** cursor-based — the cursor is the `id` of the last tweet in the current page. The next query adds `WHERE tweets.id < :cursor`. This avoids the duplicates/gaps that offset pagination produces when new tweets are inserted mid-scroll.

**"For you" tab:** when the user follows nobody (new account), the `follows` join would return nothing. Instead of an empty screen, the backend drops the join filter and returns a global reverse-chronological feed — same pagination, same cursor, just no follower constraint.

**Real-time:** after every successful `POST /tweets`, the backend pushes the new tweet payload over SSE to all active SSE connections belonging to the author's followers. The frontend `useTimelineStream` hook listens on `EventSource` and prepends the tweet to the Zustand store.

---

### How authentication works

Custom JWT implementation — no third-party auth services.

On login/register the backend:
1. Issues a short-lived **access token** (15 min, `JWT_SECRET`)
2. Issues a long-lived **refresh token** (30 days, `REFRESH_TOKEN_SECRET`), stores its bcrypt hash in the `users` table

Both tokens are returned in the response body. The frontend stores them in `localStorage` and sends the access token as `Authorization: Bearer <token>` on every API request via an Axios interceptor.

On 401, the interceptor automatically calls `POST /auth/refresh` with the stored refresh token. If valid, the backend issues a new access token **and rotates the refresh token** (new token stored in DB, old hash invalidated). This limits damage from stolen refresh tokens to a single use.

**Trade-off acknowledged:** `localStorage` is readable by JavaScript (XSS risk). The alternative is `httpOnly` cookies, which would require same-origin deployment or carefully configured CORS + `withCredentials`. For this challenge scope, localStorage was chosen for simplicity; this is documented as a known limitation.

---

### Social graph model

Follows are stored in a `follows` table with a composite primary key `(follower_id, following_id)` and a `CHECK` constraint that prevents self-follows. This enforces uniqueness at the database level — no application-level deduplication needed. The `UNIQUE` index also makes follower/following count queries fast.

Likes use the same pattern: composite PK `(user_id, tweet_id)` on the `likes` table.

---

### Known limitations and trade-offs

- **No reply threads** — tweets are flat, no `parent_id`. Adding replies would require a self-referential FK and recursive timeline queries.
- **No notifications** — the bonus was not implemented. The SSE infrastructure could be extended to push notification events.
- **No algorithmic ranking** — the "For you" feed is reverse-chronological, not ML-ranked.
- **localStorage for tokens** — see auth section above.
- **No E2E browser tests** — integration tests cover all API endpoints against a real PostgreSQL instance. Browser-level E2E (Playwright) was planned but not completed within the time budget.
- **Image storage** — uploaded images are stored on the local filesystem (`backend/uploads/`). In production this should be replaced with object storage (S3, Cloudflare R2).

---

### AI tools used

This project was built end-to-end using **Cursor** with agentic coding (Claude Sonnet). The AI was used to:

- Draft and iterate on the schema design and ADRs before writing any code
- Scaffold boilerplate (Express routes, Drizzle schema, Next.js pages) from a spec
- Write integration tests alongside each feature (not as an afterthought)
- Debug issues (hydration errors, pagination edge cases, SSE reconnect logic)
- Review code for correctness and consistency

The workflow followed a SPEC → PLAN → CODE → REVIEW loop: every non-trivial change started with a written spec (in `docs/`), the AI produced a plan, then code, then a review pass. This kept scope creep low and commit messages meaningful.

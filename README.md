# ClonTwitter — TheFlock Challenge

A full-stack Twitter/X clone built with Express + Drizzle (backend) and Next.js 14 + Tailwind (frontend), wired together with Docker Compose.

---

## Features

### Authentication
- [x] User registration (username, email, password) with Zod validation
- [x] Login / logout
- [x] JWT access token (15 min) + refresh token (30 days)
- [x] Automatic silent token refresh on 401 (Axios interceptor)
- [x] Protected routes via `requireAuth` middleware

### Tweets
- [x] Create tweets (max 280 chars, live character counter)
- [x] Attach a PNG or JPG image to a tweet (uploaded via `POST /uploads/image`)
- [x] Soft delete own tweets (`deleted_at`, never hard delete)
- [x] Individual tweet detail view (`/tweet/:id`)
- [x] Like / unlike tweets with optimistic UI updates

### Timeline
- [x] Home feed with tweets from followed users
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
- [x] Logout button on own profile page
- [x] List of a user's own tweets (paginated)
- [x] User search by username/display name (case-insensitive, debounced input)

### UI / UX
- [x] Fully responsive: desktop sidebar + mobile bottom nav
- [x] All UI text in Spanish (Argentine/Spanish-speaking target)
- [x] Built with Tailwind, no external UI library
- [x] Skeleton loaders on timeline, profile, and search (no "Cargando..." flash)
- [x] Smooth fade-in animation on new tweets

### Infrastructure & Quality
- [x] One-command startup with Docker Compose (postgres + backend + frontend)
- [x] Idempotent seed data (5 demo accounts, 12 tweets, 20 follows, 10 likes)
- [x] Backend integration tests against real PostgreSQL (Vitest + Supertest)
- [x] Frontend unit tests (Vitest + Testing Library)
- [x] End-to-end happy-path test (Playwright `@smoke`)
- [x] CI/CD: PR gate (lint + typecheck + tests) and main-merge E2E pipeline (GitHub Actions)

> All features are tracked through the GSD phase plans in `.planning/phases/`.

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

All three services start automatically. The backend waits for PostgreSQL to be healthy before running migrations.

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
# .env: DATABASE_URL=postgres://postgres:postgres@localhost:5432/clontwitter (+ JWT_SECRET, REFRESH_TOKEN_SECRET)
npm install && npm run db:migrate && npm run db:seed && npm run dev

# 3. Frontend (in a second terminal)
cd frontend
npm install && npm run dev
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

On first run, the backend runs an idempotent seed automatically. It creates **5 demo accounts**, **12 tweets** spread across them, a full follow mesh (every demo user follows the other four), and **10 likes**. Because the demo users all follow each other, logging in with any of them shows a populated home timeline (~10 tweets from the other four accounts).

### Demo accounts

All demo accounts share the password **`password123`**. Log in with the email:

| Email                       | Username    | Display name      |
|-----------------------------|-------------|-------------------|
| `martina@clontwitter.dev`   | `martina`   | Martina Rossi     |
| `lucas@clontwitter.dev`     | `lucas_dev` | Lucas Fernández   |
| `sofia@clontwitter.dev`     | `sofia_g`   | Sofía González    |
| `tomas@clontwitter.dev`     | `tomas`     | Tomás Pérez       |
| `valen@clontwitter.dev`     | `valen`     | Valentina Díaz    |

To run the seed manually:

```bash
docker compose exec backend npm run db:seed
```

The seed is idempotent: it checks for the sentinel account (`martina`) and skips if the demo data is already present, so it never duplicates rows or wipes manually-created users. To re-seed from scratch, reset the database volume with `docker compose down -v` and start again.

---

## Running Migrations Manually

Migrations run automatically on `docker compose up`. If you need to run them manually (e.g. after pulling new schema changes like the `image_url` column added in Phase 4):

**With Docker (recommended):**
```bash
docker compose exec backend npm run db:migrate
```

**Without Docker (local dev, backend running directly on your machine):**
```bash
cd backend
npm run db:migrate
```

The migrate script applies all pending SQL files from `backend/drizzle/` in order and is safe to run multiple times (idempotent).

---

## Running Tests

```bash
# Backend unit/integration tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# End-to-end tests (Playwright)
npm run test:e2e
```

> Tests are implemented in Phase 4.

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

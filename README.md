# ClonTwitter — TheFlock Challenge

A full-stack Twitter/X clone built with Express + Drizzle (backend) and Next.js 14 + Tailwind (frontend), wired together with Docker Compose.

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

---

## Accessing the App

| Service  | URL                     | Description              |
|----------|-------------------------|--------------------------|
| Frontend | http://localhost:3000   | Next.js web application  |
| Backend  | http://localhost:4000   | Express REST API         |
| Postgres | localhost:5432          | PostgreSQL 16 database   |

---

## Seed Data

On first run, the backend runs an idempotent seed automatically. Full sample data (users, tweets, follows, likes) is added in Phase 4. To run the seed manually:

```bash
docker compose exec backend npm run db:seed
```

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

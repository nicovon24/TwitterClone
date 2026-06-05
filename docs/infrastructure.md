# Infrastructure

## Local Development Stack

| Service  | Port | Description |
|----------|------|-------------|
| postgres | 5432 | PostgreSQL 16 database |
| backend  | 4000 | Express API server |
| frontend | 3000 | Next.js dev server |

---

## Docker Compose

Full stack starts with one command:

```bash
docker compose up --build
```

Services defined in `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: twitter
      POSTGRES_PASSWORD: twitter
      POSTGRES_DB: twitterclone
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgres://twitter:twitter@postgres:5432/twitterclone
      JWT_SECRET: dev_jwt_secret
      JWT_EXPIRES_IN: 7d
      NODE_ENV: development
      ALLOWED_ORIGINS: http://localhost:3000
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000/api
    depends_on:
      - backend
```

---

## Environment Variables

All variables must be present. See `.env.example` in the root for a ready-to-copy template.

### Backend

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://twitter:twitter@localhost:5432/twitterclone` |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars in prod) | `super_secret_jwt_key_change_in_prod` |
| `JWT_EXPIRES_IN` | Token expiry (ms or string) | `7d` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Express server port | `4000` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |

### Frontend

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (no trailing slash) | `http://localhost:4000/api` |

---

## Database Setup

Migrations are managed by drizzle-kit.

```bash
# Generate migration files from schema
cd backend && npm run db:generate

# Apply migrations to the database
cd backend && npm run db:migrate

# Seed with realistic data
cd backend && npm run db:seed
```

The backend runs migrations automatically on startup (`src/db/migrate.ts` called from `index.ts`).

---

## Scripts Reference

| Location | Script | What it does |
|----------|--------|--------------|
| `backend` | `npm run dev` | Start Express with nodemon |
| `backend` | `npm run build` | Compile TypeScript |
| `backend` | `npm start` | Start compiled server |
| `backend` | `npm test` | Run Vitest integration tests |
| `backend` | `npm run db:generate` | Generate Drizzle migration files |
| `backend` | `npm run db:migrate` | Apply pending migrations |
| `backend` | `npm run db:seed` | Insert seed data |
| `frontend` | `npm run dev` | Start Next.js dev server |
| `frontend` | `npm run build` | Build for production |
| `frontend` | `npm test` | Run Vitest unit/integration tests |
| root | `npm run test:e2e` | Run Playwright E2E tests |

---

## Production Deployment (reference)

Not required for the challenge, but the intended target:

| Service | Platform |
|---------|----------|
| Frontend | Vercel |
| Backend | Render |
| Database | Supabase (PostgreSQL) |

Update `DATABASE_URL`, `ALLOWED_ORIGINS`, and `NEXT_PUBLIC_API_URL` for each environment. Set `NODE_ENV=production` on the backend to enable secure cookie flags.

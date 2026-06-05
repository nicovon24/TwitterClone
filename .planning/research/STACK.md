# Stack Research

**Domain:** Twitter/X clone — authenticated social timeline with real-time push
**Researched:** 2026-06-04
**Confidence:** HIGH (stack is mandated by challenge spec; research focuses on correct versions, supporting libraries, and configuration)

## Recommended Stack

> Note: Core technologies are fixed by the TheFlock AI Verified challenge specification. This document records the correct versions, required supporting libraries, and integration patterns for each layer.

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 14.x (App Router) | Frontend framework | Mandated. App Router gives server components, layouts, and file-based routing without extra config. Use `app/` directory only — no `pages/` migration needed. |
| React | 18.x | UI library | Bundled with Next.js 14. Server components + Suspense are the correct primitives for timeline feeds. |
| TypeScript | 5.x | Type safety | Shared types between backend and frontend reduce runtime errors at API boundaries. Strict mode. |
| Node.js | 20 LTS | Backend runtime | LTS branch; native `fetch`, `crypto.randomUUID()`, and ES modules without polyfills. |
| Express | 4.x | HTTP server | Mandated. Lightweight, well-understood, no magic. Use `express-async-errors` to propagate async exceptions without try/catch boilerplate. |
| Drizzle ORM | 0.30.x | Database access layer | Mandated. SQL-close mental model, fully type-safe query builder, zero-overhead joins, first-class migrations via `drizzle-kit`. Prefer over Prisma when you want to reason about SQL directly. |
| PostgreSQL | 16 | Primary database | Mandated. Use the official `postgres` Node driver (not `pg`) with Drizzle — it is the recommended pairing. Port :5432. |
| Docker / Docker Compose | latest stable | Local environment | Evaluator runs `docker compose up`; compose file must start postgres, backend, and frontend as services with correct depends_on ordering. |

### Auth Layer

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `jsonwebtoken` | 9.x | Sign/verify JWTs | Standard, well-audited. Access token 15 min, refresh token 30 days. Stored in localStorage (challenge requirement). |
| `bcryptjs` | 2.x | Hash passwords + refresh tokens | Pure JS, no native binding issues in Docker. Use for both user passwords and the hashed refresh token stored in `users`. |
| `axios` | 1.x | HTTP client (frontend) | Interceptor pattern for auto-refresh on 401 is idiomatic with Axios; fetch API does not support interceptors natively. |

### Real-Time (SSE)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| Native Express SSE | — | Server-Sent Events endpoint | No extra library needed. `res.setHeader('Content-Type', 'text/event-stream')` + a per-connection `Set<res>` registry is sufficient for the timeline stream. |
| `EventSource` (browser) | — | SSE client | Built into all modern browsers. Reconnects automatically on disconnect — no client library needed. |

### Validation

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `zod` | 3.x | Request body validation | Colocate schema + TypeScript type inference. Use for auth payloads (email, password), tweet content (max 280 chars). Throw `ZodError` and convert to 400 in a global error handler. |

### Testing

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `vitest` | 1.x | Test runner (backend + frontend) | Fast, ESM-native, compatible with `@testing-library` and `supertest`. Replaces Jest without config overhead. Use `--coverage` flag with `v8` provider for ≥80% line coverage. |
| `supertest` | 6.x | HTTP integration test client | Makes real HTTP requests against the Express app. Pair with a real PostgreSQL test database (not mocks) — per ADR-007. |
| `@testing-library/react` | 14.x | Frontend component tests | Standard for testing React components from the user's perspective. Use with `@testing-library/user-event` for interactions. |
| `@testing-library/user-event` | 14.x | Simulates real user interactions | Prefer over `fireEvent` — dispatches full event sequences (mousedown, focus, click). |
| `@playwright/test` | 1.x | E2E browser tests | `happy-path.spec.ts` with `@smoke` tag. Headless Chromium. Must cover register → login → tweet → follow → logout. |
| `@vitest/coverage-v8` | 1.x | Coverage provider | Native V8 coverage, no Istanbul/nyc setup. Use `--reporter=lcov` for CI artifacts. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `drizzle-kit` | Generate + run migrations | `drizzle-kit generate` produces SQL migration files; call `drizzle-kit migrate` on backend startup (or in a startup script). Pin to same major as `drizzle-orm`. |
| `tsx` | Run TypeScript files directly | Use for backend dev server (`tsx watch src/index.ts`) and seed scripts. Faster than `ts-node`. |
| `dotenv` | Load `.env` at runtime | Backend only. Frontend uses Next.js built-in env loading (`NEXT_PUBLIC_*` for client-side vars). |
| `eslint` + `typescript-eslint` | Lint TypeScript | One shared config at repo root, referenced from both `backend/` and `frontend/`. |
| `prettier` | Format code | Consistent formatting; commit a `.prettierrc` at the root. |

## Installation

```bash
# === BACKEND (backend/) ===

# Core
npm install express drizzle-orm postgres zod jsonwebtoken bcryptjs dotenv cors

# Supporting
npm install express-async-errors

# Dev dependencies
npm install -D typescript tsx drizzle-kit vitest supertest @vitest/coverage-v8 \
  @types/express @types/node @types/jsonwebtoken @types/bcryptjs @types/supertest \
  eslint typescript-eslint prettier

# === FRONTEND (frontend/) ===

# Core (Next.js installs React + React-DOM automatically)
npx create-next-app@14 . --typescript --app --eslint --no-tailwind --src-dir --import-alias "@/*"

# Supporting
npm install axios zod

# Dev dependencies
npm install -D vitest @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom jsdom @vitejs/plugin-react @playwright/test \
  @vitest/coverage-v8
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `postgres` (Drizzle driver) | `pg` (node-postgres) | `pg` is fine if you need raw Pool/Client access; `postgres` is simpler and Drizzle's preferred pairing |
| `bcryptjs` | `bcrypt` (native) | Use `bcrypt` native binding if performance is critical at scale; `bcryptjs` avoids C++ build issues in Docker Alpine |
| `tsx` | `ts-node` | `ts-node` is fine but slower due to CommonJS interop; `tsx` is faster and ESM-native |
| Vitest | Jest | Jest is valid but requires Babel/SWC transform config with ESM; Vitest works out of the box |
| `zod` | `joi` / `yup` | `joi`/`yup` lack TypeScript inference; Zod's `z.infer<>` eliminates manual type duplication |
| `axios` (frontend) | native `fetch` | `fetch` lacks interceptor support; Axios interceptor is the idiomatic pattern for auto-refreshing JWTs on 401 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Prisma | Code-gen workflow and abstraction over schema add friction; Drizzle is mandated and gives SQL-close control | Drizzle ORM |
| TypeORM | Decorator-based, brittle with strict TypeScript, migration system less reliable | Drizzle ORM |
| `next-auth` / `auth.js` | Challenge spec requires JWT in localStorage with custom interceptor; NextAuth uses cookies and adds abstractions that conflict | `jsonwebtoken` + `axios` interceptor |
| WebSockets / Socket.io | Challenge real-time requirement is unidirectional (server → client); SSE is simpler and sufficient | Native SSE via Express |
| Turborepo / Nx / pnpm workspaces | Out of scope per ADR-005; dual `package.json` with `npm --prefix` scripts covers the evaluation needs | `npm --prefix backend/` + `npm --prefix frontend/` |
| Offset pagination | Unstable under concurrent inserts (duplicate/skipped tweets); mandated against by ADR-003 | Cursor-based pagination (`created_at` + `id`) |
| `uuid` npm package | Node 20 ships `crypto.randomUUID()` natively | `crypto.randomUUID()` |
| `body-parser` (standalone) | Included in Express 4.16+ as `express.json()` | `app.use(express.json())` |

## Version Compatibility Matrix

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `drizzle-orm` | 0.30.x | `drizzle-kit` 0.20.x | Pin both; drizzle-kit major must match drizzle-orm minor series |
| `drizzle-orm` | 0.30.x | `postgres` 3.x | Recommended pairing in Drizzle docs |
| `vitest` | 1.x | `@testing-library/react` 14.x | Compatible; use `jsdom` environment in vitest config |
| `next` | 14.x | React 18.x | Next.js 14 requires React 18; do not upgrade to React 19 |
| `@playwright/test` | 1.x | Node.js 20 LTS | Chromium bundled; run `npx playwright install` after install |
| `typescript` | 5.x | `typescript-eslint` 7.x | `typescript-eslint` v7 requires TypeScript 5 |

## Stack Patterns by Variant

**For the backend Express server:**
- Use `express-async-errors` (import at top of entry) so async route handlers throw to the global error handler without try/catch
- Global error handler shape: `(err, req, res, next) => res.status(err.status ?? 500).json({ error: err.message })`

**For SSE timeline streaming:**
- Keep a `Map<userId, Set<Response>>` of active SSE connections in memory
- On `req.on('close', ...)` remove the connection — prevents memory leak on disconnect
- Send `heartbeat` events every 30s to prevent proxy/load-balancer timeouts

**For JWT auto-refresh on the frontend:**
- Axios request interceptor: attach `Authorization: Bearer <accessToken>` from localStorage
- Axios response interceptor: on 401, call `/auth/refresh`, store new tokens, retry original request once
- Guard against infinite refresh loop with a `_retry` flag on the request config

**For cursor pagination on the timeline:**
- Cursor = `{ created_at, id }` encoded as base64 JSON — opaque to clients
- Query: `WHERE (created_at, id) < (cursor.created_at, cursor.id) ORDER BY created_at DESC, id DESC LIMIT 20`
- Composite index on `(created_at DESC, id DESC)` on `tweets` table

**For integration tests:**
- Spin up a dedicated test database via `docker compose` service or a separate schema
- Use `beforeEach` to truncate tables (not `beforeAll` + seed) — guarantees test isolation
- Export the Express app without `app.listen()` so Supertest can bind its own port

## Docker Compose Service Order

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: clontwitter
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

  backend:
    build: ./backend
    ports: ["4000:4000"]
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/clontwitter

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
```

> Use `healthcheck` on the postgres service so the backend waits for the database to be ready before starting migrations.

## Sources

- PROJECT.md + ADRs 001–007 — stack mandated by challenge spec (HIGH confidence)
- Drizzle ORM official docs (`drizzle-orm` + `postgres` driver pairing) — version compatibility
- Next.js 14 docs — App Router structure, env variable conventions
- Vitest docs — `jsdom` environment setup for `@testing-library/react`
- Express 4.x docs — `express.json()` built-in, no `body-parser` needed

---
*Stack research for: ClonTwitter (TheFlock AI Verified challenge)*
*Researched: 2026-06-04*

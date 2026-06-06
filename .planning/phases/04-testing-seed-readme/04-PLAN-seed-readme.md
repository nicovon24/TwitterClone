---
phase: 04-testing-seed-readme
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/db/seed.ts
  - backend/package.json
  - README.md
autonomous: true
requirements: [TEST-04, TEST-05, INFR-03]
user_setup: []

must_haves:
  truths:
    - "npm run db:seed en backend inserta 10 usuarios, ~50 tweets, ~40 follows, y ~100 likes"
    - "npm run db:seed es idempotente: una segunda ejecución no falla ni duplica datos"
    - "Las contraseñas de todos los usuarios del seed son 'password123' (hasheadas con bcrypt)"
    - "docker compose up --build desde estado limpio inicia los 3 servicios sin pasos manuales"
    - "README contiene las secciones: Quick Start, Seed, Test credentials, Run tests, Environment variables"
    - "La tabla de Test credentials lista todos los usernames de seed con su contraseña"
    - "docker compose exec backend npm run db:seed ejecuta el seed contra la DB del contenedor"
  artifacts:
    - path: "backend/src/db/seed.ts"
      provides: "Seed completo: 10 usuarios, ~50 tweets, ~40 follows, ~100 likes — idempotente"
      contains: "password123"
    - path: "README.md"
      provides: "Runbook evaluador-ready con Quick Start, credentials, tests, env vars, ADRs"
      contains: "password123"
  key_links:
    - from: "backend/src/db/seed.ts"
      to: "backend/src/db/schema.ts"
      via: "import { users, tweets, follows, likes } from './schema.js'"
      pattern: "db.insert(users)"
    - from: "backend/src/db/seed.ts"
      to: "backend/src/db/index.ts"
      via: "import { db } from './index.js'"
      pattern: "db.insert"
---

<objective>
Complete the seed script with real data and update the README to be evaluator-ready.

Purpose: The app is useless to an evaluator without sample data — an empty timeline, no users to follow, nothing to search. The seed script must produce a realistic social graph on first run. The README must let someone run the app from zero in under 5 minutes without asking any questions.
Output: A fully populated seed (10 users, social graph, content) that is idempotent, and a README that covers every step an evaluator needs.
</objective>

<execution_context>
@AGENTS.md
@backend/src/db/schema.ts
@backend/src/db/index.ts
@backend/src/db/seed.ts
@README.md
@docs/infrastructure.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@AGENTS.md

<interfaces>
<!-- Schema from backend/src/db/schema.ts -->

users: { id (uuid, PK), username, email, password_hash, display_name, bio, avatar_url, refresh_token_hash, refresh_token_expires_at, created_at, updated_at }
tweets: { id (uuid, PK), user_id (FK users.id), content (max 280), created_at, deleted_at }
follows: { follower_id (FK), following_id (FK) } — composite PK; no self-follow CHECK
likes: { user_id (FK), tweet_id (FK) } — composite PK
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Complete seed.ts with full sample data</name>
  <files>backend/src/db/seed.ts</files>
  <read_first>
    - backend/src/db/schema.ts — table names, column names, and constraints
    - backend/src/db/index.ts — db import path
    - backend/src/db/seed.ts — current idempotent placeholder to keep
  </read_first>
  <action>
    Replace backend/src/db/seed.ts with the full seed. Keep the same module export pattern (export async function seed() + direct-run block at bottom).

    Idempotency check: keep the existing check at the top:
      const existing = await db.select().from(users).limit(1)
      if (existing.length > 0) { console.log('[seed] Skipped: data already exists.'); return }

    10 users (username, email, display_name, bio):
      alice / alice@example.com / Alice Wonderland / "Curiosa por naturaleza"
      bob / bob@example.com / Bob Builder / "Construyendo cosas"
      carol / carol@example.com / Carol White / "Fotógrafa y viajera"
      dave / dave@example.com / Dave Green / "Dev de backend"
      eve / eve@example.com / Eve Black / "UX designer"
      frank / frank@example.com / Frank Stone / "Amante del café"
      grace / grace@example.com / Grace Lee / "Escritora y lectora"
      henry / henry@example.com / Henry Park / "Músico"
      iris / iris@example.com / Iris Chen / "Data scientist"
      jack / jack@example.com / Jack Mills / "Emprendedor"

    Password for all: bcrypt.hash('password123', 10) — hash each user individually using await.

    Tweet content pool (~50 tweets, 5 per user):
    Distribute 5 tweets per user. Use realistic Spanish content, varying lengths.
    Examples:
      alice: "Empezando la semana con energía ☕", "¿Alguien más usa Vim y se arrepiente?", "La lluvia en Buenos Aires es otra cosa", "Acabo de leer 'El Aleph' por tercera vez", "Próximamente: mi proyecto favorito"
      bob: "Desplegué en prod un viernes. Pray for me.", "Nuevo feature listo en staging 🎉", "El café se acabó en la oficina. Crisis.", "Git blame es la herramienta más honesta", "Monorepo o repos separados? Debate abierto."
      carol: "Foto del atardecer desde el río 🌅", "Buenos Aires de noche siempre sorprende", "Nuevo rollo revelado. Film es magia.", "Viajar cambia la perspectiva de todo", "La Boca tiene una luz increíble al mediodía"
      dave: "Drizzle ORM > Prisma para proyectos chicos", "PostgreSQL indexes bien diseñados = amor", "El error era un punto y coma. Siempre.", "Cursor pagination en timelines: obligatorio", "Acabé de migrar toda la base sin downtime"
      eve: "El diseño centrado en usuario no es opcional", "Dark mode debería ser el default en 2026", "Figma crasheó y perdí 2h de trabajo 😤", "Un buen sistema de design tokens vale oro", "La accesibilidad no es un feature, es un requisito"
      frank: "Tercer café del día y recién son las 10am", "La cafetera nueva cambió mi vida", "Cold brew casero > café de Starbucks", "La mañana sin mate no existe en Argentina", "Encontré el mejor bar de especialidad de Palermo"
      grace: "Escribir todos los días aunque sea mal", "Recomendación: 'Ficciones' de Borges ya mismo", "La editorial argentina está en su mejor momento", "Un párrafo bien construido vale más que mil", "Terminé el primer borrador. Uf."
      henry: "Grab nuevo terminado después de 3 semanas", "La acústica de la sala nueva es brutal 🎵", "Los Beatles siguen siendo imbatibles", "Samplear vinilo en 2026 es lo más analógico posible", "Concierto esta noche en el ND Ateneo 🎸"
      iris: "El overfitting me persigue en sueños", "Pandas 2.0 es significativamente más rápido", "Expliqué una regresión lineal con facturas de luz", "Los datos limpios son un mito. Los limpiás vos.", "Nuevo notebook sobre clustering de usuarios publicado"
      jack: "El producto market fit llegó cuando dejé de buscarlo", "Cerré la ronda seed esta mañana. Gracias equipo.", "Startup life: plan A falló. Viva el plan F.", "El cliente siempre tiene razón. El cliente casi nunca tiene razón.", "Pitch deck nuevo. Slide 3 mata la conversación."

    ~40 follows (forming a connected social graph):
    alice follows: bob, carol, dave, eve
    bob follows: alice, carol, frank
    carol follows: alice, grace, henry
    dave follows: alice, bob, iris, jack
    eve follows: carol, grace, alice
    frank follows: bob, henry, jack
    grace follows: alice, carol, eve, iris
    henry follows: frank, jack, alice
    iris follows: dave, grace, alice
    jack follows: dave, bob, carol, frank

    Total: 4+3+3+4+3+3+4+3+3+4 = 34 follows (close to 40 — adjust if needed by adding a few more).
    Add to reach ~40: alice follows iris; bob follows jack; carol follows dave; frank follows alice; grace follows henry; henry follows bob. (Total: 34 + 6 = 40 ✓)

    ~100 likes: distribute likes across tweets. Each user likes ~10 tweets from users they follow or randomly.
    Approach: after inserting all tweets, select all tweet IDs into an array; assign likes in a loop:
      - For each user, randomly like 10 tweets that are not their own
      - Use a Set to avoid duplicates (composite PK enforcement at DB level would also catch this, but avoid errors)
      - Insert all likes in one bulk insert at the end

    Implementation note: use drizzle db.insert(table).values(rows) for bulk inserts. Use onConflictDoNothing() on follows and likes inserts to make the seed re-runnable even if partial data exists.

    Actual idempotency: the top-level check (users exist → skip) is the primary guard. The onConflictDoNothing() is a secondary safety net.

    Update the package.json db:seed script to work with the ESM/ts-node setup already in place.
  </action>
  <verify>
    <automated>cd backend && node -e "require('./src/db/seed.ts')" 2>&1 || npx ts-node src/db/seed.ts 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - seed() inserts 10 users with bcrypt-hashed 'password123'
    - ~50 tweets distributed across 10 users (5 each)
    - ~40 follows forming a connected social graph
    - ~100 likes distributed across users
    - Second run of seed() prints "Skipped" and exits 0 (idempotent)
    - tsc passes on seed.ts (no type errors)
  </acceptance_criteria>
  <done>seed.ts populates all tables with realistic data; idempotent; tsc passes.</done>
</task>

<task type="auto">
  <name>Task 2: Update README.md to evaluator-ready runbook</name>
  <files>README.md</files>
  <read_first>
    - README.md — current state (has Quick Start, Ports, env vars table)
    - docs/architecture.md — ADR links to include
    - .env.example — verify env var names are accurate
  </read_first>
  <action>
    Replace README.md with a complete evaluator-ready runbook. Keep all existing correct content; add/update the sections below.

    Structure:
    # ClonTwitter — TheFlock Challenge

    One-line description of what the app is.

    ## Prerequisites
    - Node.js 20 LTS
    - Docker + Docker Compose v2+
    - (For local dev without Docker) PostgreSQL 16

    ## Quick Start (Docker — recommended)
    ```bash
    git clone <repo>
    cd ClonTwitter
    cp .env.example .env
    docker compose up --build
    ```
    App available at http://localhost:3000
    API available at http://localhost:4000

    ## Seed Data
    On first run the seed runs automatically. To run manually:
    ```bash
    docker compose exec backend npm run db:seed
    ```
    The seed is idempotent — safe to run multiple times.

    ## Test Credentials
    All seed users have password: `password123`

    | Username | Email |
    |----------|-------|
    | alice    | alice@example.com |
    | bob      | bob@example.com |
    | carol    | carol@example.com |
    | dave     | dave@example.com |
    | eve      | eve@example.com |
    | frank    | frank@example.com |
    | grace    | grace@example.com |
    | henry    | henry@example.com |
    | iris     | iris@example.com |
    | jack     | jack@example.com |

    ## Run Tests
    ```bash
    # Backend integration tests (Vitest, real PostgreSQL)
    cd backend && npm test

    # Frontend unit tests (Vitest + Testing Library + jsdom)
    cd frontend && npm test

    # E2E tests (Playwright @smoke)
    npm run test:e2e
    ```

    ## Local Dev (without Docker)
    ```bash
    # Backend
    cd backend && npm install && npm run dev

    # Frontend (separate terminal)
    cd frontend && npm install && npm run dev

    # Run migrations
    cd backend && npm run db:migrate
    ```

    ## Environment Variables
    (keep the existing table; add TEST_DATABASE_URL row)

    | Variable | Description | Example |
    |---|---|---|
    | DATABASE_URL | PostgreSQL connection string | postgres://postgres:postgres@postgres:5432/clontwitter |
    | JWT_SECRET | Access token secret (15m) | change-me-access |
    | REFRESH_TOKEN_SECRET | Refresh token secret (30d) | change-me-refresh |
    | PORT | Backend port | 4000 |
    | NODE_ENV | Environment | development |
    | NEXT_PUBLIC_API_URL | Backend URL for frontend | http://localhost:4000 |
    | TEST_DATABASE_URL | PostgreSQL URL for tests | postgres://postgres:postgres@localhost:5432/clontwitter_test |

    ## Ports
    | Service | Port |
    |---------|------|
    | Frontend | 3000 |
    | Backend | 4000 |
    | PostgreSQL | 5432 |

    ## Architecture Decisions
    Key decisions are documented as ADRs in `docs/architecture.md`:
    - **ADR-001** — JWT in localStorage (not httpOnly cookies)
    - **ADR-002** — Drizzle ORM over Prisma
    - **ADR-003** — Cursor pagination for timeline
    - **ADR-004** — SSE over WebSockets for real-time
    - **ADR-005** — No Turborepo (simple npm workspaces)
    - **ADR-006** — Soft delete for tweets, UUIDs as PKs
    - **ADR-007** — Real PostgreSQL in integration tests

    ## CI/CD
    See `.github/workflows/` — added in Phase 4.
    Required GitHub Secrets: `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `DATABASE_URL`, `TEST_DATABASE_URL`.
  </action>
  <verify>
    <automated>grep -q "password123" README.md && grep -q "Quick Start" README.md && grep -q "Test Credentials" README.md && echo "README OK"</automated>
  </verify>
  <acceptance_criteria>
    - README has sections: Quick Start, Seed Data, Test Credentials, Run Tests, Local Dev, Environment Variables, Ports, Architecture Decisions, CI/CD
    - Test credentials table lists all 10 seed users with their email
    - All docker compose commands are accurate
    - ADR list links to docs/architecture.md
  </acceptance_criteria>
  <done>README.md is evaluator-ready with all sections, seed credentials, and test commands.</done>
</task>

</tasks>

<verification>
- cd backend && npm run db:seed → exits 0, logs "Seed complete"
- cd backend && npm run db:seed (second run) → exits 0, logs "Skipped"
- grep -c "alice" README.md → at least 1 (credentials table)
- docker compose exec backend npm run db:seed → works against running container
- README.md has at least 8 sections
</verification>

<success_criteria>
1. seed.ts inserts 10 users + ~50 tweets + ~40 follows + ~100 likes with bcrypt-hashed passwords
2. Idempotent: second run prints "Skipped" and exits 0
3. README.md covers Quick Start, Test Credentials (all 10 users), Run Tests, Architecture Decisions
4. docker compose exec backend npm run db:seed works against running container
5. tsc passes on seed.ts
</success_criteria>

<output>
Create `.planning/phases/04-testing-seed-readme/04-01-SUMMARY.md` when done
</output>

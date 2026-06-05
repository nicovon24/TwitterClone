# 002 — Stack: Next.js 14 + Express + Drizzle + PostgreSQL

## Status
Accepted

## Context
The project is a full-stack Twitter clone for a technical certification (TheFlock AI Verified). The stack needed to be fast to scaffold, type-safe end-to-end, and familiar to evaluators. Alternatives considered: NestJS (more structured), Prisma (more popular ORM), and MySQL/SQLite.

## Decision

| Layer | Choice | Discarded alternative |
|---|---|---|
| Frontend | Next.js 14 App Router | Create React App, Vite |
| Backend | Node.js + Express | NestJS, Fastify |
| ORM | Drizzle ORM | Prisma |
| Database | PostgreSQL 16 | MySQL, SQLite |
| Client state | Zustand | Redux, React Query |
| Styling | Tailwind CSS | CSS Modules, Styled Components |

## Consequences

**Next.js 14 App Router:**
- SSR and React Server Components available natively.
- File-system based routing, nested layouts.
- Trade-off: App Router has a learning curve distinguishing Server vs. Client Components.

**Express over NestJS:**
- Less boilerplate, faster to scaffold for a challenge scope.
- No decorators or modules — logic is more direct.
- Trade-off: Requires manual structure (controllers/services/routes).

**Drizzle over Prisma:**
- Queries written in TypeScript, no separate schema language (Prisma Schema Language).
- More explicit and controlled migrations with `drizzle-kit`.
- Trade-off: Smaller community and less documentation than Prisma.

**PostgreSQL:**
- Native relational integrity, UUIDs via `gen_random_uuid()`, partial indexes.
- Required by the challenge to demonstrate handling of complex relationships.

## Date
2026-06-04

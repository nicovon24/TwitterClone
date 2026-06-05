# Project Decisions

Record of all technical and design decisions made during the development of the Twitter clone. Each file documents the context, the decision, and the accepted trade-offs.

## Index

| # | Decision | Status | File |
|---|---|---|---|
| 001 | Auth: JWT + localStorage + Refresh Tokens | Accepted | [001-auth-jwt-localstorage.md](./001-auth-jwt-localstorage.md) |
| 002 | Stack: Next.js 14 + Express + Drizzle + PostgreSQL | Accepted | [002-stack.md](./002-stack.md) |
| 003 | Pagination: Cursor-Based (no offset) | Accepted | [003-cursor-pagination.md](./003-cursor-pagination.md) |
| 004 | Real-time: Server-Sent Events (no WebSockets) | Accepted | [004-sse-realtime.md](./004-sse-realtime.md) |
| 005 | Monorepo: Dual package.json without turborepo/nx | Accepted | [005-monorepo.md](./005-monorepo.md) |
| 006 | Database Design: UUIDs, Soft Delete, Composite PKs | Accepted | [006-database-design.md](./006-database-design.md) |
| 007 | Testing Strategy: Integration tests with real PostgreSQL | Accepted | [007-testing-strategy.md](./007-testing-strategy.md) |

## How to add a new decision

1. Create a file `NNN-kebab-case-title.md` following the existing structure.
2. Add a row to the table in this README.
3. Required sections: **Status**, **Context**, **Decision**, **Consequences**, **Date**.

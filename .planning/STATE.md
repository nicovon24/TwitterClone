# Project State: ClonTwitter

**Last Updated:** 2026-06-05
**Current Phase:** 4 — Testing & Seed + README
**Status:** Planned — ready to execute

---

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Scaffolding & Infrastructure | Done | 3 |
| 2 | Backend: Auth + Core API | Done | 4 |
| 3 | Frontend: UI Core | Done | 6 |
| 4 | Testing & Seed + README | Planned | 3 |

---

## Key Decisions

- JWT in localStorage (not cookies) — ADR-001
- Cursor pagination for timeline — ADR-003
- SSE over WebSockets — ADR-004
- Drizzle ORM — ADR-002
- No turborepo — ADR-005
- Real PostgreSQL in tests — ADR-007
- Soft delete tweets — ADR-006
- UUIDs as PKs — ADR-006

---

*Initialized: 2026-06-04*

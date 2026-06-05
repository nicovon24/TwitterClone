# Vision

## What it is

A functional Twitter/X clone built as a technical challenge for TheFlock's AI Verified certification. The app demonstrates the ability to build production-quality full-stack software using AI coding tools effectively.

## What problem it solves

TheFlock needs to evaluate candidates' ability to build with AI in real work conditions — not just their raw coding ability, but their judgment in directing AI tools, making architectural decisions, and delivering working software under time constraints.

## Target users

- **Evaluators at TheFlock** — primary audience; they will follow the runbook and assess the live app
- **Seed users** — 10 pre-created accounts used to demonstrate all features with realistic data

## What this is NOT

- A real social network — no need to scale to millions of users
- A production SaaS — no need for media CDN, advanced rate limiting, or GDPR compliance
- A UI showcase — clean and functional matters more than polished design

## Product north star

**Usable from end to end, mobile-first, well-tested, and clearly documented.**

The evaluators judge four things: it works, the code is clean, it's tested well (80%+ backend coverage), and the commit history tells a coherent story of how it was built.

## Scope

### In scope (mandatory)
- Auth: register, login, logout, protected routes
- User profile: unique username, bio, avatar placeholder
- Tweets: create (≤280 chars), delete own, timeline of followed users (chronological, paginated)
- Social: follow/unfollow, like/unlike, follower/following counts
- Search: find users by name or username
- Responsive: mobile-first, works at 320px and 1440px

### In scope (bonus — chosen)
- Docker Compose: full stack up with one command
- Real-time: SSE updates push new tweets to the timeline without refresh

### Out of scope
- Image uploads (bonus not chosen)
- Reply threads (bonus not chosen)
- In-app notifications (bonus not chosen)
- OAuth / third-party auth
- Advanced analytics or admin panels

## Tech decisions summary

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 14 App Router | SSR + RSC, familiar from prior project |
| Backend | Node.js + Express | Lightweight, team knows it, fast to iterate |
| ORM | Drizzle | Type-safe, fast, minimal magic |
| DB | PostgreSQL | Challenge preferred, relational integrity |
| Auth | JWT + httpOnly cookie | Challenge rule: no third-party auth |
| State | Zustand | Minimal, no boilerplate |
| Styling | Tailwind CSS | Utility-first, rapid mobile-first iteration |
| Real-time | SSE | Simpler than WebSockets for unidirectional push |

Full rationale in `docs/architecture.md`.

---
phase: 01-scaffolding-infrastructure
plan: "02"
subsystem: frontend
tags: [next.js, tailwind, zustand, axios, jwt, auth]
dependency_graph:
  requires: []
  provides: [frontend-scaffold, axios-interceptor, auth-store, home-page]
  affects: [all-frontend-phases]
tech_stack:
  added:
    - next@^14.2.29
    - react@^18.3.1
    - react-dom@^18.3.1
    - axios@^1.7.9
    - zustand@^4.5.6
    - tailwindcss@^3.4.17
    - typescript@^5.7.3
  patterns:
    - Next.js 14 App Router with src/ directory
    - Zustand store with localStorage hydration (SSR-safe)
    - Axios interceptor pattern for silent JWT refresh on 401
    - L10N split: Spanish UI text, English code identifiers
key_files:
  created:
    - frontend/package.json
    - frontend/tsconfig.json
    - frontend/next.config.js
    - frontend/postcss.config.js
    - frontend/tailwind.config.ts
    - frontend/.eslintrc.json
    - frontend/src/app/globals.css
    - frontend/src/app/layout.tsx
    - frontend/src/store/authStore.ts
    - frontend/src/lib/api.ts
    - frontend/src/app/page.tsx
  modified: []
decisions:
  - "Pinned React to ^18 (not ^19) — Next.js 14 requires React 18 per STACK.md compatibility matrix"
  - "Used bare axios.post (not api instance) for /auth/refresh to prevent interceptor recursion"
  - "ACCESS_TOKEN_KEY / REFRESH_TOKEN_KEY defined once in authStore.ts and imported in api.ts — no duplicated string literals"
  - "router.replace('/login') used instead of push — avoids back-button loop to protected page"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-06-04"
  tasks_completed: 3
  files_created: 11
---

# Phase 01 Plan 02: Frontend Scaffold — Next.js + Tailwind + Zustand Summary

Next.js 14 App Router frontend skeleton with Tailwind CSS configured, a Zustand auth store persisting JWT tokens to localStorage, an Axios instance that silently refreshes access tokens on 401, and an auth-gated home page that redirects unauthenticated users to `/login`.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Next.js project config, Tailwind, and base layout | d968d40 | package.json, tsconfig.json, next.config.js, postcss.config.js, tailwind.config.ts, .eslintrc.json, globals.css, layout.tsx |
| 2 | Zustand auth store and Axios instance with auto-refresh interceptors | 7ce75c6 | src/store/authStore.ts, src/lib/api.ts |
| 3 | Auth-gated home page | 80bfc8e | src/app/page.tsx |

## What Was Built

### Task 1 — Project Config and Base Layout
- `package.json` with `next@14`, `react@18`, `react-dom@18` (pinned to 18, not 19), `axios@1`, `zustand@4`
- `tsconfig.json` with `strict: true`, `moduleResolution: bundler`, `jsx: preserve`, `@/*` path alias to `./src/*`
- Tailwind wired via `postcss.config.js` → `tailwind.config.ts` (content glob: `./src/**/*.{ts,tsx}`) → `globals.css` (`@tailwind base/components/utilities`)
- Root layout (`layout.tsx`) imports `globals.css` and renders `<html lang="es">` (Spanish UI target)

### Task 2 — Auth Store and Axios Instance
- `authStore.ts`: Zustand store exporting `useAuthStore` with `user`, `accessToken`, `setAuth`, `clearAuth`; exports `ACCESS_TOKEN_KEY` and `REFRESH_TOKEN_KEY` constants; initializes `accessToken` from `localStorage` with `typeof window !== 'undefined'` SSR guard
- `api.ts`: Axios instance with `baseURL: process.env.NEXT_PUBLIC_API_URL`; request interceptor attaches `Authorization: Bearer <token>` when token present; response interceptor handles 401 by calling `POST /auth/refresh` once (guarded by `_retry` flag), storing new `accessToken`, and retrying original request; on refresh failure removes both tokens and calls `window.location.assign('/login')`; imports key constants from `authStore.ts` — no duplicated string literals

### Task 3 — Auth-Gated Home Page
- `page.tsx`: `'use client'` component reading `accessToken` from `useAuthStore`; `useEffect` calls `router.replace('/login')` when no token; renders `"Cargando..."` while unauthenticated, `"Inicio"` heading when authenticated; all UI text in Spanish

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `frontend/src/app/page.tsx` | Placeholder `<h1>Inicio</h1>` home page | Intentional — real timeline UI is deferred to Phase 3 (UI screens phase) |

The `/login` route referenced in the redirect does not exist yet — also intentional; Phase 3 creates the login page.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-01-05 | `_retry` flag prevents infinite refresh loop; bare `axios.post` used for `/auth/refresh` to avoid interceptor recursion; tokens cleared and user redirected to `/login` on failure |
| T-01-06 | `baseURL` sourced exclusively from `NEXT_PUBLIC_API_URL` env var — never hardcoded |

## Self-Check

### Files Exist
- [x] frontend/package.json
- [x] frontend/tsconfig.json
- [x] frontend/next.config.js
- [x] frontend/postcss.config.js
- [x] frontend/tailwind.config.ts
- [x] frontend/.eslintrc.json
- [x] frontend/src/app/globals.css
- [x] frontend/src/app/layout.tsx
- [x] frontend/src/store/authStore.ts
- [x] frontend/src/lib/api.ts
- [x] frontend/src/app/page.tsx

### Commits Exist
- [x] d968d40 — Task 1: project config + Tailwind + base layout
- [x] 7ce75c6 — Task 2: Zustand auth store + Axios interceptors
- [x] 80bfc8e — Task 3: auth-gated home page

### Verification Commands Passed
- [x] `npm install` — exit 0
- [x] `npx tsc --noEmit` — zero type errors (verified after each task)
- [x] `_retry`, `NEXT_PUBLIC_API_URL`, `auth/refresh`, `removeItem` patterns confirmed present

## Self-Check: PASSED

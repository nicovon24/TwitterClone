---
phase: 01-scaffolding-infrastructure
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/package.json
  - frontend/tsconfig.json
  - frontend/next.config.js
  - frontend/postcss.config.js
  - frontend/tailwind.config.ts
  - frontend/.eslintrc.json
  - frontend/src/app/globals.css
  - frontend/src/app/layout.tsx
  - frontend/src/app/page.tsx
  - frontend/src/lib/api.ts
  - frontend/src/store/authStore.ts
autonomous: true
requirements: [INFR-04, L10N-02]

must_haves:
  truths:
    - "Frontend boots on :3000 with npm run dev and renders the home page without errors"
    - "The Axios instance reads its baseURL from NEXT_PUBLIC_API_URL"
    - "The Axios request interceptor attaches Authorization: Bearer <accessToken> from localStorage when present"
    - "On a 401 the Axios response interceptor calls POST /auth/refresh once and retries the original request; on refresh failure it clears auth and redirects to /login"
    - "The Zustand auth store exposes user, accessToken, setAuth, and clearAuth and hydrates accessToken from localStorage"
  artifacts:
    - path: "frontend/src/lib/api.ts"
      provides: "Axios instance with baseURL + request/response interceptors for auto-refresh"
      contains: "NEXT_PUBLIC_API_URL"
    - path: "frontend/src/store/authStore.ts"
      provides: "Zustand store { user, accessToken, setAuth, clearAuth }"
      contains: "create"
    - path: "frontend/src/app/layout.tsx"
      provides: "Root layout importing Tailwind globals"
      contains: "globals.css"
    - path: "frontend/src/app/page.tsx"
      provides: "Home page with auth-gate redirect logic"
      min_lines: 10
  key_links:
    - from: "frontend/src/lib/api.ts"
      to: "frontend/src/store/authStore.ts"
      via: "interceptor reads/clears token via localStorage (shared with store)"
      pattern: "localStorage"
    - from: "frontend/src/app/page.tsx"
      to: "frontend/src/store/authStore.ts"
      via: "reads accessToken to decide redirect"
      pattern: "authStore|useAuth"
---

<objective>
Scaffold the Next.js 14 App Router frontend so it boots on port 3000 with Tailwind configured, an Axios instance that auto-refreshes JWTs on 401, and a Zustand auth store. No business UI yet — just the home page with auth-gate redirect logic.

Purpose: This is the foundation every Phase 3 UI screen builds on (login, register, timeline, profile, search). The Axios interceptor and auth store implement the JWT-in-localStorage contract from ADR-001 that all authenticated screens depend on.
Output: A runnable Next.js skeleton on :3000, an Axios client wired to NEXT_PUBLIC_API_URL with silent-refresh interceptors, and a Zustand store managing { user, accessToken }.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/research/STACK.md
@docs/decisions/001-auth-jwt-localstorage.md
@AGENTS.md

<interfaces>
<!-- Auth contract from ADR-001. The Axios interceptor and store implement this. -->
<!-- Backend (Phase 2) will return on login/register: { accessToken: string, refreshToken: string, user: {...} } -->
<!-- POST /auth/refresh accepts { refreshToken } and returns { accessToken } -->

localStorage keys (define as named constants, reuse everywhere):
  - "accessToken"  : string (JWT, 15 min)
  - "refreshToken" : string (JWT, 30 days)

Axios baseURL: process.env.NEXT_PUBLIC_API_URL (e.g. http://localhost:4000)

Zustand store shape:
  user: { id: string; username: string; email: string; displayName?: string } | null
  accessToken: string | null
  setAuth(payload: { user, accessToken, refreshToken }): void  // writes tokens to localStorage + state
  clearAuth(): void                                            // removes tokens from localStorage + resets state
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Next.js project config, Tailwind, and base layout</name>
  <files>frontend/package.json, frontend/tsconfig.json, frontend/next.config.js, frontend/postcss.config.js, frontend/tailwind.config.ts, frontend/.eslintrc.json, frontend/src/app/globals.css, frontend/src/app/layout.tsx</files>
  <read_first>
    - .planning/research/STACK.md ("Core Technologies", "Installation" frontend block, "Version Compatibility Matrix") — Next 14 + React 18 pinning, do not upgrade to React 19
    - .planning/PROJECT.md (Constraints) — port 3000, Spanish UI / English code convention
    - AGENTS.md (Project Structure) — frontend/src/ layout (lib, store, app, components)
  </read_first>
  <action>
    Create frontend/package.json with name "clontwitter-frontend" and dependencies: next@^14, react@^18, react-dom@^18, axios@^1, zustand@^4. devDependencies: typescript@^5, @types/react@^18, @types/react-dom@^18, @types/node, tailwindcss@^3, postcss@^8, autoprefixer@^10, eslint@^8, eslint-config-next@^14. Pin React to 18 (STACK.md: Next 14 requires React 18, do not use React 19). Scripts: "dev": "next dev", "build": "next build", "start": "next start", "lint": "next lint".
    Create frontend/tsconfig.json with Next.js defaults: strict true, jsx "preserve", moduleResolution "bundler", paths { "@/*": ["./src/*"] }, plugins [{ "name": "next" }], include the next-env.d.ts and src globs.
    Create frontend/next.config.js as a minimal module.exports = {} (no rewrites needed — Axios talks to the backend directly via NEXT_PUBLIC_API_URL).
    Create frontend/postcss.config.js exporting plugins { tailwindcss: {}, autoprefixer: {} }.
    Create frontend/tailwind.config.ts with content globs ["./src/**/*.{ts,tsx}"], theme.extend {}, plugins [].
    Create frontend/.eslintrc.json extending "next/core-web-vitals".
    Create frontend/src/app/globals.css with the three @tailwind directives (base, components, utilities).
    Create frontend/src/app/layout.tsx as the root layout (App Router): export metadata { title: 'ClonTwitter' }, import './globals.css', and render <html lang="es"><body>{children}</body></html>. lang="es" because the UI is Spanish (L10N-01 target), while all code/identifiers stay English (L10N-02).
  </action>
  <verify>
    <automated>cd frontend && npm install && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - frontend/package.json pins react and react-dom to ^18 (not 19) and next to ^14
    - `cd frontend && npm install` exits 0
    - `npx tsc --noEmit` reports no type errors
    - frontend/src/app/globals.css contains @tailwind base, @tailwind components, @tailwind utilities
    - frontend/src/app/layout.tsx imports './globals.css' and sets html lang="es"
    - tsconfig.json defines the @/* path alias mapping to ./src/*
  </acceptance_criteria>
  <done>npm install and tsc pass; Tailwind is wired via postcss + globals.css; root layout imports globals and sets lang="es".</done>
</task>

<task type="auto">
  <name>Task 2: Zustand auth store and Axios instance with auto-refresh interceptors</name>
  <files>frontend/src/store/authStore.ts, frontend/src/lib/api.ts</files>
  <read_first>
    - docs/decisions/001-auth-jwt-localstorage.md (full ADR) — token lifetimes, localStorage storage, interceptor refresh contract, server-side refresh invalidation
    - .planning/research/STACK.md ("Stack Patterns by Variant" → "For JWT auto-refresh on the frontend") — request/response interceptor pattern, _retry guard against infinite loops
    - frontend/tsconfig.json (from Task 1) — confirm @/* alias for imports
  </read_first>
  <action>
    Create frontend/src/store/authStore.ts using zustand's create. Define exported constants ACCESS_TOKEN_KEY = 'accessToken' and REFRESH_TOKEN_KEY = 'refreshToken'. State: user (typed per <interfaces>, default null) and accessToken (string | null, initialized by reading localStorage.getItem(ACCESS_TOKEN_KEY) only when typeof window !== 'undefined' to stay SSR-safe). Actions: setAuth({ user, accessToken, refreshToken }) writes both tokens to localStorage and sets { user, accessToken } in state; clearAuth() removes both keys from localStorage and resets state to { user: null, accessToken: null }. Export a useAuthStore hook.
    Create frontend/src/lib/api.ts: create an Axios instance with baseURL: process.env.NEXT_PUBLIC_API_URL. Add a request interceptor that, when typeof window !== 'undefined', reads localStorage.getItem(ACCESS_TOKEN_KEY) and sets config.headers.Authorization = `Bearer ${token}` when present. Add a response interceptor: on a rejected response with status 401 and the original request config lacking a `_retry` flag, set _retry = true, read REFRESH_TOKEN_KEY from localStorage, call POST `${baseURL}/auth/refresh` with { refreshToken } using a bare axios call (not the instance, to avoid interceptor recursion); on success write the new accessToken to localStorage (ACCESS_TOKEN_KEY) and retry the original request with the updated Authorization header; on refresh failure (or missing refresh token) clear both localStorage keys and redirect via window.location.assign('/login'), then reject. The _retry flag prevents an infinite refresh loop (STACK.md guard). Reuse the ACCESS_TOKEN_KEY / REFRESH_TOKEN_KEY constants imported from authStore.ts — do not duplicate string literals. All identifiers and comments in English (L10N-02). Export the configured instance as default.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit && grep -q "_retry" src/lib/api.ts && grep -q "NEXT_PUBLIC_API_URL" src/lib/api.ts && grep -q "auth/refresh" src/lib/api.ts && grep -q "clearAuth\|removeItem" src/store/authStore.ts</automated>
  </verify>
  <acceptance_criteria>
    - frontend/src/lib/api.ts sets the Axios baseURL from process.env.NEXT_PUBLIC_API_URL
    - The request interceptor attaches `Authorization: Bearer <token>` only when a token exists and window is defined
    - The response interceptor handles 401 by calling POST /auth/refresh exactly once (guarded by a _retry flag) and retries the original request on success
    - On refresh failure the interceptor clears both token keys and redirects to /login
    - authStore.ts exports useAuthStore with user, accessToken, setAuth, clearAuth
    - The localStorage key strings are defined once as exported constants and reused in api.ts (no duplicated literals)
    - `npx tsc --noEmit` passes
  </acceptance_criteria>
  <done>tsc passes; Axios instance reads NEXT_PUBLIC_API_URL, attaches Bearer tokens, silently refreshes on 401 with a _retry guard, and clears+redirects on refresh failure; Zustand store manages tokens in localStorage.</done>
</task>

<task type="auto">
  <name>Task 3: Auth-gated home page</name>
  <files>frontend/src/app/page.tsx</files>
  <read_first>
    - frontend/src/store/authStore.ts (from Task 2) — useAuthStore hook and accessToken field
    - docs/decisions/001-auth-jwt-localstorage.md — confirms redirect-to-login behavior for unauthenticated users
    - AGENTS.md (Language) — UI text in Spanish, code in English
  </read_first>
  <action>
    Create frontend/src/app/page.tsx as a Client Component ('use client' at top). Read accessToken from useAuthStore. In a useEffect, if there is no accessToken (and no localStorage accessToken), call the Next.js router (useRouter from next/navigation) to redirect to '/login'. While unauthenticated/redirecting, render null or a minimal Spanish loading placeholder (e.g. text "Cargando..."). When authenticated, render a placeholder home container with a Spanish heading (e.g. "Inicio") — the real timeline lands in Phase 3. UI-visible strings are Spanish (L10N-01); identifiers, comments, file names stay English (L10N-02). The /login route itself does not exist yet (Phase 3) — that is expected; this only wires the redirect decision.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit && grep -q "use client" src/app/page.tsx && grep -q "login" src/app/page.tsx && grep -q "useRouter\|redirect" src/app/page.tsx</automated>
  </verify>
  <acceptance_criteria>
    - frontend/src/app/page.tsx begins with 'use client'
    - The page reads accessToken from useAuthStore and redirects to '/login' when absent
    - Any user-visible string in the page is in Spanish (e.g. "Cargando...", "Inicio")
    - `npx tsc --noEmit` passes
  </acceptance_criteria>
  <done>tsc passes; home page redirects unauthenticated users to /login and shows a Spanish placeholder when authenticated.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| localStorage → app | JWT access + refresh tokens live in localStorage (ADR-001); readable by any JS on the page |
| frontend → backend API | All requests cross to the Express API; auth depends on the Bearer token + refresh flow |
| package registry → node_modules | Third-party packages installed and executed during build |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-04 | Information Disclosure | localStorage token storage | accept | localStorage XSS exposure is an accepted, documented trade-off in ADR-001 (challenge mandates JWT-in-localStorage, not httpOnly cookies); mitigated by avoiding third-party scripts and sanitizing user input in later phases |
| T-01-05 | Elevation of Privilege | Axios refresh interceptor | mitigate | Refresh retry is guarded by a single _retry flag to prevent infinite loops; the refresh call uses a bare axios client so it cannot recurse through the instance interceptor; on failure tokens are cleared and the user is forced back to /login |
| T-01-06 | Spoofing | baseURL source | mitigate | API baseURL comes only from NEXT_PUBLIC_API_URL env var, never hardcoded; misconfiguration fails loudly via network errors rather than silently pointing at a wrong host |
| T-01-SC | Tampering | npm installs (next, react, axios, zustand, tailwindcss) | accept | All packages are mainstream high-download libraries mandated by STACK.md "Installation"; no [ASSUMED]/[SUS] packages introduced |
</threat_model>

<verification>
- `cd frontend && npm install` succeeds (exit 0)
- `npx tsc --noEmit` passes with zero type errors
- api.ts baseURL resolves from NEXT_PUBLIC_API_URL; request interceptor attaches Bearer token; response interceptor refreshes once on 401 and redirects to /login on failure
- authStore.ts exposes { user, accessToken, setAuth, clearAuth } and persists tokens to localStorage
- page.tsx redirects to /login when no accessToken is present
</verification>

<success_criteria>
1. Frontend dependencies install and the project type-checks with no errors
2. Tailwind is configured and the root layout renders with lang="es"
3. Axios instance is wired to NEXT_PUBLIC_API_URL with working request (Bearer) and response (silent-refresh) interceptors per ADR-001
4. Zustand auth store manages { user, accessToken } and persists tokens to localStorage
5. Home page enforces the auth gate by redirecting unauthenticated users to /login
6. All UI-visible text is Spanish; all code/identifiers are English (L10N-02)
</success_criteria>

<output>
Create `.planning/phases/01-scaffolding-infrastructure/01-02-SUMMARY.md` when done
</output>

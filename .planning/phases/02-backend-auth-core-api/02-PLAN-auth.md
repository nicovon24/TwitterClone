---
phase: 02-backend-auth-core-api
plan: 01
type: execute
wave: 1
depends_on: [01-PLAN-backend-scaffold]
files_modified:
  - backend/src/middleware/requireAuth.ts
  - backend/src/services/authService.ts
  - backend/src/routes/auth.routes.ts
  - backend/src/app.ts
autonomous: true
requirements: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07]
user_setup: []

must_haves:
  truths:
    - "POST /auth/register returns 201 with { accessToken, refreshToken, user } on valid input"
    - "POST /auth/register returns 409 when email or username already taken"
    - "POST /auth/login returns 200 with { accessToken, refreshToken, user } on valid credentials"
    - "POST /auth/login returns 401 on wrong password"
    - "POST /auth/refresh returns 200 with a new accessToken when given a valid refreshToken"
    - "GET /auth/me returns 401 when no Authorization header is present"
    - "GET /auth/me returns the authenticated user when a valid access token is provided"
    - "requireAuth middleware attaches req.user = { id, email } on a valid token and returns 401 otherwise"
    - "Passwords are hashed with bcryptjs before storage; refresh tokens are stored as bcrypt hashes"
    - "Access token expires in 15 minutes; refresh token expires in 30 days"
  artifacts:
    - path: "backend/src/middleware/requireAuth.ts"
      provides: "Express middleware that verifies JWT and attaches req.user"
      contains: "req.user"
    - path: "backend/src/services/authService.ts"
      provides: "register, login, logout, refresh, me business logic"
      contains: "bcryptjs"
    - path: "backend/src/routes/auth.routes.ts"
      provides: "Auth router mounted at /auth with 5 endpoints"
      contains: "Router"
  key_links:
    - from: "backend/src/routes/auth.routes.ts"
      to: "backend/src/middleware/requireAuth.ts"
      via: "requireAuth applied to /logout and /me"
      pattern: "requireAuth"
    - from: "backend/src/app.ts"
      to: "backend/src/routes/auth.routes.ts"
      via: "app.use('/auth', authRouter)"
      pattern: "authRouter"
    - from: "backend/src/services/authService.ts"
      to: "backend/src/db/index.ts"
      via: "import db from db/index"
      pattern: "db"
---

<objective>
Implement the full authentication layer: register, login, logout, refresh, and me endpoints, plus the requireAuth middleware that protects all Phase 2 routes.

Purpose: Every subsequent endpoint (tweets, follows, likes, search, profile) requires a working auth system. requireAuth must be in place before any of those routes can be written. This plan produces the security foundation the entire API stands on.
Output: Five auth endpoints responding with the correct status codes, JWT middleware that attaches req.user, and bcrypt-hashed passwords/refresh-tokens persisted in the users table.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/research/STACK.md
@docs/api.md
@docs/decisions/001-auth-jwt-localstorage.md
@AGENTS.md

<interfaces>
<!-- Auth contract from docs/api.md -->

POST /auth/register
  Body: { username: string (3–20 chars, alphanumeric+_), email: string, password: string (min 8) }
  201: { accessToken: string, refreshToken: string, user: { id, username, email, display_name, bio, avatar_url } }
  400: validation error | 409: email or username taken

POST /auth/login
  Body: { email: string, password: string }
  200: { accessToken: string, refreshToken: string, user: { id, username, email, display_name, bio, avatar_url } }
  400: validation | 401: invalid credentials

POST /auth/logout  (requireAuth)
  200: { message: "Logged out" }  — clears refresh_token_hash in DB

POST /auth/refresh
  Body: { refreshToken: string }
  200: { accessToken: string }
  401: invalid or expired refresh token

GET /auth/me  (requireAuth)
  200: { id, username, email, display_name, bio, avatar_url }
  401: no or invalid token

requireAuth middleware:
  Header: Authorization: Bearer <accessToken>
  On valid token: attach req.user = { id: string, email: string }; call next()
  On missing/invalid/expired: respond 401 { error: "Unauthorized" }
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: requireAuth middleware</name>
  <files>backend/src/middleware/requireAuth.ts</files>
  <read_first>
    - backend/src/env.ts — import env.JWT_SECRET
    - .planning/research/STACK.md ("Auth Layer") — jsonwebtoken 9.x, token shape
    - docs/decisions/001-auth-jwt-localstorage.md — token storage and expiry requirements
  </read_first>
  <action>
    Create backend/src/middleware/requireAuth.ts. Import jsonwebtoken and env. Define a RequestHandler that:
    1. Reads the Authorization header; if missing or not "Bearer <token>" format, respond 401 { error: "Unauthorized" } and return.
    2. Calls jwt.verify(token, env.JWT_SECRET); on JWTExpiredError or any verify error, respond 401 { error: "Unauthorized" } and return.
    3. On success, cast the payload to { id: string; email: string } and assign req.user = payload; call next().
    Extend the Express Request type in a declaration file (or inline) so req.user is typed as { id: string; email: string } | undefined.
    All code and comments in English (L10N-02).
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit && grep -q "req.user" src/middleware/requireAuth.ts</automated>
  </verify>
  <acceptance_criteria>
    - requireAuth.ts exports a RequestHandler that attaches req.user on valid JWT
    - Missing or malformed Authorization header → 401 { error: "Unauthorized" }
    - Expired token → 401 { error: "Unauthorized" }
    - req.user type is { id: string; email: string } (TypeScript compiles with no errors)
  </acceptance_criteria>
  <done>tsc passes; requireAuth correctly guards routes and attaches typed req.user.</done>
</task>

<task type="auto">
  <name>Task 2: authService — register, login, logout, refresh, me</name>
  <files>backend/src/services/authService.ts</files>
  <read_first>
    - backend/src/db/schema.ts — users table columns (password_hash, refresh_token_hash, refresh_token_expires_at)
    - backend/src/env.ts — JWT_SECRET, REFRESH_TOKEN_SECRET
    - .planning/research/STACK.md ("Auth Layer") — bcryptjs, token expiry (15min access / 30d refresh)
    - docs/decisions/001-auth-jwt-localstorage.md — refresh token rotation approach
  </read_first>
  <action>
    Create backend/src/services/authService.ts with five exported async functions:

    register({ username, email, password }):
      - Check if email or username already exists in users table; if so throw an error with status 409.
      - Hash password with bcrypt (rounds 10).
      - Insert user into DB; return { accessToken, refreshToken, user }.
      - Generate accessToken: jwt.sign({ id, email }, env.JWT_SECRET, { expiresIn: '15m' }).
      - Generate refreshToken: crypto.randomUUID() as the raw value; hash it with bcrypt before storing in users.refresh_token_hash; also store refresh_token_expires_at = now + 30 days.
      - Return raw (unhashed) refreshToken to the caller.

    login({ email, password }):
      - Find user by email; if not found throw 401.
      - Compare password with bcrypt; if mismatch throw 401.
      - Generate and return new accessToken + refreshToken (same rotation as register).

    logout(userId):
      - Set users.refresh_token_hash = null and users.refresh_token_expires_at = null for the user.

    refresh({ refreshToken }):
      - Find user whose refresh_token_expires_at > now (non-null).
      - Compare raw refreshToken against all non-expired entries (there may only be one per user).
      - Actually: query users WHERE refresh_token_expires_at > now() and id is unknown — so the caller must pass the raw token. Decode it enough to get user id, OR require the client to also pass userId. Best approach: embed userId in the refresh token as a JWT signed with REFRESH_TOKEN_SECRET instead of a random UUID — simpler, no DB scan. Use jwt.sign({ id, email }, env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' }) for the refreshToken; store its bcrypt hash in DB. On refresh: verify JWT with REFRESH_TOKEN_SECRET to get { id }; load user; bcrypt.compare raw token with stored hash; if match and not expired issue new accessToken; rotate the refresh token (new hash stored).
      - If invalid or expired throw 401.

    me(userId):
      - Select user by id; return { id, username, email, display_name, bio, avatar_url }.

    All thrown errors must have a .status property so errorHandler.ts can read it (e.g., const err = new Error(...) as any; err.status = 409; throw err).
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit && grep -q "bcryptjs" src/services/authService.ts && grep -q "REFRESH_TOKEN_SECRET" src/services/authService.ts</automated>
  </verify>
  <acceptance_criteria>
    - authService.ts uses bcryptjs for password AND refresh token hashing
    - Refresh token is a signed JWT (REFRESH_TOKEN_SECRET, 30d); its bcrypt hash is stored in users.refresh_token_hash
    - Access token is a signed JWT (JWT_SECRET, 15m)
    - Duplicate email/username throws with status 409
    - Wrong password throws with status 401
    - me() returns the user object without password_hash or refresh_token_hash
    - tsc passes with no type errors
  </acceptance_criteria>
  <done>authService exports all five functions; bcrypt and JWT used correctly; duplicate/invalid credential errors carry the correct HTTP status code.</done>
</task>

<task type="auto">
  <name>Task 3: auth router + wire into app.ts</name>
  <files>backend/src/routes/auth.routes.ts, backend/src/app.ts</files>
  <read_first>
    - docs/api.md (Auth section) — request/response shapes per endpoint
    - backend/src/services/authService.ts (Task 2) — function signatures
    - backend/src/middleware/requireAuth.ts (Task 1) — import path
    - backend/src/app.ts — existing placeholder comment for Phase 2 routes
  </read_first>
  <action>
    Create backend/src/routes/auth.routes.ts using express.Router():

    POST /register — Zod validate body (username min 3 max 20 alphanumeric+_, email valid, password min 8); call authService.register(); respond 201 with { accessToken, refreshToken, user }.
    POST /login — Zod validate (email, password); call authService.login(); respond 200.
    POST /logout — apply requireAuth; call authService.logout(req.user.id); respond 200 { message: "Logged out" }.
    POST /refresh — Zod validate body has refreshToken string; call authService.refresh(); respond 200 { accessToken }.
    GET /me — apply requireAuth; call authService.me(req.user.id); respond 200 with user object.

    Zod validation errors are thrown as ZodErrors and caught by errorHandler (already handles ZodError → 400).
    Status errors from authService propagate automatically via express-async-errors.

    Update backend/src/app.ts: import authRouter and add app.use('/auth', authRouter) BEFORE the errorHandler registration line. Keep the placeholder comment for remaining Phase 2 routes.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit && grep -q "authRouter" src/app.ts && grep -q "/register" src/routes/auth.routes.ts</automated>
  </verify>
  <acceptance_criteria>
    - auth.routes.ts defines 5 routes (register, login, logout, refresh, me)
    - /logout and /me apply requireAuth middleware
    - Zod validates all request bodies; ZodError propagates to errorHandler → 400
    - app.ts mounts authRouter at /auth before errorHandler
    - tsc passes with no type errors
  </acceptance_criteria>
  <done>All five auth endpoints are wired and respond with the correct shapes per docs/api.md; app.ts mounts the router before the error handler.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → /auth/register | Untrusted user-supplied email, username, password |
| client → /auth/login | Untrusted credentials; timing-safe comparison required |
| client → requireAuth | Untrusted JWT; must verify signature and expiry |
| client → /auth/refresh | Untrusted refresh token; verify both JWT signature and bcrypt hash |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Spoofing | requireAuth.ts | mitigate | jwt.verify with env.JWT_SECRET rejects tampered or forged tokens; expired tokens rejected |
| T-02-02 | Information Disclosure | authService login | mitigate | bcrypt.compare is timing-safe; same 401 message for wrong email or wrong password (no user enumeration) |
| T-02-03 | Tampering | refresh token | mitigate | Refresh token is a signed JWT (REFRESH_TOKEN_SECRET) + bcrypt hash stored in DB; raw token is never persisted |
| T-02-04 | Information Disclosure | me() / user responses | mitigate | password_hash and refresh_token_hash are never included in any API response |
| T-02-05 | Injection | Zod validation | mitigate | All auth inputs validated by Zod schema before reaching service layer; no raw SQL string interpolation |
</threat_model>

<verification>
- POST /auth/register with valid body → 201 + { accessToken, refreshToken, user }
- POST /auth/register with duplicate email → 409
- POST /auth/login with wrong password → 401
- POST /auth/refresh with valid refreshToken → 200 + new accessToken
- GET /auth/me with valid Bearer token → 200 + user object
- GET /auth/me without token → 401
- `cd backend && npx tsc --noEmit` passes with zero errors
</verification>

<success_criteria>
1. All five auth endpoints respond with correct status codes per docs/api.md
2. requireAuth middleware protects /logout and /me; attaches typed req.user
3. Passwords and refresh tokens stored as bcrypt hashes; raw values never persisted
4. Access tokens expire in 15 minutes; refresh tokens in 30 days
5. tsc compiles with no errors
</success_criteria>

<output>
Create `.planning/phases/02-backend-auth-core-api/02-01-SUMMARY.md` when done
</output>

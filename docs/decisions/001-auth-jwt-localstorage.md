# 001 — Auth: JWT + localStorage + Refresh Tokens

## Status
Accepted

## Context
The project needs stateless authentication for a SPA (Next.js) consuming a REST API (Express). Three approaches were evaluated: server-side sessions, JWT in httpOnly cookie, and JWT in localStorage with refresh tokens. The main constraint is that the frontend (Vercel) and backend (Render) are on different origins, which complicates cookie management with `SameSite` and `Secure` attributes. A refresh token strategy was chosen to balance security with session longevity.

## Decision
- The backend signs a **short-lived access token** (expires in **15 minutes**) and a **long-lived refresh token** (expires in **30 days**) on login/register.
- Both tokens are returned in the response body and stored by the frontend in **localStorage**.
- The frontend's Axios instance has a response interceptor that automatically requests a new access token when it receives a `401`. It uses `POST /auth/refresh` with the stored refresh token.
- The backend stores a hash of the refresh token in the `users` table (`refresh_token_hash`, `refresh_token_expires_at`). On logout, the hash is cleared — invalidating the refresh token server-side.
- All protected routes read the access token from the `Authorization: Bearer <token>` header.
- Maximum session length: **30 days** (refresh token lifetime). After that, the user must log in again.

## Consequences

**Advantages:**
- Works seamlessly across different origins (Vercel frontend + Render backend) without cookie configuration.
- Short-lived access tokens (15 min) limit the damage window if one is leaked.
- Refresh tokens can be invalidated server-side on logout, unlike pure JWT sessions.
- Simpler CORS setup — no need for `credentials: include` or `SameSite` tuning.

**Disadvantages:**
- localStorage is accessible from JavaScript, making tokens vulnerable to XSS if third-party scripts are injected. Mitigated by avoiding third-party scripts and sanitizing all user input.
- Requires the frontend to handle token refresh logic (Axios interceptor).
- Requires storing refresh token state on the server (breaks pure statelessness).

## Date
2026-06-04

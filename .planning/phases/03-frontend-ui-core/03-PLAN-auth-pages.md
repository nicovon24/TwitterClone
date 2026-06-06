---
phase: 03-frontend-ui-core
plan: 01
type: execute
wave: 1
depends_on: [01-PLAN-frontend-scaffold]
files_modified:
  - frontend/src/app/login/page.tsx
  - frontend/src/app/register/page.tsx
  - frontend/src/app/page.tsx
autonomous: true
requirements: [L10N-01]
user_setup: []

must_haves:
  truths:
    - "Login con credenciales válidas guarda accessToken y refreshToken en localStorage, llama setAuth, y redirige a /"
    - "Login con contraseña incorrecta muestra el mensaje 'Credenciales inválidas' sin redirigir"
    - "Acceso directo a / sin token en localStorage redirige a /login"
    - "Register con datos válidos crea la cuenta, guarda tokens, y redirige a /"
    - "Register con username/email duplicado muestra mensaje de error en español sin redirigir"
    - "Todos los labels, placeholders y mensajes de error están en español"
    - "El formulario de register valida client-side: password mínimo 8 chars, email válido, username 3–20 chars"
  artifacts:
    - path: "frontend/src/app/login/page.tsx"
      provides: "Página de login con formulario email+password y manejo de errores en español"
      contains: "POST /auth/login"
    - path: "frontend/src/app/register/page.tsx"
      provides: "Página de registro con formulario completo y validación client-side"
      contains: "POST /auth/register"
    - path: "frontend/src/app/page.tsx"
      provides: "Home page con auth guard — redirige a /login si no hay token"
      contains: "useAuthStore"
  key_links:
    - from: "frontend/src/app/login/page.tsx"
      to: "frontend/src/lib/api.ts"
      via: "import api from '@/lib/api'"
      pattern: "api.post('/auth/login')"
    - from: "frontend/src/app/login/page.tsx"
      to: "frontend/src/store/authStore.ts"
      via: "import { useAuthStore } from '@/store/authStore'"
      pattern: "setAuth"
    - from: "frontend/src/app/page.tsx"
      to: "frontend/src/store/authStore.ts"
      via: "import { useAuthStore } from '@/store/authStore'"
      pattern: "accessToken"
---

<objective>
Implement the login and register pages plus the auth guard on the home page.

Purpose: These pages are the entry point for every user. Without working auth pages, no feature of the app is reachable. This plan produces the complete auth flow: form submission, token storage, Zustand state sync, redirect on success, and Spanish error messages on failure.
Output: Three client-side pages — login, register, and a guarded home — that together enforce the access control rule: unauthenticated users cannot reach any protected route.
</objective>

<execution_context>
@AGENTS.md
@docs/api.md
@frontend/src/lib/api.ts
@frontend/src/store/authStore.ts
@frontend/src/app/layout.tsx
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@docs/api.md
@AGENTS.md

<interfaces>
<!-- Auth contract from docs/api.md -->

POST /auth/login
  Body: { email: string, password: string }
  200: { accessToken: string, refreshToken: string, user: { id, username, email, display_name, bio, avatar_url } }
  400: validation error
  401: invalid credentials → { error: "Credenciales inválidas" }

POST /auth/register
  Body: { username: string (3–20 alphanum+_), email: string, password: string (min 8) }
  201: { accessToken: string, refreshToken: string, user: { id, username, email, display_name, bio, avatar_url } }
  400: validation error
  409: email or username taken → { error: "El usuario o email ya está en uso" }

Existing infrastructure:
  - frontend/src/lib/api.ts — Axios instance with baseURL from NEXT_PUBLIC_API_URL and JWT interceptors
  - frontend/src/store/authStore.ts — Zustand: { user, accessToken, setAuth(payload), clearAuth() }
  - ACCESS_TOKEN_KEY = 'accessToken', REFRESH_TOKEN_KEY = 'refreshToken' exported from authStore
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Login page</name>
  <files>frontend/src/app/login/page.tsx</files>
  <read_first>
    - frontend/src/lib/api.ts — import path and post() usage
    - frontend/src/store/authStore.ts — setAuth signature: { user, accessToken, refreshToken }
    - docs/api.md (POST /auth/login section) — request and response shapes
  </read_first>
  <action>
    Replace the current stub at frontend/src/app/login/page.tsx with a full login page:

    'use client'

    State: email (string), password (string), error (string | null), loading (boolean).

    JSX: centered card layout with:
    - Heading "Iniciar sesión"
    - Input email (type="email", placeholder="Correo electrónico", label "Correo electrónico")
    - Input password (type="password", placeholder="Contraseña", label "Contraseña")
    - Submit button "Iniciar sesión" (disabled when loading)
    - Error paragraph (rendered only when error !== null) — red text below the form
    - Link "¿No tenés cuenta? Registrate" → href="/register"

    handleSubmit:
    1. Set loading=true, error=null.
    2. Call api.post('/auth/login', { email, password }).
    3. On success: call setAuth({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken }); router.push('/').
    4. On AxiosError with status 401: set error = "Credenciales inválidas".
    5. On any other error: set error = "Ocurrió un error. Intentá de nuevo.".
    6. Always: set loading=false.

    Use useRouter from 'next/navigation'. Import api from '@/lib/api'. Import useAuthStore from '@/store/authStore'. All labels in Spanish.
    Apply Tailwind for basic layout: max-w-sm mx-auto mt-16 p-6 flex flex-col gap-4.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Form has email and password fields with Spanish labels
    - Submit calls POST /auth/login via api.ts
    - On 200: setAuth called + router.push('/')
    - On 401: shows "Credenciales inválidas" below form
    - Submit button disabled while loading
    - Link to /register present
    - tsc passes with no errors in this file
  </acceptance_criteria>
  <done>Login page renders, submits, handles errors in Spanish, and redirects on success.</done>
</task>

<task type="auto">
  <name>Task 2: Register page</name>
  <files>frontend/src/app/register/page.tsx</files>
  <read_first>
    - frontend/src/app/login/page.tsx (Task 1) — follow the same pattern
    - docs/api.md (POST /auth/register section) — body shape and error codes
    - frontend/src/store/authStore.ts — setAuth signature
  </read_first>
  <action>
    Create frontend/src/app/register/page.tsx:

    'use client'

    State: username, email, displayName, password (strings), error (string | null), loading (boolean).

    Client-side validation before submitting (set error and return early if fails):
    - username: length 3–20, /^[a-zA-Z0-9_]+$/.test(username) → error "El nombre de usuario debe tener entre 3 y 20 caracteres alfanuméricos"
    - email: /.+@.+\..+/.test(email) → error "Ingresá un email válido"
    - password: length ≥ 8 → error "La contraseña debe tener al menos 8 caracteres"

    JSX: same card layout as login, with fields:
    - "Nombre de usuario" (username)
    - "Nombre para mostrar" (display_name — optional field, can be empty)
    - "Correo electrónico" (email)
    - "Contraseña" (password, type="password")
    - Submit button "Crear cuenta"
    - Error paragraph
    - Link "¿Ya tenés cuenta? Iniciá sesión" → href="/login"

    handleSubmit: POST /auth/register with { username, email, password, display_name: displayName || username }.
    On 201: setAuth + router.push('/').
    On 409: error = "El usuario o email ya está en uso".
    On 400: error = "Datos inválidos. Revisá el formulario".
    On any other: error = "Ocurrió un error. Intentá de nuevo.".
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Four fields: username, display_name (optional), email, password
    - Client-side validation runs before API call; errors shown in Spanish
    - On 201: setAuth + redirect to /
    - On 409: shows "El usuario o email ya está en uso"
    - Link to /login present
    - tsc passes with no errors in this file
  </acceptance_criteria>
  <done>Register page renders with validation, handles all API error cases in Spanish, redirects on success.</done>
</task>

<task type="auto">
  <name>Task 3: Home page auth guard</name>
  <files>frontend/src/app/page.tsx</files>
  <read_first>
    - frontend/src/app/page.tsx — current state (has useEffect redirect skeleton)
    - frontend/src/store/authStore.ts — accessToken field
  </read_first>
  <action>
    Update frontend/src/app/page.tsx:

    'use client'

    Keep the existing useEffect that redirects to /login if !accessToken.
    Replace the <h1>Inicio</h1> placeholder with a temporary <p>Cargando timeline...</p> placeholder — this will be replaced in Plan 03-02 when Timeline component is built.

    The auth guard logic (already present) must remain:
    - const accessToken = useAuthStore(state => state.accessToken)
    - useEffect: if (!accessToken) router.replace('/login')
    - if (!accessToken) return <p>Cargando...</p>

    Only change: replace <h1>Inicio</h1> with the placeholder that signals Plan 03-02 will fill this in.

    Note: this task is minimal — the important work is in Tasks 1 and 2. The home page will be fully implemented in Plan 03-02.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - Unauthenticated access to / triggers router.replace('/login')
    - Authenticated access to / renders without crash (placeholder content is fine)
    - tsc passes
  </acceptance_criteria>
  <done>Home page redirects unauthenticated users to /login; shows placeholder for timeline.</done>
</task>

</tasks>

<verification>
- cd frontend && npm run dev → no compile errors in terminal
- Visit http://localhost:3000 without token → redirects to /login
- Fill login form with valid credentials → redirects to /
- Fill login form with wrong password → shows "Credenciales inválidas" under the form
- Visit /register → form renders with 4 fields in Spanish
- cd frontend && npx tsc --noEmit → exits 0
</verification>

<success_criteria>
1. Login page submits to POST /auth/login, stores tokens, redirects to / on success
2. Login page shows "Credenciales inválidas" on 401 without redirecting
3. Register page validates client-side and shows Spanish errors before hitting the API
4. Home page redirects to /login when no accessToken in localStorage
5. All form labels, placeholders, and error messages are in Spanish
6. tsc compiles with no errors
</success_criteria>

<output>
Create `.planning/phases/03-frontend-ui-core/03-01-SUMMARY.md` when done
</output>

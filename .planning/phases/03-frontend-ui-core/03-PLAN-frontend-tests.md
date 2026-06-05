---
phase: 03-frontend-ui-core
plan: 04
type: execute
wave: 3
depends_on: [03-PLAN-timeline-composer-sse, 03-PLAN-profile-search-layout]
files_modified:
  - frontend/package.json
  - frontend/vitest.config.ts
  - frontend/src/__tests__/setup.ts
  - frontend/src/__tests__/login.test.tsx
  - frontend/src/__tests__/tweet.test.tsx
  - frontend/src/__tests__/follow.test.tsx
autonomous: true
requirements: [TEST-03]
user_setup: []

must_haves:
  truths:
    - "npm test en frontend pasa las 3 suites con exit 0"
    - "login.test.tsx: submit con credenciales válidas guarda tokens en localStorage y llama router.push('/')"
    - "login.test.tsx: submit con credenciales inválidas muestra 'Credenciales inválidas' sin redirigir"
    - "tweet.test.tsx: submit de TweetComposer llama POST /tweets y prepende al store"
    - "tweet.test.tsx: textarea con 281 caracteres tiene el botón de submit deshabilitado"
    - "follow.test.tsx: click Seguir llama POST /follows/:username y cambia el texto a 'Dejar de seguir'"
    - "follow.test.tsx: click Dejar de seguir llama DELETE /follows/:username y revierte el texto"
    - "Cada test es independiente — no comparte estado entre it() blocks"
    - "No se mockean módulos enteros de React — solo las llamadas a api.ts"
  artifacts:
    - path: "frontend/vitest.config.ts"
      provides: "Vitest config with jsdom environment and setup file"
      contains: "jsdom"
    - path: "frontend/src/__tests__/login.test.tsx"
      provides: "3 tests para el login page"
      contains: "Credenciales inválidas"
    - path: "frontend/src/__tests__/tweet.test.tsx"
      provides: "3 tests para TweetComposer"
      contains: "POST /tweets"
    - path: "frontend/src/__tests__/follow.test.tsx"
      provides: "2 tests para follow/unfollow en búsqueda o perfil"
      contains: "POST /follows"
  key_links:
    - from: "frontend/src/__tests__/login.test.tsx"
      to: "frontend/src/app/login/page.tsx"
      via: "import LoginPage from '@/app/login/page'"
      pattern: "render(LoginPage)"
    - from: "frontend/src/__tests__/tweet.test.tsx"
      to: "frontend/src/components/TweetComposer.tsx"
      via: "import TweetComposer from '@/components/TweetComposer'"
      pattern: "vi.mock('@/lib/api')"
    - from: "frontend/src/__tests__/follow.test.tsx"
      to: "frontend/src/app/search/page.tsx"
      via: "import SearchPage from '@/app/search/page'"
      pattern: "vi.mock('@/lib/api')"
---

<objective>
Add Vitest + Testing Library to the frontend and write 3 test suites covering the login flow, tweet composition, and follow/unfollow interactions.

Purpose: These tests are the only automated safety net for the frontend. They verify the three most critical user interactions: getting in, posting content, and growing the social graph. Without them the app is unverifiable without manual testing on every change.
Output: 3 passing test suites, vitest config, and a test runner script in package.json.
</objective>

<execution_context>
@AGENTS.md
@frontend/src/app/login/page.tsx
@frontend/src/components/TweetComposer.tsx
@frontend/src/app/search/page.tsx
@frontend/src/store/authStore.ts
@frontend/src/store/timelineStore.ts
</execution_context>

<context>
@.planning/PROJECT.md
@docs/testing.md
@AGENTS.md

<interfaces>
Test dependencies to add:
  - vitest@^1 — test runner
  - @testing-library/react@^14 — render + queries
  - @testing-library/user-event@^14 — realistic user interactions
  - @testing-library/jest-dom@^6 — toBeInTheDocument, toBeDisabled etc.
  - jsdom@^24 — browser-like environment
  - @vitest/coverage-v8@^1 — coverage (optional, for consistency with backend)

Mock strategy:
  - vi.mock('@/lib/api') — mock the Axios instance; individual tests override with vi.mocked(api.post).mockResolvedValueOnce(...)
  - vi.mock('next/navigation') — mock useRouter; spy on push/replace
  - Do NOT mock React, Zustand, or any React hook directly
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install test dependencies and configure Vitest</name>
  <files>frontend/package.json, frontend/vitest.config.ts, frontend/src/__tests__/setup.ts</files>
  <read_first>
    - frontend/package.json — current devDependencies to understand what's already present
    - backend/vitest.config.ts — reference for vitest config format used in this project
  </read_first>
  <action>
    1. Add to frontend/package.json devDependencies:
       "vitest": "^1",
       "@vitest/coverage-v8": "^1",
       "@testing-library/react": "^14",
       "@testing-library/user-event": "^14",
       "@testing-library/jest-dom": "^6",
       "jsdom": "^24"

    Add to scripts:
       "test": "vitest run",
       "test:watch": "vitest"

    2. Create frontend/vitest.config.ts:
       import { defineConfig } from 'vitest/config'
       import react from '@vitejs/plugin-react'
       import path from 'path'

       export default defineConfig({
         plugins: [react()],
         test: {
           globals: true,
           environment: 'jsdom',
           setupFiles: ['./src/__tests__/setup.ts'],
         },
         resolve: {
           alias: {
             '@': path.resolve(__dirname, './src'),
           },
         },
       })

    Note: also needs @vitejs/plugin-react in devDeps:
       "@vitejs/plugin-react": "^4"

    3. Create frontend/src/__tests__/setup.ts:
       import '@testing-library/jest-dom'

       // Mock next/navigation globally for all tests
       vi.mock('next/navigation', () => ({
         useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
         useParams: () => ({}),
         usePathname: () => '/',
       }))

    4. Run: cd frontend && npm install
  </action>
  <verify>
    <automated>cd frontend && npm install && npx vitest run --reporter=verbose 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - vitest.config.ts sets environment: 'jsdom' and setupFiles
    - @testing-library/jest-dom imported in setup.ts
    - next/navigation mocked globally
    - cd frontend && npm test exits 0 (no test files yet — that's fine, "no tests found" is acceptable)
    - tsc passes on vitest.config.ts
  </acceptance_criteria>
  <done>Vitest configured with jsdom; Testing Library and jest-dom installed; next/navigation mocked globally.</done>
</task>

<task type="auto">
  <name>Task 2: login.test.tsx — 3 tests for the login page</name>
  <files>frontend/src/__tests__/login.test.tsx</files>
  <read_first>
    - frontend/src/app/login/page.tsx — component structure, error message text, button label
    - frontend/src/store/authStore.ts — setAuth signature
  </read_first>
  <action>
    Create frontend/src/__tests__/login.test.tsx:

    vi.mock('@/lib/api', () => ({
      default: {
        post: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
      },
    }))

    // Also mock the auth store so we can spy on setAuth
    // Use the real store but spy on setAuth
    import api from '@/lib/api'
    import { render, screen, waitFor } from '@testing-library/react'
    import userEvent from '@testing-library/user-event'
    import LoginPage from '@/app/login/page'
    import { useAuthStore } from '@/store/authStore'

    const mockPush = vi.fn()
    // Override the mock in setup for this test file to capture push
    vi.mock('next/navigation', () => ({
      useRouter: () => ({ push: mockPush, replace: vi.fn() }),
      useParams: () => ({}),
      usePathname: () => '/',
    }))

    beforeEach(() => {
      vi.clearAllMocks()
      // Clear auth store between tests
      useAuthStore.getState().clearAuth()
    })

    describe('LoginPage', () => {
      it('stores tokens and redirects to / on successful login', async () => {
        const fakeUser = { id: '1', username: 'alice', email: 'alice@test.com' }
        vi.mocked(api.post).mockResolvedValueOnce({
          data: { accessToken: 'access123', refreshToken: 'refresh123', user: fakeUser }
        })

        render(<LoginPage />)
        await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'alice@test.com')
        await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
        await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

        await waitFor(() => {
          expect(localStorage.getItem('accessToken')).toBe('access123')
          expect(mockPush).toHaveBeenCalledWith('/')
        })
      })

      it('shows "Credenciales inválidas" on 401 without redirecting', async () => {
        const error = { response: { status: 401 } }
        vi.mocked(api.post).mockRejectedValueOnce(error)

        render(<LoginPage />)
        await userEvent.type(screen.getByLabelText(/correo electrónico/i), 'alice@test.com')
        await userEvent.type(screen.getByLabelText(/contraseña/i), 'wrong')
        await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

        await waitFor(() => {
          expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument()
          expect(mockPush).not.toHaveBeenCalled()
        })
      })

      it('redirects to /login if user is already authenticated', async () => {
        // Simulate already-authed state by setting token in store
        useAuthStore.setState({ accessToken: 'existing_token', user: { id: '1', username: 'alice', email: 'a@a.com' } })
        const mockReplace = vi.fn()
        // Override router mock for this test
        vi.mocked(require('next/navigation').useRouter).mockReturnValueOnce({ push: vi.fn(), replace: mockReplace })

        render(<LoginPage />)
        // Note: the login page itself doesn't redirect if authed; the home page does.
        // This test verifies the form is still accessible (no auto-redirect on login page)
        expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
      })
    })

    Note: the third test is simplified — it just verifies the login page renders even if already authed (the home page is responsible for the redirect-if-authed logic, not the login page). Adjust test description accordingly.
  </action>
  <verify>
    <automated>cd frontend && npm test -- login 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - 3 tests in describe('LoginPage')
    - Successful login test: localStorage.getItem('accessToken') === 'access123' AND mockPush called with '/'
    - 401 test: "Credenciales inválidas" text appears AND push NOT called
    - Tests are independent (clearAllMocks + clearAuth in beforeEach)
    - All 3 pass
  </acceptance_criteria>
  <done>login.test.tsx: 3 tests pass covering success, 401 error, and render-while-authed cases.</done>
</task>

<task type="auto">
  <name>Task 3: tweet.test.tsx — 3 tests for TweetComposer</name>
  <files>frontend/src/__tests__/tweet.test.tsx</files>
  <read_first>
    - frontend/src/components/TweetComposer.tsx — button label, textarea placeholder, counter logic
    - frontend/src/store/timelineStore.ts — prependTweet, store shape
  </read_first>
  <action>
    Create frontend/src/__tests__/tweet.test.tsx:

    vi.mock('@/lib/api', () => ({
      default: { post: vi.fn(), delete: vi.fn(), get: vi.fn() }
    }))

    import api from '@/lib/api'
    import { render, screen, waitFor } from '@testing-library/react'
    import userEvent from '@testing-library/user-event'
    import TweetComposer from '@/components/TweetComposer'
    import { useTimelineStore } from '@/store/timelineStore'

    beforeEach(() => {
      vi.clearAllMocks()
      useTimelineStore.getState().reset()
    })

    describe('TweetComposer', () => {
      it('calls POST /tweets and prepends tweet to store on submit', async () => {
        const fakeTweet = {
          id: 'tweet-1', content: 'Hola mundo', created_at: new Date().toISOString(),
          user: { id: 'u1', username: 'alice', avatar_url: null },
          likes_count: 0, liked_by_me: false
        }
        vi.mocked(api.post).mockResolvedValueOnce({ data: fakeTweet })

        render(<TweetComposer />)
        await userEvent.type(screen.getByPlaceholderText(/qué está pasando/i), 'Hola mundo')
        await userEvent.click(screen.getByRole('button', { name: /twittear/i }))

        await waitFor(() => {
          expect(api.post).toHaveBeenCalledWith('/tweets', { content: 'Hola mundo' })
          expect(useTimelineStore.getState().tweets).toHaveLength(1)
          expect(useTimelineStore.getState().tweets[0].id).toBe('tweet-1')
        })
      })

      it('disables submit button when content exceeds 280 characters', async () => {
        render(<TweetComposer />)
        const textarea = screen.getByPlaceholderText(/qué está pasando/i)
        await userEvent.type(textarea, 'a'.repeat(281))

        expect(screen.getByRole('button', { name: /twittear/i })).toBeDisabled()
      })

      it('disables submit button when content is empty', () => {
        render(<TweetComposer />)
        expect(screen.getByRole('button', { name: /twittear/i })).toBeDisabled()
      })
    })
  </action>
  <verify>
    <automated>cd frontend && npm test -- tweet 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - Test 1: api.post called with correct args AND store has 1 tweet after submit
    - Test 2: button disabled when content.length > 280
    - Test 3: button disabled on mount (empty content)
    - All 3 pass
  </acceptance_criteria>
  <done>tweet.test.tsx: 3 tests pass covering submit, 280-char limit, and empty state.</done>
</task>

<task type="auto">
  <name>Task 4: follow.test.tsx — 2 tests for follow/unfollow in search page</name>
  <files>frontend/src/__tests__/follow.test.tsx</files>
  <read_first>
    - frontend/src/app/search/page.tsx — button text ("Seguir" / "Dejar de seguir"), query structure
    - frontend/src/store/authStore.ts — set a current user to enable follow buttons
  </read_first>
  <action>
    Create frontend/src/__tests__/follow.test.tsx:

    vi.mock('@/lib/api', () => ({
      default: { post: vi.fn(), delete: vi.fn(), get: vi.fn() }
    }))

    import api from '@/lib/api'
    import { render, screen, waitFor } from '@testing-library/react'
    import userEvent from '@testing-library/user-event'
    import SearchPage from '@/app/search/page'
    import { useAuthStore } from '@/store/authStore'

    const aliceUser = { id: 'current-user', username: 'currentuser', email: 'me@test.com' }
    const bobResult = {
      id: 'bob-id', username: 'bob', display_name: 'Bob', bio: null,
      avatar_url: null, is_following: false
    }

    beforeEach(() => {
      vi.clearAllMocks()
      useAuthStore.setState({ user: aliceUser, accessToken: 'token123' })
    })

    describe('Follow/Unfollow in Search', () => {
      it('clicking Seguir calls POST /follows/:username and updates button to Dejar de seguir', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: { users: [bobResult], next_cursor: null } })
        vi.mocked(api.post).mockResolvedValueOnce({ data: { message: 'Now following bob' } })

        render(<SearchPage />)
        // Type to trigger search
        await userEvent.type(screen.getByRole('textbox'), 'bob')

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /^seguir$/i })).toBeInTheDocument()
        })

        await userEvent.click(screen.getByRole('button', { name: /^seguir$/i }))

        await waitFor(() => {
          expect(api.post).toHaveBeenCalledWith('/follows/bob')
          expect(screen.getByRole('button', { name: /dejar de seguir/i })).toBeInTheDocument()
        })
      })

      it('clicking Dejar de seguir calls DELETE /follows/:username and updates button to Seguir', async () => {
        const followingBob = { ...bobResult, is_following: true }
        vi.mocked(api.get).mockResolvedValueOnce({ data: { users: [followingBob], next_cursor: null } })
        vi.mocked(api.delete).mockResolvedValueOnce({ data: { message: 'Unfollowed bob' } })

        render(<SearchPage />)
        await userEvent.type(screen.getByRole('textbox'), 'bob')

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /dejar de seguir/i })).toBeInTheDocument()
        })

        await userEvent.click(screen.getByRole('button', { name: /dejar de seguir/i }))

        await waitFor(() => {
          expect(api.delete).toHaveBeenCalledWith('/follows/bob')
          expect(screen.getByRole('button', { name: /^seguir$/i })).toBeInTheDocument()
        })
      })
    })
  </action>
  <verify>
    <automated>cd frontend && npm test -- follow 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - Test 1: api.post('/follows/bob') called; button text changes to "Dejar de seguir"
    - Test 2: api.delete('/follows/bob') called; button text changes back to "Seguir"
    - Tests are independent (beforeEach clears mocks and resets auth store)
    - Both pass
  </acceptance_criteria>
  <done>follow.test.tsx: 2 tests pass covering follow and unfollow interactions.</done>
</task>

</tasks>

<verification>
- cd frontend && npm install → installs test deps without errors
- cd frontend && npm test → all 3 suites pass, exit 0
- cd frontend && npx tsc --noEmit → exits 0
- No test imports any React internals or mocks React hooks directly
</verification>

<success_criteria>
1. Vitest configured with jsdom environment; setup.ts provides jest-dom matchers and next/navigation mock
2. login.test.tsx: 3 tests pass (success redirect, 401 error message, render)
3. tweet.test.tsx: 3 tests pass (submit + prependTweet, 280-char disables, empty disables)
4. follow.test.tsx: 2 tests pass (follow POST + button change, unfollow DELETE + button change)
5. npm test in frontend exits 0
6. tsc passes with no errors
</success_criteria>

<output>
Create `.planning/phases/03-frontend-ui-core/03-04-SUMMARY.md` when done
</output>

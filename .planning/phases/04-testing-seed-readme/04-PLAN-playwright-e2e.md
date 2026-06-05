---
phase: 04-testing-seed-readme
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - global-tests/package.json
  - global-tests/playwright.config.ts
  - global-tests/happy-path.spec.ts
  - package.json
autonomous: true
requirements: [TEST-01, TEST-02]
user_setup:
  - "Stack must be running: docker compose up --build before running npm run test:e2e"
  - "Seed must be populated: docker compose exec backend npm run db:seed"

must_haves:
  truths:
    - "npm run test:e2e desde la raíz pasa con exit 0 contra el stack corriendo"
    - "El spec está etiquetado con @smoke"
    - "El test cubre el happy path completo: register → login → post tweet → follow user → logout"
    - "El tweet posteado es visible en el feed después de crearlo"
    - "Después del follow, el followers_count del perfil de alice incrementa"
    - "El logout redirige a /login"
    - "El test genera un email único por ejecución (usando timestamp) para evitar conflictos de registro"
  artifacts:
    - path: "global-tests/happy-path.spec.ts"
      provides: "Playwright @smoke E2E test cubriendo el happy path completo"
      contains: "@smoke"
    - path: "global-tests/playwright.config.ts"
      provides: "Playwright config con baseURL localhost:3000, timeout 30s, headless"
      contains: "baseURL"
    - path: "package.json"
      provides: "Root package.json con script test:e2e"
      contains: "test:e2e"
  key_links:
    - from: "global-tests/happy-path.spec.ts"
      to: "global-tests/playwright.config.ts"
      via: "config import"
      pattern: "baseURL: http://localhost:3000"
---

<objective>
Create the Playwright E2E test that validates the full happy path from register to logout.

Purpose: Integration tests verify individual endpoints; unit tests verify components in isolation. The E2E test is the only test that verifies the entire stack wired together end-to-end as a user would experience it. A passing @smoke test is the final acceptance gate before the project is submittable.
Output: A single Playwright spec that registers a new user, posts a tweet, follows alice, and logs out — all running headlessly against the full docker compose stack.
</objective>

<execution_context>
@AGENTS.md
@docs/testing.md
@docker-compose.yml
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@AGENTS.md

<interfaces>
<!-- Pages available in the running app -->
/login — email + password form, submit button "Iniciar sesión"
/register — username + display_name + email + password form, submit "Crear cuenta"
/ — home page with TweetComposer (textarea "¿Qué está pasando?") and Timeline
/users/:id — profile page with "Seguir" / "Dejar de seguir" button
/search — search page

Seed data available (after npm run db:seed):
  alice / alice@example.com / password123 — user with some followers; follows bob, carol, dave, eve
  bob / bob@example.com / password123
  ... (all 10 seed users with password123)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create global-tests package.json and install Playwright</name>
  <files>global-tests/package.json</files>
  <read_first>
    - Check if global-tests/ directory exists; create it if not
    - Check if a root package.json exists already
  </read_first>
  <action>
    1. Ensure global-tests/ directory exists.

    2. Create global-tests/package.json:
    {
      "name": "clontwitter-e2e",
      "private": true,
      "scripts": {
        "test": "npx playwright test"
      },
      "dependencies": {
        "@playwright/test": "^1.44"
      }
    }

    3. Run: cd global-tests && npm install && npx playwright install chromium
       (installs only chromium to keep CI fast)

    4. If a root package.json does not exist, create a minimal one:
    {
      "name": "clontwitter",
      "private": true,
      "scripts": {
        "test:e2e": "cd global-tests && npx playwright test"
      }
    }

    If root package.json already exists, add the test:e2e script to the existing scripts.
  </action>
  <verify>
    <automated>cd global-tests && npx playwright --version 2>&1 | head -3</automated>
  </verify>
  <acceptance_criteria>
    - global-tests/package.json has @playwright/test dependency
    - Playwright chromium browser installed
    - Root package.json has "test:e2e" script
  </acceptance_criteria>
  <done>Playwright installed; root test:e2e script ready.</done>
</task>

<task type="auto">
  <name>Task 2: playwright.config.ts</name>
  <files>global-tests/playwright.config.ts</files>
  <read_first>
    - global-tests/package.json (Task 1)
  </read_first>
  <action>
    Create global-tests/playwright.config.ts:

    import { defineConfig } from '@playwright/test'

    export default defineConfig({
      testDir: '.',
      timeout: 30_000,
      retries: 1, // retry once on flaky network
      use: {
        baseURL: 'http://localhost:3000',
        headless: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
      reporter: [['list'], ['html', { open: 'never' }]],
    })

    Note: no grep filter for @smoke here — the spec itself uses test.describe with the tag. The root npm script can add --grep "@smoke" if needed.
  </action>
  <verify>
    <automated>cd global-tests && npx playwright --version 2>&1 | head -1</automated>
  </verify>
  <acceptance_criteria>
    - playwright.config.ts sets baseURL to http://localhost:3000
    - timeout is 30_000ms
    - retries: 1 to handle network flakiness
    - screenshots and video retained on failure
  </acceptance_criteria>
  <done>playwright.config.ts configured with baseURL, timeout, and failure artifacts.</done>
</task>

<task type="auto">
  <name>Task 3: happy-path.spec.ts — full @smoke E2E test</name>
  <files>global-tests/happy-path.spec.ts</files>
  <read_first>
    - global-tests/playwright.config.ts (Task 2) — baseURL
    - docs/api.md — page routes and form structure
    - frontend/src/app/login/page.tsx — button text "Iniciar sesión"
    - frontend/src/app/register/page.tsx — button text "Crear cuenta"
  </read_first>
  <action>
    Create global-tests/happy-path.spec.ts:

    import { test, expect } from '@playwright/test'

    test.describe('@smoke Happy Path', () => {
      test('register → login → post tweet → follow alice → logout', async ({ page }) => {
        const ts = Date.now()
        const email = `testuser${ts}@example.com`
        const username = `testuser${ts}`.slice(0, 20) // max 20 chars
        const password = 'TestPassword1!'

        // Step 1: Register new user
        await page.goto('/register')
        await expect(page).toHaveURL('/register')

        await page.getByLabel(/nombre de usuario/i).fill(username)
        await page.getByLabel(/correo electrónico/i).fill(email)
        await page.getByLabel(/contraseña/i).fill(password)
        await page.getByRole('button', { name: /crear cuenta/i }).click()

        // Should redirect to home page
        await expect(page).toHaveURL('/', { timeout: 10_000 })

        // Step 2: Verify home page loaded with composer
        await expect(page.getByPlaceholder(/qué está pasando/i)).toBeVisible()

        // Step 3: Post a tweet
        const tweetContent = `Tweet de prueba ${ts}`
        await page.getByPlaceholder(/qué está pasando/i).fill(tweetContent)
        await page.getByRole('button', { name: /twittear/i }).click()

        // Tweet should appear in the feed
        await expect(page.getByText(tweetContent)).toBeVisible({ timeout: 5_000 })

        // Step 4: Navigate to alice's profile and follow her
        // Use search page to find alice (more robust than guessing her user ID)
        await page.goto('/search')
        await page.getByRole('textbox').fill('alice')
        // Wait for results
        await expect(page.getByText('@alice')).toBeVisible({ timeout: 5_000 })

        // Click alice's profile link (navigate to her profile page)
        await page.getByText('@alice').click()
        await expect(page).toHaveURL(/\/users\//, { timeout: 5_000 })

        // Follow alice
        const followBtn = page.getByRole('button', { name: /^seguir$/i })
        // Only click if not already following
        if (await followBtn.isVisible()) {
          await followBtn.click()
          await expect(page.getByRole('button', { name: /dejar de seguir/i })).toBeVisible({ timeout: 3_000 })
        }

        // Step 5: Logout
        // Use sidebar on desktop or navigate to trigger logout
        // Click "Cerrar sesión" in the sidebar
        const logoutBtn = page.getByRole('button', { name: /cerrar sesión/i })
        await expect(logoutBtn).toBeVisible()
        await logoutBtn.click()

        // Should redirect to /login
        await expect(page).toHaveURL('/login', { timeout: 5_000 })
        await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible()
      })
    })

    Notes:
    - Use page.getByLabel() with regex to match labels case-insensitively
    - All selectors use user-facing text (role, label, placeholder) — no CSS class selectors
    - Timeout is generous (10s for navigation, 5s for element visibility) to account for dev builds
    - The @smoke tag is in the describe block name — grep with /smoke/ or /@smoke/ to filter
  </action>
  <verify>
    <automated>cd global-tests && npx playwright test --list 2>&1 | head -10</automated>
  </verify>
  <acceptance_criteria>
    - Spec file has exactly 1 test inside @smoke describe
    - Test covers: register → redirect to / → post tweet → tweet visible → find alice → follow → logout → /login
    - Uses unique email (Date.now()) to avoid registration conflicts across runs
    - All selectors use accessible attributes (role, label, placeholder, text)
    - npx playwright test --list shows 1 test
  </acceptance_criteria>
  <done>happy-path.spec.ts defines 1 @smoke test covering the full user journey.</done>
</task>

</tasks>

<verification>
- cd global-tests && npx playwright test --list → shows 1 test
- npm run test:e2e (from root, with stack running + seed populated) → exits 0
- If test fails: check screenshot in global-tests/test-results/ for debugging
</verification>

<success_criteria>
1. global-tests/package.json has @playwright/test; chromium installed
2. playwright.config.ts: baseURL localhost:3000, timeout 30s, headless true
3. happy-path.spec.ts: 1 test tagged @smoke covering register→login→tweet→follow→logout
4. npm run test:e2e from root runs the spec against the docker compose stack
5. Test uses unique email per run to avoid conflicts
</success_criteria>

<output>
Create `.planning/phases/04-testing-seed-readme/04-02-SUMMARY.md` when done
</output>

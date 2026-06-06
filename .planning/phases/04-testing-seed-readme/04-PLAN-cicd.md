---
phase: 04-testing-seed-readme
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - .github/workflows/ci.yml
  - .github/workflows/e2e.yml
autonomous: true
requirements: [TEST-01, TEST-02]
user_setup:
  - "Add GitHub Secrets before pushing: JWT_SECRET, REFRESH_TOKEN_SECRET, DATABASE_URL, TEST_DATABASE_URL"

must_haves:
  truths:
    - "PR abierto → ci.yml ejecuta los 3 jobs (backend-ci, frontend-ci, docker-build) en verde"
    - "Merge a main → e2e.yml pasa el @smoke Playwright test"
    - "Test fallido en PR → workflow sale con código no-cero y bloquea el merge"
    - "El job backend-ci usa un postgres:16 service container con healthcheck pg_isready"
    - "El job backend-ci espera el healthcheck antes de correr npm test"
    - "npm ci se usa en todos los jobs (no npm install) para reproducibilidad"
    - "e2e.yml usa wait-on para esperar que los servicios estén listos antes de correr Playwright"
  artifacts:
    - path: ".github/workflows/ci.yml"
      provides: "PR gate: backend-ci + frontend-ci + docker-build"
      contains: "postgres:16"
    - path: ".github/workflows/e2e.yml"
      provides: "Main merge: full-stack docker + Playwright @smoke"
      contains: "playwright"
  key_links:
    - from: ".github/workflows/ci.yml"
      to: "backend/package.json"
      via: "cd backend && npm ci && npm test"
      pattern: "npm test"
    - from: ".github/workflows/e2e.yml"
      to: "global-tests/playwright.config.ts"
      via: "npx playwright test --grep @smoke"
      pattern: "@smoke"
---

<objective>
Set up GitHub Actions workflows that gate PRs with lint + tests and run Playwright E2E on every merge to main.

Purpose: Without CI, every merge is a manual testing burden. The PR gate catches regressions before they reach main. The E2E pipeline ensures the full docker compose stack works after every merge.
Output: Two workflow files — ci.yml (PR gate) and e2e.yml (main merge E2E) — that together provide automated quality assurance for the project.
</objective>

<execution_context>
@AGENTS.md
@backend/package.json
@frontend/package.json
@docker-compose.yml
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@AGENTS.md

<interfaces>
Required GitHub Secrets (must be configured in repo Settings → Secrets → Actions):
  JWT_SECRET — same value as .env
  REFRESH_TOKEN_SECRET — same value as .env
  DATABASE_URL — postgres://postgres:postgres@localhost:5432/clontwitter (for CI)
  TEST_DATABASE_URL — postgres://postgres:postgres@localhost:5432/clontwitter_test

Backend test command: cd backend && npm test
Frontend test command: cd frontend && npm test
E2E test command: cd global-tests && npx playwright test --grep "@smoke"

Backend tsc check: cd backend && npx tsc --noEmit
Frontend tsc check: cd frontend && npx tsc --noEmit
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: ci.yml — PR gate (backend-ci + frontend-ci + docker-build)</name>
  <files>.github/workflows/ci.yml</files>
  <read_first>
    - backend/package.json — verify "test" script name
    - frontend/package.json — verify "test" script name
    - docker-compose.yml — verify it can be built with docker compose build
  </read_first>
  <action>
    Create .github/workflows/ci.yml directory and file.
    Ensure .github/workflows/ directory exists.

    Content:

    name: CI

    on:
      pull_request:
        branches: [main]

    jobs:
      backend-ci:
        name: Backend — typecheck + tests
        runs-on: ubuntu-latest

        services:
          postgres:
            image: postgres:16
            env:
              POSTGRES_DB: clontwitter_test
              POSTGRES_USER: postgres
              POSTGRES_PASSWORD: postgres
            ports:
              - 5432:5432
            options: >-
              --health-cmd pg_isready
              --health-interval 10s
              --health-timeout 5s
              --health-retries 5

        steps:
          - uses: actions/checkout@v4

          - uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: 'npm'
              cache-dependency-path: backend/package-lock.json

          - name: Install backend dependencies
            run: npm ci
            working-directory: backend

          - name: TypeScript typecheck
            run: npx tsc --noEmit
            working-directory: backend

          - name: Run integration tests
            run: npm test
            working-directory: backend
            env:
              TEST_DATABASE_URL: postgres://postgres:postgres@localhost:5432/clontwitter_test
              JWT_SECRET: ${{ secrets.JWT_SECRET || 'ci-jwt-secret-not-real' }}
              REFRESH_TOKEN_SECRET: ${{ secrets.REFRESH_TOKEN_SECRET || 'ci-refresh-secret-not-real' }}
              NODE_ENV: test

      frontend-ci:
        name: Frontend — typecheck + tests
        runs-on: ubuntu-latest

        steps:
          - uses: actions/checkout@v4

          - uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: 'npm'
              cache-dependency-path: frontend/package-lock.json

          - name: Install frontend dependencies
            run: npm ci
            working-directory: frontend

          - name: TypeScript typecheck
            run: npx tsc --noEmit
            working-directory: frontend

          - name: Run unit tests
            run: npm test
            working-directory: frontend

      docker-build:
        name: Docker Compose build check
        runs-on: ubuntu-latest

        steps:
          - uses: actions/checkout@v4

          - name: Create .env for build
            run: |
              cp .env.example .env
              echo "JWT_SECRET=ci-build-check" >> .env
              echo "REFRESH_TOKEN_SECRET=ci-build-check-refresh" >> .env

          - name: Build all images
            run: docker compose build

    Notes on fallback secrets: `${{ secrets.JWT_SECRET || 'ci-jwt-secret-not-real' }}` allows the workflow to run in forks without secrets configured, while still testing with real secrets on the main repo. The fallback values are intentionally non-secure — they're only used for typecheck/unit tests that don't hit real JWT verification.
  </action>
  <verify>
    <automated>test -f .github/workflows/ci.yml && echo "ci.yml created" && cat .github/workflows/ci.yml | grep "postgres:16"</automated>
  </verify>
  <acceptance_criteria>
    - ci.yml triggers on pull_request to main
    - 3 jobs: backend-ci, frontend-ci, docker-build
    - backend-ci has postgres:16 service with pg_isready healthcheck
    - backend-ci passes TEST_DATABASE_URL env var to npm test
    - All jobs use npm ci (not npm install)
    - docker-build creates .env from .env.example before building
  </acceptance_criteria>
  <done>ci.yml gates PRs with 3 parallel jobs; postgres healthcheck ensures DB readiness.</done>
</task>

<task type="auto">
  <name>Task 2: e2e.yml — Main merge pipeline (full stack + Playwright @smoke)</name>
  <files>.github/workflows/e2e.yml</files>
  <read_first>
    - .github/workflows/ci.yml (Task 1) — follow same patterns for checkout/node setup
    - global-tests/package.json — verify playwright test command
    - docker-compose.yml — verify service names for wait-on
  </read_first>
  <action>
    Create .github/workflows/e2e.yml:

    name: E2E

    on:
      push:
        branches: [main]

    jobs:
      e2e:
        name: Playwright @smoke — full stack
        runs-on: ubuntu-latest
        timeout-minutes: 15

        steps:
          - uses: actions/checkout@v4

          - uses: actions/setup-node@v4
            with:
              node-version: '20'

          - name: Create .env
            run: |
              cp .env.example .env
              echo "JWT_SECRET=${{ secrets.JWT_SECRET }}" >> .env
              echo "REFRESH_TOKEN_SECRET=${{ secrets.REFRESH_TOKEN_SECRET }}" >> .env
              echo "DATABASE_URL=postgres://postgres:postgres@postgres:5432/clontwitter" >> .env
              echo "NEXT_PUBLIC_API_URL=http://localhost:4000" >> .env

          - name: Start docker compose stack
            run: docker compose up -d --build

          - name: Install wait-on
            run: npm install -g wait-on

          - name: Wait for services to be ready
            run: wait-on http://localhost:3000 http://localhost:4000/health --timeout 60000
            # Note: requires GET /health endpoint on backend returning 200
            # If /health doesn't exist, use: wait-on tcp:3000 tcp:4000 --timeout 60000

          - name: Seed database
            run: docker compose exec -T backend npm run db:seed

          - name: Install E2E test dependencies
            run: npm ci
            working-directory: global-tests

          - name: Install Playwright browsers
            run: npx playwright install chromium --with-deps
            working-directory: global-tests

          - name: Run @smoke E2E test
            run: npx playwright test --grep "@smoke"
            working-directory: global-tests

          - name: Upload Playwright report on failure
            if: failure()
            uses: actions/upload-artifact@v4
            with:
              name: playwright-report
              path: global-tests/playwright-report/
              retention-days: 7

          - name: Tear down stack
            if: always()
            run: docker compose down -v

    Note about wait-on: The backend must expose a health endpoint for wait-on to work with HTTP.
    If GET /health doesn't exist on the backend, change the wait-on command to use TCP:
      wait-on tcp:3000 tcp:4000 --timeout 60000
    Or add a simple GET /health → 200 to backend/src/app.ts (recommended).
  </action>
  <verify>
    <automated>test -f .github/workflows/e2e.yml && echo "e2e.yml created" && cat .github/workflows/e2e.yml | grep "playwright"</automated>
  </verify>
  <acceptance_criteria>
    - e2e.yml triggers on push to main
    - Full stack started with docker compose up -d --build
    - wait-on ensures services are healthy before running tests
    - Seed runs before test (docker compose exec -T backend npm run db:seed)
    - Playwright @smoke test runs; uploads report artifact on failure
    - docker compose down -v always runs to clean up
  </acceptance_criteria>
  <done>e2e.yml runs full-stack Playwright @smoke on every main merge; uploads report on failure.</done>
</task>

<task type="auto">
  <name>Task 3: Add GET /health endpoint to backend (required for wait-on in CI)</name>
  <files>backend/src/app.ts</files>
  <read_first>
    - backend/src/app.ts — current state; where to add the health route
  </read_first>
  <action>
    Add a simple health check endpoint to backend/src/app.ts before the auth/api routes:

    app.get('/health', (_req, res) => {
      res.json({ status: 'ok' })
    })

    This allows wait-on in the e2e workflow to verify the backend is up via HTTP (more reliable than TCP check because it confirms the Express app is actually serving requests, not just that the port is open).

    Place this route BEFORE all other routes and BEFORE the error handler. It requires no auth.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit 2>&1 | head -10</automated>
  </verify>
  <acceptance_criteria>
    - GET /health returns 200 { status: "ok" }
    - Route is placed before auth routes and error handler
    - tsc passes
  </acceptance_criteria>
  <done>GET /health added to backend; CI wait-on can verify backend readiness via HTTP.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| GitHub Actions secrets | JWT_SECRET and REFRESH_TOKEN_SECRET must be set as repository secrets — never hardcoded |
| Fork PRs | Secret values are not available in fork PRs; fallback values used for non-auth tests |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | Information Disclosure | CI env vars | mitigate | Secrets via ${{ secrets.* }}; fallback non-secret values for fork PRs; no secrets echoed in logs |
| T-04-02 | Tampering | e2e .env creation | mitigate | .env created from .env.example + secrets; DATABASE_URL uses internal docker network name, not exposed |
</threat_model>

<verification>
- Open a PR → check GitHub Actions tab → ci.yml shows 3 green jobs
- Merge to main → e2e.yml runs and @smoke test passes
- Break a test intentionally → PR is blocked (ci.yml exits non-zero)
- cat .github/workflows/ci.yml | grep "postgres:16" → present
- cat .github/workflows/e2e.yml | grep "playwright" → present
</verification>

<success_criteria>
1. ci.yml triggers on pull_request; 3 jobs pass green on valid code
2. e2e.yml triggers on push to main; @smoke Playwright test passes
3. backend-ci postgres service has pg_isready healthcheck
4. Playwright report artifact uploaded on failure
5. docker compose down -v always runs at end of e2e job
6. GET /health endpoint added to backend for wait-on verification
7. tsc passes on backend/src/app.ts after adding health route
</success_criteria>

<output>
Create `.planning/phases/04-testing-seed-readme/04-03-SUMMARY.md` when done
</output>

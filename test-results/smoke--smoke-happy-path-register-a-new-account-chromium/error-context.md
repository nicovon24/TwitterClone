# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> @smoke happy path >> register a new account
- Location: global-tests\smoke.spec.ts:18:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Nombre de usuario')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - main [ref=e3]:
    - img [ref=e5]
    - generic [ref=e8]:
      - heading "Unite hoy." [level=1] [ref=e9]
      - heading "Creá tu cuenta" [level=2] [ref=e10]
      - generic [ref=e11]:
        - textbox "Nombre de usuario" [ref=e12]
        - textbox "Nombre para mostrar (opcional)" [ref=e13]
        - textbox "Correo electrónico" [ref=e14]
        - textbox "Contraseña (mínimo 8 caracteres)" [ref=e15]
        - button "Crear cuenta" [ref=e16] [cursor=pointer]
      - paragraph [ref=e17]:
        - text: ¿Ya tenés cuenta?
        - link "Iniciá sesión" [ref=e18] [cursor=pointer]:
          - /url: /login
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * @smoke — full happy-path: register → login → create tweet → follow user → logout
  5  |  *
  6  |  * Requires the app to be running at PLAYWRIGHT_BASE_URL (default: http://localhost:3000)
  7  |  * with the seed data loaded (so "martina" exists as a user to follow).
  8  |  */
  9  | 
  10 | const timestamp = Date.now();
  11 | const TEST_USER = {
  12 |   username: `e2e_user_${timestamp}`,
  13 |   email: `e2e_${timestamp}@test.dev`,
  14 |   password: 'E2ePassword1!',
  15 | };
  16 | 
  17 | test.describe('@smoke happy path', () => {
  18 |   test('register a new account', async ({ page }) => {
  19 |     await page.goto('/register');
> 20 |     await page.getByLabel('Nombre de usuario').fill(TEST_USER.username);
     |                                                ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  21 |     await page.getByLabel('Correo electrónico').fill(TEST_USER.email);
  22 |     await page.getByLabel('Contraseña').fill(TEST_USER.password);
  23 |     await page.getByRole('button', { name: /registrarse/i }).click();
  24 | 
  25 |     // After registration, redirected to home
  26 |     await expect(page).toHaveURL('/');
  27 |     await expect(page.locator('main')).toBeVisible();
  28 |   });
  29 | 
  30 |   test('login with existing account', async ({ page }) => {
  31 |     await page.goto('/login');
  32 |     await page.getByLabel('Correo electrónico').fill('martina@clontwitter.dev');
  33 |     await page.getByLabel('Contraseña').fill('password123');
  34 |     await page.getByRole('button', { name: /iniciar sesión/i }).click();
  35 | 
  36 |     await expect(page).toHaveURL('/');
  37 |     await expect(page.locator('main')).toBeVisible();
  38 |   });
  39 | 
  40 |   test('create a tweet', async ({ page }) => {
  41 |     // Login first
  42 |     await page.goto('/login');
  43 |     await page.getByLabel('Correo electrónico').fill('lucas@clontwitter.dev');
  44 |     await page.getByLabel('Contraseña').fill('password123');
  45 |     await page.getByRole('button', { name: /iniciar sesión/i }).click();
  46 |     await expect(page).toHaveURL('/');
  47 | 
  48 |     const tweetText = `E2E test tweet ${timestamp}`;
  49 |     const textarea = page.getByPlaceholder(/qué está pasando/i);
  50 |     await textarea.fill(tweetText);
  51 |     await page.getByRole('button', { name: /postear/i }).click();
  52 | 
  53 |     // Tweet should appear in the timeline
  54 |     await expect(page.getByText(tweetText)).toBeVisible();
  55 |   });
  56 | 
  57 |   test('follow a user from their profile', async ({ page }) => {
  58 |     // Login as sofia
  59 |     await page.goto('/login');
  60 |     await page.getByLabel('Correo electrónico').fill('sofia@clontwitter.dev');
  61 |     await page.getByLabel('Contraseña').fill('password123');
  62 |     await page.getByRole('button', { name: /iniciar sesión/i }).click();
  63 |     await expect(page).toHaveURL('/');
  64 | 
  65 |     // Navigate to pablo_c's profile (sofia doesn't follow pablo by default)
  66 |     await page.goto('/users/pablo_c');
  67 |     const followBtn = page.getByRole('button', { name: /^seguir$/i });
  68 |     await expect(followBtn).toBeVisible();
  69 |     await followBtn.click();
  70 | 
  71 |     // Button should change to "Siguiendo"
  72 |     await expect(page.getByRole('button', { name: /siguiendo/i })).toBeVisible();
  73 |   });
  74 | 
  75 |   test('logout', async ({ page }) => {
  76 |     await page.goto('/login');
  77 |     await page.getByLabel('Correo electrónico').fill('tomas@clontwitter.dev');
  78 |     await page.getByLabel('Contraseña').fill('password123');
  79 |     await page.getByRole('button', { name: /iniciar sesión/i }).click();
  80 |     await expect(page).toHaveURL('/');
  81 | 
  82 |     // Click logout button in the sidebar (desktop) or bottom nav
  83 |     await page.getByRole('button', { name: /cerrar sesión/i }).first().click();
  84 | 
  85 |     // Should redirect to login
  86 |     await expect(page).toHaveURL('/login');
  87 |   });
  88 | });
  89 | 
```
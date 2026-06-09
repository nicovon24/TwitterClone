import { test, expect } from '@playwright/test';

/**
 * @smoke — full happy-path: register → login → create tweet → follow user → logout
 *
 * Requires the app to be running at PLAYWRIGHT_BASE_URL (default: http://localhost:3000)
 * with the seed data loaded (so "martina" exists as a user to follow).
 */

const timestamp = Date.now();
const TEST_USER = {
  username: `e2e_user_${timestamp}`,
  email: `e2e_${timestamp}@test.dev`,
  password: 'E2ePassword1!',
};

test.describe('@smoke happy path', () => {
  test('register a new account', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Nombre de usuario').fill(TEST_USER.username);
    await page.getByLabel('Correo electrónico').fill(TEST_USER.email);
    await page.getByLabel('Contraseña').fill(TEST_USER.password);
    await page.getByRole('button', { name: /registrarse/i }).click();

    // After registration, redirected to home
    await expect(page).toHaveURL('/');
    await expect(page.locator('main')).toBeVisible();
  });

  test('login with existing account', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill('martina@clontwitter.dev');
    await page.getByLabel('Contraseña').fill('password123');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await expect(page).toHaveURL('/');
    await expect(page.locator('main')).toBeVisible();
  });

  test('create a tweet', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill('lucas@clontwitter.dev');
    await page.getByLabel('Contraseña').fill('password123');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL('/');

    const tweetText = `E2E test tweet ${timestamp}`;
    const textarea = page.getByPlaceholder(/qué está pasando/i);
    await textarea.fill(tweetText);
    await page.getByRole('button', { name: /postear/i }).click();

    // Tweet should appear in the timeline
    await expect(page.getByText(tweetText)).toBeVisible();
  });

  test('follow a user from their profile', async ({ page }) => {
    // Login as sofia
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill('sofia@clontwitter.dev');
    await page.getByLabel('Contraseña').fill('password123');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL('/');

    // Navigate to pablito_ml's profile (sofia doesn't follow pablito by default)
    await page.goto('/users/pablito_ml');
    const followBtn = page.getByRole('button', { name: /^seguir$/i });
    await expect(followBtn).toBeVisible();
    await followBtn.click();

    // Button should change to "Siguiendo"
    await expect(page.getByRole('button', { name: /siguiendo/i })).toBeVisible();
  });

  test('logout', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill('tomas@clontwitter.dev');
    await page.getByLabel('Contraseña').fill('password123');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page).toHaveURL('/');

    // Click logout button in the sidebar (desktop) or bottom nav
    await page.getByRole('button', { name: /cerrar sesión/i }).first().click();

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});

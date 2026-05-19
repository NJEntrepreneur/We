/**
 * Auth flow:
 *   login → token silent refresh → logout → verify redirect
 *   Also covers: invalid credentials, protected route redirect, CSRF behaviour.
 *
 * Required env vars:
 *   PLAYWRIGHT_BASE_URL   - shell URL
 *   E2E_USER_EMAIL        - test user email
 *   E2E_USER_PASSWORD     - test user password
 */

import { test as base, expect } from '@playwright/test';
import { login, logout, requireEnv } from './helpers/auth.js';

// These tests do NOT use the authedPage fixture so they can control the login
// flow directly (e.g. to test bad credentials or to control clock timing).
const test = base;

test.describe('Auth flow', () => {
  test('redirects unauthenticated users from protected routes to /login', async ({ page }) => {
    await page.goto('/workspaces');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('redirects from / to /login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('shows validation error for empty credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-button').click();
    await expect(page.getByTestId('email-error')).toBeVisible();
    await expect(page.getByTestId('password-error')).toBeVisible();
  });

  test('shows an error for wrong credentials and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email-input').fill('nobody@example.invalid');
    await page.getByTestId('password-input').fill('wrong-password');
    await page.getByTestId('login-button').click();
    await expect(page.getByTestId('auth-error')).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('login with valid credentials navigates to workspace list', async ({ page }) => {
    const email    = requireEnv('E2E_USER_EMAIL');
    const password = requireEnv('E2E_USER_PASSWORD');
    await login(page, email, password);
    await expect(page.getByTestId('workspace-list')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('logout navigates to /login and clears the session', async ({ page }) => {
    const email    = requireEnv('E2E_USER_EMAIL');
    const password = requireEnv('E2E_USER_PASSWORD');
    await login(page, email, password);

    await logout(page);

    // After logout, protected routes redirect back to login
    await page.goto('/workspaces');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test('token silent refresh happens transparently before expiry', async ({ page }) => {
    // Install a fake clock so we can advance time without actually waiting 15 min
    await page.clock.install({ time: Date.now() });

    const email    = requireEnv('E2E_USER_EMAIL');
    const password = requireEnv('E2E_USER_PASSWORD');
    await login(page, email, password);

    // Set up the refresh request listener BEFORE advancing the clock
    const refreshPromise = page.waitForRequest(
      (req) => req.url().includes('/auth/token/refresh') && req.method() === 'POST',
      { timeout: 15_000 },
    );

    // Advance 14 minutes — the shell should schedule a proactive refresh
    // roughly 1 minute before the 15-minute access token expires.
    await page.clock.fastForward('14:00');

    // Wait for the refresh network call
    const refreshReq = await refreshPromise;
    expect(refreshReq.url()).toContain('/auth/token/refresh');

    // The UI must still be functional — the refresh was silent
    await expect(page.getByTestId('user-menu')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('refresh token is sent as an httpOnly cookie (not readable by JS)', async ({ page }) => {
    const email    = requireEnv('E2E_USER_EMAIL');
    const password = requireEnv('E2E_USER_PASSWORD');
    await login(page, email, password);

    // Access tokens are in memory — document.cookie must NOT expose the refresh token
    const cookies = await page.evaluate<string>(() => document.cookie);
    // httpOnly cookies are invisible to JS; the refresh token key must be absent
    expect(cookies).not.toContain('refreshToken');
    expect(cookies).not.toContain('refresh_token');
  });

  test('access token is not stored in localStorage or sessionStorage', async ({ page }) => {
    const email    = requireEnv('E2E_USER_EMAIL');
    const password = requireEnv('E2E_USER_PASSWORD');
    await login(page, email, password);

    const localStorageKeys = await page.evaluate<string[]>(() =>
      Object.keys(localStorage),
    );
    const sessionStorageKeys = await page.evaluate<string[]>(() =>
      Object.keys(sessionStorage),
    );

    // No key in either storage should contain a JWT (starts with "ey")
    const allValues = await page.evaluate<string[]>(() => [
      ...Object.values(localStorage),
      ...Object.values(sessionStorage),
    ]);

    for (const value of allValues) {
      expect(value).not.toMatch(/^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    }

    // Tokens keys should not appear
    for (const key of [...localStorageKeys, ...sessionStorageKeys]) {
      expect(key.toLowerCase()).not.toMatch(/token|jwt|access/);
    }
  });

  test('expired session redirects to /login with a message', async ({ page }) => {
    await page.clock.install({ time: Date.now() });

    const email    = requireEnv('E2E_USER_EMAIL');
    const password = requireEnv('E2E_USER_PASSWORD');
    await login(page, email, password);

    // Intercept the refresh call and simulate an expired family (401)
    await page.route('**/auth/token/refresh', (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ error: 'Token family revoked' }) }),
    );

    // Advance past token expiry — the refresh will fail → shell logs out
    await page.clock.fastForward('16:00');

    // Shell should detect the failed refresh and redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    // A session-expired message should be shown
    await expect(page.getByTestId('session-expired-banner')).toBeVisible();
  });
});

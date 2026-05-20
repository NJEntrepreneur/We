import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Log in via the shell's login form and wait until the workspace list is visible.
 * Uses relative paths so the playwright.config baseURL is respected.
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('login-button').click();
  // Wait for successful navigation away from /login
  await expect(page.getByTestId('workspace-list')).toBeVisible({ timeout: 15_000 });
}

/**
 * Log out via the user menu and assert the browser lands on /login.
 */
export async function logout(page: Page): Promise<void> {
  await page.getByTestId('user-menu').click();
  await page.getByTestId('logout-button').click();
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
}

/**
 * Navigate to a workspace and wait for the file tree to be ready.
 */
export async function openWorkspace(page: Page, workspaceId: string): Promise<void> {
  await page.goto(`/workspaces/${workspaceId}`);
  await expect(page.getByTestId('file-tree')).toBeVisible({ timeout: 15_000 });
}

/**
 * Open a file in the editor by clicking its file-tree entry.
 * Waits until the Monaco editor container is visible.
 */
export async function openFile(page: Page, fileName: string): Promise<void> {
  await page.getByTestId(`file-tree-item-${fileName}`).dblclick();
  await expect(page.getByTestId('editor-container')).toBeVisible();
  // Give Monaco a moment to finish mounting
  await page.waitForFunction(
    () => document.querySelector('.monaco-editor') !== null,
  );
}

/** Read environment variable or throw with a clear message. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} is required for E2E tests`);
  return value;
}

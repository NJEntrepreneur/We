/**
 * Core editor flow:
 *   login → open workspace → open file → edit → save → reload → verify persisted
 *
 * Required env vars:
 *   PLAYWRIGHT_BASE_URL   - shell URL (default: http://localhost:5173)
 *   E2E_USER_EMAIL        - test user email
 *   E2E_USER_PASSWORD     - test user password
 *   E2E_WORKSPACE_ID      - UUID of a pre-existing workspace
 */

import { test, expect } from './fixtures.js';
import { openWorkspace, openFile } from './helpers/auth.js';

// Each test in this file gets a fresh authedPage, already logged in.

test.describe('Core editor flow', () => {
  test('opens a workspace and shows the file tree', async ({ authedPage: page, workspaceId }) => {
    await openWorkspace(page, workspaceId);
    await expect(page.getByTestId('file-tree')).toBeVisible();
    // At least one file or folder is visible
    await expect(page.getByTestId('file-tree-item').first()).toBeVisible();
  });

  test('opens a file and renders the Monaco editor', async ({ authedPage: page, workspaceId }) => {
    await openWorkspace(page, workspaceId);

    const firstFile = page.getByTestId('file-tree-item').first();
    const fileName = (await firstFile.getAttribute('data-filename')) ?? 'README.md';

    await openFile(page, fileName);

    await expect(page.getByTestId('editor-container')).toBeVisible();
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });

  test('edits a file, saves with Ctrl+S, and sees the saved indicator', async ({
    authedPage: page,
    workspaceId,
  }) => {
    await openWorkspace(page, workspaceId);

    const firstFile = page.getByTestId('file-tree-item').first();
    const fileName = (await firstFile.getAttribute('data-filename')) ?? 'README.md';
    await openFile(page, fileName);

    // Focus the Monaco textarea and type unique content
    const editorInput = page.locator('.monaco-editor .inputarea');
    await editorInput.click();

    // Move to end of document, then type a unique marker
    await page.keyboard.press('Control+End');
    const marker = `// e2e-edit-${Date.now()}`;
    await page.keyboard.type(marker);

    // Save
    await page.keyboard.press('Control+s');

    // Shell should show a saved/synced indicator
    await expect(page.getByTestId('save-indicator')).toHaveText(/saved|synced/i, {
      timeout: 5_000,
    });
  });

  test('persists edits after a page reload', async ({ authedPage: page, workspaceId }) => {
    await openWorkspace(page, workspaceId);

    const firstFile = page.getByTestId('file-tree-item').first();
    const fileName = (await firstFile.getAttribute('data-filename')) ?? 'README.md';
    await openFile(page, fileName);

    const editorInput = page.locator('.monaco-editor .inputarea');
    await editorInput.click();
    await page.keyboard.press('Control+End');

    const marker = `// persist-${Date.now()}`;
    await page.keyboard.type(marker);
    await page.keyboard.press('Control+s');
    await expect(page.getByTestId('save-indicator')).toHaveText(/saved|synced/i);

    // Reload the page — the access token lives in memory so we'll be redirected
    // to login. Re-login and navigate back.
    await page.reload();

    // After reload the user is logged out (in-memory token lost) — log back in
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
    const email    = process.env['E2E_USER_EMAIL']!;
    const password = process.env['E2E_USER_PASSWORD']!;
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill(password);
    await page.getByTestId('login-button').click();

    await openWorkspace(page, workspaceId);
    await openFile(page, fileName);

    // The persisted content should still be there
    await expect(page.locator('.monaco-editor')).toContainText(marker, { timeout: 10_000 });
  });

  test('tab bar shows the open file and allows closing it', async ({
    authedPage: page,
    workspaceId,
  }) => {
    await openWorkspace(page, workspaceId);

    const firstFile = page.getByTestId('file-tree-item').first();
    const fileName = (await firstFile.getAttribute('data-filename')) ?? 'README.md';
    await openFile(page, fileName);

    // Editor tab should appear
    await expect(page.getByTestId(`editor-tab-${fileName}`)).toBeVisible();

    // Close the tab
    await page.getByTestId(`editor-tab-close-${fileName}`).click();

    // Editor container should no longer show the closed file
    await expect(page.getByTestId(`editor-tab-${fileName}`)).not.toBeVisible();
  });
});

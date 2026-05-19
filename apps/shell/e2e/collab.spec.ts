/**
 * Collab flow:
 *   Two independent browser contexts open the same workspaceId.
 *   User A types text → User B sees it appear in real time via Yjs/y-websocket.
 *   User B's cursor indicator appears in User A's editor as an awareness mark.
 *
 * Required env vars:
 *   PLAYWRIGHT_BASE_URL   - shell URL
 *   E2E_WORKSPACE_ID      - UUID of a shared workspace both users have access to
 *   E2E_USER_EMAIL        - primary user (A) email
 *   E2E_USER_PASSWORD     - primary user (A) password
 *   E2E_USER_B_EMAIL      - secondary user (B) email
 *   E2E_USER_B_PASSWORD   - secondary user (B) password
 *   E2E_COLLAB_FILE       - filename to open in both editors (default: COLLAB.md)
 *
 * The two users must both be members of E2E_WORKSPACE_ID.
 */

import { test as base, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { login, openWorkspace, openFile, requireEnv } from './helpers/auth.js';

// Run all tests in this file sequentially — they share two live browser contexts.
base.describe.configure({ mode: 'serial' });

// Extend the base test with two authenticated contexts so every test
// gets pageA and pageB without repeating login logic.
const test = base.extend<{
  pageA: Page;
  pageB: Page;
  contextA: BrowserContext;
  contextB: BrowserContext;
}>({
  async contextA({ browser }: { browser: Browser }, use: (ctx: BrowserContext) => Promise<void>) {
    const ctx = await browser.newContext();
    await use(ctx);
    await ctx.close();
  },

  async contextB({ browser }: { browser: Browser }, use: (ctx: BrowserContext) => Promise<void>) {
    const ctx = await browser.newContext();
    await use(ctx);
    await ctx.close();
  },

  async pageA(
    { contextA }: { contextA: BrowserContext },
    use: (p: Page) => Promise<void>,
  ) {
    const page = await contextA.newPage();
    await login(page, requireEnv('E2E_USER_EMAIL'), requireEnv('E2E_USER_PASSWORD'));
    await use(page);
  },

  async pageB(
    { contextB }: { contextB: BrowserContext },
    use: (p: Page) => Promise<void>,
  ) {
    const page = await contextB.newPage();
    await login(page, requireEnv('E2E_USER_B_EMAIL'), requireEnv('E2E_USER_B_PASSWORD'));
    await use(page);
  },
});

test.describe('Real-time collaboration', () => {
  const fileName = (): string => process.env['E2E_COLLAB_FILE'] ?? 'COLLAB.md';

  test('both users open the same workspace and file', async ({ pageA, pageB }) => {
    const workspaceId = requireEnv('E2E_WORKSPACE_ID');

    await Promise.all([
      openWorkspace(pageA, workspaceId),
      openWorkspace(pageB, workspaceId),
    ]);

    await Promise.all([
      openFile(pageA, fileName()),
      openFile(pageB, fileName()),
    ]);

    await expect(pageA.getByTestId('editor-container')).toBeVisible();
    await expect(pageB.getByTestId('editor-container')).toBeVisible();
  });

  test('user A types text and user B sees it in real time', async ({ pageA, pageB }) => {
    const workspaceId = requireEnv('E2E_WORKSPACE_ID');

    await Promise.all([
      openWorkspace(pageA, workspaceId),
      openWorkspace(pageB, workspaceId),
    ]);

    await Promise.all([
      openFile(pageA, fileName()),
      openFile(pageB, fileName()),
    ]);

    // Focus User A's editor and type unique content
    await pageA.locator('.monaco-editor .inputarea').click();
    await pageA.keyboard.press('Control+End');

    const syncedText = `collab-${Date.now()}`;
    await pageA.keyboard.type(syncedText);

    // User B's editor should receive the update via Yjs within the timeout
    await expect(pageB.locator('.monaco-editor')).toContainText(syncedText, {
      timeout: 15_000,
    });
  });

  test('user B types text and user A sees it in real time', async ({ pageA, pageB }) => {
    const workspaceId = requireEnv('E2E_WORKSPACE_ID');

    await Promise.all([
      openWorkspace(pageA, workspaceId),
      openWorkspace(pageB, workspaceId),
    ]);

    await Promise.all([
      openFile(pageA, fileName()),
      openFile(pageB, fileName()),
    ]);

    await pageB.locator('.monaco-editor .inputarea').click();
    await pageB.keyboard.press('Control+End');

    const syncedText = `reverse-collab-${Date.now()}`;
    await pageB.keyboard.type(syncedText);

    await expect(pageA.locator('.monaco-editor')).toContainText(syncedText, {
      timeout: 15_000,
    });
  });

  test('user A cursor is visible as an awareness marker in user B editor', async ({
    pageA,
    pageB,
  }) => {
    const workspaceId = requireEnv('E2E_WORKSPACE_ID');

    await Promise.all([
      openWorkspace(pageA, workspaceId),
      openWorkspace(pageB, workspaceId),
    ]);

    await Promise.all([
      openFile(pageA, fileName()),
      openFile(pageB, fileName()),
    ]);

    // Move User A's cursor so awareness state is broadcast
    await pageA.locator('.monaco-editor .inputarea').click();
    await pageA.keyboard.press('Control+Home');

    // User B's editor should render a remote cursor/awareness element for User A
    await expect(pageB.getByTestId('remote-cursor')).toBeVisible({ timeout: 10_000 });
  });

  test('collab panel shows both active collaborators', async ({ pageA, pageB }) => {
    const workspaceId = requireEnv('E2E_WORKSPACE_ID');

    await Promise.all([
      openWorkspace(pageA, workspaceId),
      openWorkspace(pageB, workspaceId),
    ]);

    await Promise.all([
      openFile(pageA, fileName()),
      openFile(pageB, fileName()),
    ]);

    // Both editors should show 2 collaborators in the awareness/presence bar
    await expect(pageA.getByTestId('collaborator-count')).toHaveText('2', {
      timeout: 10_000,
    });
    await expect(pageB.getByTestId('collaborator-count')).toHaveText('2', {
      timeout: 10_000,
    });
  });

  test('changes persist for a reconnecting user', async ({ contextA, pageB }) => {
    const workspaceId = requireEnv('E2E_WORKSPACE_ID');

    // Set up User B
    await openWorkspace(pageB, workspaceId);
    await openFile(pageB, fileName());

    // User A connects, types, then closes the tab (simulated disconnect)
    const pageA1 = await contextA.newPage();
    await login(pageA1, requireEnv('E2E_USER_EMAIL'), requireEnv('E2E_USER_PASSWORD'));
    await openWorkspace(pageA1, workspaceId);
    await openFile(pageA1, fileName());

    await pageA1.locator('.monaco-editor .inputarea').click();
    await pageA1.keyboard.press('Control+End');
    const offlineText = `offline-edit-${Date.now()}`;
    await pageA1.keyboard.type(offlineText);

    // Close User A's page (disconnect from collab WebSocket)
    await pageA1.close();

    // User B already had the sync; their editor should still contain the text
    await expect(pageB.locator('.monaco-editor')).toContainText(offlineText, {
      timeout: 10_000,
    });

    // User A reconnects in a new page — server persists Yjs state
    const pageA2 = await contextA.newPage();
    await login(pageA2, requireEnv('E2E_USER_EMAIL'), requireEnv('E2E_USER_PASSWORD'));
    await openWorkspace(pageA2, workspaceId);
    await openFile(pageA2, fileName());

    await expect(pageA2.locator('.monaco-editor')).toContainText(offlineText, {
      timeout: 10_000,
    });
    await pageA2.close();
  });
});

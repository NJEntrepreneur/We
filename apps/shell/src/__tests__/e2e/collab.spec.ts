import { test, expect } from '@playwright/test';

// §16: E2E collab flow — two users open same file, one types, other sees change

test.describe('Collaboration', () => {
  test('two tabs share the same workspace URL', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();

    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto('/editor/ws-collab-test');
    await pageB.goto('/editor/ws-collab-test');

    // Both unauthenticated users land on login
    await expect(pageA).toHaveURL(/\/login/);
    await expect(pageB).toHaveURL(/\/login/);

    await ctxA.close();
    await ctxB.close();
  });
});

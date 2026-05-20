import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { login, requireEnv } from './helpers/auth.js';

interface PlatformFixtures {
  /**
   * A page that has already completed login as the primary test user.
   * Tests that need an authenticated session should use this fixture
   * instead of calling login() manually.
   */
  authedPage: Page;

  /**
   * The workspace ID under test. Reads E2E_WORKSPACE_ID from the environment.
   * Throws if the variable is not set.
   */
  workspaceId: string;
}

export const test = base.extend<PlatformFixtures>({
  async authedPage({ page }, use) {
    const email    = requireEnv('E2E_USER_EMAIL');
    const password = requireEnv('E2E_USER_PASSWORD');
    await login(page, email, password);
    await use(page);
  },

  // workspaceId is a "worker fixture" value — read once and reused across tests
  // eslint-disable-next-line no-empty-pattern
  async workspaceId({}, use) {
    const id = requireEnv('E2E_WORKSPACE_ID');
    await use(id);
  },
});

export { expect };

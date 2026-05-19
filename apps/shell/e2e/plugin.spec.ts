/**
 * Plugin flow:
 *   login → open plugin marketplace → install plugin → activate → run command → uninstall
 *
 * Required env vars:
 *   PLAYWRIGHT_BASE_URL    - shell URL
 *   E2E_USER_EMAIL         - test user email
 *   E2E_USER_PASSWORD      - test user password
 *   E2E_WORKSPACE_ID       - UUID of a pre-existing workspace
 *   E2E_TEST_PLUGIN_ID     - plugin id to install (e.g. com.example.e2e-test)
 *
 * The test plugin must already be published to the plugin registry.
 * Its manifest must declare the "editor.commands" permission and contribute
 * at least one command with id "e2e.helloWorld".
 */

import { test, expect } from './fixtures.js';
import { openWorkspace, requireEnv } from './helpers/auth.js';

test.describe('Plugin flow', () => {
  test.describe.configure({ mode: 'serial' });

  let pluginId: string;

  test.beforeAll(() => {
    pluginId = requireEnv('E2E_TEST_PLUGIN_ID');
  });

  test('shows the plugin marketplace', async ({ authedPage: page, workspaceId }) => {
    await openWorkspace(page, workspaceId);
    await page.getByTestId('plugin-marketplace-button').click();
    await expect(page.getByTestId('plugin-marketplace-panel')).toBeVisible();
    await expect(page.getByTestId('plugin-search-input')).toBeVisible();
  });

  test('installs a plugin from the registry', async ({ authedPage: page, workspaceId }) => {
    await openWorkspace(page, workspaceId);
    await page.getByTestId('plugin-marketplace-button').click();

    // Search for the test plugin
    await page.getByTestId('plugin-search-input').fill(pluginId);
    const installButton = page.getByTestId(`plugin-install-btn-${pluginId}`);
    await expect(installButton).toBeVisible();
    await installButton.click();

    // Installation progress → installed state
    await expect(page.getByTestId(`plugin-status-${pluginId}`)).toHaveText(/installed/i, {
      timeout: 20_000,
    });
  });

  test('activates an installed plugin', async ({ authedPage: page, workspaceId }) => {
    await openWorkspace(page, workspaceId);
    await page.getByTestId('plugin-marketplace-button').click();
    await page.getByTestId('plugin-search-input').fill(pluginId);

    const activateButton = page.getByTestId(`plugin-activate-btn-${pluginId}`);
    await expect(activateButton).toBeVisible();
    await activateButton.click();

    await expect(page.getByTestId(`plugin-status-${pluginId}`)).toHaveText(/active/i, {
      timeout: 10_000,
    });
  });

  test('runs a plugin command via the command palette', async ({
    authedPage: page,
    workspaceId,
  }) => {
    await openWorkspace(page, workspaceId);

    // Open command palette
    await page.keyboard.press('Control+Shift+P');
    await expect(page.getByTestId('command-palette')).toBeVisible();

    // Search for the test plugin's command
    await page.getByTestId('command-palette-input').fill('e2e hello');
    const commandItem = page.getByTestId('command-palette-item').first();
    await expect(commandItem).toContainText(/hello/i);
    await commandItem.click();

    // The test plugin should render a result or notification
    await expect(page.getByTestId('notification-toast')).toContainText(/hello/i, {
      timeout: 5_000,
    });
  });

  test('dismisses the command palette with Escape', async ({
    authedPage: page,
    workspaceId,
  }) => {
    await openWorkspace(page, workspaceId);
    await page.keyboard.press('Control+Shift+P');
    await expect(page.getByTestId('command-palette')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('command-palette')).not.toBeVisible();
  });

  test('uninstalls the plugin', async ({ authedPage: page, workspaceId }) => {
    await openWorkspace(page, workspaceId);
    await page.getByTestId('plugin-marketplace-button').click();
    await page.getByTestId('plugin-search-input').fill(pluginId);

    const uninstallButton = page.getByTestId(`plugin-uninstall-btn-${pluginId}`);
    await expect(uninstallButton).toBeVisible();
    await uninstallButton.click();

    // Confirmation dialog
    await expect(page.getByTestId('uninstall-confirm-dialog')).toBeVisible();
    await page.getByTestId('uninstall-confirm-btn').click();

    // Plugin should no longer be listed as installed
    await expect(page.getByTestId(`plugin-status-${pluginId}`)).not.toHaveText(/installed|active/i, {
      timeout: 10_000,
    });

    // Command palette no longer exposes the plugin's commands
    await page.keyboard.press('Control+Shift+P');
    await page.getByTestId('command-palette-input').fill('e2e hello');
    await expect(page.getByTestId('command-palette-item')).toHaveCount(0);
    await page.keyboard.press('Escape');
  });
});

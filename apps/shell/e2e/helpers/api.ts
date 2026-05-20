import type { APIRequestContext } from '@playwright/test';

/**
 * All API requests go through the gateway.
 * Set PLAYWRIGHT_API_URL in the environment; falls back to the local gateway default.
 */
function apiUrl(path: string): string {
  const base = process.env['PLAYWRIGHT_API_URL'] ?? 'http://localhost:3000';
  return `${base}${path}`;
}

export interface LoginResult {
  accessToken: string;
}

/**
 * Obtain a fresh access token directly from the auth API.
 * Used in test setup where programmatic auth is faster than UI login.
 */
export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<LoginResult> {
  const res = await request.post(apiUrl('/auth/login'), {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(`API login failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json() as { accessToken: string };
  return { accessToken: body.accessToken };
}

/**
 * Fetch the workspace details via the API to confirm a workspace exists
 * before navigating to it in the UI.
 */
export async function assertWorkspaceExists(
  request: APIRequestContext,
  accessToken: string,
  workspaceId: string,
): Promise<void> {
  const res = await request.get(apiUrl(`/workspaces/${workspaceId}`), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok()) {
    throw new Error(
      `Workspace ${workspaceId} not found (${res.status()}). ` +
      'Ensure E2E_WORKSPACE_ID points to an existing workspace.',
    );
  }
}

/**
 * Upload a test plugin bundle to the registry.
 * Returns the plugin id for use in plugin flow tests.
 */
export async function publishTestPlugin(
  request: APIRequestContext,
  accessToken: string,
  manifest: Record<string, unknown>,
  bundleContent: string,
): Promise<string> {
  const res = await request.post(apiUrl('/plugins'), {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { manifest, bundle: bundleContent },
  });
  if (!res.ok()) {
    throw new Error(`Plugin publish failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json() as { id: string };
  return body.id;
}

/**
 * Delete a test plugin from the registry after a test run.
 */
export async function deleteTestPlugin(
  request: APIRequestContext,
  accessToken: string,
  pluginId: string,
): Promise<void> {
  await request.delete(apiUrl(`/plugins/${pluginId}`), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

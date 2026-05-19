// §14: Unleash feature-flag wrapper.  isEnabled() is the ONLY way to check flags —
// never use if (process.env.NODE_ENV === 'production') in service code.

// Minimal interface — Unleash's isEnabled signature is a superset of this.
interface FlagClient {
  isEnabled(flagName: string): boolean;
}

export interface FlagsConfig {
  url: string;
  appName: string;
  apiToken: string;
}

let client: FlagClient | null = null;

// In-process overrides used only in tests
const testOverrides = new Map<string, boolean>();

/**
 * Initialises the Unleash client.  Call once at service startup before
 * serving any traffic.  Subsequent calls are no-ops.
 */
export async function initFlags(config: FlagsConfig): Promise<void> {
  if (client !== null) return;
  const { initialize } = await import('unleash-client');
  client = initialize({
    url: config.url,
    appName: config.appName,
    customHeaders: { Authorization: config.apiToken },
  });
}

/**
 * Returns true if the named flag is enabled for the current context.
 * Defaults to false when the client is not yet initialised or the flag
 * is unknown — consistent with Unleash's "safe default off" principle.
 */
export function isEnabled(flagName: string): boolean {
  const override = testOverrides.get(flagName);
  if (override !== undefined) return override;
  return client?.isEnabled(flagName) ?? false;
}

// ── Test helpers ─────────────────────────────────────────────────────────────
// Only import these in test files — they bypass the Unleash client entirely.

export function _setTestFlag(flagName: string, value: boolean): void {
  testOverrides.set(flagName, value);
}

export function _clearTestFlags(): void {
  testOverrides.clear();
}

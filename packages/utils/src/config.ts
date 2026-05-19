// §17: process.env is never accessed outside this module.
// Services import createConfigReader or the pre-built env singleton.

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export interface ConfigReader {
  /** Returns the value or throws ConfigError if missing or empty. */
  required(key: string): string;
  /** Returns the value or undefined if missing. */
  optional(key: string): string | undefined;
  /** Returns the value or the supplied default if missing. */
  withDefault(key: string, defaultValue: string): string;
  /** Parses as an integer port (1–65535). Throws on invalid value. */
  port(key: string, defaultValue?: number): number;
  /** Parses as an integer. Throws on invalid value. */
  integer(key: string, defaultValue?: number): number;
  /** Parses true/1/yes → true, false/0/no → false. Throws on anything else. */
  boolean(key: string, defaultValue?: boolean): boolean;
  /** Like required(), but also validates the value is a parseable URL. */
  url(key: string): string;
}

export function createConfigReader(
  source: Readonly<Record<string, string | undefined>> = process.env,
): ConfigReader {
  function getRaw(key: string): string | undefined {
    const v = source[key];
    return v === '' ? undefined : v;
  }

  function requireRaw(key: string): string {
    const v = getRaw(key);
    if (v === undefined) {
      throw new ConfigError(`Required environment variable is missing: ${key}`);
    }
    return v;
  }

  return {
    required(key) {
      return requireRaw(key);
    },

    optional(key) {
      return getRaw(key);
    },

    withDefault(key, defaultValue) {
      return getRaw(key) ?? defaultValue;
    },

    port(key, defaultValue?) {
      const raw = getRaw(key);
      if (raw === undefined) {
        if (defaultValue !== undefined) return defaultValue;
        throw new ConfigError(`Required port environment variable is missing: ${key}`);
      }
      const n = Number.parseInt(raw, 10);
      if (Number.isNaN(n) || n < 1 || n > 65_535) {
        throw new ConfigError(
          `${key} must be a valid port (1–65535), got: ${raw}`,
        );
      }
      return n;
    },

    integer(key, defaultValue?) {
      const raw = getRaw(key);
      if (raw === undefined) {
        if (defaultValue !== undefined) return defaultValue;
        throw new ConfigError(`Required integer environment variable is missing: ${key}`);
      }
      const n = Number.parseInt(raw, 10);
      if (Number.isNaN(n)) {
        throw new ConfigError(`${key} must be an integer, got: ${raw}`);
      }
      return n;
    },

    boolean(key, defaultValue?) {
      const raw = getRaw(key);
      if (raw === undefined) {
        if (defaultValue !== undefined) return defaultValue;
        throw new ConfigError(`Required boolean environment variable is missing: ${key}`);
      }
      if (raw === 'true' || raw === '1' || raw === 'yes') return true;
      if (raw === 'false' || raw === '0' || raw === 'no') return false;
      throw new ConfigError(
        `${key} must be true/1/yes or false/0/no, got: ${raw}`,
      );
    },

    url(key) {
      const value = requireRaw(key);
      try {
        new URL(value);
      } catch {
        throw new ConfigError(`${key} must be a valid URL, got: ${value}`);
      }
      return value;
    },
  };
}

// Pre-built singleton — import this in service code instead of reading process.env directly
export const env: ConfigReader = createConfigReader();

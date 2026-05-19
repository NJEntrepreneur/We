import { describe, expect, it } from 'vitest';
import { ConfigError, createConfigReader } from '../config.js';

function reader(vars: Record<string, string | undefined> = {}) {
  return createConfigReader(vars);
}

describe('required()', () => {
  it('returns the value when present', () => {
    expect(reader({ KEY: 'value' }).required('KEY')).toBe('value');
  });

  it('throws ConfigError when key is absent', () => {
    expect(() => reader({}).required('MISSING')).toThrow(ConfigError);
  });

  it('throws ConfigError when value is empty string', () => {
    expect(() => reader({ KEY: '' }).required('KEY')).toThrow(ConfigError);
  });

  it('error message includes the key name', () => {
    expect(() => reader({}).required('MY_SECRET')).toThrow('MY_SECRET');
  });
});

describe('optional()', () => {
  it('returns the value when present', () => {
    expect(reader({ KEY: 'hello' }).optional('KEY')).toBe('hello');
  });

  it('returns undefined when key is absent', () => {
    expect(reader({}).optional('MISSING')).toBeUndefined();
  });

  it('returns undefined when value is empty string', () => {
    expect(reader({ KEY: '' }).optional('KEY')).toBeUndefined();
  });
});

describe('withDefault()', () => {
  it('returns the env value when present', () => {
    expect(reader({ KEY: 'env-value' }).withDefault('KEY', 'default')).toBe('env-value');
  });

  it('returns the default when key is absent', () => {
    expect(reader({}).withDefault('MISSING', 'fallback')).toBe('fallback');
  });

  it('returns the default when value is empty', () => {
    expect(reader({ KEY: '' }).withDefault('KEY', 'fallback')).toBe('fallback');
  });
});

describe('port()', () => {
  it('parses a valid port', () => {
    expect(reader({ PORT: '3000' }).port('PORT')).toBe(3000);
  });

  it('accepts boundary values 1 and 65535', () => {
    expect(reader({ PORT: '1' }).port('PORT')).toBe(1);
    expect(reader({ PORT: '65535' }).port('PORT')).toBe(65535);
  });

  it('uses default when key is absent', () => {
    expect(reader({}).port('PORT', 8080)).toBe(8080);
  });

  it('throws when value is 0', () => {
    expect(() => reader({ PORT: '0' }).port('PORT')).toThrow(ConfigError);
  });

  it('throws when value is 65536', () => {
    expect(() => reader({ PORT: '65536' }).port('PORT')).toThrow(ConfigError);
  });

  it('throws when value is not a number', () => {
    expect(() => reader({ PORT: 'abc' }).port('PORT')).toThrow(ConfigError);
  });

  it('throws when key absent and no default', () => {
    expect(() => reader({}).port('PORT')).toThrow(ConfigError);
  });
});

describe('integer()', () => {
  it('parses a positive integer', () => {
    expect(reader({ N: '42' }).integer('N')).toBe(42);
  });

  it('parses a negative integer', () => {
    expect(reader({ N: '-7' }).integer('N')).toBe(-7);
  });

  it('uses default when absent', () => {
    expect(reader({}).integer('N', 10)).toBe(10);
  });

  it('throws for non-integer value', () => {
    expect(() => reader({ N: 'not-a-number' }).integer('N')).toThrow(ConfigError);
  });

  it('throws when absent and no default', () => {
    expect(() => reader({}).integer('N')).toThrow(ConfigError);
  });
});

describe('boolean()', () => {
  it.each([['true'], ['1'], ['yes']] as const)('%s → true', (raw) => {
    expect(reader({ FLAG: raw }).boolean('FLAG')).toBe(true);
  });

  it.each([['false'], ['0'], ['no']] as const)('%s → false', (raw) => {
    expect(reader({ FLAG: raw }).boolean('FLAG')).toBe(false);
  });

  it('uses default when absent', () => {
    expect(reader({}).boolean('FLAG', true)).toBe(true);
    expect(reader({}).boolean('FLAG', false)).toBe(false);
  });

  it('throws for unrecognised value', () => {
    expect(() => reader({ FLAG: 'maybe' }).boolean('FLAG')).toThrow(ConfigError);
  });

  it('throws when absent and no default', () => {
    expect(() => reader({}).boolean('FLAG')).toThrow(ConfigError);
  });
});

describe('url()', () => {
  it('returns valid http URL', () => {
    const result = reader({ URL: 'http://localhost:3000' }).url('URL');
    expect(result).toBe('http://localhost:3000');
  });

  it('accepts https URLs', () => {
    expect(() =>
      reader({ URL: 'https://example.com/path' }).url('URL'),
    ).not.toThrow();
  });

  it('throws for a non-URL string', () => {
    expect(() => reader({ URL: 'not a url' }).url('URL')).toThrow(ConfigError);
  });

  it('throws when key is absent', () => {
    expect(() => reader({}).url('URL')).toThrow(ConfigError);
  });
});

describe('env singleton', () => {
  it('is exported and has the required methods', async () => {
    const { env } = await import('../config.js');
    expect(typeof env.required).toBe('function');
    expect(typeof env.optional).toBe('function');
    expect(typeof env.port).toBe('function');
    expect(typeof env.boolean).toBe('function');
    expect(typeof env.url).toBe('function');
  });
});

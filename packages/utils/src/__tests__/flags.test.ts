import { afterEach, describe, expect, it } from 'vitest';
import { _clearTestFlags, _setTestFlag, isEnabled } from '../flags.js';

// These tests exercise the public isEnabled() surface and the test-override
// mechanism.  They never call initFlags() to avoid needing a real Unleash server.

afterEach(() => {
  _clearTestFlags();
});

describe('isEnabled()', () => {
  it('returns false for any flag when client is not initialised', () => {
    expect(isEnabled('some.flag')).toBe(false);
    expect(isEnabled('another.flag')).toBe(false);
  });
});

describe('_setTestFlag() / _clearTestFlags()', () => {
  it('overrides a flag to true', () => {
    _setTestFlag('feature.x', true);
    expect(isEnabled('feature.x')).toBe(true);
  });

  it('overrides a flag to false', () => {
    _setTestFlag('feature.x', false);
    expect(isEnabled('feature.x')).toBe(false);
  });

  it('does not affect other flags', () => {
    _setTestFlag('feature.a', true);
    expect(isEnabled('feature.b')).toBe(false);
  });

  it('override takes precedence regardless of client state', () => {
    _setTestFlag('collab.yjs-awareness', true);
    expect(isEnabled('collab.yjs-awareness')).toBe(true);
  });

  it('_clearTestFlags() removes all overrides', () => {
    _setTestFlag('feature.x', true);
    _setTestFlag('feature.y', true);
    _clearTestFlags();
    expect(isEnabled('feature.x')).toBe(false);
    expect(isEnabled('feature.y')).toBe(false);
  });

  it('can re-set a flag after clearing', () => {
    _setTestFlag('flag', true);
    _clearTestFlags();
    _setTestFlag('flag', false);
    expect(isEnabled('flag')).toBe(false);
  });
});

describe('initFlags()', () => {
  it('is exported and is a function', async () => {
    const { initFlags } = await import('../flags.js');
    expect(typeof initFlags).toBe('function');
  });
});

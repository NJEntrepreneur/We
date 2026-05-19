import { describe, expect, it } from 'vitest';
import {
  hash,
  hmacSign,
  hmacVerify,
  randomBytes,
  randomId,
  sriHash,
} from '../crypto.js';

describe('hash()', () => {
  it('returns a hex string for SHA-256', async () => {
    const result = await hash('SHA-256', 'hello');
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns a hex string for SHA-384', async () => {
    const result = await hash('SHA-384', 'hello');
    expect(result).toMatch(/^[0-9a-f]{96}$/);
  });

  it('is deterministic', async () => {
    const h1 = await hash('SHA-256', 'same input');
    const h2 = await hash('SHA-256', 'same input');
    expect(h1).toBe(h2);
  });

  it('produces different digests for different inputs', async () => {
    const h1 = await hash('SHA-256', 'hello');
    const h2 = await hash('SHA-256', 'world');
    expect(h1).not.toBe(h2);
  });

  it('accepts Uint8Array input', async () => {
    const bytes = new TextEncoder().encode('hello');
    const fromBytes = await hash('SHA-256', bytes);
    const fromString = await hash('SHA-256', 'hello');
    expect(fromBytes).toBe(fromString);
  });

  it('accepts ArrayBuffer input', async () => {
    const buf = new TextEncoder().encode('hello').buffer;
    const result = await hash('SHA-256', buf);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('hmacSign() + hmacVerify()', () => {
  it('verifies a signature it produced', async () => {
    const sig = await hmacSign('my-secret', 'my-data');
    expect(await hmacVerify('my-secret', 'my-data', sig)).toBe(true);
  });

  it('returns false for tampered data', async () => {
    const sig = await hmacSign('my-secret', 'original');
    expect(await hmacVerify('my-secret', 'tampered', sig)).toBe(false);
  });

  it('returns false for a wrong secret', async () => {
    const sig = await hmacSign('correct-secret', 'data');
    expect(await hmacVerify('wrong-secret', 'data', sig)).toBe(false);
  });

  it('returns false for a tampered signature', async () => {
    const sig = await hmacSign('secret', 'data');
    const tampered = sig.slice(0, -2) + '00';
    expect(await hmacVerify('secret', 'data', tampered)).toBe(false);
  });

  it('produces hex output of correct length (HMAC-SHA256 = 32 bytes = 64 hex chars)', async () => {
    const sig = await hmacSign('secret', 'data');
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same inputs', async () => {
    const s1 = await hmacSign('sec', 'msg');
    const s2 = await hmacSign('sec', 'msg');
    expect(s1).toBe(s2);
  });
});

describe('sriHash()', () => {
  it('produces the expected sha384- prefix', async () => {
    const result = await sriHash('hello');
    expect(result).toMatch(/^sha384-/);
  });

  it('matches the SRI format used in plugin manifests', async () => {
    const result = await sriHash('hello');
    expect(result).toMatch(/^sha384-[A-Za-z0-9+/]+=*$/);
  });

  it('is deterministic', async () => {
    const h1 = await sriHash('content');
    const h2 = await sriHash('content');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different content', async () => {
    const h1 = await sriHash('plugin-a');
    const h2 = await sriHash('plugin-b');
    expect(h1).not.toBe(h2);
  });

  it('accepts Uint8Array input', async () => {
    const bytes = new TextEncoder().encode('hello');
    const fromBytes = await sriHash(bytes);
    const fromString = await sriHash('hello');
    expect(fromBytes).toBe(fromString);
  });

  it('produces base64 of exactly 64 chars for sha384 (48 bytes)', async () => {
    const result = await sriHash('any content');
    const b64Part = result.slice('sha384-'.length);
    expect(atob(b64Part)).toHaveLength(48);
  });
});

describe('randomId()', () => {
  it('returns a valid UUID v4', () => {
    const id = randomId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('returns a different value on each call', () => {
    expect(randomId()).not.toBe(randomId());
  });
});

describe('randomBytes()', () => {
  it('returns a hex string of the correct length', () => {
    expect(randomBytes(16)).toMatch(/^[0-9a-f]{32}$/);
    expect(randomBytes(32)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns different values on each call', () => {
    expect(randomBytes(16)).not.toBe(randomBytes(16));
  });

  it('throws for length < 1', () => {
    expect(() => randomBytes(0)).toThrow(RangeError);
  });
});

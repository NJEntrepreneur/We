import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import { verifyAccessToken } from '../plugins/jwt.js';
import { Role } from '@platform/types';

const SECRET = new TextEncoder().encode(
  'test-secret-that-is-long-enough-for-hs256-algorithm',
);

async function signToken(
  payload: Record<string, unknown>,
  expiresIn = '15m',
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET);
}

const validPayload = {
  sub: '00000000-0000-0000-0000-000000000001',
  jti: '00000000-0000-0000-0000-000000000002',
  role: Role.Developer,
};

// ── verifyAccessToken ────────────────────────────────────────────────────────

describe('verifyAccessToken()', () => {
  it('resolves with parsed payload for a valid token', async () => {
    const token = await signToken(validPayload);
    const result = await verifyAccessToken(token, SECRET);
    expect(result.sub).toBe(validPayload.sub);
    expect(result.jti).toBe(validPayload.jti);
    expect(result.role).toBe(Role.Developer);
    expect(typeof result.iat).toBe('number');
    expect(typeof result.exp).toBe('number');
  });

  it('rejects with an invalid token string', async () => {
    await expect(verifyAccessToken('not.a.token', SECRET)).rejects.toThrow();
  });

  it('rejects when signed with a different secret', async () => {
    const wrongSecret = new TextEncoder().encode('wrong-secret-long-enough-for-the-algorithm');
    const token = await signToken(validPayload);
    await expect(verifyAccessToken(token, wrongSecret)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const token = await signToken(validPayload, '-1s');
    await expect(verifyAccessToken(token, SECRET)).rejects.toThrow();
  });

  it('rejects when sub is not a UUID', async () => {
    const token = await signToken({ ...validPayload, sub: 'not-a-uuid' });
    await expect(verifyAccessToken(token, SECRET)).rejects.toThrow();
  });

  it('rejects when role is not a valid Role enum value', async () => {
    const token = await signToken({ ...validPayload, role: 'superuser' });
    await expect(verifyAccessToken(token, SECRET)).rejects.toThrow();
  });

  it('rejects when jti is missing', async () => {
    const { jti: _jti, ...withoutJti } = validPayload;
    const token = await signToken(withoutJti);
    await expect(verifyAccessToken(token, SECRET)).rejects.toThrow();
  });

  it('accepts all valid Role values', async () => {
    const roles = [Role.Owner, Role.Admin, Role.Developer, Role.Viewer, Role.Plugin];
    for (const role of roles) {
      const token = await signToken({ ...validPayload, role });
      const result = await verifyAccessToken(token, SECRET);
      expect(result.role).toBe(role);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { Role } from '@platform/types';
import {
  issueAccessToken,
  issueRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../lib/tokens.js';

const ACCESS_SECRET  = new TextEncoder().encode('test-access-secret-long-enough-for-hs256');
const REFRESH_SECRET = new TextEncoder().encode('test-refresh-secret-long-enough-for-hs256');

const USER_ID   = '00000000-0000-0000-0000-000000000001';
const FAMILY_ID = '00000000-0000-0000-0000-000000000002';

// ── Access token ──────────────────────────────────────────────────────────────

describe('issueAccessToken()', () => {
  it('returns a signed JWT string', async () => {
    const token = await issueAccessToken(USER_ID, Role.Developer, ACCESS_SECRET);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });

  it('verifies cleanly and returns parsed payload', async () => {
    const token = await issueAccessToken(USER_ID, Role.Developer, ACCESS_SECRET);
    const payload = await verifyAccessToken(token, ACCESS_SECRET);
    expect(payload.sub).toBe(USER_ID);
    expect(payload.role).toBe(Role.Developer);
    expect(typeof payload.jti).toBe('string');
    expect(payload.exp - payload.iat).toBe(15 * 60);
  });

  it('issues unique jti for each call', async () => {
    const t1 = await issueAccessToken(USER_ID, Role.Developer, ACCESS_SECRET);
    const t2 = await issueAccessToken(USER_ID, Role.Developer, ACCESS_SECRET);
    const p1 = await verifyAccessToken(t1, ACCESS_SECRET);
    const p2 = await verifyAccessToken(t2, ACCESS_SECRET);
    expect(p1.jti).not.toBe(p2.jti);
  });

  it('works for all Role values', async () => {
    const roles = [Role.Owner, Role.Admin, Role.Developer, Role.Viewer, Role.Plugin];
    for (const role of roles) {
      const token = await issueAccessToken(USER_ID, role, ACCESS_SECRET);
      const payload = await verifyAccessToken(token, ACCESS_SECRET);
      expect(payload.role).toBe(role);
    }
  });

  it('rejects verification with wrong secret', async () => {
    const token = await issueAccessToken(USER_ID, Role.Developer, ACCESS_SECRET);
    const wrong = new TextEncoder().encode('wrong-secret-that-is-long-enough-here');
    await expect(verifyAccessToken(token, wrong)).rejects.toThrow();
  });
});

// ── Refresh token ─────────────────────────────────────────────────────────────

describe('issueRefreshToken()', () => {
  it('returns a token string and a jti', async () => {
    const { token, jti } = await issueRefreshToken(USER_ID, FAMILY_ID, REFRESH_SECRET);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
    expect(typeof jti).toBe('string');
  });

  it('verifies cleanly and contains correct claims', async () => {
    const { token } = await issueRefreshToken(USER_ID, FAMILY_ID, REFRESH_SECRET);
    const payload = await verifyRefreshToken(token, REFRESH_SECRET);
    expect(payload.sub).toBe(USER_ID);
    expect(payload.familyId).toBe(FAMILY_ID);
    expect(typeof payload.jti).toBe('string');
  });

  it('jti in payload matches returned jti', async () => {
    const { token, jti } = await issueRefreshToken(USER_ID, FAMILY_ID, REFRESH_SECRET);
    const payload = await verifyRefreshToken(token, REFRESH_SECRET);
    expect(payload.jti).toBe(jti);
  });

  it('refresh token lifetime is 7 days', async () => {
    const { token } = await issueRefreshToken(USER_ID, FAMILY_ID, REFRESH_SECRET);
    const payload = await verifyRefreshToken(token, REFRESH_SECRET);
    expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
  });

  it('rejects verification with wrong secret', async () => {
    const { token } = await issueRefreshToken(USER_ID, FAMILY_ID, REFRESH_SECRET);
    const wrong = new TextEncoder().encode('wrong-secret-that-is-long-enough-here');
    await expect(verifyRefreshToken(token, wrong)).rejects.toThrow();
  });

  it('rejects access token presented as refresh token', async () => {
    const accessToken = await issueAccessToken(USER_ID, Role.Developer, ACCESS_SECRET);
    // Signed with access secret but verified against refresh secret — should fail
    await expect(verifyRefreshToken(accessToken, REFRESH_SECRET)).rejects.toThrow();
  });
});

// ── Password library (imported for coverage) ─────────────────────────────────

describe('password hashing', () => {
  it('hashPassword returns colon-separated salt:key', async () => {
    const { hashPassword } = await import('../lib/password.js');
    const h = await hashPassword('correct-horse-battery-staple');
    expect(h).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it('verifyPassword returns true for matching plaintext', async () => {
    const { hashPassword, verifyPassword } = await import('../lib/password.js');
    const h = await hashPassword('correct-horse-battery-staple');
    expect(await verifyPassword('correct-horse-battery-staple', h)).toBe(true);
  });

  it('verifyPassword returns false for wrong plaintext', async () => {
    const { hashPassword, verifyPassword } = await import('../lib/password.js');
    const h = await hashPassword('correct-horse-battery-staple');
    expect(await verifyPassword('wrong-password', h)).toBe(false);
  });

  it('produces different hashes for the same password (salted)', async () => {
    const { hashPassword } = await import('../lib/password.js');
    const h1 = await hashPassword('same-password');
    const h2 = await hashPassword('same-password');
    expect(h1).not.toBe(h2);
  });
});

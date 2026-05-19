import { describe, it, expect } from 'vitest';
import {
  AccessTokenClaimsSchema,
  PluginTokenClaimsSchema,
  RefreshTokenPayloadSchema,
  CsrfTokenSchema,
  OAuthProviderSchema,
} from '../schemas/auth';
import { Role } from '../enums/roles';

const now    = Math.floor(Date.now() / 1000);
const future = now + 900;

describe('AccessTokenClaimsSchema', () => {
  const valid = {
    sub:  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    role: Role.Developer,
    iat:  now,
    exp:  future,
    jti:  '550e8400-e29b-41d4-a716-446655440000',
  };

  it('parses valid access token claims', () => {
    const result = AccessTokenClaimsSchema.parse(valid);
    expect(result.role).toBe(Role.Developer);
    expect(result.sub).toBe(valid.sub);
  });

  it('accepts optional workspaceId', () => {
    const result = AccessTokenClaimsSchema.parse({
      ...valid,
      workspaceId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    });
    expect(result.workspaceId).toBe('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
  });

  it('rejects a non-UUID sub', () => {
    expect(() => AccessTokenClaimsSchema.parse({ ...valid, sub: 'not-a-uuid' })).toThrow();
  });

  it('rejects a non-UUID jti', () => {
    expect(() => AccessTokenClaimsSchema.parse({ ...valid, jti: 'bad-jti' })).toThrow();
  });

  it('rejects an invalid role', () => {
    expect(() => AccessTokenClaimsSchema.parse({ ...valid, role: 'guest' })).toThrow();
  });

  it('rejects a non-integer iat', () => {
    expect(() => AccessTokenClaimsSchema.parse({ ...valid, iat: 1234.5 })).toThrow();
  });

  it('accepts all valid roles', () => {
    for (const role of Object.values(Role)) {
      expect(() => AccessTokenClaimsSchema.parse({ ...valid, role })).not.toThrow();
    }
  });
});

describe('PluginTokenClaimsSchema', () => {
  const valid = {
    sub:         'com.example.my-plugin',
    workspaceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    permissions: ['fs.read', 'editor.decorate'] as const,
    iat:         now,
    exp:         future,
    jti:         '550e8400-e29b-41d4-a716-446655440000',
  };

  it('parses valid plugin token claims', () => {
    const result = PluginTokenClaimsSchema.parse(valid);
    expect(result.sub).toBe('com.example.my-plugin');
    expect(result.permissions).toContain('fs.read');
  });

  it('accepts an empty permissions array', () => {
    expect(() =>
      PluginTokenClaimsSchema.parse({ ...valid, permissions: [] }),
    ).not.toThrow();
  });

  it('rejects an unknown permission', () => {
    expect(() =>
      PluginTokenClaimsSchema.parse({ ...valid, permissions: ['shell.exec'] }),
    ).toThrow();
  });

  it('rejects empty sub', () => {
    expect(() =>
      PluginTokenClaimsSchema.parse({ ...valid, sub: '' }),
    ).toThrow();
  });

  it('rejects a non-UUID workspaceId', () => {
    expect(() =>
      PluginTokenClaimsSchema.parse({ ...valid, workspaceId: 'not-a-uuid' }),
    ).toThrow();
  });
});

describe('RefreshTokenPayloadSchema', () => {
  const valid = {
    userId:    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    familyId:  '550e8400-e29b-41d4-a716-446655440000',
    tokenId:   '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    issuedAt:  now,
    expiresAt: now + 604800,
  };

  it('parses a valid refresh token payload', () => {
    const result = RefreshTokenPayloadSchema.parse(valid);
    expect(result.familyId).toBe(valid.familyId);
  });

  it('rejects non-UUID userId', () => {
    expect(() =>
      RefreshTokenPayloadSchema.parse({ ...valid, userId: 'bad' }),
    ).toThrow();
  });

  it('rejects non-integer issuedAt', () => {
    expect(() =>
      RefreshTokenPayloadSchema.parse({ ...valid, issuedAt: 1234.5 }),
    ).toThrow();
  });
});

describe('CsrfTokenSchema', () => {
  const valid = {
    value:     'a'.repeat(32),
    sessionId: 'sess_abc123',
    createdAt: now,
  };

  it('parses a valid CSRF token', () => {
    const result = CsrfTokenSchema.parse(valid);
    expect(result.value.length).toBeGreaterThanOrEqual(32);
  });

  it('rejects value shorter than 32 characters', () => {
    expect(() =>
      CsrfTokenSchema.parse({ ...valid, value: 'a'.repeat(31) }),
    ).toThrow();
  });

  it('accepts value longer than 32 characters', () => {
    expect(() =>
      CsrfTokenSchema.parse({ ...valid, value: 'a'.repeat(64) }),
    ).not.toThrow();
  });

  it('rejects empty sessionId', () => {
    expect(() =>
      CsrfTokenSchema.parse({ ...valid, sessionId: '' }),
    ).toThrow();
  });
});

describe('OAuthProviderSchema', () => {
  it('accepts all supported providers', () => {
    for (const provider of ['github', 'gitlab', 'google'] as const) {
      expect(() => OAuthProviderSchema.parse(provider)).not.toThrow();
    }
  });

  it('rejects unsupported providers', () => {
    expect(() => OAuthProviderSchema.parse('bitbucket')).toThrow();
    expect(() => OAuthProviderSchema.parse('microsoft')).toThrow();
  });
});

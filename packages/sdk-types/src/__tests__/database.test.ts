import { describe, it, expect } from 'vitest';
import {
  UserSchema,
  WorkspaceSchema,
  WorkspaceMemberSchema,
  PluginRecordSchema,
  PluginVersionSchema,
  PluginInstallSchema,
  RefreshTokenFamilySchema,
  FeatureFlagSchema,
} from '../schemas/database';
import { Role } from '../enums/roles';

const uuid = (n: number): string => `f47ac10b-58cc-4372-a567-0e02b2c3d4${String(n).padStart(2, '0')}`;

describe('UserSchema', () => {
  const valid = {
    id:            uuid(1),
    email:         'alice@example.com',
    displayName:   'Alice',
    role:          Role.Developer,
    oauthProvider: 'github',
    createdAt:     new Date(),
    updatedAt:     new Date(),
    deletedAt:     null,
  };

  it('parses a valid user', () => {
    const result = UserSchema.parse(valid);
    expect(result.email).toBe('alice@example.com');
    expect(result.deletedAt).toBeNull();
  });

  it('accepts a soft-deleted user', () => {
    const result = UserSchema.parse({ ...valid, deletedAt: new Date() });
    expect(result.deletedAt).toBeInstanceOf(Date);
  });

  it('accepts null oauthProvider', () => {
    expect(() => UserSchema.parse({ ...valid, oauthProvider: null })).not.toThrow();
  });

  it('coerces timestamp strings to Date', () => {
    const result = UserSchema.parse({
      ...valid,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('rejects an invalid email', () => {
    expect(() => UserSchema.parse({ ...valid, email: 'not-an-email' })).toThrow();
  });

  it('rejects an invalid role', () => {
    expect(() => UserSchema.parse({ ...valid, role: 'superuser' })).toThrow();
  });

  it('rejects a non-UUID id', () => {
    expect(() => UserSchema.parse({ ...valid, id: 'bad-id' })).toThrow();
  });
});

describe('WorkspaceSchema', () => {
  const valid = {
    id:        uuid(2),
    name:      'My Workspace',
    ownerId:   uuid(1),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('parses a valid workspace', () => {
    const result = WorkspaceSchema.parse(valid);
    expect(result.name).toBe('My Workspace');
  });

  it('rejects empty name', () => {
    expect(() => WorkspaceSchema.parse({ ...valid, name: '' })).toThrow();
  });

  it('rejects a non-UUID ownerId', () => {
    expect(() => WorkspaceSchema.parse({ ...valid, ownerId: 'bad' })).toThrow();
  });
});

describe('WorkspaceMemberSchema', () => {
  const valid = {
    workspaceId: uuid(2),
    userId:      uuid(1),
    role:        Role.Developer,
    invitedAt:   new Date(),
    acceptedAt:  null,
  };

  it('parses a pending invitation (null acceptedAt)', () => {
    const result = WorkspaceMemberSchema.parse(valid);
    expect(result.acceptedAt).toBeNull();
  });

  it('parses an accepted invitation', () => {
    const result = WorkspaceMemberSchema.parse({ ...valid, acceptedAt: new Date() });
    expect(result.acceptedAt).toBeInstanceOf(Date);
  });

  it('rejects an invalid role', () => {
    expect(() => WorkspaceMemberSchema.parse({ ...valid, role: 'observer' })).toThrow();
  });
});

describe('PluginRecordSchema', () => {
  const valid = {
    id:            uuid(3),
    name:          'My Plugin',
    publisherId:   uuid(1),
    latestVersion: '2.0.1',
    publishedAt:   new Date(),
  };

  it('parses a valid plugin record', () => {
    const result = PluginRecordSchema.parse(valid);
    expect(result.latestVersion).toBe('2.0.1');
  });

  it('rejects non-semver latestVersion', () => {
    expect(() =>
      PluginRecordSchema.parse({ ...valid, latestVersion: '2.0' }),
    ).toThrow();
    expect(() =>
      PluginRecordSchema.parse({ ...valid, latestVersion: 'v2.0.1' }),
    ).toThrow();
  });

  it('rejects empty name', () => {
    expect(() => PluginRecordSchema.parse({ ...valid, name: '' })).toThrow();
  });
});

describe('PluginVersionSchema', () => {
  const validManifest = {
    id:         'com.example.plugin',
    name:       'Example',
    version:    '1.0.0',
    apiVersion: '1' as const,
    permissions: [],
    entrypoint: 'dist/index.js',
    integrity:  'sha384-abc',
    contributes: { commands: [], panels: [], themes: [], languageProviders: [] },
  };

  const valid = {
    id:            uuid(4),
    pluginId:      uuid(3),
    version:       '1.0.0',
    integrityHash: 'sha384-abc123',
    manifest:      validManifest,
    bundleUrl:     'https://cdn.example.com/plugins/com.example.plugin/1.0.0/bundle.js',
  };

  it('parses a valid plugin version', () => {
    const result = PluginVersionSchema.parse(valid);
    expect(result.version).toBe('1.0.0');
    expect(result.manifest.id).toBe('com.example.plugin');
  });

  it('rejects integrityHash without sha384- prefix', () => {
    expect(() =>
      PluginVersionSchema.parse({ ...valid, integrityHash: 'md5-abc' }),
    ).toThrow();
  });

  it('rejects an invalid bundleUrl', () => {
    expect(() =>
      PluginVersionSchema.parse({ ...valid, bundleUrl: 'not-a-url' }),
    ).toThrow();
  });

  it('rejects non-semver version', () => {
    expect(() =>
      PluginVersionSchema.parse({ ...valid, version: '1.0.0-rc1' }),
    ).toThrow();
  });
});

describe('PluginInstallSchema', () => {
  const valid = {
    workspaceId: uuid(2),
    pluginId:    uuid(3),
    version:     '1.0.0',
    installedBy: uuid(1),
    installedAt: new Date(),
  };

  it('parses a valid plugin install', () => {
    const result = PluginInstallSchema.parse(valid);
    expect(result.version).toBe('1.0.0');
  });

  it('rejects non-semver version', () => {
    expect(() => PluginInstallSchema.parse({ ...valid, version: '1' })).toThrow();
  });
});

describe('RefreshTokenFamilySchema', () => {
  const valid = {
    id:        uuid(5),
    userId:    uuid(1),
    familyId:  uuid(6),
    tokenHash: 'sha256:abcdef1234567890',
    usedAt:    null,
    revokedAt: null,
  };

  it('parses an active token family', () => {
    const result = RefreshTokenFamilySchema.parse(valid);
    expect(result.usedAt).toBeNull();
    expect(result.revokedAt).toBeNull();
  });

  it('parses a revoked token family', () => {
    const result = RefreshTokenFamilySchema.parse({
      ...valid,
      usedAt:    new Date(),
      revokedAt: new Date(),
    });
    expect(result.revokedAt).toBeInstanceOf(Date);
  });

  it('rejects empty tokenHash', () => {
    expect(() =>
      RefreshTokenFamilySchema.parse({ ...valid, tokenHash: '' }),
    ).toThrow();
  });
});

describe('FeatureFlagSchema', () => {
  const valid = {
    id:         uuid(7),
    name:       'collab.yjs-awareness',
    enabled:    false,
    rolloutPct: 0,
    createdAt:  new Date(),
  };

  it('parses a disabled flag at 0%', () => {
    const result = FeatureFlagSchema.parse(valid);
    expect(result.enabled).toBe(false);
    expect(result.rolloutPct).toBe(0);
  });

  it('parses a fully enabled flag at 100%', () => {
    expect(() =>
      FeatureFlagSchema.parse({ ...valid, enabled: true, rolloutPct: 100 }),
    ).not.toThrow();
  });

  it('rejects rolloutPct above 100', () => {
    expect(() =>
      FeatureFlagSchema.parse({ ...valid, rolloutPct: 101 }),
    ).toThrow();
  });

  it('rejects rolloutPct below 0', () => {
    expect(() =>
      FeatureFlagSchema.parse({ ...valid, rolloutPct: -1 }),
    ).toThrow();
  });

  it('rejects a non-integer rolloutPct', () => {
    expect(() =>
      FeatureFlagSchema.parse({ ...valid, rolloutPct: 50.5 }),
    ).toThrow();
  });

  it('rejects empty name', () => {
    expect(() => FeatureFlagSchema.parse({ ...valid, name: '' })).toThrow();
  });
});

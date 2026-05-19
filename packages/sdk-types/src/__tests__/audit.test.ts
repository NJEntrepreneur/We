import { describe, it, expect } from 'vitest';
import { AuditEntrySchema } from '../schemas/audit';
import { Role } from '../enums/roles';

const validEntry = {
  id:           'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  timestamp:    new Date('2025-01-15T12:00:00.000Z'),
  actorId:      '550e8400-e29b-41d4-a716-446655440000',
  actorRole:    Role.Admin,
  action:       'plugin.install',
  resourceType: 'plugin',
  resourceId:   '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  metadata:     { pluginName: 'my-plugin', version: '1.0.0' },
  ipAddress:    '203.0.113.42',
  userAgent:    'Mozilla/5.0 (compatible)',
};

describe('AuditEntrySchema', () => {
  it('parses a valid audit entry', () => {
    const result = AuditEntrySchema.parse(validEntry);
    expect(result.action).toBe('plugin.install');
    expect(result.actorRole).toBe(Role.Admin);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('coerces a timestamp string to Date', () => {
    const result = AuditEntrySchema.parse({
      ...validEntry,
      timestamp: '2025-01-15T12:00:00.000Z',
    });
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('accepts all valid roles', () => {
    const roles = [Role.Owner, Role.Admin, Role.Developer, Role.Viewer, Role.Plugin];
    for (const role of roles) {
      expect(() => AuditEntrySchema.parse({ ...validEntry, actorRole: role })).not.toThrow();
    }
  });

  it('rejects an invalid role', () => {
    expect(() =>
      AuditEntrySchema.parse({ ...validEntry, actorRole: 'superadmin' }),
    ).toThrow();
  });

  it('accepts IPv4 addresses', () => {
    expect(() =>
      AuditEntrySchema.parse({ ...validEntry, ipAddress: '192.168.1.1' }),
    ).not.toThrow();
    expect(() =>
      AuditEntrySchema.parse({ ...validEntry, ipAddress: '0.0.0.0' }),
    ).not.toThrow();
  });

  it('accepts IPv6 addresses', () => {
    expect(() =>
      AuditEntrySchema.parse({ ...validEntry, ipAddress: '2001:db8::1' }),
    ).not.toThrow();
    expect(() =>
      AuditEntrySchema.parse({ ...validEntry, ipAddress: '::1' }),
    ).not.toThrow();
  });

  it('rejects an invalid IP address', () => {
    expect(() =>
      AuditEntrySchema.parse({ ...validEntry, ipAddress: 'not-an-ip' }),
    ).toThrow();
    expect(() =>
      AuditEntrySchema.parse({ ...validEntry, ipAddress: '999.999.999.999' }),
    ).toThrow();
  });

  it('rejects a non-UUID id', () => {
    expect(() =>
      AuditEntrySchema.parse({ ...validEntry, id: 'not-a-uuid' }),
    ).toThrow();
  });

  it('rejects a non-UUID actorId', () => {
    expect(() =>
      AuditEntrySchema.parse({ ...validEntry, actorId: 'bad-id' }),
    ).toThrow();
  });

  it('rejects an empty action', () => {
    expect(() =>
      AuditEntrySchema.parse({ ...validEntry, action: '' }),
    ).toThrow();
  });

  it('rejects an empty userAgent', () => {
    expect(() =>
      AuditEntrySchema.parse({ ...validEntry, userAgent: '' }),
    ).toThrow();
  });

  it('accepts arbitrary metadata values', () => {
    const result = AuditEntrySchema.parse({
      ...validEntry,
      metadata: {
        nested: { deep: true },
        count:  42,
        tags:   ['a', 'b'],
        nullish: null,
      },
    });
    expect(result.metadata['count']).toBe(42);
  });

  it('rejects missing required fields', () => {
    const { action: _action, ...withoutAction } = validEntry;
    expect(() => AuditEntrySchema.parse(withoutAction)).toThrow();
  });
});

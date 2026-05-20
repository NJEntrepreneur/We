import { describe, it, expect } from 'vitest';
import {
  PluginManifestSchema,
  RoleSchema,
  LoginRequestSchema,
  ExecutionRequestSchema,
  PluginRPCRequestSchema,
} from '../index.js';
import { Role } from '../index.js';

describe('RoleSchema', () => {
  it('accepts all valid roles', () => {
    expect(RoleSchema.parse('owner')).toBe(Role.Owner);
    expect(RoleSchema.parse('admin')).toBe(Role.Admin);
    expect(RoleSchema.parse('developer')).toBe(Role.Developer);
    expect(RoleSchema.parse('viewer')).toBe(Role.Viewer);
    expect(RoleSchema.parse('plugin')).toBe(Role.Plugin);
  });

  it('rejects unknown roles', () => {
    expect(() => RoleSchema.parse('superadmin')).toThrow();
    expect(() => RoleSchema.parse('')).toThrow();
    expect(() => RoleSchema.parse(42)).toThrow();
  });
});

describe('LoginRequestSchema', () => {
  it('accepts valid credentials', () => {
    const result = LoginRequestSchema.parse({ email: 'user@example.com', password: 'secret123' });
    expect(result.email).toBe('user@example.com');
    expect(result.password).toBe('secret123');
  });

  it('rejects invalid email', () => {
    expect(() => LoginRequestSchema.parse({ email: 'not-an-email', password: 'secret123' })).toThrow();
  });

  it('rejects missing password', () => {
    expect(() => LoginRequestSchema.parse({ email: 'user@example.com' })).toThrow();
  });

  it('rejects missing fields', () => {
    expect(() => LoginRequestSchema.parse({})).toThrow();
  });
});

describe('PluginManifestSchema', () => {
  const validManifest = {
    id: 'com.example.my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    apiVersion: '1',
    permissions: ['fs.read'],
    entrypoint: 'dist/index.js',
    integrity: 'sha384-abc123',
    contributes: { commands: [], panels: [], themes: [], languageProviders: [] },
  };

  it('accepts a valid plugin manifest', () => {
    const result = PluginManifestSchema.parse(validManifest);
    expect(result.id).toBe('com.example.my-plugin');
    expect(result.permissions).toContain('fs.read');
  });

  it('rejects unknown permissions', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, permissions: ['unknown.permission'] }),
    ).toThrow();
  });

  it('rejects invalid version format', () => {
    expect(() => PluginManifestSchema.parse({ ...validManifest, version: 'not-semver' })).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => PluginManifestSchema.parse({ id: 'com.example.x' })).toThrow();
  });
});

describe('ExecutionRequestSchema', () => {
  it('accepts valid execution request', () => {
    const result = ExecutionRequestSchema.parse({
      language: 'javascript',
      code: 'console.log("hello")',
    });
    expect(result.language).toBe('javascript');
  });

  it('rejects unknown language', () => {
    expect(() =>
      ExecutionRequestSchema.parse({ language: 'cobol', code: 'DISPLAY "hello"' }),
    ).toThrow();
  });

  it('caps timeoutMs at 10000', () => {
    expect(() =>
      ExecutionRequestSchema.parse({ language: 'python', code: 'print(1)', timeoutMs: 99999 }),
    ).toThrow();
  });
});

describe('PluginRPCRequestSchema', () => {
  it('accepts a valid RPC request', () => {
    const result = PluginRPCRequestSchema.parse({
      id: '00000000-0000-0000-0000-000000000001',
      method: 'fs.read',
      params: { path: '/foo.ts' },
      capabilityToken: 'tok-abc',
    });
    expect(result.method).toBe('fs.read');
  });

  it('rejects missing capabilityToken', () => {
    expect(() =>
      PluginRPCRequestSchema.parse({
        id: '00000000-0000-0000-0000-000000000001',
        method: 'fs.read',
        params: {},
      }),
    ).toThrow();
  });
});

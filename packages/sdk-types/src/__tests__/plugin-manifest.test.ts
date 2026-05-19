import { describe, it, expect } from 'vitest';
import {
  PluginManifestSchema,
  PluginPermissionSchema,
  PluginContributesSchema,
  PLUGIN_PERMISSIONS,
} from '../schemas/plugin-manifest';

const validManifest = {
  id:         'com.example.my-plugin',
  name:       'My Plugin',
  version:    '1.0.0',
  apiVersion: '1' as const,
  permissions: ['fs.read', 'network.fetch'] as const,
  entrypoint: 'dist/index.js',
  integrity:  'sha384-abc123def456',
  contributes: {
    commands:          [],
    panels:            [],
    themes:            [],
    languageProviders: [],
  },
};

describe('PluginPermissionSchema', () => {
  it('accepts every defined permission', () => {
    for (const perm of PLUGIN_PERMISSIONS) {
      expect(() => PluginPermissionSchema.parse(perm)).not.toThrow();
    }
  });

  it('rejects an unknown permission', () => {
    expect(() => PluginPermissionSchema.parse('fs.execute')).toThrow();
  });

  it('rejects empty string', () => {
    expect(() => PluginPermissionSchema.parse('')).toThrow();
  });
});

describe('PluginContributesSchema', () => {
  it('parses a full object', () => {
    const result = PluginContributesSchema.parse({
      commands:          ['my.command'],
      panels:            ['myPanel'],
      themes:            ['myTheme'],
      languageProviders: ['typescript'],
    });
    expect(result.commands).toEqual(['my.command']);
  });

  it('defaults all arrays to empty when fields are absent', () => {
    const result = PluginContributesSchema.parse({});
    expect(result.commands).toEqual([]);
    expect(result.panels).toEqual([]);
    expect(result.themes).toEqual([]);
    expect(result.languageProviders).toEqual([]);
  });
});

describe('PluginManifestSchema', () => {
  it('parses a valid manifest', () => {
    const result = PluginManifestSchema.parse(validManifest);
    expect(result.id).toBe('com.example.my-plugin');
    expect(result.apiVersion).toBe('1');
  });

  it('accepts deep reverse-domain IDs', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, id: 'io.github.org.my-plugin' }),
    ).not.toThrow();
  });

  it('rejects single-segment IDs (no dot)', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, id: 'myplugin' }),
    ).toThrow();
  });

  it('rejects IDs with uppercase letters', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, id: 'com.Example.plugin' }),
    ).toThrow();
  });

  it('rejects IDs starting with a digit', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, id: '1com.example.plugin' }),
    ).toThrow();
  });

  it('rejects version that is not semver', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, version: '1.0' }),
    ).toThrow();
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, version: '1.0.0-beta' }),
    ).toThrow();
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, version: 'v1.0.0' }),
    ).toThrow();
  });

  it('rejects apiVersion other than "1"', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, apiVersion: '2' }),
    ).toThrow();
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, apiVersion: 1 }),
    ).toThrow();
  });

  it('rejects an unknown permission in the array', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, permissions: ['fs.read', 'shell.exec'] }),
    ).toThrow();
  });

  it('accepts empty permissions array', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, permissions: [] }),
    ).not.toThrow();
  });

  it('accepts all valid permissions together', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, permissions: [...PLUGIN_PERMISSIONS] }),
    ).not.toThrow();
  });

  it('rejects entrypoint without .js extension', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, entrypoint: 'dist/index.ts' }),
    ).toThrow();
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, entrypoint: 'dist/index.exe' }),
    ).toThrow();
  });

  it('accepts nested entrypoint paths', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, entrypoint: 'dist/lib/main.js' }),
    ).not.toThrow();
  });

  it('rejects integrity without sha384- prefix', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, integrity: 'sha256-abc' }),
    ).toThrow();
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, integrity: 'abc123' }),
    ).toThrow();
  });

  it('accepts integrity with sha384- prefix', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, integrity: 'sha384-' + 'a'.repeat(64) }),
    ).not.toThrow();
  });

  it('rejects name longer than 128 characters', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, name: 'a'.repeat(129) }),
    ).toThrow();
  });

  it('rejects empty name', () => {
    expect(() =>
      PluginManifestSchema.parse({ ...validManifest, name: '' }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    const { id: _id, ...withoutId } = validManifest;
    expect(() => PluginManifestSchema.parse(withoutId)).toThrow();

    const { integrity: _integrity, ...withoutIntegrity } = validManifest;
    expect(() => PluginManifestSchema.parse(withoutIntegrity)).toThrow();
  });
});

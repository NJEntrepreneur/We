import { z } from 'zod';

export const PluginPermissionSchema = z.enum([
  'fs.read',
  'fs.write',
  'terminal.spawn',
  'network.fetch',
  'editor.decorate',
  'editor.commands',
  'ui.panel',
  'settings.read',
  'settings.write',
]);
export type PluginPermission = z.infer<typeof PluginPermissionSchema>;

export const PLUGIN_PERMISSIONS = PluginPermissionSchema.options;

export const PluginContributesSchema = z.object({
  commands:          z.array(z.string()).default([]),
  panels:            z.array(z.string()).default([]),
  themes:            z.array(z.string()).default([]),
  languageProviders: z.array(z.string()).default([]),
});
export type PluginContributes = z.infer<typeof PluginContributesSchema>;

export const PluginManifestSchema = z.object({
  id: z
    .string()
    .regex(
      /^[a-z][a-z0-9]*(\.[a-z0-9][a-z0-9-]*)+$/,
      'Plugin ID must be a reverse-domain identifier (e.g. com.example.my-plugin)',
    ),
  name:        z.string().min(1).max(128),
  version:     z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semver X.Y.Z'),
  apiVersion:  z.literal('1'),
  permissions: z.array(PluginPermissionSchema),
  entrypoint:  z
    .string()
    .regex(
      /^[a-z0-9][a-z0-9\-_.\/]*\.js$/,
      'Entrypoint must be a .js path (e.g. dist/index.js)',
    ),
  integrity: z
    .string()
    .startsWith('sha384-', 'Integrity must be a sha384 SRI hash'),
  contributes: PluginContributesSchema,
});
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

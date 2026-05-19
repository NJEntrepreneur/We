import { z } from 'zod';

// §5: exhaustive list — anything not here is rejected at install time
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

const CommandContributionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9._-]*$/, 'Command id must be lowercase dot-separated'),
  title: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
});
export type CommandContribution = z.infer<typeof CommandContributionSchema>;

const PanelContributionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9._-]*$/),
  title: z.string().min(1).max(100),
  icon: z.string().optional(),
  position: z.enum(['sidebar', 'bottom']),
});
export type PanelContribution = z.infer<typeof PanelContributionSchema>;

const ThemeContributionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9._-]*$/),
  label: z.string().min(1).max(100),
  uiTheme: z.enum(['vs', 'vs-dark', 'hc-black']),
});
export type ThemeContribution = z.infer<typeof ThemeContributionSchema>;

const LanguageProviderContributionSchema = z.object({
  language: z.string().min(1).max(50),
  provider: z.enum(['completion', 'hover', 'diagnostics', 'format']),
});
export type LanguageProviderContribution = z.infer<typeof LanguageProviderContributionSchema>;

const PluginContributesSchema = z.object({
  commands: z.array(CommandContributionSchema).default([]),
  panels: z.array(PanelContributionSchema).default([]),
  themes: z.array(ThemeContributionSchema).default([]),
  languageProviders: z.array(LanguageProviderContributionSchema).default([]),
});
export type PluginContributes = z.infer<typeof PluginContributesSchema>;

// §9: filenames must match [a-z0-9-_.]+, only .js allowed as executable extension
const entrypointRegex = /^[a-z0-9_.-]+(?:\/[a-z0-9_.-]+)*\.js$/;

// Reverse-domain plugin id, e.g. com.example.my-plugin
const pluginIdRegex = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9-]*)+$/;

// SRI hash: sha384-<base64>
const integrityRegex = /^sha384-[A-Za-z0-9+/]+=*$/;

// Semver with optional pre-release and build metadata
const semverRegex = /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?$/;

export const PluginManifestSchema = z.object({
  id: z.string().regex(pluginIdRegex, 'Plugin id must be reverse-domain notation'),
  name: z.string().min(1).max(128),
  version: z.string().regex(semverRegex, 'Version must be valid semver'),
  apiVersion: z.literal('1'),
  permissions: z.array(PluginPermissionSchema).max(9),
  entrypoint: z.string().regex(entrypointRegex, 'Entrypoint must be a .js path with safe characters'),
  integrity: z.string().regex(integrityRegex, 'Integrity must be a sha384 SRI hash'),
  contributes: PluginContributesSchema,
});
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

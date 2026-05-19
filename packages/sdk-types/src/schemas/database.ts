import { z } from 'zod';
import { RoleSchema } from '../enums/roles';
import { PluginManifestSchema } from './plugin-manifest';

const semver = z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semver X.Y.Z');

export const UserSchema = z.object({
  id:            z.string().uuid(),
  email:         z.string().email(),
  displayName:   z.string().min(1).max(256),
  role:          RoleSchema,
  oauthProvider: z.string().nullable(),
  createdAt:     z.coerce.date(),
  updatedAt:     z.coerce.date(),
  deletedAt:     z.coerce.date().nullable(),
});
export type User = z.infer<typeof UserSchema>;

export const WorkspaceSchema = z.object({
  id:        z.string().uuid(),
  name:      z.string().min(1).max(256),
  ownerId:   z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const WorkspaceMemberSchema = z.object({
  workspaceId: z.string().uuid(),
  userId:      z.string().uuid(),
  role:        RoleSchema,
  invitedAt:   z.coerce.date(),
  acceptedAt:  z.coerce.date().nullable(),
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

export const PluginRecordSchema = z.object({
  id:            z.string().uuid(),
  name:          z.string().min(1).max(128),
  publisherId:   z.string().uuid(),
  latestVersion: semver,
  publishedAt:   z.coerce.date(),
});
export type PluginRecord = z.infer<typeof PluginRecordSchema>;

export const PluginVersionSchema = z.object({
  id:            z.string().uuid(),
  pluginId:      z.string().uuid(),
  version:       semver,
  integrityHash: z.string().startsWith('sha384-'),
  manifest:      PluginManifestSchema,
  bundleUrl:     z.string().url(),
});
export type PluginVersion = z.infer<typeof PluginVersionSchema>;

export const PluginInstallSchema = z.object({
  workspaceId: z.string().uuid(),
  pluginId:    z.string().uuid(),
  version:     semver,
  installedBy: z.string().uuid(),
  installedAt: z.coerce.date(),
});
export type PluginInstall = z.infer<typeof PluginInstallSchema>;

export const RefreshTokenFamilySchema = z.object({
  id:        z.string().uuid(),
  userId:    z.string().uuid(),
  familyId:  z.string().uuid(),
  tokenHash: z.string().min(1),
  usedAt:    z.coerce.date().nullable(),
  revokedAt: z.coerce.date().nullable(),
});
export type RefreshTokenFamily = z.infer<typeof RefreshTokenFamilySchema>;

export const FeatureFlagSchema = z.object({
  id:         z.string().uuid(),
  name:       z.string().min(1).max(128),
  enabled:    z.boolean(),
  rolloutPct: z.number().int().min(0).max(100),
  createdAt:  z.coerce.date(),
});
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

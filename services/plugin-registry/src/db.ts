import { PrismaClient } from '@prisma/client';

// Typed subset of PrismaClient used by the plugin-registry service.
// Matches structural typing so tests can inject plain objects.
// Prisma generates these methods after `prisma generate`; we declare them
// manually here to allow type-checking without a generated client.
export interface RegistryPlugin {
  id: string;
  pluginId: string;
  name: string;
  publisherId: string;
  latestVersion: string | null;
  publishedAt: Date;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegistryPluginVersion {
  id: string;
  pluginRowId: string;
  version: string;
  integrityHash: string;
  manifest: unknown;
  bundleUrl: string;
  createdAt: Date;
}

export interface RegistryDb {
  plugin: {
    findUnique(args: { where: { pluginId: string } | { id: string } }): Promise<RegistryPlugin | null>;
    create(args: { data: Omit<RegistryPlugin, never> }): Promise<RegistryPlugin>;
    update(args: { where: { id: string }; data: Partial<RegistryPlugin> }): Promise<RegistryPlugin>;
  };
  pluginVersion: {
    findFirst(args: { where: { pluginRowId: string; version: string } }): Promise<RegistryPluginVersion | null>;
    create(args: { data: Omit<RegistryPluginVersion, never> }): Promise<RegistryPluginVersion>;
  };
}

const _client = new PrismaClient();

// Cast to RegistryDb — the actual Prisma client satisfies this interface at
// runtime after `prisma generate`, but type declarations are not yet emitted
// in this build environment.
export const db: RegistryDb = _client as unknown as RegistryDb;

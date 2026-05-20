import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { PluginManifestSchema } from '@platform/types';
import { sriHash, randomId, createLogger } from '@platform/utils';
import { db } from '../db.js';
import { issuePluginToken } from '../lib/tokens.js';
import { createStorageClient } from '../lib/storage.js';
import type { RegistryConfig } from '../config.js';

const logger = createLogger('plugin-registry');

// ── helpers ───────────────────────────────────────────────────────────────────

function uuidRegex(): RegExp {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
}

function sendValidationError(reply: FastifyReply, message: string): void {
  void reply.code(400).send({ error: message });
}

// ── route registration ────────────────────────────────────────────────────────

export async function registerRegistryRoutes(
  fastify: FastifyInstance,
  config: RegistryConfig,
): Promise<void> {
  const pluginSecret = new TextEncoder().encode(config.jwtPluginSecret);
  const storage = createStorageClient(config);

  // ── POST /publish ───────────────────────────────────────────────────────────
  // Accepts multipart/form-data with:
  //   - field  "manifest": JSON string of PluginManifest
  //   - file   "bundle":   the entrypoint JS bundle
  // Header X-Publisher-Id: UUID of the publishing user (injected by the gateway)
  fastify.post(
    '/publish',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const publisherId = request.headers['x-publisher-id'];
      if (typeof publisherId !== 'string' || !uuidRegex().test(publisherId)) {
        sendValidationError(reply, 'Missing or invalid X-Publisher-Id header');
        return;
      }

      let manifestJson: string | null = null;
      let bundleBuffer: Buffer | null = null;

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'field' && part.fieldname === 'manifest') {
          manifestJson = part.value as string;
        } else if (part.type === 'file' && part.fieldname === 'bundle') {
          bundleBuffer = await part.toBuffer();
        }
      }

      if (manifestJson === null) {
        sendValidationError(reply, 'Missing manifest field');
        return;
      }
      if (bundleBuffer === null) {
        sendValidationError(reply, 'Missing bundle file');
        return;
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(manifestJson);
      } catch {
        sendValidationError(reply, 'Manifest is not valid JSON');
        return;
      }

      let manifest;
      try {
        manifest = PluginManifestSchema.parse(parsedJson);
      } catch (err) {
        if (err instanceof ZodError) {
          await reply.code(400).send({ error: 'Invalid manifest', issues: err.issues });
          return;
        }
        throw err;
      }

      // §5: verify SRI hash of the bundle against manifest.integrity
      const computedIntegrity = await sriHash(bundleBuffer);
      if (computedIntegrity !== manifest.integrity) {
        sendValidationError(reply, 'Bundle integrity hash does not match manifest');
        return;
      }

      // §5: all permissions are already validated by PluginManifestSchema enum —
      // no unknown permission can survive Zod parsing. Explicit log for audit trail.
      logger.info('Plugin publish: permissions validated', {
        userId: publisherId,
      });

      // Check if plugin already exists (non-deleted) for this pluginId+version
      const existing = await db.plugin.findUnique({
        where: { pluginId: manifest.id },
      });

      if (existing !== null && existing.deletedAt === null) {
        // Upsert: allow republishing with a new version
        const existingVersion = await db.pluginVersion.findFirst({
          where: { pluginRowId: existing.id, version: manifest.version },
        });
        if (existingVersion !== null) {
          await reply.code(409).send({ error: 'Plugin version already exists' });
          return;
        }
      }

      // Upload bundle to S3
      const bundleKey = `${manifest.id}/${manifest.version}/bundle.js`;
      const bundleUrl = await storage.upload(bundleKey, bundleBuffer, 'application/javascript');

      const now = new Date();

      if (existing === null || existing.deletedAt !== null) {
        // Fresh publish
        const rowId = randomId();
        await db.plugin.create({
          data: {
            id:            rowId,
            pluginId:      manifest.id,
            name:          manifest.name,
            publisherId,
            latestVersion: manifest.version,
            publishedAt:   now,
            deletedAt:     null,
            createdAt:     now,
            updatedAt:     now,
          },
        });

        await db.pluginVersion.create({
          data: {
            id:            randomId(),
            pluginRowId:   rowId,
            version:       manifest.version,
            integrityHash: manifest.integrity,
            manifest:      manifest as Record<string, unknown>,
            bundleUrl,
            createdAt:     now,
          },
        });
      } else {
        // New version of existing plugin
        await db.plugin.update({
          where: { id: existing.id },
          data: { latestVersion: manifest.version, updatedAt: now },
        });

        await db.pluginVersion.create({
          data: {
            id:            randomId(),
            pluginRowId:   existing.id,
            version:       manifest.version,
            integrityHash: manifest.integrity,
            manifest:      manifest as Record<string, unknown>,
            bundleUrl,
            createdAt:     now,
          },
        });
      }

      logger.info('Plugin published', { userId: publisherId });
      await reply.code(201).send({
        pluginId:  manifest.id,
        version:   manifest.version,
        bundleUrl,
      });
    },
  );

  // ── GET /resolve/:id ────────────────────────────────────────────────────────
  // `:id` is the manifest plugin id (e.g. com.example.my-plugin)
  // Query param `workspaceId` (UUID) — required; used to scope the plugin JWT.
  fastify.get(
    '/resolve/:id',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { id } = request.params as { id: string };
      const { workspaceId } = request.query as { workspaceId?: string };

      if (!workspaceId || !uuidRegex().test(workspaceId)) {
        sendValidationError(reply, 'Missing or invalid workspaceId query parameter');
        return;
      }

      const plugin = await db.plugin.findUnique({ where: { pluginId: id } });
      if (plugin === null || plugin.deletedAt !== null) {
        await reply.code(404).send({ error: 'Plugin not found' });
        return;
      }

      const pluginVersion = await db.pluginVersion.findFirst({
        where: { pluginRowId: plugin.id, version: plugin.latestVersion ?? '' },
      });
      if (pluginVersion === null) {
        await reply.code(404).send({ error: 'Plugin version not found' });
        return;
      }

      let manifest;
      try {
        manifest = PluginManifestSchema.parse(pluginVersion.manifest);
      } catch {
        logger.error('Stored manifest failed validation', {});
        await reply.code(500).send({ error: 'Internal error: corrupt manifest' });
        return;
      }

      const token = await issuePluginToken(
        manifest.id,
        workspaceId,
        manifest.permissions,
        pluginSecret,
      );

      logger.info('Plugin resolved', {});
      await reply.code(200).send({
        manifest,
        bundleUrl: pluginVersion.bundleUrl,
        token,
      });
    },
  );

  // ── DELETE /uninstall/:id ───────────────────────────────────────────────────
  // Soft-deletes the plugin record (sets deleted_at). §10: never hard-delete.
  fastify.delete(
    '/uninstall/:id',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const { id } = request.params as { id: string };

      const plugin = await db.plugin.findUnique({ where: { pluginId: id } });
      if (plugin === null || plugin.deletedAt !== null) {
        await reply.code(404).send({ error: 'Plugin not found' });
        return;
      }

      await db.plugin.update({
        where: { id: plugin.id },
        data:  { deletedAt: new Date(), updatedAt: new Date() },
      });

      logger.info('Plugin uninstalled', {});
      await reply.code(204).send();
    },
  );
}

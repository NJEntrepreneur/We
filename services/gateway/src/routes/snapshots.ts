import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { WorkspaceSnapshotSchema } from '@platform/types';
import { createJwtPreHandler } from '../plugins/jwt.js';
import type { SnapshotStore } from '../snapshots/SnapshotStore.js';
import type { GatewayConfig } from '../config.js';

export async function registerSnapshotRoutes(
  fastify: FastifyInstance,
  config: GatewayConfig,
  store: SnapshotStore,
): Promise<void> {
  const jwtPreHandler = createJwtPreHandler(
    new TextEncoder().encode(config.jwtAccessSecret),
  );

  await fastify.register(async (scope: FastifyInstance) => {
    scope.addHook('preHandler', jwtPreHandler);

    // POST /snapshots — upload and store a workspace snapshot
    scope.post<{ Body: unknown }>('/snapshots', async (request, reply) => {
      const payload = request.accessTokenPayload;
      if (!payload) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      try {
        const snapshot = WorkspaceSnapshotSchema.parse(request.body);
        const id = crypto.randomUUID();
        await store.put(payload.sub, id, JSON.stringify(snapshot));
        return reply.code(201).send({ id });
      } catch (err) {
        if (err instanceof ZodError) {
          return reply.code(400).send({ error: 'Invalid snapshot', details: err.issues });
        }
        throw err;
      }
    });

    // GET /snapshots/:id — retrieve a workspace snapshot by id
    scope.get<{ Params: { id: string } }>('/snapshots/:id', async (request, reply) => {
      const payload = request.accessTokenPayload;
      if (!payload) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const { id } = request.params;
      const raw = await store.get(payload.sub, id);
      if (raw === null) {
        return reply.code(404).send({ error: 'Snapshot not found' });
      }
      try {
        const snapshot = WorkspaceSnapshotSchema.parse(JSON.parse(raw) as unknown);
        return reply.send(snapshot);
      } catch (err) {
        if (err instanceof ZodError) {
          return reply.code(500).send({ error: 'Stored snapshot is corrupt' });
        }
        throw err;
      }
    });
  });
}

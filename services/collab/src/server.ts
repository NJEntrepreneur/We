import Fastify, { type FastifyInstance } from 'fastify';
import websocketPlugin from '@fastify/websocket';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { EventBus } from '@platform/events';
import { createLogger } from '@platform/utils';
import type { CollabConfig } from './config.js';
import type { DocStore } from './yjs/DocStore.js';
import { registerCollabRoutes } from './routes/collab.js';

const logger = createLogger('collab');

export async function buildServer(
  config: CollabConfig,
  docStore: DocStore,
  bus: EventBus,
): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(cors, { origin: false });
  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(websocketPlugin);

  fastify.get('/health', async () => ({ status: 'ok' }));

  await registerCollabRoutes(fastify, config, docStore, bus);

  fastify.setErrorHandler((err, _request, reply) => {
    logger.error(`Unhandled error: ${String(err)}`);
    void reply.code(500).send({ error: 'Internal server error' });
  });

  return fastify;
}

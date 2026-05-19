import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { EventBus } from '@platform/events';
import { createLogger } from '@platform/utils';
import type { SandboxConfig } from './config.js';
import type { ExecutionQueue } from './queue/ExecutionQueue.js';
import { registerExecuteRoutes } from './routes/execute.js';

const logger = createLogger('exec-sandbox');

export async function buildServer(
  config: SandboxConfig,
  queue: ExecutionQueue,
  bus: EventBus,
): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,
    bodyLimit: 1_048_576, // 1 MB
  });

  await fastify.register(cors, { origin: false });
  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(rateLimit, {
    max: 10,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  });

  fastify.get('/health', async () => {
    const queueDepth = await queue.getDepth();
    return { status: 'ok', queueDepth };
  });

  await registerExecuteRoutes(fastify, queue, bus);

  fastify.setErrorHandler((err, _request, reply) => {
    logger.error(`Unhandled error: ${String(err)}`);
    void reply.code(500).send({ error: 'Internal server error' });
  });

  return fastify;
}

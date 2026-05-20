import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { buildConfig, type RegistryConfig } from './config.js';
import { createLogger } from '@platform/utils';

const logger = createLogger('plugin-registry');

export async function buildServer(
  config: RegistryConfig = buildConfig(),
): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false, trustProxy: true });

  await fastify.register(cors, { origin: false });
  await fastify.register(helmet, { contentSecurityPolicy: false });

  fastify.get('/health', async (_request, reply) => {
    await reply.code(200).send({ status: 'ok', service: 'plugin-registry' });
  });

  fastify.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    logger.error(error.message);
    void reply.code(statusCode).send({
      error: statusCode === 500 ? 'Internal server error' : error.message,
    });
  });

  return fastify;
}

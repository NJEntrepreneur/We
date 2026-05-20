import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { buildConfig, type SandboxConfig } from './config.js';
import { createLogger } from '@platform/utils';
import { ExecutionRequestSchema } from '@platform/types';

const logger = createLogger('exec-sandbox');

export async function buildServer(
  config: SandboxConfig = buildConfig(),
): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false, trustProxy: true });

  await fastify.register(cors, { origin: false });
  await fastify.register(helmet, { contentSecurityPolicy: false });

  fastify.get('/health', async (_request, reply) => {
    await reply.code(200).send({ status: 'ok', service: 'exec-sandbox' });
  });

  fastify.post('/execute', async (request, reply) => {
    const body = ExecutionRequestSchema.safeParse(request.body);
    if (!body.success) {
      await reply.code(400).send({ error: 'Validation error', issues: body.error.issues });
      return;
    }
    logger.info(`Execution requested: ${body.data.language}`);
    await reply.code(501).send({ error: 'Execution sandbox not yet implemented' });
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

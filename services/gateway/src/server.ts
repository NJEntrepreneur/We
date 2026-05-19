import './types.js';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import tracingPlugin from './plugins/tracing.js';
import { registerRoutes } from './routes/index.js';
import { buildConfig, type GatewayConfig } from './config.js';
import { createLogger } from '@platform/utils';

const logger = createLogger('gateway');

export async function buildServer(
  config: GatewayConfig = buildConfig(),
): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,
    trustProxy: true,
  });

  await fastify.register(cors, {
    origin: false,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'none'"],
        scriptSrc:      ["'none'"],
        styleSrc:       ["'self'"],
        imgSrc:         ["'self'", 'data:'],
        connectSrc:     ["'self'"],
        frameSrc:       ["'none'"],
        objectSrc:      ["'none'"],
        baseUri:        ["'none'"],
      },
    },
  });

  await fastify.register(tracingPlugin);
  await registerRoutes(fastify, config);

  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    logger.error(`Unhandled error: ${error.message}`, { traceId: request.traceId });
    void reply.code(statusCode).send({
      error: statusCode === 500 ? 'Internal server error' : error.message,
    });
  });

  return fastify;
}

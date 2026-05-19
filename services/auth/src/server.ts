import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { buildConfig, type AuthConfig } from './config.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerLocalStrategy } from './strategies/local.js';
import { registerOAuthStrategies } from './strategies/oauth.js';
import { db } from './db.js';
import { createLogger } from '@platform/utils';

const logger = createLogger('auth');

export async function buildServer(
  config: AuthConfig = buildConfig(),
): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false, trustProxy: true });

  await fastify.register(cookie, {
    secret: config.cookieSecret,
  });

  await fastify.register(cors, { origin: false });

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  registerLocalStrategy(db);
  registerOAuthStrategies(config);

  await registerAuthRoutes(fastify, config);

  fastify.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    logger.error(error.message, { durationMs: 0 });
    void reply.code(statusCode).send({
      error: statusCode === 500 ? 'Internal server error' : error.message,
    });
  });

  return fastify;
}

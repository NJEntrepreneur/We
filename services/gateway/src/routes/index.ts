import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import httpProxy from '@fastify/http-proxy';
import type { GatewayConfig } from '../config.js';
import { createJwtPreHandler } from '../plugins/jwt.js';

export async function registerRoutes(
  fastify: FastifyInstance,
  config: GatewayConfig,
): Promise<void> {
  const jwtPreHandler = createJwtPreHandler(
    new TextEncoder().encode(config.jwtAccessSecret),
  );

  // ── /auth/* — no JWT, strict rate limit (5/min per IP per §9) ────────────────
  await fastify.register(async (authScope: FastifyInstance) => {
    await authScope.register(rateLimit, {
      max: 5,
      timeWindow: '1 minute',
      keyGenerator: (req) => req.ip,
    });

    await authScope.register(httpProxy, {
      upstream: config.authServiceUrl,
      prefix: '/auth',
      rewritePrefix: '',
    });
  });

  // ── /plugins/* — JWT required, standard rate limit ────────────────────────────
  await fastify.register(async (pluginScope: FastifyInstance) => {
    await pluginScope.register(rateLimit, {
      max: 200,
      timeWindow: '1 minute',
      keyGenerator: (req) => req.accessTokenPayload?.sub ?? req.ip,
    });

    pluginScope.addHook('preHandler', jwtPreHandler);

    await pluginScope.register(httpProxy, {
      upstream: config.pluginServiceUrl,
      prefix: '/plugins',
      rewritePrefix: '',
    });
  });

  // ── /exec/* — JWT required, 10 executions/min per user (§9) ─────────────────
  await fastify.register(async (execScope: FastifyInstance) => {
    await execScope.register(rateLimit, {
      max: 10,
      timeWindow: '1 minute',
      keyGenerator: (req) => req.accessTokenPayload?.sub ?? req.ip,
    });

    execScope.addHook('preHandler', jwtPreHandler);

    await execScope.register(httpProxy, {
      upstream: config.execServiceUrl,
      prefix: '/exec',
      rewritePrefix: '',
    });
  });

  // ── /collab/* — JWT required ──────────────────────────────────────────────────
  await fastify.register(async (collabScope: FastifyInstance) => {
    await collabScope.register(rateLimit, {
      max: 200,
      timeWindow: '1 minute',
      keyGenerator: (req) => req.accessTokenPayload?.sub ?? req.ip,
    });

    collabScope.addHook('preHandler', jwtPreHandler);

    await collabScope.register(httpProxy, {
      upstream: config.collabServiceUrl,
      prefix: '/collab',
      rewritePrefix: '',
      websocket: true,
    });
  });
}

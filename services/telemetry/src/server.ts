import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { createLogger } from '@platform/utils';
import { registerMetricsRoutes } from './routes/metrics.js';
import { registerAuditRoutes } from './routes/audit.js';
import type { LokiWriter } from './audit/loki.js';
import { captureException } from './sentry.js';

const logger = createLogger('telemetry');

export async function buildServer(
  exporter: PrometheusExporter,
  loki: LokiWriter | null,
): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  await fastify.register(cors, { origin: false });
  await fastify.register(helmet, { contentSecurityPolicy: false });

  fastify.get('/health', async () => ({ status: 'ok' }));

  await registerMetricsRoutes(fastify, exporter);
  await registerAuditRoutes(fastify, loki);

  fastify.setErrorHandler((err, _request, reply) => {
    logger.error(`Unhandled error: ${String(err)}`);
    captureException(err);
    void reply.code(500).send({ error: 'Internal server error' });
  });

  return fastify;
}

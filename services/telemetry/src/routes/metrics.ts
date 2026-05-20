import type { FastifyInstance } from 'fastify';
import type { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

export async function registerMetricsRoutes(
  fastify: FastifyInstance,
  exporter: PrometheusExporter,
): Promise<void> {
  fastify.get('/metrics', (request, reply) => {
    // Hijack the reply so Fastify doesn't finalize the response after the
    // Prometheus handler has already written and ended it.
    reply.hijack();
    exporter.getMetricsRequestHandler(request.raw, reply.raw);
  });
}

// §12: OTel SDK MUST be first import
import './telemetry.js';

import { prometheusExporter } from './telemetry.js';
import { buildServer } from './server.js';
import { buildConfig } from './config.js';
import { createLogger } from '@platform/utils';
import { LokiWriter } from './audit/loki.js';
import { initSentry } from './sentry.js';

const logger = createLogger('telemetry');

async function main(): Promise<void> {
  const config = buildConfig();

  if (config.sentryDsn !== undefined) {
    initSentry(config.sentryDsn);
  }

  const loki = config.lokiUrl !== undefined
    ? new LokiWriter(config.lokiUrl)
    : null;

  const fastify = await buildServer(prometheusExporter, loki);

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down telemetry service');
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown(); });
  process.on('SIGINT',  () => { void shutdown(); });

  try {
    await fastify.listen({ port: config.port, host: config.host });
    logger.info(`Telemetry service listening on ${config.host}:${config.port}`);
  } catch (err) {
    logger.error(`Failed to start telemetry service: ${String(err)}`);
    process.exit(1);
  }
}

void main();

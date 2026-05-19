// §12: OTel SDK MUST be first import — before any instrumented modules
import './telemetry.js';

import { buildServer } from './server.js';
import { buildConfig } from './config.js';
import { createLogger } from '@platform/utils';

const logger = createLogger('gateway');

async function main(): Promise<void> {
  const config = buildConfig();
  const fastify = await buildServer(config);

  try {
    await fastify.listen({ port: config.port, host: config.host });
    logger.info({ message: `Gateway listening on ${config.host}:${config.port}` });
  } catch (err) {
    logger.error({ message: 'Failed to start gateway', error: String(err) });
    process.exit(1);
  }
}

void main();

// §12: OTel SDK MUST be first import
import './telemetry.js';

import { buildServer } from './server.js';
import { buildConfig } from './config.js';
import { createLogger } from '@platform/utils';

const logger = createLogger('plugin-registry');

async function main(): Promise<void> {
  const config = buildConfig();
  const fastify = await buildServer(config);

  try {
    await fastify.listen({ port: config.port, host: config.host });
    logger.info(`Plugin registry listening on ${config.host}:${config.port}`);
  } catch (err) {
    logger.error(`Failed to start plugin-registry: ${String(err)}`);
    process.exit(1);
  }
}

void main();

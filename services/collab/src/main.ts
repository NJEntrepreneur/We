// §12: OTel SDK MUST be first import
import './telemetry.js';

import { buildServer } from './server.js';
import { buildConfig } from './config.js';
import { createEventBus } from '@platform/events';
import { createLogger } from '@platform/utils';
import { getDb } from './db.js';
import { DocStore } from './yjs/DocStore.js';

const logger = createLogger('collab');

async function main(): Promise<void> {
  const config = buildConfig();
  const bus    = createEventBus();
  const db     = getDb();
  const store  = new DocStore(db);

  const fastify = await buildServer(config, store, bus);

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down collab service');
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown(); });
  process.on('SIGINT',  () => { void shutdown(); });

  try {
    await fastify.listen({ port: config.port, host: config.host });
    logger.info(`Collab service listening on ${config.host}:${config.port}`);
  } catch (err) {
    logger.error(`Failed to start collab service: ${String(err)}`);
    process.exit(1);
  }
}

void main();

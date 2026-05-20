// §12: OTel SDK MUST be first import
import './telemetry.js';

import { buildServer } from './server.js';
import { buildConfig } from './config.js';
import { createEventBus } from '@platform/events';
import { DockerRunner } from './runner/DockerRunner.js';
import { BullMQExecutionQueue } from './queue/ExecutionQueue.js';
import { createLogger } from '@platform/utils';

const logger = createLogger('exec-sandbox');

async function main(): Promise<void> {
  const config = buildConfig();
  const bus = createEventBus();
  const runner = new DockerRunner(config.dockerSocket, config.seccompProfile);
  const queue = new BullMQExecutionQueue(config.redisUrl, runner, config.workerConcurrency);

  const fastify = await buildServer(config, queue, bus);

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down exec-sandbox');
    await fastify.close();
    await queue.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown(); });
  process.on('SIGINT',  () => { void shutdown(); });

  try {
    await fastify.listen({ port: config.port, host: config.host });
    logger.info(`Exec-sandbox listening on ${config.host}:${config.port}`);
  } catch (err) {
    logger.error(`Failed to start exec-sandbox: ${String(err)}`);
    process.exit(1);
  }
}

void main();

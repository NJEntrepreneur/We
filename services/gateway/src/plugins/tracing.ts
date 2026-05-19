import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { randomId } from '@platform/utils';

export default fp(async function tracingPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request) => {
    const incoming = request.headers['x-trace-id'];
    request.traceId = typeof incoming === 'string' && incoming.length > 0
      ? incoming
      : randomId();
  });

  fastify.addHook('onSend', async (request, reply) => {
    void reply.header('x-trace-id', request.traceId);
  });
});

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ExecutionRequestSchema } from '@platform/types';
import type { EventBus } from '@platform/events';
import type { ExecutionQueue } from '../queue/ExecutionQueue.js';

export async function registerExecuteRoutes(
  fastify: FastifyInstance,
  queue: ExecutionQueue,
  bus: EventBus,
): Promise<void> {
  fastify.post('/execute', async (request, reply) => {
    let body: z.infer<typeof ExecutionRequestSchema>;
    try {
      body = ExecutionRequestSchema.parse(request.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid request', details: err.errors });
      }
      throw err;
    }

    const executionId = globalThis.crypto.randomUUID();
    const timeoutMs = body.timeoutMs ?? 5_000;

    bus.emit('exec.started', { executionId, language: body.language });

    let result;
    try {
      result = await queue.enqueue({
        executionId,
        language: body.language,
        code: body.code,
        stdin: body.stdin,
        timeoutMs,
        env: body.env,
      });
    } catch {
      return reply.code(503).send({ error: 'Execution service unavailable' });
    }

    if (result.timedOut) {
      bus.emit('exec.timeout', { executionId });
    } else {
      bus.emit('exec.completed', {
        executionId,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
      });
    }

    return reply.code(200).send({
      executionId,
      stdout:     result.stdout,
      stderr:     result.stderr,
      exitCode:   result.exitCode,
      durationMs: result.durationMs,
    });
  });
}

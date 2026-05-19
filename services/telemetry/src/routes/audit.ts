import { z } from 'zod';
import { RoleSchema } from '@platform/types';
import type { FastifyInstance } from 'fastify';
import type { LokiWriter } from '../audit/loki.js';
import { createLogger } from '@platform/utils';

const logger = createLogger('telemetry');

// §9: mirrors AuditEntry from CLAUDE.md; validated at the service boundary
export const AuditEntrySchema = z.object({
  id:           z.string().uuid(),
  timestamp:    z.string().datetime(),
  actorId:      z.string().uuid(),
  actorRole:    RoleSchema,
  action:       z.string().min(1).max(255),
  resourceType: z.string().min(1).max(255),
  resourceId:   z.string().min(1).max(255),
  metadata:     z.record(z.unknown()),
  ipAddress:    z.string().min(1).max(255),
  userAgent:    z.string().max(1024),
});

export type AuditEntry = z.infer<typeof AuditEntrySchema>;

export async function registerAuditRoutes(
  fastify: FastifyInstance,
  loki: LokiWriter | null,
): Promise<void> {
  fastify.post('/audit', async (request, reply) => {
    const parsed = AuditEntrySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid audit entry', details: parsed.error.issues });
    }

    if (loki !== null) {
      try {
        await loki.writeAudit(parsed.data);
      } catch (err: unknown) {
        // Log locally but do not fail the response — audit writes are best-effort
        logger.warn('Failed to write audit entry to Loki', {});
        logger.error(String(err), {});
      }
    }

    return reply.code(204).send();
  });
}

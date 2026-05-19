import { z } from 'zod';
import { RoleSchema } from './roles.js';

// §9: every destructive or privileged action writes one of these rows.
// The audit_log table has INSERT-only permissions — no UPDATE or DELETE.
export const AuditEntrySchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  actorId: z.string().uuid(),
  actorRole: RoleSchema,
  // e.g. "plugin.install", "file.delete", "member.remove"
  action: z.string().min(1).max(128),
  resourceType: z.string().min(1).max(64),
  resourceId: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()),
  ipAddress: z.string().ip(),
  userAgent: z.string().min(1).max(512),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

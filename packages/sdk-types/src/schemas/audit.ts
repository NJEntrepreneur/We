import { z } from 'zod';
import { RoleSchema } from '../enums/roles';

export const AuditEntrySchema = z.object({
  id:           z.string().uuid(),
  timestamp:    z.coerce.date(),
  actorId:      z.string().uuid(),
  actorRole:    RoleSchema,
  action:       z.string().min(1),
  resourceType: z.string().min(1),
  resourceId:   z.string().min(1),
  metadata:     z.record(z.string(), z.unknown()),
  ipAddress:    z.string().ip(),
  userAgent:    z.string().min(1),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

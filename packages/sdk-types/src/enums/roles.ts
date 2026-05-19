import { z } from 'zod';

export enum Role {
  Owner     = 'owner',
  Admin     = 'admin',
  Developer = 'developer',
  Viewer    = 'viewer',
  Plugin    = 'plugin',
}

export const RoleSchema = z.nativeEnum(Role);
export type RoleValue = z.infer<typeof RoleSchema>;

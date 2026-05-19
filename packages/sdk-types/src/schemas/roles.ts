import { z } from 'zod';
import { Role } from '../enums/roles.js';

export const RoleSchema = z.nativeEnum(Role);
export type { Role };

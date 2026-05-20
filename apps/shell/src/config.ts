import { z } from 'zod';

const ConfigSchema = z.object({
  gatewayUrl: z.string().url(),
  collabUrl: z.string().url(),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export const config: AppConfig = ConfigSchema.parse({
  gatewayUrl: import.meta.env['VITE_GATEWAY_URL'],
  collabUrl: import.meta.env['VITE_COLLAB_URL'],
});

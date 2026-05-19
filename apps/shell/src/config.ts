import { z } from 'zod';

const ConfigSchema = z.object({
  gatewayUrl: z.string().url(),
  collabUrl: z.string().url(),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function buildConfig(env: Record<string, string | undefined>): AppConfig {
  return ConfigSchema.parse({
    gatewayUrl: env['VITE_GATEWAY_URL'],
    collabUrl: env['VITE_COLLAB_URL'],
  });
}

export const config: AppConfig = buildConfig(
  import.meta.env as Record<string, string | undefined>,
);

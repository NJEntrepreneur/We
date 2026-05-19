import { createConfigReader } from '@platform/utils';

export function buildConfig(source = process.env) {
  const cfg = createConfigReader(source);
  return {
    port:            cfg.port('PORT', 4005),
    host:            cfg.withDefault('HOST', '0.0.0.0'),
    databaseUrl:     cfg.required('DATABASE_URL'),
    jwtAccessSecret: cfg.required('JWT_ACCESS_SECRET'),
  } as const;
}

export type CollabConfig = ReturnType<typeof buildConfig>;

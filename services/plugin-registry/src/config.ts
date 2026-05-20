import { createConfigReader } from '@platform/utils';

export function buildConfig(source = process.env) {
  const cfg = createConfigReader(source);
  return {
    port:        cfg.port('PORT', 4002),
    host:        cfg.withDefault('HOST', '0.0.0.0'),
    databaseUrl: cfg.required('DATABASE_URL'),
    redisUrl:    cfg.required('REDIS_URL'),
    s3Endpoint:  cfg.required('S3_ENDPOINT'),
    s3AccessKey: cfg.required('S3_ACCESS_KEY'),
    s3SecretKey: cfg.required('S3_SECRET_KEY'),
    s3Bucket:    cfg.withDefault('S3_BUCKET_PLUGINS', 'platform-plugins'),
    jwtPluginSecret: cfg.required('JWT_PLUGIN_SECRET'),
  } as const;
}

export type RegistryConfig = ReturnType<typeof buildConfig>;

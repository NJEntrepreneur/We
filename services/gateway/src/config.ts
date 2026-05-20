import { createConfigReader } from '@platform/utils';

export function buildConfig(source = process.env) {
  const cfg = createConfigReader(source);
  return {
    port:               cfg.port('PORT', 3000),
    host:               cfg.withDefault('HOST', '0.0.0.0'),
    jwtAccessSecret:    cfg.required('JWT_ACCESS_SECRET'),
    authServiceUrl:     cfg.withDefault('AUTH_SERVICE_URL', 'http://auth:4001'),
    pluginServiceUrl:   cfg.withDefault('PLUGIN_REGISTRY_URL', 'http://plugin-registry:4002'),
    execServiceUrl:     cfg.withDefault('EXEC_SANDBOX_URL', 'http://exec-sandbox:4003'),
    collabServiceUrl:   cfg.withDefault('COLLAB_SERVICE_URL', 'http://collab:4004'),
    s3Endpoint:         cfg.withDefault('S3_ENDPOINT', 'http://minio:9000'),
    s3Bucket:           cfg.withDefault('S3_BUCKET', 'snapshots'),
    s3AccessKey:        cfg.withDefault('S3_ACCESS_KEY', 'minioadmin'),
    s3SecretKey:        cfg.withDefault('S3_SECRET_KEY', 'minioadmin'),
    s3Region:           cfg.withDefault('S3_REGION', 'us-east-1'),
  } as const;
}

export type GatewayConfig = ReturnType<typeof buildConfig>;

import { createConfigReader } from '@platform/utils';

export function buildConfig(source = process.env): RegistryConfig {
  const cfg = createConfigReader(source);
  return {
    port:              cfg.port('PORT', 4003),
    host:              cfg.withDefault('HOST', '0.0.0.0'),
    databaseUrl:       cfg.required('DATABASE_URL'),
    jwtPluginSecret:   cfg.required('JWT_PLUGIN_SECRET'),
    s3Endpoint:        cfg.withDefault('S3_ENDPOINT', 'http://localhost:9000'),
    s3Region:          cfg.withDefault('S3_REGION', 'us-east-1'),
    s3Bucket:          cfg.withDefault('S3_BUCKET', 'plugins'),
    s3AccessKeyId:     cfg.required('S3_ACCESS_KEY_ID'),
    s3SecretAccessKey: cfg.required('S3_SECRET_ACCESS_KEY'),
  } as const;
}

export type RegistryConfig = {
  readonly port:              number;
  readonly host:              string;
  readonly databaseUrl:       string;
  readonly jwtPluginSecret:   string;
  readonly s3Endpoint:        string;
  readonly s3Region:          string;
  readonly s3Bucket:          string;
  readonly s3AccessKeyId:     string;
  readonly s3SecretAccessKey: string;
};

import { createConfigReader } from '@platform/utils';

export function buildConfig(source = process.env): TelemetryConfig {
  const cfg = createConfigReader(source);
  return {
    port:         cfg.port('PORT', 4006),
    host:         cfg.withDefault('HOST', '0.0.0.0'),
    otlpEndpoint: cfg.withDefault('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318/v1/traces'),
    lokiUrl:      cfg.optional('LOKI_URL'),
    sentryDsn:    cfg.optional('SENTRY_DSN'),
  } as const;
}

export type TelemetryConfig = {
  readonly port:         number;
  readonly host:         string;
  readonly otlpEndpoint: string;
  readonly lokiUrl:      string | undefined;
  readonly sentryDsn:   string | undefined;
};

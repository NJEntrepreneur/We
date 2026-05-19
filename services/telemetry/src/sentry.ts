import * as Sentry from '@sentry/node';

export function initSentry(dsn: string): void {
  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    // Integrations are auto-detected in @sentry/node v8
  });
}

export function captureException(err: unknown): void {
  Sentry.captureException(err);
}

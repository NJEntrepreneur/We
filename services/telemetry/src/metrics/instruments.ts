import { metrics } from '@opentelemetry/api';
import type { Counter, Histogram, ObservableGauge, UpDownCounter } from '@opentelemetry/api';

const meter = metrics.getMeter('platform', '1.0.0');

// ── §12 metric instruments ────────────────────────────────────────────────────

// Request latency (p50, p95, p99) per route — unit: milliseconds
export const httpDuration: Histogram = meter.createHistogram('http_server_duration_ms', {
  description: 'HTTP server request duration in milliseconds',
  unit: 'ms',
});

// Plugin activation count
export const pluginActivations: Counter = meter.createCounter('plugin_activations_total', {
  description: 'Total number of plugin activations',
});

// Plugin failure rate
export const pluginErrors: Counter = meter.createCounter('plugin_errors_total', {
  description: 'Total number of plugin activation errors',
});

// Execution sandbox queue depth — observed externally via record()
export const execQueueDepth: ObservableGauge = meter.createObservableGauge('exec_queue_depth', {
  description: 'Current execution sandbox queue depth',
});

// Execution sandbox completion rate
export const execCompletions: Counter = meter.createCounter('exec_completions_total', {
  description: 'Total number of completed sandbox executions',
});

// Auth token refresh rate
export const authTokenRefreshes: Counter = meter.createCounter('auth_token_refreshes_total', {
  description: 'Total number of auth token refreshes',
});

// Auth failure rate (labelled by IP for rate-limit alert)
export const authFailures: Counter = meter.createCounter('auth_failures_total', {
  description: 'Total number of authentication failures',
});

// WebSocket connection count (collab service)
export const collabConnections: UpDownCounter = meter.createUpDownCounter('collab_connections', {
  description: 'Current number of active collab WebSocket connections',
});

// Database query latency per model
export const dbQueryDuration: Histogram = meter.createHistogram('db_query_duration_ms', {
  description: 'Database query duration in milliseconds',
  unit: 'ms',
});

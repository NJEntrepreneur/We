import type { AuditEntry } from '../routes/audit.js';

// Loki push API: POST /loki/api/v1/push
// https://grafana.com/docs/loki/latest/api/#push-log-entries-to-loki
export interface LokiStream {
  readonly stream: Record<string, string>;
  readonly values: ReadonlyArray<[string, string]>; // [nanosecond-timestamp, log-line]
}

export interface LokiPushBody {
  readonly streams: LokiStream[];
}

export class LokiWriter {
  constructor(private readonly _lokiUrl: string) {}

  async writeAudit(entry: AuditEntry): Promise<void> {
    const tsNs = `${Date.now() * 1_000_000}`;
    const body: LokiPushBody = {
      streams: [
        {
          stream: {
            service:      'audit',
            action:       entry.action,
            actorRole:    entry.actorRole,
            resourceType: entry.resourceType,
          },
          values: [[tsNs, JSON.stringify(entry)]],
        },
      ],
    };

    const response = await fetch(`${this._lokiUrl}/loki/api/v1/push`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Loki push failed: ${response.status} ${response.statusText}`);
    }
  }
}

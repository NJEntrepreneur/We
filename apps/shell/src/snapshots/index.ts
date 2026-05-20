import { WorkspaceSnapshotSchema, type WorkspaceSnapshot } from '@platform/types';
import { apiRequest } from '../lib/api.js';

// ── Export ────────────────────────────────────────────────────────────────────

/**
 * Capture a snapshot of the current workspace state and upload it to S3
 * via the gateway. Returns the snapshot that was saved.
 */
export async function exportSnapshot(
  workspaceId: string,
  snapshot: WorkspaceSnapshot,
  accessToken: string,
): Promise<WorkspaceSnapshot> {
  // Validate before sending — schema version is checked by Zod
  const validated = WorkspaceSnapshotSchema.parse(snapshot);
  await apiRequest(`/plugins/workspaces/${workspaceId}/snapshots`, {
    method: 'POST',
    body: validated,
    token: accessToken,
  });
  return validated;
}

// ── Import ────────────────────────────────────────────────────────────────────

/**
 * Download and apply a snapshot. Validates the schema version before applying.
 * Throws if the payload is not a valid WorkspaceSnapshot (version mismatch etc.)
 */
export async function importSnapshot(
  workspaceId: string,
  snapshotId: string,
  accessToken: string,
): Promise<WorkspaceSnapshot> {
  const raw = await apiRequest(
    `/plugins/workspaces/${workspaceId}/snapshots/${snapshotId}`,
    { token: accessToken },
  );
  // §13: schema version validated by Zod before applying
  return WorkspaceSnapshotSchema.parse(raw);
}

// ── Build a snapshot from current UI state ───────────────────────────────────

export function buildSnapshot(
  workspaceId: string,
  openFiles: string[],
  activePlugins: Array<{ id: string; version: string }>,
  layout: WorkspaceSnapshot['layout'],
  editorState: WorkspaceSnapshot['editorState'],
  settings: WorkspaceSnapshot['settings'],
): WorkspaceSnapshot {
  return WorkspaceSnapshotSchema.parse({
    version: '1',
    workspaceId,
    capturedAt: new Date().toISOString(),
    openFiles,
    activePlugins,
    layout,
    editorState,
    settings,
  });
}

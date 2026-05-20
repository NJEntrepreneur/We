import { z } from 'zod';
import { WorkspaceSnapshotSchema, type WorkspaceSnapshot } from '@platform/types';

const SNAPSHOTS_BASE = '/snapshots';

const UploadResponseSchema = z.object({ id: z.string().min(1) });

export async function exportSnapshot(
  snapshot: WorkspaceSnapshot,
  token: string,
): Promise<string> {
  const res = await fetch(SNAPSHOTS_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) {
    throw new Error(`Snapshot export failed: ${res.status}`);
  }
  const data = UploadResponseSchema.parse(await res.json());
  return data.id;
}

export async function importSnapshot(
  snapshotId: string,
  token: string,
): Promise<WorkspaceSnapshot> {
  const res = await fetch(`${SNAPSHOTS_BASE}/${snapshotId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Snapshot import failed: ${res.status}`);
  }
  return WorkspaceSnapshotSchema.parse(await res.json());
}

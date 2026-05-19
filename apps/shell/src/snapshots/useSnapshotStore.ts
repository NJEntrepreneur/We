import { create } from 'zustand';
import { exportSnapshot as svcExport, importSnapshot as svcImport } from './snapshotService.js';
import type { WorkspaceSnapshot } from '@platform/types';

type SnapshotStatus = 'idle' | 'exporting' | 'importing' | 'success' | 'error';

interface SnapshotState {
  status: SnapshotStatus;
  lastSnapshotId: string | null;
  error: string | null;
  exportSnapshot: (snapshot: WorkspaceSnapshot, token: string) => Promise<string>;
  importSnapshot: (snapshotId: string, token: string) => Promise<WorkspaceSnapshot>;
  reset: () => void;
}

export const useSnapshotStore = create<SnapshotState>((set) => ({
  status: 'idle',
  lastSnapshotId: null,
  error: null,

  async exportSnapshot(snapshot: WorkspaceSnapshot, token: string): Promise<string> {
    set({ status: 'exporting', error: null });
    try {
      const id = await svcExport(snapshot, token);
      set({ status: 'success', lastSnapshotId: id });
      return id;
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  async importSnapshot(snapshotId: string, token: string): Promise<WorkspaceSnapshot> {
    set({ status: 'importing', error: null });
    try {
      const snapshot = await svcImport(snapshotId, token);
      set({ status: 'success' });
      return snapshot;
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },

  reset(): void {
    set({ status: 'idle', error: null });
  },
}));

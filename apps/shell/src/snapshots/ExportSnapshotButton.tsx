import React from 'react';
import { useSnapshotStore } from './useSnapshotStore.js';
import type { WorkspaceSnapshot } from '@platform/types';

interface Props {
  getSnapshot: () => WorkspaceSnapshot;
  getToken: () => string;
}

export function ExportSnapshotButton({ getSnapshot, getToken }: Props): React.JSX.Element {
  const { status, lastSnapshotId, exportSnapshot } = useSnapshotStore();
  const isLoading = status === 'exporting';

  function handleClick(): void {
    void exportSnapshot(getSnapshot(), getToken()).catch(() => {
      // error is captured in store
    });
  }

  return (
    <div>
      <button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Exporting…' : 'Export Snapshot'}
      </button>
      {lastSnapshotId !== null && (
        <span data-testid="snapshot-id">Saved: {lastSnapshotId}</span>
      )}
    </div>
  );
}

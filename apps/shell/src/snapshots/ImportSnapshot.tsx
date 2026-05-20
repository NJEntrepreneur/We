import React, { useState } from 'react';
import { useSnapshotStore } from './useSnapshotStore.js';
import type { WorkspaceSnapshot } from '@platform/types';

interface Props {
  getToken: () => string;
  onImport: (snapshot: WorkspaceSnapshot) => void;
}

export function ImportSnapshot({ getToken, onImport }: Props): React.JSX.Element {
  const [snapshotId, setSnapshotId] = useState('');
  const { status, error, importSnapshot } = useSnapshotStore();
  const isLoading = status === 'importing';

  function handleImport(): void {
    const trimmed = snapshotId.trim();
    if (!trimmed) return;
    void importSnapshot(trimmed, getToken())
      .then(onImport)
      .catch(() => {
        // error is captured in store
      });
  }

  return (
    <div>
      <input
        type="text"
        value={snapshotId}
        onChange={(e) => setSnapshotId(e.target.value)}
        placeholder="Snapshot ID"
        disabled={isLoading}
        data-testid="snapshot-id-input"
      />
      <button
        onClick={handleImport}
        disabled={isLoading || snapshotId.trim() === ''}
        data-testid="import-button"
      >
        {isLoading ? 'Importing…' : 'Import Snapshot'}
      </button>
      {error !== null && <span data-testid="import-error">{error}</span>}
    </div>
  );
}

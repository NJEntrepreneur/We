import React from 'react';
import { useParams } from 'react-router-dom';
import MonacoEditor from '@monaco-editor/react';

export function EditorPage(): React.ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center h-9 px-4 bg-gray-900 border-b border-gray-800 shrink-0">
        <span className="text-xs text-gray-400">
          Workspace: <span className="text-gray-200">{workspaceId}</span>
        </span>
      </div>
      <div className="flex-1">
        <MonacoEditor
          height="100%"
          defaultLanguage="typescript"
          defaultValue="// Start coding..."
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}

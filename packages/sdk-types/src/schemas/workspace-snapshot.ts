import { z } from 'zod';

// §13: cursor/selection state for a single file in the Monaco editor
export const EditorViewStateSchema = z.object({
  scrollTop: z.number().nonnegative(),
  scrollLeft: z.number().nonnegative(),
  cursorState: z.array(
    z.object({
      lineNumber: z.number().int().positive(),
      column: z.number().int().positive(),
    }),
  ),
});
export type EditorViewState = z.infer<typeof EditorViewStateSchema>;

// §13: which panels are visible and their dimensions
export const PanelLayoutSchema = z.object({
  sidebar: z.object({
    visible: z.boolean(),
    width: z.number().int().nonnegative(),
  }),
  bottom: z.object({
    visible: z.boolean(),
    height: z.number().int().nonnegative(),
  }),
  editor: z.object({
    activeFile: z.string().nullable(),
  }),
});
export type PanelLayout = z.infer<typeof PanelLayoutSchema>;

// §13: user-controlled workspace preferences that are captured in a snapshot
export const WorkspaceSettingsSchema = z.object({
  theme: z.string().min(1),
  fontSize: z.number().int().min(8).max(32),
  tabSize: z.number().int().min(1).max(8),
  formatOnSave: z.boolean(),
  wordWrap: z.enum(['off', 'on', 'wordWrapColumn', 'bounded']),
  minimap: z.boolean(),
});
export type WorkspaceSettings = z.infer<typeof WorkspaceSettingsSchema>;

// §13: full workspace export stored in S3
// version is a literal — import validates it before applying.
export const WorkspaceSnapshotSchema = z.object({
  version: z.literal('1'),
  workspaceId: z.string().uuid(),
  capturedAt: z.string().datetime(),
  openFiles: z.array(z.string()),
  activePlugins: z.array(
    z.object({
      id: z.string().regex(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9-]*)+$/),
      version: z.string().regex(/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?$/),
    }),
  ),
  layout: PanelLayoutSchema,
  editorState: z.record(z.string(), EditorViewStateSchema),
  settings: WorkspaceSettingsSchema,
});
export type WorkspaceSnapshot = z.infer<typeof WorkspaceSnapshotSchema>;

import { z } from 'zod';

export const WorkspaceSettingsSchema = z
  .object({
    theme:       z.string().default('dark'),
    fontSize:    z.number().int().min(8).max(48).default(14),
    tabSize:     z.number().int().min(1).max(8).default(2),
    formatOnSave: z.boolean().default(false),
    wordWrap:    z.enum(['on', 'off', 'wordWrapColumn']).default('on'),
    minimap:     z.boolean().default(true),
    lineNumbers: z.enum(['on', 'off', 'relative']).default('on'),
  })
  .catchall(z.unknown());
export type WorkspaceSettings = z.infer<typeof WorkspaceSettingsSchema>;

export const EditorPositionSchema = z.object({
  lineNumber: z.number().int().min(1),
  column:     z.number().int().min(1),
});
export type EditorPosition = z.infer<typeof EditorPositionSchema>;

export const EditorViewStateSchema = z
  .object({
    scrollTop:      z.number().nonnegative(),
    scrollLeft:     z.number().nonnegative(),
    cursorPosition: EditorPositionSchema,
  })
  .catchall(z.unknown());
export type EditorViewState = z.infer<typeof EditorViewStateSchema>;

export const PanelSchema = z.object({
  id:        z.string().min(1),
  size:      z.number().nonnegative(),
  component: z.string().min(1),
  visible:   z.boolean().default(true),
});
export type Panel = z.infer<typeof PanelSchema>;

export const PanelLayoutSchema = z.object({
  direction: z.enum(['horizontal', 'vertical']),
  panels:    z.array(PanelSchema),
});
export type PanelLayout = z.infer<typeof PanelLayoutSchema>;

export const ActivePluginSchema = z.object({
  id:      z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semver X.Y.Z'),
});
export type ActivePlugin = z.infer<typeof ActivePluginSchema>;

export const WorkspaceSnapshotSchema = z.object({
  version:       z.literal('1'),
  workspaceId:   z.string().uuid(),
  capturedAt:    z.string().datetime(),
  openFiles:     z.array(z.string()),
  activePlugins: z.array(ActivePluginSchema),
  layout:        PanelLayoutSchema,
  editorState:   z.record(z.string(), EditorViewStateSchema),
  settings:      WorkspaceSettingsSchema,
});
export type WorkspaceSnapshot = z.infer<typeof WorkspaceSnapshotSchema>;

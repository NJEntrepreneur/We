import { z } from 'zod';

// ── fs.read ───────────────────────────────────────────────────────────────────

export const FsReadParamsSchema = z.object({
  path: z.string().min(1),
});
export type FsReadParams = z.infer<typeof FsReadParamsSchema>;

export const FsReadResultSchema = z.object({
  content: z.string(),
});
export type FsReadResult = z.infer<typeof FsReadResultSchema>;

// ── fs.write ──────────────────────────────────────────────────────────────────

export const FsWriteParamsSchema = z.object({
  path:    z.string().min(1),
  content: z.string(),
});
export type FsWriteParams = z.infer<typeof FsWriteParamsSchema>;

export const FsWriteResultSchema = z.object({ ok: z.literal(true) });
export type FsWriteResult = z.infer<typeof FsWriteResultSchema>;

// ── terminal.spawn ────────────────────────────────────────────────────────────

export const TerminalSpawnParamsSchema = z.object({
  command: z.string().min(1),
  args:    z.array(z.string()).optional(),
  cwd:     z.string().optional(),
  env:     z.record(z.string(), z.string()).optional(),
});
export type TerminalSpawnParams = z.infer<typeof TerminalSpawnParamsSchema>;

export const TerminalSpawnResultSchema = z.object({
  pid: z.number().int().nonnegative(),
});
export type TerminalSpawnResult = z.infer<typeof TerminalSpawnResultSchema>;

// ── network.fetch ─────────────────────────────────────────────────────────────

export const NetworkFetchParamsSchema = z.object({
  url:     z.string().url(),
  method:  z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body:    z.string().optional(),
});
export type NetworkFetchParams = z.infer<typeof NetworkFetchParamsSchema>;

export const NetworkFetchResultSchema = z.object({
  status:  z.number().int(),
  headers: z.record(z.string(), z.string()),
  body:    z.string(),
});
export type NetworkFetchResult = z.infer<typeof NetworkFetchResultSchema>;

// ── editor.decorate ───────────────────────────────────────────────────────────

export const DecorationRangeSchema = z.object({
  startLine:   z.number().int().nonnegative(),
  startColumn: z.number().int().nonnegative(),
  endLine:     z.number().int().nonnegative(),
  endColumn:   z.number().int().nonnegative(),
});
export type DecorationRange = z.infer<typeof DecorationRangeSchema>;

export const DecorationSchema = z.object({
  filePath:     z.string().min(1),
  range:        DecorationRangeSchema,
  className:    z.string().min(1),
  hoverMessage: z.string().optional(),
});
export type Decoration = z.infer<typeof DecorationSchema>;

export const EditorDecorateParamsSchema = z.object({
  decorations: z.array(DecorationSchema),
});
export type EditorDecorateParams = z.infer<typeof EditorDecorateParamsSchema>;

export const EditorDecorateResultSchema = z.object({ ok: z.literal(true) });
export type EditorDecorateResult = z.infer<typeof EditorDecorateResultSchema>;

// ── editor.commands ───────────────────────────────────────────────────────────

export const EditorCommandRegisterParamsSchema = z.object({
  id:          z.string().min(1),
  title:       z.string().min(1).max(100),
  description: z.string().max(300).optional(),
});
export type EditorCommandRegisterParams = z.infer<typeof EditorCommandRegisterParamsSchema>;

export const EditorCommandResultSchema = z.object({ ok: z.literal(true) });
export type EditorCommandResult = z.infer<typeof EditorCommandResultSchema>;

export const EditorCommandUnregisterParamsSchema = z.object({ id: z.string().min(1) });
export type EditorCommandUnregisterParams = z.infer<typeof EditorCommandUnregisterParamsSchema>;

// ── ui.panel ──────────────────────────────────────────────────────────────────

export const UiPanelRegisterParamsSchema = z.object({
  id:       z.string().min(1),
  title:    z.string().min(1).max(100),
  icon:     z.string().optional(),
  position: z.enum(['sidebar', 'bottom']),
});
export type UiPanelRegisterParams = z.infer<typeof UiPanelRegisterParamsSchema>;

export const UiPanelResultSchema = z.object({ ok: z.literal(true) });
export type UiPanelResult = z.infer<typeof UiPanelResultSchema>;

// ── settings.read ─────────────────────────────────────────────────────────────

export const SettingsReadResultSchema = z.object({
  values: z.record(z.string(), z.unknown()),
});
export type SettingsReadResult = z.infer<typeof SettingsReadResultSchema>;

// ── settings.write ────────────────────────────────────────────────────────────

export const SettingsWriteParamsSchema = z.object({
  key:   z.string().min(1),
  value: z.unknown(),
});
export type SettingsWriteParams = z.infer<typeof SettingsWriteParamsSchema>;

export const SettingsWriteResultSchema = z.object({ ok: z.literal(true) });
export type SettingsWriteResult = z.infer<typeof SettingsWriteResultSchema>;

// ── RPC error (returned on reject) ───────────────────────────────────────────

export interface RpcError {
  readonly code: string;
  readonly message: string;
}

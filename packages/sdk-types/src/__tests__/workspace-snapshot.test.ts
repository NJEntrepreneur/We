import { describe, it, expect } from 'vitest';
import {
  WorkspaceSnapshotSchema,
  WorkspaceSettingsSchema,
  EditorViewStateSchema,
  PanelLayoutSchema,
  ActivePluginSchema,
} from '../schemas/workspace-snapshot';

const validLayout = {
  direction: 'horizontal' as const,
  panels: [
    { id: 'editor',   size: 70, component: 'EditorPanel',   visible: true },
    { id: 'sidebar',  size: 30, component: 'SidebarPanel',  visible: true },
  ],
};

const validEditorState = {
  scrollTop:  0,
  scrollLeft: 0,
  cursorPosition: { lineNumber: 1, column: 1 },
};

const validSnapshot = {
  version:     '1' as const,
  workspaceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  capturedAt:  '2025-01-15T12:00:00.000Z',
  openFiles:   ['/workspace/src/index.ts', '/workspace/src/app.ts'],
  activePlugins: [{ id: 'com.example.plugin', version: '1.2.3' }],
  layout:      validLayout,
  editorState: { '/workspace/src/index.ts': validEditorState },
  settings:    {},
};

describe('WorkspaceSettingsSchema', () => {
  it('applies all defaults when given an empty object', () => {
    const result = WorkspaceSettingsSchema.parse({});
    expect(result.theme).toBe('dark');
    expect(result.fontSize).toBe(14);
    expect(result.tabSize).toBe(2);
    expect(result.formatOnSave).toBe(false);
    expect(result.wordWrap).toBe('on');
    expect(result.minimap).toBe(true);
    expect(result.lineNumbers).toBe('on');
  });

  it('accepts overridden values', () => {
    const result = WorkspaceSettingsSchema.parse({
      theme:    'light',
      fontSize: 18,
      tabSize:  4,
    });
    expect(result.theme).toBe('light');
    expect(result.fontSize).toBe(18);
  });

  it('rejects fontSize below 8', () => {
    expect(() => WorkspaceSettingsSchema.parse({ fontSize: 7 })).toThrow();
  });

  it('rejects fontSize above 48', () => {
    expect(() => WorkspaceSettingsSchema.parse({ fontSize: 49 })).toThrow();
  });

  it('rejects tabSize outside 1–8', () => {
    expect(() => WorkspaceSettingsSchema.parse({ tabSize: 0 })).toThrow();
    expect(() => WorkspaceSettingsSchema.parse({ tabSize: 9 })).toThrow();
  });

  it('rejects an invalid wordWrap value', () => {
    expect(() => WorkspaceSettingsSchema.parse({ wordWrap: 'always' })).toThrow();
  });

  it('passes through unknown settings keys (extensible)', () => {
    const result = WorkspaceSettingsSchema.parse({ myCustomKey: true });
    expect((result as Record<string, unknown>)['myCustomKey']).toBe(true);
  });
});

describe('EditorViewStateSchema', () => {
  it('parses a valid view state', () => {
    const result = EditorViewStateSchema.parse(validEditorState);
    expect(result.cursorPosition.lineNumber).toBe(1);
  });

  it('rejects negative scrollTop', () => {
    expect(() =>
      EditorViewStateSchema.parse({ ...validEditorState, scrollTop: -1 }),
    ).toThrow();
  });

  it('rejects lineNumber less than 1', () => {
    expect(() =>
      EditorViewStateSchema.parse({
        ...validEditorState,
        cursorPosition: { lineNumber: 0, column: 1 },
      }),
    ).toThrow();
  });

  it('rejects column less than 1', () => {
    expect(() =>
      EditorViewStateSchema.parse({
        ...validEditorState,
        cursorPosition: { lineNumber: 1, column: 0 },
      }),
    ).toThrow();
  });
});

describe('PanelLayoutSchema', () => {
  it('parses a horizontal layout', () => {
    const result = PanelLayoutSchema.parse(validLayout);
    expect(result.direction).toBe('horizontal');
    expect(result.panels).toHaveLength(2);
  });

  it('parses a vertical layout', () => {
    expect(() =>
      PanelLayoutSchema.parse({ ...validLayout, direction: 'vertical' }),
    ).not.toThrow();
  });

  it('rejects an unknown direction', () => {
    expect(() =>
      PanelLayoutSchema.parse({ ...validLayout, direction: 'diagonal' }),
    ).toThrow();
  });

  it('defaults panel visible to true when absent', () => {
    const result = PanelLayoutSchema.parse({
      direction: 'horizontal',
      panels: [{ id: 'main', size: 100, component: 'Editor' }],
    });
    expect(result.panels[0]?.visible).toBe(true);
  });

  it('rejects negative panel size', () => {
    expect(() =>
      PanelLayoutSchema.parse({
        direction: 'horizontal',
        panels: [{ id: 'main', size: -10, component: 'Editor' }],
      }),
    ).toThrow();
  });

  it('rejects empty panel id', () => {
    expect(() =>
      PanelLayoutSchema.parse({
        direction: 'horizontal',
        panels: [{ id: '', size: 100, component: 'Editor' }],
      }),
    ).toThrow();
  });
});

describe('ActivePluginSchema', () => {
  it('parses a valid active plugin', () => {
    const result = ActivePluginSchema.parse({ id: 'com.example.plugin', version: '2.0.0' });
    expect(result.version).toBe('2.0.0');
  });

  it('rejects non-semver version', () => {
    expect(() =>
      ActivePluginSchema.parse({ id: 'com.example.plugin', version: '2.0' }),
    ).toThrow();
  });

  it('rejects empty id', () => {
    expect(() =>
      ActivePluginSchema.parse({ id: '', version: '1.0.0' }),
    ).toThrow();
  });
});

describe('WorkspaceSnapshotSchema', () => {
  it('parses a valid snapshot', () => {
    const result = WorkspaceSnapshotSchema.parse(validSnapshot);
    expect(result.version).toBe('1');
    expect(result.openFiles).toHaveLength(2);
  });

  it('rejects version other than "1"', () => {
    expect(() =>
      WorkspaceSnapshotSchema.parse({ ...validSnapshot, version: '2' }),
    ).toThrow();
    expect(() =>
      WorkspaceSnapshotSchema.parse({ ...validSnapshot, version: 1 }),
    ).toThrow();
  });

  it('rejects a non-UUID workspaceId', () => {
    expect(() =>
      WorkspaceSnapshotSchema.parse({ ...validSnapshot, workspaceId: 'not-a-uuid' }),
    ).toThrow();
  });

  it('rejects capturedAt that is not an ISO datetime', () => {
    expect(() =>
      WorkspaceSnapshotSchema.parse({ ...validSnapshot, capturedAt: '2025-01-15' }),
    ).toThrow();
    expect(() =>
      WorkspaceSnapshotSchema.parse({ ...validSnapshot, capturedAt: 'not-a-date' }),
    ).toThrow();
  });

  it('accepts an empty activePlugins array', () => {
    expect(() =>
      WorkspaceSnapshotSchema.parse({ ...validSnapshot, activePlugins: [] }),
    ).not.toThrow();
  });

  it('accepts an empty editorState map', () => {
    expect(() =>
      WorkspaceSnapshotSchema.parse({ ...validSnapshot, editorState: {} }),
    ).not.toThrow();
  });

  it('rejects missing required fields', () => {
    const { capturedAt: _ca, ...withoutCapturedAt } = validSnapshot;
    expect(() => WorkspaceSnapshotSchema.parse(withoutCapturedAt)).toThrow();
  });
});

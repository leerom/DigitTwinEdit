// src/features/editor/tools/types.test.ts
import { describe, it, expect } from 'vitest';
import type { EditorTool } from './types';

describe('Tool Types', () => {
  it('should create a valid tool structure', () => {
    const mockTool: EditorTool = {
      name: 'translate',
      shortcut: 'W',
      cursor: 'default',
      onActivate: () => {},
      onDeactivate: () => {},
      renderGizmo: () => null,
    };

    expect(mockTool.name).toBe('translate');
    expect(mockTool.shortcut).toBe('W');
  });
});

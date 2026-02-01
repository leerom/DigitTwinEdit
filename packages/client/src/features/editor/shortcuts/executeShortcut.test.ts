// src/features/editor/shortcuts/executeShortcut.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeShortcut } from './executeShortcut';
import { useEditorStore } from '@/stores/editorStore';
import type { ShortcutAction } from './types';

describe('executeShortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute setTool action', () => {
    const action: ShortcutAction = {
      action: 'setTool',
      params: 'translate',
      priority: 1,
    };

    executeShortcut(action);

    expect(useEditorStore.getState().activeTool).toBe('translate');
  });

  it('should execute selectAll action', () => {
    const action: ShortcutAction = {
      action: 'selectAll',
      priority: 3,
    };

    // Mock scene objects
    const mockSelect = vi.spyOn(useEditorStore.getState(), 'select');

    executeShortcut(action);

    // Will be implemented when sceneStore integration is complete
    expect(mockSelect).toHaveBeenCalled();
  });

  it('should log warning for unimplemented actions', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const action: ShortcutAction = {
      action: 'focusObject',
      priority: 2,
    };

    executeShortcut(action);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('not implemented')
    );

    consoleSpy.mockRestore();
  });
});

// src/features/editor/shortcuts/types.test.ts
import { describe, it, expect } from 'vitest';
import type { ShortcutAction, ShortcutKey } from './types';

describe('Shortcut Types', () => {
  it('should allow valid shortcut action', () => {
    const action: ShortcutAction = {
      action: 'setTool',
      params: 'translate',
      priority: 1,
      requiresSelection: false,
      disabledIn2D: false,
    };

    expect(action.action).toBe('setTool');
    expect(action.priority).toBe(1);
  });

  it('should support optional fields', () => {
    const action: ShortcutAction = {
      action: 'focusObject',
      priority: 2,
    };

    expect(action.requiresSelection).toBeUndefined();
  });
});

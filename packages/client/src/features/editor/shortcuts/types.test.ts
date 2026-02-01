import { describe, it, expect } from 'vitest';
import type { ShortcutAction } from './types';

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
    expect(action.params).toBe('translate');
  });
});

// src/features/editor/shortcuts/shortcutRegistry.test.ts
import { describe, it, expect } from 'vitest';
import { defaultShortcuts } from './shortcutRegistry';

describe('Shortcut Registry', () => {
  it('should define tool shortcuts (Q/W/E/R/Y)', () => {
    expect(defaultShortcuts['KeyQ']).toEqual({
      action: 'setTool',
      params: 'hand',
      priority: 1,
    });

    expect(defaultShortcuts['KeyW']).toEqual({
      action: 'setTool',
      params: 'translate',
      priority: 1,
    });

    expect(defaultShortcuts['KeyE']).toEqual({
      action: 'setTool',
      params: 'rotate',
      priority: 1,
      disabledIn2D: true,
    });
  });

  it('should define function shortcuts (F, F2, Delete)', () => {
    expect(defaultShortcuts['KeyF']).toEqual({
      action: 'focusObject',
      priority: 2,
      requiresSelection: true,
    });

    expect(defaultShortcuts['F2']).toEqual({
      action: 'renameObject',
      priority: 2,
      requiresSelection: true,
    });
  });

  it('should define combination shortcuts (Ctrl+A, Ctrl+D)', () => {
    expect(defaultShortcuts['Ctrl+KeyA']).toEqual({
      action: 'selectAll',
      priority: 3,
    });

    expect(defaultShortcuts['Ctrl+KeyD']).toEqual({
      action: 'duplicateObject',
      priority: 3,
      requiresSelection: true,
    });
  });

  it('should have higher priority for complex shortcuts', () => {
    const simpleShortcut = defaultShortcuts['KeyQ'];
    const comboShortcut = defaultShortcuts['Ctrl+KeyA'];
    const tripleShortcut = defaultShortcuts['Ctrl+Shift+KeyZ'];

    expect(simpleShortcut.priority).toBe(1);
    expect(comboShortcut.priority).toBe(3);
    expect(tripleShortcut.priority).toBe(4);
  });
});

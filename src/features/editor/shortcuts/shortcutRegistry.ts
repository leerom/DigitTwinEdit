import type { ShortcutRegistry } from './types';

export const defaultShortcuts: ShortcutRegistry = {
  // 工具切换 (Priority 1)
  'KeyQ': { action: 'setTool', params: 'hand', priority: 1 },
  'KeyW': { action: 'setTool', params: 'translate', priority: 1 },
  'KeyE': { action: 'setTool', params: 'rotate', priority: 1, disabledIn2D: true },
  'KeyR': { action: 'setTool', params: 'scale', priority: 1 },
  'KeyY': { action: 'setTool', params: 'universal', priority: 1 },

  // 功能键 (Priority 2)
  'KeyF': { action: 'focusObject', priority: 2, requiresSelection: true },
  'F2': { action: 'renameObject', priority: 2, requiresSelection: true },
  'Delete': { action: 'deleteObject', priority: 2, requiresSelection: true },

  // 组合键 (Priority 3)
  'Shift+KeyF': { action: 'followObject', priority: 3, requiresSelection: true },
  'Shift+Delete': { action: 'deleteObjectImmediate', priority: 3, requiresSelection: true },
  'Ctrl+KeyA': { action: 'selectAll', priority: 3 },
  'Ctrl+KeyD': { action: 'duplicateObject', priority: 3, requiresSelection: true },
  'Ctrl+KeyZ': { action: 'undo', priority: 3 },
  'Ctrl+KeyY': { action: 'redo', priority: 3 },

  // 三键组合 (Priority 4)
  'Ctrl+Shift+KeyZ': { action: 'resetTransform', priority: 4, requiresSelection: true },
};

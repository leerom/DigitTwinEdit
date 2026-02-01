// src/features/editor/shortcuts/types.ts

/**
 * 工具类型
 */
export type ToolType = 'hand' | 'translate' | 'rotate' | 'scale' | 'universal';

/**
 * 光标模式
 */
export type CursorMode = 'default' | 'grab' | 'grabbing' | 'eye';

/**
 * 导航模式
 */
export type NavigationMode = 'orbit' | 'fly';

/**
 * 视图模式
 */
export type ViewMode = '2D' | '3D';

/**
 * 快捷键动作类型
 */
export type ShortcutActionType =
  | 'setTool'
  | 'focusObject'
  | 'followObject'
  | 'renameObject'
  | 'deleteObject'
  | 'deleteObjectImmediate'
  | 'duplicateObject'
  | 'selectAll'
  | 'undo'
  | 'redo'
  | 'resetTransform';

/**
 * 快捷键动作定义
 */
export interface ShortcutAction {
  action: ShortcutActionType;
  params?: any;
  priority: number;
  requiresSelection?: boolean;
  disabledIn2D?: boolean;
}

/**
 * 快捷键字符串格式
 * 例如: "KeyQ", "Ctrl+KeyD", "Shift+KeyF"
 */
export type ShortcutKey = string;

/**
 * 修饰键状态
 */
export interface ModifierState {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

/**
 * 快捷键注册表
 */
export type ShortcutRegistry = Record<ShortcutKey, ShortcutAction>;

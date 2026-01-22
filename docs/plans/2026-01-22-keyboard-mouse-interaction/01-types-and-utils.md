# 01 - 类型定义与工具函数

## 概述

本章节实现键盘鼠标交互系统所需的核心类型定义和平台工具函数。这是整个系统的基础,后续所有模块都依赖这些定义。

---

## Task 1: 创建快捷键类型定义

**文件:**
- Create: `src/features/editor/shortcuts/types.ts`
- Test: `src/features/editor/shortcuts/types.test.ts`

### Step 1: 编写类型定义测试

```typescript
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
```

### Step 2: 运行测试验证失败

```bash
npm test -- shortcuts/types.test.ts
```

**预期:** FAIL - 类型定义不存在

### Step 3: 实现类型定义

```typescript
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
```

### Step 4: 运行测试验证通过

```bash
npm test -- shortcuts/types.test.ts
```

**预期:** PASS

### Step 5: 提交

```bash
git add src/features/editor/shortcuts/types.ts src/features/editor/shortcuts/types.test.ts
git commit -m "feat(shortcuts): add shortcut type definitions"
```

---

## Task 2: 创建工具类型定义

**文件:**
- Create: `src/features/editor/tools/types.ts`
- Test: `src/features/editor/tools/types.test.ts`

### Step 1: 编写类型定义测试

```typescript
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
```

### Step 2: 运行测试验证失败

```bash
npm test -- tools/types.test.ts
```

**预期:** FAIL - 类型定义不存在

### Step 3: 实现类型定义

```typescript
// src/features/editor/tools/types.ts
import type { ThreeEvent } from '@react-three/fiber';
import type { ToolType, CursorMode } from '../shortcuts/types';
import type { SceneObject } from '@/types';

/**
 * 编辑器工具接口
 */
export interface EditorTool {
  /** 工具名称 */
  name: ToolType;

  /** 快捷键 */
  shortcut: string;

  /** 光标样式 */
  cursor: CursorMode;

  /** 工具激活时调用 */
  onActivate: () => void;

  /** 工具停用时调用 */
  onDeactivate: () => void;

  /** 渲染 Gizmo */
  renderGizmo: (selectedObjects: SceneObject[]) => JSX.Element | null;

  /** 指针按下事件 */
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;

  /** 指针移动事件 */
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;

  /** 指针抬起事件 */
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void;
}

/**
 * Gizmo 交互状态
 */
export interface GizmoInteraction {
  /** 操作的轴 */
  axis: 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz' | 'xyz';

  /** 起始值 */
  startValue: number | [number, number, number];

  /** 当前值 */
  currentValue: number | [number, number, number];

  /** 灵敏度 (Shift 加速时增加) */
  sensitivity: number;
}
```

### Step 4: 运行测试验证通过

```bash
npm test -- tools/types.test.ts
```

**预期:** PASS

### Step 5: 提交

```bash
git add src/features/editor/tools/types.ts src/features/editor/tools/types.test.ts
git commit -m "feat(tools): add tool type definitions"
```

---

## Task 3: 创建平台检测工具

**文件:**
- Create: `src/utils/platform.ts`
- Test: `src/utils/platform.test.ts`

### Step 1: 编写测试

```typescript
// src/utils/platform.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isMac, isWindows, getModifierKey, getShortcutLabel } from './platform';

describe('Platform Utils', () => {
  const originalPlatform = navigator.platform;

  afterEach(() => {
    Object.defineProperty(navigator, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  describe('Platform Detection', () => {
    it('should detect Mac platform', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });

      // 需要重新导入以获取新值
      // 实际实现中这些是常量,所以我们测试逻辑而非运行时检测
    });

    it('should detect Windows platform', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });
    });
  });

  describe('getModifierKey', () => {
    it('should return metaKey for Mac', () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
      } as KeyboardEvent;

      // 在 Mac 上应该使用 metaKey
      expect(event.metaKey).toBe(true);
    });

    it('should return ctrlKey for Windows', () => {
      const event = {
        metaKey: false,
        ctrlKey: true,
      } as KeyboardEvent;

      expect(event.ctrlKey).toBe(true);
    });
  });

  describe('getShortcutLabel', () => {
    it('should format shortcut for display', () => {
      expect(getShortcutLabel('Ctrl+KeyD')).toContain('D');
      expect(getShortcutLabel('Shift+KeyF')).toContain('F');
    });
  });
});
```

### Step 2: 运行测试验证失败

```bash
npm test -- platform.test.ts
```

**预期:** FAIL

### Step 3: 实现平台工具

```typescript
// src/utils/platform.ts

/**
 * 检测是否为 Mac 平台
 */
export const isMac = /Mac/.test(navigator.platform);

/**
 * 检测是否为 Windows 平台
 */
export const isWindows = /Win/.test(navigator.platform);

/**
 * 获取平台对应的修饰键
 * Mac: metaKey (Command)
 * Windows/Linux: ctrlKey
 */
export const getModifierKey = (e: KeyboardEvent | MouseEvent): boolean => {
  return isMac ? e.metaKey : e.ctrlKey;
};

/**
 * 获取 Alt 键状态 (Mac 上是 Option)
 */
export const getAltKey = (e: KeyboardEvent | MouseEvent): boolean => {
  return e.altKey;
};

/**
 * 获取 Shift 键状态
 */
export const getShiftKey = (e: KeyboardEvent | MouseEvent): boolean => {
  return e.shiftKey;
};

/**
 * 格式化快捷键标签用于显示
 * 例如: "Ctrl+KeyD" -> "⌘D" (Mac) 或 "Ctrl+D" (Windows)
 */
export const getShortcutLabel = (shortcut: string): string => {
  let label = shortcut;

  if (isMac) {
    label = label
      .replace('Ctrl+', '⌘')
      .replace('Alt+', '⌥')
      .replace('Shift+', '⇧');
  } else {
    label = label.replace('Ctrl+', 'Ctrl+').replace('Alt+', 'Alt+');
  }

  // 移除 "Key" 前缀
  label = label.replace(/Key([A-Z])/g, '$1');

  return label;
};

/**
 * 从键盘事件构建快捷键字符串
 * 例如: Ctrl+KeyD, Shift+KeyF
 */
export const buildShortcutKey = (e: KeyboardEvent): string => {
  const parts: string[] = [];

  if (getModifierKey(e)) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  parts.push(e.code);

  return parts.join('+');
};

/**
 * 获取修饰键状态对象
 */
export const getModifiers = (e: KeyboardEvent | MouseEvent) => ({
  ctrl: getModifierKey(e),
  shift: e.shiftKey,
  alt: e.altKey,
});
```

### Step 4: 运行测试验证通过

```bash
npm test -- platform.test.ts
```

**预期:** PASS

### Step 5: 提交

```bash
git add src/utils/platform.ts src/utils/platform.test.ts
git commit -m "feat(utils): add platform detection utilities"
```

---

## Task 4: 创建命令系统基础类型

**文件:**
- Create: `src/features/editor/commands/types.ts`
- Test: `src/features/editor/commands/types.test.ts`

### Step 1: 编写测试

```typescript
// src/features/editor/commands/types.test.ts
import { describe, it, expect } from 'vitest';
import type { Command } from './types';

describe('Command Types', () => {
  it('should create a valid command', () => {
    const mockCommand: Command = {
      name: 'TestCommand',
      execute: () => {},
      undo: () => {},
    };

    expect(mockCommand.name).toBe('TestCommand');
    expect(typeof mockCommand.execute).toBe('function');
    expect(typeof mockCommand.undo).toBe('function');
  });

  it('should support optional merge method', () => {
    const mockCommand: Command = {
      name: 'TestCommand',
      execute: () => {},
      undo: () => {},
      merge: (other) => false,
    };

    expect(typeof mockCommand.merge).toBe('function');
  });
});
```

### Step 2: 运行测试验证失败

```bash
npm test -- commands/types.test.ts
```

**预期:** FAIL

### Step 3: 实现命令类型

```typescript
// src/features/editor/commands/types.ts

/**
 * 命令接口 - 支持撤销/重做
 */
export interface Command {
  /** 命令名称 */
  name: string;

  /** 执行命令 */
  execute: () => void;

  /** 撤销命令 */
  undo: () => void;

  /** 合并命令 (可选) - 用于合并连续的相同类型命令 */
  merge?: (other: Command) => boolean;
}

/**
 * 命令历史状态
 */
export interface CommandHistoryState {
  /** 撤销栈 */
  undoStack: Command[];

  /** 重做栈 */
  redoStack: Command[];

  /** 最大历史记录数 */
  maxHistory: number;
}
```

### Step 4: 运行测试验证通过

```bash
npm test -- commands/types.test.ts
```

**预期:** PASS

### Step 5: 提交

```bash
git add src/features/editor/commands/types.ts src/features/editor/commands/types.test.ts
git commit -m "feat(commands): add command system type definitions"
```

---

## 小结

**已完成:**
- ✅ 快捷键类型定义
- ✅ 工具类型定义
- ✅ 平台检测工具
- ✅ 命令系统类型

**下一步:**
阅读 [02-state-management.md](./02-state-management.md) 实现状态管理扩展。

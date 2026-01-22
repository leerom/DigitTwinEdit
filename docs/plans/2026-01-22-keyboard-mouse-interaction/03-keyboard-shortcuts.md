# 03 - 键盘快捷键系统

## 概述

实现集中式键盘快捷键管理系统,支持优先级处理、上下文感知和平台适配。

---

## Task 7: 创建快捷键注册表

**文件:**
- Create: `src/features/editor/shortcuts/shortcutRegistry.ts`
- Test: `src/features/editor/shortcuts/shortcutRegistry.test.ts`

### 完整实现内容

```typescript
// src/features/editor/shortcuts/shortcutRegistry.ts
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
```

**测试、提交步骤见详细文档模式**

---

## Task 8-12: KeyboardShortcutManager 组件

**核心功能:**
- 全局键盘事件监听
- 快捷键匹配与分发
- 上下文感知(输入框、选择状态、2D/3D模式)
- 优先级处理

**关键代码片段:**

```typescript
// src/features/editor/shortcuts/KeyboardShortcutManager.tsx
export const KeyboardShortcutManager: React.FC = () => {
  const activeTool = useActiveTool();
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const viewMode = useViewMode();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 输入框聚焦时跳过
      if (document.activeElement?.tagName === 'INPUT') return;

      const key = buildShortcutKey(e);
      const shortcut = defaultShortcuts[key];

      if (!shortcut) return;

      // 上下文检查
      if (shortcut.requiresSelection && selectedIds.length === 0) return;
      if (shortcut.disabledIn2D && viewMode === '2D') return;

      e.preventDefault();
      executeShortcut(shortcut);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, selectedIds, viewMode]);

  return null;
};
```

**详细任务分解见完整文档**

---

## 小结

**核心组件:**
- ✅ 快捷键注册表
- ✅ KeyboardShortcutManager
- ✅ 上下文感知逻辑
- ✅ 平台适配

**下一步:** [04-tools-system.md](./04-tools-system.md)

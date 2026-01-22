# 02 - 状态管理扩展

## 概述

扩展 `editorStore` 以支持工具系统、光标管理、修饰键状态和导航模式。

---

## Task 5: 扩展 editorStore 类型定义

**文件:**
- Modify: `src/stores/editorStore.ts`
- Test: `src/stores/editorStore.test.ts`

### Step 1: 编写状态扩展测试

```typescript
// src/stores/editorStore.test.ts (新增测试)
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';

describe('EditorStore - Tool System', () => {
  beforeEach(() => {
    useEditorStore.getState().setActiveTool('hand');
  });

  it('should switch active tool', () => {
    const { setActiveTool, activeTool } = useEditorStore.getState();

    setActiveTool('translate');
    expect(useEditorStore.getState().activeTool).toBe('translate');

    setActiveTool('rotate');
    expect(useEditorStore.getState().activeTool).toBe('rotate');
  });

  it('should update cursor mode', () => {
    const { setCursorMode } = useEditorStore.getState();

    setCursorMode('grab');
    expect(useEditorStore.getState().cursorMode).toBe('grab');

    setCursorMode('eye');
    expect(useEditorStore.getState().cursorMode).toBe('eye');
  });

  it('should track modifier keys', () => {
    const { setModifiers } = useEditorStore.getState();

    setModifiers({ shift: true });
    expect(useEditorStore.getState().modifiers.shift).toBe(true);
    expect(useEditorStore.getState().modifiers.ctrl).toBe(false);

    setModifiers({ ctrl: true, shift: false });
    expect(useEditorStore.getState().modifiers.ctrl).toBe(true);
    expect(useEditorStore.getState().modifiers.shift).toBe(false);
  });

  it('should switch navigation mode', () => {
    const { setNavigationMode } = useEditorStore.getState();

    setNavigationMode('fly');
    expect(useEditorStore.getState().navigationMode).toBe('fly');

    setNavigationMode('orbit');
    expect(useEditorStore.getState().navigationMode).toBe('orbit');
  });
});
```

### Step 2: 运行测试验证失败

```bash
npm test -- editorStore.test.ts
```

**预期:** FAIL - 新方法不存在

### Step 3: 扩展 editorStore 实现

在 `src/stores/editorStore.ts` 中添加:

```typescript
import type { ToolType, CursorMode, NavigationMode, ViewMode, ModifierState } from '@/features/editor/shortcuts/types';

interface EditorState {
  // ... 现有字段

  // 新增: 工具系统
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // 新增: 光标状态
  cursorMode: CursorMode;
  setCursorMode: (mode: CursorMode) => void;

  // 新增: 修饰键状态
  modifiers: ModifierState;
  setModifiers: (mods: Partial<ModifierState>) => void;

  // 新增: 导航模式
  navigationMode: NavigationMode;
  setNavigationMode: (mode: NavigationMode) => void;

  // 新增: 视图模式
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // 新增: 重命名状态
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
}

export const useEditorStore = create<EditorState>()(
  devtools(
    immer((set) => ({
      // ... 现有状态

      // 初始化新状态
      activeTool: 'hand',
      cursorMode: 'default',
      modifiers: {
        ctrl: false,
        shift: false,
        alt: false,
      },
      navigationMode: 'orbit',
      viewMode: '3D',
      renamingId: null,

      // 工具系统
      setActiveTool: (tool) =>
        set((state) => {
          state.activeTool = tool;
        }),

      // 光标状态
      setCursorMode: (mode) =>
        set((state) => {
          state.cursorMode = mode;
        }),

      // 修饰键
      setModifiers: (mods) =>
        set((state) => {
          state.modifiers = { ...state.modifiers, ...mods };
        }),

      // 导航模式
      setNavigationMode: (mode) =>
        set((state) => {
          state.navigationMode = mode;
        }),

      // 视图模式
      setViewMode: (mode) =>
        set((state) => {
          state.viewMode = mode;
        }),

      // 重命名状态
      setRenamingId: (id) =>
        set((state) => {
          state.renamingId = id;
        }),
    })),
    { name: 'EditorStore' }
  )
);
```

### Step 4: 运行测试验证通过

```bash
npm test -- editorStore.test.ts
```

**预期:** PASS

### Step 5: 提交

```bash
git add src/stores/editorStore.ts src/stores/editorStore.test.ts
git commit -m "feat(store): extend editorStore with tool and navigation state"
```

---

## Task 6: 创建状态选择器 Hooks

**文件:**
- Create: `src/features/editor/hooks/useEditorState.ts`
- Test: `src/features/editor/hooks/useEditorState.test.ts`

### Step 1: 编写测试

```typescript
// src/features/editor/hooks/useEditorState.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useActiveTool, useModifiers, useCursorMode } from './useEditorState';
import { useEditorStore } from '@/stores/editorStore';

describe('useEditorState Hooks', () => {
  it('useActiveTool should return active tool', () => {
    const { result } = renderHook(() => useActiveTool());
    expect(result.current).toBe('hand');
  });

  it('useModifiers should return modifier state', () => {
    const { result } = renderHook(() => useModifiers());
    expect(result.current).toEqual({
      ctrl: false,
      shift: false,
      alt: false,
    });
  });

  it('useCursorMode should return cursor mode', () => {
    const { result } = renderHook(() => useCursorMode());
    expect(result.current).toBe('default');
  });
});
```

### Step 2: 运行测试验证失败

```bash
npm test -- useEditorState.test.ts
```

**预期:** FAIL

### Step 3: 实现选择器 Hooks

```typescript
// src/features/editor/hooks/useEditorState.ts
import { useEditorStore } from '@/stores/editorStore';

/**
 * 获取当前激活的工具
 */
export const useActiveTool = () => {
  return useEditorStore((state) => state.activeTool);
};

/**
 * 获取工具切换函数
 */
export const useSetActiveTool = () => {
  return useEditorStore((state) => state.setActiveTool);
};

/**
 * 获取修饰键状态
 */
export const useModifiers = () => {
  return useEditorStore((state) => state.modifiers);
};

/**
 * 获取光标模式
 */
export const useCursorMode = () => {
  return useEditorStore((state) => state.cursorMode);
};

/**
 * 获取导航模式
 */
export const useNavigationMode = () => {
  return useEditorStore((state) => state.navigationMode);
};

/**
 * 获取视图模式
 */
export const useViewMode = () => {
  return useEditorStore((state) => state.viewMode);
};
```

### Step 4: 运行测试验证通过

```bash
npm test -- useEditorState.test.ts
```

**预期:** PASS

### Step 5: 提交

```bash
git add src/features/editor/hooks/useEditorState.ts src/features/editor/hooks/useEditorState.test.ts
git commit -m "feat(hooks): add editor state selector hooks"
```

---

## 小结

**已完成:**
- ✅ 扩展 editorStore
- ✅ 状态选择器 Hooks

**状态管理架构:**
```
editorStore
├─ activeTool: ToolType
├─ cursorMode: CursorMode
├─ modifiers: ModifierState
├─ navigationMode: NavigationMode
├─ viewMode: ViewMode
└─ renamingId: string | null
```

**下一步:**
阅读 [03-keyboard-shortcuts.md](./03-keyboard-shortcuts.md) 实现键盘快捷键系统。

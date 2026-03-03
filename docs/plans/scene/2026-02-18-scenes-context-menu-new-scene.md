# Scenes 右键菜单"新建"功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 Scenes 面板的右键菜单中添加"新建"功能，实现右键空白处和右键 SceneCard 的差异化菜单行为。

**Architecture:** 提取 `useNewSceneFlow` 自定义 Hook 封装新建场景流程（isDirty 检查 → 保存确认 → 名称输入 → 创建），供 `Header.tsx` 和 `ProjectPanel.tsx` 共用；在 `SceneCard.tsx` 添加 `onNew` prop；在 `ProjectPanel.tsx` 添加空白处右键菜单处理。

**Tech Stack:** React, TypeScript, Zustand, Vitest

---

## 参考文件

- 设计文档：`docs/plans/2026-02-18-scenes-context-menu-new-scene-design.md`
- 现有实现参考：`packages/client/src/components/layout/Header.tsx`（包含完整的新建场景流程）
- 相关组件：`packages/client/src/components/panels/SceneCard.tsx`
- 相关容器：`packages/client/src/components/panels/ProjectPanel.tsx`
- 通用菜单：`packages/client/src/components/common/ContextMenu.tsx`
- 工具函数：`packages/client/src/utils/sceneNameUtils.ts`

---

### Task 1: 创建 `useNewSceneFlow` Hook

**Files:**
- Create: `packages/client/src/hooks/useNewSceneFlow.ts`
- Create: `packages/client/src/hooks/useNewSceneFlow.test.ts`

**背景：**
`Header.tsx` 中已有完整的新建场景逻辑（`handleNewSceneClick` / `handleSaveAndProceed` / `handleDontSaveAndProceed` / `handleCreateScene`）。本 Task 将其提取为可复用的自定义 Hook。

**Step 1: 写测试（TDD）**

在 `packages/client/src/hooks/useNewSceneFlow.test.ts` 中创建测试：

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNewSceneFlow } from './useNewSceneFlow';

// Mock stores
const mockIsDirty = vi.fn(() => false);
const mockAutoSaveScene = vi.fn().mockResolvedValue(undefined);
const mockMarkClean = vi.fn();
const mockCreateScene = vi.fn().mockResolvedValue(undefined);
const mockClearSelection = vi.fn();
const mockScenes = [{ id: 1, name: '默认场景', is_active: true }];
const mockScene = { objects: {} };

vi.mock('../stores/sceneStore', () => ({
  useSceneStore: vi.fn((selector) => {
    const state = {
      isDirty: mockIsDirty(),
      scene: mockScene,
      markClean: mockMarkClean,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../stores/projectStore', () => ({
  useProjectStore: vi.fn((selector) => {
    const state = {
      autoSaveScene: mockAutoSaveScene,
      scenes: mockScenes,
      createScene: mockCreateScene,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../stores/editorStore', () => ({
  useEditorStore: vi.fn((selector) => {
    const state = { clearSelection: mockClearSelection };
    return selector ? selector(state) : state;
  }),
}));

describe('useNewSceneFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDirty.mockReturnValue(false);
  });

  it('直接显示命名对话框（场景干净时）', () => {
    const { result } = renderHook(() => useNewSceneFlow());
    expect(result.current.showSaveConfirmDialog).toBe(false);
    expect(result.current.showNewSceneDialog).toBe(false);

    act(() => result.current.handleNewSceneClick());

    expect(result.current.showSaveConfirmDialog).toBe(false);
    expect(result.current.showNewSceneDialog).toBe(true);
  });

  it('显示保存确认对话框（场景有未保存修改时）', () => {
    mockIsDirty.mockReturnValue(true);
    const { result } = renderHook(() => useNewSceneFlow());

    act(() => result.current.handleNewSceneClick());

    expect(result.current.showSaveConfirmDialog).toBe(true);
    expect(result.current.showNewSceneDialog).toBe(false);
  });

  it('保存后显示命名对话框', async () => {
    const { result } = renderHook(() => useNewSceneFlow());

    await act(async () => {
      await result.current.handleSaveAndProceed();
    });

    expect(mockAutoSaveScene).toHaveBeenCalled();
    expect(mockMarkClean).toHaveBeenCalled();
    expect(result.current.showSaveConfirmDialog).toBe(false);
    expect(result.current.showNewSceneDialog).toBe(true);
  });

  it('不保存直接显示命名对话框', () => {
    const { result } = renderHook(() => useNewSceneFlow());

    act(() => result.current.handleDiscardAndProceed());

    expect(result.current.showSaveConfirmDialog).toBe(false);
    expect(result.current.showNewSceneDialog).toBe(true);
  });

  it('创建场景（名称自动去重）', async () => {
    const { result } = renderHook(() => useNewSceneFlow());

    await act(async () => {
      await result.current.handleCreateScene('默认场景');
    });

    // '默认场景' 已存在，应自动变为 '默认场景 (1)'
    expect(mockCreateScene).toHaveBeenCalledWith('默认场景 (1)');
    expect(mockClearSelection).toHaveBeenCalled();
    expect(result.current.showNewSceneDialog).toBe(false);
  });

  it('空白名称时使用"新建场景"作为默认值', async () => {
    const { result } = renderHook(() => useNewSceneFlow());

    await act(async () => {
      await result.current.handleCreateScene('  ');
    });

    expect(mockCreateScene).toHaveBeenCalledWith('新建场景');
  });

  it('取消保存确认对话框', () => {
    const { result } = renderHook(() => useNewSceneFlow());

    act(() => result.current.handleCancelSave());

    expect(result.current.showSaveConfirmDialog).toBe(false);
  });

  it('取消命名对话框', () => {
    const { result } = renderHook(() => useNewSceneFlow());

    act(() => result.current.handleCancelCreate());

    expect(result.current.showNewSceneDialog).toBe(false);
  });
});
```

**Step 2: 运行测试确认失败**

```bash
pnpm --filter client test -- --run hooks/useNewSceneFlow
```

期望：`FAIL - useNewSceneFlow not found`

**Step 3: 创建 Hook 实现**

创建 `packages/client/src/hooks/useNewSceneFlow.ts`：

```typescript
import { useState } from 'react';
import { useSceneStore } from '../stores/sceneStore';
import { useProjectStore } from '../stores/projectStore';
import { useEditorStore } from '../stores/editorStore';
import { getUniqueSceneName } from '../utils/sceneNameUtils';

export interface UseNewSceneFlowReturn {
  showSaveConfirmDialog: boolean;
  showNewSceneDialog: boolean;
  handleNewSceneClick: () => void;
  handleSaveAndProceed: () => Promise<void>;
  handleDiscardAndProceed: () => void;
  handleCancelSave: () => void;
  handleCreateScene: (name: string) => Promise<void>;
  handleCancelCreate: () => void;
}

export function useNewSceneFlow(): UseNewSceneFlowReturn {
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);

  const isDirty = useSceneStore((s) => s.isDirty);
  const scene = useSceneStore((s) => s.scene);
  const markClean = useSceneStore((s) => s.markClean);
  const autoSaveScene = useProjectStore((s) => s.autoSaveScene);
  const scenes = useProjectStore((s) => s.scenes);
  const createScene = useProjectStore((s) => s.createScene);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  const handleNewSceneClick = () => {
    if (isDirty) {
      setShowSaveConfirmDialog(true);
    } else {
      setShowNewSceneDialog(true);
    }
  };

  const handleSaveAndProceed = async () => {
    try {
      await autoSaveScene(scene);
      markClean();
      setShowSaveConfirmDialog(false);
      setShowNewSceneDialog(true);
    } catch (error) {
      console.error('保存场景失败:', error);
      alert('保存场景失败，请重试');
    }
  };

  const handleDiscardAndProceed = () => {
    setShowSaveConfirmDialog(false);
    setShowNewSceneDialog(true);
  };

  const handleCancelSave = () => {
    setShowSaveConfirmDialog(false);
  };

  const handleCreateScene = async (name: string) => {
    try {
      const trimmedName = name.trim() || '新建场景';
      const uniqueName = getUniqueSceneName(trimmedName, scenes);
      await createScene(uniqueName);
      clearSelection();
      setShowNewSceneDialog(false);
    } catch (error) {
      console.error('创建场景失败:', error);
      alert('创建场景失败，请重试');
    }
  };

  const handleCancelCreate = () => {
    setShowNewSceneDialog(false);
  };

  return {
    showSaveConfirmDialog,
    showNewSceneDialog,
    handleNewSceneClick,
    handleSaveAndProceed,
    handleDiscardAndProceed,
    handleCancelSave,
    handleCreateScene,
    handleCancelCreate,
  };
}
```

**Step 4: 运行测试确认通过**

```bash
pnpm --filter client test -- --run hooks/useNewSceneFlow
```

期望：`8 tests passed`

**Step 5: 提交**

```bash
git add packages/client/src/hooks/useNewSceneFlow.ts packages/client/src/hooks/useNewSceneFlow.test.ts
git commit -m "feat: add useNewSceneFlow hook to encapsulate new scene creation flow"
```

---

### Task 2: 重构 `Header.tsx` 使用 Hook

**Files:**
- Modify: `packages/client/src/components/layout/Header.tsx`

**背景：**
`Header.tsx` 当前有重复的新建场景逻辑，替换为 `useNewSceneFlow` Hook。

**Step 1: 修改 Header.tsx**

在 `Header.tsx` 中：

1. **移除以下导入**（不再需要）：
   - `useSceneStore`（仅保留用于 `scene` 的那部分，`isDirty`/`markClean` 由 Hook 管理）
   - `useProjectStore`（仅保留其他用途，`autoSaveScene`/`scenes`/`createScene` 由 Hook 管理）
   - `getUniqueSceneName`

   > 注意：`useSceneStore` 中 `scene` 和 `markClean` 仍被 Hook 使用（通过内部调用），`Header.tsx` 里 `scene` 是 `保存场景` 功能还需要的，所以只精简不完全移除。

2. **添加导入**：
   ```typescript
   import { useNewSceneFlow } from '../../hooks/useNewSceneFlow';
   ```

3. **替换 Hook 调用**：

   删除：
   ```typescript
   const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);
   const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
   ```

   删除：
   ```typescript
   const { isDirty, scene, markClean, addObject } = useSceneStore();
   const { autoSaveScene, scenes, createScene } = useProjectStore();
   ```

   替换为：
   ```typescript
   const { scene, addObject } = useSceneStore();
   const {
     showSaveConfirmDialog,
     showNewSceneDialog,
     handleNewSceneClick,
     handleSaveAndProceed,
     handleDiscardAndProceed,
     handleCancelSave,
     handleCreateScene,
     handleCancelCreate,
   } = useNewSceneFlow();
   ```

   > 注意：`markClean` 在 Header.tsx 中还用于"保存场景"功能（`markClean()` 在 `onClick` 里）。此处 `markClean` 需从 `useSceneStore` 单独取出：
   ```typescript
   const { scene, addObject, markClean } = useSceneStore();
   ```

4. **替换函数引用**：
   - 删除 `handleNewSceneClick`、`handleSaveAndProceed`、`handleDontSaveAndProceed`、`handleCreateScene` 函数定义
   - `sceneMenuItems` 中已有 `onClick: handleNewSceneClick`，保持不变（从 Hook 返回同名函数）
   - Dialog 中 `onClick={handleDontSaveAndProceed}` 改为 `onClick={handleDiscardAndProceed}`
   - `onCancel={() => setShowSaveConfirmDialog(false)}` 改为 `onCancel={handleCancelSave}`
   - `onCancel={() => setShowNewSceneDialog(false)}` 改为 `onCancel={handleCancelCreate}`

**Step 2: 运行全量测试确认无回归**

```bash
pnpm --filter client test -- --run
```

期望：所有测试通过（尤其是 `Header.test.tsx`）

**Step 3: 提交**

```bash
git add packages/client/src/components/layout/Header.tsx
git commit -m "refactor: migrate Header.tsx to use useNewSceneFlow hook"
```

---

### Task 3: 修改 `SceneCard.tsx` 添加"新建"菜单项

**Files:**
- Modify: `packages/client/src/components/panels/SceneCard.tsx`
- Modify: `packages/client/src/components/panels/SceneCard.test.tsx`（添加测试）

**Step 1: 添加测试**

打开 `packages/client/src/components/panels/SceneCard.test.tsx`，添加以下测试：

```typescript
it('右键菜单包含"新建"选项', async () => {
  const handleNew = vi.fn();
  render(<SceneCard scene={mockScene} onNew={handleNew} />);

  fireEvent.contextMenu(screen.getByText(mockScene.name).closest('div')!);
  expect(screen.getByText('新建')).toBeInTheDocument();
});

it('点击"新建"菜单项触发 onNew 回调', async () => {
  const handleNew = vi.fn();
  render(<SceneCard scene={mockScene} onNew={handleNew} />);

  fireEvent.contextMenu(screen.getByText(mockScene.name).closest('div')!);
  fireEvent.click(screen.getByText('新建'));
  expect(handleNew).toHaveBeenCalledTimes(1);
});
```

**Step 2: 运行测试确认失败**

```bash
pnpm --filter client test -- --run panels/SceneCard
```

期望：新增测试 FAIL

**Step 3: 修改 SceneCard.tsx**

在 `SceneCard.tsx` 中：

1. 在 `SceneCardProps` interface 添加：
   ```typescript
   onNew?: () => void;
   ```

2. 在组件参数解构中添加 `onNew`：
   ```typescript
   export const SceneCard: React.FC<SceneCardProps> = ({
     scene,
     selected,
     onSelect,
     onOpen,
     onRename,
     onDelete,
     onNew,          // 新增
   }) => {
   ```

3. 在 `menuItems` 数组顶部插入"新建"项：
   ```typescript
   const menuItems: ContextMenuItem[] = [
     {
       label: '新建',
       icon: 'add',
       onClick: () => onNew?.(),
     },
     {
       label: '打开',
       icon: 'play_arrow',
       onClick: () => onOpen?.(),
     },
     // ...现有项保持不变
   ];
   ```

**Step 4: 运行测试确认通过**

```bash
pnpm --filter client test -- --run panels/SceneCard
```

期望：所有测试通过

**Step 5: 提交**

```bash
git add packages/client/src/components/panels/SceneCard.tsx packages/client/src/components/panels/SceneCard.test.tsx
git commit -m "feat: add 'new' menu item to SceneCard context menu"
```

---

### Task 4: 修改 `ProjectPanel.tsx` — 空白处右键 + 传入 onNew + 对话框

**Files:**
- Modify: `packages/client/src/components/panels/ProjectPanel.tsx`

**背景：**
需要在 Scenes 内容区域上捕获空白处的右键点击，显示"只有新建可用"的菜单。同时向 SceneCard 传递 `onNew` 回调，并在 ProjectPanel 底部挂载对话框 JSX。

**Step 1: 查看 Dialog / InputDialog 的 props 接口**

先确认对话框组件接口（已知从 Header.tsx 的用法）：
- `Dialog`: props `isOpen`, `onClose`, `title`, `className`，children 内部渲染
- `InputDialog`: props `isOpen`, `title`, `placeholder`, `defaultValue`, `onConfirm`, `onCancel`, `confirmText`

**Step 2: 修改 ProjectPanel.tsx**

**2a. 添加 import**

```typescript
import { useState } from 'react';  // 已有，确认存在
import { ContextMenu, type ContextMenuItem } from '../common/ContextMenu';
import { Dialog } from '../common/Dialog';
import { InputDialog } from '../common/InputDialog';
import { useNewSceneFlow } from '../../hooks/useNewSceneFlow';
```

**2b. 在组件内使用 Hook**

在组件 `ProjectPanel` 的顶部（已有 Hook 调用处）添加：

```typescript
const {
  showSaveConfirmDialog,
  showNewSceneDialog,
  handleNewSceneClick,
  handleSaveAndProceed,
  handleDiscardAndProceed,
  handleCancelSave,
  handleCreateScene,
  handleCancelCreate,
} = useNewSceneFlow();
```

**2c. 添加空白处右键菜单状态**

```typescript
const [blankContextMenu, setBlankContextMenu] = useState<{ x: number; y: number } | null>(null);
```

**2d. 定义空白处菜单项**（只有"新建"可用）

```typescript
const blankAreaMenuItems: ContextMenuItem[] = [
  {
    label: '新建',
    icon: 'add',
    onClick: handleNewSceneClick,
  },
  {
    label: '打开',
    icon: 'play_arrow',
    onClick: () => {},
    disabled: true,
  },
  {
    label: '重命名',
    icon: 'edit',
    onClick: () => {},
    disabled: true,
  },
  {
    label: '删除',
    icon: 'delete',
    onClick: () => {},
    danger: true,
    disabled: true,
  },
];
```

**2e. 找到 Scenes 内容区域的最外层 div**

定位以下代码段（约第 307 行）：

```jsx
<div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
  {selectedFolder === 'scenes' ? (
```

修改为（**仅当 selectedFolder === 'scenes' 时添加 onContextMenu**）：

```jsx
<div
  className="flex-1 p-4 overflow-y-auto custom-scrollbar"
  onContextMenu={
    selectedFolder === 'scenes'
      ? (e) => {
          e.preventDefault();
          setBlankContextMenu({ x: e.clientX, y: e.clientY });
        }
      : undefined
  }
>
```

> SceneCard 的 `handleContextMenu` 已经调用了 `e.stopPropagation()`，所以右键点击 SceneCard 时事件不会冒泡到这个容器。

**2f. 在 return 的末尾添加：**

1. **空白处右键菜单**（紧接在 `</div>` 关闭标签之前）：

```jsx
{/* 空白处右键菜单 */}
{blankContextMenu && (
  <ContextMenu
    items={blankAreaMenuItems}
    position={blankContextMenu}
    onClose={() => setBlankContextMenu(null)}
  />
)}
```

2. **新建场景相关对话框**：

```jsx
{/* 保存确认对话框 */}
<Dialog
  isOpen={showSaveConfirmDialog}
  onClose={handleCancelSave}
  title="保存更改？"
  className="max-w-[400px]"
>
  <div className="flex flex-col gap-4">
    <p className="text-sm text-text-primary">
      当前场景有未保存的更改，是否在创建新场景前保存？
    </p>
    <div className="flex justify-end gap-2 mt-2">
      <button
        onClick={handleCancelSave}
        className="px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors"
      >
        取消
      </button>
      <button
        onClick={handleDiscardAndProceed}
        className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
      >
        不保存
      </button>
      <button
        onClick={handleSaveAndProceed}
        className="px-3 py-1.5 text-xs bg-accent-blue hover:bg-accent-blue/90 text-white rounded transition-colors"
      >
        保存
      </button>
    </div>
  </div>
</Dialog>

{/* 新建场景命名对话框 */}
<InputDialog
  isOpen={showNewSceneDialog}
  title="新建场景"
  placeholder="请输入场景名称"
  defaultValue="新建场景"
  onConfirm={handleCreateScene}
  onCancel={handleCancelCreate}
  confirmText="创建"
/>
```

**2g. 向 SceneCard 传递 `onNew`**

找到现有的 SceneCard 渲染（约第 320 行）：

```jsx
<SceneCard
  key={scene.id}
  scene={scene}
  onOpen={() => handleSceneOpen(scene.id)}
  onRename={(name) => handleSceneRename(scene.id, name)}
  onDelete={() => handleSceneDelete(scene.id)}
/>
```

修改为：

```jsx
<SceneCard
  key={scene.id}
  scene={scene}
  onOpen={() => handleSceneOpen(scene.id)}
  onRename={(name) => handleSceneRename(scene.id, name)}
  onDelete={() => handleSceneDelete(scene.id)}
  onNew={handleNewSceneClick}
/>
```

**Step 3: TypeScript 类型检查**

```bash
pnpm --filter client tsc --noEmit
```

期望：无类型错误

**Step 4: 运行全量测试**

```bash
pnpm --filter client test -- --run
```

期望：所有测试通过

**Step 5: 提交**

```bash
git add packages/client/src/components/panels/ProjectPanel.tsx
git commit -m "feat: add blank-area context menu and new scene dialogs to ProjectPanel"
```

---

### Task 5: 手动验证

启动前后端并在浏览器中验证：

```bash
# 终端 1 - 后端
pnpm dev:server

# 终端 2 - 前端
pnpm dev
```

访问 http://localhost:5173，登录后：

**测试场景清单：**

- [ ] **场景 1**：右键点击 Scenes 网格空白处 → 菜单显示（新建可用，打开/重命名/删除禁用）
- [ ] **场景 2**：右键点击某个 SceneCard → 菜单显示（新建/打开/重命名/删除全部可用）
- [ ] **场景 3**：在空白处菜单点击"新建"，场景无修改时 → 直接弹出命名对话框
- [ ] **场景 4**：在 SceneCard 菜单点击"新建"，场景无修改时 → 直接弹出命名对话框
- [ ] **场景 5**：修改场景后点击"新建" → 先弹出保存确认对话框
  - 选"保存" → 保存后弹出命名对话框，创建成功
  - 选"不保存" → 直接弹出命名对话框，创建成功
  - 选"取消" → 关闭对话框，返回编辑器
- [ ] **场景 6**：输入空白名称点击创建 → 使用"新建场景"作为默认名
- [ ] **场景 7**：创建同名场景 → 自动添加编号（如"新建场景 (1)"）
- [ ] **场景 8**：Header 菜单"场景 > 新建场景"仍然正常工作（回归测试）
- [ ] **场景 9**：新建场景后，Scenes 列表立即显示新场景

---

### Task 6: 最终回归测试 + 提交

**Step 1: 运行全量测试**

```bash
pnpm --filter client test -- --run
```

期望：所有测试通过，无回归

**Step 2: TypeScript 最终检查**

```bash
pnpm --filter client tsc --noEmit
```

**Step 3: 确认提交历史整洁**

```bash
git log --oneline -6
```

期望输出类似：
```
xxxxxxx feat: add blank-area context menu and new scene dialogs to ProjectPanel
xxxxxxx feat: add 'new' menu item to SceneCard context menu
xxxxxxx refactor: migrate Header.tsx to use useNewSceneFlow hook
xxxxxxx feat: add useNewSceneFlow hook to encapsulate new scene creation flow
```

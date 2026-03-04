# UI 面板拖拽调整与窗口菜单显隐 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为三个面板添加拖拽调整尺寸功能，并在菜单栏"窗口"菜单中添加子菜单控制面板显隐，同时将面板状态持久化到 localStorage。

**Architecture:** 使用 Zustand `persist` 中间件持久化 `layoutStore`；封装 `useResize` hook 统一处理拖拽逻辑；在 `MainLayout` 的三条边框处插入透明 Handle div；将 Header 中静态"窗口"按钮替换为 `DropdownMenu`，直接调用 layoutStore 的 toggle actions。

**Tech Stack:** Zustand `persist`（zustand/middleware）、React、Tailwind CSS、Lucide React（Check 图标）

---

### Task 1: layoutStore 添加 persist 持久化

**Files:**
- Modify: `packages/client/src/stores/layoutStore.ts`

**Step 1: 修改 layoutStore，引入 persist 中间件**

将 `create<LayoutState>((set) => ({...}))` 替换为 `create<LayoutState>()(persist((set) => ({...}), { name: 'digittwinedit-layout', partialize }))`.

完整修改后的文件内容：

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutState {
  sidebarLeftVisible: boolean;
  sidebarRightVisible: boolean;
  bottomPanelVisible: boolean;
  sidebarLeftWidth: number;
  sidebarRightWidth: number;
  bottomPanelHeight: number;
  themeMode: 'dark' | 'light';

  // Actions
  toggleSidebarLeft: () => void;
  toggleSidebarRight: () => void;
  toggleBottomPanel: () => void;
  setSidebarLeftWidth: (width: number) => void;
  setSidebarRightWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarLeftVisible: true,
      sidebarRightVisible: true,
      bottomPanelVisible: true,
      sidebarLeftWidth: 256,
      sidebarRightWidth: 320,
      bottomPanelHeight: 256,
      themeMode: 'dark',

      toggleSidebarLeft: () => set((state) => ({ sidebarLeftVisible: !state.sidebarLeftVisible })),
      toggleSidebarRight: () => set((state) => ({ sidebarRightVisible: !state.sidebarRightVisible })),
      toggleBottomPanel: () => set((state) => ({ bottomPanelVisible: !state.bottomPanelVisible })),

      setSidebarLeftWidth: (width) => set({ sidebarLeftWidth: Math.max(200, Math.min(width, 500)) }),
      setSidebarRightWidth: (width) => set({ sidebarRightWidth: Math.max(240, Math.min(width, 600)) }),
      setBottomPanelHeight: (height) => set({ bottomPanelHeight: Math.max(100, Math.min(height, 800)) }),
    }),
    {
      name: 'digittwinedit-layout',
      // 仅持久化尺寸和显隐，不持久化 themeMode（留给未来主题系统）
      partialize: (state) => ({
        sidebarLeftVisible: state.sidebarLeftVisible,
        sidebarRightVisible: state.sidebarRightVisible,
        bottomPanelVisible: state.bottomPanelVisible,
        sidebarLeftWidth: state.sidebarLeftWidth,
        sidebarRightWidth: state.sidebarRightWidth,
        bottomPanelHeight: state.bottomPanelHeight,
      }),
    }
  )
);
```

**Step 2: 验证 TypeScript 编译无误**

```bash
pnpm --filter client exec tsc --noEmit
```

预期：无新增错误（项目有若干预存 TS6133 错误，属正常）

**Step 3: 在浏览器中手动验证持久化**

启动 `pnpm dev`，打开编辑器，调整任一面板大小（当前无 UI，可在 devtools console 中执行 `useLayoutStore.getState().setSidebarLeftWidth(300)`），刷新页面，确认 localStorage `digittwinedit-layout` 中有对应值。

**Step 4: Commit**

```bash
git add packages/client/src/stores/layoutStore.ts
git commit -m "feat(layout): 使用 persist 中间件持久化面板尺寸与显隐状态"
```

---

### Task 2: 新建 useResize Hook

**Files:**
- Create: `packages/client/src/hooks/useResize.ts`
- Test: `packages/client/src/hooks/useResize.test.ts`

**Step 1: 写失败测试**

创建 `packages/client/src/hooks/useResize.test.ts`：

```ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useResize } from './useResize';

describe('useResize', () => {
  it('horizontal: mousedown + mousemove 向右应增大尺寸', () => {
    const setter = vi.fn();
    const getCurrentSize = () => 256;

    const { result } = renderHook(() =>
      useResize('horizontal', setter, getCurrentSize)
    );

    // 模拟 mousedown（起始 x=100）
    act(() => {
      result.current.handleProps.onMouseDown?.({
        clientX: 100,
        clientY: 0,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent<HTMLDivElement>);
    });

    // 模拟全局 mousemove（x=130，delta=+30）
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 130, clientY: 0 }));
    });

    expect(setter).toHaveBeenCalledWith(286); // 256 + 30

    // mouseup 应清理
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });
  });

  it('vertical: mousedown + mousemove 向上应增大高度', () => {
    const setter = vi.fn();
    const getCurrentSize = () => 256;

    const { result } = renderHook(() =>
      useResize('vertical', setter, getCurrentSize)
    );

    act(() => {
      result.current.handleProps.onMouseDown?.({
        clientX: 0,
        clientY: 300,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent<HTMLDivElement>);
    });

    // 向上拖（y 减小）应增大高度：delta = 300 - 270 = 30，height = 256 + 30
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 270 }));
    });

    expect(setter).toHaveBeenCalledWith(286);

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });
  });
});
```

**Step 2: 运行测试确认失败**

```bash
pnpm --filter client test -- --run src/hooks/useResize.test.ts
```

预期：FAIL（useResize 不存在）

**Step 3: 实现 useResize hook**

创建 `packages/client/src/hooks/useResize.ts`：

```ts
import { useCallback, useRef } from 'react';

type Direction = 'horizontal' | 'vertical';

interface UseResizeReturn {
  handleProps: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * 拖拽调整面板尺寸的 Hook。
 * - horizontal：左右拖拽，delta = clientX 变化量（正数 = 向右 = 增大）
 * - vertical：上下拖拽，delta = -(clientY 变化量)（向上拖 = 减小 clientY = 增大高度）
 */
export function useResize(
  direction: Direction,
  setter: (size: number) => void,
  getCurrentSize: () => number
): UseResizeReturn {
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragging.current = true;
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
      startSize.current = getCurrentSize();

      document.body.style.userSelect = 'none';
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!dragging.current) return;
        const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
        const delta = direction === 'horizontal'
          ? currentPos - startPos.current
          : startPos.current - currentPos; // 向上拖为正
        setter(startSize.current + delta);
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [direction, setter, getCurrentSize]
  );

  return {
    handleProps: { onMouseDown },
  };
}
```

**Step 4: 运行测试确认通过**

```bash
pnpm --filter client test -- --run src/hooks/useResize.test.ts
```

预期：PASS（2 个测试通过）

**Step 5: Commit**

```bash
git add packages/client/src/hooks/useResize.ts packages/client/src/hooks/useResize.test.ts
git commit -m "feat(hooks): 新增 useResize 拖拽调整面板尺寸 hook"
```

---

### Task 3: MainLayout 添加拖拽 Handle

**Files:**
- Modify: `packages/client/src/components/layout/MainLayout.tsx`

**Step 1: 修改 MainLayout，在三条边框处插入 Handle**

在 `MainLayout.tsx` 中引入 `useResize` 和新增 setter，完整替换文件内容如下：

```tsx
import React from 'react';
import { useLayoutStore } from '../../stores/layoutStore';
import { GlobalDialogs } from '../common/GlobalDialogs';
import { useResize } from '../../hooks/useResize';

interface MainLayoutProps {
  header: React.ReactNode;
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  bottomPanel: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  header,
  leftPanel,
  centerPanel,
  rightPanel,
  bottomPanel,
}) => {
  const {
    sidebarLeftVisible,
    sidebarRightVisible,
    bottomPanelVisible,
    sidebarLeftWidth,
    sidebarRightWidth,
    bottomPanelHeight,
    setSidebarLeftWidth,
    setSidebarRightWidth,
    setBottomPanelHeight,
  } = useLayoutStore();

  const leftResize = useResize('horizontal', setSidebarLeftWidth, () => sidebarLeftWidth);
  const rightResize = useResize('horizontal', (w) => setSidebarRightWidth(w), () => sidebarRightWidth);
  const bottomResize = useResize('vertical', setBottomPanelHeight, () => bottomPanelHeight);

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-dark text-slate-300 overflow-hidden font-display">
      {/* Header */}
      <header className="h-10 w-full shrink-0 z-50">
        {header}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left + Center Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Row: Hierarchy + Viewport */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar (Hierarchy) */}
            {sidebarLeftVisible && (
              <aside
                style={{ width: sidebarLeftWidth }}
                className="shrink-0 flex flex-col border-r border-border-dark bg-panel-dark relative"
              >
                {leftPanel}
                {/* 右边框拖拽 Handle */}
                <div
                  {...leftResize.handleProps}
                  className="absolute top-0 right-0 w-1 h-full z-10 cursor-col-resize hover:bg-accent-blue/60 transition-colors"
                />
              </aside>
            )}

            {/* 3D Viewport */}
            <section className="flex-1 relative bg-black overflow-hidden border-b border-border-dark">
              {centerPanel}
            </section>
          </div>

          {/* Bottom Panel (Project) */}
          {bottomPanelVisible && (
            <section
              style={{ height: bottomPanelHeight }}
              className="shrink-0 flex flex-col border-t border-border-dark bg-panel-dark relative"
            >
              {/* 上边框拖拽 Handle */}
              <div
                {...bottomResize.handleProps}
                className="absolute top-0 left-0 w-full h-1 z-10 cursor-row-resize hover:bg-accent-blue/60 transition-colors"
              />
              {bottomPanel}
            </section>
          )}
        </div>

        {/* Right Sidebar (Inspector) */}
        {sidebarRightVisible && (
          <aside
            style={{ width: sidebarRightWidth }}
            className="shrink-0 flex flex-col border-l border-border-dark bg-panel-dark overflow-y-auto custom-scrollbar relative"
          >
            {/* 左边框拖拽 Handle */}
            <div
              {...rightResize.handleProps}
              className="absolute top-0 left-0 w-1 h-full z-10 cursor-col-resize hover:bg-accent-blue/60 transition-colors"
            />
            {rightPanel}
          </aside>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="h-6 bg-header-dark border-t border-border-dark px-3 flex items-center justify-between text-[9px] text-slate-500 z-50 flex-shrink-0 select-none">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <span className="material-symbols-outlined text-[12px]">info</span>
            <span>项目路径: Assets/Scenes/Industrial_Facility.unity</span>
          </div>
          <div className="h-3 w-px bg-border-dark"></div>
          <div className="flex items-center text-green-500 space-x-1">
            <span className="material-symbols-outlined text-[12px]">check_circle</span>
            <span>同步成功 (2.4ms)</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span>FPS: 60.0</span>
          <span>Col: 2, Line: 15</span>
          <span className="font-mono">v2.4.0-PRO</span>
        </div>
      </footer>

      <GlobalDialogs />
    </div>
  );
};
```

**Step 2: 验证 TypeScript 编译无误**

```bash
pnpm --filter client exec tsc --noEmit
```

**Step 3: 手动验证拖拽交互**

启动 `pnpm dev`，打开编辑器：
- 鼠标悬停左侧栏右边框 → 出现蓝色细线 + col-resize 光标
- 拖拽左边框 → 左侧栏宽度改变
- 悬停底部栏上边框 → row-resize 光标
- 拖拽底部边框 → 底部面板高度改变
- 悬停右侧栏左边框 → col-resize 光标
- 刷新页面 → 调整后的尺寸保留（localStorage 持久化）

**Step 4: Commit**

```bash
git add packages/client/src/components/layout/MainLayout.tsx
git commit -m "feat(layout): 在三个面板边框添加拖拽调整大小 handle"
```

---

### Task 4: Header 窗口菜单

**Files:**
- Modify: `packages/client/src/components/layout/Header.tsx`

**Step 1: 修改 Header，将"窗口"替换为 DropdownMenu**

在 Header.tsx 中：

1. 在文件顶部 import 中添加 `Check` 图标：
   ```ts
   import { ..., Check } from 'lucide-react';
   ```

2. 在 `useEditorStore` 引入行附近引入 `useLayoutStore`：
   ```ts
   import { useLayoutStore } from '../../stores/layoutStore';
   ```

3. 在组件内（`const select = ...` 附近）添加：
   ```ts
   const {
     sidebarLeftVisible,
     sidebarRightVisible,
     bottomPanelVisible,
     toggleSidebarLeft,
     toggleSidebarRight,
     toggleBottomPanel,
   } = useLayoutStore();
   ```

4. 在 `addMenuItems` 后添加 `windowMenuItems`：
   ```ts
   const windowMenuItems: DropdownMenuItem[] = [
     {
       label: '层级视图',
       icon: sidebarLeftVisible
         ? <Check className="w-3 h-3" />
         : <span className="w-3 h-3 inline-block" />,
       onClick: toggleSidebarLeft,
     },
     {
       label: '项目视图',
       icon: bottomPanelVisible
         ? <Check className="w-3 h-3" />
         : <span className="w-3 h-3 inline-block" />,
       onClick: toggleBottomPanel,
     },
     {
       label: '属性检视器',
       icon: sidebarRightVisible
         ? <Check className="w-3 h-3" />
         : <span className="w-3 h-3 inline-block" />,
       onClick: toggleSidebarRight,
     },
   ];
   ```

5. 在 JSX 中，将：
   ```tsx
   <MenuItem label="窗口" />
   ```
   替换为：
   ```tsx
   <DropdownMenu
     trigger={
       <button className="px-2 py-1 text-xs hover:bg-slate-700 rounded transition-colors text-slate-300">
         窗口
       </button>
     }
     items={windowMenuItems}
   />
   ```

**Step 2: 验证 TypeScript 编译无误**

```bash
pnpm --filter client exec tsc --noEmit
```

**Step 3: 手动验证菜单功能**

启动 `pnpm dev`，打开编辑器：
- 点击菜单栏"窗口" → 弹出下拉菜单，显示三个子菜单项
- 已显示的面板对应菜单项左侧有 ✓ 图标
- 点击"层级视图" → 左侧 Hierarchy 面板隐藏，再次点击恢复
- 点击"项目视图" → 底部 Project 面板隐藏，再次点击恢复
- 点击"属性检视器" → 右侧 Inspector 面板隐藏，再次点击恢复
- 刷新页面 → 显隐状态保留（localStorage 持久化）

**Step 4: Commit**

```bash
git add packages/client/src/components/layout/Header.tsx
git commit -m "feat(header): 窗口菜单添加层级视图/项目视图/属性检视器显隐控制"
```

---

### Task 5: 运行完整构建验证

**Step 1: 运行所有前端单元测试**

```bash
pnpm --filter client test -- --run
```

预期：所有测试通过（包括新增的 useResize 测试）

**Step 2: 运行生产构建**

```bash
pnpm build
```

预期：构建成功，无新增 TypeScript 错误

**Step 3: Commit（如有未提交内容）**

```bash
git status
# 如有未提交，补充提交
```

# UI 面板拖拽调整与窗口菜单设计文档

**日期**: 2026-03-04
**状态**: 已批准

---

## 需求概述

1. 左侧"Hierarchy"、底部"Project"、右侧"Inspector" 支持用户通过拖拽视图窗口边框调整大小
2. 菜单栏"窗口"菜单增加子菜单（层级视图、项目视图、属性检视器），控制对应窗口显隐
3. 面板尺寸与显隐状态持久化到 localStorage

---

## 方案选择

采用**方案 A**：自定义 `useResize` Hook + Zustand `persist` 中间件 + Header DropdownMenu。

- 无新依赖，与现有架构一致
- 改动集中在三个文件，影响面小

---

## 详细设计

### 1. 状态层（layoutStore）

**文件**: `packages/client/src/stores/layoutStore.ts`

- 使用 Zustand `persist` 中间件包裹 store
- 持久化 key: `digittwinedit-layout`
- 持久化字段: `sidebarLeftVisible`, `sidebarRightVisible`, `bottomPanelVisible`, `sidebarLeftWidth`, `sidebarRightWidth`, `bottomPanelHeight`
- 不持久化: `themeMode`（留给未来独立主题系统）
- Store action 签名和尺寸边界保持不变：
  - `sidebarLeftWidth`: [200, 500]
  - `sidebarRightWidth`: [240, 600]
  - `bottomPanelHeight`: [100, 800]

### 2. 拖拽 Resize Handle

**新文件**: `packages/client/src/hooks/useResize.ts`

```ts
useResize(
  direction: 'horizontal' | 'vertical',
  setter: (size: number) => void,
  getCurrentSize: () => number
): { handleProps: React.HTMLAttributes<HTMLDivElement> }
```

行为：
- `mousedown` → 记录起始坐标和当前尺寸，注册全局 `mousemove` / `mouseup`
- `mousemove` → 计算 delta，调用 `setter(size ± delta)`
- `mouseup` → 移除全局监听，恢复 `cursor` 和 `userSelect`
- 拖拽期间: `document.body.style.userSelect = 'none'`，`cursor` 全局锁定

**文件**: `packages/client/src/components/layout/MainLayout.tsx`

在三处边框插入透明 Handle `<div>`（4px 宽/高，绝对定位，`z-10`）：

| Handle 位置 | 方向 | Setter |
|---|---|---|
| 左侧栏右边框 | horizontal | `setSidebarLeftWidth` |
| 右侧栏左边框 | horizontal | `setSidebarRightWidth` |
| 底部栏上边框 | vertical | `setBottomPanelHeight`（向上拖增大） |

视觉：
- 默认透明，不影响现有样式
- `hover`: `bg-accent-blue/60` + `cursor-col-resize` / `cursor-row-resize`
- 拖拽中：高亮持续

### 3. 窗口菜单

**文件**: `packages/client/src/components/layout/Header.tsx`

- 将静态 `<MenuItem label="窗口" />` 替换为 `<DropdownMenu>`
- 引入 `useLayoutStore` 读取三个 `visible` 状态和 toggle actions
- 菜单项：
  - 层级视图 → `toggleSidebarLeft`
  - 项目视图 → `toggleBottomPanel`
  - 属性检视器 → `toggleSidebarRight`
- 勾选状态：`visible=true` 时 icon 显示 `<Check>`，否则显示等宽占位 `<span>`
- `DropdownMenu` 组件本身无需改动

---

## 涉及文件

| 文件 | 变更类型 |
|---|---|
| `packages/client/src/stores/layoutStore.ts` | 修改（添加 persist） |
| `packages/client/src/hooks/useResize.ts` | 新建 |
| `packages/client/src/components/layout/MainLayout.tsx` | 修改（添加 Handle） |
| `packages/client/src/components/layout/Header.tsx` | 修改（窗口菜单） |

---

## 不在本次范围内

- 双击边框重置为默认尺寸
- 面板最小化动画
- 主题系统持久化

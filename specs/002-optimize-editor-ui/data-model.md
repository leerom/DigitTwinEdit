# 数据模型设计: UI 状态管理

**分支**: `002-optimize-editor-ui` | **日期**: 2026-01-21

## 概述

本功能主要涉及 UI 布局与样式优化，核心数据模型集中在前端 UI 状态管理。不涉及后端数据库 schema 变更。

## 实体定义

### LayoutState (Zustand Store)

管理编辑器界面的布局配置与状态。

| 字段名 | 类型 | 描述 | 默认值 |
|---|---|---|---|
| `sidebarLeftVisible` | boolean | 左侧层级面板可见性 | `true` |
| `sidebarRightVisible` | boolean | 右侧属性面板可见性 | `true` |
| `bottomPanelVisible` | boolean | 底部项目面板可见性 | `true` |
| `sidebarLeftWidth` | number | 左侧面板宽度 (px) | `256` |
| `sidebarRightWidth` | number | 右侧面板宽度 (px) | `320` |
| `bottomPanelHeight` | number | 底部面板高度 (px) | `256` |
| `themeMode` | 'dark' \| 'light' | 主题模式 (目前仅支持 dark) | `'dark'` |

### ViewportOverlayState (Zustand Store / Local State)

管理 3D 视口内的悬浮 UI 状态。

| 字段名 | 类型 | 描述 | 默认值 |
|---|---|---|---|
| `showStats` | boolean | 是否显示性能统计面板 | `true` |
| `activeGizmo` | 'translate' \| 'rotate' \| 'scale' | 当前激活的变换工具 (对应 Q/W/E/R) | `'translate'` |
| `coordinateSpace` | 'global' \| 'local' | 坐标系模式 | `'global'` |

## 数据流向

1. **初始化**: 应用启动时，LayoutStore 加载默认配置（未来可从 localStorage 读取）。
2. **交互**: 用户点击 Header 上的 "窗口" 按钮切换面板可见性 -> 更新 LayoutStore -> 触发 MainLayout 重渲染。
3. **视口**: 用户点击 Overlay 工具栏 -> 更新 EditorStore (现有) -> 触发 TransformControls 模式切换。

## 验证规则

- 宽度/高度限制：
  - `sidebarLeftWidth`: Min 200px, Max 500px
  - `sidebarRightWidth`: Min 240px, Max 600px
  - `bottomPanelHeight`: Min 100px, Max 800px

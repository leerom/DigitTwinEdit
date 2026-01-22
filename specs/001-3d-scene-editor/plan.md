# 开发计划: 数字孪生三维场景编辑器

**分支**: `001-3d-scene-editor` | **日期**: 2026-01-20 | **规格**: [spec.md](./spec.md)
**输入**: 功能规格说明书 `/specs/001-3d-scene-editor/spec.md`

**注意**: 此模板由 `/speckit.plan` 命令填写。执行工作流程请参见 `.specify/templates/commands/plan.md`。

## 概要

基于 React + Three.js (React Three Fiber) 构建 Web 端数字孪生三维场景编辑器。核心功能包括：
1. **Scene View**: 支持线框/着色/混合模式渲染，集成 Q/W/E/R/Y 变换工具。
2. **Hierarchy**: 树状结构管理场景对象层级，支持拖拽重组。
3. **Inspector**: 属性面板支持变换、材质及数字孪生实时数据（模拟）编辑。
4. **Project/Resources**: 本地及公共资产库管理。
5. **架构**: 采用 ECS (Entity-Component-System) 架构，Zustand 状态管理，Tailwind CSS 样式。

## 技术上下文

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**语言/版本**: JavaScript/TypeScript (React 18+), Three.js (r160+), React Three Fiber (v8+)
**主要依赖**:
- 核心: `three`, `@react-three/fiber`, `@react-three/drei`
- 状态管理: `zustand`
- 样式: `tailwindcss`
- UI 组件: 原生 HTML/CSS 为主，辅助 Headless UI
**存储**: 浏览器本地文件下载 (JSON), 内存状态
**测试**: Vitest + React Testing Library (单元/集成), Playwright (E2E)
**目标平台**: 现代桌面浏览器 (Chrome/Edge/Firefox/Safari), WebGL 2.0 支持
**项目类型**: Web 单页应用 (SPA)
**性能目标**:
- 1000+ 对象 @ 60fps (使用 InstancedMesh)
- 交互响应 < 100ms
**约束**:
- 无后端数据库（Mock Data）
- 纯前端实现撤销/重做
- 深色主题 (Dark Mode Only)
**规模/范围**: 单一编辑器页面，包含 4 个主要面板 (Hierarchy, Scene, Inspector, Project)

## 宪法检查 (Constitution Check)

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **中文优先**: 计划文档已使用中文编写。 (Constitution I)
- [x] **原生优先**: 使用 React + Three.js 作为核心，避免引入重型 UI 组件库，仅使用 TailwindCSS。 (Constitution II)
- [x] **测试驱动**: 计划中包含测试策略，明确 TDD 流程。 (Constitution III)
- [x] **性能优先**: 明确 60fps 和 100ms 响应目标，计划采用 InstancedMesh。 (Constitution IV)
- [x] **架构清晰**: 明确采用 ECS、策略模式（工具）、状态模式（渲染）、命令模式（撤销）。 (Constitution V)
- [x] **简单至上**: 从 MVP 开始，无后端，使用 Mock 数据。 (Constitution VI)

## 项目结构

### 文档 (本功能)

```text
specs/001-3d-scene-editor/
├── plan.md              # 本文件 (/speckit.plan 命令输出)
├── research.md          # 阶段 0 输出 (/speckit.plan 命令)
├── data-model.md        # 阶段 1 输出 (/speckit.plan 命令)
├── quickstart.md        # 阶段 1 输出 (/speckit.plan 命令)
├── contracts/           # 阶段 1 输出 (/speckit.plan 命令) - 本项目无后端 API，此目录可能为空或用于定义内部数据结构契约
└── tasks.md             # 阶段 2 输出 (/speckit.tasks 命令 - 非 /speckit.plan 创建)
```

### 源代码 (仓库根目录)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── components/          # React UI 组件
│   ├── layout/          # 布局组件 (Header, Panel, etc.)
│   ├── panels/          # 功能面板 (Hierarchy, Inspector, Project)
│   ├── viewport/        # 3D 视口组件
│   └── common/          # 通用 UI 组件 (Button, Input, etc.)
├── features/            # 核心功能模块
│   ├── editor/          # 编辑器核心逻辑
│   │   ├── tools/       # 变换工具 (Q/W/E/R/Y) 实现
│   │   ├── commands/    # 撤销/重做命令
│   │   └── render/      # 渲染模式逻辑
│   ├── scene/           # 场景图管理
│   └── twin/            # 数字孪生数据模拟
├── hooks/               # 自定义 React Hooks
├── stores/              # Zustand 状态存储 (editorStore, sceneStore, selectionStore)
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数
└── assets/              # 静态资源
```

**结构决策**: 采用标准的 React 项目结构，结合功能模块化 (`features/`) 来组织编辑器特定的复杂逻辑。

## 复杂度跟踪

> **仅在宪法检查有必须证明的违规时填写**

| 违规项 | 为何需要 | 拒绝更简单方案的原因 |
|--------|----------|----------------------|
| (无) | | |

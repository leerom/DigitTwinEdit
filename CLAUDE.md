# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令（Vite + Vitest + Playwright）

> 项目使用 Vite + React + TypeScript（ESM）。测试：Vitest（unit/组件）+ Playwright（e2e）。

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

### 预览构建产物

```bash
npm run preview
```

### 运行测试（Vitest）

```bash
npm test
```

- UI 模式：

```bash
npm run test:ui
```

- 覆盖率：

```bash
npm run coverage
```

> Vitest 配置在 `vite.config.ts:14`，使用 `jsdom`，并通过 `src/setupTests.ts` 注入测试环境。

### 运行 e2e（Playwright）

Playwright 配置在 `playwright.config.ts:4`：
- e2e 目录：`tests/e2e`
- 会自动启动开发服务器：`npm run dev`，并等待 `http://localhost:5173`

常用命令：

```bash
npx playwright test
```

```bash
npx playwright test --ui
```


## 代码结构与运行时架构（高层视图）

### 应用入口与整体布局

- React 入口：`src/main.tsx:1` → 渲染 `App`
- 组合式编辑器布局：`src/App.tsx:26`
  - `MainLayout` 管理整体区域（顶部/左侧层级/中间 SceneView/右侧 Inspector/底部 Project）：`src/components/layout/MainLayout.tsx:13`

### Scene View（3D 视口）

- 视口组件：`src/components/viewport/SceneView.tsx:23`
  - 基于 `@react-three/fiber` 的 `<Canvas>`；场景内容由 `SceneRenderer` 提供：`src/features/scene/SceneRenderer.tsx`
  - 叠加层 UI：`ViewportOverlay`（右上角渲染模式/工具栏等）：`src/components/viewport/ViewportOverlay.tsx`
  - 右下角视图 Gizmo：`ViewGizmo`：`src/components/viewport/ViewGizmo.tsx`
  - 相机系统（轨道/Fly 等导航）：`CameraSystem`：`src/features/editor/navigation/CameraSystem.tsx`
  - 工具 Gizmo 入口：`ActiveToolGizmo`：`src/features/editor/tools/ActiveToolGizmo.tsx`

### 状态管理（Zustand）

本项目核心状态集中在三个 store：

- `useSceneStore`：场景数据模型 + 导入/dirty 状态
  - `src/stores/sceneStore.ts:125`
  - 保存 `scene.objects`（树形层级）、`isDirty`、导入进度等
- `useEditorStore`：编辑器交互状态（工具/导航/选中/视图模式）
  - `src/stores/editorStore.ts:63`
  - 关键字段：`activeTool`、`selectedIds`、`navigationMode`、`viewMode`
- `useHistoryStore`：撤销/重做（命令模式）
  - `src/stores/historyStore.ts:15`
  - `execute(cmd)` 会调用 `cmd.execute()` 并入栈；支持 `merge()` 以合并连续操作（如拖拽更新）

### 命令系统（Undo/Redo）

- 命令接口：`src/features/editor/commands/Command.ts`
- 示例命令：`src/features/editor/commands/DeleteObjectsCommand.ts`

### 交互系统（选择/拖拽/投放）

- 框选：`src/features/interaction/BoxSelector.tsx`
- 选中状态同步与逻辑：`src/features/interaction/SelectionManager.tsx`
- 拖放：`src/features/interaction/DropManager.ts`

### 场景导入/导出 与资源加载

- 场景管理与保存：`src/features/scene/services/SceneManager.ts:12`（保存为 JSON 并下载）
- 场景加载/格式转换：
  - `src/features/scene/services/SceneLoader.ts`
  - `src/features/scene/services/SceneFormatConverter.ts`
- 模型加载：`src/features/scene/services/ModelLoader.ts`
- 资产加载：`src/features/assets/AssetLoader.ts`

### Inspector（属性面板）

- Inspector 面板：`src/components/panels/InspectorPanel.tsx`
- 常见属性组件：
  - Transform：`src/components/inspector/TransformProp.tsx`
  - Light：`src/components/inspector/specific/LightProp.tsx`
  - Camera：`src/components/inspector/specific/CameraProp.tsx`
  - Twin 数据：`src/components/inspector/TwinDataProp.tsx`


## 需求文档位置（实现功能时的对照来源）

原始需求在 `rawRequirements/`（见 `rawRequirements/README.md`）：
- `rawRequirements/SceneView功能需求.md`
- `rawRequirements/三维场景编辑器功能需求.md`
- `rawRequirements/场景编辑器(Scene View)操作指南.md`
- `rawRequirements/UI_Sample/code.html`


## 已知环境/配置备注

- TS 路径别名：`@/* -> src/*`（`tsconfig.json:24`，Vite 同步别名在 `vite.config.ts:9`）
- Vitest 排除 e2e：`vite.config.ts:19`（`tests/e2e/**`）

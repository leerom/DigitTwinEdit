# 节点材质编辑器 — 实施计划总览

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现基于节点的可视化材质编辑器，允许用户通过拖拽连线构建自定义 Three.js TSL NodeMaterial，并与 SceneView 实时联动。

**Architecture:**
- 使用 `@xyflow/react` (React Flow) 作为节点图 UI；
- 使用 Three.js TSL（`three/tsl` + `MeshStandardNodeMaterial`）在 WebGL 端编译并渲染节点图；
- 编辑器以全屏 Overlay 的形式叠加在主编辑器之上，状态由 `materialStore` 管理。

**Tech Stack:** React 19, @xyflow/react, Three.js ^0.173.0 (TSL), Zustand v5, Vitest, Tailwind CSS

---

## 文档索引

| 文件 | 内容 | 任务 | 状态 |
|------|------|------|------|
| [01-foundation.md](./01-foundation.md) | 依赖安装 + 类型定义 + materialStore 扩展 | Task 1–3 | 待实施 |
| [02-node-system.md](./02-node-system.md) | 节点注册表 + TSL 编译器（TDD） | Task 4–6 | 待实施 |
| [03-ui-components.md](./03-ui-components.md) | 节点组件 + 画布 + 各面板 + 编辑器 Overlay | Task 7–12 | 待实施 |
| [04-integration.md](./04-integration.md) | 集成到现有材质/场景系统 | Task 13–17 | 待实施 |

---

## 实施阶段概览

```
Phase 1 — 基础层（01-foundation）
  Task 1: 安装 @xyflow/react 依赖
  Task 2: 新增 NodeGraph 类型定义
  Task 3: materialStore 加入 nodeEditor 状态

Phase 2 — 节点系统（02-node-system）
  Task 4: nodeCategories.ts — 分类元数据
  Task 5: nodeRegistry.ts  — 60 个节点类型注册表
  Task 6: tslCompiler.ts   — TDD 编写，JSON图 → TSL NodeMaterial

Phase 3 — UI 组件（03-ui-components）
  Task 7:  节点 React 组件 (BaseNode / InputNode / OutputNode / GenericNode)
  Task 8:  NodeLibraryPanel.tsx — 左侧节点库
  Task 9:  NodeCanvas.tsx       — React Flow 画布 + 撤销/重做
  Task 10: PropertyPanel.tsx    — 右侧属性面板
  Task 11: PreviewPanel.tsx     — 右侧 3D 预览
  Task 12: NodeMaterialEditor.tsx — 全屏 Overlay 入口

Phase 4 — 系统集成（04-integration）
  Task 13: materialFactory.ts — 支持 NodeMaterial 类型
  Task 14: MaterialAssetProp.tsx — NodeMaterial "打开编辑器"按钮
  Task 15: ProjectPanel.tsx — 新建材质对话框增加 NodeMaterial 选项
  Task 16: EditorPage.tsx — 条件渲染 NodeMaterialEditor Overlay
  Task 17: SceneRenderer 中支持 NodeMaterial 渲染
```

---

## 关键约束

1. **无 DB migration**：NodeGraphData 存储在现有 `material.properties.graph` JSONB 字段中
2. **WebGL 兼容**：使用 `three/examples/jsm/nodes/Addons.js` 中的 `MeshStandardNodeMaterial`，保持 WebGL 渲染管线
3. **独立撤销栈**：节点编辑器内部维护独立历史栈，不污染场景级别的 `useHistoryStore`
4. **实时同步**：节点图变更 debounce 300ms 后编译，调用 `sceneStore.syncMaterialAsset()` 同步 SceneView
5. **自动保存**：编辑器内 debounce 1s 自动保存到服务器

---

## 新增文件目录

```
packages/client/src/features/nodeMaterial/
├── NodeMaterialEditor.tsx        # 全屏 overlay 入口
├── NodeCanvas.tsx                # React Flow 画布
├── NodeLibraryPanel.tsx          # 左侧节点库
├── PropertyPanel.tsx             # 右侧属性面板
├── PreviewPanel.tsx              # 右侧 3D 预览
├── nodes/
│   ├── nodeCategories.ts         # 分类定义
│   ├── nodeRegistry.ts           # 节点类型注册表 + NODE_BUILDERS
│   └── components/
│       ├── BaseNode.tsx          # 通用节点样式包装
│       ├── InputNode.tsx         # 内联参数编辑节点
│       ├── OutputNode.tsx        # fragmentOutput 特殊节点
│       └── GenericNode.tsx       # 纯连线节点（Math/Mesh/Scene 等）
├── compiler/
│   ├── tslCompiler.ts            # JSON 图 → TSL NodeMaterial 编译器
│   └── tslCompiler.test.ts       # 单元测试
└── hooks/
    ├── useNodeEditor.ts           # 编辑器 history + 操作
    └── usePreviewMaterial.ts      # 编译并维护预览材质
```

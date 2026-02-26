# FBX 模型导入 Phase 2 - Inspector 重新导入实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 当用户在 Models 面板单击一个已导入的 GLB 资产时，Inspector 面板显示该模型的导入配置参数，用户可修改后点击「重新导入」使用原始 FBX 重新转换并替换 GLB 文件。

**Architecture:** 在 `assetStore` 中新增 `selectedAssetId` 共享状态，ProjectPanel 单击资产时同时调用 `assetStore.selectAsset()` 和 `editorStore.clearSelection()`；InspectorPanel 在无场景对象选中时读取 `selectedAssetId` 并渲染新的 `ModelImportProp` 组件；`FBXImporter` 新增 `reimport()` 方法，从服务器下载原始 FBX、Worker 重新转换、替换旧 GLB 资产。

**Tech Stack:** Zustand (assetStore/editorStore), React + TypeScript, Three.js Web Worker, axios (下载 FBX), Vitest + @testing-library/react

---

## 任务文档索引

| 文件 | 任务 | 描述 |
|------|------|------|
| [task-2-1-asset-store.md](./task-2-1-asset-store.md) | 2.1 | assetStore 添加 selectedAssetId 状态 |
| [task-2-2-panel-select.md](./task-2-2-panel-select.md) | 2.2 | ProjectPanel 单击资产触发 store 选中 |
| [task-2-3-model-import-prop.md](./task-2-3-model-import-prop.md) | 2.3 | ModelImportProp 组件（Inspector 中的导入设置区域） |
| [task-2-4-inspector.md](./task-2-4-inspector.md) | 2.4 | InspectorPanel 集成资产模式 |
| [task-2-5-reimport.md](./task-2-5-reimport.md) | 2.5 | FBXImporter.reimport() + ModelImportProp 重新导入流程 |

## 依赖关系

```
任务 2.1（assetStore）
  ↓
任务 2.2（ProjectPanel）── 任务 2.3（ModelImportProp）
                                       ↓
                              任务 2.4（Inspector）
                                       ↓
                              任务 2.5（reimport）
                                       ↓
                               Phase 2 完成
```

> 任务 2.5 同时依赖 2.3（ModelImportProp UI）和 2.4（Inspector 集成），须在两者完成后再做。

## 前置条件

Phase 1 已完成：
- `FBXImporter.ts` 存在（含 `validateFile`、`import`、`convertInWorker`）
- `FBXImportDialog.tsx` 存在
- `types.ts`（含 `FBXImportSettings`、`DEFAULT_FBX_IMPORT_SETTINGS`）存在
- `assetsApi` 含 `uploadAsset`、`updateAsset`、`deleteAsset`、`getAssetDownloadUrl`

## 关键文件一览

**新建：**
- `packages/client/src/components/inspector/ModelImportProp.tsx`
- `packages/client/src/components/inspector/__tests__/ModelImportProp.test.tsx`

**修改（前端）：**
- `packages/client/src/stores/assetStore.ts`（添加 selectedAssetId）
- `packages/client/src/stores/assetStore.test.ts`（新增测试）
- `packages/client/src/components/panels/ProjectPanel.tsx`（单击选中资产）
- `packages/client/src/components/panels/InspectorPanel.tsx`（资产检视模式）
- `packages/client/src/api/assets.ts`（添加 replaceAssetFile）
- `packages/client/src/features/fbx/FBXImporter.ts`（添加 reimport 方法）
- `packages/client/src/features/fbx/__tests__/FBXImporter.test.ts`（新增测试）

**修改（后端）：**
- `packages/server/src/services/assetService.ts`（添加 replaceAssetFile 方法）
- `packages/server/src/routes/assets.ts`（添加 `PUT /api/assets/:id/file` 路由）

## 关键业务逻辑

**InspectorPanel 展示优先级：**
- `editorStore.activeId` 有值 → 显示场景对象属性（现有逻辑）
- `editorStore.activeId` 为 null + `assetStore.selectedAssetId` 有值 → 显示资产导入设置
- 两者都为 null → 显示「No object selected」

**资产选中时清除场景选中：**
- ProjectPanel 单击资产时，调用 `editorStore.clearSelection()` + `assetStore.selectAsset(id)`
- 这样 InspectorPanel 能进入资产模式

**只对「有 sourceFbxAssetId」的模型显示导入设置：**
- 直接上传的 GLB/GLTF（无 sourceFbxAssetId）不显示 ModelImportProp
- 只有通过 FBX 导入流程创建的 GLB 才显示导入设置

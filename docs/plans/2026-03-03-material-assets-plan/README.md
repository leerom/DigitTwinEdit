# 材质资产管理功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 ProjectPanel 的 Materials 文件夹增加材质资产的创建/复制/重命名/删除，并在 Inspector 中编辑，实时同步到引用该资产的场景对象。

**Architecture:** 方案A（引用绑定）—— `SceneObject.mesh.materialAssetId` 存储绑定关系，SceneRenderer 继续读 `mesh.material`（零改动），同步由 `sceneStore.syncMaterialAsset()` 驱动。材质资产编辑走 API + 不进 undo/redo 历史；绑定操作走 `BindMaterialAssetCommand`（可撤销）。

**Tech Stack:** React, Zustand (immer), Vitest, TypeScript, Three.js MaterialSpec

---

## 计划文件索引

| 文件 | 内容 | 任务 |
|------|------|------|
| [01-foundation.md](./01-foundation.md) | 数据模型扩展 + sceneStore 新 action | Task 1–2 |
| [02-material-store.md](./02-material-store.md) | useMaterialStore 新建 | Task 3 |
| [03-commands.md](./03-commands.md) | BindMaterialAssetCommand | Task 4 |
| [04-inspector.md](./04-inspector.md) | MaterialAssetProp + InspectorPanel 路由 | Task 5–6 |
| [05-project-panel.md](./05-project-panel.md) | ProjectPanel 右键菜单 + 新建流程 | Task 7 |
| [06-binding.md](./06-binding.md) | MaterialProp 资产选择 + HierarchyPanel drop | Task 8–9 |
| [07-integration.md](./07-integration.md) | EditorPage 集成 + 删除引用清理 | Task 10 |

## 执行顺序

```
Task 1 (类型) → Task 2 (sceneStore) → Task 3 (materialStore)
  → Task 4 (Command) → Task 5 (MaterialAssetProp)
  → Task 6 (InspectorPanel) → Task 7 (ProjectPanel)
  → Task 8 (MaterialProp) → Task 9 (HierarchyDrop)
  → Task 10 (集成)
```

## 运行测试命令

```bash
# 运行全部前端单元测试
pnpm --filter client test -- --run

# 运行单个文件
pnpm --filter client test -- --run src/stores/materialStore.test.ts

# 运行匹配名称
pnpm --filter client test -- --run -t "bindMaterialAsset"
```

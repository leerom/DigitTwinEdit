# 材质资产管理功能设计文档

**日期**：2026-03-03
**功能**：为底部 Project 面板的 Materials 文件夹增加材质资产管理功能

## 背景

材质资产是用户对内置 Three.js 材质的个性化设置快照，可保存、复用，并与场景中的模型建立实时引用关系。

## 文档索引

| 文件 | 内容 |
|------|------|
| [01-data-model.md](./01-data-model.md) | 数据模型变更（类型扩展、新 Store、sceneStore action）|
| [02-project-panel.md](./02-project-panel.md) | ProjectPanel Materials 右键菜单与新建流程 |
| [03-inspector.md](./03-inspector.md) | Inspector 材质资产编辑模式 |
| [04-binding-sync.md](./04-binding-sync.md) | 材质资产绑定场景对象与实时同步机制 |
| [05-error-testing.md](./05-error-testing.md) | 错误处理策略与测试覆盖计划 |

## 核心设计决策

- **同步机制**：方案 A（引用绑定）—— `SceneObject.mesh.materialAssetId` 存储绑定关系，SceneRenderer 读 `mesh.material`（零改动），同步由 `sceneStore.syncMaterialAsset()` action 驱动
- **编辑不走 undo/redo**：材质资产是持久化资产，编辑走 API，与场景命令历史隔离
- **向后兼容**：未绑定资产的场景对象继续使用 `mesh.material`，不受影响

## 受影响的主要文件

```
packages/client/src/
  types/index.ts                          ← MeshComponent 增加 materialAssetId
  stores/materialStore.ts                 ← 新建
  stores/sceneStore.ts                    ← 增加 bindMaterialAsset / syncMaterialAsset
  components/panels/ProjectPanel.tsx      ← Materials 右键菜单 + 新建按钮
  components/panels/InspectorPanel.tsx    ← 路由扩展，material 资产分支
  components/inspector/MaterialAssetProp.tsx  ← 新建
  components/inspector/MaterialProp.tsx   ← 增加"从资产选择"按钮 + 只读模式
  features/editor/commands/BindMaterialAssetCommand.ts  ← 新建（可撤销）
packages/client/src/stores/materialStore.test.ts        ← 新建
```

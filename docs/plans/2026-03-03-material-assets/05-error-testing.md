# 05 错误处理策略与测试覆盖计划

## 5.1 错误处理

| 场景 | 处理方式 |
|------|---------|
| 新建材质 API 失败 | Dialog 内显示 `newMaterialError` 红色提示，不关闭 Dialog |
| 复制材质 API 失败 | `console.error` + 右键菜单关闭，静默失败（与现有 asset 操作保持一致）|
| 重命名材质 API 失败 | `alert('重命名失败，请重试')`（与现有 scene/asset 重命名保持一致）|
| 删除材质 API 失败 | `console.error` + 不刷新列表 |
| `updateMaterialSpec` API 失败 | `materialStore.saveError` 设置，Inspector 顶部显示红色"保存失败"横幅，附"×"关闭按钮 |
| `getMaterial` fetch 失败（Inspector 加载） | Inspector 显示"材质数据加载失败"，提供"重试"按钮 |
| 拖拽绑定时 getMaterial 失败 | `console.error`，操作不执行，无视觉反馈（低频路径）|
| 删除材质资产时场景有引用 | 弹出 Dialog："该材质被 N 个对象使用，删除后这些对象将保留当前材质外观，但失去与资产的关联。确认删除？" → 确认后删除并清除所有对象的 `materialAssetId` |

### 删除引用清理

```typescript
// materialStore.deleteMaterial 成功后
sceneStore.getState().clearMaterialAssetRefs(materialId);
// sceneStore 新增 clearMaterialAssetRefs action：
// 遍历所有对象，将 materialAssetId === id 的字段置为 undefined
```

---

## 5.2 测试计划

### 新建测试文件

#### `packages/client/src/stores/materialStore.test.ts`

| 测试用例 | 验证点 |
|---------|-------|
| `createMaterial` 成功 | materials 列表更新，selectedMaterialId 设为新 ID |
| `createMaterial` 失败 | materials 列表不变，error 不抛出（内部处理）|
| `duplicateMaterial` | 新材质名称含"副本"，properties 与原材质相同 |
| `updateMaterialSpec` 成功 | 调用 `sceneStore.syncMaterialAsset` |
| `updateMaterialSpec` 失败 | `saveError` 被设置 |
| `deleteMaterial` | materials 列表移除对应项 |

#### `packages/client/src/stores/sceneStore` 补充用例

| 测试用例 | 验证点 |
|---------|-------|
| `bindMaterialAsset` | 目标对象 `mesh.materialAssetId` 和 `mesh.material` 均更新 |
| `syncMaterialAsset` | 所有引用 assetId 的对象 `mesh.material` 同步更新，无关对象不受影响 |
| `clearMaterialAssetRefs` | 所有引用 assetId 的对象 `mesh.materialAssetId` 置 undefined |

#### `packages/client/src/components/inspector/MaterialAssetProp.test.tsx`

| 测试用例 | 验证点 |
|---------|-------|
| 渲染材质字段 | 初始化后显示正确字段（颜色、粗糙度等）|
| onChange 触发 debounce | 修改字段后 500ms 内调用 `updateMaterialSpec` |
| saveError 显示 | `materialStore.saveError` 非空时显示错误横幅 |
| 类型切换 | 切换 MaterialType 后字段列表随之更新 |

#### `BindMaterialAssetCommand.test.ts`

| 测试用例 | 验证点 |
|---------|-------|
| execute | `bindMaterialAsset` 被调用，参数正确 |
| undo | 恢复之前的 `material` 和 `materialAssetId` |

---

## 5.3 不在本次范围内

以下功能不在本次实现范围，可作为后续迭代：

- **材质球预览**：在 ProjectPanel 的材质卡片或 Inspector 头部显示实时渲染的材质球
- **材质资产导入/导出**：以 `.mat.json` 文件形式导入导出材质
- **undo/redo 材质资产编辑**：当前材质资产编辑不走命令系统，后续可考虑
- **材质资产跨场景复用**：当前材质资产绑定在项目级，不跨场景
- **批量替换**：一键将场景中所有使用某材质的对象替换为另一材质

# 04 材质资产绑定场景对象与实时同步机制

## 4.1 入口 A：拖拽绑定

### 拖拽发起（ProjectPanel）

Materials 文件夹的材质卡片复用现有 `handleAssetDragStart`，已传递：
- `assetId`
- `assetType = 'material'`

无需修改发起端。

### 拖拽目标（HierarchyPanel）

文件：`packages/client/src/components/hierarchy/HierarchyPanel.tsx`（或对象行组件）

在对象行的 `onDrop` 处理中，增加 `assetType === 'material'` 分支：

```typescript
const handleDrop = async (e: React.DragEvent, targetObjectId: string) => {
  const assetId = parseInt(e.dataTransfer.getData('assetId'));
  const assetType = e.dataTransfer.getData('assetType');

  if (assetType === 'material') {
    const targetObj = sceneStore.scene.objects[targetObjectId];
    // 仅允许绑定到 MESH 类型且有 mesh 组件的对象
    if (targetObj?.type !== ObjectType.MESH) return;

    // 获取材质 spec
    const materialData = await materialsApi.getMaterial(assetId);
    const spec: MaterialSpec = {
      type: materialData.type as MaterialType,
      props: materialData.properties,
    };

    // 走命令系统（可撤销）
    historyStore.execute(new BindMaterialAssetCommand(targetObjectId, assetId, spec));
  }
  // 现有 model 拖拽逻辑不变
};
```

---

## 4.2 入口 B：Inspector 按钮选择

### MaterialProp.tsx 变更

在材质类型选择器旁增加"从资产选择"按钮：

```tsx
{/* 类型选择行 */}
<div className="flex items-center justify-between">
  <label>类型</label>
  <div className="flex items-center gap-2">
    {/* 已绑定资产时，显示资产名称 + 解除按钮 */}
    {materialAssetId ? (
      <span className="text-[10px] text-primary flex items-center gap-1">
        <span className="material-symbols-outlined text-xs">texture</span>
        {boundAssetName}
        <button onClick={handleUnbind} title="解除绑定">×</button>
      </span>
    ) : (
      <button onClick={() => setShowAssetPicker(true)} className="...">
        从资产选择
      </button>
    )}
    <select value={type} onChange={handleTypeChange} disabled={!!materialAssetId}>
      ...
    </select>
  </div>
</div>
```

**资产选择器浮层**：

```tsx
{showAssetPicker && (
  <div className="absolute z-50 bg-panel-dark border border-border-dark rounded shadow-xl p-2 max-h-48 overflow-y-auto">
    {materials.map(m => (
      <button
        key={m.id}
        className="flex items-center gap-2 w-full text-left px-2 py-1 hover:bg-slate-700 text-xs"
        onClick={() => handleBindAsset(m.id)}
      >
        <span className="material-symbols-outlined text-xs">texture</span>
        {m.name}
      </button>
    ))}
    {materials.length === 0 && (
      <p className="text-xs text-slate-500 px-2">暂无材质资产</p>
    )}
  </div>
)}
```

**绑定操作**：
```typescript
const handleBindAsset = async (assetId: number) => {
  setShowAssetPicker(false);
  const materialData = await materialsApi.getMaterial(assetId);
  const spec: MaterialSpec = { type: materialData.type as MaterialType, props: materialData.properties };
  historyStore.execute(new BindMaterialAssetCommand(objectId, assetId, spec));
};
```

**已绑定时材质字段只读**：

当 `materialAssetId` 存在时，`MaterialProp` 中的所有字段设为 `disabled`，并在顶部显示提示：

```tsx
{materialAssetId && (
  <p className="text-[10px] text-slate-500 italic">
    材质由资产驱动，请在 Materials 面板中编辑
    <button onClick={() => materialStore.selectMaterial(materialAssetId)} className="text-primary ml-1 hover:underline">
      跳转
    </button>
  </p>
)}
```

---

## 4.3 实时同步时序

```
用户在 Inspector 编辑材质资产属性
  ↓
MaterialAssetProp.handlePropChange(key, value)
  ↓
setLocalSpec(patch)          ← 本地立即响应
  ↓
debounce 500ms
  ↓
materialStore.updateMaterialSpec(assetId, newSpec)
  ├── materialsApi.updateMaterial(assetId, { type, properties })
  │     → API PUT /materials/:id  → 持久化到服务器
  └── sceneStore.syncMaterialAsset(assetId, newSpec)
        → immer: 遍历 scene.objects
        → 所有 mesh.materialAssetId === assetId 的对象
        → obj.components.mesh.material = newSpec
        → Zustand 触发重渲染
              ↓
        SceneRenderer 订阅 scene.objects
              ↓
        materialRef.current 重新 apply（现有逻辑）
              ↓
        Three.js 画面实时更新
```

---

## 4.4 解除绑定

用户点击"解除绑定"（×按钮）：

```typescript
const handleUnbind = () => {
  // 保留当前 mesh.material spec，清除 materialAssetId
  historyStore.execute(new BindMaterialAssetCommand(objectId, 0, currentMaterial));
  // BindMaterialAssetCommand 中 assetId=0 表示解除绑定
};
```

`bindMaterialAsset` action 中，`assetId === 0` 时仅清除 `materialAssetId`，保留 `material` spec。

---

## 4.5 场景保存与加载

`materialAssetId` 存储在 `SceneObject.components.mesh` 中，随场景 JSON 自动保存/加载。

加载场景后，若场景对象有 `materialAssetId`，需确保 `materialStore` 中有对应数据。
处理方式：`EditorPage` 加载场景时，同步调用 `materialStore.loadMaterials(projectId)`。

# 03 Inspector — 材质资产编辑模式

## 现状

`InspectorPanel` 在 `!activeId && selectedAsset` 时进入"资产检视模式"：
- `type === 'model'`：显示 `ModelImportProp`
- `type === 'texture'`：显示 `TextureImportProp`
- `type === 'material'`：**未处理**（显示空）

## 变更目标

1. 新建 `MaterialAssetProp` 组件，展示并编辑材质资产的完整属性
2. `InspectorPanel` 路由扩展，识别 `material` 类型资产
3. 编辑实时同步到所有引用该资产的场景对象

---

## 3.1 新建 MaterialAssetProp 组件

文件：`packages/client/src/components/inspector/MaterialAssetProp.tsx`

### 数据流

```
props: { assetId: number }
  ↓
useEffect: materialsApi.getMaterial(assetId) → localSpec: MaterialSpec
  ↓
用户修改字段
  ↓
handlePropChange(key, value)
  → setLocalSpec(patch)         ← 本地立即更新（无卡顿感）
  → debounce 500ms
  → materialStore.updateMaterialSpec(assetId, newSpec)
      ├── API PUT /materials/:id  （持久化）
      └── sceneStore.syncMaterialAsset(assetId, newSpec)  （实时同步渲染）
```

### UI 结构

复用 `MaterialProp` 的分组折叠布局和 `MaterialFieldRenderer`，但数据源为材质资产：

```tsx
<div className="bg-[#0c0e14] border border-[#2d333f] p-3 rounded-sm space-y-3">
  {/* 保存状态指示 */}
  {saveError && (
    <div className="text-xs text-red-400 flex items-center gap-1">
      <span className="material-symbols-outlined text-sm">error</span>
      {saveError}
      <button onClick={clearSaveError}>×</button>
    </div>
  )}

  {/* 类型选择（可切换） */}
  <div className="flex items-center justify-between">
    <label className="text-[11px] text-[#999999]">类型</label>
    <select value={type} onChange={handleTypeChange}>
      {MATERIAL_TYPES.map(t => <option key={t}>{t}</option>)}
    </select>
  </div>

  {/* 分组字段（与 MaterialProp 相同的折叠分组） */}
  {fieldsByGroup.entries().map(([group, fields]) => (
    <CollapsibleGroup key={group} group={group} ...>
      {fields.map(field => (
        <MaterialFieldRenderer
          key={field.key}
          field={field}
          value={localSpec.props[field.key]}
          onChange={handlePropChange}
          projectId={projectId}
        />
      ))}
    </CollapsibleGroup>
  ))}
</div>
```

### 注意事项

- **不走 HistoryStore**：材质资产编辑直接写 API，与场景命令历史隔离
- **乐观更新**：本地 `localSpec` 先更新，API 失败时显示 `saveError` 但不回滚本地（避免闪烁）
- **assetId 变化时**：`useEffect` 重新 fetch，`localSpec` 重置

---

## 3.2 InspectorPanel 路由扩展

文件：`packages/client/src/components/panels/InspectorPanel.tsx`

在"资产检视模式"分支中，区分 material：

```typescript
// 现有 selectedAsset 判断后，增加：
if (selectedAsset?.type === 'material') {
  return (
    <MaterialAssetInspector
      asset={selectedAsset}
      projectId={selectedAsset.project_id}
    />
  );
}
// 现有 model/texture 逻辑不动
```

其中 `MaterialAssetInspector` 是一个简单的包装组件：

```tsx
const MaterialAssetInspector: React.FC<{ asset: Asset; projectId: number }> = ({ asset, projectId }) => (
  <div className="flex flex-col h-full w-full bg-panel-dark flex-shrink-0">
    <div className="panel-title">...</div>
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {/* 资产头部（同 model/texture 格式） */}
      <div className="p-4 border-b border-border-dark bg-header-dark/50">
        <div className="flex items-center space-x-3">
          <span className="material-symbols-outlined text-primary text-base">texture</span>
          <div>
            <p className="text-xs text-white font-medium">{asset.name}</p>
            <p className="text-[10px] text-slate-500">
              {asset.metadata?.materialType as string ?? 'material'} · {(asset.file_size / 1024).toFixed(0)} KB
            </p>
          </div>
        </div>
      </div>
      {/* 属性编辑 */}
      <div className="p-4">
        <MaterialAssetProp assetId={asset.id} projectId={projectId} />
      </div>
    </div>
  </div>
);
```

---

## 3.3 materialStore 与 selectedMaterialId 联动

`ProjectPanel` 选中材质卡片时：
```typescript
materialStore.selectMaterial(asset.id)
assetStore.selectAsset(null)   // 清除资产选中，避免 Inspector 混乱
```

`InspectorPanel` 读取：
```typescript
const selectedMaterialId = useMaterialStore(s => s.selectedMaterialId);
const materials = useMaterialStore(s => s.materials);
const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

// 路由判断
if (!activeId && selectedMaterial) {
  return <MaterialAssetInspector asset={selectedMaterial} ... />;
}
if (!activeId && selectedAsset) {
  // 现有 model/texture 逻辑
}
```

优先级：`materialId > assetId > 无选中`

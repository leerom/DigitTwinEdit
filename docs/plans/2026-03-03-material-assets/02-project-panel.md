# 02 ProjectPanel — Materials 右键菜单与新建流程

## 现状

- Materials 文件夹已通过 `loadAssets(projectId, 'material')` 加载资产列表
- 使用 `AssetCard` 渲染，支持 `onSelect / onRename / onDelete / onDragStart`
- 无右键菜单，无新建入口，无材质专属操作

## 变更目标

1. 工具栏新增"新建材质"按钮
2. 空白区域右键菜单（新建）
3. 资产卡片右键菜单（复制 / 重命名 / 删除）
4. 切换到 Materials 文件夹时使用 `materialStore` 加载（而非 `assetStore`）

---

## 详细变更

### 2.1 materialStore 接管 Materials 加载

`ProjectPanel.tsx` 中，当 `selectedFolder === 'materials'` 时：
- `useEffect` 改为调用 `materialStore.loadMaterials(projectId)`
- 渲染列表改为 `materialStore.materials`
- 选中改为 `materialStore.selectMaterial(id)`（同时 `assetStore.selectAsset(null)` 清除）

### 2.2 工具栏"新建材质"按钮

```tsx
{selectedFolder === 'materials' && (
  <button onClick={handleNewMaterialClick} ...>
    <span className="material-symbols-outlined text-sm">add</span>
    <span>新建材质</span>
  </button>
)}
```

### 2.3 新建材质 Dialog

状态：`showNewMaterialDialog: boolean`

Dialog 内容：
```
┌──────────────────────────────┐
│ 新建材质                      │
├──────────────────────────────┤
│ 名称: [新建材质____________]  │
│ 类型: [MeshStandardMaterial▼]│
│        MeshPhysicalMaterial  │
│        MeshPhongMaterial     │
│        MeshLambertMaterial   │
│        MeshBasicMaterial     │
├──────────────────────────────┤
│              [取消]  [创建]   │
└──────────────────────────────┘
```

确认后：
```
materialStore.createMaterial(projectId, name, type)
→ 成功：关闭 Dialog，自动选中新材质（Inspector 自动切换到材质编辑模式）
→ 失败：Dialog 内显示错误信息
```

### 2.4 空白区域右键菜单

`selectedFolder === 'materials'` 时，空白区域右键显示：
```
新建材质  →  触发 handleNewMaterialClick
```

### 2.5 资产卡片右键菜单

`AssetCard` 当前已支持 `onRename / onDelete`，在 ProjectPanel 包装层处理材质专属逻辑：

```
右键材质卡片 → ContextMenu
  ├── 重命名  → materialStore.renameMaterial(id, newName)
  ├── 复制    → materialStore.duplicateMaterial(id, projectId)
  └── 删除    → 检查场景引用 → 警告 Dialog → materialStore.deleteMaterial(id)
```

**删除前检查**：
```typescript
// 统计场景中引用该材质资产的对象数量
const refCount = Object.values(sceneStore.scene.objects)
  .filter(obj => obj.components?.mesh?.materialAssetId === assetId).length;

if (refCount > 0) {
  // 显示警告 Dialog：
  // "该材质被场景中 N 个对象使用，删除后这些对象将保留当前材质外观，但失去与资产的关联。确认删除？"
}
```

### 2.6 右键菜单时同步选中材质

右键某材质卡片 → 同时 `materialStore.selectMaterial(id)`，Inspector 自动切换到该材质编辑视图。

---

## 组件状态新增

```typescript
const [showNewMaterialDialog, setShowNewMaterialDialog] = useState(false);
const [newMaterialName, setNewMaterialName] = useState('新建材质');
const [newMaterialType, setNewMaterialType] = useState<MaterialType>('MeshStandardMaterial');
const [materialContextMenu, setMaterialContextMenu] = useState<{
  x: number; y: number; assetId: number
} | null>(null);
const [newMaterialError, setNewMaterialError] = useState<string | null>(null);
```

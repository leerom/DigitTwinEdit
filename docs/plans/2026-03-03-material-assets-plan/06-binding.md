# Task 8–9: MaterialProp 资产选择 + HierarchyPanel Drop

---

## Task 8: MaterialProp 增加"从资产选择"按钮 + 只读模式

**Files:**
- Modify: `packages/client/src/components/inspector/MaterialProp.tsx`

### Step 1: 了解现有结构

`MaterialProp.tsx` 接受 `{ objectId: string }`，读取 `sceneStore.scene.objects[objectId].components.mesh.material`。
当前无材质资产绑定逻辑。

### Step 2: 修改 MaterialProp.tsx

**新增 imports：**

```typescript
import { useMaterialStore } from '@/stores/materialStore';
import { BindMaterialAssetCommand } from '@/features/editor/commands/BindMaterialAssetCommand';
import { materialsApi } from '@/api/assets';
```

**在组件体内新增状态和数据：**

```typescript
// 当前绑定的材质资产 ID（从 sceneStore 读取）
const materialAssetId = useSceneStore(
  (state) => (state.scene.objects[objectId]?.components?.mesh as any)?.materialAssetId as number | undefined
);

const { materials, selectedMaterialId, selectMaterial } = useMaterialStore();
const [showAssetPicker, setShowAssetPicker] = useState(false);

const boundAsset = materialAssetId
  ? materials.find((m) => m.id === materialAssetId)
  : undefined;
```

**修改类型选择区域（第 77–88 行），在类型 `<select>` 前插入资产绑定 UI：**

```tsx
{/* 类型选择 + 资产绑定 */}
<div className="flex items-center justify-between gap-2 flex-wrap">
  <label className="text-[11px] text-[#999999] font-medium">类型</label>
  <div className="flex items-center gap-2 ml-auto">
    {/* 已绑定资产时显示资产名 + 解除按钮 */}
    {boundAsset ? (
      <span className="text-[10px] text-primary flex items-center gap-1">
        <span className="material-symbols-outlined text-xs">texture</span>
        <button
          className="hover:underline truncate max-w-[80px]"
          title={boundAsset.name}
          onClick={() => selectMaterial(materialAssetId!)}
        >
          {boundAsset.name}
        </button>
        <button
          onClick={handleUnbind}
          className="hover:text-slate-300 ml-1"
          title="解除绑定"
        >
          ×
        </button>
      </span>
    ) : (
      <div className="relative">
        <button
          onClick={() => setShowAssetPicker((v) => !v)}
          className="text-[10px] text-slate-400 hover:text-white border border-[#2d333f] rounded px-2 py-0.5"
        >
          从资产选择
        </button>
        {showAssetPicker && (
          <div className="absolute right-0 top-6 z-50 bg-[#1a1d28] border border-[#2d333f] rounded shadow-xl p-1 min-w-[160px] max-h-48 overflow-y-auto">
            {materials.length === 0 ? (
              <p className="text-xs text-slate-500 px-2 py-1">暂无材质资产</p>
            ) : (
              materials.map((m) => (
                <button
                  key={m.id}
                  className="flex items-center gap-2 w-full text-left px-2 py-1 hover:bg-slate-700 text-xs rounded"
                  onClick={() => handleBindAsset(m.id)}
                >
                  <span className="material-symbols-outlined text-xs">texture</span>
                  {m.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    )}
    {/* 类型选择（已绑定时禁用） */}
    <select
      className="bg-[#0c0e14] text-[12px] text-white border border-[#2d333f] rounded px-2 py-1 disabled:opacity-50"
      value={type}
      onChange={(e) => handleTypeChange(e.target.value as MaterialType)}
      disabled={!!materialAssetId}
    >
      {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  </div>
</div>
```

**新增 handler 函数（在 `handlePropChange` 之后）：**

```typescript
const handleBindAsset = async (assetId: number) => {
  setShowAssetPicker(false);
  try {
    const data = await materialsApi.getMaterial(assetId);
    const spec: MaterialSpec = { type: data.type as MaterialType, props: data.properties };
    exec(new BindMaterialAssetCommand(objectId, assetId, spec));
  } catch (error) {
    console.error('Failed to bind material asset:', error);
  }
};

const handleUnbind = () => {
  const currentSpec: MaterialSpec = { type: type as MaterialType, props };
  exec(new BindMaterialAssetCommand(objectId, 0, currentSpec));
};
```

**已绑定时属性字段只读**：在 `MaterialFieldRenderer` 上增加 `disabled={!!materialAssetId}` prop（若 `MaterialFieldRenderer` 不支持 disabled 则先添加该 prop 支持），并在字段区域顶部显示只读提示：

```tsx
{materialAssetId && (
  <p className="text-[10px] text-slate-500 italic mb-2">
    材质由资产驱动，请在 Materials 面板中编辑
  </p>
)}
```

### Step 3: 手动验证

1. 选中场景中的 Mesh 对象
2. Inspector 的"材质"区域出现"从资产选择"按钮
3. 点击后弹出材质资产列表
4. 选择一个材质资产，场景 SceneView 中该对象材质更新
5. Inspector 显示该材质资产名称 + 解除绑定按钮
6. 属性字段变为只读状态，出现"材质由资产驱动"提示
7. Ctrl+Z 可撤销绑定

### Step 4: Commit

```bash
git add packages/client/src/components/inspector/MaterialProp.tsx
git commit -m "feat(inspector): MaterialProp 增加"从资产选择"按钮与已绑定只读模式"
```

---

## Task 9: HierarchyPanel — 支持材质资产 Drop

**Files:**
- Modify: `packages/client/src/components/panels/HierarchyPanel.tsx`

### Step 1: 了解现有 Drop 机制

`HierarchyPanel.tsx` 使用 `useAssetDrop` hook，但该 hook 只处理 `asset.type === 'model'`。
材质资产 drop 到层级树的**特定对象行**，需要 per-item drop 而非整体面板 drop。

### Step 2: 在 HierarchyItem 组件上增加 drop 支持

在 `HierarchyItem` 组件内新增：

```typescript
import { useHistoryStore } from '@/stores/historyStore';
import { useMaterialStore } from '@/stores/materialStore';
import { BindMaterialAssetCommand } from '@/features/editor/commands/BindMaterialAssetCommand';
import { materialsApi } from '@/api/assets';
import type { MaterialSpec, MaterialType } from '@/types';

// 在 HierarchyItem 组件体内：
const [isDragOver, setIsDragOver] = useState(false);

const handleDragOver = (e: React.DragEvent) => {
  if (e.dataTransfer.types.includes('assettype')) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }
};

const handleDragLeave = (e: React.DragEvent) => {
  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
    setIsDragOver(false);
  }
};

const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragOver(false);

  const assetType = e.dataTransfer.getData('assetType');
  if (assetType !== 'material') return;

  // 只允许绑定到 MESH 类型对象
  if (object.type !== ObjectType.MESH) return;

  const assetId = parseInt(e.dataTransfer.getData('assetId'), 10);
  if (isNaN(assetId)) return;

  try {
    const data = await materialsApi.getMaterial(assetId);
    const spec: MaterialSpec = { type: data.type as MaterialType, props: data.properties };
    useHistoryStore.getState().execute(new BindMaterialAssetCommand(id, assetId, spec));
  } catch (error) {
    console.error('Failed to bind material on drop:', error);
  }
};
```

在 HierarchyItem 的根 div 上添加 drop 事件和视觉反馈：

```tsx
<div
  className={clsx(
    "hierarchy-item",
    isSelected && "bg-primary/20 text-white border-l-2 border-primary",
    isDragOver && object.type === ObjectType.MESH && "ring-1 ring-primary/60 bg-primary/10"
  )}
  style={{ paddingLeft: `${depth * 16 + 12}px` }}
  onClick={handleSelect}
  onContextMenu={handleContextMenuEvent}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
```

### Step 3: 手动验证

1. 在 ProjectPanel 的 Materials 文件夹，拖拽一个材质卡片
2. 拖到层级树中的 Mesh 对象行，出现高亮边框
3. 松开，SceneView 中该对象材质更新
4. Inspector 切换到该对象，显示已绑定的材质资产名称

### Step 4: Commit

```bash
git add packages/client/src/components/panels/HierarchyPanel.tsx
git commit -m "feat(hierarchy): HierarchyItem 支持接受材质资产拖拽绑定"
```

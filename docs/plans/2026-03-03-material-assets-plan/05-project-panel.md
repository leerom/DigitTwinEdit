# Task 7: ProjectPanel — Materials 右键菜单 + 新建流程

**Files:**
- Modify: `packages/client/src/components/panels/ProjectPanel.tsx`

---

### Step 1: 了解需改动的区域

`ProjectPanel.tsx` 当前：
- 第 23 行：`type FolderType = 'scenes' | 'models' | 'materials' | 'textures'`
- 第 65 行：`loadAssets(currentProject.id, assetType)` — Materials 用 assetStore
- 第 196–201 行：`displayAssets` 过滤逻辑
- 第 286–291 行：Materials 文件夹按钮
- 第 311–338 行：工具栏（Models 有"导入 FBX"，Textures 有"导入纹理"）
- 第 424–450 行：资产卡片渲染区域

### Step 2: 修改 ProjectPanel.tsx

**2.1 新增 imports（文件顶部）：**

```typescript
import { useMaterialStore } from '../../stores/materialStore';
import type { MaterialType } from '../../types';
```

**2.2 在组件体内新增 materialStore 订阅（useAssetStore 解构之后）：**

```typescript
const {
  materials,
  isLoading: isMaterialsLoading,
  selectedMaterialId,
  loadMaterials,
  createMaterial,
  duplicateMaterial,
  renameMaterial,
  deleteMaterial: deleteMaterialAsset,
  selectMaterial,
} = useMaterialStore();
```

**2.3 新增状态变量（已有 blankContextMenu 之后）：**

```typescript
const [showNewMaterialDialog, setShowNewMaterialDialog] = useState(false);
const [newMaterialName, setNewMaterialName] = useState('新建材质');
const [newMaterialType, setNewMaterialType] = useState<MaterialType>('MeshStandardMaterial');
const [newMaterialError, setNewMaterialError] = useState<string | null>(null);
const [materialContextMenu, setMaterialContextMenu] = useState<{
  x: number; y: number; assetId: number; assetName: string;
} | null>(null);
```

**2.4 修改 useEffect（加载逻辑）：**

将现有 useEffect（约第 63–68 行）修改：

```typescript
useEffect(() => {
  if (!currentProject) return;
  if (activeTab !== 'project') return;
  if (selectedFolder === 'scenes') return;
  if (selectedFolder === 'materials') {
    loadMaterials(currentProject.id);
  } else {
    const assetType: AssetType = selectedFolder === 'models' ? 'model' : 'texture';
    loadAssets(currentProject.id, assetType);
  }
}, [currentProject, selectedFolder, activeTab, loadAssets, loadMaterials]);
```

**2.5 新增材质操作处理函数（在 handleDeleteAsset 之后）：**

```typescript
const handleNewMaterialConfirm = async () => {
  if (!currentProject) return;
  if (!newMaterialName.trim()) {
    setNewMaterialError('名称不能为空');
    return;
  }
  try {
    setNewMaterialError(null);
    await createMaterial(currentProject.id, newMaterialName.trim(), newMaterialType);
    setShowNewMaterialDialog(false);
    setNewMaterialName('新建材质');
    setNewMaterialType('MeshStandardMaterial');
  } catch {
    setNewMaterialError('创建失败，请重试');
  }
};

const handleDuplicateMaterial = async (assetId: number) => {
  if (!currentProject) return;
  try {
    await duplicateMaterial(assetId, currentProject.id);
  } catch (error) {
    console.error('Failed to duplicate material:', error);
  }
};

const handleRenameMaterial = async (assetId: number, newName: string) => {
  if (!newName.trim()) { alert('名称不能为空'); return; }
  if (newName.length > 255) { alert('名称过长（最多255字符）'); return; }
  try {
    await renameMaterial(assetId, newName.trim());
  } catch {
    alert('重命名失败，请重试');
  }
};

const handleDeleteMaterial = async (assetId: number) => {
  // 检查场景引用
  const refCount = Object.values(useSceneStore.getState().scene.objects)
    .filter((obj: any) => obj.components?.mesh?.materialAssetId === assetId).length;

  const confirmMsg = refCount > 0
    ? `该材质被场景中 ${refCount} 个对象使用，删除后这些对象将保留当前材质外观，但失去与资产的关联。\n\n确认删除？`
    : '确定要删除这个材质资产吗？';

  if (!confirm(confirmMsg)) return;
  try {
    await deleteMaterialAsset(assetId);
  } catch (error) {
    console.error('Failed to delete material:', error);
  }
};
```

注意：在文件顶部 import 中补充 `useSceneStore`：
```typescript
import { useSceneStore } from '../../stores/sceneStore.js';
```

**2.6 修改工具栏区域（在 Textures 按钮 `}` 后加 Materials 按钮）：**

```typescript
{selectedFolder === 'materials' && (
  <button
    onClick={() => setShowNewMaterialDialog(true)}
    className="flex items-center space-x-1 px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs rounded transition-colors"
    disabled={!currentProject}
  >
    <span className="material-symbols-outlined text-sm">add</span>
    <span>新建材质</span>
  </button>
)}
```

**2.7 修改 Content Grid 区域（在 `displayAssets.map` 的 else 分支中，为 materials 文件夹特殊处理）：**

在 `} : (` 之后，将资产卡片渲染修改为条件渲染：

```typescript
// Materials 文件夹用 materialStore 数据
selectedFolder === 'materials' ? (
  isMaterialsLoading ? (
    <div className="flex items-center justify-center h-full text-slate-500">
      <div className="flex flex-col items-center space-y-2">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">加载中...</span>
      </div>
    </div>
  ) : materials.length === 0 ? (
    <div className="flex items-center justify-center h-full text-slate-500">
      <div className="flex flex-col items-center space-y-2">
        <span className="material-symbols-outlined text-4xl">texture</span>
        <span className="text-xs">暂无材质资产</span>
        <button onClick={() => setShowNewMaterialDialog(true)} className="text-primary hover:underline text-xs">
          点击新建
        </button>
      </div>
    </div>
  ) : (
    <div
      className="grid grid-cols-10 gap-4 content-start"
      onContextMenu={(e) => { e.preventDefault(); setBlankContextMenu({ x: e.clientX, y: e.clientY }); }}
    >
      {materials.map((mat) => (
        <AssetCard
          key={mat.id}
          asset={mat}
          selected={selectedMaterialId === mat.id}
          onSelect={() => {
            selectMaterial(mat.id);
            // 清除 assetStore 的选中，避免 Inspector 混乱
            selectAsset(null);
            clearSelection();
          }}
          onOpen={() => {}}   // 材质资产无"打开"行为
          onRename={(name) => handleRenameMaterial(mat.id, name)}
          onDelete={() => handleDeleteMaterial(mat.id)}
          onDragStart={(e) => handleAssetDragStart(e, mat.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            selectMaterial(mat.id);
            selectAsset(null);
            setMaterialContextMenu({ x: e.clientX, y: e.clientY, assetId: mat.id, assetName: mat.name });
          }}
        />
      ))}
    </div>
  )
) : (
  // 原有 models / textures 渲染逻辑（保持不变）
  ...
)
```

注意：`AssetCard` 可能需要增加 `onContextMenu` prop——检查 `packages/client/src/components/assets/AssetCard.tsx`，若该 prop 不存在则在卡片 wrapper div 上直接 `onContextMenu`。

**2.8 修改 blankAreaMenuItems（区分 scenes 和 materials）：**

将原有 `blankAreaMenuItems` 改为根据 `selectedFolder` 动态生成：

```typescript
const blankAreaMenuItems: ContextMenuItem[] = selectedFolder === 'materials' ? [
  {
    label: '新建材质',
    icon: 'add',
    onClick: () => {
      setBlankContextMenu(null);
      setShowNewMaterialDialog(true);
    },
  },
] : [
  // 原有 scenes 菜单项（保持不变）
  ...
];
```

**2.9 添加材质资产右键菜单（在 `blankContextMenu` ContextMenu 之后）：**

```tsx
{materialContextMenu && (
  <ContextMenu
    items={[
      {
        label: '复制',
        icon: 'content_copy',
        onClick: () => {
          handleDuplicateMaterial(materialContextMenu.assetId);
          setMaterialContextMenu(null);
        },
      },
      {
        label: '重命名',
        icon: 'edit',
        onClick: () => setMaterialContextMenu(null), // AssetCard inline 重命名由 onRename 触发
      },
      {
        label: '删除',
        icon: 'delete',
        danger: true,
        onClick: () => {
          handleDeleteMaterial(materialContextMenu.assetId);
          setMaterialContextMenu(null);
        },
      },
    ]}
    position={materialContextMenu}
    onClose={() => setMaterialContextMenu(null)}
  />
)}
```

**2.10 添加新建材质 Dialog（在文件末尾 JSX 中，其他 Dialog 之后）：**

```tsx
{/* 新建材质 Dialog */}
<Dialog
  isOpen={showNewMaterialDialog}
  onClose={() => { setShowNewMaterialDialog(false); setNewMaterialError(null); }}
  title="新建材质"
  className="max-w-[400px]"
>
  <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-2">
      <label className="text-xs text-slate-400">名称</label>
      <input
        className="bg-[#0c0e14] border border-[#2d333f] text-sm text-white px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary/50"
        value={newMaterialName}
        onChange={(e) => setNewMaterialName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleNewMaterialConfirm()}
        autoFocus
      />
    </div>
    <div className="flex flex-col gap-2">
      <label className="text-xs text-slate-400">材质类型</label>
      <select
        className="bg-[#0c0e14] border border-[#2d333f] text-sm text-white px-2 py-1.5 rounded"
        value={newMaterialType}
        onChange={(e) => setNewMaterialType(e.target.value as MaterialType)}
      >
        <option value="MeshStandardMaterial">MeshStandardMaterial</option>
        <option value="MeshPhysicalMaterial">MeshPhysicalMaterial</option>
        <option value="MeshPhongMaterial">MeshPhongMaterial</option>
        <option value="MeshLambertMaterial">MeshLambertMaterial</option>
        <option value="MeshBasicMaterial">MeshBasicMaterial</option>
      </select>
    </div>
    {newMaterialError && (
      <p className="text-xs text-red-400">{newMaterialError}</p>
    )}
    <div className="flex justify-end gap-2 mt-2">
      <button
        onClick={() => { setShowNewMaterialDialog(false); setNewMaterialError(null); }}
        className="px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors"
      >
        取消
      </button>
      <button
        onClick={handleNewMaterialConfirm}
        className="px-3 py-1.5 text-xs bg-accent-blue hover:bg-accent-blue/90 text-white rounded transition-colors"
      >
        创建
      </button>
    </div>
  </div>
</Dialog>
```

### Step 3: 手动验证

1. Materials 文件夹工具栏出现"新建材质"按钮
2. 点击"新建材质"弹出 Dialog，填入名称/类型后点创建，卡片出现
3. 右键材质卡片弹出复制/重命名/删除菜单
4. 删除有场景引用的材质，弹出带引用数量的警告

### Step 4: Commit

```bash
git add packages/client/src/components/panels/ProjectPanel.tsx
git commit -m "feat(project-panel): Materials 文件夹增加新建/复制/重命名/删除右键菜单"
```

# Task 10: EditorPage 集成 + AssetCard onContextMenu

---

## Task 10a: EditorPage 加载材质列表

**Files:**
- Modify: `packages/client/src/features/editor/EditorPage.tsx`

### Step 1: 了解 EditorPage 现有加载逻辑

EditorPage 在挂载时加载场景、资产等。需要在加载场景后同步加载材质列表，
确保场景中已绑定 `materialAssetId` 的对象能在 `materialStore.materials` 中找到对应资产。

### Step 2: 修改 EditorPage.tsx

**新增 import：**

```typescript
import { useMaterialStore } from '../../stores/materialStore';
```

**在现有 `useEffect` 或场景加载完成回调中，追加材质加载：**

找到 EditorPage 中调用 `loadAssets` 或 `projectStore.loadProject` 的地方，在同一 `useEffect` 内追加：

```typescript
const loadMaterials = useMaterialStore((s) => s.loadMaterials);

// 在加载项目/场景的 useEffect 中，获取到 projectId 后：
if (projectId) {
  loadMaterials(Number(projectId));
}
```

### Step 3: 手动验证

1. 打开一个已有绑定材质资产的场景
2. 检查 Inspector 中绑定材质的名称是否正确显示（不显示 undefined）

### Step 4: Commit

```bash
git add packages/client/src/features/editor/EditorPage.tsx
git commit -m "feat(editor): EditorPage 加载时同步初始化材质资产列表"
```

---

## Task 10b: 检查 AssetCard 是否支持 onContextMenu prop

**Files:**
- Possibly modify: `packages/client/src/components/assets/AssetCard.tsx`

### Step 1: 检查 AssetCard

```bash
# 查看 AssetCard props 定义
```

读取 `packages/client/src/components/assets/AssetCard.tsx`，检查 props 接口是否有 `onContextMenu`。

**如果没有**，在 props 接口中增加：

```typescript
onContextMenu?: (e: React.MouseEvent) => void;
```

并在卡片根 div 上绑定：

```tsx
<div
  ...
  onContextMenu={onContextMenu}
>
```

### Step 2: Commit（仅在有修改时）

```bash
git add packages/client/src/components/assets/AssetCard.tsx
git commit -m "feat(assets): AssetCard 增加 onContextMenu prop 支持"
```

---

## Task 10c: 全功能集成测试

手动走完以下完整流程验证功能：

**场景一：新建并应用材质资产**
1. 打开 Editor，进入 ProjectPanel → Materials 文件夹
2. 点击"新建材质"，输入名称"测试金属"，选择 `MeshPhysicalMaterial`，点创建
3. 材质卡片出现，Inspector 自动切换到材质编辑模式
4. 在 Inspector 中修改颜色和粗糙度
5. 500ms 后 API 自动保存（不需手动操作）
6. 从层级树选中一个 Mesh 对象
7. 在层级树中将"测试金属"材质卡片拖到该对象行
8. SceneView 中该对象材质立即更新
9. Inspector 显示绑定信息（资产名称 + 解除按钮，字段只读）

**场景二：编辑材质资产实时同步**
1. 在层级树中再选中另一个 Mesh 对象
2. 通过 Inspector 的"从资产选择"绑定相同材质资产
3. 切换到 Materials 文件夹，点击该材质资产
4. 在 Inspector 中修改颜色
5. SceneView 中两个绑定该材质的对象**同时**更新颜色

**场景三：复制材质**
1. 右键材质卡片 → 复制
2. 出现"XXX 副本"卡片

**场景四：删除材质（有引用）**
1. 右键有场景引用的材质 → 删除
2. 出现警告 Dialog，显示被引用对象数量
3. 确认后，该材质卡片消失
4. 被绑定的场景对象保留原材质外观，但 `materialAssetId` 被清除

**场景五：撤销绑定操作**
1. 拖拽材质到场景对象（或通过 Inspector 按钮绑定）
2. 按 Ctrl+Z 撤销
3. 对象材质恢复到绑定前的状态

---

## Task 10d: 运行全量单元测试

```bash
pnpm --filter client test -- --run
```

预期：所有既有测试仍通过，新增测试全部通过。

修复任何因本次改动导致的测试失败。

### Final Commit

```bash
git add -A
git commit -m "feat(material-assets): 材质资产管理功能完整实现

- MeshComponent 增加 materialAssetId 字段
- sceneStore 增加 bindMaterialAsset/syncMaterialAsset/clearMaterialAssetRefs
- 新建 useMaterialStore（CRUD + 实时同步）
- 新建 BindMaterialAssetCommand（可撤销）
- 新建 MaterialAssetProp 组件（Inspector 材质资产编辑）
- InspectorPanel 增加材质资产检视模式
- ProjectPanel Materials 文件夹：新建/复制/重命名/删除
- MaterialProp 增加从资产选择按钮与已绑定只读模式
- HierarchyPanel 支持材质资产拖拽绑定"
```

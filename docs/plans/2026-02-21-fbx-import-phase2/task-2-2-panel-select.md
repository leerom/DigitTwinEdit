# 任务 2.2：ProjectPanel 单击资产触发全局选中

**Files:**
- Modify: `packages/client/src/components/panels/ProjectPanel.tsx`

**依赖：** 任务 2.1（assetStore.selectAsset 已存在）

**背景：** 当前 `ProjectPanel.tsx` 的 `selectedAssetId` 是本地 state，InspectorPanel 读不到。需要改为使用 `assetStore.selectAsset()`，同时调用 `editorStore.clearSelection()` 清除场景对象选中，让 Inspector 进入资产模式。

---

### Step 1：查看需要修改的代码位置

打开 `packages/client/src/components/panels/ProjectPanel.tsx`，找到以下几处：

**位置 A：import 声明（约第 1-13 行）**
当前有：
```typescript
import { useAssetStore } from '../../stores/assetStore.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { useSceneStore } from '../../stores/sceneStore.js';
```
需要添加 `useEditorStore`。

**位置 B：本地 state（约第 21 行）**
```typescript
const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
```
这个本地 state 需要**删除**（用 store 替代）。

**位置 C：useAssetStore 解构（约第 25-34 行）**
需要添加 `selectAsset`。

**位置 D：AssetCard 的 `onSelect` 回调（约第 414-415 行）**
```typescript
onSelect={() => setSelectedAssetId(asset.id)}
```
需要改为调用 `selectAsset`。

---

### Step 2：执行修改

**2a. 在 import 区域添加 `useEditorStore`：**

在 `ProjectPanel.tsx` 的 import 列表中，添加（在 `useSceneStore` 那行之后）：

```typescript
import { useEditorStore } from '../../stores/editorStore.js';
```

**2b. 在 `useAssetStore` 解构中添加 `selectAsset`：**

找到（约第 25-34 行）：
```typescript
  const {
    assets,
    isLoading,
    uploadProgress,
    loadAssets,
    uploadAsset,
    deleteAsset,
    updateAsset,
    getAssetUrl,
  } = useAssetStore();
```

改为：
```typescript
  const {
    assets,
    isLoading,
    uploadProgress,
    selectedAssetId,         // ← 新增：从 store 读取
    loadAssets,
    uploadAsset,
    deleteAsset,
    updateAsset,
    getAssetUrl,
    selectAsset,             // ← 新增
  } = useAssetStore();
```

**2c. 添加 `clearSelection` 读取（在已有 hooks 之后）：**

```typescript
  const clearSelection = useEditorStore((state) => state.clearSelection);
```

**2d. 删除本地 `selectedAssetId` state 声明：**

找到并删除这一行（约第 21 行）：
```typescript
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
```

**2e. 修改 AssetCard 的 `onSelect` 回调：**

找到 `assets.map` 中（或 `displayAssets.map` 中，如果 Phase 1 已完成）：

将：
```typescript
                          onSelect={() => setSelectedAssetId(asset.id)}
```

改为：
```typescript
                          onSelect={() => {
                            selectAsset(asset.id);
                            clearSelection();  // 清除场景对象选中，让 Inspector 进入资产模式
                          }}
```

---

### Step 3：检查是否有遗漏的 `setSelectedAssetId` 引用

```bash
grep -n "setSelectedAssetId" packages/client/src/components/panels/ProjectPanel.tsx
```

预期：输出为空（不应有任何剩余引用）。

如果有输出，找到那一行并相应地修改为 `selectAsset(...)` 或 `selectAsset(null)`。

---

### Step 4：运行 TypeScript 检查

```bash
pnpm --filter client exec tsc --noEmit --skipLibCheck 2>&1 | head -20
```

预期：无与 ProjectPanel 相关的新错误。

常见问题：
- `useState` 不再被使用 → 从 import 中删除（如果其他地方还用到 `useState`，保留）
- 检查 `useState` import 是否在 ProjectPanel.tsx 的其他地方用到

---

### Step 5：手动验证（重要）

此步骤没有自动测试，需要在浏览器中验证：

1. 启动 `pnpm dev:all`
2. 进入项目，导航到 Models 面板
3. 单击一个 GLB 资产（如果 Phase 1 已完成会有 FBX 导入的资产；或上传一个测试 GLB）
4. 观察 Inspector 面板是否开始响应（Phase 2.4 完成后才会显示内容，此时先确认控制台无报错）
5. 在 3D 视口中点击一个场景对象（如 Cube）
6. 观察 Inspector 显示场景对象属性，且资产选中被清除

---

### Step 6：提交

```bash
git add packages/client/src/components/panels/ProjectPanel.tsx
git commit -m "feat(fbx): wire ProjectPanel asset click to assetStore selection"
```

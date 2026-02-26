# 任务 2.4：InspectorPanel 集成资产模式

**Files:**
- Modify: `packages/client/src/components/panels/InspectorPanel.tsx`

**依赖：** 任务 2.1（assetStore.selectedAssetId）、任务 2.3（ModelImportProp 组件）

**背景：** 当前 `InspectorPanel.tsx` 第 18-33 行：当 `activeId` 为 null 时直接显示「No object selected」。需要改为：先检查 `assetStore.selectedAssetId`，如果有值则显示资产检视模式（包含 `ModelImportProp`）；否则才显示「No object selected」。

**优先级显示逻辑（最终）：**
1. `editorStore.activeId` 有值 → 场景对象属性（现有逻辑，不变）
2. `editorStore.activeId` 为 null + `assetStore.selectedAssetId` 有值 → 资产检视模式
3. 两者都为 null → 「No object selected」

---

### Step 1：查看当前 InspectorPanel 的结构

打开 `packages/client/src/components/panels/InspectorPanel.tsx`，关键位置：

**位置 A（第 1-9 行）：** imports
```typescript
import React from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useSceneStore } from '../../stores/sceneStore';
// ... 其余 inspector prop imports
```

**位置 B（第 12-14 行）：** hooks
```typescript
const activeId = useEditorStore((state) => state.activeId);
const selectedIds = useEditorStore((state) => state.selectedIds);
const objects = useSceneStore((state) => state.scene.objects);
```

**位置 C（第 18-34 行）：** null 检查 — 这里需要修改
```typescript
if (!activeId) {
  return (
    <div ...>
      ...
      <div ...>No object selected</div>
    </div>
  );
}
```

---

### Step 2：执行修改

**2a. 在 imports 区域新增两行：**

在 `InspectorPanel.tsx` 第 9 行（`LightProp` import 之后）添加：
```typescript
import { useAssetStore } from '../../stores/assetStore';
import { ModelImportProp } from '../inspector/ModelImportProp';
```

**2b. 在 hooks 区域新增两行（第 16 行之后，`updateObject` 之后）：**

```typescript
  const selectedAssetId = useAssetStore((state) => state.selectedAssetId);
  const assets = useAssetStore((state) => state.assets);
```

**2c. 替换 `if (!activeId)` 整个 block（第 18-34 行）：**

将现有代码：
```typescript
  if (!activeId) {
    return (
      <div className="flex flex-col h-full w-full bg-panel-dark flex-shrink-0">
        {/* Panel Header */}
        <div className="panel-title">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-xs">info</span>
            <span>属性检视器 (Inspector)</span>
          </div>
          <button className="material-symbols-outlined text-xs hover:text-white transition-colors">settings</button>
        </div>
        <div className="flex flex-col flex-1 items-center justify-center text-slate-500 text-sm italic">
          No object selected
        </div>
      </div>
    );
  }
```

替换为：
```typescript
  if (!activeId) {
    // 查找选中的资产
    const selectedAsset = selectedAssetId
      ? assets.find((a) => a.id === selectedAssetId)
      : undefined;

    return (
      <div className="flex flex-col h-full w-full bg-panel-dark flex-shrink-0">
        {/* Panel Header */}
        <div className="panel-title">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-xs">info</span>
            <span>属性检视器 (Inspector)</span>
          </div>
          <button className="material-symbols-outlined text-xs hover:text-white transition-colors">settings</button>
        </div>

        {selectedAsset ? (
          /* 资产检视模式 */
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* 资产头部 */}
            <div className="p-4 border-b border-border-dark bg-header-dark/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center border border-white/5">
                  <span className="material-symbols-outlined text-primary text-base">deployed_code</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">{selectedAsset.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {selectedAsset.type} · {(selectedAsset.file_size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            </div>

            {/* 资产属性内容 */}
            <div className="p-4">
              <ModelImportProp
                asset={selectedAsset}
                projectId={selectedAsset.project_id}
                onReimportComplete={() => {
                  // TODO Task 2.5 完成后此处无需改动
                  // ModelImportProp 内部的 onReimportComplete 会刷新资产列表
                }}
              />
            </div>
          </div>
        ) : (
          /* 无选中状态 */
          <div className="flex flex-col flex-1 items-center justify-center text-slate-500 text-sm italic">
            No object selected
          </div>
        )}
      </div>
    );
  }
```

---

### Step 3：运行 TypeScript 检查

```bash
pnpm --filter client exec tsc --noEmit --skipLibCheck 2>&1 | head -30
```

预期：无新增类型错误。

常见问题：
- `ModelImportProp` 找不到 → 确认任务 2.3 已完成并创建了 `ModelImportProp.tsx`
- `assets` 类型不匹配 → 确认 `useAssetStore` 中 `assets` 字段类型为 `Asset[]`

---

### Step 4：手动验证

1. 启动 `pnpm dev:all`
2. 进入项目，打开 Models 面板
3. 点击一个**通过 FBX 导入的 GLB 资产**（`metadata.sourceFbxAssetId` 不为空）
4. 检查右侧 Inspector 面板：
   - 应显示资产文件名和大小
   - 应显示「模型导入设置」区域（来自 `ModelImportProp`）
   - 应显示源 FBX ID、缩放比例等参数
   - 「重新导入」按钮应为禁用状态（未修改参数时）
5. 修改一个参数（如缩放比例）
   - 应出现「已修改」角标
   - 「重新导入」按钮应变为可用
6. 在 3D 视口中点击一个场景对象
   - Inspector 应切换回场景对象属性
   - 资产选中应被清除

---

### Step 5：提交

```bash
git add packages/client/src/components/panels/InspectorPanel.tsx
git commit -m "feat(fbx): integrate asset inspection mode in InspectorPanel"
```

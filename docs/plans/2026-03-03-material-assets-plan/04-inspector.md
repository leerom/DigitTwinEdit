# Task 5–6: MaterialAssetProp + InspectorPanel 路由扩展

---

## Task 5: 新建 MaterialAssetProp 组件

**Files:**
- Create: `packages/client/src/components/inspector/MaterialAssetProp.tsx`
- Create: `packages/client/src/components/inspector/MaterialAssetProp.test.tsx`

### Step 1: 了解依赖

- `MaterialFieldRenderer` 位于 `packages/client/src/components/inspector/MaterialFieldRenderer.tsx`，接受 `{ field, value, onChange, projectId }`
- `getFieldsForType` 位于 `packages/client/src/features/materials/materialSchema.ts`
- `useMaterialStore` 来自 Task 3

### Step 2: 写失败测试

新建 `packages/client/src/components/inspector/MaterialAssetProp.test.tsx`：

```typescript
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MaterialAssetProp } from './MaterialAssetProp';

vi.mock('@/stores/materialStore', () => ({
  useMaterialStore: (selector: any) =>
    selector({
      saveError: null,
      clearSaveError: vi.fn(),
      updateMaterialSpec: vi.fn().mockResolvedValue(undefined),
    }),
}));

vi.mock('@/api/assets', () => ({
  materialsApi: {
    getMaterial: vi.fn().mockResolvedValue({
      id: '1',
      name: '测试材质',
      type: 'MeshStandardMaterial',
      properties: { color: '#ff0000', roughness: 0.5 },
    }),
  },
}));

describe('MaterialAssetProp', () => {
  it('加载后显示材质类型选择器', async () => {
    render(<MaterialAssetProp assetId={1} projectId={1} />);
    const select = await screen.findByRole('combobox');
    expect(select).toHaveValue('MeshStandardMaterial');
  });

  it('saveError 非空时显示错误横幅', async () => {
    vi.mock('@/stores/materialStore', () => ({
      useMaterialStore: (selector: any) =>
        selector({
          saveError: '保存失败，请重试',
          clearSaveError: vi.fn(),
          updateMaterialSpec: vi.fn(),
        }),
    }));
    render(<MaterialAssetProp assetId={1} projectId={1} />);
    expect(await screen.findByText('保存失败，请重试')).toBeDefined();
  });
});
```

运行：`pnpm --filter client test -- --run src/components/inspector/MaterialAssetProp.test.tsx`

预期：`Cannot find module './MaterialAssetProp'`。

### Step 3: 实现 MaterialAssetProp.tsx

新建 `packages/client/src/components/inspector/MaterialAssetProp.tsx`：

```typescript
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMaterialStore } from '@/stores/materialStore';
import { materialsApi } from '@/api/assets';
import type { MaterialSpec, MaterialType } from '@/types';
import { getFieldsForType, type FieldGroup } from '@/features/materials/materialSchema';
import { MaterialFieldRenderer } from './MaterialFieldRenderer';

const MATERIAL_TYPES: readonly MaterialType[] = [
  'MeshStandardMaterial',
  'MeshPhysicalMaterial',
  'MeshPhongMaterial',
  'MeshLambertMaterial',
  'MeshBasicMaterial',
] as const;

const GROUP_LABELS: Record<FieldGroup, string> = {
  base: '基础 (Base)',
  pbr: 'PBR',
  physical: '物理高级 (Physical)',
  maps: '贴图 (Maps)',
  wireframe: '线框 (Wireframe)',
};

const DEFAULT_COLLAPSED: FieldGroup[] = ['physical', 'maps', 'wireframe'];
const DEBOUNCE_MS = 500;

interface Props {
  assetId: number;
  projectId: number;
}

export const MaterialAssetProp: React.FC<Props> = ({ assetId, projectId }) => {
  const saveError = useMaterialStore((s) => s.saveError);
  const clearSaveError = useMaterialStore((s) => s.clearSaveError);
  const updateMaterialSpec = useMaterialStore((s) => s.updateMaterialSpec);

  const [localSpec, setLocalSpec] = useState<MaterialSpec>({
    type: 'MeshStandardMaterial',
    props: {},
  });
  const [isLoadingSpec, setIsLoadingSpec] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of DEFAULT_COLLAPSED) init[g] = true;
    return init;
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载材质数据
  useEffect(() => {
    setIsLoadingSpec(true);
    materialsApi.getMaterial(assetId).then((data) => {
      setLocalSpec({ type: data.type as MaterialType, props: data.properties });
      setIsLoadingSpec(false);
    }).catch(() => setIsLoadingSpec(false));
  }, [assetId]);

  const fieldsByGroup = useMemo(() => {
    const all = getFieldsForType(localSpec.type as MaterialType);
    const map = new Map<FieldGroup, typeof all>();
    for (const f of all) {
      if (!map.has(f.group)) map.set(f.group, []);
      map.get(f.group)!.push(f);
    }
    return map;
  }, [localSpec.type]);

  const scheduleUpdate = useCallback((spec: MaterialSpec) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      updateMaterialSpec(assetId, spec);
    }, DEBOUNCE_MS);
  }, [assetId, updateMaterialSpec]);

  const handleTypeChange = (nextType: MaterialType) => {
    const newSpec = { type: nextType, props: localSpec.props };
    setLocalSpec(newSpec);
    scheduleUpdate(newSpec);
  };

  const handlePropChange = (key: string, value: unknown) => {
    const newSpec = { ...localSpec, props: { ...localSpec.props, [key]: value } };
    setLocalSpec(newSpec);
    scheduleUpdate(newSpec);
  };

  const toggleGroup = (group: FieldGroup) =>
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));

  if (isLoadingSpec) {
    return <div className="text-xs text-slate-500 p-3">加载中...</div>;
  }

  const showBasicColorOnly =
    localSpec.type === 'MeshPhongMaterial' ||
    localSpec.type === 'MeshLambertMaterial' ||
    localSpec.type === 'MeshBasicMaterial';

  return (
    <div className="bg-[#0c0e14] border border-[#2d333f] p-3 rounded-sm space-y-3">
      {/* 保存错误横幅 */}
      {saveError && (
        <div className="flex items-center gap-1 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
          <span className="material-symbols-outlined text-sm">error</span>
          <span className="flex-1">{saveError}</span>
          <button onClick={clearSaveError} className="hover:text-red-200">×</button>
        </div>
      )}

      {/* 类型选择 */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-[#999999] font-medium">类型</label>
        <select
          className="bg-[#0c0e14] text-[12px] text-white border border-[#2d333f] rounded px-2 py-1"
          value={localSpec.type}
          onChange={(e) => handleTypeChange(e.target.value as MaterialType)}
        >
          {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Standard / Physical 分组字段 */}
      {!showBasicColorOnly && (
        <>
          {[...fieldsByGroup.entries()].map(([group, fields]) => (
            <div key={group}>
              <button
                className="flex items-center w-full text-left gap-1 mb-1.5"
                onClick={() => toggleGroup(group)}
              >
                <span className="text-[9px] text-slate-500">
                  {collapsed[group] ? '▶' : '▼'}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {GROUP_LABELS[group] ?? group}
                </span>
              </button>
              {!collapsed[group] && (
                <div className="space-y-2 pl-2">
                  {fields.map((field) => (
                    <MaterialFieldRenderer
                      key={field.key}
                      field={field}
                      value={localSpec.props[field.key] ?? undefined}
                      onChange={handlePropChange}
                      projectId={projectId}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Phong / Lambert / Basic 简单颜色 */}
      {showBasicColorOnly && (
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-[#999999] font-medium">颜色</label>
          <input
            type="color"
            value={typeof localSpec.props.color === 'string' ? localSpec.props.color : '#cccccc'}
            onChange={(e) => handlePropChange('color', e.target.value)}
            className="w-8 h-6 bg-transparent border-0 p-0 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
```

### Step 4: 运行测试验证通过

```bash
pnpm --filter client test -- --run src/components/inspector/MaterialAssetProp.test.tsx
```

预期：全部 PASS。

### Step 5: Commit

```bash
git add packages/client/src/components/inspector/MaterialAssetProp.tsx \
        packages/client/src/components/inspector/MaterialAssetProp.test.tsx
git commit -m "feat(inspector): 新建 MaterialAssetProp 组件，用于编辑材质资产属性"
```

---

## Task 6: InspectorPanel 路由扩展

**Files:**
- Modify: `packages/client/src/components/panels/InspectorPanel.tsx`

### Step 1: 了解现有结构

`InspectorPanel.tsx` 在 `!activeId` 且 `selectedAsset` 存在时进入资产检视模式（约第 62 行）。
目前该分支只渲染 `ModelImportProp` + `TextureImportProp`，材质类型资产被忽略。

### Step 2: 修改 InspectorPanel.tsx

在文件顶部 import 区新增：
```typescript
import { useMaterialStore } from '../../stores/materialStore';
import { MaterialAssetProp } from '../inspector/MaterialAssetProp';
```

在组件体内（`selectedAsset` 读取之后）新增：
```typescript
const selectedMaterialId = useMaterialStore((s) => s.selectedMaterialId);
const materials = useMaterialStore((s) => s.materials);
const selectedMaterial = selectedMaterialId
  ? materials.find((m) => m.id === selectedMaterialId)
  : undefined;
```

在 `if (!activeId)` 分支内，**最前面**（在 `selectedAsset` 判断之前）插入材质资产分支：

```typescript
// 材质资产检视模式（优先于 model/texture）
if (selectedMaterial) {
  return (
    <div className="flex flex-col h-full w-full bg-panel-dark flex-shrink-0">
      <div className="panel-title">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-xs">info</span>
          <span>属性检视器 (Inspector)</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* 资产头部 */}
        <div className="p-4 border-b border-border-dark bg-header-dark/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center border border-white/5 shrink-0">
              <span className="material-symbols-outlined text-primary text-base">texture</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{selectedMaterial.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {(selectedMaterial.metadata as any)?.materialType ?? 'material'} ·{' '}
                {(selectedMaterial.file_size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
        </div>
        {/* 属性编辑 */}
        <div className="p-4">
          <MaterialAssetProp
            assetId={selectedMaterial.id}
            projectId={selectedMaterial.project_id}
          />
        </div>
      </div>
    </div>
  );
}
```

### Step 3: 手动验证（无自动测试）

启动开发服务器：`pnpm dev`

1. 打开 Editor，切换到 ProjectPanel 的 Materials 文件夹
2. 点击任意材质资产
3. 确认 Inspector 显示材质属性编辑 UI（类型选择器 + 分组字段）

### Step 4: Commit

```bash
git add packages/client/src/components/panels/InspectorPanel.tsx
git commit -m "feat(inspector): InspectorPanel 增加材质资产检视模式"
```

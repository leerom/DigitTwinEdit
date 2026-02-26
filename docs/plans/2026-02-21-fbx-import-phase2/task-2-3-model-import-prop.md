# 任务 2.3：ModelImportProp 组件

**Files:**
- Create: `packages/client/src/components/inspector/ModelImportProp.tsx`
- Create: `packages/client/src/components/inspector/__tests__/ModelImportProp.test.tsx`

**依赖：** 任务 2.1（assetStore），Phase 1 的 `types.ts`（FBXImportSettings）

**背景：** 当用户在 Models 面板选中一个通过 FBX 导入的 GLB 资产时，Inspector 显示其导入配置。用户可修改设置，点击「重新导入」触发重新转换（由任务 2.5 实现）。本任务只完成 **UI + 状态管理**部分，「重新导入」按钮暂时打印 console.log，等 Task 2.5 完成后再接入。

**GLB 资产元数据结构（Phase 1 写入的）：**
```json
{
  "format": "glb",
  "sourceFbxAssetId": 42,
  "importSettings": {
    "scale": 1.0,
    "convertUnits": true,
    "normals": "import",
    "normalsMode": "areaAndAngle",
    "saveFormat": "glb",
    "embedTextures": true
  }
}
```

---

### Step 1：写失败测试

创建 `packages/client/src/components/inspector/__tests__/ModelImportProp.test.tsx`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelImportProp } from '../ModelImportProp';
import type { Asset } from '@digittwinedit/shared';
import { DEFAULT_FBX_IMPORT_SETTINGS } from '../../../features/fbx/types';

// GLB 资产（通过 FBX 导入，有 sourceFbxAssetId）
const mockGlbAsset: Asset = {
  id: 10,
  project_id: 1,
  name: 'building.glb',
  type: 'model',
  file_path: '/uploads/building.glb',
  file_size: 2048,
  mime_type: 'model/gltf-binary',
  created_at: '',
  updated_at: '',
  metadata: {
    format: 'glb',
    sourceFbxAssetId: 42,
    importSettings: {
      ...DEFAULT_FBX_IMPORT_SETTINGS,
      scale: 2.0,
    },
  },
};

// GLB 资产（直接上传，无 sourceFbxAssetId）
const mockDirectGlbAsset: Asset = {
  id: 11,
  project_id: 1,
  name: 'direct.glb',
  type: 'model',
  file_path: '/uploads/direct.glb',
  file_size: 1024,
  mime_type: 'model/gltf-binary',
  created_at: '',
  updated_at: '',
  metadata: {},
};

describe('ModelImportProp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders import settings section title', () => {
    render(<ModelImportProp asset={mockGlbAsset} projectId={1} onReimportComplete={vi.fn()} />);
    expect(screen.getByText('模型导入设置')).toBeInTheDocument();
  });

  it('displays the original FBX source file ID', () => {
    render(<ModelImportProp asset={mockGlbAsset} projectId={1} onReimportComplete={vi.fn()} />);
    // 源文件 ID 42 应该显示在某处
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('shows saved scale value from metadata', () => {
    render(<ModelImportProp asset={mockGlbAsset} projectId={1} onReimportComplete={vi.fn()} />);
    // scale 应该是 2.0（来自 importSettings）
    const scaleInput = screen.getByDisplayValue('2');
    expect(scaleInput).toBeInTheDocument();
  });

  it('shows "重新导入" button', () => {
    render(<ModelImportProp asset={mockGlbAsset} projectId={1} onReimportComplete={vi.fn()} />);
    expect(screen.getByRole('button', { name: '重新导入' })).toBeInTheDocument();
  });

  it('"重新导入" button is disabled when no changes', () => {
    render(<ModelImportProp asset={mockGlbAsset} projectId={1} onReimportComplete={vi.fn()} />);
    expect(screen.getByRole('button', { name: '重新导入' })).toBeDisabled();
  });

  it('"重新导入" button becomes enabled after settings change', () => {
    render(<ModelImportProp asset={mockGlbAsset} projectId={1} onReimportComplete={vi.fn()} />);
    const scaleInput = screen.getByDisplayValue('2');
    fireEvent.change(scaleInput, { target: { value: '3' } });
    expect(screen.getByRole('button', { name: '重新导入' })).not.toBeDisabled();
  });

  it('returns null when asset has no sourceFbxAssetId', () => {
    const { container } = render(
      <ModelImportProp asset={mockDirectGlbAsset} projectId={1} onReimportComplete={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
```

### Step 2：运行测试确认失败

```bash
pnpm --filter client test --run packages/client/src/components/inspector/__tests__/ModelImportProp.test.tsx
```

预期：FAIL，报错 `Cannot find module '../ModelImportProp'`

---

### Step 3：实现 ModelImportProp 组件

创建 `packages/client/src/components/inspector/ModelImportProp.tsx`：

```typescript
import React, { useState, useMemo } from 'react';
import type { Asset } from '@digittwinedit/shared';
import type { FBXImportSettings } from '../../features/fbx/types';
import { DEFAULT_FBX_IMPORT_SETTINGS } from '../../features/fbx/types';

interface ModelImportPropProps {
  asset: Asset;
  projectId: number;
  /**
   * 重新导入完成后的回调（由 Task 2.5 接入，现在先预留接口）
   * 将由父组件（InspectorPanel）传入，用于刷新资产列表
   */
  onReimportComplete: () => void;
}

/**
 * Inspector 中的「模型导入设置」区域
 *
 * 仅当资产元数据中有 sourceFbxAssetId 时才渲染（即通过 FBX 导入的 GLB）。
 */
export const ModelImportProp: React.FC<ModelImportPropProps> = ({
  asset,
  projectId,
  onReimportComplete,
}) => {
  const metadata = asset.metadata as Record<string, unknown> | undefined;
  const sourceFbxAssetId = metadata?.sourceFbxAssetId as number | undefined;

  // 如果不是 FBX 导入的模型，不渲染
  if (!sourceFbxAssetId) return null;

  // 从元数据中读取保存的导入设置（可能是旧版未保存的资产，用默认值兜底）
  const savedSettings = (metadata?.importSettings as FBXImportSettings | undefined)
    ?? DEFAULT_FBX_IMPORT_SETTINGS;

  return (
    <ModelImportPropContent
      asset={asset}
      projectId={projectId}
      sourceFbxAssetId={sourceFbxAssetId}
      savedSettings={savedSettings}
      onReimportComplete={onReimportComplete}
    />
  );
};

// 内部组件，确保 hooks 在条件判断之后调用（满足 Rules of Hooks）
interface ContentProps {
  asset: Asset;
  projectId: number;
  sourceFbxAssetId: number;
  savedSettings: FBXImportSettings;
  onReimportComplete: () => void;
}

const ModelImportPropContent: React.FC<ContentProps> = ({
  asset,
  sourceFbxAssetId,
  savedSettings,
  onReimportComplete,
}) => {
  const [localSettings, setLocalSettings] = useState<FBXImportSettings>(savedSettings);
  const [isReimporting, setIsReimporting] = useState(false);

  // 检测是否有未保存的修改（与 savedSettings 对比）
  const isDirty = useMemo(
    () => JSON.stringify(localSettings) !== JSON.stringify(savedSettings),
    [localSettings, savedSettings]
  );

  const set = <K extends keyof FBXImportSettings>(key: K, value: FBXImportSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleReimport = async () => {
    // TODO Task 2.5：接入 fbxImporter.reimport()
    // 暂时打印日志，等 Task 2.5 完成后替换
    console.log('[ModelImportProp] 重新导入:', { localSettings, sourceFbxAssetId });
    onReimportComplete();
  };

  return (
    <div className="border-t border-border-dark pt-4 mt-2">
      {/* 区域标题 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-xs text-primary">deployed_code</span>
        <h3 className="text-[11px] font-bold text-slate-300">模型导入设置</h3>
        {isDirty && (
          <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
            已修改
          </span>
        )}
      </div>

      <div className="space-y-3 text-xs">
        {/* 来源文件 */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500">来源 FBX</span>
          <span className="text-slate-400 font-mono text-[10px]">
            ID: {sourceFbxAssetId}
          </span>
        </div>

        <div className="border-t border-slate-800 pt-2">
          {/* 场景 */}
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            场景
          </p>

          <div className="space-y-1.5 pl-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-400">缩放比例</label>
              <input
                type="number"
                value={localSettings.scale}
                min={0.001}
                max={10000}
                step={0.1}
                onChange={(e) => set('scale', parseFloat(e.target.value) || 1)}
                className="w-20 px-1.5 py-0.5 text-xs bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-slate-400">转换单位</label>
              <input
                type="checkbox"
                checked={localSettings.convertUnits}
                onChange={(e) => set('convertUnits', e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-2">
          {/* 几何 */}
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            几何
          </p>

          <div className="space-y-1.5 pl-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-400">法线</label>
              <select
                value={localSettings.normals}
                onChange={(e) =>
                  set('normals', e.target.value as FBXImportSettings['normals'])
                }
                className="w-28 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="import">导入法线</option>
                <option value="calculate">计算法线</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label
                className={
                  localSettings.normals !== 'calculate'
                    ? 'text-slate-600'
                    : 'text-slate-400'
                }
              >
                法线模式
              </label>
              <select
                value={localSettings.normalsMode}
                disabled={localSettings.normals !== 'calculate'}
                onChange={(e) =>
                  set('normalsMode', e.target.value as FBXImportSettings['normalsMode'])
                }
                className="w-28 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500 disabled:opacity-40"
              >
                <option value="unweighted">不加权</option>
                <option value="areaWeighted">面积加权</option>
                <option value="angleWeighted">顶角加权</option>
                <option value="areaAndAngle">面积和顶角</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-2">
          {/* 保存 */}
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            保存
          </p>

          <div className="space-y-1.5 pl-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-400">格式</label>
              <select
                value={localSettings.saveFormat}
                onChange={(e) =>
                  set('saveFormat', e.target.value as FBXImportSettings['saveFormat'])
                }
                className="w-28 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="glb">.glb（默认）</option>
                <option value="gltf">.gltf</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-slate-400">嵌入纹理</label>
              <input
                type="checkbox"
                checked={localSettings.embedTextures}
                onChange={(e) => set('embedTextures', e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 重新导入按钮 */}
        <div className="pt-2">
          <button
            onClick={handleReimport}
            disabled={!isDirty || isReimporting}
            className="w-full py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {isReimporting ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                <span>转换中...</span>
              </>
            ) : (
              '重新导入'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### Step 4：运行测试确认通过

```bash
pnpm --filter client test --run packages/client/src/components/inspector/__tests__/ModelImportProp.test.tsx
```

预期：7 个测试全部通过 (PASS)

**常见问题：**

问题 1：`getByDisplayValue('2')` 找不到元素
→ `scale` 是 number，`input[type=number]` 的 value 可能显示为 `'2'` 或 `'2.0'`。改用：
```typescript
const scaleInput = screen.getByRole('spinbutton');  // number input
expect((scaleInput as HTMLInputElement).value).toBe('2');
```

问题 2：Rules of Hooks 警告（`hooks called conditionally`）
→ 已通过拆分 `ModelImportPropContent` 内部组件解决。

---

### Step 5：运行全部测试

```bash
pnpm --filter client test --run
```

预期：全部通过。

---

### Step 6：提交

```bash
git add packages/client/src/components/inspector/ModelImportProp.tsx \
        packages/client/src/components/inspector/__tests__/ModelImportProp.test.tsx
git commit -m "feat(fbx): add ModelImportProp Inspector component for FBX import settings"
```

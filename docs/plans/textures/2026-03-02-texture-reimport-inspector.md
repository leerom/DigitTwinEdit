# 纹理导入参数检视与重新导入 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 ProjectPanel Textures 文件夹中点击贴图资产后，Inspector 显示该贴图的导入参数，用户可修改后重新导入（保持 assetId 不变）。

**Architecture:** 新建 `TextureImportProp` 组件（仿照 `ModelImportProp`），在 `TextureConverter` 中添加 `reimport()` 方法（仿照 `FBXImporter.reimport()`，使用 `replaceAssetFile` 保持 assetId），并更新 `InspectorPanel` 显示纹理缩略图和参数区域。

**Tech Stack:** React + TypeScript, Vitest + @testing-library/react, TextureConverter (Web Worker + Basis Encoder), assetsApi.replaceAssetFile

---

## Task 1: 添加 TextureConverter.reimport() 方法

**Files:**
- Modify: `packages/client/src/features/textures/TextureConverter.ts`

**Context:**
`FBXImporter.reimport()` 的流程是：下载源文件 → Worker 重新编码 → `assetsApi.replaceAssetFile()`（原地替换，保持 assetId）→ `assetsApi.updateAsset()`（更新 metadata）。本 Task 在 `TextureConverter` 中实现等价方法。

**Step 1: 在 TextureConverter.ts 的 imports 中添加 Asset 类型引用**

```typescript
import { assetsApi } from '../../api/assets';
import type { Asset } from '@digittwinedit/shared';
```

（`TextureConverter.ts` 第 1 行已有 `assetsApi` import，只需追加 Asset 类型导入）

**Step 2: 在 `TextureConverter` 类中添加 `reimport()` 方法（在 `convert()` 方法之后）**

```typescript
/**
 * 重新导入纹理：下载源 PNG → 重新编码 → 原地替换 KTX2 文件（保持 assetId 不变）
 *
 * @param ktx2Asset  需要重新导入的 KTX2 资产（asset.mime_type === 'image/ktx2'）
 * @param newSettings 新的转换参数
 * @param onProgress  进度回调
 * @returns 更新后的 Asset
 */
async reimport(
  ktx2Asset: Asset,
  newSettings: TextureConvertSettings,
  onProgress: (p: TextureConvertProgress) => void
): Promise<Asset> {
  const metadata = ktx2Asset.metadata as Record<string, unknown> | undefined;
  const sourceTextureAssetId = metadata?.sourceTextureAssetId as number | undefined;

  if (!sourceTextureAssetId) {
    throw new Error('该贴图没有关联的源文件，无法重新导入');
  }

  // Step 1: 下载源 PNG/JPG（需 session cookie）
  onProgress({ step: '下载源文件...', percent: 5 });
  const downloadUrl = assetsApi.getAssetDownloadUrl(sourceTextureAssetId);
  const resp = await fetch(downloadUrl, { credentials: 'include' });
  if (!resp.ok) {
    throw new Error(`源文件下载失败（HTTP ${resp.status}）`);
  }
  const blob = await resp.blob();
  if (blob.size === 0) {
    throw new Error('源文件为空，无法重新导入。请删除此贴图并重新导入。');
  }

  // Step 2: 读取图像尺寸
  onProgress({ step: '读取图像...', percent: 8 });
  const imageBitmap = await createImageBitmap(blob);
  const originalWidth = imageBitmap.width;
  const originalHeight = imageBitmap.height;

  // Step 3: Worker 重新编码（进度 8%→80%）
  const { ktx2Buffer, finalWidth, finalHeight } = await this._encodeInWorker(
    imageBitmap,
    newSettings,
    originalWidth,
    originalHeight,
    (workerPercent) => {
      onProgress({
        step: workerPercent < 50 ? '处理图像...' : 'KTX2 编码中...',
        percent: Math.round(8 + workerPercent * 0.72),
      });
    }
  );

  // Step 4: 原地替换 KTX2 文件（保持 assetId 不变）
  onProgress({ step: '上传新 KTX2...', percent: 82 });
  const originalName = (metadata?.originalName as string | undefined) ?? ktx2Asset.name;
  const baseName = originalName.replace(/\.(jpg|jpeg|png)$/i, '');
  const ktx2Name = ktx2Asset.name.endsWith('.ktx2') ? ktx2Asset.name : `${baseName}.ktx2`;
  const newKtx2File = new File([ktx2Buffer], ktx2Name, { type: 'image/ktx2' });

  await assetsApi.replaceAssetFile(
    ktx2Asset.id,
    newKtx2File,
    (e: any) => {
      const pct = e.progress != null ? e.progress : e.loaded / (e.total || 1);
      onProgress({
        step: '上传新 KTX2...',
        percent: Math.round(82 + pct * 12),
      });
    }
  );

  // Step 5: 更新 metadata（保留现有字段，仅更新 convertSettings + dimensions）
  onProgress({ step: '保存配置...', percent: 96 });
  const updatedAsset = await assetsApi.updateAsset(ktx2Asset.id, {
    metadata: {
      ...(metadata as Record<string, unknown>),
      convertSettings: newSettings,
      ktx2Dimensions: { width: finalWidth, height: finalHeight },
    },
  });

  onProgress({ step: '重新导入完成', percent: 100 });
  return updatedAsset;
}
```

**Step 3: 验证 TypeScript 编译无报错**

```bash
pnpm --filter client exec tsc --noEmit
```

---

## Task 2: 新建 TextureImportProp 组件（含测试）

**Files:**
- Create: `packages/client/src/components/inspector/TextureImportProp.tsx`
- Create: `packages/client/src/components/inspector/TextureImportProp.test.tsx`

### Step 1: 先写测试文件

新建 `packages/client/src/components/inspector/TextureImportProp.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TextureImportProp } from './TextureImportProp';
import type { Asset } from '@digittwinedit/shared';

// Mock useAssetStore
vi.mock('@/stores/assetStore', () => ({
  useAssetStore: (selector: any) => selector({
    assets: [
      {
        id: 4,
        name: 'normal_src.png',
        type: 'texture',
        project_id: 10,
        updated_at: '2026-01-01',
        file_path: '',
        file_size: 0,
        mime_type: 'image/png',
        created_at: '2026-01-01',
        metadata: { isSourceTexture: true },
      },
    ],
    loadAssets: vi.fn(),
  }),
}));

// Mock textureConverter
vi.mock('@/features/textures/TextureConverter', () => ({
  textureConverter: {
    reimport: vi.fn().mockResolvedValue({
      id: 5,
      metadata: {
        sourceTextureAssetId: 4,
        convertSettings: { compressionMode: 'UASTC', quality: 200, colorSpace: 'sRGB', generateMipmaps: true, potResize: false, potMode: 'nearest', hasAlpha: false },
      },
    }),
  },
}));

const makeKtx2Asset = (overrides?: Partial<Asset>): Asset => ({
  id: 5,
  name: 'normal.ktx2',
  type: 'texture',
  project_id: 10,
  updated_at: '2026-01-01',
  file_path: '',
  file_size: 1024,
  mime_type: 'image/ktx2',
  created_at: '2026-01-01',
  metadata: {
    sourceTextureAssetId: 4,
    convertSettings: {
      compressionMode: 'ETC1S',
      quality: 200,
      colorSpace: 'sRGB',
      generateMipmaps: true,
      potResize: false,
      potMode: 'nearest',
      hasAlpha: false,
    },
    originalName: 'normal_src.png',
  },
  ...overrides,
});

describe('TextureImportProp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('普通 PNG 资产不渲染（null）', () => {
    const asset: Asset = {
      id: 1, name: 'brick.png', type: 'texture', project_id: 10,
      updated_at: '2026-01-01', file_path: '', file_size: 0,
      mime_type: 'image/png', created_at: '2026-01-01',
    };
    const { container } = render(
      <TextureImportProp asset={asset} projectId={10} onReimportComplete={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('无 sourceTextureAssetId 的 KTX2 也不渲染', () => {
    const asset = makeKtx2Asset({ metadata: { convertSettings: {} } });
    const { container } = render(
      <TextureImportProp asset={asset} projectId={10} onReimportComplete={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('有效 KTX2 资产渲染标题和参数', () => {
    render(
      <TextureImportProp asset={makeKtx2Asset()} projectId={10} onReimportComplete={vi.fn()} />
    );
    expect(screen.getByText('纹理导入设置')).toBeTruthy();
    expect(screen.getByText('ETC1S')).toBeTruthy(); // 压缩模式
  });

  it('初始状态：按钮禁用（无修改）', () => {
    render(
      <TextureImportProp asset={makeKtx2Asset()} projectId={10} onReimportComplete={vi.fn()} />
    );
    const btn = screen.getByRole('button', { name: /重新导入/ });
    expect(btn).toBeDisabled();
  });

  it('修改参数后 isDirty badge 出现，按钮可用', () => {
    render(
      <TextureImportProp asset={makeKtx2Asset()} projectId={10} onReimportComplete={vi.fn()} />
    );
    // 切换压缩模式（ETC1S → UASTC）
    const select = screen.getByDisplayValue('ETC1S');
    fireEvent.change(select, { target: { value: 'UASTC' } });
    expect(screen.getByText('已修改')).toBeTruthy();
    expect(screen.getByRole('button', { name: /重新导入/ })).not.toBeDisabled();
  });

  it('源文件不存在时显示警告且按钮禁用', () => {
    // 源文件 id=4 不在 assets 列表中（mock 仅有 id=4，所以此测试需要 override mock）
    // 用 id=99 的源文件（不存在于 assets 列表）
    const asset = makeKtx2Asset({ metadata: { sourceTextureAssetId: 99, convertSettings: { compressionMode: 'ETC1S', quality: 200, colorSpace: 'sRGB', generateMipmaps: true, potResize: false, potMode: 'nearest', hasAlpha: false } } });
    render(
      <TextureImportProp asset={asset} projectId={10} onReimportComplete={vi.fn()} />
    );
    expect(screen.getByText(/源文件已删除/)).toBeTruthy();
    // 按钮在参数未修改时已禁用，进一步修改后仍应被源不存在禁用
    const select = screen.getByDisplayValue('ETC1S');
    fireEvent.change(select, { target: { value: 'UASTC' } });
    expect(screen.getByRole('button', { name: /重新导入/ })).toBeDisabled();
  });

  it('点击重新导入调用 textureConverter.reimport 并执行回调', async () => {
    const { textureConverter } = await import('@/features/textures/TextureConverter');
    const onComplete = vi.fn();
    const asset = makeKtx2Asset();

    render(
      <TextureImportProp asset={asset} projectId={10} onReimportComplete={onComplete} />
    );

    // 触发 isDirty
    const select = screen.getByDisplayValue('ETC1S');
    fireEvent.change(select, { target: { value: 'UASTC' } });

    fireEvent.click(screen.getByRole('button', { name: /重新导入/ }));

    await waitFor(() => {
      expect(textureConverter.reimport).toHaveBeenCalledWith(
        asset,
        expect.objectContaining({ compressionMode: 'UASTC' }),
        expect.any(Function)
      );
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
```

### Step 2: 运行测试确认失败

```bash
pnpm --filter client test -- --run src/components/inspector/TextureImportProp.test.tsx
```

预期：**FAIL**（TextureImportProp 不存在）

### Step 3: 新建 TextureImportProp.tsx

新建 `packages/client/src/components/inspector/TextureImportProp.tsx`：

```tsx
import React, { useState, useMemo } from 'react';
import type { Asset } from '@digittwinedit/shared';
import type { TextureConvertSettings } from '../../features/textures/types';
import { DEFAULT_TEXTURE_CONVERT_SETTINGS } from '../../features/textures/types';
import { textureConverter } from '../../features/textures/TextureConverter';
import { useAssetStore } from '../../stores/assetStore';

interface TextureImportPropProps {
  asset: Asset;
  projectId: number;
  onReimportComplete: () => void;
}

/**
 * Inspector 中的「纹理导入设置」区域
 *
 * 仅当资产为 KTX2（mime_type === 'image/ktx2'）且 metadata.sourceTextureAssetId 存在时渲染。
 */
export const TextureImportProp: React.FC<TextureImportPropProps> = ({
  asset,
  projectId,
  onReimportComplete,
}) => {
  const metadata = asset.metadata as Record<string, unknown> | undefined;
  const sourceTextureAssetId = metadata?.sourceTextureAssetId as number | undefined;

  if (asset.mime_type !== 'image/ktx2' || !sourceTextureAssetId) return null;

  const savedSettings = (metadata?.convertSettings as TextureConvertSettings | undefined)
    ?? DEFAULT_TEXTURE_CONVERT_SETTINGS;

  return (
    <TextureImportPropContent
      asset={asset}
      projectId={projectId}
      sourceTextureAssetId={sourceTextureAssetId}
      savedSettings={savedSettings}
      onReimportComplete={onReimportComplete}
    />
  );
};

interface ContentProps {
  asset: Asset;
  projectId: number;
  sourceTextureAssetId: number;
  savedSettings: TextureConvertSettings;
  onReimportComplete: () => void;
}

const TextureImportPropContent: React.FC<ContentProps> = ({
  asset,
  projectId,
  sourceTextureAssetId,
  savedSettings,
  onReimportComplete,
}) => {
  const [localSettings, setLocalSettings] = useState<TextureConvertSettings>(savedSettings);
  const [isReimporting, setIsReimporting] = useState(false);
  const [reimportProgress, setReimportProgress] = useState('');
  const loadAssets = useAssetStore((state) => state.loadAssets);
  const assets = useAssetStore((state) => state.assets);

  const sourceExists = assets.some((a) => a.id === sourceTextureAssetId);

  React.useEffect(() => {
    setLocalSettings(savedSettings);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(savedSettings)]);

  const isDirty = useMemo(
    () => JSON.stringify(localSettings) !== JSON.stringify(savedSettings),
    [localSettings, savedSettings]
  );

  const set = <K extends keyof TextureConvertSettings>(key: K, value: TextureConvertSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleReimport = async () => {
    setIsReimporting(true);
    setReimportProgress('');
    try {
      await textureConverter.reimport(
        asset,
        localSettings,
        (progress) => setReimportProgress(`${progress.step} (${progress.percent}%)`)
      );
      await loadAssets(projectId, 'texture');
      onReimportComplete();
    } catch (err) {
      alert(err instanceof Error ? err.message : '重新导入失败，请重试');
    } finally {
      setIsReimporting(false);
      setReimportProgress('');
    }
  };

  return (
    <div className="border-t border-border-dark pt-4 mt-2">
      {/* 区域标题 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-xs text-primary">image</span>
        <h3 className="text-[11px] font-bold text-slate-300">纹理导入设置</h3>
        {isDirty && (
          <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
            已修改
          </span>
        )}
      </div>

      <div className="space-y-3 text-xs">
        {/* 来源文件 */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500">来源文件</span>
          <span className="text-slate-400 font-mono text-[10px]">
            ID: {sourceTextureAssetId}
          </span>
        </div>

        <div className="border-t border-slate-800 pt-2 space-y-2">
          {/* 压缩模式 */}
          <div className="flex items-center justify-between">
            <label className="text-slate-400">压缩模式</label>
            <select
              value={localSettings.compressionMode}
              onChange={(e) => set('compressionMode', e.target.value as TextureConvertSettings['compressionMode'])}
              className="w-28 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ETC1S">ETC1S（文件小）</option>
              <option value="UASTC">UASTC（质量高）</option>
            </select>
          </div>

          {/* 质量 */}
          <div className="flex items-center justify-between">
            <label className="text-slate-400">质量等级</label>
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min={1}
                max={255}
                value={localSettings.quality}
                onChange={(e) => set('quality', parseInt(e.target.value, 10))}
                className="w-20 accent-primary"
              />
              <input
                type="number"
                min={1}
                max={255}
                value={localSettings.quality}
                onChange={(e) => set('quality', Math.min(255, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                className="w-12 px-1 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500 text-center"
              />
            </div>
          </div>

          {/* 色彩空间 */}
          <div className="flex items-center justify-between">
            <label className="text-slate-400">色彩空间</label>
            <select
              value={localSettings.colorSpace}
              onChange={(e) => set('colorSpace', e.target.value as TextureConvertSettings['colorSpace'])}
              className="w-28 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="sRGB">sRGB（颜色贴图）</option>
              <option value="Linear">Linear（法线/粗糙度）</option>
            </select>
          </div>

          {/* POT */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.potResize}
                onChange={(e) => set('potResize', e.target.checked)}
                className="w-3 h-3 accent-primary"
              />
              缩放到 2 的幂次
            </label>
            {localSettings.potResize && (
              <select
                value={localSettings.potMode}
                onChange={(e) => set('potMode', e.target.value as TextureConvertSettings['potMode'])}
                className="w-20 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none"
              >
                <option value="nearest">nearest</option>
                <option value="ceil">ceil</option>
                <option value="floor">floor</option>
              </select>
            )}
          </div>

          {/* Alpha + Mipmap */}
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.hasAlpha}
                onChange={(e) => set('hasAlpha', e.target.checked)}
                className="w-3 h-3 accent-primary"
              />
              含 Alpha
            </label>
            <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.generateMipmaps}
                onChange={(e) => set('generateMipmaps', e.target.checked)}
                className="w-3 h-3 accent-primary"
              />
              生成 Mipmap
            </label>
          </div>
        </div>

        {/* 重新导入按钮 */}
        <div className="pt-1">
          {!sourceExists && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400">
              <span className="material-symbols-outlined text-xs">warning</span>
              <span>源文件已删除，无法重新导入</span>
            </div>
          )}
          <button
            onClick={handleReimport}
            disabled={!isDirty || isReimporting || !sourceExists}
            className="w-full py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {isReimporting ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                <span>{reimportProgress || '转换中...'}</span>
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

### Step 4: 运行测试确认通过

```bash
pnpm --filter client test -- --run src/components/inspector/TextureImportProp.test.tsx
```

预期：所有测试 **PASS**

### Step 5: 提交

```bash
git add packages/client/src/components/inspector/TextureImportProp.tsx packages/client/src/components/inspector/TextureImportProp.test.tsx packages/client/src/features/textures/TextureConverter.ts
git commit -m "feat(texture): 添加 TextureImportProp 和 TextureConverter.reimport() 方法"
```

---

## Task 3: 更新 InspectorPanel 显示纹理缩略图和参数

**Files:**
- Modify: `packages/client/src/components/panels/InspectorPanel.tsx`

**Context:**
InspectorPanel 在 `!activeId` 分支中已有"资产检视模式"，当前显示 `ModelImportProp` 和 3D 模型预览。需要：
1. 资产头部：纹理类型时显示缩略图（source PNG）而非通用图标
2. 在 `ModelImportProp` 之后渲染 `TextureImportProp`

**Step 1: 在 InspectorPanel.tsx 中添加 TextureImportProp import**

在现有 import 列表中添加：
```typescript
import { TextureImportProp } from '../inspector/TextureImportProp';
```

**Step 2: 计算纹理缩略图 URL**

在 `InspectorPanel` 组件中，`selectedAsset` 定义之后添加：

```typescript
// 纹理缩略图 URL：KTX2 找源 PNG；普通纹理直接用下载 URL
const textureThumbnailUrl = useMemo(() => {
  if (!selectedAsset) return null;
  if (selectedAsset.type !== 'texture' && (selectedAsset.type as string) !== 'image') return null;
  const meta = selectedAsset.metadata as Record<string, unknown> | undefined;
  if (selectedAsset.mime_type === 'image/ktx2') {
    const sourceId = meta?.sourceTextureAssetId as number | undefined;
    if (sourceId) {
      const sourceAsset = assets.find((a) => a.id === sourceId);
      if (sourceAsset) {
        return `${assetsApi.getAssetDownloadUrl(sourceId)}?v=${new Date(sourceAsset.updated_at).getTime()}`;
      }
    }
    return null; // KTX2 but no source → no thumbnail
  }
  return `${assetsApi.getAssetDownloadUrl(selectedAsset.id)}?v=${new Date(selectedAsset.updated_at).getTime()}`;
}, [selectedAsset, assets]);
```

同时在文件顶部添加：
```typescript
import React, { useMemo } from 'react';
import { assetsApi } from '../../api/assets';
```

（React 已有 import，追加 `useMemo`；assetsApi 是新增）

**Step 3: 改造资产头部**

将现有的资产头部（`selectedAsset ? (...)` 分支中的"资产头部"部分）改为：

```tsx
{/* 资产头部 */}
<div className="p-4 border-b border-border-dark bg-header-dark/50">
  <div className="flex items-center space-x-3">
    <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center border border-white/5 overflow-hidden shrink-0">
      {textureThumbnailUrl ? (
        <img
          src={textureThumbnailUrl}
          crossOrigin="use-credentials"
          alt={selectedAsset.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="material-symbols-outlined text-primary text-base">
          {selectedAsset.type === 'texture' ? 'image' : 'deployed_code'}
        </span>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-white font-medium truncate">{selectedAsset.name}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">
        {selectedAsset.mime_type ?? selectedAsset.type} · {(selectedAsset.file_size / 1024).toFixed(0)} KB
      </p>
    </div>
  </div>
</div>
```

**Step 4: 在资产属性内容区渲染 TextureImportProp**

将 `{/* 资产属性内容 */}` 区块中已有的 `<ModelImportProp ... />` 之后添加：

```tsx
<TextureImportProp
  asset={selectedAsset}
  projectId={selectedAsset.project_id}
  onReimportComplete={() => {}}
/>
```

**Step 5: 运行全部测试确认不破坏现有功能**

```bash
pnpm --filter client test -- --run
```

预期：全部测试 **PASS**

**Step 6: 提交**

```bash
git add packages/client/src/components/panels/InspectorPanel.tsx
git commit -m "feat(inspector): 纹理资产检视 — 显示缩略图和导入参数"
```

---

## 整体验证

1. 启动前后端：`pnpm dev:all`
2. 进入项目 → 点击 Textures 文件夹
3. 导入一张 PNG（→ KTX2 转换）
4. 点击生成的 KTX2 资产
5. **验证 Inspector 应显示：**
   - 资产头：PNG 缩略图（来自源 PNG）+ 文件名 + MIME 类型
   - 纹理导入设置区域：显示当时的转换参数
   - "重新导入"按钮：灰色（未修改）
6. 修改压缩模式（ETC1S → UASTC）
   - **"已修改" badge 出现**
   - "重新导入"按钮变为可用（蓝色）
7. 点击"重新导入"
   - 按钮显示 spinner + 进度文字
   - 完成后参数更新，"已修改" badge 消失，按钮恢复灰色
8. 在材质 Inspector 中给 cube 的 map 指定该 KTX2 贴图 → 确认 Scene View 中贴图仍正常渲染（assetId 未变）

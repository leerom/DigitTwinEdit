# Plan 03 — TexturePicker 组件

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 实现贴图选取/上传弹出层组件，支持从项目 Textures 目录选择已有图片，或直接上传新图片（自动归入 Textures 目录）。

**前置条件：** Plan 01 完成（需要 `MaterialFieldDef` 类型）

---

## 背景知识

- `useAssetStore` 中 `assets` 数组包含所有已上传资产，每条有 `{id, name, type, project_id, url}`
- `assetsApi.upload(file, projectId)` 上传文件；需在请求体或查询参数携带 `type: 'texture'`
- 贴图引用格式：`{ assetId: number, url: string }`，其中 url 为 `assetsApi.getAssetDownloadUrl(id)` + cache-buster
- 当前资产类型 `type` 字段已有 `'model'` 等类型，需新增 `'texture'` 值

---

## Task 1: 确认/扩展 asset type 支持 'texture'

**Files:**
- Check: `packages/client/src/api/assets.ts`（查看上传接口签名）
- Check: `packages/shared/src/types.ts`（查看 AssetType 定义，若限制了枚举则需扩展）

运行以下命令找到相关文件：

```bash
# 在项目根目录执行
grep -r "AssetType\|type.*model\|type.*fbx" packages/shared/src --include="*.ts" -n
grep -r "upload\|FormData" packages/client/src/api/assets.ts -n
```

若 `AssetType` 是字符串联合类型（如 `'model' | 'image'`），需追加 `'texture'`。
若已有 `'image'` 类型，可直接复用 `'image'` 并在 TexturePicker 中过滤 `type === 'image' || type === 'texture'`。

**无需测试，修改后直接 commit：**

```bash
git add packages/shared/src/  # 若有改动
git commit -m "feat(shared): add 'texture' to AssetType"
```

---

## Task 2: TexturePicker 组件

**Files:**
- Create: `packages/client/src/components/inspector/TexturePicker.tsx`
- Create: `packages/client/src/components/inspector/TexturePicker.test.tsx`

### Step 1: 写测试

```tsx
// packages/client/src/components/inspector/TexturePicker.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TexturePicker } from './TexturePicker';

// mock useAssetStore
vi.mock('@/stores/assetStore', () => ({
  useAssetStore: (selector: any) => selector({
    assets: [
      { id: 1, name: 'brick.png', type: 'texture', project_id: 10, updated_at: '2026-01-01' },
      { id: 2, name: 'wood.png',  type: 'texture', project_id: 10, updated_at: '2026-01-01' },
      { id: 3, name: 'model.glb', type: 'model',   project_id: 10, updated_at: '2026-01-01' },
    ],
    fetchAssets: vi.fn(),
  }),
}));

// mock assetsApi
vi.mock('@/api/assets', () => ({
  assetsApi: {
    getAssetDownloadUrl: (id: number) => `/api/assets/${id}/download`,
    upload: vi.fn().mockResolvedValue({ id: 99, name: 'new.png', type: 'texture', updated_at: '2026-01-01' }),
  },
}));

describe('TexturePicker', () => {
  it('未选中时显示"无"占位', () => {
    render(<TexturePicker label="漫反射贴图" value={null} onChange={vi.fn()} projectId={10} />);
    expect(screen.getByText('无')).toBeTruthy();
  });

  it('点击"选择"按钮展开弹出层，只展示 texture 类型资产', async () => {
    render(<TexturePicker label="漫反射贴图" value={null} onChange={vi.fn()} projectId={10} />);
    fireEvent.click(screen.getByText('选择'));
    await waitFor(() => {
      expect(screen.getByText('brick.png')).toBeTruthy();
      expect(screen.getByText('wood.png')).toBeTruthy();
      // model.glb 不应出现
      expect(screen.queryByText('model.glb')).toBeNull();
    });
  });

  it('点击资产后触发 onChange 并关闭弹出层', async () => {
    const onChange = vi.fn();
    render(<TexturePicker label="漫反射贴图" value={null} onChange={onChange} projectId={10} />);
    fireEvent.click(screen.getByText('选择'));
    await waitFor(() => screen.getByText('brick.png'));
    fireEvent.click(screen.getByText('brick.png'));
    expect(onChange).toHaveBeenCalledWith({ assetId: 1, url: '/api/assets/1/download' });
  });

  it('点击×清除贴图', () => {
    const onChange = vi.fn();
    render(
      <TexturePicker
        label="漫反射贴图"
        value={{ assetId: 1, url: '/api/assets/1/download' }}
        onChange={onChange}
        projectId={10}
      />
    );
    fireEvent.click(screen.getByLabelText('清除贴图'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
```

### Step 2: 运行测试确认失败

```bash
pnpm --filter client test -- --run src/components/inspector/TexturePicker.test.tsx
```

期望：FAIL

### Step 3: 实现 TexturePicker.tsx

```tsx
// packages/client/src/components/inspector/TexturePicker.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAssetStore } from '@/stores/assetStore';
import { assetsApi } from '@/api/assets';

export interface TextureRef {
  assetId: number;
  url: string;
}

interface TexturePickerProps {
  label: string;
  value: TextureRef | null;
  onChange: (value: TextureRef | null) => void;
  projectId: number;
}

export const TexturePicker: React.FC<TexturePickerProps> = ({
  label,
  value,
  onChange,
  projectId,
}) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const assets = useAssetStore((s) => s.assets);
  const fetchAssets = useAssetStore((s) => s.fetchAssets);

  // 只显示 texture 类型（兼容 'image'）
  const textureAssets = assets.filter(
    (a) => a.type === 'texture' || a.type === 'image'
  );

  // 点击弹出层外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (asset: { id: number; updated_at: string }) => {
    const url = `${assetsApi.getAssetDownloadUrl(asset.id)}?v=${new Date(asset.updated_at).getTime()}`;
    onChange({ assetId: asset.id, url });
    setOpen(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const asset = await assetsApi.upload(file, projectId, { type: 'texture' });
      await fetchAssets(projectId);
      handleSelect(asset);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 已选中时显示缩略图
  const selectedAsset = value
    ? assets.find((a) => a.id === value.assetId)
    : undefined;

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] text-[#999999] font-medium shrink-0">{label}</label>
        <div className="flex items-center gap-1.5 min-w-0">
          {/* 缩略图或占位 */}
          {value ? (
            <img
              src={value.url}
              alt={selectedAsset?.name ?? '贴图'}
              className="w-8 h-8 object-cover rounded border border-white/10"
            />
          ) : (
            <span className="text-[10px] text-slate-500 italic">无</span>
          )}
          {/* 清除按钮 */}
          {value && (
            <button
              aria-label="清除贴图"
              onClick={() => onChange(null)}
              className="text-slate-500 hover:text-white text-xs leading-none"
            >
              ×
            </button>
          )}
          {/* 选择按钮 */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-[10px] text-primary hover:text-primary/80 border border-primary/30 rounded px-1.5 py-0.5"
          >
            选择
          </button>
        </div>
      </div>

      {/* 弹出层 */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-1 z-50 w-64 bg-[#1a1d26] border border-[#2d333f] rounded shadow-lg p-2"
        >
          {/* 上传 */}
          <label className="block mb-2 cursor-pointer">
            <span className="text-[10px] text-primary hover:underline">
              {uploading ? '上传中…' : '+ 上传图片'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>

          {/* 资产列表 */}
          {textureAssets.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-4">暂无贴图资产</p>
          ) : (
            <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto">
              {textureAssets.map((asset) => (
                <button
                  key={asset.id}
                  title={asset.name}
                  onClick={() => handleSelect(asset)}
                  className={`
                    relative rounded border overflow-hidden
                    ${value?.assetId === asset.id
                      ? 'border-primary'
                      : 'border-white/10 hover:border-white/30'}
                  `}
                >
                  <img
                    src={`${assetsApi.getAssetDownloadUrl(asset.id)}?v=${new Date(asset.updated_at).getTime()}`}
                    alt={asset.name}
                    className="w-full h-14 object-cover"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white truncate px-0.5 py-0.5">
                    {asset.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

**注意：** `assetsApi.upload` 的第三个参数 `{type: 'texture'}` 需要确认 API 支持。若现有签名是 `upload(file, projectId)`，需先扩展该函数接受可选的 metadata 参数。检查 `packages/client/src/api/assets.ts` 并按需调整。

### Step 4: 运行测试确认通过

```bash
pnpm --filter client test -- --run src/components/inspector/TexturePicker.test.tsx
```

### Step 5: Commit

```bash
git add packages/client/src/components/inspector/TexturePicker.tsx \
        packages/client/src/components/inspector/TexturePicker.test.tsx
git commit -m "feat(inspector): add TexturePicker component with asset gallery and upload support"
```

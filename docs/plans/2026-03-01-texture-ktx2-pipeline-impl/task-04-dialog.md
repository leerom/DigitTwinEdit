# Task 04 — TextureImportDialog.tsx（设置 UI + 实时对比预览）

## 目标

实现转换设置对话框，包含：
- 所有参数控件（Mipmap、POT 缩放、质量滑块、Alpha、色彩空间、压缩模式）
- 实时对比预览面板（公式估算：文件大小 + 显存对比）
- 单元测试覆盖渲染和关键交互

## Files

- Create: `packages/client/src/features/textures/TextureImportDialog.tsx`
- Create: `packages/client/src/features/textures/__tests__/TextureImportDialog.test.tsx`

---

## Step 1: 编写失败测试

创建 `packages/client/src/features/textures/__tests__/TextureImportDialog.test.tsx`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextureImportDialog } from '../TextureImportDialog';
import { DEFAULT_TEXTURE_CONVERT_SETTINGS } from '../types';

const defaultProps = {
  isOpen: true,
  fileName: 'texture_albedo.jpg',
  fileSize: 1.4 * 1024 * 1024,       // 1.4 MB
  originalWidth: 1024,
  originalHeight: 1024,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe('TextureImportDialog', () => {
  it('renders dialog title and file name', () => {
    render(<TextureImportDialog {...defaultProps} />);
    expect(screen.getByText('导入纹理（→KTX2）')).toBeInTheDocument();
    expect(screen.getByText(/texture_albedo\.jpg/)).toBeInTheDocument();
  });

  it('does not render when isOpen=false', () => {
    render(<TextureImportDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('导入纹理（→KTX2）')).not.toBeInTheDocument();
  });

  it('calls onCancel when 取消 button clicked', () => {
    render(<TextureImportDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
  });

  it('calls onConfirm with default settings when confirmed without changes', () => {
    render(<TextureImportDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: '转换并上传' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(DEFAULT_TEXTURE_CONVERT_SETTINGS);
  });

  it('shows original dimensions in header', () => {
    render(<TextureImportDialog {...defaultProps} />);
    expect(screen.getByText(/1024\s*×\s*1024/)).toBeInTheDocument();
  });

  it('shows preview panel with 原始 and 转换后 sections', () => {
    render(<TextureImportDialog {...defaultProps} />);
    expect(screen.getByText(/原始/)).toBeInTheDocument();
    expect(screen.getByText(/转换后/)).toBeInTheDocument();
  });

  it('shows original file size in preview', () => {
    render(<TextureImportDialog {...defaultProps} />);
    // 1.4MB 应在预览区显示
    expect(screen.getByText(/1\.4\s*MB/i)).toBeInTheDocument();
  });

  it('confirms with quality=128 when quality slider changed', () => {
    render(<TextureImportDialog {...defaultProps} />);
    const qualityInput = screen.getByRole('spinbutton'); // number input
    fireEvent.change(qualityInput, { target: { value: '128' } });
    fireEvent.click(screen.getByRole('button', { name: '转换并上传' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ quality: 128 })
    );
  });

  it('confirms with colorSpace=Linear when 线性 selected', () => {
    render(<TextureImportDialog {...defaultProps} />);
    const select = screen.getByDisplayValue('sRGB');
    fireEvent.change(select, { target: { value: 'Linear' } });
    fireEvent.click(screen.getByRole('button', { name: '转换并上传' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ colorSpace: 'Linear' })
    );
  });

  it('POT resize toggle enables potMode selector', () => {
    render(<TextureImportDialog {...defaultProps} />);
    // 默认 potResize=false，potMode 选择器应被禁用
    const potModeSelect = screen.getByDisplayValue(/nearest|向下|向上/i);
    expect(potModeSelect).toBeDisabled();
    // 勾选 POT 后 potMode 可用
    const potCheckbox = screen.getByRole('checkbox', { name: /2 的幂次方/ });
    fireEvent.click(potCheckbox);
    expect(potModeSelect).not.toBeDisabled();
  });

  it('resets to default settings on cancel', () => {
    render(<TextureImportDialog {...defaultProps} />);
    const qualityInput = screen.getByRole('spinbutton');
    fireEvent.change(qualityInput, { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
  });
});
```

## Step 2: 运行测试，确认失败

```bash
pnpm --filter client test -- --run src/features/textures/__tests__/TextureImportDialog.test.tsx
```

预期：`FAIL  Cannot find module '../TextureImportDialog'`

---

## Step 3: 实现 TextureImportDialog.tsx

创建 `packages/client/src/features/textures/TextureImportDialog.tsx`：

```tsx
import React, { useState, useMemo } from 'react';
import { Dialog } from '../../components/common/Dialog';
import type { TextureConvertSettings } from './types';
import { DEFAULT_TEXTURE_CONVERT_SETTINGS } from './types';
import { estimateKTX2 } from './estimateKTX2';

interface TextureImportDialogProps {
  isOpen: boolean;
  fileName: string;
  /** 原始文件大小（字节） */
  fileSize: number;
  originalWidth: number;
  originalHeight: number;
  onConfirm: (settings: TextureConvertSettings) => void;
  onCancel: () => void;
}

/** 将字节数格式化为人可读的大小字符串，如 "1.4 MB" */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** 计算节省百分比 */
function savingPct(after: number, before: number): string {
  if (before === 0) return '';
  const pct = ((before - after) / before * 100);
  return pct > 0 ? `↓${pct.toFixed(0)}%` : `↑${Math.abs(pct).toFixed(0)}%`;
}

export const TextureImportDialog: React.FC<TextureImportDialogProps> = ({
  isOpen, fileName, fileSize, originalWidth, originalHeight, onConfirm, onCancel,
}) => {
  const [settings, setSettings] = useState<TextureConvertSettings>(
    DEFAULT_TEXTURE_CONVERT_SETTINGS
  );

  const set = <K extends keyof TextureConvertSettings>(
    key: K,
    value: TextureConvertSettings[K]
  ) => setSettings(prev => ({ ...prev, [key]: value }));

  // 实时估算（只要设置变化就重新计算）
  const estimate = useMemo(() => estimateKTX2({
    originalWidth, originalHeight, settings,
  }), [originalWidth, originalHeight, settings]);

  const originalVram = originalWidth * originalHeight * 4 * (settings.generateMipmaps ? 4 / 3 : 1);

  const handleConfirm = () => {
    onConfirm(settings);
    setSettings(DEFAULT_TEXTURE_CONVERT_SETTINGS);
  };

  const handleCancel = () => {
    setSettings(DEFAULT_TEXTURE_CONVERT_SETTINGS);
    onCancel();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      title="导入纹理（→KTX2）"
      closeOnOverlayClick={false}
      className="max-w-[520px] w-full"
    >
      <div className="flex flex-col gap-4">

        {/* 文件信息 */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800 rounded text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">texture</span>
            <span className="text-white truncate max-w-[260px]" title={fileName}>{fileName}</span>
          </div>
          <span className="shrink-0 ml-2 text-slate-400">
            {originalWidth} × {originalHeight} &nbsp;·&nbsp; {formatBytes(fileSize)}
          </span>
        </div>

        {/* ── 尺寸处理 ── */}
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">尺寸处理</h3>
          <div className="flex flex-col gap-2 pl-2">
            <label className="flex items-center justify-between text-sm text-slate-300">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.potResize}
                  onChange={e => set('potResize', e.target.checked)}
                  className="accent-primary"
                  aria-label="缩放到 2 的幂次方"
                />
                缩放到 2 的幂次方（POT）
              </span>
              <select
                value={settings.potMode}
                disabled={!settings.potResize}
                onChange={e => set('potMode', e.target.value as TextureConvertSettings['potMode'])}
                className="ml-2 bg-slate-700 text-slate-300 text-xs rounded px-2 py-1 disabled:opacity-40"
              >
                <option value="nearest">nearest（最近）</option>
                <option value="ceil">ceil（向上取整）</option>
                <option value="floor">floor（向下取整）</option>
              </select>
            </label>
            {settings.potResize && (
              <p className="text-xs text-slate-500 pl-5">
                缩放后：{estimate.targetWidth} × {estimate.targetHeight}
              </p>
            )}
          </div>
        </section>

        {/* ── 编码参数 ── */}
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">编码参数</h3>
          <div className="flex flex-col gap-3 pl-2">

            {/* 压缩模式 */}
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>压缩模式</span>
              <select
                value={settings.compressionMode}
                onChange={e => set('compressionMode', e.target.value as TextureConvertSettings['compressionMode'])}
                className="bg-slate-700 text-slate-300 text-xs rounded px-2 py-1"
              >
                <option value="ETC1S">ETC1S（文件小，速度快）</option>
                <option value="UASTC">UASTC（质量高，文件大）</option>
              </select>
            </div>

            {/* 质量 */}
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>质量等级</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={255}
                  value={settings.quality}
                  onChange={e => set('quality', parseInt(e.target.value, 10))}
                  className="w-28 accent-primary"
                />
                <input
                  type="number"
                  min={1}
                  max={255}
                  value={settings.quality}
                  onChange={e => set('quality', Math.min(255, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                  className="w-14 bg-slate-700 text-slate-300 text-xs rounded px-2 py-1 text-center"
                />
              </div>
            </div>

            {/* 色彩空间 */}
            <div className="flex items-center justify-between text-sm text-slate-300">
              <div>
                <span>色彩空间</span>
                <span className="ml-1 text-xs text-slate-500">（颜色贴图=sRGB，法线/粗糙度=Linear）</span>
              </div>
              <select
                value={settings.colorSpace}
                onChange={e => set('colorSpace', e.target.value as TextureConvertSettings['colorSpace'])}
                className="bg-slate-700 text-slate-300 text-xs rounded px-2 py-1"
              >
                <option value="sRGB">sRGB</option>
                <option value="Linear">Linear（线性）</option>
              </select>
            </div>

            {/* Alpha + Mipmap */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hasAlpha}
                  onChange={e => set('hasAlpha', e.target.checked)}
                  className="accent-primary"
                />
                包含 Alpha 通道
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.generateMipmaps}
                  onChange={e => set('generateMipmaps', e.target.checked)}
                  className="accent-primary"
                />
                生成 Mipmap
              </label>
            </div>

          </div>
        </section>

        {/* ── 对比预览 ── */}
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">预期效果（估算）</h3>
          <div className="grid grid-cols-2 gap-2">

            {/* 转换前 */}
            <div className="bg-slate-800 rounded p-3 text-xs text-slate-400 space-y-1">
              <p className="text-slate-300 font-medium mb-2">原始</p>
              <p>格式：{fileName.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG'}</p>
              <p>尺寸：{originalWidth} × {originalHeight}</p>
              <p>文件：<span className="text-white">{formatBytes(fileSize)}</span></p>
              <p>显存：<span className="text-white">{formatBytes(originalVram)}</span></p>
            </div>

            {/* 转换后 */}
            <div className="bg-slate-800 rounded p-3 text-xs text-slate-400 space-y-1">
              <p className="text-slate-300 font-medium mb-2">转换后（KTX2）</p>
              <p>格式：KTX2 / {settings.compressionMode}</p>
              <p>尺寸：{estimate.targetWidth} × {estimate.targetHeight}</p>
              <p>
                文件：<span className="text-green-400">{formatBytes(estimate.fileSizeBytes)}</span>
                <span className="text-green-400 ml-1 text-[11px]">{savingPct(estimate.fileSizeBytes, fileSize)}</span>
              </p>
              <p>
                显存：<span className="text-green-400">{formatBytes(estimate.vramBytes)}</span>
                <span className="text-green-400 ml-1 text-[11px]">{savingPct(estimate.vramBytes, originalVram)}</span>
              </p>
            </div>

          </div>
        </section>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 text-sm text-slate-300 hover:text-white rounded hover:bg-slate-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/80 transition-colors"
          >
            转换并上传
          </button>
        </div>

      </div>
    </Dialog>
  );
};
```

---

## Step 4: 运行测试，确认通过

```bash
pnpm --filter client test -- --run src/features/textures/__tests__/TextureImportDialog.test.tsx
```

预期：
```
✓ src/features/textures/__tests__/TextureImportDialog.test.tsx (10 tests)
Test Files  1 passed
Tests       10 passed
```

---

## Step 5: Commit

```bash
git add packages/client/src/features/textures/TextureImportDialog.tsx \
        packages/client/src/features/textures/__tests__/TextureImportDialog.test.tsx
git commit -m "feat(textures): 实现 TextureImportDialog.tsx（设置 UI + 实时对比预览估算）"
```

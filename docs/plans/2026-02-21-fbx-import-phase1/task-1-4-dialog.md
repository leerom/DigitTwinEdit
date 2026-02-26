# 任务 1.4：FBXImportDialog 配置对话框

**Files:**
- Create: `packages/client/src/features/fbx/FBXImportDialog.tsx`
- Create: `packages/client/src/features/fbx/__tests__/FBXImportDialog.test.tsx`

**依赖：** 任务 1.1（types.ts）

**背景：** 使用现有的 `Dialog` 组件（`packages/client/src/components/common/Dialog.tsx`）作为容器。测试使用 Vitest + `@testing-library/react`。

---

### Step 1：写失败测试

创建 `packages/client/src/features/fbx/__tests__/FBXImportDialog.test.tsx`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FBXImportDialog } from '../FBXImportDialog';
import { DEFAULT_FBX_IMPORT_SETTINGS } from '../types';

describe('FBXImportDialog', () => {
  const defaultProps = {
    isOpen: true,
    fileName: 'building.fbx',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog title and file name', () => {
    render(<FBXImportDialog {...defaultProps} />);
    expect(screen.getByText('导入 FBX 模型')).toBeInTheDocument();
    expect(screen.getByText('building.fbx')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<FBXImportDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('导入 FBX 模型')).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button clicked', () => {
    render(<FBXImportDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
  });

  it('calls onConfirm with default settings when import clicked without changes', () => {
    render(<FBXImportDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: '导入' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(DEFAULT_FBX_IMPORT_SETTINGS);
  });

  it('disables normalsMode select when normals is "import"', () => {
    render(<FBXImportDialog {...defaultProps} />);
    // 默认 normals 是 'import'，所以法线模式应该是 disabled
    const normalsModeSelect = screen.getByDisplayValue('面积和顶角加权');
    expect(normalsModeSelect).toBeDisabled();
  });

  it('enables normalsMode select when normals is changed to "calculate"', () => {
    render(<FBXImportDialog {...defaultProps} />);
    const normalsSelect = screen.getByDisplayValue('导入法线');
    fireEvent.change(normalsSelect, { target: { value: 'calculate' } });
    const normalsModeSelect = screen.getByDisplayValue('面积和顶角加权');
    expect(normalsModeSelect).not.toBeDisabled();
  });

  it('calls onConfirm with updated settings when user changes scale', () => {
    render(<FBXImportDialog {...defaultProps} />);
    const scaleInput = screen.getByRole('spinbutton');
    fireEvent.change(scaleInput, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: '导入' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ scale: 2 })
    );
  });
});
```

### Step 2：运行测试确认失败

```bash
pnpm --filter client test --run packages/client/src/features/fbx/__tests__/FBXImportDialog.test.tsx
```

预期：FAIL，报错 `Cannot find module '../FBXImportDialog'`

---

### Step 3：实现 FBXImportDialog 组件

创建 `packages/client/src/features/fbx/FBXImportDialog.tsx`：

```typescript
import React, { useState } from 'react';
import { Dialog } from '../../components/common/Dialog';
import type { FBXImportSettings } from './types';
import { DEFAULT_FBX_IMPORT_SETTINGS } from './types';

interface FBXImportDialogProps {
  isOpen: boolean;
  /** 选择的 FBX 文件名（用于显示） */
  fileName: string;
  onConfirm: (settings: FBXImportSettings) => void;
  onCancel: () => void;
}

export const FBXImportDialog: React.FC<FBXImportDialogProps> = ({
  isOpen,
  fileName,
  onConfirm,
  onCancel,
}) => {
  const [settings, setSettings] = useState<FBXImportSettings>(
    DEFAULT_FBX_IMPORT_SETTINGS
  );

  // 通用的单字段更新函数
  const set = <K extends keyof FBXImportSettings>(
    key: K,
    value: FBXImportSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    onConfirm(settings);
    // 重置为默认值，以便下次打开时是干净的状态
    setSettings(DEFAULT_FBX_IMPORT_SETTINGS);
  };

  const handleCancel = () => {
    setSettings(DEFAULT_FBX_IMPORT_SETTINGS);
    onCancel();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      title="导入 FBX 模型"
      closeOnOverlayClick={false}
      className="max-w-[480px] w-full"
    >
      <div className="flex flex-col gap-4">

        {/* 文件名显示 */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded text-xs text-slate-400">
          <span className="material-symbols-outlined text-sm text-primary">deployed_code</span>
          <span className="text-white truncate" title={fileName}>{fileName}</span>
        </div>

        {/* 场景（Scene）设置 */}
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            场景
          </h3>
          <div className="flex flex-col gap-2 pl-2">

            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">缩放比例</label>
              <input
                type="number"
                value={settings.scale}
                min={0.001}
                max={10000}
                step={0.1}
                onChange={(e) => set('scale', parseFloat(e.target.value) || 1)}
                className="w-24 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">
                转换单位 (1cm → 0.01m)
              </label>
              <input
                type="checkbox"
                checked={settings.convertUnits}
                onChange={(e) => set('convertUnits', e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
            </div>
          </div>
        </section>

        {/* 几何（Geometry）设置 */}
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            几何
          </h3>
          <div className="flex flex-col gap-2 pl-2">

            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">法线</label>
              <select
                value={settings.normals}
                onChange={(e) =>
                  set('normals', e.target.value as FBXImportSettings['normals'])
                }
                className="w-36 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="import">导入法线</option>
                <option value="calculate">计算法线</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label
                className={`text-xs ${
                  settings.normals !== 'calculate'
                    ? 'text-slate-600'
                    : 'text-slate-300'
                }`}
              >
                法线模式
              </label>
              <select
                value={settings.normalsMode}
                disabled={settings.normals !== 'calculate'}
                onChange={(e) =>
                  set(
                    'normalsMode',
                    e.target.value as FBXImportSettings['normalsMode']
                  )
                }
                className="w-36 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="unweighted">不加权</option>
                <option value="areaWeighted">面积加权</option>
                <option value="angleWeighted">顶角加权</option>
                <option value="areaAndAngle">面积和顶角加权</option>
              </select>
            </div>
          </div>
        </section>

        {/* 保存（Save）设置 */}
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            保存
          </h3>
          <div className="flex flex-col gap-2 pl-2">

            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">保存格式</label>
              <select
                value={settings.saveFormat}
                onChange={(e) =>
                  set(
                    'saveFormat',
                    e.target.value as FBXImportSettings['saveFormat']
                  )
                }
                className="w-36 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="glb">.glb（二进制，默认）</option>
                <option value="gltf">.gltf（JSON）</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">嵌入纹理资源</label>
              <input
                type="checkbox"
                checked={settings.embedTextures}
                onChange={(e) => set('embedTextures', e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
            </div>
          </div>
        </section>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors font-medium"
          >
            导入
          </button>
        </div>
      </div>
    </Dialog>
  );
};
```

---

### Step 4：运行测试确认通过

```bash
pnpm --filter client test --run packages/client/src/features/fbx/__tests__/FBXImportDialog.test.tsx
```

预期：所有 7 个测试通过 (PASS)

**常见问题：**

问题 1：`material-symbols-outlined is not a valid icon class`
→ 测试中不测试图标，跳过即可。

问题 2：`getByDisplayValue('导入法线') → 找不到元素`
→ 这可能因为 select 的 option value 是 'import' 而不是 '导入法线'，改用：
`screen.getByDisplayValue('导入法线')` — 这应该能找到显示文本为「导入法线」的 option。如果找不到，用 `getByRole('combobox', { name: /法线$/ })`。

---

### Step 5：提交

```bash
git add packages/client/src/features/fbx/FBXImportDialog.tsx \
        packages/client/src/features/fbx/__tests__/FBXImportDialog.test.tsx
git commit -m "feat(fbx): add FBXImportDialog component with settings form"
```

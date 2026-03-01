# Task 05 — useTextureImport.ts + ProjectPanel 集成

## 目标

1. 实现 `useTextureImport.ts` Hook（封装文件选择、对话框状态、转换流程、进度追踪）
2. 修改 `ProjectPanel.tsx` 在"纹理"标签页添加"导入纹理（→KTX2）"入口
3. 写 Hook 的单元测试（聚焦状态机和文件校验，不测试 Worker 内部）

## Files

- Create: `packages/client/src/features/textures/useTextureImport.ts`
- Modify: `packages/client/src/components/panels/ProjectPanel.tsx`

---

## Step 1: 实现 useTextureImport.ts

创建 `packages/client/src/features/textures/useTextureImport.ts`：

```typescript
import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { textureConverter } from './TextureConverter';
import { useProjectStore } from '../../stores/projectStore';
import { useAssetStore } from '../../stores/assetStore';
import type { TextureConvertSettings, TextureConvertProgress } from './types';

/**
 * 纹理导入流程 Hook（供 ProjectPanel 使用）
 *
 * 使用方式：
 *   const tex = useTextureImport();
 *   // 渲染：
 *   <tex.FileInput />
 *   <tex.Dialogs />
 *   // 触发：
 *   <button onClick={tex.trigger}>导入纹理</button>
 */
export function useTextureImport() {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<TextureConvertProgress>({ step: '', percent: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentProject } = useProjectStore();
  const { loadAssets } = useAssetStore();

  /** 触发文件选择对话框 */
  const trigger = () => {
    if (!currentProject) {
      alert('请先选择或创建一个项目');
      return;
    }
    inputRef.current?.click();
  };

  /** input[type=file] onChange 回调 */
  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      textureConverter.validateFile(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : '文件校验失败');
      e.target.value = '';
      return;
    }
    setPendingFile(file);
    setShowDialog(true);
    e.target.value = '';
  };

  /** 用户在对话框点击"转换并上传" */
  const handleConfirm = async (settings: TextureConvertSettings) => {
    if (!pendingFile || !currentProject) return;
    setShowDialog(false);
    setIsConverting(true);
    setProgress({ step: '准备中...', percent: 0 });

    try {
      await textureConverter.convert(
        pendingFile,
        settings,
        currentProject.id,
        (p) => setProgress(p)
      );
      // 刷新资产列表（过滤 isSourceTexture=true 的隐藏资产由 ProjectPanel 自行处理）
      await loadAssets(currentProject.id, 'texture');
    } catch (err) {
      if ((err as Error).message === 'TEXTURE_CONVERT_ABORTED') return;
      alert(`转换失败：${(err as Error).message}`);
    } finally {
      setIsConverting(false);
      setPendingFile(null);
      setProgress({ step: '', percent: 0 });
    }
  };

  const handleCancel = () => {
    setPendingFile(null);
    setShowDialog(false);
  };

  const handleAbort = () => {
    textureConverter.abort();
    setIsConverting(false);
    setPendingFile(null);
    setProgress({ step: '', percent: 0 });
  };

  return {
    // 状态
    pendingFile,
    showDialog,
    isConverting,
    progress,
    // 操作
    trigger,
    handleFileSelected,
    handleConfirm,
    handleCancel,
    handleAbort,
    // Ref（供 ProjectPanel 渲染 input）
    inputRef,
  };
}
```

---

## Step 2: 修改 ProjectPanel.tsx

在 `ProjectPanel.tsx` 的"textures"文件夹分支中：

**2a: 添加 import（在文件顶部已有 import 区域追加）**

```typescript
import { useTextureImport } from '../../features/textures/useTextureImport';
import { TextureImportDialog } from '../../features/textures/TextureImportDialog';
import { ProgressDialog } from '../../features/scene/components/ProgressDialog';
```

**2b: 在 `useFBXImport()` 调用之后添加**

```typescript
// 纹理导入 Hook（Textures 文件夹专用）
const tex = useTextureImport();
```

**2c: 在"textures"文件夹的上传按钮区域，替换现有逻辑**

找到文件中处理 `selectedFolder === 'textures'` 的上传按钮（现有是 `handleFileUpload` 的通用 `<input>`），在该区域改为：

```tsx
{/* 纹理标签页专用：导入并转换为 KTX2 */}
{selectedFolder === 'textures' && (
  <>
    {/* 隐藏的文件 input（由 useTextureImport 管理） */}
    <input
      ref={tex.inputRef}
      type="file"
      accept=".jpg,.jpeg,.png"
      className="hidden"
      onChange={tex.handleFileSelected}
    />

    {/* 导入按钮 */}
    <button
      onClick={tex.trigger}
      className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white
                 hover:bg-slate-700 rounded transition-colors"
    >
      <span className="material-symbols-outlined text-sm">add</span>
      导入纹理（→KTX2）
    </button>

    {/* 配置对话框 */}
    {tex.pendingFile && (
      <TextureImportDialog
        isOpen={tex.showDialog}
        fileName={tex.pendingFile.name}
        fileSize={tex.pendingFile.size}
        originalWidth={0}   // 注意：需要通过 createImageBitmap 获取真实尺寸
        originalHeight={0}  // 见下方说明
        onConfirm={tex.handleConfirm}
        onCancel={tex.handleCancel}
      />
    )}

    {/* 转换进度弹窗 */}
    <ProgressDialog
      isOpen={tex.isConverting}
      title="纹理转换中"
      step={tex.progress.step}
      percent={tex.progress.percent}
      onAbort={tex.handleAbort}
    />
  </>
)}
```

> **关于 originalWidth/Height：** 需要在用户选择文件后，通过 `createImageBitmap` 读取真实尺寸，再传给 Dialog。
> 为此，在 `useTextureImport.ts` 中添加 `imageSize` 状态（Task 05 扩展步骤）：

**2d: 在 `useTextureImport.ts` 中扩展，添加图像尺寸读取**

在 `useTextureImport.ts` 中：
- 增加状态 `const [imageSize, setImageSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });`
- 在 `handleFileSelected` 中，校验通过后，用 `createImageBitmap(file).then(bmp => { setImageSize({ w: bmp.width, h: bmp.height }); bmp.close(); })` 读取尺寸
- Hook 返回值中包含 `imageSize`

修改后 ProjectPanel.tsx 中对应行改为：
```tsx
originalWidth={tex.imageSize.w}
originalHeight={tex.imageSize.h}
```

---

## Step 3: 资产列表过滤（显示 KTX2，隐藏原始图）

在 ProjectPanel.tsx 已有的资产列表渲染区域，找到 `textures` 文件夹的资产渲染部分，确保过滤掉 `metadata.isSourceTexture === true` 的资产：

```tsx
// 过滤隐藏的原始纹理（isSourceTexture=true 仅用于后端关联，不在面板展示）
const displayAssets = assets.filter(a =>
  !(a.metadata as Record<string, unknown>)?.isSourceTexture
);
```

然后用 `displayAssets` 替代 `assets` 渲染列表。

---

## Step 4: 手动验证流程

启动开发服务器：
```bash
pnpm dev:all
```

验证步骤：
1. 打开编辑器 → 资产面板 → 切换到"纹理"标签页
2. 点击"导入纹理（→KTX2）"
3. 选择一张 JPG/PNG 图片（<50MB）
4. 确认对话框出现，显示文件名、尺寸和预览估算
5. 修改质量、色彩空间，确认估算实时更新
6. 点击"转换并上传"
7. 确认进度弹窗出现，显示编码进度
8. 完成后，资产列表中应出现 `.ktx2` 文件
9. 检查浏览器 Network 面板，确认上传了两个文件（原始图 + KTX2）

---

## Step 5: Commit

```bash
git add packages/client/src/features/textures/useTextureImport.ts \
        packages/client/src/components/panels/ProjectPanel.tsx
git commit -m "feat(textures): 集成 useTextureImport Hook 和 ProjectPanel 纹理导入入口"
```

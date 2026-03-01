# 纹理 KTX2 转换流水线 — 组件与类型定义

## 1. `types.ts` — 核心接口

```typescript
// 压缩模式
export type CompressionMode = 'ETC1S' | 'UASTC';

// POT 取整方式
export type POTMode = 'nearest' | 'ceil' | 'floor';

// 转换设置（用户可配置的全部参数）
export interface TextureConvertSettings {
  /** 是否生成 Mipmap（默认 true） */
  generateMipmaps: boolean;
  /** 是否缩放到 2 的幂次方（默认 false） */
  potResize: boolean;
  /** POT 取整方式（默认 'nearest'） */
  potMode: POTMode;
  /** 压缩质量 0–255（ETC1S，默认 200） */
  quality: number;
  /** 是否强制保留 Alpha 通道（默认 false） */
  hasAlpha: boolean;
  /** 色彩空间（默认 'sRGB'） */
  colorSpace: 'sRGB' | 'Linear';
  /** 压缩模式（默认 'ETC1S'） */
  compressionMode: CompressionMode;
}

export const DEFAULT_TEXTURE_CONVERT_SETTINGS: TextureConvertSettings = {
  generateMipmaps: true,
  potResize: false,
  potMode: 'nearest',
  quality: 200,
  hasAlpha: false,
  colorSpace: 'sRGB',
  compressionMode: 'ETC1S',
};

// 转换进度
export interface TextureConvertProgress {
  step: string;
  percent: number;
}

// Worker 输入消息
export interface WorkerInput {
  imageBitmap: ImageBitmap;
  settings: TextureConvertSettings;
  originalWidth: number;
  originalHeight: number;
}

// Worker 输出消息
export type WorkerOutput =
  | { type: 'progress'; percent: number }
  | { type: 'warning'; code: 'DETECTED_ALPHA' }
  | { type: 'done'; ktx2Buffer: ArrayBuffer; finalWidth: number; finalHeight: number }
  | { type: 'error'; message: string };
```

## 2. `TextureImportDialog.tsx` — UI 布局说明

### 对话框结构

```
┌─────────────────────────────────── 导入纹理 ────────────────────────────────────┐
│                                                                                   │
│  📄 texture_albedo.jpg                                  1024 × 1024  (1.4 MB)   │
│                                                                                   │
│  ─── 尺寸处理 ──────────────────────────────────────────────────────────────     │
│  [ ] 缩放到 2 的幂次方    取整方式: [ nearest ▼ ]                                │
│                                                                                   │
│  ─── 编码参数 ──────────────────────────────────────────────────────────────     │
│  压缩模式: [ ETC1S ▼ ]                                                           │
│  质量等级: [0──────────●──────────255]  200                                      │
│  色彩空间: [ sRGB ▼ ]  （sRGB=颜色贴图，Linear=法线/粗糙度等贴图）               │
│  [ ] 包含 Alpha 通道                                                             │
│  [✓] 生成 Mipmap                                                                 │
│                                                                                   │
│  ─── 对比预览（公式估算）──────────────────────────────────────────────────     │
│  ┌───────────────────────┐  ┌───────────────────────┐                            │
│  │ 转换前                │  │ 转换后（KTX2）         │                            │
│  │ 格式: JPEG            │  │ 格式: KTX2 / ETC1S    │                            │
│  │ 尺寸: 1024 × 1024     │  │ 尺寸: 1024 × 1024     │                            │
│  │ 文件: 1.40 MB         │  │ 文件: ~0.09 MB ↓94%   │                            │
│  │ 显存: 4.00 MB         │  │ 显存: ~0.67 MB ↓83%  │                            │
│  └───────────────────────┘  └───────────────────────┘                            │
│                                                                                   │
│                                           [ 取消 ]  [ 转换并上传 ]               │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 实时估算公式

```typescript
// 目标尺寸（考虑 POT 缩放）
const targetWidth  = potResize ? nearestPOT(originalWidth,  potMode) : originalWidth;
const targetHeight = potResize ? nearestPOT(originalHeight, potMode) : originalHeight;
const pixels = targetWidth * targetHeight;

// Mipmap 因子（有 mip 时显存约 × 4/3）
const mipFactor = generateMipmaps ? 4 / 3 : 1;

// 文件大小估算
const bitsPerPixel  = compressionMode === 'ETC1S' ? 1.0 : 8.0; // ETC1S 约 1bpp，UASTC 约 8bpp
const qualityFactor = compressionMode === 'ETC1S' ? (quality / 255 * 0.5 + 0.5) : 1; // 质量影响 ETC1S 大小
const ktx2FileSizeBytes = (pixels * bitsPerPixel / 8 * qualityFactor * mipFactor) + 128; // 128=KTX2 header

// VRAM 估算（GPU 实际占用）
const vramBytesPerPixel = compressionMode === 'ETC1S' ? 0.5 : 1.0; // ETC1S→ETC2: 4bpp；UASTC→BC7: 8bpp
const vramBytes = pixels * vramBytesPerPixel * mipFactor;

// 原始 VRAM（未压缩 RGBA32）
const originalVramBytes = originalWidth * originalHeight * 4 * (generateMipmaps ? 4 / 3 : 1);
```

## 3. `useTextureImport.ts` — Hook 接口（参考 `useFBXImport.ts`）

```typescript
export interface UseTextureImportReturn {
  // 状态
  isDialogOpen: boolean;
  pendingFile: File | null;
  isConverting: boolean;
  progress: TextureConvertProgress | null;

  // 操作
  handleFileSelect: (file: File) => void;   // 用户选择文件后调用
  handleConfirm: (settings: TextureConvertSettings) => Promise<void>;
  handleCancel: () => void;
  handleAbort: () => void;
}
```

## 4. `TextureConverter.ts` — 协调器接口（参考 `FBXImporter.ts`）

```typescript
class TextureConverter {
  abort(): void;
  validateFile(file: File): void;  // 校验：仅允许 image/jpeg, image/png

  convert(
    file: File,
    settings: TextureConvertSettings,
    projectId: number,
    onProgress: (progress: TextureConvertProgress) => void,
    existingAssetNames?: string[]
  ): Promise<{ sourceAssetId: number; ktx2AssetId: number }>;

  private encodeInWorker(
    imageBitmap: ImageBitmap,
    settings: TextureConvertSettings,
    originalWidth: number,
    originalHeight: number,
    onProgress: (percent: number) => void
  ): Promise<{ ktx2Buffer: ArrayBuffer; finalWidth: number; finalHeight: number }>;
}

export const textureConverter = new TextureConverter();
```

## 5. 进度映射

| 阶段 | 百分比范围 | 步骤描述 |
|------|-----------|---------|
| 读取文件 | 0–5% | 读取文件... |
| Worker 编码 | 5–75% | 解码图像 → POT 缩放 → KTX2 编码 |
| 上传原始图 | 75–85% | 上传原始文件... |
| 上传 KTX2 | 85–98% | 上传转换文件... |
| 完成 | 100% | 转换完成 |

# 纹理 KTX2 转换流水线 — Worker 逻辑与后端改动

## 1. `textureWorker.ts` — 处理步骤（参考 `fbxWorker.ts`）

```typescript
// Worker 消息处理入口
self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { imageBitmap, settings, originalWidth, originalHeight } = e.data;

  try {
    // Step 1: 加载 basis_encoder.wasm（懒加载，模块级缓存）
    postProgress(5);
    const BasisEncoder = await loadBasisEncoder('/basis_encoder.wasm');

    // Step 2: POT 缩放（可选）
    postProgress(15);
    let width  = originalWidth;
    let height = originalHeight;
    let sourceData: Uint8Array;

    if (settings.potResize) {
      const canvas = new OffscreenCanvas(
        nearestPOT(originalWidth,  settings.potMode),
        nearestPOT(originalHeight, settings.potMode)
      );
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      width  = canvas.width;
      height = canvas.height;
      sourceData = new Uint8Array(imageData.data.buffer);
    } else {
      const canvas = new OffscreenCanvas(originalWidth, originalHeight);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(imageBitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, originalWidth, originalHeight);
      sourceData = new Uint8Array(imageData.data.buffer);
    }
    imageBitmap.close(); // 释放 GPU 内存

    // Step 3: 自动检测 Alpha
    postProgress(25);
    const hasTransparentPixels = detectAlpha(sourceData);
    const useAlpha = settings.hasAlpha || hasTransparentPixels;
    if (hasTransparentPixels && !settings.hasAlpha) {
      self.postMessage({ type: 'warning', code: 'DETECTED_ALPHA' });
    }

    // Step 4: basis_encoder 配置 + 编码
    postProgress(30);
    const encoder = new BasisEncoder();
    encoder.setCreateKTX2File(true);
    encoder.setKTX2SRGBTransferFunc(settings.colorSpace === 'sRGB');
    encoder.setHasAlpha(useAlpha);
    encoder.setQualityLevel(settings.quality);
    encoder.setGenerateMipmaps(settings.generateMipmaps);
    if (settings.compressionMode === 'UASTC') {
      encoder.setUASTC(true);
    }

    encoder.setSliceSourceImage(0, sourceData, width, height, false);

    // 编码（同步，约 1–30s）
    const ktx2Buffer: ArrayBuffer = encoder.encode();
    encoder.delete();

    postProgress(90);

    // Step 5: 返回结果
    self.postMessage(
      { type: 'done', ktx2Buffer, finalWidth: width, finalHeight: height },
      [ktx2Buffer]
    );
  } catch (err) {
    self.postMessage({ type: 'error', message: (err as Error).message });
  }
};

// 工具函数
function nearestPOT(n: number, mode: POTMode): number {
  const log2 = Math.log2(n);
  switch (mode) {
    case 'ceil':    return Math.pow(2, Math.ceil(log2));
    case 'floor':   return Math.pow(2, Math.floor(log2));
    case 'nearest': return Math.pow(2, Math.round(log2));
  }
}

function detectAlpha(data: Uint8Array): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

function postProgress(percent: number) {
  self.postMessage({ type: 'progress', percent });
}
```

### basis_encoder.wasm 加载策略

- WASM 文件放置于 `packages/client/public/basis_encoder.wasm`（通过 Vite public 目录静态服务）
- Worker 内通过 `fetch('/basis_encoder.wasm')` 加载，使用 `WebAssembly.instantiate`
- 首次加载约 1–2 秒；Worker 实例复用时无需重复加载（模块级变量缓存）
- 若 Vite 打包时需引入 WASM，使用 `?url` 后缀导入路径

## 2. 后端最小化改动

### 2.1 `packages/server/src/middleware/upload.ts`

在 `fileFilter` 或 `allowedMimeTypes` 中追加：

```typescript
// 现有允许类型（示意）
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'model/gltf-binary',
  'model/gltf+json',
  'application/octet-stream',
  // 新增：
  'image/ktx2',              // KTX2 纹理（basis_universal 编码）
];
```

### 2.2 无需修改 `assetService.ts`

KTX2 文件通过 `uploadAsset(projectId, file, 'texture')` 上传，`type='texture'` 已在数据库约束中被支持。转换参数通过 `updateAsset(id, { metadata: {...} })` 写入 JSONB，无需新增字段。

### 2.3 可选：`packages/server/migrations/003_texture_ktx2_convention.sql`

```sql
-- Migration 003: KTX2 纹理 metadata 约定（无表结构变更）
-- Created: 2026-03-01

-- KTX2 纹理资产 metadata 字段约定：
-- {
--   "format": "ktx2",
--   "sourceTextureAssetId": <number>,         -- 关联原始 JPG/PNG asset.id
--   "originalDimensions": { width, height },  -- 原始图片尺寸
--   "ktx2Dimensions": { width, height },      -- 编码后尺寸（POT 后可能不同）
--   "convertSettings": { ... }                -- 完整 TextureConvertSettings
-- }

-- 原始图片 asset metadata：
-- {
--   "isSourceTexture": true,   -- 面板中隐藏（不在资产列表中显示）
--   "format": "jpg" | "png",
--   "originalName": <string>
-- }

COMMENT ON COLUMN assets.metadata IS
  'JSONB metadata: '
  '(models) format/sourceFbxAssetId/importSettings; '
  '(textures) format/sourceTextureAssetId/convertSettings/originalDimensions/ktx2Dimensions';
```

## 3. ProjectPanel.tsx 改动说明

在现有 `selectedFolder === 'textures'` 分支中：

1. 将普通文件上传 input（`accept="image/*"`）替换为 `accept=".jpg,.jpeg,.png"` 的专用 input
2. 选择文件后，不直接调用 `uploadAsset`，而是调用 `useTextureImport` 的 `handleFileSelect(file)` 触发对话框
3. 保持 KTX2 资产列表展示（`assets.filter(a => a.type === 'texture' && !a.metadata?.isSourceTexture)`）

## 4. Three.js KTX2 纹理加载

材质系统使用 `assetId` 引用纹理。加载 KTX2 时需使用 `KTX2Loader`（需 `basis_transcoder.wasm`）：

```typescript
// 在 materialFactory.ts 中，当 TextureRef.assetId 对应 KTX2 格式时：
const loader = new KTX2Loader()
  .setTranscoderPath('/basis_transcoder/')  // basis_transcoder.wasm 路径
  .detectSupport(renderer);

const texture = await loader.loadAsync(assetUrl);
texture.colorSpace = colorSpace === 'sRGB' ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
```

**注意**：`basis_encoder.wasm`（编码）和 `basis_transcoder.wasm`（解码/转码）是两个不同的 WASM 文件：
- 编码器用于 Worker 内生成 KTX2
- 转码器用于 Three.js 运行时将 KTX2 转为 GPU 支持的格式（ETC2 / BC7 / ASTC 等）

Three.js 的 `KTX2Loader` 已内置转码器（来自 `three/examples/jsm/loaders/KTX2Loader`）。

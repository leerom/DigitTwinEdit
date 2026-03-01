# Task 02 — textureWorker.ts（Web Worker 内 KTX2 编码）

## 目标

实现 `textureWorker.ts`：在 Web Worker 中接收 ImageBitmap，完成：
1. POT 缩放（OffscreenCanvas）
2. Alpha 自动检测
3. 调用 `ktx2-encoder` 完成 KTX2 编码

> **注意**：Worker 本身无法用 jsdom 环境完整测试，本 Task 只测试 Worker 导出的纯函数工具（已在 Task 01 完成），Worker 消息接口测试在 Task 03（TextureConverter）中通过 mock 覆盖。

## Files

- Create: `packages/client/src/features/textures/textureWorker.ts`

---

## Step 1: 了解 ktx2-encoder Web API（先读类型）

运行：
```bash
cat packages/client/node_modules/ktx2-encoder/types/web/index.d.ts
```

确认导出：`encodeToKTX2(imageBuffer: Uint8Array, options: IEncodeOptions): Promise<Uint8Array>`

关键 options（来自 `IEncodeOptions`）：
- `isUASTC?: boolean` — false = ETC1S（默认），true = UASTC
- `qualityLevel?: number` — ETC1S 质量 [1, 255]
- `uastcLDRQualityLevel?: number` — UASTC 质量 [0, 3]
- `isKTX2File?: boolean` — **必须 true**，否则输出 .basis 而非 .ktx2
- `generateMipmap?: boolean`
- `isSetKTX2SRGBTransferFunc?: boolean` — KTX2 DFD 中标记 sRGB
- `isPerceptual?: boolean` — 编码器视输入为 sRGB（通常与 SRGBTransferFunc 保持一致）
- `type?: SourceType` — `SourceType.RAW = 0`（原始 RGBA）
- `wasmUrl?: string` — basis_encoder.wasm 的 URL（指向 public/basis/）
- `jsUrl?: string` — basis_encoder.js 的 URL

---

## Step 2: 创建 textureWorker.ts

创建 `packages/client/src/features/textures/textureWorker.ts`：

```typescript
import { encodeToKTX2, SourceType } from 'ktx2-encoder';
import { nearestPOT, detectAlpha } from './estimateKTX2';
import type { TextureWorkerInput, TextureWorkerOutput, POTMode } from './types';

/** Worker 超时：90 秒（大图编码可能较慢） */
const TIMEOUT_MS = 90_000;

let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

function postMsg(msg: TextureWorkerOutput, transfer?: Transferable[]) {
  if (transfer) {
    self.postMessage(msg, transfer);
  } else {
    self.postMessage(msg);
  }
}

self.onmessage = async (e: MessageEvent<TextureWorkerInput>) => {
  const { imageBitmap, settings, originalWidth, originalHeight } = e.data;

  // 设置超时保护
  timeoutHandle = setTimeout(() => {
    postMsg({ type: 'error', message: '编码超时（90s），请尝试使用较小的图片或降低分辨率' });
  }, TIMEOUT_MS);

  try {
    // ─── Step 1: 计算目标尺寸 ────────────────────────────────────────────────
    postMsg({ type: 'progress', percent: 5 });
    const targetWidth  = settings.potResize
      ? nearestPOT(originalWidth,  settings.potMode)
      : originalWidth;
    const targetHeight = settings.potResize
      ? nearestPOT(originalHeight, settings.potMode)
      : originalHeight;

    // ─── Step 2: 用 OffscreenCanvas 提取 RGBA 像素数据（含 POT 缩放）─────────
    postMsg({ type: 'progress', percent: 10 });
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('OffscreenCanvas 2D context 不可用');
    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const rgbaData = new Uint8Array(imageData.data.buffer);
    imageBitmap.close(); // 释放 GPU 内存

    // ─── Step 3: 自动检测 Alpha ───────────────────────────────────────────────
    postMsg({ type: 'progress', percent: 20 });
    const hasTransparentPixels = detectAlpha(rgbaData);
    if (hasTransparentPixels && !settings.hasAlpha) {
      postMsg({ type: 'warning', code: 'DETECTED_ALPHA' });
    }

    // ─── Step 4: 调用 ktx2-encoder 编码 ──────────────────────────────────────
    postMsg({ type: 'progress', percent: 30 });

    const isSRGB = settings.colorSpace === 'sRGB';
    const isUASTC = settings.compressionMode === 'UASTC';

    const ktx2Data = await encodeToKTX2(rgbaData, {
      isUASTC,
      qualityLevel:             isUASTC ? undefined : settings.quality,
      uastcLDRQualityLevel:     isUASTC ? Math.round(settings.quality / 255 * 3) : undefined,
      isKTX2File:               true,
      generateMipmap:           settings.generateMipmaps,
      isSetKTX2SRGBTransferFunc: isSRGB,
      isPerceptual:             isSRGB,
      type:                     SourceType.RAW,
      // WASM 文件路径（由 Vite public 目录静态服务）
      wasmUrl: '/basis/basis_encoder.wasm',
      jsUrl:   '/basis/basis_encoder.js',
    });

    postMsg({ type: 'progress', percent: 90 });

    // ─── Step 5: 返回结果（Transferable 零拷贝）──────────────────────────────
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    const ktx2Buffer = ktx2Data.buffer;
    postMsg(
      { type: 'done', ktx2Buffer, finalWidth: targetWidth, finalHeight: targetHeight },
      [ktx2Buffer]
    );

  } catch (err) {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    postMsg({ type: 'error', message: (err as Error).message ?? '编码失败' });
  }
};
```

---

## Step 3: 确认 TypeScript 编译无报错

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -i "textures"
```

预期：无错误输出（或仅有未使用变量的 warning，可忽略）

如果报错 `Cannot find module 'ktx2-encoder'`，检查 `packages/client/package.json` 是否包含 `"ktx2-encoder": "^0.5.1"`，若无需手动添加：

```bash
pnpm --filter client add ktx2-encoder
```

---

## Step 4: Commit

```bash
git add packages/client/src/features/textures/textureWorker.ts
git commit -m "feat(textures): 实现 textureWorker.ts（basis_encoder WASM + POT 缩放 + Alpha 检测）"
```

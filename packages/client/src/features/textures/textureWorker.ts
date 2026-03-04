import { encodeToKTX2 } from 'ktx2-encoder';
import { nearestPOT, detectAlpha } from './estimateKTX2';
import type { TextureWorkerInput, TextureWorkerOutput } from './types';

/** Worker 超时：90 秒（大图编码可能较慢） */
const TIMEOUT_MS = 90_000;

let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

function postMsg(msg: TextureWorkerOutput, transfer?: Transferable[]) {
  if (transfer) {
    (self as unknown as Worker).postMessage(msg, transfer);
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

    // Vite dev 模式下不允许通过 import() 加载 public/ 目录下的文件。
    // 改为 fetch() 取回 JS 文本后包装成 Blob URL，Blob URL 不经过 Vite 的模块解析，可以正常动态 import。
    const encoderJsText = await fetch('/basis/basis_encoder.js').then(r => r.text());
    const jsUrl = URL.createObjectURL(
      new Blob([encoderJsText], { type: 'application/javascript' })
    );

    let ktx2Data: Uint8Array;
    try {
      ktx2Data = await encodeToKTX2(rgbaData, {
        isUASTC,
        qualityLevel:             isUASTC ? undefined : settings.quality,
        uastcLDRQualityLevel:     isUASTC ? Math.round(settings.quality / 255 * 3) : undefined,
        isKTX2File:               true,
        generateMipmap:           settings.generateMipmaps,
        isSetKTX2SRGBTransferFunc: isSRGB,
        isPerceptual:             isSRGB,
        // 直接返回已解码的 RGBA 像素，跳过库内部的 decodeImageBitmap
        imageDecoder: (buf: Uint8Array) => Promise.resolve({
          data: buf,
          width: targetWidth,
          height: targetHeight,
        }),
        jsUrl,
        wasmUrl: '/basis/basis_encoder.wasm',
      });
    } finally {
      URL.revokeObjectURL(jsUrl);
    }

    postMsg({ type: 'progress', percent: 90 });

    // ─── Step 5: 返回结果（Transferable 零拷贝）──────────────────────────────
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    // ktx2Data 是 BasisEncoder 预分配的 10MB 缓冲区的视图（byteOffset=0，byteLength=实际大小）
    // 必须 slice 出实际数据段，避免将整个 10MB 缓冲区传输给主线程
    const ktx2Buffer = ktx2Data.buffer.slice(
      ktx2Data.byteOffset,
      ktx2Data.byteOffset + ktx2Data.byteLength
    ) as ArrayBuffer;
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

import type { TextureConvertSettings, POTMode } from './types';

/**
 * 判断 n 是否为 2 的幂次方
 */
export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * 将 n 取整到最近的 2 的幂次方
 * @param n     输入值（正整数）
 * @param mode  取整方式
 */
export function nearestPOT(n: number, mode: POTMode): number {
  const log2 = Math.log2(n);
  let exp: number;
  switch (mode) {
    case 'ceil':    exp = Math.ceil(log2);  break;
    case 'floor':   exp = Math.floor(log2); break;
    case 'nearest': exp = Math.round(log2); break;
  }
  return Math.pow(2, exp);
}

/**
 * 检测 RGBA Uint8Array 中是否存在透明像素（A < 255）
 */
export function detectAlpha(data: Uint8Array): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

interface EstimateInput {
  originalWidth: number;
  originalHeight: number;
  settings: TextureConvertSettings;
}

interface EstimateResult {
  /** 考虑 POT 缩放后的目标宽度 */
  targetWidth: number;
  /** 考虑 POT 缩放后的目标高度 */
  targetHeight: number;
  /** 估算的 KTX2 文件大小（字节） */
  fileSizeBytes: number;
  /** 估算的 GPU 显存占用（字节，含 Mipmap 链） */
  vramBytes: number;
  /** 原始未压缩 RGBA 显存（字节，供对比） */
  originalVramBytes: number;
}

/**
 * 根据设置公式估算 KTX2 转换结果的文件大小和显存占用
 *
 * 估算公式依据 Basis Universal 规格：
 *  - ETC1S：约 1 bpp（0.125 bytes/pixel）
 *  - UASTC：约 8 bpp（1 byte/pixel）
 *  - Mipmap 因子：4/3（完整 mip 链约多占 33%）
 */
export function estimateKTX2(input: EstimateInput): EstimateResult {
  const { originalWidth, originalHeight, settings } = input;

  // 目标尺寸
  const targetWidth  = settings.potResize
    ? nearestPOT(originalWidth,  settings.potMode)
    : originalWidth;
  const targetHeight = settings.potResize
    ? nearestPOT(originalHeight, settings.potMode)
    : originalHeight;

  const pixels = targetWidth * targetHeight;
  const mipFactor = settings.generateMipmaps ? 4 / 3 : 1;

  // 文件大小估算（ETC1S 受 quality 轻微影响）
  const qualityScale = settings.compressionMode === 'ETC1S'
    ? (0.5 + (settings.quality / 255) * 0.5)  // quality: 0→×0.5, 255→×1.0
    : 1;
  const bitsPerPixel = settings.compressionMode === 'ETC1S' ? 1 : 8;
  const fileSizeBytes = Math.ceil(
    pixels * bitsPerPixel / 8 * qualityScale * mipFactor + 128 // 128 = KTX2 header
  );

  // GPU 显存估算（ETC1S→ETC2=4bpp; UASTC→BC7=8bpp）
  const vramBpp = settings.compressionMode === 'ETC1S' ? 0.5 : 1.0;
  const vramBytes = Math.ceil(pixels * vramBpp * mipFactor);

  // 原始 RGBA 显存（用于对比）
  const originalVramBytes = Math.ceil(
    originalWidth * originalHeight * 4 * mipFactor
  );

  return { targetWidth, targetHeight, fileSizeBytes, vramBytes, originalVramBytes };
}

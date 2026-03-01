# Task 01 — WASM 静态资源 + 类型定义 + 工具函数

## 目标

1. 将 `basis_encoder.wasm` 和 `basis_encoder.js` 复制到 `public/basis/`（供 Worker 加载）
2. 创建 `types.ts`（TextureConvertSettings 接口）
3. 创建 `estimateKTX2.ts`（POT 计算、Alpha 检测、文件大小/VRAM 估算）
4. 写单元测试覆盖所有工具函数

## Files

- Create: `packages/client/public/basis/basis_encoder.wasm`（复制，非手写）
- Create: `packages/client/public/basis/basis_encoder.js`（复制，非手写）
- Create: `packages/client/src/features/textures/types.ts`
- Create: `packages/client/src/features/textures/estimateKTX2.ts`
- Create: `packages/client/src/features/textures/__tests__/estimateKTX2.test.ts`

---

## Step 1: 复制 WASM 静态资源

```bash
mkdir -p packages/client/public/basis
cp node_modules/.pnpm/ktx2-encoder@0.5.1/node_modules/ktx2-encoder/dist/basis/basis_encoder.wasm \
   packages/client/public/basis/
cp node_modules/.pnpm/ktx2-encoder@0.5.1/node_modules/ktx2-encoder/dist/basis/basis_encoder.js \
   packages/client/public/basis/
```

验证：
```bash
ls -lh packages/client/public/basis/
```
预期输出：能看到 `basis_encoder.js`（约 600KB）和 `basis_encoder.wasm`（约 4MB）

---

## Step 2: 编写失败测试（estimateKTX2.test.ts）

创建文件 `packages/client/src/features/textures/__tests__/estimateKTX2.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import {
  nearestPOT,
  isPowerOfTwo,
  detectAlpha,
  estimateKTX2,
} from '../estimateKTX2';

// ─── nearestPOT ──────────────────────────────────────────────────────────────

describe('nearestPOT', () => {
  it('returns same value if already POT', () => {
    expect(nearestPOT(1024, 'nearest')).toBe(1024);
    expect(nearestPOT(512, 'ceil')).toBe(512);
    expect(nearestPOT(256, 'floor')).toBe(256);
  });

  it('nearest: rounds to closest power of two', () => {
    expect(nearestPOT(700, 'nearest')).toBe(512);  // closer to 512 than 1024
    expect(nearestPOT(800, 'nearest')).toBe(1024); // closer to 1024
    expect(nearestPOT(768, 'nearest')).toBe(1024); // exactly between → ceil
  });

  it('ceil: rounds up', () => {
    expect(nearestPOT(700, 'ceil')).toBe(1024);
    expect(nearestPOT(513, 'ceil')).toBe(1024);
  });

  it('floor: rounds down', () => {
    expect(nearestPOT(700, 'floor')).toBe(512);
    expect(nearestPOT(1023, 'floor')).toBe(512);
  });
});

// ─── isPowerOfTwo ─────────────────────────────────────────────────────────────

describe('isPowerOfTwo', () => {
  it('returns true for powers of two', () => {
    expect(isPowerOfTwo(1)).toBe(true);
    expect(isPowerOfTwo(64)).toBe(true);
    expect(isPowerOfTwo(1024)).toBe(true);
    expect(isPowerOfTwo(4096)).toBe(true);
  });

  it('returns false for non-powers of two', () => {
    expect(isPowerOfTwo(0)).toBe(false);
    expect(isPowerOfTwo(3)).toBe(false);
    expect(isPowerOfTwo(1000)).toBe(false);
    expect(isPowerOfTwo(1025)).toBe(false);
  });
});

// ─── detectAlpha ─────────────────────────────────────────────────────────────

describe('detectAlpha', () => {
  it('returns false when all pixels are fully opaque', () => {
    // 2 pixels: RGBA [255,0,0,255] and [0,255,0,255]
    const data = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
    expect(detectAlpha(data)).toBe(false);
  });

  it('returns true when any pixel has alpha < 255', () => {
    // Second pixel is semi-transparent
    const data = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 128]);
    expect(detectAlpha(data)).toBe(true);
  });

  it('returns true for fully transparent pixel', () => {
    const data = new Uint8Array([255, 0, 0, 0]);
    expect(detectAlpha(data)).toBe(true);
  });

  it('returns false for empty buffer', () => {
    expect(detectAlpha(new Uint8Array(0))).toBe(false);
  });
});

// ─── estimateKTX2 ────────────────────────────────────────────────────────────

describe('estimateKTX2', () => {
  it('ETC1S without mipmaps: fileSizeBytes ≈ pixels/2 (1 bpp)', () => {
    const r = estimateKTX2({
      originalWidth: 1024, originalHeight: 1024,
      settings: { compressionMode: 'ETC1S', generateMipmaps: false, quality: 255,
                  potResize: false, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    // 1024*1024 = 1M pixels, ETC1S 1bpp = 128KB
    expect(r.fileSizeBytes).toBeCloseTo(1024 * 1024 * 1 / 8, -3); // ±4KB
    // VRAM: ETC1S→ETC2 = 0.5 bytes/pixel, no mip → 1024*1024*0.5 = 512KB
    expect(r.vramBytes).toBeCloseTo(1024 * 1024 * 0.5, -3);
  });

  it('ETC1S with mipmaps: sizes scale by 4/3', () => {
    const noMip = estimateKTX2({
      originalWidth: 512, originalHeight: 512,
      settings: { compressionMode: 'ETC1S', generateMipmaps: false, quality: 200,
                  potResize: false, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    const withMip = estimateKTX2({
      originalWidth: 512, originalHeight: 512,
      settings: { compressionMode: 'ETC1S', generateMipmaps: true, quality: 200,
                  potResize: false, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    expect(withMip.vramBytes).toBeGreaterThan(noMip.vramBytes);
    expect(withMip.vramBytes).toBeCloseTo(noMip.vramBytes * (4 / 3), -2);
  });

  it('UASTC produces larger files than ETC1S', () => {
    const etc1s = estimateKTX2({
      originalWidth: 512, originalHeight: 512,
      settings: { compressionMode: 'ETC1S', generateMipmaps: false, quality: 200,
                  potResize: false, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    const uastc = estimateKTX2({
      originalWidth: 512, originalHeight: 512,
      settings: { compressionMode: 'UASTC', generateMipmaps: false, quality: 200,
                  potResize: false, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    expect(uastc.fileSizeBytes).toBeGreaterThan(etc1s.fileSizeBytes);
  });

  it('POT resize: reports scaled dimensions when potResize=true', () => {
    const r = estimateKTX2({
      originalWidth: 700, originalHeight: 500,
      settings: { compressionMode: 'ETC1S', generateMipmaps: false, quality: 200,
                  potResize: true, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    expect(r.targetWidth).toBe(512);  // nearestPOT(700) = 512
    expect(r.targetHeight).toBe(512); // nearestPOT(500) = 512
  });

  it('no POT resize: target dims equal original dims', () => {
    const r = estimateKTX2({
      originalWidth: 700, originalHeight: 500,
      settings: { compressionMode: 'ETC1S', generateMipmaps: false, quality: 200,
                  potResize: false, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    expect(r.targetWidth).toBe(700);
    expect(r.targetHeight).toBe(500);
  });
});
```

## Step 3: 运行测试，确认失败

```bash
pnpm --filter client test -- --run src/features/textures/__tests__/estimateKTX2.test.ts
```

预期输出：
```
FAIL  src/features/textures/__tests__/estimateKTX2.test.ts
  × Cannot find module '../estimateKTX2'
```

---

## Step 4: 创建 types.ts

创建 `packages/client/src/features/textures/types.ts`：

```typescript
/** POT（2 的幂次方）取整方式 */
export type POTMode = 'nearest' | 'ceil' | 'floor';

/** 压缩模式：ETC1S 文件小，UASTC 质量高 */
export type CompressionMode = 'ETC1S' | 'UASTC';

/** 纹理转换设置（用户可配置的全部参数） */
export interface TextureConvertSettings {
  /** 是否生成 Mipmap（默认 true） */
  generateMipmaps: boolean;
  /** 是否缩放到 2 的幂次方（默认 false） */
  potResize: boolean;
  /** POT 取整方式（默认 'nearest'） */
  potMode: POTMode;
  /** 压缩质量 1–255（ETC1S 专用，默认 200） */
  quality: number;
  /** 是否强制保留 Alpha 通道（默认 false，自动检测） */
  hasAlpha: boolean;
  /** 色彩空间（默认 'sRGB'；法线贴图/粗糙度贴图应选 'Linear'） */
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

/** Worker 接收的输入消息 */
export interface TextureWorkerInput {
  /** createImageBitmap 得到的 ImageBitmap（Transferable） */
  imageBitmap: ImageBitmap;
  settings: TextureConvertSettings;
  originalWidth: number;
  originalHeight: number;
}

/** Worker 发出的输出消息 */
export type TextureWorkerOutput =
  | { type: 'progress'; percent: number }
  /** Alpha 被自动检测到（settings.hasAlpha=false 时发出） */
  | { type: 'warning'; code: 'DETECTED_ALPHA' }
  | { type: 'done'; ktx2Buffer: ArrayBuffer; finalWidth: number; finalHeight: number }
  | { type: 'error'; message: string };

/** 转换进度（传递给 UI 的进度信息） */
export interface TextureConvertProgress {
  step: string;
  percent: number;
}
```

---

## Step 5: 创建 estimateKTX2.ts

创建 `packages/client/src/features/textures/estimateKTX2.ts`：

```typescript
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
```

---

## Step 6: 运行测试，确认通过

```bash
pnpm --filter client test -- --run src/features/textures/__tests__/estimateKTX2.test.ts
```

预期输出：
```
✓ src/features/textures/__tests__/estimateKTX2.test.ts (12 tests)
Test Files  1 passed
Tests       12 passed
```

---

## Step 7: Commit

```bash
git add packages/client/public/basis/ \
        packages/client/src/features/textures/types.ts \
        packages/client/src/features/textures/estimateKTX2.ts \
        packages/client/src/features/textures/__tests__/estimateKTX2.test.ts
git commit -m "feat(textures): 添加 KTX2 类型定义、估算工具函数及 basis WASM 静态资源"
```

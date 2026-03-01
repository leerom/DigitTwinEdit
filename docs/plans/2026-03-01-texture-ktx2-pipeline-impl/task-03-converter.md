# Task 03 — TextureConverter.ts（协调器）

## 目标

实现 `TextureConverter.ts`：负责文件校验、Web Worker 生命周期管理、上传原始图及 KTX2 文件到服务器，并写单元测试覆盖文件校验逻辑。

## Files

- Create: `packages/client/src/features/textures/TextureConverter.ts`
- Create: `packages/client/src/features/textures/__tests__/TextureConverter.test.ts`

---

## Step 1: 编写失败测试

创建 `packages/client/src/features/textures/__tests__/TextureConverter.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { TextureConverter } from '../TextureConverter';

describe('TextureConverter.validateFile', () => {
  const converter = new TextureConverter();

  it('passes for JPEG file', () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    expect(() => converter.validateFile(file)).not.toThrow();
  });

  it('passes for PNG file', () => {
    const file = new File(['data'], 'texture.png', { type: 'image/png' });
    expect(() => converter.validateFile(file)).not.toThrow();
  });

  it('passes for uppercase extension', () => {
    const file = new File(['data'], 'texture.PNG', { type: 'image/png' });
    expect(() => converter.validateFile(file)).not.toThrow();
  });

  it('throws for unsupported format (.webp)', () => {
    const file = new File(['data'], 'texture.webp', { type: 'image/webp' });
    expect(() => converter.validateFile(file)).toThrow('仅支持 JPG/PNG 格式');
  });

  it('throws for model file (.fbx)', () => {
    const file = new File(['data'], 'model.fbx', { type: 'application/octet-stream' });
    expect(() => converter.validateFile(file)).toThrow('仅支持 JPG/PNG 格式');
  });

  it('throws for empty file', () => {
    const file = new File([], 'texture.jpg', { type: 'image/jpeg' });
    expect(() => converter.validateFile(file)).toThrow('文件为空');
  });

  it('throws for file exceeding 50MB', () => {
    const bigFile = Object.defineProperty(
      new File(['x'], 'large.jpg', { type: 'image/jpeg' }),
      'size',
      { value: 51 * 1024 * 1024 }
    );
    expect(() => converter.validateFile(bigFile)).toThrow('文件过大');
  });
});
```

## Step 2: 运行测试，确认失败

```bash
pnpm --filter client test -- --run src/features/textures/__tests__/TextureConverter.test.ts
```

预期：
```
FAIL  Cannot find module '../TextureConverter'
```

---

## Step 3: 实现 TextureConverter.ts

创建 `packages/client/src/features/textures/TextureConverter.ts`：

```typescript
import { assetsApi } from '../../api/assets';
import type {
  TextureConvertSettings,
  TextureConvertProgress,
  TextureWorkerInput,
  TextureWorkerOutput,
} from './types';

/** 纹理文件最大支持 50MB */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Worker 编码超时：90 秒 */
const WORKER_TIMEOUT_MS = 90_000;

/**
 * 纹理转换协调器
 *
 * 负责：
 * 1. 文件校验（格式、大小）
 * 2. 启动 Web Worker 执行图像处理 + KTX2 编码
 * 3. 上传原始图（hidden）和 KTX2（显示）到服务器
 * 4. 通过 assetsApi.updateAsset 写入 metadata
 */
export class TextureConverter {
  private _currentWorker: Worker | null = null;
  private _rejectCurrentConversion: ((err: Error) => void) | null = null;

  /** 中止当前转换（Worker 阶段立即生效；上传阶段无法中止） */
  abort(): void {
    if (this._currentWorker) {
      this._currentWorker.terminate();
      this._currentWorker = null;
    }
    if (this._rejectCurrentConversion) {
      this._rejectCurrentConversion(new Error('TEXTURE_CONVERT_ABORTED'));
      this._rejectCurrentConversion = null;
    }
  }

  /**
   * 校验文件是否合法
   * @throws Error 校验失败时抛出，消息直接展示给用户
   */
  validateFile(file: File): void {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.jpg') && !name.endsWith('.jpeg') && !name.endsWith('.png')) {
      throw new Error('仅支持 JPG/PNG 格式，请转换后重新上传');
    }
    if (file.size === 0) {
      throw new Error('文件为空，请重新选择');
    }
    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / 1024 / 1024).toFixed(0);
      throw new Error(`文件过大（${mb}MB），最大支持 50MB`);
    }
  }

  /**
   * 完整转换流程：校验 → Worker 编码 → 上传原始图 → 上传 KTX2
   *
   * @returns { sourceAssetId, ktx2AssetId }
   */
  async convert(
    file: File,
    settings: TextureConvertSettings,
    projectId: number,
    onProgress: (p: TextureConvertProgress) => void
  ): Promise<{ sourceAssetId: number; ktx2AssetId: number }> {
    this.validateFile(file);

    // Step 1: 读取图像，获取原始尺寸
    onProgress({ step: '读取图像...', percent: 5 });
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    const imageBitmap = await createImageBitmap(blob);
    const originalWidth  = imageBitmap.width;
    const originalHeight = imageBitmap.height;

    // 保存原始文件 bytes（imageBitmap 不包含原始字节，单独保留）
    const sourceFile = new File([arrayBuffer], file.name, { type: file.type });

    // Step 2: Worker 编码
    const { ktx2Buffer, finalWidth, finalHeight } = await this._encodeInWorker(
      imageBitmap,
      settings,
      originalWidth,
      originalHeight,
      (workerPercent) => {
        onProgress({
          step: workerPercent < 50 ? '处理图像...' : 'KTX2 编码中...',
          percent: Math.round(5 + workerPercent * 0.65),
        });
      }
    );

    // Step 3: 上传原始图（isSourceTexture=true，面板中隐藏）
    onProgress({ step: '上传原始文件...', percent: 72 });
    const sourceAsset = await assetsApi.uploadAsset(projectId, sourceFile, 'texture');
    await assetsApi.updateAsset(sourceAsset.id, {
      metadata: {
        isSourceTexture: true,
        format: file.name.toLowerCase().endsWith('.png') ? 'png' : 'jpg',
        originalName: file.name,
      },
    });

    // Step 4: 上传 KTX2
    onProgress({ step: '上传 KTX2 文件...', percent: 85 });
    const baseName = file.name.replace(/\.(jpg|jpeg|png)$/i, '');
    const ktx2File = new File([ktx2Buffer], `${baseName}.ktx2`, { type: 'image/ktx2' });
    const ktx2Asset = await assetsApi.uploadAsset(projectId, ktx2File, 'texture');
    await assetsApi.updateAsset(ktx2Asset.id, {
      metadata: {
        format: 'ktx2',
        sourceTextureAssetId: sourceAsset.id,
        originalDimensions: { width: originalWidth, height: originalHeight },
        ktx2Dimensions: { width: finalWidth, height: finalHeight },
        convertSettings: settings,
      },
    });

    onProgress({ step: '转换完成', percent: 100 });
    return { sourceAssetId: sourceAsset.id, ktx2AssetId: ktx2Asset.id };
  }

  /**
   * 在 Web Worker 中执行图像处理 + KTX2 编码
   * 内部管理 Worker 生命周期：启动、超时、终止
   */
  private _encodeInWorker(
    imageBitmap: ImageBitmap,
    settings: TextureConvertSettings,
    originalWidth: number,
    originalHeight: number,
    onProgress: (percent: number) => void
  ): Promise<{ ktx2Buffer: ArrayBuffer; finalWidth: number; finalHeight: number }> {
    return new Promise((resolve, reject) => {
      this._rejectCurrentConversion = reject;

      const worker = new Worker(
        new URL('./textureWorker.ts', import.meta.url),
        { type: 'module' }
      );
      this._currentWorker = worker;

      const timeout = setTimeout(() => {
        this._currentWorker = null;
        this._rejectCurrentConversion = null;
        worker.terminate();
        reject(new Error('编码超时，请缩小图片后重试'));
      }, WORKER_TIMEOUT_MS);

      worker.onmessage = (e: MessageEvent<TextureWorkerOutput>) => {
        const msg = e.data;
        switch (msg.type) {
          case 'progress':
            onProgress(msg.percent);
            break;
          case 'warning':
            // DETECTED_ALPHA：记录日志，由外层 UI 决定是否提示用户
            console.warn('[TextureConverter] Alpha channel detected automatically');
            break;
          case 'done':
            clearTimeout(timeout);
            this._currentWorker = null;
            this._rejectCurrentConversion = null;
            worker.terminate();
            resolve({ ktx2Buffer: msg.ktx2Buffer, finalWidth: msg.finalWidth, finalHeight: msg.finalHeight });
            break;
          case 'error':
            clearTimeout(timeout);
            this._currentWorker = null;
            this._rejectCurrentConversion = null;
            worker.terminate();
            reject(new Error(msg.message));
            break;
        }
      };

      worker.onerror = (e: ErrorEvent) => {
        clearTimeout(timeout);
        this._currentWorker = null;
        this._rejectCurrentConversion = null;
        worker.terminate();
        reject(new Error(e.message || '编码器初始化失败'));
      };

      const input: TextureWorkerInput = { imageBitmap, settings, originalWidth, originalHeight };
      worker.postMessage(input, [imageBitmap]);
    });
  }
}

/** 单例，整个应用共用 */
export const textureConverter = new TextureConverter();
```

---

## Step 4: 运行测试，确认通过

```bash
pnpm --filter client test -- --run src/features/textures/__tests__/TextureConverter.test.ts
```

预期：
```
✓ src/features/textures/__tests__/TextureConverter.test.ts (7 tests)
Test Files  1 passed
Tests       7 passed
```

---

## Step 5: 运行全量测试，确认无回归

```bash
pnpm --filter client test -- --run
```

预期：所有已有测试通过，新增 19 个（Task 01 + 03 合计）。

---

## Step 6: Commit

```bash
git add packages/client/src/features/textures/TextureConverter.ts \
        packages/client/src/features/textures/__tests__/TextureConverter.test.ts
git commit -m "feat(textures): 实现 TextureConverter.ts（文件校验、Worker 管理、双文件上传）"
```

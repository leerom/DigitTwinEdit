import { assetsApi } from '../../api/assets';
import type { Asset } from '@digittwinedit/shared';
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
   * 重新导入纹理：下载源 PNG → 重新编码 → 原地替换 KTX2 文件（保持 assetId 不变）
   *
   * @param ktx2Asset  需要重新导入的 KTX2 资产（asset.mime_type === 'image/ktx2'）
   * @param newSettings 新的转换参数
   * @param onProgress  进度回调
   * @returns 更新后的 Asset
   */
  async reimport(
    ktx2Asset: Asset,
    newSettings: TextureConvertSettings,
    onProgress: (p: TextureConvertProgress) => void
  ): Promise<Asset> {
    const metadata = ktx2Asset.metadata as Record<string, unknown> | undefined;
    const sourceTextureAssetId = metadata?.sourceTextureAssetId as number | undefined;

    if (!sourceTextureAssetId) {
      throw new Error('该贴图没有关联的源文件，无法重新导入');
    }

    // Step 1: 下载源 PNG/JPG（需 session cookie）
    onProgress({ step: '下载源文件...', percent: 5 });
    const downloadUrl = assetsApi.getAssetDownloadUrl(sourceTextureAssetId);
    const resp = await fetch(downloadUrl, { credentials: 'include' });
    if (!resp.ok) {
      throw new Error(`源文件下载失败（HTTP ${resp.status}）`);
    }
    const blob = await resp.blob();
    if (blob.size === 0) {
      throw new Error('源文件为空，无法重新导入。请删除此贴图并重新导入。');
    }

    // Step 2: 读取图像尺寸
    onProgress({ step: '读取图像...', percent: 8 });
    const imageBitmap = await createImageBitmap(blob);
    const originalWidth = imageBitmap.width;
    const originalHeight = imageBitmap.height;

    // Step 3: Worker 重新编码（进度 8%→80%）
    const { ktx2Buffer, finalWidth, finalHeight } = await this._encodeInWorker(
      imageBitmap,
      newSettings,
      originalWidth,
      originalHeight,
      (workerPercent) => {
        onProgress({
          step: workerPercent < 50 ? '处理图像...' : 'KTX2 编码中...',
          percent: Math.round(8 + workerPercent * 0.72),
        });
      }
    );

    // Step 4: 原地替换 KTX2 文件（保持 assetId 不变）
    onProgress({ step: '上传新 KTX2...', percent: 82 });
    const originalName = (metadata?.originalName as string | undefined) ?? ktx2Asset.name;
    const baseName = originalName.replace(/\.(jpg|jpeg|png)$/i, '');
    const ktx2Name = ktx2Asset.name.endsWith('.ktx2') ? ktx2Asset.name : `${baseName}.ktx2`;
    const newKtx2File = new File([ktx2Buffer], ktx2Name, { type: 'image/ktx2' });

    await assetsApi.replaceAssetFile(
      ktx2Asset.id,
      newKtx2File,
      (e: any) => {
        const pct = e.progress != null ? e.progress : e.loaded / (e.total || 1);
        onProgress({
          step: '上传新 KTX2...',
          percent: Math.round(82 + pct * 12),
        });
      }
    );

    // Step 5: 更新 metadata（保留现有字段，仅更新 convertSettings + dimensions）
    onProgress({ step: '保存配置...', percent: 96 });
    const updatedAsset = await assetsApi.updateAsset(ktx2Asset.id, {
      metadata: {
        ...(metadata as Record<string, unknown>),
        convertSettings: newSettings,
        ktx2Dimensions: { width: finalWidth, height: finalHeight },
      },
    });

    onProgress({ step: '重新导入完成', percent: 100 });
    return updatedAsset;
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

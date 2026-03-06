import type { Asset } from '@digittwinedit/shared';
import { assetsApi } from '../../api/assets';
import type { IBLConvertProgress, IBLConvertSettings, IBLWorkerInput, IBLWorkerOutput } from './types';

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const WORKER_TIMEOUT_MS = 180_000;

interface IBLWorkerResult {
  previewFile: File;
  runtimeFile: File;
  originalWidth: number;
  originalHeight: number;
  runtimeWidth: number;
  runtimeHeight: number;
  originalFormat: 'hdr' | 'exr';
}

export type { IBLConvertProgress, IBLConvertSettings } from './types';

export class IBLConverter {
  private _currentWorker: Worker | null = null;
  private _rejectCurrentConversion: ((err: Error) => void) | null = null;

  abort(): void {
    if (this._currentWorker) {
      this._currentWorker.terminate();
      this._currentWorker = null;
    }
    if (this._rejectCurrentConversion) {
      this._rejectCurrentConversion(new Error('IBL_CONVERT_ABORTED'));
      this._rejectCurrentConversion = null;
    }
  }

  validateFile(file: File): void {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.hdr') && !name.endsWith('.exr')) {
      throw new Error('仅支持 HDR/EXR 格式，请转换后重新上传');
    }
    if (file.size === 0) {
      throw new Error('文件为空，请重新选择');
    }
    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / 1024 / 1024).toFixed(0);
      throw new Error(`文件过大（${mb}MB），最大支持 200MB`);
    }
  }

  async convert(
    file: File,
    settings: IBLConvertSettings,
    projectId: number,
    onProgress: (progress: IBLConvertProgress) => void
  ): Promise<{ sourceAssetId: number; previewAssetId: number; runtimeAssetId: number }> {
    this.validateFile(file);

    const result = await this._convertInWorker(file, settings, (workerProgress) => {
      onProgress({
        step: workerProgress.percent < 60 ? '解析 HDR/EXR...' : '生成预览与 KTX2...',
        percent: Math.round(5 + workerProgress.percent * 0.65),
      });
    });

    onProgress({ step: '上传原始文件...', percent: 72 });
    const sourceAsset = await assetsApi.uploadAsset(projectId, file, 'texture');
    await assetsApi.updateAsset(sourceAsset.id, {
      metadata: {
        usage: 'ibl',
        isSourceEnvironment: true,
        originalFormat: result.originalFormat,
      },
    });

    onProgress({ step: '上传预览图...', percent: 82 });
    const previewAsset = await assetsApi.uploadAsset(projectId, result.previewFile, 'texture');

    onProgress({ step: '上传 KTX2 文件...', percent: 90 });
    const runtimeAsset = await assetsApi.uploadAsset(projectId, result.runtimeFile, 'texture');

    await assetsApi.updateAsset(runtimeAsset.id, {
      metadata: {
        usage: 'ibl',
        format: 'ktx2',
        sourceEnvironmentAssetId: sourceAsset.id,
        previewAssetId: previewAsset.id,
        originalFormat: result.originalFormat,
        originalDimensions: { width: result.originalWidth, height: result.originalHeight },
        runtimeDimensions: { width: result.runtimeWidth, height: result.runtimeHeight },
        convertSettings: settings,
      },
    });

    await assetsApi.updateAsset(previewAsset.id, {
      metadata: {
        usage: 'ibl',
        isEnvironmentPreview: true,
        runtimeAssetId: runtimeAsset.id,
      },
    });

    onProgress({ step: '导入完成', percent: 100 });

    return {
      sourceAssetId: sourceAsset.id,
      previewAssetId: previewAsset.id,
      runtimeAssetId: runtimeAsset.id,
    };
  }

  async reimport(
    runtimeAsset: Asset,
    settings: IBLConvertSettings,
    onProgress: (progress: IBLConvertProgress) => void
  ): Promise<Asset> {
    const metadata = runtimeAsset.metadata as Record<string, unknown> | undefined;
    const sourceEnvironmentAssetId = metadata?.sourceEnvironmentAssetId as number | undefined;
    const previewAssetId = metadata?.previewAssetId as number | undefined;
    const originalFormat = metadata?.originalFormat === 'exr' ? 'exr' : 'hdr';

    if (!sourceEnvironmentAssetId || !previewAssetId) {
      throw new Error('该环境贴图缺少关联源文件或预览图，无法重新导入');
    }

    onProgress({ step: '下载源文件...', percent: 5 });
    const response = await fetch(assetsApi.getAssetDownloadUrl(sourceEnvironmentAssetId), { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`源文件下载失败（HTTP ${response.status}）`);
    }
    const sourceBlob = await response.blob();
    if (sourceBlob.size === 0) {
      throw new Error('源文件为空，无法重新导入。请删除此环境贴图并重新导入。');
    }

    const sourceFileName = runtimeAsset.name.replace(/\.ktx2$/i, `.${originalFormat}`);
    const sourceFile = new File([sourceBlob], sourceFileName, {
      type: sourceBlob.type || 'application/octet-stream',
    });

    const result = await this._convertInWorker(sourceFile, settings, (workerProgress) => {
      onProgress({
        step: workerProgress.percent < 60 ? '解析 HDR/EXR...' : '生成预览与 KTX2...',
        percent: Math.round(8 + workerProgress.percent * 0.72),
      });
    });

    onProgress({ step: '上传预览图...', percent: 82 });
    await assetsApi.replaceAssetFile(previewAssetId, result.previewFile);

    onProgress({ step: '上传 KTX2 文件...', percent: 92 });
    await assetsApi.replaceAssetFile(runtimeAsset.id, result.runtimeFile);

    onProgress({ step: '保存配置...', percent: 96 });
    const updatedAsset = await assetsApi.updateAsset(runtimeAsset.id, {
      metadata: {
        ...(metadata ?? {}),
        usage: 'ibl',
        format: 'ktx2',
        sourceEnvironmentAssetId,
        previewAssetId,
        originalFormat: result.originalFormat,
        originalDimensions: { width: result.originalWidth, height: result.originalHeight },
        runtimeDimensions: { width: result.runtimeWidth, height: result.runtimeHeight },
        convertSettings: settings,
      },
    });

    onProgress({ step: '重新导入完成', percent: 100 });
    return updatedAsset;
  }

  protected async _convertInWorker(
    file: File,
    settings: IBLConvertSettings,
    onProgress: (progress: IBLConvertProgress) => void
  ): Promise<IBLWorkerResult> {
    const arrayBuffer = await file.arrayBuffer();
    const baseName = file.name.replace(/\.(hdr|exr)$/i, '');

    return new Promise((resolve, reject) => {
      this._rejectCurrentConversion = reject;

      const worker = new Worker(new URL('./iblWorker.ts', import.meta.url), { type: 'module' });
      this._currentWorker = worker;

      const timeout = setTimeout(() => {
        this._currentWorker = null;
        this._rejectCurrentConversion = null;
        worker.terminate();
        reject(new Error('HDR/EXR 转换超时，请重试或使用更小的文件'));
      }, WORKER_TIMEOUT_MS);

      worker.onmessage = (event: MessageEvent<IBLWorkerOutput>) => {
        const message = event.data;

        switch (message.type) {
          case 'progress':
            onProgress({ step: '', percent: message.percent });
            break;
          case 'done': {
            clearTimeout(timeout);
            this._currentWorker = null;
            this._rejectCurrentConversion = null;
            worker.terminate();

            const previewFile = new File([message.previewBuffer], `${baseName}.preview.png`, { type: 'image/png' });
            const runtimeFile = new File([message.runtimeBuffer], `${baseName}.ktx2`, { type: 'image/ktx2' });

            resolve({
              previewFile,
              runtimeFile,
              originalWidth: message.originalWidth,
              originalHeight: message.originalHeight,
              runtimeWidth: message.runtimeWidth,
              runtimeHeight: message.runtimeHeight,
              originalFormat: message.originalFormat,
            });
            break;
          }
          case 'error':
            clearTimeout(timeout);
            this._currentWorker = null;
            this._rejectCurrentConversion = null;
            worker.terminate();
            reject(new Error(message.message));
            break;
        }
      };

      worker.onerror = (event: ErrorEvent) => {
        clearTimeout(timeout);
        this._currentWorker = null;
        this._rejectCurrentConversion = null;
        worker.terminate();
        reject(new Error(event.message || 'IBL 转换器初始化失败'));
      };

      const input: IBLWorkerInput = {
        fileBuffer: arrayBuffer,
        fileName: file.name,
        settings,
      };
      worker.postMessage(input, [arrayBuffer]);
    });
  }
}

export const iblConverter = new IBLConverter();

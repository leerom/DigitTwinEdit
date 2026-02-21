import { assetsApi } from '../../api/assets';
import type { Asset } from '@digittwinedit/shared';
import type { FBXImportSettings, ImportProgress } from './types';

/** FBX 文件最大支持 500MB */
const MAX_FILE_SIZE = 500 * 1024 * 1024;

/** Worker 处理超时：60 秒 */
const WORKER_TIMEOUT_MS = 60_000;

/**
 * FBX 导入协调器
 *
 * 负责：
 * 1. 文件校验（后缀名、大小）
 * 2. 启动 Web Worker 执行 FBX → GLB 转换
 * 3. 将 FBX（原始）和 GLB（转换后）上传到服务器
 * 4. 通过 updateAsset 写入元数据（导入配置、FBX↔GLB 关联）
 */
export class FBXImporter {
  /**
   * 校验 FBX 文件合法性
   * 抛出 Error 表示校验失败（错误信息直接显示给用户）
   */
  validateFile(file: File): void {
    if (!file.name.toLowerCase().endsWith('.fbx')) {
      throw new Error('仅支持 FBX 格式文件');
    }
    if (file.size === 0) {
      throw new Error('文件为空，请重新选择');
    }
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(0);
      throw new Error(`文件过大（${sizeMB}MB），最大支持 500MB`);
    }
  }

  /**
   * 完整的 FBX 导入流程
   *
   * @param file - 用户选择的 FBX 文件
   * @param settings - 导入配置（来自 FBXImportDialog）
   * @param projectId - 上传到哪个项目
   * @param onProgress - 进度回调，用于更新 UI
   * @returns { fbxAssetId, glbAssetId } 两个资产的 ID
   */
  async import(
    file: File,
    settings: FBXImportSettings,
    projectId: number,
    onProgress: (progress: ImportProgress) => void
  ): Promise<{ fbxAssetId: number; glbAssetId: number }> {
    // 校验文件
    this.validateFile(file);

    // Step 1: 读取为 ArrayBuffer
    onProgress({ step: '读取文件...', percent: 5 });
    const fbxBuffer = await file.arrayBuffer();

    // Step 2: Worker 转换 FBX → GLB
    // Worker 内部进度 0-100 映射到总进度 5% ~ 65%
    const glbBuffer = await this.convertInWorker(
      fbxBuffer,
      settings,
      (workerPercent) => {
        onProgress({
          step: workerPercent < 50 ? '解析 FBX...' : '转换 GLB...',
          percent: Math.round(5 + workerPercent * 0.6),
        });
      }
    );

    // Step 3: 上传原始 FBX（存档用，不在面板显示）
    onProgress({ step: '上传原始文件...', percent: 70 });
    const fbxFile = new File([fbxBuffer], file.name, {
      type: 'application/octet-stream',
    });
    const fbxAsset = await assetsApi.uploadAsset(projectId, fbxFile, 'model');
    // 写入 FBX 标记元数据（isSourceFbx=true 让面板过滤掉它）
    await assetsApi.updateAsset(fbxAsset.id, {
      metadata: {
        isSourceFbx: true,
        format: 'fbx',
        originalName: file.name,
      },
    });

    // Step 4: 上传 GLB（这是面板里显示的那个）
    onProgress({ step: '上传模型文件...', percent: 85 });
    const ext = settings.saveFormat === 'gltf' ? '.gltf' : '.glb';
    const glbName = file.name.replace(/\.fbx$/i, ext);
    const glbMime =
      settings.saveFormat === 'gltf' ? 'model/gltf+json' : 'model/gltf-binary';
    const glbFile = new File([glbBuffer], glbName, { type: glbMime });
    const glbAsset = await assetsApi.uploadAsset(projectId, glbFile, 'model');
    // 写入 GLB 元数据（关联到原始 FBX + 保存导入配置）
    await assetsApi.updateAsset(glbAsset.id, {
      metadata: {
        format: settings.saveFormat,
        sourceFbxAssetId: fbxAsset.id,
        importSettings: settings,
      },
    });

    onProgress({ step: '导入完成', percent: 100 });
    return { fbxAssetId: fbxAsset.id, glbAssetId: glbAsset.id };
  }

  /**
   * 使用原始 FBX 和新的配置重新导入
   *
   * 流程：
   * 1. 从服务器下载原始 FBX
   * 2. Worker 重新转换（使用新配置）
   * 3. 原地替换 GLB 文件（保持 asset.id 不变）
   * 4. 更新 metadata.importSettings
   */
  async reimport(
    projectId: number,
    glbAsset: Asset,
    newSettings: FBXImportSettings,
    onProgress: (progress: ImportProgress) => void
  ): Promise<Asset> {
    const metadata = glbAsset.metadata as Record<string, unknown> | undefined;
    const sourceFbxAssetId = metadata?.sourceFbxAssetId as number | undefined;

    if (!sourceFbxAssetId) {
      throw new Error('该资产没有关联的源 FBX 文件，无法重新导入');
    }

    // Step 1: 下载原始 FBX
    onProgress({ step: '下载源 FBX...', percent: 5 });
    const downloadUrl = assetsApi.getAssetDownloadUrl(sourceFbxAssetId);
    const fbxResponse = await fetch(downloadUrl, { credentials: 'include' });
    if (!fbxResponse.ok) {
      throw new Error(`源 FBX 下载失败（HTTP ${fbxResponse.status}）`);
    }
    const fbxBuffer = await fbxResponse.arrayBuffer();

    // Step 2: Worker 重新转换（进度 5%~65%）
    const glbBuffer = await this.convertInWorker(
      fbxBuffer,
      newSettings,
      (workerPercent) => {
        onProgress({
          step: workerPercent < 50 ? '解析 FBX...' : '转换 GLB...',
          percent: Math.round(5 + workerPercent * 0.6),
        });
      }
    );

    // Step 3: 原地替换 GLB 文件（asset.id 不变）
    onProgress({ step: '上传新模型...', percent: 70 });
    const ext = newSettings.saveFormat === 'gltf' ? '.gltf' : '.glb';
    const glbName = glbAsset.name.replace(/\.(glb|gltf)$/i, ext) || glbAsset.name;
    const glbMime =
      newSettings.saveFormat === 'gltf' ? 'model/gltf+json' : 'model/gltf-binary';
    const newGlbFile = new File([glbBuffer], glbName, { type: glbMime });

    await assetsApi.replaceAssetFile(
      glbAsset.id,
      newGlbFile,
      (e) => {
        const pct = e.progress != null ? e.progress : e.loaded / (e.total || 1);
        onProgress({
          step: '上传新模型...',
          percent: Math.round(70 + pct * 20),
        });
      }
    );

    // Step 4: 更新元数据（保留 sourceFbxAssetId，更新 importSettings）
    onProgress({ step: '保存配置...', percent: 95 });
    const updatedAsset = await assetsApi.updateAsset(glbAsset.id, {
      metadata: {
        ...(metadata as Record<string, unknown>),
        importSettings: newSettings,
        format: newSettings.saveFormat,
      },
    });

    onProgress({ step: '重新导入完成', percent: 100 });
    return updatedAsset;
  }

  /**
   * 在 Web Worker 中执行 FBX → GLB 转换
   * 内部管理 Worker 生命周期：启动、超时、终止
   */
  private convertInWorker(
    fbxBuffer: ArrayBuffer,
    settings: FBXImportSettings,
    onProgress: (percent: number) => void
  ): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      // 使用 Vite 的 ES Module Worker 语法
      const worker = new Worker(
        new URL('./fbxWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // 超时保护
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('导入超时，请尝试优化文件后重新导入'));
      }, WORKER_TIMEOUT_MS);

      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          onProgress(msg.percent as number);
        } else if (msg.type === 'done') {
          clearTimeout(timeout);
          worker.terminate();
          resolve(msg.glbBuffer as ArrayBuffer);
        } else if (msg.type === 'error') {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(msg.message as string));
        }
      };

      worker.onerror = (e: ErrorEvent) => {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error(e.message || '文件解析失败，请检查文件完整性'));
      };

      // 将 fbxBuffer 转移给 Worker（零拷贝，主线程不再持有）
      worker.postMessage({ fbxBuffer, settings }, [fbxBuffer]);
    });
  }
}

/** 单例，整个应用共用 */
export const fbxImporter = new FBXImporter();

# 任务 1.5：FBXImporter 协调器

**Files:**
- Create: `packages/client/src/features/fbx/FBXImporter.ts`
- Create: `packages/client/src/features/fbx/__tests__/FBXImporter.test.ts`

**依赖：** 任务 1.1（types.ts）、任务 1.3（fbxWorker.ts）

**背景：**
- `FBXImporter` 是整个导入流程的协调器，负责：文件校验、Worker 生命周期、两次 API 上传
- 上传使用现有的 `assetsApi`（`packages/client/src/api/assets.ts`）
- 上传完成后用 `assetsApi.updateAsset` 写入元数据

---

### Step 1：写失败测试

创建 `packages/client/src/features/fbx/__tests__/FBXImporter.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FBXImporter } from '../FBXImporter';
import type { FBXImportSettings } from '../types';
import { DEFAULT_FBX_IMPORT_SETTINGS } from '../types';

// 只测试可以单元测试的部分：validateFile
// Worker 和 API 调用需要集成测试（手动测试）

describe('FBXImporter.validateFile', () => {
  const importer = new FBXImporter();

  it('passes for valid .fbx file under 500MB', () => {
    const file = new File(['content'], 'model.fbx', {
      type: 'application/octet-stream',
    });
    expect(() => importer.validateFile(file)).not.toThrow();
  });

  it('passes for uppercase .FBX extension', () => {
    const file = new File(['content'], 'model.FBX', {
      type: 'application/octet-stream',
    });
    expect(() => importer.validateFile(file)).not.toThrow();
  });

  it('throws for non-fbx file', () => {
    const file = new File(['content'], 'model.glb', {
      type: 'model/gltf-binary',
    });
    expect(() => importer.validateFile(file)).toThrow('仅支持 FBX 格式文件');
  });

  it('throws for empty file', () => {
    const file = new File([], 'model.fbx', {
      type: 'application/octet-stream',
    });
    expect(() => importer.validateFile(file)).toThrow('文件为空');
  });

  it('throws for file exceeding 500MB', () => {
    // 创建超大文件（只改 size 属性，不实际分配内存）
    const file = Object.defineProperty(
      new File(['x'], 'huge.fbx'),
      'size',
      { value: 501 * 1024 * 1024 }
    );
    expect(() => importer.validateFile(file)).toThrow('文件过大');
  });
});
```

### Step 2：运行测试确认失败

```bash
pnpm --filter client test --run packages/client/src/features/fbx/__tests__/FBXImporter.test.ts
```

预期：FAIL，报错 `Cannot find module '../FBXImporter'`

---

### Step 3：实现 FBXImporter

创建 `packages/client/src/features/fbx/FBXImporter.ts`：

```typescript
import { assetsApi } from '../../api/assets';
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
```

---

### Step 4：运行测试确认通过

```bash
pnpm --filter client test --run packages/client/src/features/fbx/__tests__/FBXImporter.test.ts
```

预期：5 个测试全部通过 (PASS)

**常见问题：**

问题：`Object.defineProperty` 修改 `file.size` 不生效
→ 改用以下方式创建测试用超大文件：
```typescript
const largeFile = {
  name: 'huge.fbx',
  size: 501 * 1024 * 1024,
  type: 'application/octet-stream',
} as File;
```

---

### Step 5：运行全部测试确认无回归

```bash
pnpm --filter client test --run
```

预期：所有之前通过的测试仍然通过。

---

### Step 6：提交

```bash
git add packages/client/src/features/fbx/FBXImporter.ts \
        packages/client/src/features/fbx/__tests__/FBXImporter.test.ts
git commit -m "feat(fbx): add FBXImporter orchestrator with file validation and upload"
```

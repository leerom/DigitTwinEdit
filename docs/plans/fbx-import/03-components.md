# 03 - 关键组件设计细节

## 1. FBXImportDialog 对话框

### UI 布局

```
┌──────────────────────────────────────────┐
│  导入 FBX 模型                           │
│  文件：building.fbx                       │
├──────────────────────────────────────────┤
│  ▼ 场景                                  │
│    缩放比例    [  1.0  ]                  │
│    转换单位    [✓] 1cm → 0.01m           │
├──────────────────────────────────────────┤
│  ▼ 几何                                  │
│    法线        [导入法线      ▼]          │
│    法线模式    [面积和顶角加权 ▼] (禁用)  │
├──────────────────────────────────────────┤
│  ▼ 保存                                  │
│    保存格式    [.glb           ▼]         │
│    嵌入资源    [✓]                        │
├──────────────────────────────────────────┤
│                     [取消]  [导 入]       │
└──────────────────────────────────────────┘
```

### 法线模式联动逻辑

```ts
// 当 normals === 'import' 时，normalsMode 选择器 disabled
<select
  value={settings.normalsMode}
  disabled={settings.normals !== 'calculate'}
  onChange={...}
>
```

### 默认值

```ts
const DEFAULT_FBX_IMPORT_SETTINGS: FBXImportSettings = {
  scale: 1.0,
  convertUnits: true,
  normals: 'import',
  normalsMode: 'areaAndAngle',
  saveFormat: 'glb',
  embedTextures: true,
};
```

---

## 2. fbxWorker.ts 实现细节

### Worker 文件结构

```ts
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { fbxBuffer, settings } = e.data;

  try {
    // Step 1: 解析 FBX
    self.postMessage({ type: 'progress', percent: 10 });
    const loader = new FBXLoader();
    const group = loader.parse(fbxBuffer, '');  // 第二个参数是资源路径，留空

    // Step 2: 应用缩放
    self.postMessage({ type: 'progress', percent: 30 });
    const scaleFactor = settings.convertUnits
      ? settings.scale * 0.01  // 1cm → 0.01m
      : settings.scale;
    group.scale.setScalar(scaleFactor);

    // Step 3: 应用法线计算
    self.postMessage({ type: 'progress', percent: 50 });
    if (settings.normals === 'calculate') {
      applyNormals(group, settings.normalsMode);
    }

    // Step 4: 导出 GLB
    self.postMessage({ type: 'progress', percent: 70 });
    const exporter = new GLTFExporter();
    const glbBuffer = await exporter.parseAsync(group, {
      binary: true,
      embedImages: settings.embedTextures,
    }) as ArrayBuffer;

    self.postMessage({ type: 'progress', percent: 100 });
    self.postMessage({ type: 'done', glbBuffer }, [glbBuffer]);

  } catch (err) {
    const message = err instanceof Error ? err.message : '转换失败';
    self.postMessage({ type: 'error', message });
  }
};

function applyNormals(
  object: THREE.Object3D,
  mode: NormalsModeOption
): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry as THREE.BufferGeometry;
      // 根据 mode 选择计算权重
      switch (mode) {
        case 'unweighted':
          geometry.computeVertexNormals();  // Three.js 默认
          break;
        case 'areaWeighted':
        case 'angleWeighted':
        case 'areaAndAngle':
          geometry.computeVertexNormals();  // 简化实现，后续可精细化
          break;
      }
    }
  });
}
```

### Web Worker 实例化方式（Vite 支持）

```ts
// FBXImporter.ts 中
const worker = new Worker(
  new URL('./fbxWorker.ts', import.meta.url),
  { type: 'module' }
);
```

> Vite 支持 `{ type: 'module' }` Web Worker，会自动处理 ES module 依赖。

---

## 3. FBXImporter.ts 完整流程

```ts
export class FBXImporter {
  private static readonly TIMEOUT_MS = 60_000;

  async import(
    file: File,
    settings: FBXImportSettings,
    projectId: number,
    onProgress: (step: string, percent: number) => void
  ): Promise<{ fbxAssetId: number; glbAssetId: number }> {

    // 1. 校验文件
    this.validateFile(file);

    // 2. 读取为 ArrayBuffer
    onProgress('读取文件', 5);
    const fbxBuffer = await file.arrayBuffer();

    // 3. Web Worker 转换
    const glbBuffer = await this.convertInWorker(
      fbxBuffer,
      settings,
      (percent) => onProgress('转换中', percent * 0.6 + 5) // 5% ~ 65%
    );

    // 4. 上传 FBX 原始文件
    onProgress('上传原始文件', 70);
    const fbxFile = new File([fbxBuffer], file.name, { type: 'application/octet-stream' });
    const fbxAsset = await uploadAsset(projectId, fbxFile, 'model', {
      isSourceFbx: true,
      format: 'fbx',
      originalName: file.name,
    });

    // 5. 上传 GLB 转换文件
    onProgress('上传模型文件', 85);
    const glbName = file.name.replace(/\.fbx$/i, '.glb');
    const glbFile = new File([glbBuffer], glbName, { type: 'model/gltf-binary' });
    const glbAsset = await uploadAsset(projectId, glbFile, 'model', {
      format: settings.saveFormat,
      sourceFbxAssetId: fbxAsset.id,
      importSettings: settings,
    });

    onProgress('完成', 100);
    return { fbxAssetId: fbxAsset.id, glbAssetId: glbAsset.id };
  }

  private validateFile(file: File): void {
    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    if (!file.name.toLowerCase().endsWith('.fbx')) {
      throw new Error('仅支持 FBX 格式文件');
    }
    if (file.size > MAX_SIZE) {
      throw new Error(`文件过大（${(file.size / 1024 / 1024).toFixed(0)}MB），最大支持 500MB`);
    }
  }

  private convertInWorker(
    fbxBuffer: ArrayBuffer,
    settings: FBXImportSettings,
    onProgress: (percent: number) => void
  ): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('./fbxWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // 超时保护
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('导入超时，请尝试优化文件后重新导入'));
      }, FBXImporter.TIMEOUT_MS);

      worker.onmessage = (e) => {
        const msg = e.data as WorkerOutput;
        if (msg.type === 'progress') {
          onProgress(msg.percent);
        } else if (msg.type === 'done') {
          clearTimeout(timeout);
          worker.terminate();
          resolve(msg.glbBuffer);
        } else if (msg.type === 'error') {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(msg.message));
        }
      };

      worker.onerror = (e) => {
        clearTimeout(timeout);
        reject(new Error(e.message || '文件解析失败'));
      };

      worker.postMessage({ fbxBuffer, settings }, [fbxBuffer]);
    });
  }
}
```

---

## 4. ModelImportProp（Inspector 区域）

### UI 布局

```
┌──────────────────────────────────────────┐
│  模型导入设置                             │
├──────────────────────────────────────────┤
│  来源文件                                 │
│  building.fbx                  [下载原始] │
├──────────────────────────────────────────┤
│  场景                                     │
│    缩放比例    [ 1.0 ]                    │
│    转换单位    [✓]                        │
├──────────────────────────────────────────┤
│  几何                                     │
│    法线        [导入法线      ▼]          │
│    法线模式    [──────────── ▼] (禁用)   │
├──────────────────────────────────────────┤
│  保存                                     │
│    格式        [.glb          ▼]          │
│    嵌入资源    [✓]                        │
├──────────────────────────────────────────┤
│  [设置已修改 ●]         [重新导入]        │
└──────────────────────────────────────────┘
```

### 重新导入流程

```ts
const handleReimport = async () => {
  const sourceFbxId = asset.metadata?.sourceFbxAssetId;
  if (!sourceFbxId) return;

  setIsReimporting(true);
  try {
    // 1. 下载原始 FBX
    const fbxBuffer = await downloadAsset(sourceFbxId);

    // 2. Worker 重新转换
    const glbBuffer = await convertInWorker(fbxBuffer, localSettings, setProgress);

    // 3. 删除旧 GLB → 上传新 GLB（保持原来的 fbxAssetId 关联）
    await deleteAsset(asset.id);
    await uploadAsset(projectId, new File([glbBuffer], asset.name, {...}), 'model', {
      ...asset.metadata,
      importSettings: localSettings,
    });

    // 4. 刷新资产列表
    await loadAssets(projectId, 'model');
  } finally {
    setIsReimporting(false);
  }
};
```

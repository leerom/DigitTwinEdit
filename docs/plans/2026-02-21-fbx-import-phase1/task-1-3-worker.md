# 任务 1.3：fbxWorker.ts（Web Worker）

**Files:**
- Create: `packages/client/src/features/fbx/fbxWorker.ts`

**依赖：** 任务 1.1（types.ts）、任务 1.2（已确认 FBXLoader 可用）

**背景：** 这是 Vite ES Module Web Worker。Vite 会自动打包其依赖。Worker 通过 `postMessage` 与主线程通信。由于 FBXLoader 和 Three.js 场景图不依赖 DOM，可以在 Worker 中运行。

---

### Step 1：创建 fbxWorker.ts

创建 `packages/client/src/features/fbx/fbxWorker.ts`：

```typescript
/**
 * FBX → GLB 转换 Web Worker
 *
 * 运行在独立线程中，不阻塞编辑器 UI。
 * 通过 postMessage 接收 FBX buffer 和设置，返回进度和 GLB buffer。
 */
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { WorkerInput, WorkerOutput, NormalsModeOption } from './types';

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { fbxBuffer, settings } = e.data;

  try {
    // === Step 1: 解析 FBX ===
    postProgress(20);
    const loader = new FBXLoader();
    // parse() 接受 ArrayBuffer 和资源路径（空字符串表示无外部资源）
    const group: THREE.Group = loader.parse(fbxBuffer, '');

    // === Step 2: 应用缩放 ===
    postProgress(40);
    const scaleFactor = settings.convertUnits
      ? settings.scale * 0.01  // FBX 默认 1 单位 = 1cm，three.js 是 1m
      : settings.scale;
    if (Math.abs(scaleFactor - 1) > 1e-6) {
      group.scale.setScalar(scaleFactor);
    }

    // === Step 3: 处理法线 ===
    postProgress(55);
    if (settings.normals === 'calculate') {
      applyCalculatedNormals(group, settings.normalsMode);
    }

    // === Step 4: 导出 GLB ===
    postProgress(70);
    const exporter = new GLTFExporter();

    let glbBuffer: ArrayBuffer;

    // parseAsync 在 Three.js r152+ 可用，优先使用
    if (typeof exporter.parseAsync === 'function') {
      const result = await exporter.parseAsync(group, {
        binary: settings.saveFormat !== 'gltf',
        embedImages: settings.embedTextures,
      });
      glbBuffer = result as ArrayBuffer;
    } else {
      // 回退：使用旧版 parse 的 callback 形式
      glbBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        (exporter as any).parse(
          group,
          (result: ArrayBuffer) => resolve(result),
          (error: Error) => reject(error),
          {
            binary: settings.saveFormat !== 'gltf',
            embedImages: settings.embedTextures,
          }
        );
      });
    }

    postProgress(100);

    // 发送 done 并转移 ArrayBuffer 所有权（零拷贝）
    const doneMsg: WorkerOutput = { type: 'done', glbBuffer };
    (self as any).postMessage(doneMsg, [glbBuffer]);

  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : '文件解析失败，请检查文件完整性';
    const errorMsg: WorkerOutput = { type: 'error', message };
    (self as any).postMessage(errorMsg);
  }
};

/**
 * 发送进度消息给主线程
 */
function postProgress(percent: number): void {
  const msg: WorkerOutput = { type: 'progress', percent };
  (self as any).postMessage(msg);
}

/**
 * 对场景中所有 Mesh 重新计算顶点法线
 * 注意：Three.js 的 computeVertexNormals 使用面积加权，
 * 暂时统一使用此方法，后续可按 normalsMode 精细化。
 */
function applyCalculatedNormals(
  object: THREE.Object3D,
  _normalsMode: NormalsModeOption
): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      child.geometry.computeVertexNormals();
    }
  });
}
```

**关于 `(self as any).postMessage`：** TypeScript 在 Worker 环境下 `self` 的类型可能需要 cast，这是正常的。

---

### Step 2：验证 TypeScript 编译无错误

```bash
pnpm --filter client exec tsc --noEmit --skipLibCheck 2>&1 | head -30
```

预期：无新增错误。

**常见问题：**

问题 1：`Property 'parseAsync' does not exist on type 'GLTFExporter'`
→ 已在代码中用 `typeof exporter.parseAsync === 'function'` 做了运行时检查，编译器报错可忽略（用 `(exporter as any)` 解决）。

问题 2：`Cannot find module 'three/examples/jsm/loaders/FBXLoader.js'`
→ 这通常意味着 `@types/three` 未包含此路径。确认 `packages/client/tsconfig.json` 中有 `"moduleResolution": "bundler"` 或 `"node16"`。如果仍有问题，改为：
```typescript
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
```

---

### Step 3：验证 Worker 可以被 Vite 正确识别

在 `packages/client/src/features/fbx/` 目录下，创建临时验证文件 `_workerTest.ts`（仅用于验证，验证后删除）：

```typescript
// 临时文件：验证 Vite 能正确处理此 Worker URL
// 验证完成后删除此文件
const worker = new Worker(
  new URL('./fbxWorker.ts', import.meta.url),
  { type: 'module' }
);
worker.terminate();
```

运行 Vite 构建：
```bash
pnpm --filter client build 2>&1 | tail -20
```

如果构建成功（即使有警告），说明 Worker 路径正确。**删除临时文件**：

```bash
rm packages/client/src/features/fbx/_workerTest.ts
```

---

### Step 4：提交

```bash
git add packages/client/src/features/fbx/fbxWorker.ts
git commit -m "feat(fbx): add FBX to GLB conversion Web Worker"
```

# 任务 1.1 + 1.2：类型定义 与 依赖确认

---

## Task 1.1：FBX 导入类型定义

**Files:**
- Create: `packages/client/src/features/fbx/types.ts`

这是纯类型文件，无需测试。直接创建。

### Step 1：创建类型文件

创建 `packages/client/src/features/fbx/types.ts`，内容如下：

```typescript
/**
 * FBX 导入配置 - 法线选项
 * 'import': 从 FBX 文件中导入法线（默认）
 * 'calculate': 根据 normalsMode 重新计算法线
 */
export type NormalsOption = 'import' | 'calculate';

/**
 * FBX 导入配置 - 法线模式（仅 normals='calculate' 时生效）
 */
export type NormalsModeOption =
  | 'unweighted'     // 不加权
  | 'areaWeighted'   // 面积加权
  | 'angleWeighted'  // 顶角加权
  | 'areaAndAngle';  // 面积和顶角加权（默认）

/**
 * FBX 导入时使用的保存格式
 */
export type SaveFormatOption = 'glb' | 'gltf';

/**
 * FBX 导入配置项（完整设置）
 */
export interface FBXImportSettings {
  /** 缩放比例，默认 1.0 */
  scale: number;
  /** 转换单位：将 1cm（FBX 默认）转为 0.01m（three.js 单位），默认 true */
  convertUnits: boolean;
  /** 法线处理方式，默认 'import' */
  normals: NormalsOption;
  /** 法线计算模式，仅 normals='calculate' 时生效，默认 'areaAndAngle' */
  normalsMode: NormalsModeOption;
  /** 输出格式，默认 'glb' */
  saveFormat: SaveFormatOption;
  /** 是否将纹理嵌入 GLB 文件，默认 true */
  embedTextures: boolean;
}

/**
 * FBX 导入配置的默认值
 */
export const DEFAULT_FBX_IMPORT_SETTINGS: FBXImportSettings = {
  scale: 1.0,
  convertUnits: true,
  normals: 'import',
  normalsMode: 'areaAndAngle',
  saveFormat: 'glb',
  embedTextures: true,
};

/**
 * Worker 接收的输入消息
 */
export interface WorkerInput {
  fbxBuffer: ArrayBuffer;
  settings: FBXImportSettings;
}

/**
 * Worker 发出的输出消息
 */
export type WorkerOutput =
  | { type: 'progress'; percent: number }
  | { type: 'done'; glbBuffer: ArrayBuffer }
  | { type: 'error'; message: string };

/**
 * FBXImporter 导入进度回调数据
 */
export interface ImportProgress {
  step: string;
  percent: number;
}
```

### Step 2：确认 TypeScript 无错误

```bash
pnpm --filter client exec tsc --noEmit --skipLibCheck 2>&1 | head -20
```

预期输出：无错误（或仅有已存在的无关错误）

### Step 3：提交

```bash
git add packages/client/src/features/fbx/types.ts
git commit -m "feat(fbx): add FBX import settings types"
```

---

## Task 1.2：确认 Three.js FBXLoader 可用且依赖完整

**注意：这是一个调查任务，不新建生产代码。**

### Step 1：检查 FBXLoader 文件是否存在

```bash
ls node_modules/three/examples/jsm/loaders/FBXLoader.js 2>/dev/null && echo "EXISTS" || echo "NOT FOUND"
```

预期：`EXISTS`

### Step 2：检查 fflate 是否已捆绑

```bash
grep -l "fflate" node_modules/three/examples/jsm/loaders/FBXLoader.js 2>/dev/null | head -3
```

或者：
```bash
head -5 node_modules/three/examples/jsm/libs/fflate.module.js 2>/dev/null || echo "Not found as separate file"
```

**重要判断：**
- 如果 Three.js r173 内部引用了 `../libs/fflate.module.js`，Vite 会自动处理，**无需单独安装 fflate**。
- 如果报错"找不到 fflate 模块"，则需要：
  ```bash
  pnpm --filter client add fflate
  ```

### Step 3：检查 GLTFExporter 是否有 parseAsync

```bash
grep "parseAsync" node_modules/three/examples/jsm/exporters/GLTFExporter.js | head -3
```

预期输出中包含 `parseAsync` 的定义。

**如果没有 parseAsync（Three.js 旧版）：**
改用 `parse` 方法的 callback 形式：
```ts
// 替代方案
const glbBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
  exporter.parse(group, resolve, reject, { binary: true, embedImages: settings.embedTextures });
});
```

### Step 4：记录确认结果

在此处记录检查结果（用于后续任务参考）：
- [ ] FBXLoader 存在：YES
- [ ] fflate 是否需要安装：NO（已捆绑）/ YES（需要安装）
- [ ] GLTFExporter.parseAsync 存在：YES / NO（使用回调替代）

**如需安装 fflate：**
```bash
pnpm --filter client add fflate
git add packages/client/package.json pnpm-lock.yaml
git commit -m "chore(fbx): add fflate dependency for FBX decompression"
```

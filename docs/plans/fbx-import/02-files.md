# 02 - 新建文件与修改文件列表

## 1. 前端新建文件

### `packages/client/src/features/fbx/types.ts`
FBX 导入配置的 TypeScript 类型定义。

```ts
export type NormalsOption = 'import' | 'calculate';
export type NormalsModeOption = 'unweighted' | 'areaWeighted' | 'angleWeighted' | 'areaAndAngle';
export type SaveFormatOption = 'glb' | 'gltf';

export interface FBXImportSettings {
  // 场景
  scale: number;           // 缩放比例，默认 1.0
  convertUnits: boolean;   // 转换单位（1cm → 0.01m），默认 true

  // 几何
  normals: NormalsOption;       // 默认 'import'
  normalsMode: NormalsModeOption; // 仅 normals='calculate' 时生效，默认 'areaAndAngle'

  // 保存
  saveFormat: SaveFormatOption;   // 默认 'glb'
  embedTextures: boolean;         // 嵌入纹理，默认 true
}

export const DEFAULT_FBX_IMPORT_SETTINGS: FBXImportSettings = {
  scale: 1.0,
  convertUnits: true,
  normals: 'import',
  normalsMode: 'areaAndAngle',
  saveFormat: 'glb',
  embedTextures: true,
};
```

---

### `packages/client/src/features/fbx/FBXImportDialog.tsx`
导入配置对话框 React 组件。

**Props：**
```ts
interface FBXImportDialogProps {
  isOpen: boolean;
  fileName: string;
  onConfirm: (settings: FBXImportSettings) => void;
  onCancel: () => void;
}
```

**UI 结构：**
- 标题：「导入 FBX 模型」
- 文件名显示区域
- 三个配置区域：场景 / 几何 / 保存
- 底部按钮：「取消」「导入」

---

### `packages/client/src/features/fbx/fbxWorker.ts`
Web Worker 脚本，负责 FBX 解析和 GLB 导出。

**消息协议：**
```ts
// 主线程 → Worker
interface WorkerInput {
  fbxBuffer: ArrayBuffer;
  settings: FBXImportSettings;
}

// Worker → 主线程
type WorkerOutput =
  | { type: 'progress'; percent: number }
  | { type: 'done'; glbBuffer: ArrayBuffer }
  | { type: 'error'; message: string };
```

**处理流程：**
1. `FBXLoader.parse(buffer)` → `THREE.Group`
2. 应用 `scale` 和 `convertUnits`（修改 `group.scale`）
3. 如果 `normals === 'calculate'`，遍历 Mesh 重新计算法线
4. `GLTFExporter.parseAsync(group, { binary: true, embedImages })` → `ArrayBuffer`
5. `postMessage({ type: 'done', glbBuffer })`

---

### `packages/client/src/features/fbx/FBXImporter.ts`
主导入协调器，管理 Worker 生命周期和文件上传。

**核心方法：**
```ts
class FBXImporter {
  async import(
    file: File,
    settings: FBXImportSettings,
    projectId: number,
    onProgress: (step: string, percent: number) => void
  ): Promise<{ fbxAssetId: number; glbAssetId: number }>;
}
```

**内部流程：**
1. 读取 `file` → `ArrayBuffer`
2. 创建 Worker，发送 `{ fbxBuffer, settings }`
3. 监听 Worker progress 消息 → 调用 `onProgress`
4. 接收 `{ glbBuffer }` → 转换为 `Blob`
5. 上传 FBX（`metadata.isSourceFbx=true`）
6. 上传 GLB（`metadata.sourceFbxAssetId`, `metadata.importSettings`）
7. 返回两个资产 ID

---

### `packages/client/src/components/inspector/ModelImportProp.tsx`
Inspector 面板中的模型导入设置区域。

**Props：**
```ts
interface ModelImportPropProps {
  asset: AssetRow;  // 包含 metadata.importSettings
  projectId: number;
}
```

**UI 结构：**
- 区域标题：「模型导入设置」
- 来源文件名显示（只读）
- 和 FBXImportDialog 相同的配置项（可编辑）
- 「重新导入」按钮（触发重新转换）
- 重新导入时显示进度

---

## 2. 前端修改文件

### `packages/client/src/components/layout/Header.tsx`
将「添加」菜单中的「模型」项从 `disabled: true` 改为：

```ts
{
  label: '模型',
  icon: <Layers className="w-3 h-3" />,
  children: [
    {
      label: '导入 FBX',
      onClick: handleImportFBXClick,
      icon: <Upload className="w-3 h-3" />,
    }
  ]
}
```

新增：
- `fileInputRef`（仅接受 `.fbx`）
- `handleImportFBXClick` → 触发文件选择
- `showFBXImportDialog` 状态控制对话框显示
- `<FBXImportDialog>` 渲染

---

### `packages/client/src/components/panels/InspectorPanel.tsx`
当选中的是 Models 面板中的 GLB 资产时，渲染 `ModelImportProp`：

```ts
// 在现有 Inspector 内容后追加：
{selectedAsset && selectedAsset.type === 'model' && !selectedAsset.metadata?.isSourceFbx && (
  <ModelImportProp asset={selectedAsset} projectId={currentProject.id} />
)}
```

需要从 `editorStore` 或新的 `assetStore` 中读取当前选中的资产 ID。

---

### `packages/client/src/components/panels/ProjectPanel.tsx`
点击 Models 面板中的 GLB 资产时，将资产 ID 写入状态：

```ts
const handleAssetSelect = (assetId: number) => {
  setSelectedAssetId(assetId);
  // 通知 InspectorPanel 显示该资产的导入配置
  // 可通过 editorStore 或 assetStore 实现
};
```

过滤显示逻辑（隐藏原始 FBX 文件）：
```ts
const displayAssets = assets.filter(
  (a) => !(a.metadata as any)?.isSourceFbx
);
```

---

## 3. 后端修改文件

### `packages/server/src/middleware/upload.ts`
当前可能限制了可上传的 MIME 类型。需要确认并允许：
- `application/octet-stream`（FBX 文件的 MIME 类型）
- `model/gltf-binary`（GLB 文件的 MIME 类型）

---

## 4. 新增依赖

| 包名 | 用途 | 安装位置 |
|------|------|---------|
| `fflate` | Three.js FBXLoader 解压 FBX 二进制格式所需 | `packages/client` |

安装命令：
```bash
pnpm --filter client add fflate
```

> **确认步骤**：先检查 `node_modules/three/examples/jsm/loaders/FBXLoader.js` 中是否已 import `fflate`。如果 Three.js 已捆绑则不需要额外安装。

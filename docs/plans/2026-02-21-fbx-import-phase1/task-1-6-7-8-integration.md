# 任务 1.6 + 1.7 + 1.8：Header 菜单 + 后端上传限制 + 面板过滤

**Files:**
- Modify: `packages/client/src/components/layout/Header.tsx` （任务 1.6）
- Modify: `packages/server/src/middleware/upload.ts` （任务 1.7）
- Modify: `packages/client/src/components/panels/ProjectPanel.tsx` （任务 1.8）

**依赖：** 任务 1.4（FBXImportDialog）、任务 1.5（FBXImporter）

---

## 任务 1.7：更新后端上传文件大小限制（建议先做，独立）

**背景：** 现有 `upload.ts` 中 multer 的 `fileSize` 上限是 **100MB**，需求要求支持 **500MB**。好消息：`upload.ts` 已经允许 FBX 文件类型，无需改动 MIME 类型。

### Step 1：查看当前 upload.ts 限制

打开 `packages/server/src/middleware/upload.ts`，找到第 7-11 行：

```typescript
export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB限制   ← 这里
  },
```

### Step 2：修改 fileSize 限制

将 `100 * 1024 * 1024` 改为 `500 * 1024 * 1024`：

```typescript
export const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB限制（支持大型FBX文件）
  },
```

修改后完整文件为（仅改这一行，其余不动）：

```typescript
import multer from 'multer';
import type { RequestHandler } from 'express';

// 使用内存存储，稍后通过服务层保存到文件系统
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB限制（支持大型FBX文件）
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      // 3D模型格式
      'model/gltf-binary',
      'model/gltf+json',
      'application/octet-stream', // GLB, FBX等
      'application/x-tgif',

      // 图片格式
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',

      // JSON材质文件
      'application/json'
    ];

    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['glb', 'gltf', 'fbx', 'obj', 'png', 'jpg', 'jpeg', 'webp', 'json'];

    // 同时检查MIME类型和扩展名
    if (
      allowedMimeTypes.includes(file.mimetype) ||
      (fileExt && allowedExtensions.includes(fileExt))
    ) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype} (${file.originalname})`));
    }
  }
});

// 单文件上传
export const uploadSingle: RequestHandler = upload.single('file');

// 多文件上传（最多10个）
export const uploadMultiple: RequestHandler = upload.array('files', 10);
```

### Step 3：提交

```bash
git add packages/server/src/middleware/upload.ts
git commit -m "fix(server): increase file upload limit from 100MB to 500MB for FBX support"
```

---

## 任务 1.6：修改 Header 菜单——启用「导入 FBX」

**背景：** 当前 `Header.tsx` 中「添加」→「模型」菜单项是 `disabled: true`。需要改为带子菜单，添加「导入 FBX」选项，并集成 `FBXImportDialog` 和 `ProgressDialog`。

### Step 1：查看需要改动的区域

打开 `packages/client/src/components/layout/Header.tsx`，找到以下代码（在 `addMenuItems` 数组中，约第 200-203 行）：

```typescript
    {
      label: '模型',
      icon: <Layers className="w-3 h-3" />,
      disabled: true
    }
```

### Step 2：修改 Header.tsx

以下是 Header.tsx 需要修改的部分（**仅列出修改点，其余代码不变**）：

**2a. 在 imports 顶部添加新 import（第 1-14 行区域）：**

在 `Header.tsx` 顶部现有 import 列表末尾，添加：

```typescript
import { FBXImportDialog } from '../../features/fbx/FBXImportDialog';
import { fbxImporter } from '../../features/fbx/FBXImporter';
import { ProgressDialog } from '../../features/scene/components/ProgressDialog';
import { useProjectStore } from '../../stores/projectStore';
import { useAssetStore } from '../../stores/assetStore';
import type { FBXImportSettings } from '../../features/fbx/types';
```

**2b. 在组件内添加新的 state（在现有 state 声明之后，约第 18-22 行区域）：**

```typescript
  // FBX 导入相关状态
  const [fbxFile, setFbxFile] = useState<File | null>(null);
  const [showFBXImportDialog, setShowFBXImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ step: '', percent: 0 });
  const fbxInputRef = useRef<HTMLInputElement>(null);
```

**2c. 添加 store 读取（在现有 store hooks 之后）：**

```typescript
  const { currentProject } = useProjectStore();
  const { loadAssets } = useAssetStore();
```

**2d. 添加 FBX 相关处理函数（在现有 `handleAddMesh` 函数之后）：**

```typescript
  const handleImportFBXClick = () => {
    if (!currentProject) {
      alert('请先选择或创建一个项目');
      return;
    }
    fbxInputRef.current?.click();
  };

  const handleFBXFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 校验文件（给用户即时反馈）
    try {
      fbxImporter.validateFile(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : '文件校验失败');
      e.target.value = '';
      return;
    }
    setFbxFile(file);
    setShowFBXImportDialog(true);
    e.target.value = '';
  };

  const handleFBXImportConfirm = async (settings: FBXImportSettings) => {
    if (!fbxFile || !currentProject) return;
    setShowFBXImportDialog(false);
    setIsImporting(true);
    try {
      await fbxImporter.import(
        fbxFile,
        settings,
        currentProject.id,
        (progress) => setImportProgress(progress)
      );
      // 刷新 Models 资产列表
      await loadAssets(currentProject.id, 'model');
    } catch (err) {
      alert(err instanceof Error ? err.message : '导入失败，请重试');
    } finally {
      setIsImporting(false);
      setFbxFile(null);
      setImportProgress({ step: '', percent: 0 });
    }
  };

  const handleFBXImportCancel = () => {
    setShowFBXImportDialog(false);
    setFbxFile(null);
  };
```

**2e. 修改 `addMenuItems` 中的「模型」项（替换掉 `disabled: true` 的版本）：**

将：
```typescript
    {
      label: '模型',
      icon: <Layers className="w-3 h-3" />,
      disabled: true
    }
```

替换为：
```typescript
    {
      label: '模型',
      icon: <Layers className="w-3 h-3" />,
      children: [
        {
          label: '导入 FBX',
          onClick: handleImportFBXClick,
          icon: <Upload className="w-3 h-3" />,
        },
      ],
    }
```

**2f. 在 JSX return 的末尾（`</header>` 之前），添加 FBX 相关 UI 元素：**

在已有的 `<input ref={fileInputRef} ... />` 之后，添加：

```tsx
        {/* FBX 文件选择 input */}
        <input
          ref={fbxInputRef}
          type="file"
          accept=".fbx"
          onChange={handleFBXFileSelected}
          className="hidden"
        />

        {/* FBX 导入配置对话框 */}
        {fbxFile && (
          <FBXImportDialog
            isOpen={showFBXImportDialog}
            fileName={fbxFile.name}
            onConfirm={handleFBXImportConfirm}
            onCancel={handleFBXImportCancel}
          />
        )}

        {/* FBX 导入进度对话框 */}
        <ProgressDialog
          isOpen={isImporting}
          title="导入 FBX 模型"
          percentage={importProgress.percent}
          currentTask={importProgress.step}
        />
```

### Step 3：运行现有测试确认无回归

```bash
pnpm --filter client test --run packages/client/src/components/layout/
```

预期：Header 相关测试仍然通过。

**如果 Header.test.tsx 测试失败：** 查看具体原因，通常是因为新 import 的模块（如 FBXImporter）使用了 `new Worker(...)` 在测试环境中不支持。解决方法：在 Header.test.tsx 中 mock `fbxImporter`：
```typescript
vi.mock('../../features/fbx/FBXImporter', () => ({
  fbxImporter: { validateFile: vi.fn(), import: vi.fn() },
}));
```

### Step 4：提交

```bash
git add packages/client/src/components/layout/Header.tsx
git commit -m "feat(fbx): enable import FBX menu item in Header with dialog integration"
```

---

## 任务 1.8：ProjectPanel 过滤原始 FBX 文件

**背景：** 上传后，Models 面板中会出现两条资产记录（FBX + GLB）。需要过滤掉标有 `isSourceFbx: true` 的 FBX 记录，只显示 GLB。

### Step 1：找到 ProjectPanel.tsx 中资产显示的代码

打开 `packages/client/src/components/panels/ProjectPanel.tsx`，找到资产渲染部分（约第 409-424 行）：

```typescript
                    <div className="grid grid-cols-10 gap-4 content-start">
                      {assets.map((asset) => (
                        <AssetCard
                          key={asset.id}
                          asset={asset}
                          ...
                        />
                      ))}
                    </div>
```

### Step 2：在 `{assets.map(...)}` 之前添加过滤

找到 `const handleFileUpload` 之后、组件 return 之前，**在 return 中**修改 `assets.map` 为先过滤：

在 `assets.map((asset) => (` 这一行**上方**，不需要在 JSX 外面新建变量，直接在 JSX 内联过滤：

将：
```tsx
                      {assets.map((asset) => (
```

改为：
```tsx
                      {assets
                        .filter(
                          (asset) =>
                            !(asset.metadata as Record<string, unknown> | undefined)
                              ?.isSourceFbx
                        )
                        .map((asset) => (
```

**同时更新** 「X 个资产」计数（约第 325-327 行）：

将：
```tsx
                  {selectedFolder === 'scenes' ? `${scenes.length} 个场景` : `${assets.length} 个资产`}
```

改为：
```tsx
                  {selectedFolder === 'scenes'
                    ? `${scenes.length} 个场景`
                    : `${assets.filter((a) => !(a.metadata as any)?.isSourceFbx).length} 个资产`}
```

### Step 3：确认空状态也使用过滤后的数量

找到空状态判断（约第 393-407 行）：
```tsx
                  ) : assets.length === 0 ? (
```

改为：
```tsx
                  ) : assets.filter((a) => !(a.metadata as any)?.isSourceFbx).length === 0 ? (
```

**注意：** 如果重复的过滤表达式让代码难看，可以在组件顶部（`return` 之前）用变量：

```typescript
  // 过滤掉原始 FBX 文件，只显示转换后的 GLB 资产
  const displayAssets = assets.filter(
    (a) => !(a.metadata as Record<string, unknown> | undefined)?.isSourceFbx
  );
```

然后把三处 `assets.filter(...)` 都替换为 `displayAssets`，把 `assets.map` 替换为 `displayAssets.map`。

### Step 4：运行全部测试

```bash
pnpm --filter client test --run
```

预期：全部测试通过。

### Step 5：提交

```bash
git add packages/client/src/components/panels/ProjectPanel.tsx
git commit -m "feat(fbx): filter source FBX assets from Models panel display"
```

---

## Phase 1 完成验证

所有代码提交后，进行端到端测试：

### 启动开发服务器

```bash
# 终端 1
pnpm dev:server

# 终端 2
pnpm dev
```

### 手动测试步骤

1. 访问 http://localhost:5173，登录并进入一个项目
2. 确认底部面板显示「项目」标签，点击左侧 **Models** 文件夹
3. 点击顶部菜单「**添加**」→「**模型**」→「**导入 FBX**」
4. 在文件选择器中选择一个小型 FBX 文件（建议 < 5MB）
5. 确认弹出 **FBX 导入配置对话框**，各选项默认值正确
6. 点击「**导入**」
7. 确认出现 **进度对话框**（显示百分比和阶段说明）
8. 等待完成后，确认 Models 面板中出现 **GLB 资产**（不显示原始 FBX）

### 验证异常处理

9. 再次点击「导入 FBX」，选择一个非 FBX 文件（如 `.png`）
   - 预期：文件选择器只允许选 `.fbx`（因为有 `accept=".fbx"`）
10. 尝试通过其他方式上传非 FBX 文件（或选一个空文件）
    - 预期：显示错误提示

### 如果测试失败

**问题：进度对话框不显示**
→ 检查 `isImporting` 状态是否正确设置

**问题：Models 面板不刷新**
→ 确认 `loadAssets(currentProject.id, 'model')` 在 `import()` 完成后被调用
→ 确认 ProjectPanel 有监听 `selectedFolder === 'models'` 时重新 load

**问题：Worker 报错 "Cannot read properties of undefined"**
→ FBXLoader 在 Worker 中有依赖问题。参见设计文档 04-error-handling.md 的风险 1。
→ 临时解决方案：改在主线程中运行（去掉 Worker，直接在 FBXImporter 中调用 FBXLoader）

**问题：上传时 413 Payload Too Large**
→ 确认任务 1.7 已完成（upload.ts 的 fileSize 已改为 500MB）
→ 同时检查是否有 nginx/反向代理 限制了 payload 大小

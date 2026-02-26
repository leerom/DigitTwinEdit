# 任务 2.5：FBXImporter.reimport() + ModelImportProp 重新导入流程

**Files:**
- Modify: `packages/server/src/services/assetService.ts`（新增 `replaceAssetFile`）
- Modify: `packages/server/src/routes/assets.ts`（新增 `PUT /api/assets/:id/file` 路由）
- Modify: `packages/client/src/api/assets.ts`（新增 `replaceAssetFile`）
- Modify: `packages/client/src/features/fbx/FBXImporter.ts`（新增 `reimport` 方法）
- Modify: `packages/client/src/features/fbx/__tests__/FBXImporter.test.ts`（新增测试）
- Modify: `packages/client/src/components/inspector/ModelImportProp.tsx`（接入 reimport）
- Modify: `packages/client/src/components/panels/InspectorPanel.tsx`（接入 onReimportComplete）

**依赖：** 任务 2.1（assetStore.selectAsset）、任务 2.3（ModelImportProp）、任务 2.4（InspectorPanel 资产模式）

**背景：** 用户修改 ModelImportProp 中的参数后点击「重新导入」，应触发：

1. 从服务器下载原始 FBX（`sourceFbxAssetId`）
2. 在 Worker 中用新配置重新转换 FBX → GLB
3. **原地替换**已有的 GLB 资产文件（保持 `asset.id` 不变，scene 中的引用不失效）
4. 更新资产的 `metadata.importSettings`

---

## 子任务 A：服务端 — 新增资产文件替换接口

### A-1：在 assetService 中添加 `replaceAssetFile`

打开 `packages/server/src/services/assetService.ts`，在 `renameAsset` 方法之后（约第 195 行）添加：

```typescript
  /**
   * 替换资产文件（保持 asset.id 和 file_path 不变）
   *
   * 用于重新导入：原地覆盖 GLB 文件，更新 file_size 和 mime_type。
   * 保持 file_path 不变，确保场景中已加载的模型引用不失效。
   */
  async replaceAssetFile(
    assetId: number,
    file: Express.Multer.File
  ): Promise<AssetRow> {
    const asset = await AssetModel.findById(assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    // 覆盖同路径文件（fs.writeFile 自动覆盖）
    const { writeFile } = await import('fs/promises');
    const fullPath = fileStorage.getFullPath(asset.file_path);
    await writeFile(fullPath, file.buffer);

    // 更新 DB 中的文件大小和 MIME 类型
    const updatedAsset = await AssetModel.update(assetId, {
      file_size: file.size,
      mime_type: file.mimetype,
    } as any);

    return updatedAsset as AssetRow;
  }
```

**注意：** `AssetModel.update` 第二参数目前只有强类型的 `name`、`metadata`、`thumbnail_path` 字段。
使用 `as any` 绕过类型限制是可接受的临时方案；如果严格模式下编译出错，需要在 `AssetModel` 的 `UpdateAssetData` 接口里也加上 `file_size?: number; mime_type?: string;`（参见可能的问题章节）。

### A-2：在 assets.ts 路由中添加 `PUT /api/assets/:id/file`

打开 `packages/server/src/routes/assets.ts`，在 `PUT /api/assets/:id`（约第 234 行）和 `POST /api/assets/:id/thumbnail`（约第 286 行）之间插入：

```typescript
// PUT /api/assets/:id/file - 替换资产文件（用于重新导入）
router.put(
  '/assets/:id/file',
  uploadSingle,
  async (req: Request, res: Response, next) => {
    try {
      const userId = req.session.userId!;
      const assetId = parseInt(req.params.id, 10);

      if (isNaN(assetId)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid asset ID',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'No file uploaded',
        });
      }

      // 获取资产
      const asset = await AssetModel.findById(assetId);
      if (!asset) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Asset not found',
        });
      }

      // 验证权限
      const isOwner = await ProjectModel.isOwner(asset.project_id, userId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to replace this asset',
        });
      }

      const updatedAsset = await assetService.replaceAssetFile(assetId, req.file);

      res.json({
        success: true,
        asset: updatedAsset,
        message: 'Asset file replaced successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);
```

### A-3：验证 TypeScript 编译（服务端）

```bash
pnpm --filter server exec tsc --noEmit --skipLibCheck 2>&1 | head -20
```

**常见问题：**

问题：`AssetModel.update` 参数类型不包含 `file_size`、`mime_type`

解决：找到 `packages/server/src/models/Asset.ts`，定位 `UpdateAssetData` 接口（或 `AssetModel.update` 的参数类型），添加：
```typescript
interface UpdateAssetData {
  name?: string;
  metadata?: Record<string, unknown>;
  thumbnail_path?: string;
  file_size?: number;    // ← 新增
  mime_type?: string;    // ← 新增
}
```

---

## 子任务 B：客户端 API — 新增 `replaceAssetFile`

打开 `packages/client/src/api/assets.ts`，在 `deleteAsset` 之后添加新方法：

```typescript
  // 替换资产文件（用于重新导入，保持 asset.id 不变）
  async replaceAssetFile(
    assetId: number,
    file: File,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.put(
      `${API_BASE_URL}/assets/${assetId}/file`,
      formData,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
      }
    );

    return response.data.asset;
  },
```

---

## 子任务 C：FBXImporter — 新增 `reimport` 方法

### C-1：写失败测试（TDD）

打开 `packages/client/src/features/fbx/__tests__/FBXImporter.test.ts`，在现有测试之后追加：

```typescript
describe('FBXImporter.reimport', () => {
  let importer: FBXImporter;

  beforeEach(() => {
    importer = new FBXImporter();
    vi.clearAllMocks();
  });

  it('reimport method exists on FBXImporter', () => {
    expect(typeof importer.reimport).toBe('function');
  });

  it('reimport calls fetch to download source FBX', async () => {
    // 模拟 fetch：返回一个假 FBX ArrayBuffer
    const fakeFbxBuffer = new ArrayBuffer(8);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(fakeFbxBuffer),
    });
    vi.stubGlobal('fetch', mockFetch);

    // 模拟 Worker（convertInWorker 依赖 Worker）
    const fakeGlbBuffer = new ArrayBuffer(4);
    const mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null as any,
      onerror: null as any,
    };
    // @ts-ignore
    vi.stubGlobal('Worker', vi.fn(() => {
      // 在 postMessage 调用后触发 done
      mockWorker.postMessage = vi.fn().mockImplementation(() => {
        setTimeout(() => {
          if (mockWorker.onmessage) {
            mockWorker.onmessage({ data: { type: 'done', glbBuffer: fakeGlbBuffer } } as any);
          }
        }, 0);
      });
      return mockWorker;
    }));

    // 模拟 assetsApi
    vi.mock('../../../api/assets', () => ({
      assetsApi: {
        getAssetDownloadUrl: vi.fn().mockReturnValue('http://test/assets/42/download'),
        replaceAssetFile: vi.fn().mockResolvedValue({ id: 10, name: 'building.glb' }),
        updateAsset: vi.fn().mockResolvedValue({ id: 10 }),
      },
    }));

    const mockAsset = {
      id: 10,
      project_id: 1,
      name: 'building.glb',
      type: 'model' as const,
      file_path: '/uploads/building.glb',
      file_size: 2048,
      mime_type: 'model/gltf-binary',
      created_at: '',
      updated_at: '',
      metadata: {
        format: 'glb',
        sourceFbxAssetId: 42,
        importSettings: { scale: 1.0, convertUnits: true, normals: 'import', normalsMode: 'areaAndAngle', saveFormat: 'glb', embedTextures: true },
      },
    };

    const { DEFAULT_FBX_IMPORT_SETTINGS } = await import('../types');
    const newSettings = { ...DEFAULT_FBX_IMPORT_SETTINGS, scale: 2.0 };

    await importer.reimport(1, mockAsset as any, newSettings, vi.fn());

    // fetch 应该被调用一次（下载源 FBX）
    expect(mockFetch).toHaveBeenCalledWith('http://test/assets/42/download', expect.objectContaining({ credentials: 'include' }));
  });
});
```

### C-2：运行测试确认失败

```bash
pnpm --filter client test --run packages/client/src/features/fbx/__tests__/FBXImporter.test.ts
```

预期：FAIL，`importer.reimport is not a function`

### C-3：在 FBXImporter.ts 中添加 `reimport` 方法

打开 `packages/client/src/features/fbx/FBXImporter.ts`。

**3a. 在文件顶部 import 中添加 `Asset` 类型：**

在 `import { assetsApi } from '../../api/assets';` 之后添加：
```typescript
import type { Asset } from '@digittwinedit/shared';
```

**3b. 在 `import()` 方法之后（约第 107 行），添加 `reimport` 公开方法：**

```typescript
  /**
   * 使用原始 FBX 和新的配置重新导入
   *
   * 流程：
   * 1. 从服务器下载原始 FBX
   * 2. Worker 重新转换（使用新配置）
   * 3. 原地替换 GLB 文件（保持 asset.id 不变）
   * 4. 更新 metadata.importSettings
   *
   * @param projectId - 所属项目（用于鉴权）
   * @param glbAsset - 需要重新导入的 GLB 资产（含 metadata.sourceFbxAssetId）
   * @param newSettings - 新的导入配置
   * @param onProgress - 进度回调
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
        onProgress({
          step: '上传新模型...',
          percent: Math.round(70 + (e.progress ?? 0) * 20),
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
```

### C-4：运行测试确认通过

```bash
pnpm --filter client test --run packages/client/src/features/fbx/__tests__/FBXImporter.test.ts
```

预期：全部测试通过（原有 5 个 + 新增 2 个 = 7 个 PASS）

**常见问题：**

问题：Worker mock 在测试中无法拦截 `convertInWorker`（私有方法）
→ Worker 会在测试环境中失败。简化测试，只测 `reimport method exists` 和参数传递（mock fetch），不深入测试 Worker 转换。

问题：`vi.mock` 在同文件 describe 中不生效
→ 将 mock 移到文件顶部，在所有 describe 之前：
```typescript
vi.mock('../../../api/assets', () => ({
  assetsApi: {
    getAssetDownloadUrl: vi.fn().mockReturnValue('http://test/assets/42/download'),
    replaceAssetFile: vi.fn().mockResolvedValue({ id: 10, name: 'building.glb' }),
    updateAsset: vi.fn().mockResolvedValue({ id: 10 }),
  },
}));
```

---

## 子任务 D：接入 ModelImportProp 的重新导入按钮

### D-1：修改 ModelImportProp.tsx 中的 `handleReimport`

打开 `packages/client/src/components/inspector/ModelImportProp.tsx`。

**在文件顶部添加 import（在现有 imports 之后）：**

```typescript
import { fbxImporter } from '../../features/fbx/FBXImporter';
import { useAssetStore } from '../../stores/assetStore';
```

**在 `ModelImportPropContent` 组件中：**

1. 添加 `loadAssets` 从 store 读取（在现有 `useState` 之后）：

```typescript
  const loadAssets = useAssetStore((state) => state.loadAssets);
```

2. 将现有 `handleReimport` 从打印日志改为真正的重新导入：

将：
```typescript
  const handleReimport = async () => {
    // TODO Task 2.5：接入 fbxImporter.reimport()
    // 暂时打印日志，等 Task 2.5 完成后替换
    console.log('[ModelImportProp] 重新导入:', { localSettings, sourceFbxAssetId });
    onReimportComplete();
  };
```

改为：
```typescript
  const [reimportProgress, setReimportProgress] = useState<string>('');

  const handleReimport = async () => {
    setIsReimporting(true);
    setReimportProgress('');
    try {
      await fbxImporter.reimport(
        projectId,
        asset,
        localSettings,
        (progress) => setReimportProgress(`${progress.step} (${progress.percent}%)`)
      );
      // 刷新资产列表（让 InspectorPanel 获得新的 asset 数据）
      await loadAssets(projectId, 'model');
      onReimportComplete();
    } catch (err) {
      alert(err instanceof Error ? err.message : '重新导入失败，请重试');
    } finally {
      setIsReimporting(false);
      setReimportProgress('');
    }
  };
```

3. 在「转换中...」的进度展示中，添加 `reimportProgress` 文字（可选，增强 UX）：

将：
```tsx
            {isReimporting ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                <span>转换中...</span>
              </>
            ) : (
```

改为：
```tsx
            {isReimporting ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                <span>{reimportProgress || '转换中...'}</span>
              </>
            ) : (
```

### D-2：在 ModelImportPropContent 中处理「保存后重置 dirty 状态」

重新导入成功后，`loadAssets` 会刷新 store 中的资产数据，`InspectorPanel` 会以新 `asset` 重新渲染 `ModelImportProp`，从而重置 `savedSettings`。但 `localSettings` 是 `useState` 初始化的，不会自动同步。

**需要添加 `useEffect` 在 `savedSettings` 变化时同步 `localSettings`：**

在 `ModelImportPropContent` 中，在 `isDirty` 的 `useMemo` 之后添加：

```typescript
  // 当服务端数据更新后（重新导入完成，loadAssets 刷新了 asset.metadata），
  // 同步本地设置以清除 dirty 状态
  React.useEffect(() => {
    setLocalSettings(savedSettings);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(savedSettings)]);
```

---

## 子任务 E：更新 InspectorPanel 的 onReimportComplete 回调

打开 `packages/client/src/components/panels/InspectorPanel.tsx`，找到任务 2.4 中写入的 `onReimportComplete` 回调（在渲染 `ModelImportProp` 处）：

```typescript
                onReimportComplete={() => {
                  // TODO Task 2.5 完成后此处无需改动
                  // ModelImportProp 内部的 onReimportComplete 会刷新资产列表
                }}
```

由于 ModelImportProp 内部已经在 `handleReimport` 中调用了 `loadAssets`，InspectorPanel 的 `onReimportComplete` 可以留空（或用于其他业务，如关闭某些 UI 状态）。**此处暂时不需要改动。**

---

## Step 最终验证：运行全部测试

```bash
pnpm --filter client test --run
```

预期：全部测试通过。

```bash
pnpm --filter server exec tsc --noEmit --skipLibCheck 2>&1 | head -20
pnpm --filter client exec tsc --noEmit --skipLibCheck 2>&1 | head -20
```

预期：无新增 TypeScript 错误。

---

## Step 手动端到端测试

1. 启动 `pnpm dev:all`
2. 进入项目，通过「添加 → 模型 → 导入 FBX」导入一个 FBX 文件
3. 等待导入完成，在 Models 面板看到 GLB 资产
4. 单击该 GLB 资产
5. Inspector 应显示「模型导入设置」区域，显示缩放比例、法线等参数
6. 修改「缩放比例」为 2.0
7. 「重新导入」按钮应变为可用，出现「已修改」角标
8. 点击「重新导入」按钮
9. 按钮应显示进度（「下载源 FBX... (5%)」→「解析 FBX... (xx%)」→「上传新模型... (70%)」→「重新导入完成」）
10. 完成后，Inspector 应显示新的缩放比例（2.0），「重新导入」按钮恢复禁用状态
11. 在 3D 视口中可以看到重新导入的模型（需要手动拖入场景或刷新）

**异常场景验证：**

- 源 FBX 已被删除 → 「重新导入」应报错「源 FBX 下载失败」
- 网络中断 → 应报错并恢复按钮可用
- Worker 超时（60s）→ 应报错「导入超时，请尝试优化文件后重新导入」

---

## Step 提交（分两步）

**后端提交：**
```bash
git add packages/server/src/services/assetService.ts \
        packages/server/src/routes/assets.ts
git commit -m "feat(fbx): add replace asset file endpoint for reimport"
```

**前端提交：**
```bash
git add packages/client/src/api/assets.ts \
        packages/client/src/features/fbx/FBXImporter.ts \
        packages/client/src/features/fbx/__tests__/FBXImporter.test.ts \
        packages/client/src/components/inspector/ModelImportProp.tsx \
        packages/client/src/components/panels/InspectorPanel.tsx
git commit -m "feat(fbx): implement reimport flow in FBXImporter and ModelImportProp"
```

# 任务 2.1：assetStore 添加 selectedAssetId

**Files:**
- Modify: `packages/client/src/stores/assetStore.ts`
- Modify: `packages/client/src/stores/assetStore.test.ts`

**背景：** 当前 `assetStore` 没有「当前选中资产」的概念。`ProjectPanel.tsx` 用了本地 `selectedAssetId` state，但这个状态无法被 `InspectorPanel` 读到。需要把它提升到全局 store。

---

### Step 1：写失败测试

打开 `packages/client/src/stores/assetStore.test.ts`，在文件末尾（现有 `describe` 块结束之后）追加新的 `describe` 块：

```typescript
describe('assetStore - asset selection', () => {
  beforeEach(() => {
    useAssetStore.setState({
      assets: [
        {
          id: 1,
          name: 'model.glb',
          type: 'model' as const,
          project_id: 1,
          file_path: '/uploads/model.glb',
          file_size: 1024,
          mime_type: 'model/gltf-binary',
          created_at: '',
          updated_at: '',
        },
      ],
      selectedAssetId: null,
    });
    vi.clearAllMocks();
  });

  it('selectAsset sets selectedAssetId', () => {
    useAssetStore.getState().selectAsset(1);
    expect(useAssetStore.getState().selectedAssetId).toBe(1);
  });

  it('selectAsset(null) clears selection', () => {
    useAssetStore.setState({ selectedAssetId: 1 });
    useAssetStore.getState().selectAsset(null);
    expect(useAssetStore.getState().selectedAssetId).toBeNull();
  });

  it('clearAssets also clears selectedAssetId', () => {
    useAssetStore.setState({ selectedAssetId: 1 });
    useAssetStore.getState().clearAssets();
    expect(useAssetStore.getState().selectedAssetId).toBeNull();
  });

  it('initial selectedAssetId is null', () => {
    // Reset to initial state
    useAssetStore.setState({
      assets: [],
      selectedAssetId: null,
    });
    expect(useAssetStore.getState().selectedAssetId).toBeNull();
  });
});
```

### Step 2：运行测试确认失败

```bash
pnpm --filter client test --run packages/client/src/stores/assetStore.test.ts
```

预期：FAIL，报错 `Property 'selectedAssetId' does not exist` 或 `selectAsset is not a function`

---

### Step 3：修改 assetStore.ts

打开 `packages/client/src/stores/assetStore.ts`。

**3a. 在接口 `AssetState` 中添加新字段（在 `error: string | null;` 之后，约第 12 行）：**

```typescript
interface AssetState {
  // 状态
  assets: Asset[];
  isLoading: boolean;
  uploadProgress: Record<string, UploadProgress>;
  error: string | null;
  stats: AssetStats | null;
  selectedAssetId: number | null;   // ← 新增

  // 操作
  loadAssets: (projectId: number, type?: string) => Promise<void>;
  uploadAsset: (projectId: number, file: File, type: 'model' | 'texture') => Promise<Asset>;
  deleteAsset: (assetId: number) => Promise<void>;
  updateAsset: (assetId: number, updates: { name?: string; metadata?: Record<string, unknown> }) => Promise<void>;
  getAssetUrl: (assetId: number) => string;
  loadStats: (projectId: number) => Promise<void>;
  clearAssets: () => void;
  clearError: () => void;
  selectAsset: (id: number | null) => void;   // ← 新增
}
```

**3b. 在初始状态中添加 `selectedAssetId: null`（在 `stats: null,` 之后，约第 32 行）：**

```typescript
  // 初始状态
  assets: [],
  isLoading: false,
  uploadProgress: {},
  error: null,
  stats: null,
  selectedAssetId: null,   // ← 新增
```

**3c. 在 `clearAssets` 方法中也清除 `selectedAssetId`（约第 141-143 行）：**

将：
```typescript
  clearAssets: () => {
    set({ assets: [], uploadProgress: {}, error: null, stats: null });
  },
```

改为：
```typescript
  clearAssets: () => {
    set({ assets: [], uploadProgress: {}, error: null, stats: null, selectedAssetId: null });
  },
```

**3d. 在 `clearError` 之后添加新的 `selectAsset` action（约第 148 行）：**

```typescript
  // 清除错误
  clearError: () => {
    set({ error: null });
  },

  // 选中资产（用于 Inspector 显示导入配置）
  selectAsset: (id: number | null) => {
    set({ selectedAssetId: id });
  },
```

---

### Step 4：运行测试确认通过

```bash
pnpm --filter client test --run packages/client/src/stores/assetStore.test.ts
```

预期：所有测试通过（原有 2 个 + 新增 4 个 = 6 个 PASS）

---

### Step 5：运行全部测试确认无回归

```bash
pnpm --filter client test --run
```

预期：全部通过。

---

### Step 6：提交

```bash
git add packages/client/src/stores/assetStore.ts \
        packages/client/src/stores/assetStore.test.ts
git commit -m "feat(fbx): add selectedAssetId to assetStore for Inspector integration"
```

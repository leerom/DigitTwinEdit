# Task 3: 新建 useMaterialStore

**Files:**
- Create: `packages/client/src/stores/materialStore.ts`
- Create: `packages/client/src/stores/materialStore.test.ts`

---

### Step 1: 写失败测试

新建 `packages/client/src/stores/materialStore.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMaterialStore } from './materialStore';

// Mock API
vi.mock('@/api/assets', () => ({
  materialsApi: {
    createMaterial: vi.fn(),
    getMaterial: vi.fn(),
    updateMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
  },
  assetsApi: {
    getProjectAssets: vi.fn(),
  },
}));

// Mock sceneStore（syncMaterialAsset 会被 updateMaterialSpec 调用）
vi.mock('./sceneStore', () => ({
  useSceneStore: {
    getState: vi.fn(() => ({
      syncMaterialAsset: vi.fn(),
      clearMaterialAssetRefs: vi.fn(),
    })),
  },
}));

import { materialsApi, assetsApi } from '@/api/assets';
import { useSceneStore } from './sceneStore';

const mockAsset = (id: number, name = '测试材质') => ({
  id,
  project_id: 1,
  name,
  type: 'material' as const,
  file_path: `/uploads/materials/${name}.mat.json`,
  file_size: 100,
  mime_type: 'application/json',
  metadata: { materialType: 'MeshStandardMaterial' },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

describe('useMaterialStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMaterialStore.setState({
      materials: [],
      isLoading: false,
      saveError: null,
      selectedMaterialId: null,
    });
  });

  describe('loadMaterials', () => {
    it('从 API 加载材质列表并更新 materials', async () => {
      vi.mocked(assetsApi.getProjectAssets).mockResolvedValue([mockAsset(1), mockAsset(2)]);

      await useMaterialStore.getState().loadMaterials(1);

      expect(assetsApi.getProjectAssets).toHaveBeenCalledWith(1, 'material');
      expect(useMaterialStore.getState().materials).toHaveLength(2);
      expect(useMaterialStore.getState().isLoading).toBe(false);
    });
  });

  describe('createMaterial', () => {
    it('调用 API 创建材质，刷新列表并选中新材质', async () => {
      const newAsset = mockAsset(10, '金属材质');
      vi.mocked(materialsApi.createMaterial).mockResolvedValue(newAsset);
      vi.mocked(assetsApi.getProjectAssets).mockResolvedValue([newAsset]);

      const result = await useMaterialStore.getState().createMaterial(1, '金属材质', 'MeshStandardMaterial');

      expect(materialsApi.createMaterial).toHaveBeenCalledWith(1, {
        id: '',
        name: '金属材质',
        type: 'MeshStandardMaterial',
        properties: {},
      });
      expect(result).toEqual(newAsset);
      expect(useMaterialStore.getState().selectedMaterialId).toBe(10);
    });
  });

  describe('duplicateMaterial', () => {
    it('获取源材质数据后创建副本，名称附加"副本"', async () => {
      const sourceData = { id: '5', name: '原材质', type: 'MeshStandardMaterial', properties: { color: '#ff0000' } };
      const dupAsset = mockAsset(11, '原材质 副本');
      vi.mocked(materialsApi.getMaterial).mockResolvedValue(sourceData);
      vi.mocked(materialsApi.createMaterial).mockResolvedValue(dupAsset);
      vi.mocked(assetsApi.getProjectAssets).mockResolvedValue([dupAsset]);

      await useMaterialStore.getState().duplicateMaterial(5, 1);

      expect(materialsApi.getMaterial).toHaveBeenCalledWith(5);
      expect(materialsApi.createMaterial).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: '原材质 副本', properties: { color: '#ff0000' } })
      );
    });
  });

  describe('updateMaterialSpec', () => {
    it('成功时调用 API 更新材质并触发 syncMaterialAsset', async () => {
      vi.mocked(materialsApi.updateMaterial).mockResolvedValue(undefined);
      const syncFn = vi.fn();
      vi.mocked(useSceneStore.getState).mockReturnValue({ syncMaterialAsset: syncFn, clearMaterialAssetRefs: vi.fn() } as any);

      const spec = { type: 'MeshStandardMaterial' as const, props: { color: '#00ff00' } };
      await useMaterialStore.getState().updateMaterialSpec(7, spec);

      expect(materialsApi.updateMaterial).toHaveBeenCalledWith(7, {
        type: 'MeshStandardMaterial',
        properties: { color: '#00ff00' },
      });
      expect(syncFn).toHaveBeenCalledWith(7, spec);
      expect(useMaterialStore.getState().saveError).toBeNull();
    });

    it('API 失败时设置 saveError', async () => {
      vi.mocked(materialsApi.updateMaterial).mockRejectedValue(new Error('网络错误'));

      const spec = { type: 'MeshStandardMaterial' as const, props: {} };
      await useMaterialStore.getState().updateMaterialSpec(7, spec);

      expect(useMaterialStore.getState().saveError).toBeTruthy();
    });
  });

  describe('deleteMaterial', () => {
    it('调用 API 删除并从 materials 列表移除', async () => {
      useMaterialStore.setState({ materials: [mockAsset(3), mockAsset(4)] });
      vi.mocked(materialsApi.deleteMaterial).mockResolvedValue(undefined);

      await useMaterialStore.getState().deleteMaterial(3);

      expect(materialsApi.deleteMaterial).toHaveBeenCalledWith(3);
      expect(useMaterialStore.getState().materials).toHaveLength(1);
      expect(useMaterialStore.getState().materials[0].id).toBe(4);
    });
  });

  describe('selectMaterial', () => {
    it('设置 selectedMaterialId', () => {
      useMaterialStore.getState().selectMaterial(99);
      expect(useMaterialStore.getState().selectedMaterialId).toBe(99);
    });

    it('传 null 清除选中', () => {
      useMaterialStore.setState({ selectedMaterialId: 5 });
      useMaterialStore.getState().selectMaterial(null);
      expect(useMaterialStore.getState().selectedMaterialId).toBeNull();
    });
  });
});
```

运行：`pnpm --filter client test -- --run src/stores/materialStore.test.ts`

预期：`Cannot find module './materialStore'` 错误。

---

### Step 2: 实现 materialStore.ts

新建 `packages/client/src/stores/materialStore.ts`：

```typescript
import { create } from 'zustand';
import type { Asset } from '@digittwinedit/shared';
import type { MaterialSpec, MaterialType } from '@/types';
import { materialsApi, assetsApi } from '@/api/assets';
import { useSceneStore } from './sceneStore';

interface MaterialState {
  materials: Asset[];
  isLoading: boolean;
  saveError: string | null;
  selectedMaterialId: number | null;

  loadMaterials: (projectId: number) => Promise<void>;
  createMaterial: (projectId: number, name: string, type: MaterialType) => Promise<Asset>;
  duplicateMaterial: (materialId: number, projectId: number) => Promise<Asset>;
  renameMaterial: (materialId: number, name: string) => Promise<void>;
  deleteMaterial: (materialId: number) => Promise<void>;
  updateMaterialSpec: (materialId: number, spec: MaterialSpec) => Promise<void>;
  selectMaterial: (id: number | null) => void;
  clearSaveError: () => void;
}

export const useMaterialStore = create<MaterialState>((set, get) => ({
  materials: [],
  isLoading: false,
  saveError: null,
  selectedMaterialId: null,

  loadMaterials: async (projectId) => {
    set({ isLoading: true });
    try {
      const materials = await assetsApi.getProjectAssets(projectId, 'material');
      set({ materials, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createMaterial: async (projectId, name, type) => {
    const asset = await materialsApi.createMaterial(projectId, {
      id: '',
      name,
      type,
      properties: {},
    });
    await get().loadMaterials(projectId);
    set({ selectedMaterialId: asset.id });
    return asset;
  },

  duplicateMaterial: async (materialId, projectId) => {
    const source = await materialsApi.getMaterial(materialId);
    const asset = await materialsApi.createMaterial(projectId, {
      ...source,
      id: '',
      name: `${source.name} 副本`,
    });
    await get().loadMaterials(projectId);
    return asset;
  },

  renameMaterial: async (materialId, name) => {
    await materialsApi.updateMaterial(materialId, { name } as any);
    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === materialId ? { ...m, name } : m
      ),
    }));
  },

  deleteMaterial: async (materialId) => {
    await materialsApi.deleteMaterial(materialId);
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== materialId),
      selectedMaterialId:
        state.selectedMaterialId === materialId ? null : state.selectedMaterialId,
    }));
    useSceneStore.getState().clearMaterialAssetRefs(materialId);
  },

  updateMaterialSpec: async (materialId, spec) => {
    try {
      await materialsApi.updateMaterial(materialId, {
        type: spec.type,
        properties: spec.props,
      } as any);
      useSceneStore.getState().syncMaterialAsset(materialId, spec);
      set({ saveError: null });
    } catch {
      set({ saveError: '保存失败，请重试' });
    }
  },

  selectMaterial: (id) => set({ selectedMaterialId: id }),

  clearSaveError: () => set({ saveError: null }),
}));
```

### Step 3: 运行测试验证通过

```bash
pnpm --filter client test -- --run src/stores/materialStore.test.ts
```

预期：全部 PASS。

### Step 4: Commit

```bash
git add packages/client/src/stores/materialStore.ts \
        packages/client/src/stores/materialStore.test.ts
git commit -m "feat(store): 新建 useMaterialStore，支持材质资产 CRUD 与实时同步"
```

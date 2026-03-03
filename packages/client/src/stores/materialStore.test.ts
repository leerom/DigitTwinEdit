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
    it('成功时调用 API 更新材质（syncMaterialAsset 由 UI 层负责，不在此调用）', async () => {
      vi.mocked(materialsApi.updateMaterial).mockResolvedValue(undefined);
      const syncFn = vi.fn();
      vi.mocked(useSceneStore.getState).mockReturnValue({ syncMaterialAsset: syncFn, clearMaterialAssetRefs: vi.fn() } as any);

      const spec = { type: 'MeshStandardMaterial' as const, props: { color: '#00ff00' } };
      await useMaterialStore.getState().updateMaterialSpec(7, spec);

      expect(materialsApi.updateMaterial).toHaveBeenCalledWith(7, {
        type: 'MeshStandardMaterial',
        properties: { color: '#00ff00' },
      });
      // syncMaterialAsset 由 MaterialAssetProp UI 层直接调用（实时同步），
      // materialStore.updateMaterialSpec 仅负责持久化到服务端，不再重复调用
      expect(syncFn).not.toHaveBeenCalled();
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

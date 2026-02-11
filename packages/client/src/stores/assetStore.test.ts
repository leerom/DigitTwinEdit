import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAssetStore } from './assetStore';
import { assetsApi } from '../api/assets';

vi.mock('../api/assets');

describe('assetStore - update operations', () => {
  beforeEach(() => {
    useAssetStore.setState({
      assets: [
        {
          id: 1,
          name: 'model.glb',
          type: 'model',
          project_id: 1,
          file_path: '/uploads/model.glb',
          file_size: 1024,
          created_at: '',
          updated_at: '',
        },
        {
          id: 2,
          name: 'texture.png',
          type: 'texture',
          project_id: 1,
          file_path: '/uploads/texture.png',
          file_size: 2048,
          created_at: '',
          updated_at: '',
        },
      ],
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update asset', async () => {
    const mockUpdatedAsset = {
      id: 1,
      name: 'renamed-model.glb',
      type: 'model' as const,
      project_id: 1,
      file_path: '/uploads/model.glb',
      file_size: 1024,
      created_at: '',
      updated_at: '',
    };
    vi.mocked(assetsApi.updateAsset).mockResolvedValue(mockUpdatedAsset);

    await useAssetStore.getState().updateAsset(1, { name: 'renamed-model.glb' });

    expect(assetsApi.updateAsset).toHaveBeenCalledWith(1, { name: 'renamed-model.glb' });

    const state = useAssetStore.getState();
    expect(state.assets.find((a) => a.id === 1)?.name).toBe('renamed-model.glb');
  });

  it('should handle update error', async () => {
    const error = new Error('Failed to update');
    vi.mocked(assetsApi.updateAsset).mockRejectedValue(error);

    await expect(
      useAssetStore.getState().updateAsset(1, { name: 'renamed-model.glb' })
    ).rejects.toThrow('Failed to update');

    const state = useAssetStore.getState();
    expect(state.error).toBe('Failed to update');
  });
});

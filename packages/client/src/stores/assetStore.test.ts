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
    useAssetStore.setState({ assets: [], selectedAssetId: null });
    expect(useAssetStore.getState().selectedAssetId).toBeNull();
  });
});

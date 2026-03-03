import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BindMaterialAssetCommand } from './BindMaterialAssetCommand';
import { ObjectType } from '@/types';

// Mock sceneStore
const mockBindMaterialAsset = vi.fn();
vi.mock('@/stores/sceneStore', () => ({
  useSceneStore: {
    getState: () => ({
      bindMaterialAsset: mockBindMaterialAsset,
      scene: {
        objects: {
          'mesh-1': {
            id: 'mesh-1',
            type: ObjectType.MESH,
            components: {
              mesh: {
                material: { type: 'MeshStandardMaterial', props: { color: '#cccccc' } },
                materialAssetId: 5,
              },
            },
          },
        },
      },
    }),
  },
}));

describe('BindMaterialAssetCommand', () => {
  beforeEach(() => {
    mockBindMaterialAsset.mockClear();
  });

  it('execute 时调用 bindMaterialAsset，参数正确', () => {
    const spec = { type: 'MeshStandardMaterial' as const, props: { color: '#ff0000' } };
    const cmd = new BindMaterialAssetCommand('mesh-1', 42, spec);

    cmd.execute();

    expect(mockBindMaterialAsset).toHaveBeenCalledWith('mesh-1', 42, spec);
  });

  it('undo 时恢复之前的 material 和 materialAssetId', () => {
    const spec = { type: 'MeshStandardMaterial' as const, props: { color: '#ff0000' } };
    const cmd = new BindMaterialAssetCommand('mesh-1', 42, spec);

    cmd.execute(); // 记录 prevMaterial 和 prevAssetId
    cmd.undo();

    expect(mockBindMaterialAsset).toHaveBeenLastCalledWith(
      'mesh-1',
      5, // prevAssetId
      { type: 'MeshStandardMaterial', props: { color: '#cccccc' } } // prevMaterial
    );
  });

  it('name 为"绑定材质资产"', () => {
    const cmd = new BindMaterialAssetCommand('mesh-1', 1, { type: 'MeshStandardMaterial', props: {} });
    expect(cmd.name).toBe('绑定材质资产');
  });
});

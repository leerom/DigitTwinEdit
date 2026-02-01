import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSceneStore } from '@/stores/sceneStore';
import { SceneManager } from '@/features/scene/services/SceneManager';
import { ChangeMaterialTypeCommand } from './ChangeMaterialTypeCommand';
import { UpdateMaterialPropsCommand } from './UpdateMaterialPropsCommand';

vi.mock('@/stores/sceneStore', () => ({
  useSceneStore: {
    getState: vi.fn(),
  },
}));

describe('material commands', () => {
  let mockSceneStore: any;

  beforeEach(() => {
    const obj = SceneManager.createMesh('Cube', 'box');

    mockSceneStore = {
      scene: {
        root: 'root',
        objects: {
          root: { id: 'root', children: [obj.id] },
          [obj.id]: obj,
        },
      },
      addObject: vi.fn(),
      updateMeshMaterialSpec: vi.fn(),
    };

    (useSceneStore.getState as any).mockReturnValue(mockSceneStore);
  });

  it('should change type and undo', () => {
    const obj = Object.values(mockSceneStore.scene.objects).find((o: any) => o.id !== 'root');
    const id = obj.id;
    const before = mockSceneStore.scene.objects[id].components?.mesh?.material?.type;

    const cmd = new ChangeMaterialTypeCommand(id, 'MeshPhysicalMaterial');
    cmd.execute();

    expect(mockSceneStore.updateMeshMaterialSpec).toHaveBeenCalledTimes(1);
    const afterSpec = mockSceneStore.updateMeshMaterialSpec.mock.calls[0][1];
    expect(afterSpec.type).toBe('MeshPhysicalMaterial');

    cmd.undo();
    expect(mockSceneStore.updateMeshMaterialSpec).toHaveBeenCalledTimes(2);
    const undoSpec = mockSceneStore.updateMeshMaterialSpec.mock.calls[1][1];
    expect(undoSpec.type).toBe(before);
  });

  it('should update props and support merge', () => {
    const obj = Object.values(mockSceneStore.scene.objects).find((o: any) => o.id !== 'root');
    const id = obj.id;

    const cmd1 = new UpdateMaterialPropsCommand(id, { roughness: 0.2 });
    cmd1.execute();

    const cmd2 = new UpdateMaterialPropsCommand(id, { roughness: 0.3 });
    expect(cmd1.merge(cmd2)).toBe(true);

    // merged command should execute with latest props
    cmd1.execute();

    const lastCall = mockSceneStore.updateMeshMaterialSpec.mock.calls.at(-1);
    expect(lastCall?.[1].props.roughness).toBe(0.3);

    // undo should restore original spec
    cmd1.undo();
    const undoCall = mockSceneStore.updateMeshMaterialSpec.mock.calls.at(-1);
    expect(undoCall?.[1].type).toBe('MeshStandardMaterial');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSceneStore } from './sceneStore';

const mockAsset = {
  id: 1,
  project_id: 1,
  name: 'robot.glb',
  type: 'model' as const,
  file_path: '/uploads/robot.glb',
  file_size: 1024,
  created_at: '',
  updated_at: '',
};

describe('sceneStore - addAssetToScene', () => {
  beforeEach(() => {
    act(() => {
      useSceneStore.setState({
        scene: {
          id: 'test-scene',
          root: 'root',
          objects: {
            root: {
              id: 'root',
              name: 'Root',
              type: 'group' as const,
              parentId: null,
              children: [],
              visible: true,
              locked: false,
              transform: {
                position: [0, 0, 0] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                scale: [1, 1, 1] as [number, number, number],
              },
              components: {},
            },
          },
          createdAt: '',
          updatedAt: '',
        },
      });
    });
  });

  it('坐标未传时使用原点 [0,0,0]', () => {
    act(() => {
      useSceneStore.getState().addAssetToScene(mockAsset);
    });
    const state = useSceneStore.getState();
    const ids = state.scene.objects['root'].children;
    expect(ids).toHaveLength(1);
    const obj = state.scene.objects[ids[0]];
    expect(obj.transform.position).toEqual([0, 0, 0]);
  });

  it('传入坐标时使用该坐标', () => {
    act(() => {
      useSceneStore.getState().addAssetToScene(mockAsset, [3, 0, -5]);
    });
    const state = useSceneStore.getState();
    const ids = state.scene.objects['root'].children;
    const obj = state.scene.objects[ids[0]];
    expect(obj.transform.position).toEqual([3, 0, -5]);
  });

  it('添加模型后场景标记为 dirty', () => {
    act(() => {
      useSceneStore.getState().addAssetToScene(mockAsset);
    });
    expect(useSceneStore.getState().isDirty).toBe(true);
  });

  it('非 model 类型资产抛出错误', () => {
    const textureAsset = { ...mockAsset, type: 'texture' as const };
    expect(() => {
      act(() => {
        useSceneStore.getState().addAssetToScene(textureAsset);
      });
    }).toThrow('Only model assets can be added to scene');
  });
});

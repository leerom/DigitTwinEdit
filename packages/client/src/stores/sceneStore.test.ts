import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore } from './sceneStore';
import { act } from '@testing-library/react';
import { ObjectType } from '@/types';
import type { MaterialSpec } from '@/types';

describe('SceneStore - Import State', () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useSceneStore.getState().clearImportState();
    });
  });

  describe('setImportProgress', () => {
    it('should update import progress', () => {
      act(() => {
        useSceneStore.getState().setImportProgress({
          isImporting: true,
          percentage: 50,
          currentTask: '正在加载模型',
        });
      });

      const state = useSceneStore.getState();
      expect(state.importProgress.isImporting).toBe(true);
      expect(state.importProgress.percentage).toBe(50);
      expect(state.importProgress.currentTask).toBe('正在加载模型');
    });

    it('should allow partial updates', () => {
      act(() => {
        useSceneStore.getState().setImportProgress({
          isImporting: true,
        });
      });

      act(() => {
        useSceneStore.getState().setImportProgress({
          percentage: 75,
        });
      });

      const state = useSceneStore.getState();
      expect(state.importProgress.isImporting).toBe(true);
      expect(state.importProgress.percentage).toBe(75);
    });
  });

  describe('addImportError', () => {
    it('should add import error to errors array', () => {
      act(() => {
        useSceneStore.getState().addImportError({
          objectName: 'Test Object',
          error: 'Failed to load model',
        });
      });

      const state = useSceneStore.getState();
      expect(state.importErrors).toHaveLength(1);
      expect(state.importErrors[0].objectName).toBe('Test Object');
      expect(state.importErrors[0].error).toBe('Failed to load model');
    });

    it('should accumulate multiple errors', () => {
      act(() => {
        useSceneStore.getState().addImportError({
          objectName: 'Object 1',
          error: 'Error 1',
        });
        useSceneStore.getState().addImportError({
          objectName: 'Object 2',
          error: 'Error 2',
        });
      });

      const state = useSceneStore.getState();
      expect(state.importErrors).toHaveLength(2);
    });
  });

  describe('clearImportState', () => {
    it('should reset import progress to initial state', () => {
      act(() => {
        useSceneStore.getState().setImportProgress({
          isImporting: true,
          percentage: 75,
          currentTask: '正在加载',
        });
        useSceneStore.getState().clearImportState();
      });

      const state = useSceneStore.getState();
      expect(state.importProgress.isImporting).toBe(false);
      expect(state.importProgress.percentage).toBe(0);
      expect(state.importProgress.currentTask).toBe('');
    });

    it('should clear all import errors', () => {
      act(() => {
        useSceneStore.getState().addImportError({
          objectName: 'Test',
          error: 'Test error',
        });
        useSceneStore.getState().clearImportState();
      });

      const state = useSceneStore.getState();
      expect(state.importErrors).toHaveLength(0);
    });
  });

  describe('immer middleware compatibility', () => {
    it('should work correctly with immer for nested updates', () => {
      const initialProgress = useSceneStore.getState().importProgress;

      act(() => {
        useSceneStore.getState().setImportProgress({
          percentage: 50,
        });
      });

      const updatedProgress = useSceneStore.getState().importProgress;

      // Should create new object reference
      expect(updatedProgress).not.toBe(initialProgress);
      // But values should be updated
      expect(updatedProgress.percentage).toBe(50);
      // Other values should be preserved
      expect(updatedProgress.isImporting).toBe(false);
    });
  });
});

describe('sceneStore - add asset to scene', () => {
  beforeEach(() => {
    act(() => {
      useSceneStore.setState({
        scene: {
          id: 'test-scene',
          name: 'Test Scene',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          root: 'root',
          objects: {
            root: {
              id: 'root',
              name: 'Root',
              type: 'group',
              parentId: null,
              children: [],
              visible: true,
              locked: false,
              transform: {
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
              },
            },
          },
          assets: {},
          settings: {
            environment: { mode: 'default', assetId: null },
            gridVisible: true,
            backgroundColor: '#1a1a1a',
          },
        },
        isDirty: false,
      });
    });
  });

  it('should add model asset to scene center', () => {
    const mockAsset = {
      id: 1,
      name: 'model.glb',
      type: 'model' as const,
      project_id: 1,
      file_path: '/uploads/model.glb',
      file_size: 1024,
      created_at: '',
      updated_at: '',
    };

    act(() => {
      useSceneStore.getState().addAssetToScene(mockAsset);
    });

    const state = useSceneStore.getState();
    const rootChildren = state.scene.objects.root.children;
    expect(rootChildren).toHaveLength(1);

    const newObjectId = rootChildren[0];
    const newObject = state.scene.objects[newObjectId];

    expect(newObject.name).toBe('model');
    expect(newObject.type).toBe('Mesh');
    expect(newObject.transform.position).toEqual([0, 0, 0]);
    expect(newObject.components?.model?.path).toBe('/uploads/model.glb');
    expect(state.isDirty).toBe(true);
  });

  it('should throw error if asset type is not model', () => {
    const mockAsset = {
      id: 2,
      name: 'texture.png',
      type: 'texture' as const,
      project_id: 1,
      file_path: '/uploads/texture.png',
      file_size: 2048,
      created_at: '',
      updated_at: '',
    };

    expect(() => {
      act(() => {
        useSceneStore.getState().addAssetToScene(mockAsset);
      });
    }).toThrow('Only model assets can be added to scene');
  });
});

// ── 材质资产绑定相关 action 测试 ──────────────────────────────────────────────

const minimalScene = () => ({
  id: 'test',
  name: 'Test',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  root: 'root',
  objects: {
    root: {
      id: 'root',
      name: 'Root',
      type: ObjectType.GROUP,
      parentId: null as null,
      children: [] as string[],
      visible: true,
      locked: false,
      transform: { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] },
    },
  },
  assets: {},
  settings: { environment: { mode: 'default', assetId: null }, gridVisible: true, backgroundColor: '#000' },
});

describe('scene environment settings', () => {
  beforeEach(() => {
    act(() => {
      useSceneStore.setState({ scene: minimalScene(), isDirty: false });
    });
  });

  it('setEnvironmentAsset 应切换为 asset 模式并记录 assetId', () => {
    act(() => {
      useSceneStore.getState().setEnvironmentAsset(12);
    });

    expect(useSceneStore.getState().scene.settings.environment).toEqual({ mode: 'asset', assetId: 12 });
    expect(useSceneStore.getState().isDirty).toBe(true);
  });

  it('setDefaultEnvironment 应回退到默认环境', () => {
    act(() => {
      useSceneStore.getState().setEnvironmentAsset(12);
      useSceneStore.getState().setDefaultEnvironment();
    });

    expect(useSceneStore.getState().scene.settings.environment).toEqual({ mode: 'default', assetId: null });
  });

  it('loadScene 应兼容旧版字符串环境配置', () => {
    const legacyScene = {
      ...minimalScene(),
      settings: {
        environment: 'default',
        gridVisible: true,
        backgroundColor: '#123456',
      },
    };

    act(() => {
      useSceneStore.getState().loadScene(legacyScene as any);
    });

    expect(useSceneStore.getState().scene.settings.environment).toEqual({ mode: 'default', assetId: null });
    expect(useSceneStore.getState().scene.settings.backgroundColor).toBe('#123456');
  });
});

describe('bindMaterialAsset', () => {
  beforeEach(() => {
    act(() => {
      useSceneStore.setState({ scene: minimalScene(), isDirty: false });
    });
  });

  it('在目标对象的 mesh 组件上设置 materialAssetId 和 material', () => {
    act(() => {
      useSceneStore.getState().addObject({
        id: 'test-mesh',
        type: ObjectType.MESH,
        name: 'Test Mesh',
        components: {
          mesh: { assetId: '', materialId: '', castShadow: false, receiveShadow: false },
        },
      });
    });

    const spec: MaterialSpec = { type: 'MeshStandardMaterial', props: { color: '#ff0000' } };
    act(() => {
      useSceneStore.getState().bindMaterialAsset('test-mesh', 42, spec);
    });

    const obj = useSceneStore.getState().scene.objects['test-mesh'];
    expect(obj.components?.mesh?.materialAssetId).toBe(42);
    expect(obj.components?.mesh?.material).toEqual(spec);
  });

  it('模型对象（仅有 components.model）也能正确绑定材质资产', () => {
    act(() => {
      useSceneStore.getState().addObject({
        id: 'model-obj',
        type: ObjectType.MESH,
        name: 'Model Object',
        components: {
          model: { assetId: 7, path: 'models/test.glb' },
        },
      });
    });

    const spec: MaterialSpec = { type: 'MeshStandardMaterial', props: { color: '#00ff00' } };
    act(() => {
      useSceneStore.getState().bindMaterialAsset('model-obj', 42, spec);
    });

    const obj = useSceneStore.getState().scene.objects['model-obj'];
    expect(obj.components?.mesh?.materialAssetId).toBe(42);
    expect(obj.components?.mesh?.material).toEqual(spec);
    // components.model 保持不变
    expect((obj.components?.model as any)?.assetId).toBe(7);
  });

  it('assetId 为 0 时清除 materialAssetId', () => {
    act(() => {
      useSceneStore.getState().addObject({
        id: 'test-mesh-2',
        type: ObjectType.MESH,
        name: 'Test Mesh 2',
        components: {
          mesh: { assetId: '', materialId: '', castShadow: false, receiveShadow: false, materialAssetId: 99 },
        },
      });
    });

    const spec: MaterialSpec = { type: 'MeshStandardMaterial', props: {} };
    act(() => {
      useSceneStore.getState().bindMaterialAsset('test-mesh-2', 0, spec);
    });

    const obj = useSceneStore.getState().scene.objects['test-mesh-2'];
    expect(obj.components?.mesh?.materialAssetId).toBeUndefined();
  });
});

describe('syncMaterialAsset', () => {
  beforeEach(() => {
    act(() => {
      useSceneStore.setState({ scene: minimalScene(), isDirty: false });
    });
  });

  it('更新所有引用该资产 ID 的对象的 mesh.material', () => {
    const spec1: MaterialSpec = { type: 'MeshStandardMaterial', props: { color: '#aabbcc' } };
    act(() => {
      useSceneStore.getState().addObject({
        id: 'obj-a',
        type: ObjectType.MESH,
        name: 'Obj A',
        components: { mesh: { assetId: '', materialId: '', castShadow: false, receiveShadow: false, materialAssetId: 10, material: spec1 } },
      });
      useSceneStore.getState().addObject({
        id: 'obj-b',
        type: ObjectType.MESH,
        name: 'Obj B',
        components: { mesh: { assetId: '', materialId: '', castShadow: false, receiveShadow: false, materialAssetId: 99 } },
      });
    });

    const newSpec: MaterialSpec = { type: 'MeshStandardMaterial', props: { color: '#ffffff' } };
    act(() => {
      useSceneStore.getState().syncMaterialAsset(10, newSpec);
    });

    expect(useSceneStore.getState().scene.objects['obj-a'].components?.mesh?.material).toEqual(newSpec);
    // obj-b 不受影响（assetId 不同）
    expect(useSceneStore.getState().scene.objects['obj-b'].components?.mesh?.material).toBeUndefined();
  });
});

describe('clearMaterialAssetRefs', () => {
  beforeEach(() => {
    act(() => {
      useSceneStore.setState({ scene: minimalScene(), isDirty: false });
    });
  });

  it('清除所有引用指定资产 ID 的 materialAssetId', () => {
    act(() => {
      useSceneStore.getState().addObject({
        id: 'obj-c',
        type: ObjectType.MESH,
        name: 'Obj C',
        components: { mesh: { assetId: '', materialId: '', castShadow: false, receiveShadow: false, materialAssetId: 55 } },
      });
    });

    act(() => {
      useSceneStore.getState().clearMaterialAssetRefs(55);
    });

    expect(useSceneStore.getState().scene.objects['obj-c'].components?.mesh?.materialAssetId).toBeUndefined();
  });
});

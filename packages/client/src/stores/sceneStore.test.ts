import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore } from './sceneStore';
import { act } from '@testing-library/react';

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
            environment: 'default',
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

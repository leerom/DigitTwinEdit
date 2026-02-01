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

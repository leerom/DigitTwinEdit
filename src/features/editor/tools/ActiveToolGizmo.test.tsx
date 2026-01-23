// src/features/editor/tools/ActiveToolGizmo.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';

describe('ActiveToolGizmo', () => {
  beforeEach(() => {
    useEditorStore.getState().setActiveTool('hand');
    useEditorStore.getState().clearSelection();
  });

  it('should be importable', async () => {
    const module = await import('./ActiveToolGizmo');
    expect(module.ActiveToolGizmo).toBeDefined();
  });

  it('should handle hand tool state', () => {
    useEditorStore.getState().setActiveTool('hand');
    expect(useEditorStore.getState().activeTool).toBe('hand');
  });

  it('should handle translate tool with selection', () => {
    // Add a test object to scene
    const testObjectId = 'test-object-1';
    useSceneStore.getState().addObject({
      id: testObjectId,
      name: 'Test Object',
      type: 'Group' as any,
    });

    useEditorStore.getState().setActiveTool('translate');
    useEditorStore.getState().select([testObjectId]);

    expect(useEditorStore.getState().activeTool).toBe('translate');
    expect(useEditorStore.getState().selectedIds).toContain(testObjectId);
  });
});

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
    // 仅验证模块能被 import 且导出存在。若未来该测试在 CI 中不稳定，再考虑更严格的渲染级测试。
    const module = await import('./ActiveToolGizmo');
    expect(module.ActiveToolGizmo).toBeDefined();
  }, 20000);

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

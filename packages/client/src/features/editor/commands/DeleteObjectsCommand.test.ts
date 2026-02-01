import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteObjectsCommand } from './DeleteObjectsCommand';
import { useSceneStore } from '@/stores/sceneStore';
import { useEditorStore } from '@/stores/editorStore';
import { ObjectType } from '@/types';

// Mock stores
vi.mock('@/stores/sceneStore', () => ({
  useSceneStore: {
    getState: vi.fn(),
  },
}));

vi.mock('@/stores/editorStore', () => ({
  useEditorStore: {
    getState: vi.fn(),
  },
}));

describe('DeleteObjectsCommand', () => {
  let mockSceneStore: any;
  let mockEditorStore: any;
  let initialScene: any;

  beforeEach(() => {
    // Reset mocks and initial state
    initialScene = {
      root: 'root',
      objects: {
        root: { id: 'root', children: ['obj1', 'obj3'], type: ObjectType.GROUP },
        obj1: { id: 'obj1', name: 'Object 1', children: ['obj2'], parentId: 'root', type: ObjectType.MESH },
        obj2: { id: 'obj2', name: 'Object 2', children: [], parentId: 'obj1', type: ObjectType.MESH },
        obj3: { id: 'obj3', name: 'Object 3', children: [], parentId: 'root', type: ObjectType.MESH },
      },
    };

    mockSceneStore = {
      scene: initialScene,
      removeObject: vi.fn(),
      restoreObject: vi.fn(),
    };

    mockEditorStore = {
      clearSelection: vi.fn(),
      select: vi.fn(),
    };

    (useSceneStore.getState as any).mockReturnValue(mockSceneStore);
    (useEditorStore.getState as any).mockReturnValue(mockEditorStore);
  });

  it('should identify and delete single object', () => {
    const command = new DeleteObjectsCommand(['obj3']);
    command.execute();

    expect(mockSceneStore.removeObject).toHaveBeenCalledWith('obj3');
    expect(mockSceneStore.removeObject).toHaveBeenCalledTimes(1);
    expect(mockEditorStore.clearSelection).toHaveBeenCalled();
  });

  it('should delete object and its children (recursive)', () => {
    // We select obj1, which has child obj2
    // The command implementation we wrote iterates provided IDs and calls removeObject on them.
    // The store's removeObject handles the recursion in the actual app.
    // However, our command logic also recursively collects objects to store for UNDO.
    // So we verify that it captures the state correctly for both obj1 and obj2.

    const command = new DeleteObjectsCommand(['obj1']);
    command.execute();

    // The store's removeObject is called for the top-level ID
    expect(mockSceneStore.removeObject).toHaveBeenCalledWith('obj1');

    // Check if the command captured both objects for undo
    // Accessing private property for testing or we can verify undo behavior
    // Let's verify undo behavior instead to be cleaner
  });

  it('should support undo/redo', () => {
    const command = new DeleteObjectsCommand(['obj1']);
    command.execute();

    // Undo
    command.undo();

    // Should attempt to restore both obj1 and obj2
    expect(mockSceneStore.restoreObject).toHaveBeenCalledTimes(2);

    // Verify arguments contain the objects
    const restoreCalls = mockSceneStore.restoreObject.mock.calls;
    const restoredIds = restoreCalls.map((call: any) => call[0].id);
    expect(restoredIds).toContain('obj1');
    expect(restoredIds).toContain('obj2');

    // Verify selection restoration
    expect(mockEditorStore.select).toHaveBeenCalledWith(['obj1']);
  });

  it('should not delete root', () => {
    const command = new DeleteObjectsCommand(['root']);
    command.execute();
    expect(mockSceneStore.removeObject).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import { ObjectType } from '@/types';

describe('Selection Integration', () => {
  beforeEach(() => {
    useEditorStore.setState({ selectedIds: [], activeId: null });
    useSceneStore.setState({
      scene: {
        id: 'test',
        name: 'test',
        version: '1',
        createdAt: '',
        updatedAt: '',
        root: 'root',
        objects: {
          'root': { id: 'root', name: 'Root', type: ObjectType.GROUP, parentId: null, children: [], visible: true, locked: true, transform: { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] } }
        },
        assets: {},
        settings: { environment: '', gridVisible: true, backgroundColor: '' }
      }
    });
  });

  it('selects an object correctly', () => {
    const { result } = renderHook(() => useEditorStore());

    act(() => {
      result.current.select(['obj1']);
    });

    expect(result.current.selectedIds).toContain('obj1');
    expect(result.current.activeId).toBe('obj1');
  });

  it('multi-selects objects correctly', () => {
    const { result } = renderHook(() => useEditorStore());

    act(() => {
      result.current.select(['obj1']);
    });
    act(() => {
      result.current.select(['obj2'], true); // Append
    });

    expect(result.current.selectedIds).toHaveLength(2);
    expect(result.current.selectedIds).toContain('obj1');
    expect(result.current.selectedIds).toContain('obj2');
    expect(result.current.activeId).toBe('obj2'); // Last selected is active
  });

  it('deselects objects correctly', () => {
    const { result } = renderHook(() => useEditorStore());

    act(() => {
      result.current.select(['obj1', 'obj2']);
      result.current.deselect(['obj1']);
    });

    expect(result.current.selectedIds).not.toContain('obj1');
    expect(result.current.selectedIds).toContain('obj2');
  });

  it('clears selection correctly', () => {
    const { result } = renderHook(() => useEditorStore());

    act(() => {
      result.current.select(['obj1', 'obj2']);
      result.current.clearSelection();
    });

    expect(result.current.selectedIds).toHaveLength(0);
    expect(result.current.activeId).toBeNull();
  });
});

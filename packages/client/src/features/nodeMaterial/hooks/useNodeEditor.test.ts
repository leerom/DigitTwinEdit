// packages/client/src/features/nodeMaterial/hooks/useNodeEditor.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useNodeEditor } from './useNodeEditor';

describe('useNodeEditor', () => {
  it('初始化时含一个 MaterialOutput 节点', () => {
    const { result } = renderHook(() => useNodeEditor());
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0].type).toBe('MaterialOutput');
  });

  it('addNode 添加新节点', () => {
    const { result } = renderHook(() => useNodeEditor());
    act(() => { result.current.addNode('FloatInput', { x: 100, y: 100 }); });
    expect(result.current.nodes).toHaveLength(2);
    expect(result.current.nodes[1].type).toBe('FloatInput');
  });

  it('undo/redo addNode 正常工作', () => {
    const { result } = renderHook(() => useNodeEditor());
    act(() => { result.current.addNode('FloatInput', { x: 100, y: 100 }); });
    expect(result.current.nodes).toHaveLength(2);
    act(() => { result.current.undo(); });
    expect(result.current.nodes).toHaveLength(1);
    act(() => { result.current.redo(); });
    expect(result.current.nodes).toHaveLength(2);
  });

  it('toGraphData 返回合法的 NodeGraphData', () => {
    const { result } = renderHook(() => useNodeEditor());
    const graph = result.current.toGraphData();
    expect(graph.version).toBe(1);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
  });

  it('canUndo 初始为 false，addNode 后为 true', () => {
    const { result } = renderHook(() => useNodeEditor());
    expect(result.current.canUndo).toBe(false);
    act(() => { result.current.addNode('FloatInput', { x: 0, y: 0 }); });
    expect(result.current.canUndo).toBe(true);
  });
});

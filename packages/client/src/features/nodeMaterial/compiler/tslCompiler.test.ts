// packages/client/src/features/nodeMaterial/compiler/tslCompiler.test.ts
import { describe, it, expect } from 'vitest';
import { compileNodeGraph } from './tslCompiler';
import type { NodeGraphData } from '@/types';

// 辅助：构建最小测试图
function makeGraph(overrides: Partial<NodeGraphData> = {}): NodeGraphData {
  return { version: 1, nodes: [], edges: [], ...overrides };
}

describe('compileNodeGraph', () => {
  it('空图应返回 MeshStandardNodeMaterial 实例', () => {
    const mat = compileNodeGraph(makeGraph());
    expect(mat).toBeDefined();
    // duck typing：确认有 colorNode 属性（NodeMaterial 特征）
    expect('colorNode' in mat).toBe(true);
  });

  it('无 MaterialOutput 节点时 colorNode 为 null', () => {
    const mat = compileNodeGraph(makeGraph({ nodes: [], edges: [] }));
    expect(mat.colorNode).toBeNull();
  });

  it('FloatInput 连接到 MaterialOutput.metalness', () => {
    const graph: NodeGraphData = {
      version: 1,
      nodes: [
        { id: 'f1', type: 'FloatInput', position: { x: 0, y: 0 }, data: { typeKey: 'FloatInput', params: { value: 0.8 } } },
        { id: 'out', type: 'MaterialOutput', position: { x: 300, y: 0 }, data: { typeKey: 'MaterialOutput', params: {} } },
      ],
      edges: [
        { id: 'e1', source: 'f1', sourceHandle: 'out', target: 'out', targetHandle: 'metalness' },
      ],
    };
    const mat = compileNodeGraph(graph);
    expect(mat.metalnessNode).not.toBeNull();
  });

  it('ColorInput 连接到 MaterialOutput.color', () => {
    const graph: NodeGraphData = {
      version: 1,
      nodes: [
        { id: 'c1', type: 'ColorInput', position: { x: 0, y: 0 }, data: { typeKey: 'ColorInput', params: { value: '#ff0000' } } },
        { id: 'out', type: 'MaterialOutput', position: { x: 300, y: 0 }, data: { typeKey: 'MaterialOutput', params: {} } },
      ],
      edges: [
        { id: 'e1', source: 'c1', sourceHandle: 'out', target: 'out', targetHandle: 'color' },
      ],
    };
    const mat = compileNodeGraph(graph);
    expect(mat.colorNode).not.toBeNull();
  });

  it('MulNode: ColorInput × FloatInput → MaterialOutput.color', () => {
    const graph: NodeGraphData = {
      version: 1,
      nodes: [
        { id: 'c1', type: 'ColorInput', position: { x: 0, y: 0 }, data: { typeKey: 'ColorInput', params: { value: '#ffffff' } } },
        { id: 'f1', type: 'FloatInput', position: { x: 0, y: 100 }, data: { typeKey: 'FloatInput', params: { value: 0.5 } } },
        { id: 'm1', type: 'MulNode', position: { x: 150, y: 50 }, data: { typeKey: 'MulNode', params: {} } },
        { id: 'out', type: 'MaterialOutput', position: { x: 300, y: 50 }, data: { typeKey: 'MaterialOutput', params: {} } },
      ],
      edges: [
        { id: 'e1', source: 'c1', sourceHandle: 'out', target: 'm1', targetHandle: 'a' },
        { id: 'e2', source: 'f1', sourceHandle: 'out', target: 'm1', targetHandle: 'b' },
        { id: 'e3', source: 'm1', sourceHandle: 'out', target: 'out', targetHandle: 'color' },
      ],
    };
    const mat = compileNodeGraph(graph);
    expect(mat.colorNode).not.toBeNull();
  });

  it('TimeNode 连接到 MaterialOutput.alpha（动态效果）', () => {
    const graph: NodeGraphData = {
      version: 1,
      nodes: [
        { id: 't1', type: 'TimeNode', position: { x: 0, y: 0 }, data: { typeKey: 'TimeNode', params: {} } },
        { id: 'out', type: 'MaterialOutput', position: { x: 300, y: 0 }, data: { typeKey: 'MaterialOutput', params: {} } },
      ],
      edges: [
        { id: 'e1', source: 't1', sourceHandle: 'out', target: 'out', targetHandle: 'alpha' },
      ],
    };
    const mat = compileNodeGraph(graph);
    expect(mat.alphaNode ?? (mat as any).opacityNode).not.toBeNull();
  });
});

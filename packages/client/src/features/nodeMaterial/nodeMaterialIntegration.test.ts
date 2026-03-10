// packages/client/src/features/nodeMaterial/nodeMaterialIntegration.test.ts
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { compileNodeGraph } from './compiler/tslCompiler';
import { createThreeMaterial } from '@/features/materials/materialFactory';
import type { NodeGraphData, MaterialSpec } from '@/types';

// 最小完整图：ColorInput → MaterialOutput.color
const MINIMAL_GRAPH: NodeGraphData = {
  version: 1,
  nodes: [
    {
      id: 'c1', type: 'ColorInput', position: { x: 0, y: 0 },
      data: { typeKey: 'ColorInput', params: { value: '#ff0000' } },
    },
    {
      id: 'out', type: 'MaterialOutput', position: { x: 300, y: 0 },
      data: { typeKey: 'MaterialOutput', params: {} },
    },
  ],
  edges: [
    { id: 'e1', source: 'c1', sourceHandle: 'out', target: 'out', targetHandle: 'color' },
  ],
};

describe('NodeMaterial 集成', () => {
  it('compileNodeGraph 返回合法 MeshStandardNodeMaterial', () => {
    const mat = compileNodeGraph(MINIMAL_GRAPH);
    expect(mat).toBeDefined();
    expect('colorNode' in mat).toBe(true);
    expect(mat.colorNode).not.toBeNull();
  });

  it('createThreeMaterial 能处理 NodeMaterial spec，返回 WebGL 兼容的 MeshStandardMaterial', () => {
    const spec: MaterialSpec = {
      type: 'NodeMaterial',
      props: { graph: MINIMAL_GRAPH },
    };
    const mat = createThreeMaterial(spec);
    expect(mat).toBeDefined();
    // NodeMaterial 在 WebGL canvas 中以 MeshStandardMaterial 作为预览近似
    expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
    // 应提取到图中 ColorInput '#ff0000' 的颜色
    expect((mat as THREE.MeshStandardMaterial).color).toBeDefined();
  });

  it('createThreeMaterial NodeMaterial 无 graph 时降级为默认 MeshStandardMaterial', () => {
    const spec: MaterialSpec = {
      type: 'NodeMaterial',
      props: {},
    };
    const mat = createThreeMaterial(spec);
    expect(mat).toBeDefined();
    // 无 graph 时降级为默认 MeshStandardMaterial
    expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
  });

  it('序列化后的图保持 version:1', () => {
    expect(MINIMAL_GRAPH.version).toBe(1);
    expect(MINIMAL_GRAPH.nodes).toHaveLength(2);
    expect(MINIMAL_GRAPH.edges).toHaveLength(1);
  });
});

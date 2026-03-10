# 节点材质编辑器 — Phase 2: 节点系统

> 上级索引：[README.md](./README.md)

---

## Task 4: nodeCategories.ts — 节点分类元数据

**Files:**
- Create: `packages/client/src/features/nodeMaterial/nodes/nodeCategories.ts`

### Step 1: 创建分类定义文件

```typescript
// packages/client/src/features/nodeMaterial/nodes/nodeCategories.ts

export interface NodeCategory {
  key: string;
  label: string;
  color: string;      // 节点卡片头部颜色（Tailwind arbitrary color）
  icon: string;       // material-symbols-outlined 图标名
}

export const NODE_CATEGORIES: NodeCategory[] = [
  { key: 'input',   label: 'Inputs（输入）',    color: '#2563eb', icon: 'input' },
  { key: 'math',    label: 'Math（数学运算）',  color: '#16a34a', icon: 'calculate' },
  { key: 'mesh',    label: 'Mesh（网格数据）',  color: '#9333ea', icon: 'view_in_ar' },
  { key: 'output',  label: 'Output（输出）',    color: '#dc2626', icon: 'output' },
  { key: 'pbr',     label: 'PBR（物理渲染）',   color: '#d97706', icon: 'water_drop' },
];

export const CATEGORY_MAP = new Map<string, NodeCategory>(
  NODE_CATEGORIES.map((c) => [c.key, c])
);
```

### Step 2: 验证类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep "nodeCategories" | head -5
```

Expected: 无错误

### Step 3: Commit

```bash
git add packages/client/src/features/nodeMaterial/nodes/nodeCategories.ts
git commit -m "feat(nodeMaterial): add node category definitions"
```

---

## Task 5: nodeRegistry.ts — 节点类型注册表

**Files:**
- Create: `packages/client/src/features/nodeMaterial/nodes/nodeRegistry.ts`

### Step 1: 创建注册表（定义 ~25 个节点类型）

```typescript
// packages/client/src/features/nodeMaterial/nodes/nodeRegistry.ts
import type { NodeTypeDef } from '@/types';

// 辅助函数：构建简单端口
const port = (id: string, label: string, type: NodeTypeDef['inputs'][number]['type']) => ({ id, label, type, defaultValue: undefined });

export const NODE_REGISTRY: Record<string, NodeTypeDef> = {

  // ── Inputs ──────────────────────────────────────────────────────
  FloatInput: {
    key: 'FloatInput', label: 'Float（浮点数）', category: 'input',
    description: '输出单个浮点数值',
    inputs: [],
    outputs: [port('out', 'Value', 'float')],
    defaultParams: { value: 0.0 },
  },
  ColorInput: {
    key: 'ColorInput', label: 'Color（颜色）', category: 'input',
    description: '输出 RGB 颜色',
    inputs: [],
    outputs: [port('out', 'Color', 'color')],
    defaultParams: { value: '#ffffff' },
  },
  Vec2Input: {
    key: 'Vec2Input', label: 'Vector2', category: 'input',
    inputs: [],
    outputs: [port('out', 'Vec2', 'vec2')],
    defaultParams: { x: 0, y: 0 },
  },
  Vec3Input: {
    key: 'Vec3Input', label: 'Vector3', category: 'input',
    inputs: [],
    outputs: [port('out', 'Vec3', 'vec3')],
    defaultParams: { x: 0, y: 0, z: 0 },
  },
  TextureInput: {
    key: 'TextureInput', label: 'Texture（纹理）', category: 'input',
    description: '从资产库中选取纹理，输出采样颜色',
    inputs: [port('uv', 'UV', 'vec2')],
    outputs: [port('out', 'Color', 'color')],
    defaultParams: { assetId: null, assetName: '' },
  },
  TimeNode: {
    key: 'TimeNode', label: 'Time（时间）', category: 'input',
    description: '输出场景运行时间（秒）',
    inputs: [],
    outputs: [port('out', 'Time', 'float')],
    defaultParams: {},
  },
  UVNode: {
    key: 'UVNode', label: 'UV（纹理坐标）', category: 'input',
    inputs: [],
    outputs: [port('out', 'UV', 'vec2')],
    defaultParams: { index: 0 },
  },

  // ── Math ────────────────────────────────────────────────────────
  AddNode: {
    key: 'AddNode', label: 'Add（加）', category: 'math',
    inputs: [port('a', 'A', 'any'), port('b', 'B', 'any')],
    outputs: [port('out', 'Result', 'any')],
    defaultParams: {},
  },
  SubNode: {
    key: 'SubNode', label: 'Subtract（减）', category: 'math',
    inputs: [port('a', 'A', 'any'), port('b', 'B', 'any')],
    outputs: [port('out', 'Result', 'any')],
    defaultParams: {},
  },
  MulNode: {
    key: 'MulNode', label: 'Multiply（乘）', category: 'math',
    inputs: [port('a', 'A', 'any'), port('b', 'B', 'any')],
    outputs: [port('out', 'Result', 'any')],
    defaultParams: {},
  },
  DivNode: {
    key: 'DivNode', label: 'Divide（除）', category: 'math',
    inputs: [port('a', 'A', 'any'), port('b', 'B', 'any')],
    outputs: [port('out', 'Result', 'any')],
    defaultParams: {},
  },
  MixNode: {
    key: 'MixNode', label: 'Mix（混合）', category: 'math',
    description: 'Mix(A, B, T)：在 A 和 B 之间按 T 插值',
    inputs: [port('a', 'A', 'any'), port('b', 'B', 'any'), port('t', 'T (0-1)', 'float')],
    outputs: [port('out', 'Result', 'any')],
    defaultParams: {},
  },
  DotNode: {
    key: 'DotNode', label: 'Dot Product（点积）', category: 'math',
    inputs: [port('a', 'A', 'vec3'), port('b', 'B', 'vec3')],
    outputs: [port('out', 'Result', 'float')],
    defaultParams: {},
  },
  CrossNode: {
    key: 'CrossNode', label: 'Cross Product（叉积）', category: 'math',
    inputs: [port('a', 'A', 'vec3'), port('b', 'B', 'vec3')],
    outputs: [port('out', 'Result', 'vec3')],
    defaultParams: {},
  },
  NormalizeNode: {
    key: 'NormalizeNode', label: 'Normalize（归一化）', category: 'math',
    inputs: [port('a', 'Vector', 'vec3')],
    outputs: [port('out', 'Result', 'vec3')],
    defaultParams: {},
  },
  AbsNode: {
    key: 'AbsNode', label: 'Abs（绝对值）', category: 'math',
    inputs: [port('a', 'Value', 'float')],
    outputs: [port('out', 'Result', 'float')],
    defaultParams: {},
  },
  SinNode: {
    key: 'SinNode', label: 'Sin（正弦）', category: 'math',
    inputs: [port('a', 'Angle', 'float')],
    outputs: [port('out', 'Result', 'float')],
    defaultParams: {},
  },
  PowNode: {
    key: 'PowNode', label: 'Power（幂）', category: 'math',
    inputs: [port('base', 'Base', 'float'), port('exp', 'Exponent', 'float')],
    outputs: [port('out', 'Result', 'float')],
    defaultParams: {},
  },
  ClampNode: {
    key: 'ClampNode', label: 'Clamp（钳制）', category: 'math',
    inputs: [port('a', 'Value', 'float'), port('min', 'Min', 'float'), port('max', 'Max', 'float')],
    outputs: [port('out', 'Result', 'float')],
    defaultParams: { min: 0, max: 1 },
  },

  // ── Mesh ────────────────────────────────────────────────────────
  PositionNode: {
    key: 'PositionNode', label: 'Position（顶点位置）', category: 'mesh',
    inputs: [],
    outputs: [port('out', 'Position', 'vec3')],
    defaultParams: { space: 'local' },  // 'local' | 'world' | 'view'
  },
  NormalNode: {
    key: 'NormalNode', label: 'Normal（法线）', category: 'mesh',
    inputs: [],
    outputs: [port('out', 'Normal', 'vec3')],
    defaultParams: { space: 'local' },  // 'local' | 'world' | 'view'
  },

  // ── PBR ─────────────────────────────────────────────────────────
  NormalMapNode: {
    key: 'NormalMapNode', label: 'Normal Map（法线贴图）', category: 'pbr',
    description: '将纹理转换为切线空间法线向量',
    inputs: [port('texture', 'Texture', 'color'), port('scale', 'Scale', 'float')],
    outputs: [port('out', 'Normal', 'vec3')],
    defaultParams: { scale: 1 },
  },

  // ── Output ──────────────────────────────────────────────────────
  MaterialOutput: {
    key: 'MaterialOutput', label: 'Material Output（材质输出）', category: 'output',
    description: '材质的最终输出节点，不可删除',
    undeletable: true,
    inputs: [
      port('color',     'Color（颜色）',        'color'),
      port('metalness', 'Metalness（金属度）',  'float'),
      port('roughness', 'Roughness（粗糙度）',  'float'),
      port('emissive',  'Emissive（自发光）',   'color'),
      port('normal',    'Normal（法线）',        'vec3'),
      port('alpha',     'Alpha（透明度）',       'float'),
    ],
    outputs: [],
    defaultParams: {},
  },
};

export type NodeTypeKey = keyof typeof NODE_REGISTRY;
```

### Step 2: 验证类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep "nodeRegistry" | head -5
```

Expected: 无错误

### Step 3: Commit

```bash
git add packages/client/src/features/nodeMaterial/nodes/nodeRegistry.ts
git commit -m "feat(nodeMaterial): add 25-node type registry with port definitions"
```

---

## Task 6: tslCompiler.ts — TDD 编写编译器

**Files:**
- Create: `packages/client/src/features/nodeMaterial/compiler/tslCompiler.ts`
- Create: `packages/client/src/features/nodeMaterial/compiler/tslCompiler.test.ts`

> **TDD 流程:** 先写测试 → 运行确认失败 → 实现 → 运行确认通过

### Step 1: 先写测试文件 `tslCompiler.test.ts`

```typescript
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
    expect(mat.alphaNode ?? mat.opacityNode).not.toBeNull();
  });
});
```

### Step 2: 运行测试，确认失败（编译器未实现）

```bash
pnpm --filter client test -- --run src/features/nodeMaterial/compiler/tslCompiler.test.ts 2>&1 | tail -20
```

Expected: 测试失败，报 `Cannot find module './tslCompiler'`

### Step 3: 实现 `tslCompiler.ts`

```typescript
// packages/client/src/features/nodeMaterial/compiler/tslCompiler.ts
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/examples/jsm/nodes/Addons.js';
import {
  float, color, vec2, vec3, texture, uv, time,
  positionLocal, positionWorld, positionView,
  normalLocal, normalWorld, normalView,
  normalMap,
  add, sub, mul, div, mix,
  dot, cross, normalize, abs, sin, pow, clamp,
} from 'three/tsl';
import type { NodeGraphData, NodeGraphNode } from '@/types';

// TSL Node 类型（三方库不导出统一 base type，用 unknown 兼容）
type TSLNode = ReturnType<typeof float>;

/** 构建从 target 端口向上游递归的边查找表 */
function buildEdgeMap(graph: NodeGraphData): Map<string, { sourceId: string; sourceHandle: string }> {
  const map = new Map<string, { sourceId: string; sourceHandle: string }>();
  for (const edge of graph.edges) {
    // key = "targetNodeId:targetHandle"
    map.set(`${edge.target}:${edge.targetHandle}`, {
      sourceId: edge.source,
      sourceHandle: edge.sourceHandle,
    });
  }
  return map;
}

/** 获取某节点某输入端口对应的上游 TSL node（如果未连接则返回 null） */
function getInput(
  targetId: string,
  targetHandle: string,
  graph: NodeGraphData,
  edgeMap: Map<string, { sourceId: string; sourceHandle: string }>,
  texMap: Map<number, THREE.Texture>,
  visited: Set<string>,
): TSLNode | null {
  const entry = edgeMap.get(`${targetId}:${targetHandle}`);
  if (!entry) return null;
  return buildNodeOutput(entry.sourceId, entry.sourceHandle, graph, edgeMap, texMap, visited);
}

/** 递归编译单个节点的某个输出端口为 TSL node */
function buildNodeOutput(
  nodeId: string,
  _outputHandle: string,
  graph: NodeGraphData,
  edgeMap: Map<string, { sourceId: string; sourceHandle: string }>,
  texMap: Map<number, THREE.Texture>,
  visited: Set<string>,
): TSLNode | null {
  // 防止循环引用
  const visitKey = `${nodeId}:${_outputHandle}`;
  if (visited.has(visitKey)) return null;
  visited.add(visitKey);

  const node = graph.nodes.find((n) => n.id === nodeId) as NodeGraphNode | undefined;
  if (!node) return null;

  const p = node.data.params as Record<string, unknown>;
  const inp = (handle: string) => getInput(nodeId, handle, graph, edgeMap, texMap, new Set(visited));

  switch (node.type) {
    // ── Inputs ──────────────────────────────────────────────────
    case 'FloatInput':
      return float(p.value as number ?? 0) as unknown as TSLNode;
    case 'ColorInput':
      return color(p.value as string ?? '#ffffff') as unknown as TSLNode;
    case 'Vec2Input':
      return vec2(p.x as number ?? 0, p.y as number ?? 0) as unknown as TSLNode;
    case 'Vec3Input':
      return vec3(p.x as number ?? 0, p.y as number ?? 0, p.z as number ?? 0) as unknown as TSLNode;
    case 'TextureInput': {
      const assetId = p.assetId as number | null;
      if (!assetId) return color('#808080') as unknown as TSLNode;
      const tex = texMap.get(assetId);
      if (!tex) return color('#808080') as unknown as TSLNode;
      const uvInput = inp('uv') ?? uv() as unknown as TSLNode;
      return texture(tex, uvInput as any) as unknown as TSLNode;
    }
    case 'TimeNode':
      return time as unknown as TSLNode;
    case 'UVNode':
      return uv(p.index as number ?? 0) as unknown as TSLNode;
    case 'PositionNode':
      if (p.space === 'world') return positionWorld as unknown as TSLNode;
      if (p.space === 'view')  return positionView as unknown as TSLNode;
      return positionLocal as unknown as TSLNode;
    case 'NormalNode':
      if (p.space === 'world') return normalWorld as unknown as TSLNode;
      if (p.space === 'view')  return normalView as unknown as TSLNode;
      return normalLocal as unknown as TSLNode;

    // ── Math ────────────────────────────────────────────────────
    case 'AddNode': {
      const a = inp('a') ?? float(0) as unknown as TSLNode;
      const b = inp('b') ?? float(0) as unknown as TSLNode;
      return add(a as any, b as any) as unknown as TSLNode;
    }
    case 'SubNode': {
      const a = inp('a') ?? float(0) as unknown as TSLNode;
      const b = inp('b') ?? float(0) as unknown as TSLNode;
      return sub(a as any, b as any) as unknown as TSLNode;
    }
    case 'MulNode': {
      const a = inp('a') ?? float(1) as unknown as TSLNode;
      const b = inp('b') ?? float(1) as unknown as TSLNode;
      return mul(a as any, b as any) as unknown as TSLNode;
    }
    case 'DivNode': {
      const a = inp('a') ?? float(1) as unknown as TSLNode;
      const b = inp('b') ?? float(1) as unknown as TSLNode;
      return div(a as any, b as any) as unknown as TSLNode;
    }
    case 'MixNode': {
      const a = inp('a') ?? float(0) as unknown as TSLNode;
      const b = inp('b') ?? float(1) as unknown as TSLNode;
      const t = inp('t') ?? float(0.5) as unknown as TSLNode;
      return mix(a as any, b as any, t as any) as unknown as TSLNode;
    }
    case 'DotNode': {
      const a = inp('a') ?? vec3(0, 0, 0) as unknown as TSLNode;
      const b = inp('b') ?? vec3(0, 0, 1) as unknown as TSLNode;
      return dot(a as any, b as any) as unknown as TSLNode;
    }
    case 'CrossNode': {
      const a = inp('a') ?? vec3(1, 0, 0) as unknown as TSLNode;
      const b = inp('b') ?? vec3(0, 1, 0) as unknown as TSLNode;
      return cross(a as any, b as any) as unknown as TSLNode;
    }
    case 'NormalizeNode': {
      const a = inp('a') ?? vec3(0, 0, 1) as unknown as TSLNode;
      return normalize(a as any) as unknown as TSLNode;
    }
    case 'AbsNode': {
      const a = inp('a') ?? float(0) as unknown as TSLNode;
      return abs(a as any) as unknown as TSLNode;
    }
    case 'SinNode': {
      const a = inp('a') ?? float(0) as unknown as TSLNode;
      return sin(a as any) as unknown as TSLNode;
    }
    case 'PowNode': {
      const base = inp('base') ?? float(2) as unknown as TSLNode;
      const exp  = inp('exp')  ?? float(2) as unknown as TSLNode;
      return pow(base as any, exp as any) as unknown as TSLNode;
    }
    case 'ClampNode': {
      const a   = inp('a')   ?? float(0) as unknown as TSLNode;
      const min = inp('min') ?? float(p.min as number ?? 0) as unknown as TSLNode;
      const max = inp('max') ?? float(p.max as number ?? 1) as unknown as TSLNode;
      return clamp(a as any, min as any, max as any) as unknown as TSLNode;
    }

    // ── PBR ─────────────────────────────────────────────────────
    case 'NormalMapNode': {
      const texNode   = inp('texture') ?? float(0) as unknown as TSLNode;
      const scaleNode = inp('scale')   ?? float(p.scale as number ?? 1) as unknown as TSLNode;
      return normalMap(texNode as any, scaleNode as any) as unknown as TSLNode;
    }

    default:
      return null;
  }
}

/**
 * 将 NodeGraphData 编译为 MeshStandardNodeMaterial。
 * @param graph 序列化节点图
 * @param texMap assetId → THREE.Texture 映射（用于 TextureInput 节点）
 */
export function compileNodeGraph(
  graph: NodeGraphData,
  texMap: Map<number, THREE.Texture> = new Map(),
): MeshStandardNodeMaterial {
  const mat = new MeshStandardNodeMaterial();
  mat.colorNode    = null;
  mat.metalnessNode = null;
  mat.roughnessNode = null;
  mat.emissiveNode  = null;
  mat.normalNode    = null;
  // @ts-expect-error – alphaNode 类型声明因版本差异未统一
  mat.alphaNode     = null;

  const outputNode = graph.nodes.find((n) => n.type === 'MaterialOutput');
  if (!outputNode) return mat;

  const edgeMap = buildEdgeMap(graph);
  const buildInput = (handle: string) =>
    getInput(outputNode.id, handle, graph, edgeMap, texMap, new Set());

  const colorNode    = buildInput('color');
  const metalnessNode = buildInput('metalness');
  const roughnessNode = buildInput('roughness');
  const emissiveNode  = buildInput('emissive');
  const normalNode    = buildInput('normal');
  const alphaNode     = buildInput('alpha');

  if (colorNode)    mat.colorNode    = colorNode as any;
  if (metalnessNode) mat.metalnessNode = metalnessNode as any;
  if (roughnessNode) mat.roughnessNode = roughnessNode as any;
  if (emissiveNode)  mat.emissiveNode  = emissiveNode as any;
  if (normalNode)    mat.normalNode    = normalNode as any;
  if (alphaNode)    (mat as any).alphaNode = alphaNode;

  mat.needsUpdate = true;
  return mat;
}
```

### Step 4: 再次运行测试，确认通过

```bash
pnpm --filter client test -- --run src/features/nodeMaterial/compiler/tslCompiler.test.ts 2>&1 | tail -20
```

Expected: 全部 5 个测试通过（PASS）

> **如果测试失败：** 检查 `three/tsl` 和 `three/examples/jsm/nodes/Addons.js` 的实际导出。若 `MeshStandardNodeMaterial` import 报错，尝试 `import THREE from 'three'; const mat = new (THREE as any).MeshStandardNodeMaterial()`。

### Step 5: 验证整体类型检查无新增错误

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -E "error TS" | wc -l
```

Expected: 行数不超过修改前

### Step 6: Commit

```bash
git add packages/client/src/features/nodeMaterial/compiler/tslCompiler.ts \
        packages/client/src/features/nodeMaterial/compiler/tslCompiler.test.ts
git commit -m "feat(nodeMaterial): add TDD tslCompiler - compile NodeGraphData to MeshStandardNodeMaterial"
```

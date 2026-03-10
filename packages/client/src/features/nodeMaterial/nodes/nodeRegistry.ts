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

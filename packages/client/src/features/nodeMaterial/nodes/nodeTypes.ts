// packages/client/src/features/nodeMaterial/nodes/nodeTypes.ts
import type { NodeTypes } from '@xyflow/react';
import { InputNode } from './components/InputNode';
import { GenericNode } from './components/GenericNode';
import { OutputNode } from './components/OutputNode';

export const NODE_TYPES: NodeTypes = {
  // Input（含内联编辑）
  FloatInput: InputNode,
  ColorInput: InputNode,
  Vec2Input: InputNode,
  Vec3Input: InputNode,
  TextureInput: InputNode,
  TimeNode: GenericNode,
  UVNode: InputNode,
  // Math
  AddNode: GenericNode,
  SubNode: GenericNode,
  MulNode: GenericNode,
  DivNode: GenericNode,
  MixNode: GenericNode,
  DotNode: GenericNode,
  CrossNode: GenericNode,
  NormalizeNode: GenericNode,
  AbsNode: GenericNode,
  SinNode: GenericNode,
  PowNode: GenericNode,
  ClampNode: GenericNode,
  // Mesh
  PositionNode: InputNode,
  NormalNode: InputNode,
  // PBR
  NormalMapNode: GenericNode,
  // Output
  MaterialOutput: OutputNode,
};

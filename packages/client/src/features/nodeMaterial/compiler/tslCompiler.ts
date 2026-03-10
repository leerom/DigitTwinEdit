// packages/client/src/features/nodeMaterial/compiler/tslCompiler.ts
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
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
 * 从节点图中提取简单参数值，用于 WebGL Canvas 预览。
 * 返回纯参数对象，供 R3F <meshStandardMaterial> JSX 直接使用，
 * 无需创建 Three.js 材质实例（MeshStandardNodeMaterial 是 WebGPU 专用）。
 */
export function buildPreviewParams(graph: NodeGraphData): {
  color: string;
  roughness: number;
  metalness: number;
  emissive: string;
} {
  const defaults = { color: '#ffffff', roughness: 0.5, metalness: 0.0, emissive: '#000000' };

  const outputNode = graph.nodes.find((n) => n.type === 'MaterialOutput');
  if (!outputNode) return defaults;

  const edgeMap = buildEdgeMap(graph);

  /** 沿连线向上找到第一个叶节点，提取其原始参数值 */
  function resolveSimple(targetId: string, targetHandle: string): unknown {
    const entry = edgeMap.get(`${targetId}:${targetHandle}`);
    if (!entry) return null;
    const src = graph.nodes.find((n) => n.id === entry.sourceId);
    if (!src) return null;
    const p = src.data.params as Record<string, unknown>;
    switch (src.type) {
      case 'FloatInput': return typeof p.value === 'number' ? p.value : null;
      case 'ColorInput': return typeof p.value === 'string' ? p.value : null;
      default:           return null;
    }
  }

  const colorVal     = resolveSimple(outputNode.id, 'color');
  const roughnessVal = resolveSimple(outputNode.id, 'roughness');
  const metalnessVal = resolveSimple(outputNode.id, 'metalness');
  const emissiveVal  = resolveSimple(outputNode.id, 'emissive');

  return {
    color:     typeof colorVal     === 'string' ? colorVal     : defaults.color,
    roughness: typeof roughnessVal === 'number' ? roughnessVal : defaults.roughness,
    metalness: typeof metalnessVal === 'number' ? metalnessVal : defaults.metalness,
    emissive:  typeof emissiveVal  === 'string' ? emissiveVal  : defaults.emissive,
  };
}

/**
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

// packages/client/src/features/nodeMaterial/compiler/buildPreviewParams.ts
// 纯 JS 函数，不依赖 Three.js，用于从节点图递归求值并提取预览参数供 WebGL Canvas 使用
import type { NodeGraphData } from '@/types';

export interface PreviewParams {
  color: string;
  roughness: number;
  metalness: number;
  emissive: string;
}

// ── 内部值类型 ──────────────────────────────────────────────────────────────
// number = float，Vec3 = vec3/颜色分量（线性 0-1），string = hex 颜色 (#rrggbb)
type Vec3 = [number, number, number];
type EvalValue = number | Vec3 | string;

// ── 颜色空间转换 ────────────────────────────────────────────────────────────
function hexToVec3(hex: string): Vec3 {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return [
    Number.isNaN(r) ? 0 : r,
    Number.isNaN(g) ? 0 : g,
    Number.isNaN(b) ? 0 : b,
  ];
}

function vec3ToHex(v: Vec3): string {
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const toHex   = (x: number) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');
  return `#${toHex(v[0])}${toHex(v[1])}${toHex(v[2])}`;
}

/** 将任意 EvalValue 强制转为 Vec3（颜色分量 0-1 线性） */
function toVec3(v: EvalValue): Vec3 {
  if (typeof v === 'number') return [v, v, v];
  if (typeof v === 'string') return hexToVec3(v);
  return v;
}

// ── 数学辅助 ────────────────────────────────────────────────────────────────

/**
 * 二元运算：若任意一侧为颜色（string），则在 RGB 空间逐分量计算后返回 hex；
 * 若均为 number 则返回 number；否则逐分量返回 Vec3。
 */
function mapBinary(
  a: EvalValue,
  b: EvalValue,
  op: (x: number, y: number) => number,
): EvalValue {
  if (typeof a === 'number' && typeof b === 'number') return op(a, b);
  const isColor = typeof a === 'string' || typeof b === 'string';
  const va = toVec3(a); const vb = toVec3(b);
  const result: Vec3 = [op(va[0], vb[0]), op(va[1], vb[1]), op(va[2], vb[2])];
  return isColor ? vec3ToHex(result) : result;
}

function evalAdd(a: EvalValue, b: EvalValue): EvalValue {
  return mapBinary(a, b, (x, y) => x + y);
}
function evalSub(a: EvalValue, b: EvalValue): EvalValue {
  return mapBinary(a, b, (x, y) => x - y);
}
function evalMul(a: EvalValue, b: EvalValue): EvalValue {
  return mapBinary(a, b, (x, y) => x * y);
}
function evalDiv(a: EvalValue, b: EvalValue): EvalValue {
  return mapBinary(a, b, (x, y) => (y !== 0 ? x / y : 0));
}
function evalMix(a: EvalValue, b: EvalValue, t: EvalValue): EvalValue {
  const tN = typeof t === 'number' ? t : 0.5;
  const isColor = typeof a === 'string' || typeof b === 'string';
  if (typeof a === 'number' && typeof b === 'number') return a * (1 - tN) + b * tN;
  const va = toVec3(a); const vb = toVec3(b);
  const result: Vec3 = [
    va[0] * (1 - tN) + vb[0] * tN,
    va[1] * (1 - tN) + vb[1] * tN,
    va[2] * (1 - tN) + vb[2] * tN,
  ];
  return isColor ? vec3ToHex(result) : result;
}
function evalAbs(a: EvalValue): EvalValue {
  if (typeof a === 'number') return Math.abs(a);
  const v = toVec3(a);
  return [Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])];
}
function evalSin(a: EvalValue): EvalValue {
  if (typeof a === 'number') return Math.sin(a);
  const v = toVec3(a);
  return [Math.sin(v[0]), Math.sin(v[1]), Math.sin(v[2])];
}
function evalPow(base: EvalValue, exp: EvalValue): EvalValue {
  return mapBinary(base, exp, (x, y) => Math.pow(x, y));
}
function evalClamp(a: EvalValue, minV: EvalValue, maxV: EvalValue): EvalValue {
  const mn = typeof minV === 'number' ? minV : 0;
  const mx = typeof maxV === 'number' ? maxV : 1;
  if (typeof a === 'number') return Math.max(mn, Math.min(mx, a));
  const v = toVec3(a);
  return [
    Math.max(mn, Math.min(mx, v[0])),
    Math.max(mn, Math.min(mx, v[1])),
    Math.max(mn, Math.min(mx, v[2])),
  ];
}
function evalNormalize(a: EvalValue): Vec3 {
  const v = toVec3(a);
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}
function evalDot(a: EvalValue, b: EvalValue): number {
  const va = toVec3(a); const vb = toVec3(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
function evalCross(a: EvalValue, b: EvalValue): Vec3 {
  const va = toVec3(a); const vb = toVec3(b);
  return [
    va[1] * vb[2] - va[2] * vb[1],
    va[2] * vb[0] - va[0] * vb[2],
    va[0] * vb[1] - va[1] * vb[0],
  ];
}

// ── 核心求值 ────────────────────────────────────────────────────────────────

/**
 * 从节点图中提取简单参数值，用于 WebGL Canvas 预览。
 * 支持完整的递归图求值：所有数学节点均参与计算。
 */
export function buildPreviewParams(graph: NodeGraphData): PreviewParams {
  const defaults: PreviewParams = {
    color: '#ffffff',
    roughness: 0.5,
    metalness: 0.0,
    emissive: '#000000',
  };

  const outputNode = graph.nodes.find((n) => n.type === 'MaterialOutput');
  if (!outputNode) return defaults;

  // 构建 "targetNodeId:targetHandle" → 上游节点信息 的查找表
  const edgeMap = new Map<string, { sourceId: string; sourceHandle: string }>();
  for (const edge of graph.edges) {
    edgeMap.set(`${edge.target}:${edge.targetHandle}`, {
      sourceId: edge.source,
      sourceHandle: edge.sourceHandle,
    });
  }
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  /**
   * 递归求值：返回节点 nodeId 的 outputHandle 端口对应的计算结果。
   * visited 用于检测循环引用。
   */
  function evalNode(nodeId: string, outputHandle: string, visited = new Set<string>()): EvalValue | null {
    const key = `${nodeId}:${outputHandle}`;
    if (visited.has(key)) return null; // 防止循环引用
    visited.add(key);

    const node = nodeMap.get(nodeId);
    if (!node) return null;
    const p = node.data.params as Record<string, unknown>;

    /** 获取某个输入端口连接的上游计算值 */
    const inp = (handle: string): EvalValue | null => {
      const entry = edgeMap.get(`${nodeId}:${handle}`);
      if (!entry) return null;
      return evalNode(entry.sourceId, entry.sourceHandle, new Set(visited));
    };

    switch (node.type) {
      // ── Inputs ──────────────────────────────────────────────────────────
      case 'FloatInput':   return typeof p.value === 'number' ? p.value : 0;
      case 'ColorInput':   return typeof p.value === 'string' ? p.value : '#ffffff';
      case 'Vec2Input':    return [(p.x as number) ?? 0, (p.y as number) ?? 0, 0];
      case 'Vec3Input':    return [(p.x as number) ?? 0, (p.y as number) ?? 0, (p.z as number) ?? 0];
      // 动态节点静态预览值（不依赖 GPU 运行时）
      case 'TimeNode':     return 0;
      case 'UVNode':       return [0, 0, 0];
      case 'TextureInput': return '#808080';
      case 'PositionNode': return [0, 0, 0];
      case 'NormalNode':   return [0, 0, 1];

      // ── Math ────────────────────────────────────────────────────────────
      case 'AddNode':  return evalAdd(inp('a') ?? 0, inp('b') ?? 0);
      case 'SubNode':  return evalSub(inp('a') ?? 0, inp('b') ?? 0);
      case 'MulNode':  return evalMul(inp('a') ?? 1, inp('b') ?? 1);
      case 'DivNode':  return evalDiv(inp('a') ?? 1, inp('b') ?? 1);
      case 'MixNode':  return evalMix(inp('a') ?? 0, inp('b') ?? 1, inp('t') ?? 0.5);
      case 'DotNode':       return evalDot(inp('a') ?? [0, 0, 0], inp('b') ?? [0, 0, 1]);
      case 'CrossNode':     return evalCross(inp('a') ?? [1, 0, 0], inp('b') ?? [0, 1, 0]);
      case 'NormalizeNode': return evalNormalize(inp('a') ?? [0, 0, 1]);
      case 'AbsNode':  return evalAbs(inp('a') ?? 0);
      case 'SinNode':  return evalSin(inp('a') ?? 0);
      case 'PowNode':  return evalPow(inp('base') ?? 1, inp('exp') ?? 1);
      case 'ClampNode': {
        const minV = inp('min') ?? ((p.min as number) ?? 0);
        const maxV = inp('max') ?? ((p.max as number) ?? 1);
        return evalClamp(inp('a') ?? 0, minV, maxV);
      }

      // ── PBR ─────────────────────────────────────────────────────────────
      case 'NormalMapNode': return [0, 0, 1]; // 法线贴图无法在 CPU 上预览，固定中性法线

      default: return null;
    }
  }

  /** 从 MaterialOutput 的某个输入端口向上游递归求值 */
  const getOutputInput = (handle: string): EvalValue | null => {
    const entry = edgeMap.get(`${outputNode.id}:${handle}`);
    if (!entry) return null;
    return evalNode(entry.sourceId, entry.sourceHandle);
  };

  const colorVal     = getOutputInput('color');
  const roughnessVal = getOutputInput('roughness');
  const metalnessVal = getOutputInput('metalness');
  const emissiveVal  = getOutputInput('emissive');

  /** 将任意 EvalValue 转换为 hex 颜色字符串 */
  const toHexColor = (v: EvalValue | null): string | null => {
    if (v === null) return null;
    if (typeof v === 'string') return v;
    return vec3ToHex(toVec3(v));
  };

  /** 将任意 EvalValue 转换为 0-1 浮点数（vec3 取 R 分量） */
  const toFloat01 = (v: EvalValue | null): number | null => {
    if (v === null) return null;
    if (typeof v === 'number') return Math.max(0, Math.min(1, v));
    return Math.max(0, Math.min(1, toVec3(v)[0]));
  };

  return {
    color:     toHexColor(colorVal)    ?? defaults.color,
    roughness: toFloat01(roughnessVal) ?? defaults.roughness,
    metalness: toFloat01(metalnessVal) ?? defaults.metalness,
    emissive:  toHexColor(emissiveVal) ?? defaults.emissive,
  };
}

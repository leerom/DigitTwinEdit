// Core Vector type
export type Vector3 = [number, number, number];

// Import shared types
import type { AssetReference as SharedAssetReference, MaterialReference as SharedMaterialReference } from '@digittwinedit/shared';
export type { AssetType, AssetReference, MaterialReference } from '@digittwinedit/shared';

// Core Transform Component
export interface TransformComponent {
  position: Vector3;
  rotation: Vector3; // Euler angles in radians
  scale: Vector3;
}

// Material Spec (serializable)
export type MaterialType =
  | 'MeshStandardMaterial'
  | 'MeshBasicMaterial'
  | 'MeshLambertMaterial'
  | 'MeshPhongMaterial'
  | 'MeshPhysicalMaterial'
  | 'NodeMaterial';

export type MaterialSpec = {
  type: MaterialType;
  // 受白名单约束；值在渲染层/编辑器层做校验与归一化
  props: Record<string, unknown>;
};

// Mesh Component
export interface MeshComponent {
  assetId: string;
  materialId: string;
  material?: MaterialSpec;
  geometry?: 'box' | 'sphere' | 'plane' | 'cylinder' | 'torus' | 'capsule';
  castShadow: boolean;
  receiveShadow: boolean;
  materialAssetId?: number;   // 绑定的材质资产 DB ID（可选）
  frustumCulled?: boolean;   // Three.js 视锥体裁剪，默认 true
  renderOrder?: number;      // Three.js 渲染顺序，默认 0
}

// Twin Component (Digital Twin Metadata)
export interface TwinComponent {
  externalId: string;
  dataSource: string;
  lastUpdate: number;
  status: 'online' | 'offline' | 'error';
}

// Camera Component
export interface CameraComponent {
  fov: number;
  near: number;
  far: number;
  orthographic: boolean;
  size?: number; // for orthographic
  castShadow?: boolean;
  receiveShadow?: boolean;
  frustumCulled?: boolean;
  renderOrder?: number;
}

// Light Component
export interface LightComponent {
  color: string;           // 所有光源（半球光为天空色 skyColor）
  intensity: number;       // 所有光源
  type: 'directional' | 'point' | 'spot' | 'ambient' | 'hemisphere';

  // 仅 hemisphere
  groundColor?: string;    // 地面色，默认 '#444444'

  // directional / point / spot
  castShadow?: boolean;

  // point / spot
  range?: number;          // Three.js distance，0 = 无限
  decay?: number;          // 默认 2

  // 仅 spot
  angle?: number;          // 锥角 0~π/2，默认 π/6
  penumbra?: number;       // 柔边 0~1，默认 0.1

  // 阴影参数（directional / point / spot，castShadow=true 时生效）
  shadowMapSize?: 512 | 1024 | 2048 | 4096;
  shadowBias?: number;
  shadowNormalBias?: number;
  shadowRadius?: number;

  // 仅 directional 阴影正交摄像机
  shadowCameraSize?: number;
  shadowNear?: number;
  shadowFar?: number;
}

// Object Types
export enum ObjectType {
  GROUP = 'Group',
  MESH = 'Mesh',
  LIGHT = 'Light',
  CAMERA = 'Camera',
  TWIN = 'Twin',
}

// Scene Object
export interface SceneObject {
  id: string;
  name: string;
  type: ObjectType;
  parentId: string | null;
  children: string[];
  visible: boolean;
  locked: boolean;
  castShadow?: boolean;      // GROUP 使用；MESH 用 MeshComponent.castShadow
  receiveShadow?: boolean;   // GROUP 使用；MESH 用 MeshComponent.receiveShadow
  frustumCulled?: boolean;   // GROUP 使用；MESH 用 MeshComponent.frustumCulled
  renderOrder?: number;      // GROUP 使用；MESH 用 MeshComponent.renderOrder
  transform: TransformComponent;
  components?: {
    mesh?: MeshComponent;
    twin?: TwinComponent;
    camera?: CameraComponent;
    light?: LightComponent;
    [key: string]: any;
  };
}

// Scene Settings
export interface SceneEnvironmentSettings {
  mode: 'default' | 'asset';
  assetId: number | null;
}

export function normalizeSceneEnvironmentSettings(
  environment: SceneEnvironmentSettings | string | null | undefined
): SceneEnvironmentSettings {
  if (environment && typeof environment === 'object') {
    if (environment.mode === 'asset' && typeof environment.assetId === 'number') {
      return { mode: 'asset', assetId: environment.assetId };
    }

    return { mode: 'default', assetId: null };
  }

  return { mode: 'default', assetId: null };
}

// ── 后处理效果类型 ──────────────────────────────────────────────
export type PostProcessEffectType = 'UnrealBloom' | 'Film' | 'Bokeh' | 'SSAO';

export interface UnrealBloomParams {
  threshold: number;
  strength: number;
  radius: number;
}

export interface FilmParams {
  intensity: number;
  grayscale: boolean;
}

export interface BokehParams {
  focus: number;
  aperture: number;
  maxblur: number;
}

export interface SSAOParams {
  kernelRadius: number;
  minDistance: number;
  maxDistance: number;
}

export type PostProcessParams =
  | UnrealBloomParams
  | FilmParams
  | BokehParams
  | SSAOParams;

export interface PostProcessEffect {
  id: string;
  type: PostProcessEffectType;
  enabled: boolean;
  params: PostProcessParams;
}

export interface SceneSettings {
  environment: SceneEnvironmentSettings;
  gridVisible: boolean;
  backgroundColor: string;
  shadowMapType?: 'PCFSoftShadowMap' | 'PCFShadowMap' | 'VSMShadowMap';
  postProcessing?: PostProcessEffect[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function normalizeSceneSettings(
  settings: Omit<SceneSettings, 'environment'> & {
    environment?: SceneEnvironmentSettings | string | null;
  }
): SceneSettings {
  return {
    gridVisible: settings.gridVisible,
    backgroundColor: settings.backgroundColor,
    ...settings,
    environment: normalizeSceneEnvironmentSettings(settings.environment),
  };
}

// Scene
export interface Scene {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  root: string;
  objects: Record<string, SceneObject>;
  assets: Record<string, SharedAssetReference>;
  materials?: Record<string, SharedMaterialReference>;
  settings: SceneSettings;
}

// ── NodeMaterial 节点图类型 ─────────────────────────────────────

/** 节点端口的数据类型 */
export type NodePortType =
  | 'float'
  | 'int'
  | 'bool'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'color'   // vec3 的颜色语义子类型
  | 'texture' // sampler2D
  | 'mat4'
  | 'any';    // 接受任意类型

/** 节点端口（输入或输出插槽）定义 */
export interface NodePortDef {
  id: string;
  label: string;
  type: NodePortType;
  defaultValue?: unknown; // 未连接时的降级默认值
}

/** 单个节点元数据（注册表静态定义） */
export interface NodeTypeDef {
  key: string;                   // 节点类型唯一 key
  label: string;                 // UI 显示名称
  category: string;              // 所属分类 key
  description?: string;          // 工具提示说明
  inputs: NodePortDef[];
  outputs: NodePortDef[];
  defaultParams: Record<string, unknown>; // 节点内联参数初始值
  undeletable?: boolean;         // fragmentOutput 等不可删除节点
}

/** 存储在 React Flow 节点 data 字段中的运行时数据 */
export interface NodeRFData {
  typeKey: string;               // 对应 NodeTypeDef.key
  label?: string;                // 用户自定义标签（可选）
  params: Record<string, unknown>; // 当前参数值（可内联编辑）
}

/** 存储在数据库 material.properties.graph 的序列化格式 */
export interface NodeGraphNode {
  id: string;
  type: string;                  // NodeTypeDef.key
  position: { x: number; y: number };
  data: NodeRFData;
}

export interface NodeGraphEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

export interface NodeGraphData {
  version: 1;
  nodes: NodeGraphNode[];
  edges: NodeGraphEdge[];
}

/** NodeMaterial 的 MaterialSpec.props 结构 */
export interface NodeMaterialProps {
  baseType: 'standard' | 'physical'; // 底层 PBR 模型
  graph: NodeGraphData;
}

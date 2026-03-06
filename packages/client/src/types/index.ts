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
  | 'MeshPhysicalMaterial';

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

export interface SceneSettings {
  environment: SceneEnvironmentSettings;
  gridVisible: boolean;
  backgroundColor: string;
  shadowMapType?: 'PCFSoftShadowMap' | 'PCFShadowMap' | 'VSMShadowMap';
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

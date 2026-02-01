// Core Vector type
export type Vector3 = [number, number, number];

// Import shared types
import type { AssetType as SharedAssetType, AssetReference as SharedAssetReference, MaterialReference as SharedMaterialReference } from '@digittwinedit/shared';
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
  color: string;
  intensity: number;
  type: 'directional' | 'point' | 'spot' | 'ambient';
  castShadow?: boolean;
  range?: number; // for point/spot
  decay?: number; // for point/spot
  angle?: number; // for spot
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
export interface SceneSettings {
  environment: string;
  gridVisible: boolean;
  backgroundColor: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
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

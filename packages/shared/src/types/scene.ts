// Re-export scene types from client
// These types are already defined in client/src/types/index.ts

import type { AssetType } from './asset.js';

// Core Vector type
export type Vector3 = [number, number, number];

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
  size?: number;
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
  range?: number;
  decay?: number;
  angle?: number;
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

// Asset Reference
export interface AssetReference {
  id: string;
  name: string;
  type: AssetType;
  path: string;
  thumbnail?: string;
  assetDbId?: number; // Database asset ID
}

// Material Reference
export interface MaterialReference {
  id: string;
  name: string;
  path: string; // API path to material
  materialDbId?: number; // Database asset ID
}

// Scene Settings
export interface SceneSettings {
  environment: string;
  gridVisible: boolean;
  backgroundColor: string;
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
  assets: Record<string, AssetReference>;
  materials?: Record<string, MaterialReference>; // 材质引用
  settings: SceneSettings;
}

// Database Scene types
export interface SceneRecord {
  id: number;
  project_id: number;
  name: string;
  data: Scene; // JSONB field
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSceneRequest {
  name: string;
  data?: Scene;
}

export interface UpdateSceneRequest {
  name?: string;
  data?: Scene;
}

export interface SceneResponse {
  id: number;
  project_id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SceneWithDataResponse extends SceneResponse {
  data: Scene;
}

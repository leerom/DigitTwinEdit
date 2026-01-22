// Core Vector type
export type Vector3 = [number, number, number];

// Core Transform Component
export interface TransformComponent {
  position: Vector3;
  rotation: Vector3; // Euler angles in radians
  scale: Vector3;
}

// Mesh Component
export interface MeshComponent {
  assetId: string;
  materialId: string;
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
}

// Light Component
export interface LightComponent {
  color: string;
  intensity: number;
  type: 'directional' | 'point' | 'spot' | 'ambient';
  castShadow?: boolean;
  range?: number; // for point/spot
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

// Asset Types
export enum AssetType {
  MODEL = 'model',
  MATERIAL = 'material',
  TEXTURE = 'texture',
}

// Asset Reference
export interface AssetReference {
  id: string;
  name: string;
  type: AssetType;
  path: string;
  thumbnail?: string;
}

// Scene Settings
export interface SceneSettings {
  environment: string;
  gridVisible: boolean;
  backgroundColor: string;
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
  settings: SceneSettings;
}

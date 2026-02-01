/**
 * 资产类型定义
 */
export type AssetType = 'model' | 'material' | 'texture';

/**
 * 资产接口
 */
export interface Asset {
  id: number;
  project_id: number;
  name: string;
  type: AssetType;
  file_path: string;
  file_size: number;
  mime_type: string;
  thumbnail_path?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * 材质资产接口
 */
export interface MaterialAsset {
  id: string;
  name: string;
  type: string; // Three.js MaterialType
  properties: Record<string, unknown>;
  textureReferences?: Record<string, number>; // texture asset ID references
  created_at?: string;
  updated_at?: string;
}

/**
 * 上传进度接口
 */
export interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
}

/**
 * 资产统计接口
 */
export interface AssetStats {
  total: number;
  models: number;
  materials: number;
  textures: number;
  totalSize: number;
}

/**
 * 场景资产引用接口
 */
export interface SceneAssetReference {
  id: string;
  name: string;
  type: AssetType;
  path: string; // API路径
  assetDbId?: number; // 数据库ID
  thumbnail?: string;
}

/**
 * 场景材质引用接口
 */
export interface SceneMaterialReference {
  id: string;
  name: string;
  path: string; // API路径
  materialDbId?: number; // 数据库ID
}

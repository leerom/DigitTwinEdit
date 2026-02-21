/**
 * FBX 导入配置 - 法线选项
 * 'import': 从 FBX 文件中导入法线（默认）
 * 'calculate': 根据 normalsMode 重新计算法线
 */
export type NormalsOption = 'import' | 'calculate';

/**
 * FBX 导入配置 - 法线模式（仅 normals='calculate' 时生效）
 */
export type NormalsModeOption =
  | 'unweighted'     // 不加权
  | 'areaWeighted'   // 面积加权
  | 'angleWeighted'  // 顶角加权
  | 'areaAndAngle';  // 面积和顶角加权（默认）

/**
 * FBX 导入时使用的保存格式
 */
export type SaveFormatOption = 'glb' | 'gltf';

/**
 * FBX 导入配置项（完整设置）
 */
export interface FBXImportSettings {
  /** 缩放比例，默认 1.0 */
  scale: number;
  /** 转换单位：将 1cm（FBX 默认）转为 0.01m（three.js 单位），默认 true */
  convertUnits: boolean;
  /** 法线处理方式，默认 'import' */
  normals: NormalsOption;
  /** 法线计算模式，仅 normals='calculate' 时生效，默认 'areaAndAngle' */
  normalsMode: NormalsModeOption;
  /** 输出格式，默认 'glb' */
  saveFormat: SaveFormatOption;
  /** 是否将纹理嵌入 GLB 文件，默认 true */
  embedTextures: boolean;
}

/**
 * FBX 导入配置的默认值
 */
export const DEFAULT_FBX_IMPORT_SETTINGS: FBXImportSettings = {
  scale: 1.0,
  convertUnits: true,
  normals: 'import',
  normalsMode: 'areaAndAngle',
  saveFormat: 'glb',
  embedTextures: true,
};

/**
 * Worker 接收的输入消息
 */
export interface WorkerInput {
  fbxBuffer: ArrayBuffer;
  settings: FBXImportSettings;
}

/**
 * Worker 发出的输出消息
 */
export type WorkerOutput =
  | { type: 'progress'; percent: number }
  | { type: 'done'; glbBuffer: ArrayBuffer }
  | { type: 'error'; message: string };

/**
 * FBXImporter 导入进度回调数据
 */
export interface ImportProgress {
  step: string;
  percent: number;
}

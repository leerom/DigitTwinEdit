/** POT（2 的幂次方）取整方式 */
export type POTMode = 'nearest' | 'ceil' | 'floor';

/** 压缩模式：ETC1S 文件小，UASTC 质量高 */
export type CompressionMode = 'ETC1S' | 'UASTC';

/** 纹理转换设置（用户可配置的全部参数） */
export interface TextureConvertSettings {
  /** 是否生成 Mipmap（默认 true） */
  generateMipmaps: boolean;
  /** 是否缩放到 2 的幂次方（默认 false） */
  potResize: boolean;
  /** POT 取整方式（默认 'nearest'） */
  potMode: POTMode;
  /** 压缩质量 1–255（ETC1S 专用，默认 200） */
  quality: number;
  /** 是否强制保留 Alpha 通道（默认 false，自动检测） */
  hasAlpha: boolean;
  /** 色彩空间（默认 'sRGB'；法线贴图/粗糙度贴图应选 'Linear'） */
  colorSpace: 'sRGB' | 'Linear';
  /** 压缩模式（默认 'ETC1S'） */
  compressionMode: CompressionMode;
}

export const DEFAULT_TEXTURE_CONVERT_SETTINGS: TextureConvertSettings = {
  generateMipmaps: true,
  potResize: false,
  potMode: 'nearest',
  quality: 200,
  hasAlpha: false,
  colorSpace: 'sRGB',
  compressionMode: 'ETC1S',
};

/** Worker 接收的输入消息 */
export interface TextureWorkerInput {
  /** createImageBitmap 得到的 ImageBitmap（Transferable） */
  imageBitmap: ImageBitmap;
  settings: TextureConvertSettings;
  originalWidth: number;
  originalHeight: number;
}

/** Worker 发出的输出消息 */
export type TextureWorkerOutput =
  | { type: 'progress'; percent: number }
  /** Alpha 被自动检测到（settings.hasAlpha=false 时发出） */
  | { type: 'warning'; code: 'DETECTED_ALPHA' }
  | { type: 'done'; ktx2Buffer: ArrayBuffer; finalWidth: number; finalHeight: number }
  | { type: 'error'; message: string };

/** 转换进度（传递给 UI 的进度信息） */
export interface TextureConvertProgress {
  step: string;
  percent: number;
}

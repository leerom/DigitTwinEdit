export type IBLCompressionMode = 'ETC1S' | 'UASTC';

export interface IBLConvertSettings {
  maxWidth: 1024 | 2048 | 4096;
  compressionMode: IBLCompressionMode;
  generateMipmaps: boolean;
}

export const DEFAULT_IBL_CONVERT_SETTINGS: IBLConvertSettings = {
  maxWidth: 4096,
  compressionMode: 'UASTC',
  generateMipmaps: true,
};

export interface IBLConvertProgress {
  step: string;
  percent: number;
}

export interface IBLWorkerInput {
  fileBuffer: ArrayBuffer;
  fileName: string;
  settings: IBLConvertSettings;
}

export type IBLWorkerOutput =
  | { type: 'progress'; percent: number }
  | {
      type: 'done';
      previewBuffer: ArrayBuffer;
      previewWidth: number;
      previewHeight: number;
      runtimeBuffer: ArrayBuffer;
      originalWidth: number;
      originalHeight: number;
      runtimeWidth: number;
      runtimeHeight: number;
      originalFormat: 'hdr' | 'exr';
    }
  | { type: 'error'; message: string };

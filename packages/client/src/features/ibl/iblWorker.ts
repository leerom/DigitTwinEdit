import { encodeToKTX2 } from 'ktx2-encoder';
import { DataUtils } from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import type { IBLWorkerInput, IBLWorkerOutput } from './types';

function postMsg(message: IBLWorkerOutput, transfer?: Transferable[]) {
  if (transfer) {
    (self as unknown as Worker).postMessage(message, transfer);
    return;
  }
  self.postMessage(message);
}

function getOriginalFormat(fileName: string): 'hdr' | 'exr' {
  return fileName.toLowerCase().endsWith('.exr') ? 'exr' : 'hdr';
}

function toFloat(data: Uint16Array | Float32Array, index: number): number {
  if (data instanceof Float32Array) {
    return data[index] ?? 0;
  }
  return DataUtils.fromHalfFloat(data[index] ?? 0);
}

function toneMapChannel(value: number): number {
  const mapped = value / (1 + Math.max(0, value));
  const srgb = Math.pow(Math.max(0, mapped), 1 / 2.2);
  return Math.max(0, Math.min(255, Math.round(srgb * 255)));
}

function fitWidth(width: number, height: number, maxWidth: number): { width: number; height: number } {
  if (width <= maxWidth) {
    return { width, height };
  }
  const scale = maxWidth / width;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function decodeHDRTexture(fileBuffer: ArrayBuffer, format: 'hdr' | 'exr') {
  const loader = format === 'hdr' ? new RGBELoader() : new EXRLoader();
  const parsed = loader.parse(fileBuffer);
  return {
    width: parsed.width,
    height: parsed.height,
    data: parsed.data as Uint16Array | Float32Array,
  };
}

async function createPreviewBuffer(
  hdrData: Uint16Array | Float32Array,
  width: number,
  height: number
): Promise<{ previewBuffer: ArrayBuffer; previewWidth: number; previewHeight: number }> {
  const { width: previewWidth, height: previewHeight } = fitWidth(width, height, 512);
  const previewPixels = new Uint8ClampedArray(previewWidth * previewHeight * 4);

  for (let y = 0; y < previewHeight; y += 1) {
    const sourceY = Math.min(height - 1, Math.floor((y / previewHeight) * height));
    for (let x = 0; x < previewWidth; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor((x / previewWidth) * width));
      const sourceIndex = (sourceY * width + sourceX) * 4;
      const targetIndex = (y * previewWidth + x) * 4;

      previewPixels[targetIndex] = toneMapChannel(toFloat(hdrData, sourceIndex));
      previewPixels[targetIndex + 1] = toneMapChannel(toFloat(hdrData, sourceIndex + 1));
      previewPixels[targetIndex + 2] = toneMapChannel(toFloat(hdrData, sourceIndex + 2));
      previewPixels[targetIndex + 3] = 255;
    }
  }

  const canvas = new OffscreenCanvas(previewWidth, previewHeight);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('OffscreenCanvas 2D context 不可用');
  }

  context.putImageData(new ImageData(previewPixels, previewWidth, previewHeight), 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const previewBuffer = await blob.arrayBuffer();

  return { previewBuffer, previewWidth, previewHeight };
}

async function encodeRuntimeKTX2(
  fileBuffer: ArrayBuffer,
  format: 'hdr' | 'exr',
  generateMipmaps: boolean,
  compressionMode: 'ETC1S' | 'UASTC'
): Promise<ArrayBuffer> {
  if (compressionMode !== 'UASTC') {
    throw new Error('当前 HDR/EXR 的 KTX2 编码仅支持 UASTC');
  }

  const encoderJsText = await fetch('/basis/basis_encoder.js').then((response) => response.text());
  const jsUrl = URL.createObjectURL(new Blob([encoderJsText], { type: 'application/javascript' }));

  try {
    const runtimeData = await encodeToKTX2(new Uint8Array(fileBuffer), {
      isHDR: true,
      imageType: format,
      isUASTC: true,
      hdrQualityLevel: 2,
      isKTX2File: true,
      generateMipmap: generateMipmaps,
      isPerceptual: false,
      isSetKTX2SRGBTransferFunc: false,
      jsUrl,
      wasmUrl: '/basis/basis_encoder.wasm',
    });

    return runtimeData.buffer.slice(
      runtimeData.byteOffset,
      runtimeData.byteOffset + runtimeData.byteLength,
    ) as ArrayBuffer;
  } finally {
    URL.revokeObjectURL(jsUrl);
  }
}

self.onmessage = async (event: MessageEvent<IBLWorkerInput>) => {
  const { fileBuffer, fileName, settings } = event.data;

  try {
    const originalFormat = getOriginalFormat(fileName);
    postMsg({ type: 'progress', percent: 10 });

    const decoded = decodeHDRTexture(fileBuffer, originalFormat);
    postMsg({ type: 'progress', percent: 45 });

    const { previewBuffer, previewWidth, previewHeight } = await createPreviewBuffer(
      decoded.data,
      decoded.width,
      decoded.height,
    );
    postMsg({ type: 'progress', percent: 70 });

    const runtimeBuffer = await encodeRuntimeKTX2(
      fileBuffer,
      originalFormat,
      settings.generateMipmaps,
      settings.compressionMode,
    );
    postMsg({ type: 'progress', percent: 95 });

    postMsg(
      {
        type: 'done',
        previewBuffer,
        previewWidth,
        previewHeight,
        runtimeBuffer,
        originalWidth: decoded.width,
        originalHeight: decoded.height,
        runtimeWidth: decoded.width,
        runtimeHeight: decoded.height,
        originalFormat,
      },
      [previewBuffer, runtimeBuffer],
    );
  } catch (error) {
    postMsg({
      type: 'error',
      message: error instanceof Error ? error.message : 'IBL 转换失败',
    });
  }
};

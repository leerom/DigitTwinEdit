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

self.onmessage = async (event: MessageEvent<IBLWorkerInput>) => {
  const { fileBuffer, fileName, settings } = event.data;

  try {
    const originalFormat = getOriginalFormat(fileName);
    postMsg({ type: 'progress', percent: 10 });

    // 解码 HDR/EXR 以获取尺寸信息及生成预览图
    const decoded = decodeHDRTexture(fileBuffer, originalFormat);
    postMsg({ type: 'progress', percent: 50 });

    const { previewBuffer, previewWidth, previewHeight } = await createPreviewBuffer(
      decoded.data,
      decoded.width,
      decoded.height,
    );
    postMsg({ type: 'progress', percent: 90 });

    // 当前 basis_encoder.wasm 不支持 UASTC HDR 编码（无 setSliceSourceImageHDR）。
    // 直接将原始文件字节作为运行时资产存储，由 SceneEnvironment 使用
    // RGBELoader / EXRLoader 加载，保留完整 HDR 动态范围。
    // maxWidth / compressionMode / generateMipmaps 设置暂不应用。
    const runtimeBuffer = fileBuffer;
    void settings; // 设置已存入 metadata，但编码阶段暂不使用

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

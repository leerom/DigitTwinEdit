/**
 * FBX → GLB 转换 Web Worker
 *
 * 运行在独立线程中，不阻塞编辑器 UI。
 * 通过 postMessage 接收 FBX buffer 和设置，返回进度和 GLB buffer。
 */

// Web Worker 环境没有 window 对象，Three.js / fflate 内部会引用 window。
// 将 self（Worker 全局作用域）赋给 window，避免 "window is not defined" 错误。
(globalThis as any).window = globalThis;

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { WorkerInput, WorkerOutput, NormalsModeOption } from './types';

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { fbxBuffer, settings } = e.data;

  try {
    // === Step 1: 解析 FBX ===
    postProgress(20);
    const loader = new FBXLoader();
    // parse() 接受 ArrayBuffer 和资源路径（空字符串表示无外部资源）
    const group: THREE.Group = loader.parse(fbxBuffer, '');

    // === Step 2: 应用缩放 ===
    postProgress(40);
    const scaleFactor = settings.convertUnits
      ? settings.scale * 0.01  // FBX 默认 1 单位 = 1cm，three.js 是 1m
      : settings.scale;
    if (Math.abs(scaleFactor - 1) > 1e-6) {
      group.scale.setScalar(scaleFactor);
    }

    // === Step 3: 处理法线 ===
    postProgress(55);
    if (settings.normals === 'calculate') {
      applyCalculatedNormals(group, settings.normalsMode);
    }

    // === Step 4: 导出 GLB ===
    postProgress(70);
    const exporter = new GLTFExporter();

    let glbBuffer: ArrayBuffer;

    // parseAsync 在 Three.js r152+ 可用，优先使用
    if (typeof (exporter as any).parseAsync === 'function') {
      const result = await (exporter as any).parseAsync(group, {
        binary: settings.saveFormat !== 'gltf',
        embedImages: settings.embedTextures,
      });
      glbBuffer = result as ArrayBuffer;
    } else {
      // 回退：使用旧版 parse 的 callback 形式
      glbBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        (exporter as any).parse(
          group,
          (result: ArrayBuffer) => resolve(result),
          (error: Error) => reject(error),
          {
            binary: settings.saveFormat !== 'gltf',
            embedImages: settings.embedTextures,
          }
        );
      });
    }

    postProgress(100);

    // 发送 done 并转移 ArrayBuffer 所有权（零拷贝）
    const doneMsg: WorkerOutput = { type: 'done', glbBuffer };
    (self as any).postMessage(doneMsg, [glbBuffer]);

  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : '文件解析失败，请检查文件完整性';
    const errorMsg: WorkerOutput = { type: 'error', message };
    (self as any).postMessage(errorMsg);
  }
};

/**
 * 发送进度消息给主线程
 */
function postProgress(percent: number): void {
  const msg: WorkerOutput = { type: 'progress', percent };
  (self as any).postMessage(msg);
}

/**
 * 对场景中所有 Mesh 重新计算顶点法线
 * 注意：Three.js 的 computeVertexNormals 使用面积加权，
 * 暂时统一使用此方法，后续可按 normalsMode 精细化。
 */
function applyCalculatedNormals(
  object: THREE.Object3D,
  _normalsMode: NormalsModeOption
): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      child.geometry.computeVertexNormals();
    }
  });
}

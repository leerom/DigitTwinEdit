/**
 * FBX → GLB 转换 Web Worker
 *
 * 运行在独立线程中，不阻塞编辑器 UI。
 * 通过 postMessage 接收 FBX buffer 和设置，返回进度和 GLB buffer。
 */

// 在任何 polyfill 添加之前捕获 Worker 环境标志
// （ESM import 虽然被提升解析，但 document 访问是懒惰的，发生在函数调用时，
//  因此此处的 polyfill 在 self.onmessage 实际触发前一定已生效）
const IS_WORKER = typeof (globalThis as any).document === 'undefined';

// Web Worker 环境没有 window 对象，Three.js / fflate 内部会引用 window。
// 将 self（Worker 全局作用域）赋给 window，避免 "window is not defined" 错误。
(globalThis as any).window = globalThis;

// Web Worker 环境没有 document 对象。
// Three.js ImageLoader 内部调用 document.createElementNS('img') 来创建图片元素，
// 在 Worker 中直接触发 "document is not defined" ReferenceError。
// 提供最小 stub 防止崩溃；图片的实际加载由下方 ImageLoader 补丁承担。
if (IS_WORKER) {
  (globalThis as any).document = {
    createElementNS(_ns: string, tag: string) {
      if (tag !== 'img') return {};
      // 返回形似 HTMLImageElement 的 stub；实际加载路径已被 ImageLoader 补丁绕过
      return {
        addEventListener() {},
        removeEventListener() {},
        crossOrigin: null,
        naturalWidth: 0,
        naturalHeight: 0,
        width: 0,
        height: 0,
        get src() { return ''; },
        set src(_url: string) {},
      };
    },
    createElement(tag: string) {
      return tag === 'canvas' && typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(1, 1)
        : {};
    },
  };
}

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { WorkerInput, WorkerOutput, NormalsModeOption } from './types';

// ── 纹理加载完成计数器 ──────────────────────────────────────────────────
// 追踪所有异步纹理加载（含缓存命中的异步路径）。
// 每发起一次加载，计数 +1；成功/失败均 -1；
// 减到 0 时通知所有通过 waitForTextureLoads() 等待的调用者。
let _pendingTextureLoads = 0;
const _textureLoadResolvers: Array<() => void> = [];

function _onTextureLoadSettled(): void {
  _pendingTextureLoads = Math.max(0, _pendingTextureLoads - 1);
  if (_pendingTextureLoads === 0 && _textureLoadResolvers.length > 0) {
    const resolvers = _textureLoadResolvers.splice(0);
    resolvers.forEach((r) => r());
  }
}

// ── Worker 纹理加载补丁 ──────────────────────────────────────────────────
// THREE.ImageLoader 原始实现依赖 document.createElementNS 创建 <img>，
// 在 Worker 中不可用。将其替换为 fetch + createImageBitmap：
//   1. 支持 data: URI（FBX 内嵌纹理）和 blob: URL
//   2. 返回 ImageBitmap，GLTFExporter 在 Worker 中已通过 OffscreenCanvas
//      支持 drawImage(ImageBitmap)，纹理可完整写入 GLB。
if (IS_WORKER) {
  (THREE.ImageLoader.prototype as any).load = function(
    this: THREE.ImageLoader,
    url: string,
    onLoad?: (image: any) => void,
    _onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): any {
    if (this.path !== undefined) url = this.path + url;
    const resolvedUrl = this.manager.resolveURL(url);

    // 优先返回缓存
    const cached = THREE.Cache.get(resolvedUrl);
    if (cached !== undefined) {
      _pendingTextureLoads++;
      this.manager.itemStart(resolvedUrl);
      setTimeout(() => {
        onLoad?.(cached);
        this.manager.itemEnd(resolvedUrl);
        _onTextureLoadSettled();
      }, 0);
      return cached;
    }

    _pendingTextureLoads++;
    this.manager.itemStart(resolvedUrl);
    fetch(resolvedUrl)
      .then((r) => r.blob())
      .then((blob) => createImageBitmap(blob))
      .then((bitmap) => {
        THREE.Cache.add(resolvedUrl, bitmap);
        onLoad?.(bitmap);
        this.manager.itemEnd(resolvedUrl);
        _onTextureLoadSettled();
      })
      .catch((err) => {
        // 纹理加载失败时静默跳过，不影响模型几何体的导出
        console.warn('[FBXWorker] 纹理加载失败（已跳过）:', resolvedUrl, err);
        onError?.(err);
        this.manager.itemError(resolvedUrl);
        _onTextureLoadSettled();
      });

    return {} as any;
  };
}

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { fbxBuffer, settings } = e.data;

  try {
    // === Step 1: 解析 FBX ===
    postProgress(20);
    const loader = new FBXLoader();
    // parse() 接受 ArrayBuffer 和资源路径（空字符串表示无外部资源）
    const group: THREE.Group = loader.parse(fbxBuffer, '');

    // ImageLoader 补丁使用 fetch 异步加载纹理，parse() 返回时加载未必完成。
    // 等待 DefaultLoadingManager 中所有 itemStart/itemEnd 配对完毕，
    // 确保 texture.image 已是 ImageBitmap 再交给 GLTFExporter。
    await waitForTextureLoads();

    // 清理仍无效的纹理（如 TGA/DDS 等 createImageBitmap 不支持的格式加载失败后
    // texture.image 仍为 undefined），避免 GLTFExporter 抛 "No valid image data"。
    sanitizeTextures(group);

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

/**
 * 等待所有异步纹理加载完成（或失败）后 resolve。
 *
 * FBXLoader.parse() 同步触发 ImageLoader.load()，但纹理内容通过 fetch 异步加载。
 * 若在纹理就绪之前调用 GLTFExporter，texture.image 仍为 undefined，
 * 导出器会抛 "No valid image data found" 错误。
 *
 * 通过 _pendingTextureLoads 计数器追踪所有待完成的加载，
 * 计数归零时 resolve，供 onmessage 在导出前 await。
 */
function waitForTextureLoads(): Promise<void> {
  if (_pendingTextureLoads === 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    _textureLoadResolvers.push(resolve);
  });
}

/**
 * 清理场景中所有 image 无效的纹理 slot。
 *
 * 某些格式（TGA、DDS 等）不被 createImageBitmap 支持，加载失败后
 * texture.image 仍为 stub 对象而非可用的 ImageBitmap，
 * GLTFExporter 遇到这类纹理时会抛 "No valid image data" 异常。
 * 将无效 slot 置为 null 并 dispose，确保导出器安全跳过。
 */
function sanitizeTextures(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat) return;
      const m = mat as Record<string, any>;
      const slots = [
        'map', 'normalMap', 'roughnessMap', 'metalnessMap',
        'aoMap', 'emissiveMap', 'alphaMap', 'displacementMap',
        'bumpMap', 'lightMap', 'envMap', 'specularMap',
      ];
      for (const slot of slots) {
        const tex: THREE.Texture | null | undefined = m[slot];
        if (tex instanceof THREE.Texture && !isValidTextureImage(tex.image)) {
          m[slot] = null;
          tex.dispose();
        }
      }
      m.needsUpdate = true;
    });
  });
}

/**
 * 判断纹理的 image 字段是否为 GLTFExporter 能处理的有效格式。
 * 有效类型：ImageBitmap、已加载的 HTMLImageElement、
 *           HTMLCanvasElement、OffscreenCanvas、ImageData。
 */
function isValidTextureImage(image: unknown): boolean {
  if (!image) return false;
  if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) return true;
  if (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement) {
    return (image as HTMLImageElement).naturalWidth > 0;
  }
  if (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) return true;
  if (typeof OffscreenCanvas !== 'undefined' && image instanceof OffscreenCanvas) return true;
  if (typeof ImageData !== 'undefined' && image instanceof ImageData) return true;
  return false;
}

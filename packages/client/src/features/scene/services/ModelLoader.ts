import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type LoadState = 'pending' | 'loading' | 'loaded' | 'error';

export interface ModelLoadResult {
  success: boolean;
  object?: THREE.Object3D;
  error?: string;
}

/**
 * 模型加载器
 * 负责异步加载3D模型文件
 */
export class ModelLoader {
  private gltfLoader = new GLTFLoader();

  /**
   * 加载单个模型
   */
  async loadModel(
    type: string,
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<ModelLoadResult> {
    try {
      const loaderType = type.toUpperCase();

      switch (loaderType) {
        case 'GLB':
        case 'GLTF':
          return await this.loadGLTF(url, onProgress);

        case '3DTILES':
          // 3DTILES暂不支持,返回占位符
          console.warn(`3DTILES格式暂不支持: ${url}`);
          return {
            success: true,
            object: this.createPlaceholder(`3DTILES (${url})`),
          };

        default:
          console.warn(`未知的模型格式: ${type}`);
          return {
            success: true,
            object: this.createPlaceholder(`Unknown (${type})`),
          };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '未知错误';
      console.error(`模型加载失败 (${url}):`, errorMessage);

      return {
        success: false,
        error: errorMessage,
        object: this.createPlaceholder(`Error: ${errorMessage}`),
      };
    }
  }

  /**
   * 加载GLTF/GLB模型
   */
  private loadGLTF(
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<ModelLoadResult> {
    return new Promise((resolve) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          resolve({
            success: true,
            object: gltf.scene,
          });
        },
        (progressEvent) => {
          if (onProgress && progressEvent.lengthComputable) {
            const percentComplete =
              (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(percentComplete);
          }
        },
        (error) => {
          const errorMessage = error instanceof Error ? error.message : '加载失败';
          resolve({
            success: false,
            error: errorMessage,
            object: this.createPlaceholder(`Error: ${errorMessage}`),
          });
        }
      );
    });
  }

  /**
   * 创建占位符对象
   */
  private createPlaceholder(label: string): THREE.Object3D {
    const group = new THREE.Group();

    // 创建线框盒子
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0xff6b6b,
      opacity: 0.8,
      transparent: true,
    });
    const wireframe = new THREE.LineSegments(edges, material);

    group.add(wireframe);
    group.name = label;

    return group;
  }
}

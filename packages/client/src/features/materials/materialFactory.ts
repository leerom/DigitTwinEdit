import * as THREE from 'three';
import type { MaterialSpec } from '@/types';

/** 模块级纹理缓存，避免相同 URL 重复 TextureLoader */
const textureCache = new Map<string, THREE.Texture>();

/** 判断一个值是否为贴图引用对象 */
export function isTextureRef(value: unknown): value is { assetId: number; url: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'assetId' in (value as object) &&
    'url' in (value as object)
  );
}

/**
 * 将 props 中的贴图引用字段异步加载并应用到材质。
 * 非贴图引用字段由调用方负责赋值，此函数只处理 isTextureRef 的字段。
 */
export function applyTextureProps(
  material: THREE.Material,
  props: Record<string, unknown>
): void {
  for (const [key, val] of Object.entries(props)) {
    if (!isTextureRef(val)) continue;
    const ref = val;
    if (textureCache.has(ref.url)) {
      (material as any)[key] = textureCache.get(ref.url)!;
      material.needsUpdate = true;
    } else {
      new THREE.TextureLoader().load(
        ref.url,
        (tex) => {
          textureCache.set(ref.url, tex);
          (material as any)[key] = tex;
          material.needsUpdate = true;
        },
        undefined,
        (err) => console.warn(`[materialFactory] 贴图加载失败: ${ref.url}`, err)
      );
    }
  }
}

/** 从 props 中过滤掉贴图引用，返回纯标量 props 供构造函数使用 */
function filterScalarProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(props)) {
    if (!isTextureRef(val)) {
      result[key] = val;
    }
  }
  return result;
}

export function createThreeMaterial(spec: MaterialSpec): THREE.Material {
  const allProps = (spec.props ?? {}) as Record<string, unknown>;
  const scalarProps = filterScalarProps(allProps);

  let material: THREE.Material;
  switch (spec.type) {
    case 'MeshPhysicalMaterial':
      material = new THREE.MeshPhysicalMaterial(scalarProps as any);
      break;
    case 'MeshPhongMaterial':
      material = new THREE.MeshPhongMaterial(scalarProps as any);
      break;
    case 'MeshLambertMaterial':
      material = new THREE.MeshLambertMaterial(scalarProps as any);
      break;
    case 'MeshBasicMaterial':
      material = new THREE.MeshBasicMaterial(scalarProps as any);
      break;
    case 'MeshStandardMaterial':
    default:
      material = new THREE.MeshStandardMaterial(scalarProps as any);
  }

  // 立即触发贴图异步加载（加载完成后 material.needsUpdate = true 即可）
  applyTextureProps(material, allProps);

  return material;
}

import * as THREE from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { buildPreviewParams } from '@/features/nodeMaterial/compiler/buildPreviewParams';
import type { MaterialSpec, NodeGraphData } from '@/types';

/** 模块级纹理缓存，避免相同 URL 重复加载 */
const textureCache = new Map<string, THREE.Texture>();

/**
 * 颜色贴图 key 集合：这些贴图存储的是 sRGB 颜色信息，需设置 SRGBColorSpace。
 * 其余 key（法线、粗糙度、金属度、AO、置换等）均为数据贴图，保持默认 NoColorSpace（线性）。
 */
const SRGB_TEXTURE_KEYS = new Set([
  'map',            // 漫反射/Albedo
  'emissiveMap',    // 自发光
  'sheenColorMap',  // 丝绒颜色
  'specularColorMap', // 镜面颜色
]);

/** KTX2Loader 单例（需要 renderer 实例才能调用 detectSupport） */
let _ktx2Loader: KTX2Loader | null = null;

/**
 * 获取 KTX2Loader 单例
 * @param renderer THREE.WebGLRenderer 实例（从 @react-three/fiber 的 useThree 获取）
 */
function getKTX2Loader(renderer: THREE.WebGLRenderer): KTX2Loader {
  if (!_ktx2Loader) {
    _ktx2Loader = new KTX2Loader()
      .setTranscoderPath('/basis/')  // basis_transcoder.wasm 路径
      .setWithCredentials(true)      // 资产下载需要 session cookie
      .detectSupport(renderer);
  }
  return _ktx2Loader;
}

/** 判断一个值是否为贴图引用对象 */
export function isTextureRef(value: unknown): value is { assetId: number; url: string; mimeType?: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'assetId' in (value as object) &&
    'url' in (value as object)
  );
}

/**
 * Three.js Material.setValues() 只处理 isColor 和 isVector3，
 * 对 Vector2 属性（如 normalScale / clearcoatNormalScale）会直接 this[key] = Array，
 * 替换掉原始 Vector2 实例，导致 WebGLMaterials.js 的 .copy() 读到 undefined → NaN。
 * 这里列出需要特殊处理的 Vector2 属性，在构造函数调用后通过 .set() 写入。
 */
const VECTOR2_MATERIAL_PROPS = new Set(['normalScale', 'clearcoatNormalScale']);

/**
 * 将 props 中的贴图引用字段异步加载并应用到材质。
 * 非贴图引用字段由调用方负责赋值，此函数只处理 isTextureRef 的字段。
 * @param renderer 当加载 KTX2 纹理时需要 WebGLRenderer 实例
 */
export function applyTextureProps(
  material: THREE.Material,
  props: Record<string, unknown>,
  renderer?: THREE.WebGLRenderer
): void {
  for (const [key, val] of Object.entries(props)) {
    if (!isTextureRef(val)) continue;
    const ref = val;

    // 判断是否为 KTX2 纹理：优先看 mimeType，其次看 URL 后缀
    const isKtx2 = ref.mimeType === 'image/ktx2'
      || ref.url.toLowerCase().includes('.ktx2');

    // 颜色贴图使用 SRGBColorSpace（sRGB 编码图片需要 GPU 解码为线性再用于 PBR 计算），
    // 数据贴图（法线、粗糙度等）保持 NoColorSpace（已经是线性数据）。
    // KTX2 文件自身携带颜色空间元数据，由 KTX2Loader 自动处理，无需手动设置。
    const colorSpace = SRGB_TEXTURE_KEYS.has(key)
      ? THREE.SRGBColorSpace
      : THREE.NoColorSpace;

    if (textureCache.has(ref.url)) {
      (material as any)[key] = textureCache.get(ref.url)!;
      material.needsUpdate = true;
    } else if (isKtx2) {
      // KTX2 纹理：需要 renderer 实例（KTX2Loader 用于 basis 解码）
      if (!renderer) {
        console.warn(`[materialFactory] KTX2 纹理需要 renderer 实例，已跳过: ${ref.url}`);
        continue;
      }
      getKTX2Loader(renderer).loadAsync(ref.url).then((tex) => {
        // KTX2 文件自带颜色空间元数据，KTX2Loader 已自动设置，此处仅作兜底保障
        if (tex.colorSpace === THREE.NoColorSpace && SRGB_TEXTURE_KEYS.has(key)) {
          tex.colorSpace = THREE.SRGBColorSpace;
        }
        textureCache.set(ref.url, tex);
        (material as any)[key] = tex;
        material.needsUpdate = true;
      }).catch((err) => console.warn(`[materialFactory] KTX2 贴图加载失败: ${ref.url}`, err));
    } else {
      // 普通纹理（PNG/JPG 等）：必须携带 credentials，否则鉴权端点返回 401
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('use-credentials');
      loader.load(
        ref.url,
        (tex) => {
          // 按 key 类型设置正确的颜色空间，确保颜色贴图不偏暗/偏色
          tex.colorSpace = colorSpace;
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

/** 从 props 中过滤掉贴图引用和 Vector2 属性，返回可安全传给构造函数的标量 props */
function filterScalarProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(props)) {
    if (!isTextureRef(val) && !VECTOR2_MATERIAL_PROPS.has(key)) {
      result[key] = val;
    }
  }
  return result;
}

/**
 * 将 Array 类型的 Vector2 属性通过 .set() 写入材质，
 * 保证不替换 Three.js 内部的 Vector2 实例，从而让 WebGLMaterials.js 的 .copy() 正常工作。
 */
function applyVector2Props(material: THREE.Material, props: Record<string, unknown>): void {
  for (const key of VECTOR2_MATERIAL_PROPS) {
    const val = props[key];
    if (!Array.isArray(val)) continue;
    const vec = (material as any)[key];
    if (vec?.isVector2) vec.set(val[0], val[1]);
  }
}

export function createThreeMaterial(spec: MaterialSpec, renderer?: THREE.WebGLRenderer): THREE.Material {
  const allProps = (spec.props ?? {}) as Record<string, unknown>;
  // filterScalarProps 同时排除贴图引用和 Vector2 属性，避免传入构造函数时破坏 Vector2 实例
  const scalarProps = filterScalarProps(allProps);

  let material: THREE.Material;
  switch (spec.type) {
    case 'NodeMaterial': {
      // NodeMaterial（WebGPU TSL）无法在 WebGL Canvas 中直接渲染。
      // 此处提取简单参数，用 MeshStandardMaterial 作为 WebGL 预览近似。
      const graphData = (spec.props as Record<string, unknown>)?.graph as NodeGraphData | undefined;
      if (!graphData) return new THREE.MeshStandardMaterial();
      const p = buildPreviewParams(graphData);
      return new THREE.MeshStandardMaterial({
        color: p.color,
        roughness: p.roughness,
        metalness: p.metalness,
        emissive: new THREE.Color(p.emissive),
      });
    }
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

  // Vector2 属性（normalScale / clearcoatNormalScale）需在构造后用 .set() 写入，
  // 否则 Three.js setValues() 会用 Array 替换 Vector2 实例，导致 shader uniform 读到 NaN
  applyVector2Props(material, allProps);

  // 立即触发贴图异步加载（加载完成后 material.needsUpdate = true 即可）
  applyTextureProps(material, allProps, renderer);

  return material;
}

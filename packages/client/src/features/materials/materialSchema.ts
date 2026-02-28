import type { MaterialType } from '@/types';

export type FieldUIType = 'number' | 'color' | 'boolean' | 'vector2' | 'texture';
export type FieldGroup = 'base' | 'pbr' | 'physical' | 'maps' | 'wireframe';

export interface MaterialFieldDef {
  key: string;
  type: FieldUIType;
  group: FieldGroup;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

// ─── MeshStandardMaterial 字段 ────────────────────────────────────────────────

export const STANDARD_FIELDS: MaterialFieldDef[] = [
  // base
  { key: 'color',              type: 'color',   group: 'base', label: '漫反射颜色' },
  { key: 'emissive',           type: 'color',   group: 'base', label: '自发光颜色' },
  { key: 'emissiveIntensity',  type: 'number',  group: 'base', label: '自发光强度',   min: 0, step: 0.01 },
  { key: 'envMapIntensity',    type: 'number',  group: 'base', label: '环境贴图强度', min: 0, step: 0.01 },
  { key: 'aoMapIntensity',     type: 'number',  group: 'base', label: 'AO 贴图强度', min: 0, max: 1, step: 0.01 },
  { key: 'lightMapIntensity',  type: 'number',  group: 'base', label: '光照贴图强度', min: 0, step: 0.01 },
  { key: 'flatShading',        type: 'boolean', group: 'base', label: '平面着色' },
  { key: 'fog',                type: 'boolean', group: 'base', label: '受雾效影响' },
  // pbr
  { key: 'roughness',          type: 'number',  group: 'pbr', label: '粗糙度',     min: 0, max: 1, step: 0.01 },
  { key: 'metalness',          type: 'number',  group: 'pbr', label: '金属度',     min: 0, max: 1, step: 0.01 },
  { key: 'bumpScale',          type: 'number',  group: 'pbr', label: '凹凸缩放',   step: 0.01 },
  { key: 'normalScale',        type: 'vector2', group: 'pbr', label: '法线缩放',   step: 0.01 },
  { key: 'displacementScale',  type: 'number',  group: 'pbr', label: '置换缩放',   step: 0.01 },
  { key: 'displacementBias',   type: 'number',  group: 'pbr', label: '置换偏移',   step: 0.01 },
  // wireframe
  { key: 'wireframe',          type: 'boolean', group: 'wireframe', label: '线框' },
  // maps
  { key: 'map',            type: 'texture', group: 'maps', label: '漫反射贴图' },
  { key: 'emissiveMap',    type: 'texture', group: 'maps', label: '自发光贴图' },
  { key: 'roughnessMap',   type: 'texture', group: 'maps', label: '粗糙度贴图' },
  { key: 'metalnessMap',   type: 'texture', group: 'maps', label: '金属度贴图' },
  { key: 'normalMap',      type: 'texture', group: 'maps', label: '法线贴图' },
  { key: 'bumpMap',        type: 'texture', group: 'maps', label: '凹凸贴图' },
  { key: 'displacementMap',type: 'texture', group: 'maps', label: '置换贴图' },
  { key: 'aoMap',          type: 'texture', group: 'maps', label: 'AO 贴图' },
  { key: 'lightMap',       type: 'texture', group: 'maps', label: '光照贴图' },
  { key: 'alphaMap',       type: 'texture', group: 'maps', label: '透明度贴图' },
  { key: 'envMap',         type: 'texture', group: 'maps', label: '环境反射贴图' },
];

// ─── MeshPhysicalMaterial 专属额外字段 ────────────────────────────────────────

export const PHYSICAL_EXTRA_FIELDS: MaterialFieldDef[] = [
  // physical
  { key: 'clearcoat',              type: 'number',  group: 'physical', label: '清漆强度',       min: 0, max: 1, step: 0.01 },
  { key: 'clearcoatRoughness',     type: 'number',  group: 'physical', label: '清漆粗糙度',     min: 0, max: 1, step: 0.01 },
  { key: 'clearcoatNormalScale',   type: 'vector2', group: 'physical', label: '清漆法线缩放',   step: 0.01 },
  { key: 'ior',                    type: 'number',  group: 'physical', label: '折射率',         min: 1, max: 2.333, step: 0.001 },
  { key: 'reflectivity',           type: 'number',  group: 'physical', label: '反射率（ior联动）', min: 0, max: 1, step: 0.01 },
  { key: 'transmission',           type: 'number',  group: 'physical', label: '透射率',         min: 0, max: 1, step: 0.01 },
  { key: 'thickness',              type: 'number',  group: 'physical', label: '体积厚度',       min: 0, step: 0.01 },
  { key: 'attenuationDistance',    type: 'number',  group: 'physical', label: '衰减距离',       min: 0, step: 0.1 },
  { key: 'attenuationColor',       type: 'color',   group: 'physical', label: '衰减颜色' },
  { key: 'specularIntensity',      type: 'number',  group: 'physical', label: '镜面强度',       min: 0, max: 1, step: 0.01 },
  { key: 'specularColor',          type: 'color',   group: 'physical', label: '镜面颜色' },
  { key: 'anisotropy',             type: 'number',  group: 'physical', label: '各向异性',       min: -1, max: 1, step: 0.01 },
  { key: 'anisotropyRotation',     type: 'number',  group: 'physical', label: '各向异性旋转(rad)', min: 0, max: 6.283, step: 0.01 },
  { key: 'sheen',                  type: 'number',  group: 'physical', label: '丝绒强度',       min: 0, max: 1, step: 0.01 },
  { key: 'sheenRoughness',         type: 'number',  group: 'physical', label: '丝绒粗糙度',     min: 0, max: 1, step: 0.01 },
  { key: 'sheenColor',             type: 'color',   group: 'physical', label: '丝绒颜色' },
  { key: 'iridescence',            type: 'number',  group: 'physical', label: '虹彩强度',       min: 0, max: 1, step: 0.01 },
  { key: 'iridescenceIOR',         type: 'number',  group: 'physical', label: '虹彩折射率',     min: 1, max: 3, step: 0.001 },
  { key: 'iridescenceThicknessRange', type: 'vector2', group: 'physical', label: '虹彩厚度范围(nm)', step: 1, min: 0 },
  { key: 'dispersion',             type: 'number',  group: 'physical', label: '色散',           min: 0, step: 0.01 },
  // physical maps
  { key: 'clearcoatMap',            type: 'texture', group: 'maps', label: '清漆贴图' },
  { key: 'clearcoatRoughnessMap',   type: 'texture', group: 'maps', label: '清漆粗糙度贴图' },
  { key: 'clearcoatNormalMap',      type: 'texture', group: 'maps', label: '清漆法线贴图' },
  { key: 'sheenColorMap',           type: 'texture', group: 'maps', label: '丝绒颜色贴图' },
  { key: 'sheenRoughnessMap',       type: 'texture', group: 'maps', label: '丝绒粗糙度贴图' },
  { key: 'transmissionMap',         type: 'texture', group: 'maps', label: '透射率贴图' },
  { key: 'thicknessMap',            type: 'texture', group: 'maps', label: '厚度贴图' },
  { key: 'iridescenceMap',          type: 'texture', group: 'maps', label: '虹彩贴图' },
  { key: 'iridescenceThicknessMap', type: 'texture', group: 'maps', label: '虹彩厚度贴图' },
  { key: 'anisotropyMap',           type: 'texture', group: 'maps', label: '各向异性贴图' },
  { key: 'specularIntensityMap',    type: 'texture', group: 'maps', label: '镜面强度贴图' },
  { key: 'specularColorMap',        type: 'texture', group: 'maps', label: '镜面颜色贴图' },
];

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

export function getFieldsForType(type: MaterialType): MaterialFieldDef[] {
  if (type === 'MeshPhysicalMaterial') {
    return [...STANDARD_FIELDS, ...PHYSICAL_EXTRA_FIELDS];
  }
  return STANDARD_FIELDS;
}

/** 获取某类型材质中指定 group 的字段 */
export function getFieldsByGroup(
  type: MaterialType,
  group: FieldGroup
): MaterialFieldDef[] {
  return getFieldsForType(type).filter((f) => f.group === group);
}

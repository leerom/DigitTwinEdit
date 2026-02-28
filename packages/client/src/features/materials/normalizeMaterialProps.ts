import type { MaterialType } from '@/types';
import { STANDARD_FIELDS, PHYSICAL_EXTRA_FIELDS } from './materialSchema';

// 从 Schema 自动推导白名单，无需手动维护
const STANDARD_KEYS = STANDARD_FIELDS.map((f) => f.key);
const PHYSICAL_EXTRA_KEYS = PHYSICAL_EXTRA_FIELDS.map((f) => f.key);

const ALLOWED_KEYS_BY_TYPE: Record<MaterialType, readonly string[]> = {
  MeshStandardMaterial:  STANDARD_KEYS,
  MeshPhysicalMaterial:  [...STANDARD_KEYS, ...PHYSICAL_EXTRA_KEYS],
  MeshPhongMaterial:     ['color', 'wireframe', 'transparent', 'opacity', 'alphaTest',
                          'depthTest', 'depthWrite', 'visible', 'side', 'shininess', 'specular'],
  MeshLambertMaterial:   ['color', 'wireframe', 'transparent', 'opacity', 'alphaTest',
                          'depthTest', 'depthWrite', 'visible', 'side'],
  MeshBasicMaterial:     ['color', 'wireframe', 'transparent', 'opacity', 'alphaTest',
                          'depthTest', 'depthWrite', 'visible', 'side'],
};

const DEFAULTS_BY_TYPE: Record<MaterialType, Record<string, unknown>> = {
  MeshStandardMaterial: {
    roughness: 0.5,
    metalness: 0,
    emissiveIntensity: 1.0,
    envMapIntensity: 1.0,
    fog: true,
  },
  MeshPhysicalMaterial: {
    roughness: 0.5,
    metalness: 0,
    emissiveIntensity: 1.0,
    envMapIntensity: 1.0,
    fog: true,
    clearcoat: 0,
    clearcoatRoughness: 0,
    ior: 1.5,
    transmission: 0,
    thickness: 0,
    specularIntensity: 1.0,
    sheenRoughness: 1.0,
    iridescenceIOR: 1.3,
  },
  MeshPhongMaterial: { shininess: 30, specular: '#111111' },
  MeshLambertMaterial: {},
  MeshBasicMaterial: {},
};

export function normalizeMaterialProps(
  oldProps: Record<string, unknown>,
  newType: MaterialType
): Record<string, unknown> {
  const allowed = new Set(ALLOWED_KEYS_BY_TYPE[newType]);
  const next: Record<string, unknown> = {};

  for (const key of Object.keys(oldProps)) {
    if (allowed.has(key)) {
      next[key] = oldProps[key];
    }
  }

  const defaults = DEFAULTS_BY_TYPE[newType];
  for (const key of Object.keys(defaults)) {
    if (next[key] === undefined) {
      next[key] = defaults[key];
    }
  }

  return next;
}

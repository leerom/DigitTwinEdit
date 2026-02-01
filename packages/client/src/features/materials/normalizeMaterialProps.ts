import type { MaterialType } from '@/types';

const COMMON_KEYS = [
  'color',
  'wireframe',
  'transparent',
  'opacity',
  'alphaTest',
  'depthTest',
  'depthWrite',
  'visible',
  'side',
] as const;

const ALLOWED_KEYS_BY_TYPE: Record<MaterialType, readonly string[]> = {
  MeshStandardMaterial: [...COMMON_KEYS, 'roughness', 'metalness'],
  MeshPhysicalMaterial: [
    ...COMMON_KEYS,
    'roughness',
    'metalness',
    'clearcoat',
    'clearcoatRoughness',
    'ior',
    'transmission',
    'thickness',
  ],
  MeshPhongMaterial: [...COMMON_KEYS, 'shininess', 'specular'],
  MeshLambertMaterial: [...COMMON_KEYS],
  MeshBasicMaterial: [...COMMON_KEYS],
};

const DEFAULTS_BY_TYPE: Record<MaterialType, Record<string, unknown>> = {
  MeshStandardMaterial: {
    roughness: 0.5,
    metalness: 0,
  },
  MeshPhysicalMaterial: {
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0,
    clearcoatRoughness: 0,
    ior: 1.5,
    transmission: 0,
    thickness: 0,
  },
  MeshPhongMaterial: {
    shininess: 30,
    specular: '#111111',
  },
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

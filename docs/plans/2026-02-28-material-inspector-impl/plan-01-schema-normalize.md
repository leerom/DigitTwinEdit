# Plan 01 — materialSchema.ts + normalizeMaterialProps.ts

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** 新建 Schema 字段元数据文件，并同步扩展 normalizeMaterialProps 白名单/默认值。

---

## Task 1: 新建 materialSchema.ts 及其测试

**Files:**
- Create: `packages/client/src/features/materials/materialSchema.ts`
- Create: `packages/client/src/features/materials/materialSchema.test.ts`

### Step 1: 写测试（先写，确保失败）

```ts
// packages/client/src/features/materials/materialSchema.test.ts
import { describe, it, expect } from 'vitest';
import {
  STANDARD_FIELDS,
  PHYSICAL_EXTRA_FIELDS,
  getFieldsForType,
} from './materialSchema';

describe('materialSchema', () => {
  it('STANDARD_FIELDS 包含 color、roughness、metalness、emissive 等基础字段', () => {
    const keys = STANDARD_FIELDS.map((f) => f.key);
    expect(keys).toContain('color');
    expect(keys).toContain('roughness');
    expect(keys).toContain('metalness');
    expect(keys).toContain('emissive');
    expect(keys).toContain('emissiveIntensity');
    expect(keys).toContain('flatShading');
    expect(keys).toContain('map');
  });

  it('PHYSICAL_EXTRA_FIELDS 包含 clearcoat、ior、transmission、sheen 等物理字段', () => {
    const keys = PHYSICAL_EXTRA_FIELDS.map((f) => f.key);
    expect(keys).toContain('clearcoat');
    expect(keys).toContain('ior');
    expect(keys).toContain('transmission');
    expect(keys).toContain('sheen');
    expect(keys).toContain('iridescence');
    expect(keys).toContain('anisotropy');
    expect(keys).toContain('dispersion');
    expect(keys).toContain('attenuationColor');
  });

  it('每个字段都有 key / type / group / label', () => {
    const all = [...STANDARD_FIELDS, ...PHYSICAL_EXTRA_FIELDS];
    for (const f of all) {
      expect(f.key, `字段 ${f.key} 缺少 key`).toBeTruthy();
      expect(f.type, `字段 ${f.key} 缺少 type`).toBeTruthy();
      expect(f.group, `字段 ${f.key} 缺少 group`).toBeTruthy();
      expect(f.label, `字段 ${f.key} 缺少 label`).toBeTruthy();
    }
  });

  it('getFieldsForType("MeshStandardMaterial") 返回 STANDARD_FIELDS', () => {
    expect(getFieldsForType('MeshStandardMaterial')).toEqual(STANDARD_FIELDS);
  });

  it('getFieldsForType("MeshPhysicalMaterial") 返回 Standard + Physical 字段合集', () => {
    const fields = getFieldsForType('MeshPhysicalMaterial');
    const keys = fields.map((f) => f.key);
    expect(keys).toContain('roughness');   // 继承自 Standard
    expect(keys).toContain('clearcoat');   // Physical 特有
  });
});
```

### Step 2: 运行测试确认失败

```bash
pnpm --filter client test -- --run src/features/materials/materialSchema.test.ts
```

期望：FAIL（文件不存在）

### Step 3: 实现 materialSchema.ts

```ts
// packages/client/src/features/materials/materialSchema.ts
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
```

### Step 4: 运行测试确认通过

```bash
pnpm --filter client test -- --run src/features/materials/materialSchema.test.ts
```

期望：PASS

### Step 5: Commit

```bash
git add packages/client/src/features/materials/materialSchema.ts \
        packages/client/src/features/materials/materialSchema.test.ts
git commit -m "feat(materials): add MaterialFieldDef schema for Standard and Physical materials"
```

---

## Task 2: 扩展 normalizeMaterialProps.ts

**Files:**
- Modify: `packages/client/src/features/materials/normalizeMaterialProps.ts`
- Modify: `packages/client/src/features/materials/normalizeMaterialProps.test.ts`

### Step 1: 写新增测试用例（追加到已有测试文件末尾）

```ts
// 追加到 normalizeMaterialProps.test.ts

it('MeshStandardMaterial 白名单包含所有新增字段', () => {
  const props = {
    roughness: 0.5,
    emissiveIntensity: 2.0,
    flatShading: true,
    normalScale: [1, 1],
    map: { assetId: 1, url: '/test' },
    unknownField: 'drop_me',
  };
  const result = normalizeMaterialProps(props, 'MeshStandardMaterial');
  expect(result.roughness).toBe(0.5);
  expect(result.emissiveIntensity).toBe(2.0);
  expect(result.flatShading).toBe(true);
  expect(result.normalScale).toEqual([1, 1]);
  expect(result.map).toEqual({ assetId: 1, url: '/test' });
  expect(result.unknownField).toBeUndefined();
});

it('MeshPhysicalMaterial 白名单包含 Physical 专属字段', () => {
  const props = { clearcoat: 0.8, sheen: 0.5, iridescence: 0.3, anisotropy: 0.1 };
  const result = normalizeMaterialProps(props, 'MeshPhysicalMaterial');
  expect(result.clearcoat).toBe(0.8);
  expect(result.sheen).toBe(0.5);
  expect(result.iridescence).toBe(0.3);
  expect(result.anisotropy).toBe(0.1);
});

it('Standard → Physical 切换时保留共享贴图引用', () => {
  const props = { map: { assetId: 5, url: '/img' }, roughness: 0.3 };
  const result = normalizeMaterialProps(props, 'MeshPhysicalMaterial');
  expect(result.map).toEqual({ assetId: 5, url: '/img' });
  expect(result.roughness).toBe(0.3);
});

it('Physical → Standard 切换时丢弃 Physical 专属字段', () => {
  const props = { clearcoat: 0.8, roughness: 0.5, iridescence: 0.3 };
  const result = normalizeMaterialProps(props, 'MeshStandardMaterial');
  expect(result.roughness).toBe(0.5);
  expect(result.clearcoat).toBeUndefined();
  expect(result.iridescence).toBeUndefined();
});
```

### Step 2: 运行测试确认失败

```bash
pnpm --filter client test -- --run src/features/materials/normalizeMaterialProps.test.ts
```

期望：新测试 FAIL（白名单缺少新字段）

### Step 3: 更新 normalizeMaterialProps.ts

将 `ALLOWED_KEYS_BY_TYPE` 和 `DEFAULTS_BY_TYPE` 替换为下列完整版本：

```ts
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
```

### Step 4: 运行测试确认全通过

```bash
pnpm --filter client test -- --run src/features/materials/normalizeMaterialProps.test.ts
```

期望：PASS

### Step 5: Commit

```bash
git add packages/client/src/features/materials/normalizeMaterialProps.ts \
        packages/client/src/features/materials/normalizeMaterialProps.test.ts
git commit -m "feat(materials): extend normalizeMaterialProps whitelist from Schema for Standard/Physical"
```

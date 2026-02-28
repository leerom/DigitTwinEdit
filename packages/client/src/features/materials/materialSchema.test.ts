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

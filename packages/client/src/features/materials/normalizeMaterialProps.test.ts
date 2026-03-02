import { describe, it, expect } from 'vitest';
import { normalizeMaterialProps } from './normalizeMaterialProps';

describe('normalizeMaterialProps', () => {
  it('should keep common props and add Physical defaults', () => {
    const next = normalizeMaterialProps(
      { color: '#ff0000', roughness: 0.2, metalness: 0.3 },
      'MeshPhysicalMaterial'
    );
    expect(next.color).toBe('#ff0000');
    expect(next).toHaveProperty('clearcoat');
    expect(next).toHaveProperty('ior');
  });

  it('should drop unsupported props when switching to Basic', () => {
    const next = normalizeMaterialProps(
      { roughness: 0.2, metalness: 0.3, clearcoat: 1 },
      'MeshBasicMaterial'
    );
    expect(next).not.toHaveProperty('roughness');
    expect(next).not.toHaveProperty('clearcoat');
  });

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

  it('Standard → Phong 切换时保留 Phong 支持的贴图（map/normalMap/emissiveMap）', () => {
    const props = {
      map:          { assetId: 1, url: '/color.png' },
      normalMap:    { assetId: 2, url: '/normal.png' },
      emissiveMap:  { assetId: 3, url: '/emissive.png' },
      roughnessMap: { assetId: 4, url: '/roughness.png' }, // Phong 不支持
      roughness: 0.5, // Phong 不支持
    };
    const result = normalizeMaterialProps(props, 'MeshPhongMaterial');
    expect(result.map).toEqual({ assetId: 1, url: '/color.png' });
    expect(result.normalMap).toEqual({ assetId: 2, url: '/normal.png' });
    expect(result.emissiveMap).toEqual({ assetId: 3, url: '/emissive.png' });
    expect(result.roughnessMap).toBeUndefined();  // Phong 不支持 PBR 贴图
    expect(result.roughness).toBeUndefined();      // Phong 不支持 roughness
  });

  it('Standard → Lambert 切换时保留 Lambert 支持的贴图（map/emissiveMap）', () => {
    const props = {
      map:       { assetId: 1, url: '/color.png' },
      emissiveMap: { assetId: 2, url: '/emissive.png' },
      normalMap: { assetId: 3, url: '/normal.png' }, // Lambert 不支持
    };
    const result = normalizeMaterialProps(props, 'MeshLambertMaterial');
    expect(result.map).toEqual({ assetId: 1, url: '/color.png' });
    expect(result.emissiveMap).toEqual({ assetId: 2, url: '/emissive.png' });
    expect(result.normalMap).toBeUndefined();  // Lambert 不支持法线贴图
  });

  it('Physical → Standard 切换时丢弃 Physical 专属字段', () => {
    const props = { clearcoat: 0.8, roughness: 0.5, iridescence: 0.3 };
    const result = normalizeMaterialProps(props, 'MeshStandardMaterial');
    expect(result.roughness).toBe(0.5);
    expect(result.clearcoat).toBeUndefined();
    expect(result.iridescence).toBeUndefined();
  });
});

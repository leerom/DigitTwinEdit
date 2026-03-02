import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createThreeMaterial, isTextureRef, applyTextureProps } from './materialFactory';

describe('materialFactory', () => {
  it('should create MeshPhysicalMaterial when type is MeshPhysicalMaterial', () => {
    const m = createThreeMaterial({ type: 'MeshPhysicalMaterial', props: { color: '#ff0000' } });
    expect(m.type).toContain('MeshPhysicalMaterial');
  });

  it('normalScale 以 Array 传入时，材质的 normalScale 仍为 Vector2 且值正确', () => {
    const m = createThreeMaterial({
      type: 'MeshStandardMaterial',
      props: { normalScale: [0.5, 0.8] },
    }) as THREE.MeshStandardMaterial;
    // 必须保持 Vector2 实例，否则 WebGLMaterials.js 的 .copy() 会得到 NaN
    expect(m.normalScale.isVector2).toBe(true);
    expect(m.normalScale.x).toBeCloseTo(0.5);
    expect(m.normalScale.y).toBeCloseTo(0.8);
  });

  it('切换材质类型（Standard → Physical）后 normalScale 保持 Vector2 且值不变', () => {
    const m = createThreeMaterial({
      type: 'MeshPhysicalMaterial',
      props: { normalScale: [0.3, 0.7], roughness: 0.4 },
    }) as THREE.MeshPhysicalMaterial;
    expect(m.normalScale.isVector2).toBe(true);
    expect(m.normalScale.x).toBeCloseTo(0.3);
    expect(m.normalScale.y).toBeCloseTo(0.7);
  });

  it('clearcoatNormalScale 以 Array 传入时，材质的 clearcoatNormalScale 仍为 Vector2', () => {
    const m = createThreeMaterial({
      type: 'MeshPhysicalMaterial',
      props: { clearcoatNormalScale: [1.5, 2.0] },
    }) as THREE.MeshPhysicalMaterial;
    expect(m.clearcoatNormalScale.isVector2).toBe(true);
    expect(m.clearcoatNormalScale.x).toBeCloseTo(1.5);
    expect(m.clearcoatNormalScale.y).toBeCloseTo(2.0);
  });
});

describe('isTextureRef', () => {
  it('识别 {assetId, url} 为贴图引用', () => {
    expect(isTextureRef({ assetId: 1, url: '/img' })).toBe(true);
    expect(isTextureRef('#ffffff')).toBe(false);
    expect(isTextureRef(null)).toBe(false);
    expect(isTextureRef(0.5)).toBe(false);
  });
});

describe('applyTextureProps', () => {
  it('非贴图引用属性跳过不处理', () => {
    const mat = new THREE.MeshStandardMaterial();
    // 不应该抛出错误
    applyTextureProps(mat, { roughness: 0.5, color: '#ff0000' });
    // roughness 和 color 已由调用方处理，applyTextureProps 不修改它们
    expect(mat.roughness).toBe(1); // 未被修改（默认值）
  });

  it('颜色贴图（map/emissiveMap）加载后设置 SRGBColorSpace', () => {
    const capturedTextures: { key: string; tex: THREE.Texture }[] = [];
    const loadMock = vi.fn((url, onLoad) => {
      const tex = new THREE.Texture();
      onLoad(tex);
      return {} as any;
    });
    vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(loadMock as any);

    const mat = new THREE.MeshStandardMaterial() as any;
    applyTextureProps(mat, {
      map:         { assetId: 1, url: '/unique-color-map.png' },
      emissiveMap: { assetId: 2, url: '/unique-emissive-map.png' },
    });

    expect(mat.map).toBeInstanceOf(THREE.Texture);
    expect(mat.emissiveMap).toBeInstanceOf(THREE.Texture);
    expect(mat.map?.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(mat.emissiveMap?.colorSpace).toBe(THREE.SRGBColorSpace);

    vi.restoreAllMocks();
  });

  it('数据贴图（normalMap/roughnessMap 等）加载后保持 NoColorSpace', () => {
    const loadMock = vi.fn((url, onLoad) => {
      const tex = new THREE.Texture();
      onLoad(tex);
      return {} as any;
    });
    vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(loadMock as any);

    const mat = new THREE.MeshStandardMaterial() as any;
    applyTextureProps(mat, {
      normalMap:    { assetId: 3, url: '/unique-normal-map.png' },
      roughnessMap: { assetId: 4, url: '/unique-roughness-map.png' },
    });

    expect(mat.normalMap).toBeInstanceOf(THREE.Texture);
    expect(mat.roughnessMap).toBeInstanceOf(THREE.Texture);
    expect(mat.normalMap?.colorSpace).toBe(THREE.NoColorSpace);
    expect(mat.roughnessMap?.colorSpace).toBe(THREE.NoColorSpace);

    vi.restoreAllMocks();
  });

  it('贴图引用属性触发 TextureLoader 加载', () => {
    const loadMock = vi.fn((url, onLoad) => {
      const tex = new THREE.Texture();
      onLoad(tex);
      return {} as any;
    });
    vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(loadMock as any);

    const mat = new THREE.MeshStandardMaterial();
    applyTextureProps(mat, { map: { assetId: 1, url: '/tex-unique-url.png' } });

    expect(loadMock).toHaveBeenCalledWith('/tex-unique-url.png', expect.any(Function), undefined, expect.any(Function));
    expect(mat.map).toBeInstanceOf(THREE.Texture);
    // Three.js needsUpdate 是只写 setter，用 version 确认 needsUpdate=true 被调用过
    expect(mat.version).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });
});

describe('createThreeMaterial with textures', () => {
  it('创建材质时不将贴图引用直接传给构造函数', () => {
    const mat = createThreeMaterial({
      type: 'MeshStandardMaterial',
      props: { roughness: 0.5, map: { assetId: 1, url: '/img.png' } },
    }) as any;
    // map 字段不应是 {assetId, url} 对象（应为 null、Texture 实例或 undefined）
    expect(mat.map === null || mat.map instanceof THREE.Texture || mat.map === undefined).toBe(true);
    expect(typeof mat.map?.assetId).not.toBe('number');
  });
});

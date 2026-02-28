import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createThreeMaterial, isTextureRef, applyTextureProps } from './materialFactory';

describe('materialFactory', () => {
  it('should create MeshPhysicalMaterial when type is MeshPhysicalMaterial', () => {
    const m = createThreeMaterial({ type: 'MeshPhysicalMaterial', props: { color: '#ff0000' } });
    expect(m.type).toContain('MeshPhysicalMaterial');
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

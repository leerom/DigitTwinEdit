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
});

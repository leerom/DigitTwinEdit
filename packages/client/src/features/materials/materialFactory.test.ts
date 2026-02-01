import { describe, it, expect } from 'vitest';
import { createThreeMaterial } from './materialFactory';

describe('materialFactory', () => {
  it('should create MeshPhysicalMaterial when type is MeshPhysicalMaterial', () => {
    const m = createThreeMaterial({ type: 'MeshPhysicalMaterial', props: { color: '#ff0000' } });
    expect(m.type).toContain('MeshPhysicalMaterial');
  });
});

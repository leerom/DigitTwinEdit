import { describe, it, expect } from 'vitest';
import type { MaterialSpec, MeshComponent } from './index';

describe('MaterialSpec/mesh material typing', () => {
  it('should typecheck MaterialSpec and MeshComponent.material', () => {
    const spec: MaterialSpec = { type: 'MeshStandardMaterial', props: {} };

    const mesh: MeshComponent = {
      assetId: 'default',
      materialId: 'default',
      castShadow: true,
      receiveShadow: true,
      geometry: 'box',
      material: spec,
    };

    expect(mesh.material?.type).toBe('MeshStandardMaterial');
  });
});

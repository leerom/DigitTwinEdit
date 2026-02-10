import { describe, it, expect } from 'vitest';
import { resolveWireframeOverride } from './SceneRenderer';
import type { MaterialSpec } from '@/types';

describe('resolveWireframeOverride', () => {
  it('forces wireframe when renderMode=wireframe', () => {
    const spec: MaterialSpec = { type: 'MeshStandardMaterial', props: { wireframe: false } };
    expect(resolveWireframeOverride('wireframe', spec)).toBe(true);
  });

  it('falls back to material wireframe when not wireframe', () => {
    const spec: MaterialSpec = { type: 'MeshStandardMaterial', props: { wireframe: true } };
    expect(resolveWireframeOverride('shaded', spec)).toBe(true);
  });

  it('defaults to false when material wireframe missing', () => {
    const spec: MaterialSpec = { type: 'MeshStandardMaterial', props: {} };
    expect(resolveWireframeOverride('hybrid', spec)).toBe(false);
  });
});
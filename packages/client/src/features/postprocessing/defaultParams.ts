import type { PostProcessEffectType, PostProcessParams } from '@/types';

export const POST_PROCESS_DEFAULTS: Record<PostProcessEffectType, PostProcessParams> = {
  UnrealBloom: { threshold: 0.85, strength: 1.5, radius: 0.4 },
  Film:        { intensity: 0.35, grayscale: false },
  Bokeh:       { focus: 1.0, aperture: 0.025, maxblur: 0.01 },
  SSAO:        { radius: 4, minDistance: 0.001, maxDistance: 0.1 },
};

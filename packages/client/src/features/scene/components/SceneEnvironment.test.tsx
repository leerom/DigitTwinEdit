import { describe, expect, it } from 'vitest';
import { selectSceneEnvironmentSettings } from './SceneEnvironment';

describe('selectSceneEnvironmentSettings', () => {
  it('returns the same object reference for normalized environment settings', () => {
    const environment = { mode: 'asset' as const, assetId: 42 };
    const state = {
      scene: {
        settings: {
          environment,
        },
      },
    } as any;

    expect(selectSceneEnvironmentSettings(state)).toBe(environment);
    expect(selectSceneEnvironmentSettings(state)).toBe(environment);
  });

  it('returns a stable default reference for legacy environment values', () => {
    const state = {
      scene: {
        settings: {
          environment: 'default',
        },
      },
    } as any;

    expect(selectSceneEnvironmentSettings(state)).toBe(selectSceneEnvironmentSettings(state));
    expect(selectSceneEnvironmentSettings(state)).toEqual({ mode: 'default', assetId: null });
  });
});

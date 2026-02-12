import { describe, it, expect } from 'vitest';
import { getUniqueSceneName } from './sceneNameUtils';

describe('getUniqueSceneName', () => {
  it('should return the same name if no conflicts', () => {
    const result = getUniqueSceneName('新场景', []);
    expect(result).toBe('新场景');
  });

  it('should return the same name if not in existing list', () => {
    const existingScenes = [
      { id: 1, name: '场景1', is_active: false, updated_at: '' },
      { id: 2, name: '场景2', is_active: false, updated_at: '' },
    ];
    const result = getUniqueSceneName('新场景', existingScenes);
    expect(result).toBe('新场景');
  });

  it('should add (1) suffix for first conflict', () => {
    const existingScenes = [
      { id: 1, name: '新场景', is_active: false, updated_at: '' },
    ];
    const result = getUniqueSceneName('新场景', existingScenes);
    expect(result).toBe('新场景 (1)');
  });

  it('should increment suffix for multiple conflicts', () => {
    const existingScenes = [
      { id: 1, name: '新场景', is_active: false, updated_at: '' },
      { id: 2, name: '新场景 (1)', is_active: false, updated_at: '' },
      { id: 3, name: '新场景 (2)', is_active: false, updated_at: '' },
    ];
    const result = getUniqueSceneName('新场景', existingScenes);
    expect(result).toBe('新场景 (3)');
  });

  it('should handle gaps in numbering', () => {
    const existingScenes = [
      { id: 1, name: '新场景', is_active: false, updated_at: '' },
      { id: 2, name: '新场景 (2)', is_active: false, updated_at: '' },
    ];
    const result = getUniqueSceneName('新场景', existingScenes);
    expect(result).toBe('新场景 (1)');
  });

  it('should handle empty or whitespace input', () => {
    const result1 = getUniqueSceneName('', []);
    expect(result1).toBe('新建场景');

    const result2 = getUniqueSceneName('   ', []);
    expect(result2).toBe('新建场景');
  });
});

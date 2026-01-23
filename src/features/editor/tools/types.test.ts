import { describe, it, expect } from 'vitest';
import type { ToolType } from './types';

describe('Tool Types', () => {
  it('should have correct tool types', () => {
    const tool: ToolType = 'translate';
    expect(tool).toBe('translate');
  });
});

// src/features/editor/commands/types.test.ts
import { describe, it, expect } from 'vitest';
import type { Command } from './types';

describe('Command Types', () => {
  it('should create a valid command', () => {
    const mockCommand: Command = {
      name: 'TestCommand',
      execute: () => {},
      undo: () => {},
    };

    expect(mockCommand.name).toBe('TestCommand');
    expect(typeof mockCommand.execute).toBe('function');
    expect(typeof mockCommand.undo).toBe('function');
  });

  it('should support optional merge method', () => {
    const mockCommand: Command = {
      name: 'TestCommand',
      execute: () => {},
      undo: () => {},
      merge: (other) => false,
    };

    expect(typeof mockCommand.merge).toBe('function');
  });
});

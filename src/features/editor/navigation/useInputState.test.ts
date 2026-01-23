import { describe, it, expect, beforeEach } from 'vitest';
import { useInputState } from './useInputState';

describe('InputState', () => {
  beforeEach(() => {
    // Reset state directly
    useInputState.setState({ keys: {} });
  });

  it('should track key press', () => {
    const { setKey } = useInputState.getState();

    setKey('KeyW', true);
    expect(useInputState.getState().keys['KeyW']).toBe(true);

    setKey('KeyW', false);
    expect(useInputState.getState().keys['KeyW']).toBe(false);
  });

  it('should handle multiple keys', () => {
    const { setKey } = useInputState.getState();

    setKey('KeyW', true);
    setKey('ShiftLeft', true);

    const keys = useInputState.getState().keys;
    expect(keys['KeyW']).toBe(true);
    expect(keys['ShiftLeft']).toBe(true);
    expect(keys['KeyA']).toBeFalsy();
  });
});

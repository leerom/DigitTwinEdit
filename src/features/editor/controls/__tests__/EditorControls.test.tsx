import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '@/stores/editorStore';

describe('EditorControls Store Integration', () => {
  beforeEach(() => {
    useEditorStore.setState({
      mode: 'select',
      camera: { position: [10, 10, 10], target: [0, 0, 0] }
    });
  });

  it('updates camera state correctly', () => {
    const { result } = renderHook(() => useEditorStore());

    act(() => {
      result.current.setCamera({ position: [5, 5, 5] });
    });

    expect(result.current.camera.position).toEqual([5, 5, 5]);
  });

  it('toggles modes correctly', () => {
    const { result } = renderHook(() => useEditorStore());

    act(() => {
      result.current.setMode('rotate');
    });

    expect(result.current.mode).toBe('rotate');
  });
});

// Note: Testing actual OrbitControls interaction requires a WebGL context or heavy mocking of Three.js.
// For unit tests, we primarily test the Store logic and that components render without crashing.
// E2E tests with Playwright are better suited for verifying actual canvas interaction.

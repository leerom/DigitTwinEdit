// src/features/editor/hooks/useEditorState.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useActiveTool, useModifiers, useCursorMode } from './useEditorState';
import { useEditorStore } from '@/stores/editorStore';

describe('useEditorState Hooks', () => {
  it('useActiveTool should return active tool', () => {
    const { result } = renderHook(() => useActiveTool());
    expect(result.current).toBe('hand');
  });

  it('useModifiers should return modifier state', () => {
    const { result } = renderHook(() => useModifiers());
    expect(result.current).toEqual({
      ctrl: false,
      shift: false,
      alt: false,
    });
  });

  it('useCursorMode should return cursor mode', () => {
    const { result } = renderHook(() => useCursorMode());
    expect(result.current).toBe('default');
  });
});

// src/stores/editorStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';

describe('EditorStore - Tool System', () => {
  beforeEach(() => {
    // Reset to default state
    useEditorStore.getState().setActiveTool('hand');
    useEditorStore.getState().setCursorMode('default');
    useEditorStore.getState().setModifiers({ ctrl: false, shift: false, alt: false });
    useEditorStore.getState().setNavigationMode('orbit');
  });

  it('should switch active tool', () => {
    const { setActiveTool } = useEditorStore.getState();

    setActiveTool('translate');
    expect(useEditorStore.getState().activeTool).toBe('translate');

    setActiveTool('rotate');
    expect(useEditorStore.getState().activeTool).toBe('rotate');
  });

  it('should update cursor mode', () => {
    const { setCursorMode } = useEditorStore.getState();

    setCursorMode('grab');
    expect(useEditorStore.getState().cursorMode).toBe('grab');

    setCursorMode('eye');
    expect(useEditorStore.getState().cursorMode).toBe('eye');
  });

  it('should track modifier keys', () => {
    const { setModifiers } = useEditorStore.getState();

    setModifiers({ shift: true });
    expect(useEditorStore.getState().modifiers.shift).toBe(true);
    expect(useEditorStore.getState().modifiers.ctrl).toBe(false);

    setModifiers({ ctrl: true, shift: false });
    expect(useEditorStore.getState().modifiers.ctrl).toBe(true);
    expect(useEditorStore.getState().modifiers.shift).toBe(false);
  });

  it('should switch navigation mode', () => {
    const { setNavigationMode } = useEditorStore.getState();

    setNavigationMode('fly');
    expect(useEditorStore.getState().navigationMode).toBe('fly');

    setNavigationMode('orbit');
    expect(useEditorStore.getState().navigationMode).toBe('orbit');
  });
});

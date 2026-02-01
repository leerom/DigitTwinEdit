import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';

describe('EditorStore - Tool System', () => {
  beforeEach(() => {
    // Reset store before each test
    // Use setState to reset if actions are not yet available or reliable
    useEditorStore.setState({
      activeTool: 'hand',
      cursorMode: 'default',
      modifiers: { ctrl: false, shift: false, alt: false },
      navigationMode: 'orbit',
      viewMode: '3D',
      renamingId: null
    } as any);
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

  it('should switch view mode', () => {
    const { setViewMode } = useEditorStore.getState();

    setViewMode('2D');
    expect(useEditorStore.getState().viewMode).toBe('2D');

    setViewMode('3D');
    expect(useEditorStore.getState().viewMode).toBe('3D');
  });

  it('should manage renaming id', () => {
    const { setRenamingId } = useEditorStore.getState();

    setRenamingId('obj-123');
    expect(useEditorStore.getState().renamingId).toBe('obj-123');

    setRenamingId(null);
    expect(useEditorStore.getState().renamingId).toBeNull();
  });
});

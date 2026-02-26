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

describe('EditorStore - activeSubNodePath', () => {
  beforeEach(() => {
    useEditorStore.setState({
      selectedIds: [],
      activeId: null,
      activeSubNodePath: null,
    } as any);
  });

  it('初始状态 activeSubNodePath 为 null', () => {
    expect(useEditorStore.getState().activeSubNodePath).toBeNull();
  });

  it('setActiveSubNodePath 能设置路径', () => {
    const { setActiveSubNodePath } = useEditorStore.getState();
    setActiveSubNodePath('Cube/Body');
    expect(useEditorStore.getState().activeSubNodePath).toBe('Cube/Body');
  });

  it('setActiveSubNodePath 能清除路径（传 null）', () => {
    useEditorStore.setState({ activeSubNodePath: 'Cube/Body' } as any);
    const { setActiveSubNodePath } = useEditorStore.getState();
    setActiveSubNodePath(null);
    expect(useEditorStore.getState().activeSubNodePath).toBeNull();
  });

  it('select() 切换对象时自动清除 activeSubNodePath', () => {
    useEditorStore.setState({ activeSubNodePath: 'Cube/Body' } as any);
    const { select } = useEditorStore.getState();
    select(['obj-456'], false);
    expect(useEditorStore.getState().activeSubNodePath).toBeNull();
  });

  it('select() append 模式也会清除 activeSubNodePath', () => {
    useEditorStore.setState({
      selectedIds: ['obj-001'],
      activeId: 'obj-001',
      activeSubNodePath: 'Mesh/Part',
    } as any);
    const { select } = useEditorStore.getState();
    select(['obj-002'], true);
    expect(useEditorStore.getState().activeSubNodePath).toBeNull();
  });

  it('clearSelection() 清除 activeSubNodePath', () => {
    useEditorStore.setState({ activeSubNodePath: 'Node/Child' } as any);
    const { clearSelection } = useEditorStore.getState();
    clearSelection();
    expect(useEditorStore.getState().activeSubNodePath).toBeNull();
    expect(useEditorStore.getState().selectedIds).toHaveLength(0);
    expect(useEditorStore.getState().activeId).toBeNull();
  });
});

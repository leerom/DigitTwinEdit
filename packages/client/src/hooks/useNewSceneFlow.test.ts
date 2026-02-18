import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNewSceneFlow } from './useNewSceneFlow';

// Mock stores
const mockIsDirty = vi.fn(() => false);
const mockAutoSaveScene = vi.fn().mockResolvedValue(undefined);
const mockMarkClean = vi.fn();
const mockCreateScene = vi.fn().mockResolvedValue(undefined);
const mockClearSelection = vi.fn();
const mockScenes = [{ id: 1, name: '默认场景', is_active: true }];
const mockScene = { objects: {} };

vi.mock('../stores/sceneStore', () => ({
  useSceneStore: vi.fn((selector) => {
    const state = {
      isDirty: mockIsDirty(),
      scene: mockScene,
      markClean: mockMarkClean,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../stores/projectStore', () => ({
  useProjectStore: vi.fn((selector) => {
    const state = {
      autoSaveScene: mockAutoSaveScene,
      scenes: mockScenes,
      createScene: mockCreateScene,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../stores/editorStore', () => ({
  useEditorStore: vi.fn((selector) => {
    const state = { clearSelection: mockClearSelection };
    return selector ? selector(state) : state;
  }),
}));

describe('useNewSceneFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDirty.mockReturnValue(false);
  });

  it('直接显示命名对话框（场景干净时）', () => {
    const { result } = renderHook(() => useNewSceneFlow());
    expect(result.current.showSaveConfirmDialog).toBe(false);
    expect(result.current.showNewSceneDialog).toBe(false);

    act(() => result.current.handleNewSceneClick());

    expect(result.current.showSaveConfirmDialog).toBe(false);
    expect(result.current.showNewSceneDialog).toBe(true);
  });

  it('显示保存确认对话框（场景有未保存修改时）', () => {
    mockIsDirty.mockReturnValue(true);
    const { result } = renderHook(() => useNewSceneFlow());

    act(() => result.current.handleNewSceneClick());

    expect(result.current.showSaveConfirmDialog).toBe(true);
    expect(result.current.showNewSceneDialog).toBe(false);
  });

  it('保存后显示命名对话框', async () => {
    const { result } = renderHook(() => useNewSceneFlow());

    await act(async () => {
      await result.current.handleSaveAndProceed();
    });

    expect(mockAutoSaveScene).toHaveBeenCalled();
    expect(mockMarkClean).toHaveBeenCalled();
    expect(result.current.showSaveConfirmDialog).toBe(false);
    expect(result.current.showNewSceneDialog).toBe(true);
  });

  it('不保存直接显示命名对话框', () => {
    const { result } = renderHook(() => useNewSceneFlow());

    act(() => result.current.handleDiscardAndProceed());

    expect(result.current.showSaveConfirmDialog).toBe(false);
    expect(result.current.showNewSceneDialog).toBe(true);
  });

  it('创建场景（名称自动去重）', async () => {
    const { result } = renderHook(() => useNewSceneFlow());

    await act(async () => {
      await result.current.handleCreateScene('默认场景');
    });

    // '默认场景' 已存在，应自动变为 '默认场景 (1)'
    expect(mockCreateScene).toHaveBeenCalledWith('默认场景 (1)');
    expect(mockClearSelection).toHaveBeenCalled();
    expect(result.current.showNewSceneDialog).toBe(false);
  });

  it('空白名称时使用"新建场景"作为默认值', async () => {
    const { result } = renderHook(() => useNewSceneFlow());

    await act(async () => {
      await result.current.handleCreateScene('  ');
    });

    expect(mockCreateScene).toHaveBeenCalledWith('新建场景');
  });

  it('取消保存确认对话框', () => {
    const { result } = renderHook(() => useNewSceneFlow());

    act(() => result.current.handleCancelSave());

    expect(result.current.showSaveConfirmDialog).toBe(false);
  });

  it('取消命名对话框', () => {
    const { result } = renderHook(() => useNewSceneFlow());

    act(() => result.current.handleCancelCreate());

    expect(result.current.showNewSceneDialog).toBe(false);
  });
});

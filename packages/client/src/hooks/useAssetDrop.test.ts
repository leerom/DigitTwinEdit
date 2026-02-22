import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAssetDrop } from './useAssetDrop';

// ---- Mock stores ----
const mockAddAssetToScene = vi.fn();
const mockAssets = [
  {
    id: 42,
    project_id: 1,
    name: 'robot.glb',
    type: 'model' as const,
    file_path: '/uploads/robot.glb',
    file_size: 1024,
    created_at: '',
    updated_at: '',
  },
  {
    id: 99,
    project_id: 1,
    name: 'wood.png',
    type: 'texture' as const,
    file_path: '/uploads/wood.png',
    file_size: 512,
    created_at: '',
    updated_at: '',
  },
];

vi.mock('../stores/assetStore', () => ({
  useAssetStore: vi.fn((selector) => {
    const state = { assets: mockAssets };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../stores/sceneStore', () => ({
  useSceneStore: vi.fn((selector) => {
    const state = { addAssetToScene: mockAddAssetToScene };
    return selector ? selector(state) : state;
  }),
}));

// ---- dragEvent 工厂 ----
function makeDragEvent(options: {
  types?: string[];
  assetId?: string;
  preventDefault?: ReturnType<typeof vi.fn>;
}) {
  const data: Record<string, string> = {};
  if (options.assetId) data['assetid'] = options.assetId;

  return {
    dataTransfer: {
      types: options.types ?? (options.assetId ? ['assetid'] : []),
      getData: (key: string) => data[key.toLowerCase()] ?? '',
      dropEffect: '',
    },
    preventDefault: options.preventDefault ?? vi.fn(),
  } as unknown as React.DragEvent<HTMLElement>;
}

// ---- tests ----
describe('useAssetDrop', () => {
  beforeEach(() => vi.clearAllMocks());

  it('初始状态 isDraggingOver 为 false', () => {
    const { result } = renderHook(() => useAssetDrop());
    expect(result.current.isDraggingOver).toBe(false);
  });

  describe('onDragOver', () => {
    it('检测到 assetid 时调用 preventDefault 并设置 isDraggingOver=true', () => {
      const { result } = renderHook(() => useAssetDrop());
      const prevent = vi.fn();
      const evt = makeDragEvent({ types: ['assetid'], preventDefault: prevent });

      act(() => result.current.onDragOver(evt));

      expect(prevent).toHaveBeenCalled();
      expect(evt.dataTransfer.dropEffect).toBe('copy');
      expect(result.current.isDraggingOver).toBe(true);
    });

    it('无 assetid 时不调用 preventDefault，不改变 isDraggingOver', () => {
      const { result } = renderHook(() => useAssetDrop());
      const prevent = vi.fn();
      const evt = makeDragEvent({ types: ['Files'], preventDefault: prevent });

      act(() => result.current.onDragOver(evt));

      expect(prevent).not.toHaveBeenCalled();
      expect(result.current.isDraggingOver).toBe(false);
    });
  });

  describe('onDragLeave', () => {
    it('将 isDraggingOver 重置为 false', () => {
      const { result } = renderHook(() => useAssetDrop());
      // 先设置为 true
      act(() => result.current.onDragOver(makeDragEvent({ types: ['assetid'] })));
      expect(result.current.isDraggingOver).toBe(true);

      // relatedTarget 在 container 之外 → 应清除高亮
      const container = document.createElement('div');
      const outsideEl = document.createElement('div');
      const leaveEvt = {
        currentTarget: container,
        relatedTarget: outsideEl,
      } as unknown as React.DragEvent<HTMLElement>;

      act(() => result.current.onDragLeave(leaveEvt));
      expect(result.current.isDraggingOver).toBe(false);
    });

    it('拖拽到子元素时不清除 isDraggingOver', () => {
      const { result } = renderHook(() => useAssetDrop());
      act(() => result.current.onDragOver(makeDragEvent({ types: ['assetid'] })));

      // simulate dragleave where relatedTarget is inside the container
      const container = document.createElement('div');
      const child = document.createElement('div');
      container.appendChild(child);

      const leaveEvt = {
        currentTarget: container,
        relatedTarget: child,
      } as unknown as React.DragEvent<HTMLElement>;

      act(() => result.current.onDragLeave(leaveEvt));
      expect(result.current.isDraggingOver).toBe(true); // should stay true
    });
  });

  describe('onDrop', () => {
    it('模型资产调用 addAssetToScene，默认位置为 undefined（→ 原点）', () => {
      const { result } = renderHook(() => useAssetDrop());
      const evt = makeDragEvent({ assetId: '42' });

      act(() => result.current.onDrop(evt));

      expect(mockAddAssetToScene).toHaveBeenCalledWith(mockAssets[0], undefined);
    });

    it('传入 getDropPosition 时将计算的坐标传给 addAssetToScene', () => {
      const getPos = vi.fn().mockReturnValue([3, 0, -5] as [number, number, number]);
      const { result } = renderHook(() => useAssetDrop(getPos));
      const evt = makeDragEvent({ assetId: '42' });

      act(() => result.current.onDrop(evt));

      expect(getPos).toHaveBeenCalledWith(evt);
      expect(mockAddAssetToScene).toHaveBeenCalledWith(mockAssets[0], [3, 0, -5]);
    });

    it('非 model 类型资产不调用 addAssetToScene', () => {
      const { result } = renderHook(() => useAssetDrop());
      const evt = makeDragEvent({ assetId: '99' }); // texture

      act(() => result.current.onDrop(evt));

      expect(mockAddAssetToScene).not.toHaveBeenCalled();
    });

    it('找不到资产时不调用 addAssetToScene', () => {
      const { result } = renderHook(() => useAssetDrop());
      const evt = makeDragEvent({ assetId: '999' }); // 不存在

      act(() => result.current.onDrop(evt));

      expect(mockAddAssetToScene).not.toHaveBeenCalled();
    });

    it('onDrop 后 isDraggingOver 重置为 false', () => {
      const { result } = renderHook(() => useAssetDrop());
      act(() => result.current.onDragOver(makeDragEvent({ types: ['assetid'] })));
      act(() => result.current.onDrop(makeDragEvent({ assetId: '42' })));
      expect(result.current.isDraggingOver).toBe(false);
    });
  });
});

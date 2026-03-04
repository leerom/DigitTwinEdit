import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useResize } from './useResize';

describe('useResize', () => {
  it('horizontal: mousedown + mousemove 向右应增大尺寸', () => {
    const setter = vi.fn();
    const getCurrentSize = () => 256;

    const { result } = renderHook(() =>
      useResize('horizontal', setter, getCurrentSize)
    );

    // 模拟 mousedown（起始 x=100）
    act(() => {
      result.current.handleProps.onMouseDown?.({
        clientX: 100,
        clientY: 0,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent<HTMLDivElement>);
    });

    // 模拟全局 mousemove（x=130，delta=+30）
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 130, clientY: 0 }));
    });

    expect(setter).toHaveBeenCalledWith(286); // 256 + 30

    // mouseup 应清理
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });
  });

  it('vertical: mousedown + mousemove 向上应增大高度', () => {
    const setter = vi.fn();
    const getCurrentSize = () => 256;

    const { result } = renderHook(() =>
      useResize('vertical', setter, getCurrentSize)
    );

    act(() => {
      result.current.handleProps.onMouseDown?.({
        clientX: 0,
        clientY: 300,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent<HTMLDivElement>);
    });

    // 向上拖（y 减小）应增大高度：delta = 300 - 270 = 30，height = 256 + 30
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 270 }));
    });

    expect(setter).toHaveBeenCalledWith(286);

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });
  });
});

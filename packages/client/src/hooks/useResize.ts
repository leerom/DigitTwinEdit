import { useCallback, useRef } from 'react';

type Direction = 'horizontal' | 'vertical';

interface UseResizeReturn {
  handleProps: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * 拖拽调整面板尺寸的 Hook。
 * - horizontal：左右拖拽，delta = clientX 变化量（正数 = 向右 = 增大）
 * - vertical：上下拖拽，delta = -(clientY 变化量)（向上拖 = 减小 clientY = 增大高度）
 */
export function useResize(
  direction: Direction,
  setter: (size: number) => void,
  getCurrentSize: () => number
): UseResizeReturn {
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragging.current = true;
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
      startSize.current = getCurrentSize();

      document.body.style.userSelect = 'none';
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!dragging.current) return;
        const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
        const delta = direction === 'horizontal'
          ? currentPos - startPos.current
          : startPos.current - currentPos; // 向上拖为正
        setter(startSize.current + delta);
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [direction, setter, getCurrentSize]
  );

  return {
    handleProps: { onMouseDown },
  };
}

import { useState, useCallback } from 'react';
import { useAssetStore } from '@/stores/assetStore';
import { useSceneStore } from '@/stores/sceneStore';

type GetDropPosition = (e: React.DragEvent<HTMLElement>) => [number, number, number];

/**
 * 共享的资产拖放 Hook。
 *
 * @param getDropPosition - 可选，计算 drop 落点坐标的函数。
 *   不传时坐标为 undefined，sceneStore 会使用原点 [0,0,0]。
 *
 * @returns isDraggingOver, onDragOver, onDragLeave, onDrop
 */
export function useAssetDrop(getDropPosition?: GetDropPosition) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const assets = useAssetStore((state) => state.assets);
  const addAssetToScene = useSceneStore((state) => state.addAssetToScene);

  const onDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    // 只响应资产拖拽（浏览器将 dataTransfer key 转为小写）
    if (e.dataTransfer.types.includes('assetid')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDraggingOver(true);
    }
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      setIsDraggingOver(false);

      const assetId = parseInt(e.dataTransfer.getData('assetId'), 10);
      const asset = assets.find((a) => a.id === assetId);
      if (!asset || asset.type !== 'model') return;

      const position = getDropPosition ? getDropPosition(e) : undefined;
      addAssetToScene(asset, position);
    },
    [assets, addAssetToScene, getDropPosition]
  );

  return { isDraggingOver, onDragOver, onDragLeave, onDrop };
}

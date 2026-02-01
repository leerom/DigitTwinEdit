// This hook centralizes property binding logic if needed.
// Currently direct store access in components is simple enough.
// We can use this to debounce updates or handle complex conversions (deg<->rad).

import { useSceneStore } from '@/stores/sceneStore';
import { useCallback } from 'react';

export const useObjectProps = (id: string) => {
  const object = useSceneStore((state) => state.scene.objects[id]);
  const updateTransform = useSceneStore((state) => state.updateTransform);

  const setPosition = useCallback((val: [number, number, number]) => {
     updateTransform(id, { position: val });
  }, [id, updateTransform]);

  return {
    object,
    setPosition,
    // ...
  };
};

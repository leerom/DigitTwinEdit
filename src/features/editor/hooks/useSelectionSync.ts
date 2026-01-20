import { useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';

/**
 * Ensures that if a selected object is deleted from the scene,
 * it is also removed from the selection.
 */
export const useSelectionSync = () => {
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const deselect = useEditorStore((state) => state.deselect);
  const objects = useSceneStore((state) => state.scene.objects);

  useEffect(() => {
    const invalidIds = selectedIds.filter(id => !objects[id]);

    if (invalidIds.length > 0) {
      deselect(invalidIds);
    }
  }, [objects, selectedIds, deselect]);
};

import { useEffect } from 'react';
import { useHistoryStore } from '@/stores/historyStore';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';

export const useGlobalShortcuts = () => {
  const undo = useHistoryStore((state) => state.undo);
  const redo = useHistoryStore((state) => state.redo);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const removeObject = useSceneStore((state) => state.removeObject);
  const select = useEditorStore((state) => state.select);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
           e.preventDefault();
           if (e.shiftKey) redo();
           else undo();
        }
        if (e.key.toLowerCase() === 'y') {
           e.preventDefault();
           redo();
        }
        if (e.key.toLowerCase() === 'a') {
           e.preventDefault();
           // Select All logic?
        }
        if (e.key.toLowerCase() === 'd') {
           e.preventDefault();
           // Duplicate logic?
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
         // Delete selection
         if (selectedIds.length > 0) {
            // Should be a Command!
            // For now direct execution.
            selectedIds.forEach(id => removeObject(id));
            select([]);
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedIds, removeObject, select]);
};

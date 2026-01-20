import { useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';

export const useToolShortcuts = () => {
  const setMode = useEditorStore((state) => state.setMode);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'q': setMode('select'); break; // Hand Tool / View Nav (Select mode enables nav?)
        case 'w': setMode('translate'); break;
        case 'e': setMode('rotate'); break;
        case 'r': setMode('scale'); break;
        // Y is usually Transform (Universal), but spec says Y.
        // case 'y': setMode('universal'); break; // Not implemented yet
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setMode]);
};

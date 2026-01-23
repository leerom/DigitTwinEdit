import React, { useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useInputState } from '@/features/editor/navigation/useInputState';
import { buildShortcutKey } from '@/utils/platform';
import { defaultShortcuts } from './shortcutRegistry';
import { useSceneStore } from '@/stores/sceneStore';
import type { ShortcutAction } from './types';

export const KeyboardShortcutManager: React.FC = () => {
  const activeTool = useEditorStore((state) => state.activeTool);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const viewMode = useEditorStore((state) => state.viewMode);
  const navigationMode = useEditorStore((state) => state.navigationMode);

  // Actions
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const setModifiers = useEditorStore((state) => state.setModifiers);
  const setRenamingId = useEditorStore((state) => state.setRenamingId);
  const activeId = useEditorStore((state) => state.activeId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Update modifiers
      setModifiers({ ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey });

      // Ignore if input is focused
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      // Fly Mode Handling (Priority)
      if (navigationMode === 'fly') {
        const flyKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'];
        if (flyKeys.includes(e.code)) {
          e.preventDefault();
          useInputState.getState().setKey(e.code, true);
          return;
        }
      }

      const key = buildShortcutKey(e);
      const shortcut = defaultShortcuts[key];

      if (!shortcut) return;

      // Context checks
      if (shortcut.requiresSelection && selectedIds.length === 0) return;
      if (shortcut.disabledIn2D && viewMode === '2D') return;

      e.preventDefault();
      executeShortcut(shortcut);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setModifiers({ ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey });

      if (navigationMode === 'fly') {
        useInputState.getState().setKey(e.code, false);
      }
    };

    const executeShortcut = (shortcut: ShortcutAction) => {
      switch (shortcut.action) {
        case 'setTool':
          setActiveTool(shortcut.params);
          break;
        case 'selectAll':
          const allIds = useSceneStore.getState().scene.objects
            ? Object.values(useSceneStore.getState().scene.objects)
                .filter(obj => obj.type !== 'Group' && obj.id !== 'root')
                .map(obj => obj.id)
            : [];
          useEditorStore.getState().select(allIds);
          break;
        case 'focusObject':
          // logic pending
          break;
        case 'renameObject':
           if (activeId) setRenamingId(activeId);
           break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    activeTool, selectedIds, viewMode, navigationMode,
    setActiveTool, setModifiers, setRenamingId, activeId
  ]);

  return null;
};

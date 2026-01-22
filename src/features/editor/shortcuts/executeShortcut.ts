// src/features/editor/shortcuts/executeShortcut.ts
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import type { ShortcutAction } from './types';

/**
 * 执行快捷键动作
 */
export const executeShortcut = (shortcut: ShortcutAction): void => {
  const { action, params } = shortcut;

  switch (action) {
    case 'setTool':
      useEditorStore.getState().setActiveTool(params);
      break;

    case 'selectAll': {
      const objects = useSceneStore.getState().scene.objects;
      const allIds = Object.keys(objects);
      useEditorStore.getState().select(allIds);
      break;
    }

    case 'focusObject':
      // TODO: Implement camera focus on selected object
      console.warn('focusObject action not implemented yet');
      break;

    case 'followObject':
      // TODO: Implement camera follow selected object
      console.warn('followObject action not implemented yet');
      break;

    case 'renameObject':
      // Set renaming state for the active object
      {
        const activeId = useEditorStore.getState().activeId;
        if (activeId) {
          useEditorStore.getState().setRenamingId(activeId);
        }
      }
      break;

    case 'deleteObject':
      // TODO: Implement delete with confirmation
      console.warn('deleteObject action not implemented yet');
      break;

    case 'deleteObjectImmediate':
      // TODO: Implement immediate delete
      console.warn('deleteObjectImmediate action not implemented yet');
      break;

    case 'duplicateObject':
      // TODO: Implement object duplication
      console.warn('duplicateObject action not implemented yet');
      break;

    case 'undo':
      // TODO: Implement undo
      console.warn('undo action not implemented yet');
      break;

    case 'redo':
      // TODO: Implement redo
      console.warn('redo action not implemented yet');
      break;

    case 'resetTransform':
      // TODO: Implement transform reset
      console.warn('resetTransform action not implemented yet');
      break;

    default:
      console.warn(`Unknown shortcut action: ${action}`);
  }
};

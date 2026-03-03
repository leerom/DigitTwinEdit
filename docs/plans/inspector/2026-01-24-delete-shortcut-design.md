# Delete Shortcut & Recursive Deletion Design

## Overview
Implement object deletion with keyboard shortcuts (`Delete` and `Shift+Delete`) including recursive deletion support, undo/redo integration, and a confirmation dialog for safety.

## Architecture

### 1. Command Implementation (`DeleteObjectsCommand`)
A new command class implementing the `Command` interface to handle the actual deletion logic and undo/redo state.

*   **State**: Stores the deleted objects and their relationships to allow restoration.
*   **Execute**:
    *   Identifies all objects to be deleted (selected objects + their children recursively).
    *   Removes them from `SceneStore`.
    *   Clears selection in `EditorStore`.
*   **Undo**:
    *   Restores objects to `SceneStore`.
    *   Restores parent-child relationships.
    *   Restores selection.

### 2. Global Dialog System
Since shortcuts are handled in `KeyboardShortcutManager` (logic layer) but need to trigger a UI dialog (view layer), we need a bridge.

*   **Store**: Add `dialog` state to `EditorStore` (or a new `UIStore`) to manage visibility of global dialogs.
    *   `showDeleteConfirmation: boolean`
    *   `setDeleteConfirmation(visible: boolean)`
*   **Component**: Add `GlobalDialogs` component to `App.tsx` or `MainLayout.tsx` that listens to this store and renders the `ConfirmDialog`.

### 3. Shortcut Handling (`executeShortcut.ts`)
Update the switch case for `deleteObject` and `deleteObjectImmediate`:

*   **`deleteObject` (Delete key)**:
    *   Check if any objects are selected.
    *   Call `useEditorStore.getState().setDeleteConfirmation(true)`.
*   **`deleteObjectImmediate` (Shift+Delete key)**:
    *   Instantiate `DeleteObjectsCommand`.
    *   Execute via `HistoryStore`.

## Implementation Steps

1.  **SceneStore**: Ensure `removeObject` logic is robust for recursion (it seems to be already). Add `restoreObject` (or utilize `addObject` with specific ID/properties) for Undo.
2.  **Command**: Create `src/features/editor/commands/DeleteObjectsCommand.ts`.
3.  **UI Store**: Update `src/stores/editorStore.ts` to add dialog state.
4.  **Dialog Component**: Create `src/components/common/GlobalDialogs.tsx` and add to `MainLayout`.
5.  **Shortcut Logic**: Update `src/features/editor/shortcuts/executeShortcut.ts`.

## Verification Plan
1.  Select an object with children -> Press `Delete` -> Verify Dialog appears.
    *   Confirm -> Objects deleted.
    *   Cancel -> Nothing happens.
2.  Select object -> Press `Shift+Delete` -> Immediate deletion.
3.  Press `Ctrl+Z` (Undo) -> Objects reappear.
4.  Press `Ctrl+Y` (Redo) -> Objects disappear.

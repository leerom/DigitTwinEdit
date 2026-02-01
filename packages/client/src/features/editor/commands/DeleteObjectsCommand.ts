import { Command } from './Command';
import { useSceneStore } from '@/stores/sceneStore';
import { useEditorStore } from '@/stores/editorStore';
import { SceneObject } from '@/types';

export class DeleteObjectsCommand implements Command {
  name = 'Delete Objects';
  private deletedObjects: SceneObject[] = [];
  private objectIds: string[];

  constructor(objectIds: string[]) {
    this.objectIds = objectIds;
  }

  execute() {
    const sceneStore = useSceneStore.getState();
    const scene = sceneStore.scene;

    // 1. Identify all objects to delete (including recursive children)
    const objectsToDelete = new Set<string>();

    const collectIds = (id: string) => {
      if (objectsToDelete.has(id)) return;
      objectsToDelete.add(id);

      const obj = scene.objects[id];
      if (obj && obj.children) {
        obj.children.forEach(collectIds);
      }
    };

    this.objectIds.forEach(id => {
      // Don't delete root
      if (id === scene.root) return;
      collectIds(id);
    });

    // 2. Store object state for undo
    this.deletedObjects = [];
    objectsToDelete.forEach(id => {
      const obj = scene.objects[id];
      if (obj) {
        // We clone deep enough for our needs (SceneObject is JSON-serializable usually)
        this.deletedObjects.push(JSON.parse(JSON.stringify(obj)));
      }
    });

    // Sort deleted objects to ensure parents are restored before children during undo?
    // Actually for restore, order matters less if we just put them back in the map,
    // but we need to ensure parents exist when linking children.
    // However, sceneStore.restoreObject handles re-linking to parent.
    // It's safer if parent exists when child is restored, but not strictly required if we just update the map directly.
    // Let's keep it simple.

    // 3. Remove from store
    // We can call removeObject for the top-level selected IDs.
    // The store's removeObject handles recursion.
    // However, for consistency with our captured state, let's call removeObject for the explicitly selected ones.
    this.objectIds.forEach(id => {
       // Check root again to be safe
       if (id === scene.root) return;
       sceneStore.removeObject(id);
    });

    // 4. Clear selection
    useEditorStore.getState().clearSelection();
  }

  undo() {
    const sceneStore = useSceneStore.getState();
    const editorStore = useEditorStore.getState();

    // Restore objects
    // We need to restore parents before children to ensure scene hierarchy consistency if the store logic depends on it.
    // But our restoreObject implementation just puts it in the map and updates the parent's children array.
    // So order shouldn't matter too strictly, but let's try to restore in a logical order (top-down) if possible,
    // or just restore all.

    this.deletedObjects.forEach(obj => {
      sceneStore.restoreObject(obj);
    });

    // Restore selection
    // Only select the originally selected objects, not all their children
    editorStore.select(this.objectIds);
  }
}

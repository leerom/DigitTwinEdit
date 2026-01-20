import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Scene, SceneObject, TransformComponent, ObjectType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface SceneState {
  scene: Scene;

  // Actions
  addObject: (obj: Partial<SceneObject>, parentId?: string) => void;
  removeObject: (id: string) => void;
  updateTransform: (id: string, transform: Partial<TransformComponent>) => void;
  reparentObject: (id: string, newParentId: string | null, index?: number) => void;
  updateComponent: (id: string, componentKey: string, data: any) => void;
  loadScene: (scene: Scene) => void;
}

const DEFAULT_SCENE: Scene = {
  id: 'default-scene',
  name: 'New Scene',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  root: 'root',
  objects: {
    'root': {
      id: 'root',
      name: 'Root',
      type: ObjectType.GROUP,
      parentId: null,
      children: [],
      visible: true,
      locked: true,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    },
  },
  assets: {},
  settings: {
    environment: 'default',
    gridVisible: true,
    backgroundColor: '#1a1a1a',
  },
};

export const useSceneStore = create<SceneState>()(
  devtools(
    immer((set) => ({
      scene: DEFAULT_SCENE,

      addObject: (obj, parentId = 'root') =>
        set((state) => {
          const id = obj.id || uuidv4();
          const newObj: SceneObject = {
            id,
            name: 'New Object',
            type: ObjectType.MESH,
            parentId,
            children: [],
            visible: true,
            locked: false,
            transform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            },
            ...obj,
          };

          state.scene.objects[id] = newObj;

          if (parentId && state.scene.objects[parentId]) {
            state.scene.objects[parentId].children.push(id);
          }

          state.scene.updatedAt = new Date().toISOString();
        }),

      removeObject: (id) =>
        set((state) => {
          if (id === state.scene.root) return; // Cannot delete root

          const obj = state.scene.objects[id];
          if (!obj) return;

          // Remove from parent's children list
          if (obj.parentId && state.scene.objects[obj.parentId]) {
            const parent = state.scene.objects[obj.parentId];
            parent.children = parent.children.filter((childId) => childId !== id);
          }

          // Recursive delete function
          const deleteRecursive = (targetId: string) => {
            const target = state.scene.objects[targetId];
            if (target && target.children) {
              target.children.forEach(deleteRecursive);
            }
            delete state.scene.objects[targetId];
          };

          deleteRecursive(id);
          state.scene.updatedAt = new Date().toISOString();
        }),

      updateTransform: (id, transform) =>
        set((state) => {
          const obj = state.scene.objects[id];
          if (obj) {
            obj.transform = { ...obj.transform, ...transform };
            state.scene.updatedAt = new Date().toISOString();
          }
        }),

      reparentObject: (id, newParentId, index) =>
        set((state) => {
          const obj = state.scene.objects[id];
          const newParent = newParentId ? state.scene.objects[newParentId] : null;
          const oldParent = obj.parentId ? state.scene.objects[obj.parentId] : null;

          if (!obj || !newParent || !oldParent) return;
          if (id === newParentId) return; // Cannot parent to self

          // Check for circular dependency
          let current = newParent;
          while (current.parentId) {
            if (current.id === id) return; // Circular detected
            current = state.scene.objects[current.parentId];
          }

          // Remove from old parent
          oldParent.children = oldParent.children.filter((childId) => childId !== id);

          // Add to new parent
          if (typeof index === 'number' && index >= 0 && index <= newParent.children.length) {
             newParent.children.splice(index, 0, id);
          } else {
             newParent.children.push(id);
          }

          obj.parentId = newParentId;
          state.scene.updatedAt = new Date().toISOString();
        }),

      updateComponent: (id, componentKey, data) =>
        set((state) => {
          const obj = state.scene.objects[id];
          if (obj) {
            if (!obj.components) obj.components = {};
            obj.components[componentKey] = { ...obj.components[componentKey], ...data };
            state.scene.updatedAt = new Date().toISOString();
          }
        }),

      loadScene: (newScene) =>
        set((state) => {
          state.scene = newScene;
        }),
    })),
    { name: 'SceneStore' }
  )
);

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Scene, SceneObject, TransformComponent, ObjectType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface ImportProgress {
  isImporting: boolean;
  percentage: number;
  currentTask: string;
}

export interface ImportError {
  objectName: string;
  error: string;
}

interface SceneState {
  scene: Scene;

  // Import state
  importProgress: ImportProgress;
  importErrors: ImportError[];

  // Dirty state
  isDirty: boolean;
  currentScenePath: string | null;

  // Actions
  addObject: (obj: Partial<SceneObject>, parentId?: string) => void;
  removeObject: (id: string) => void;
  updateTransform: (id: string, transform: Partial<TransformComponent>) => void;
  reparentObject: (id: string, newParentId: string | null, index?: number) => void;
  updateComponent: (id: string, componentKey: string, data: Record<string, unknown>) => void;
  loadScene: (scene: Scene) => void;

  // Dirty state actions
  markDirty: () => void;
  markClean: () => void;
  setScenePath: (path: string | null) => void;

  // Import actions
  setImportProgress: (progress: Partial<ImportProgress>) => void;
  addImportError: (error: ImportError) => void;
  clearImportState: () => void;
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
      children: ['camera-1', 'light-1'],
      visible: true,
      locked: true,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    },
    'camera-1': {
      id: 'camera-1',
      name: 'Main Camera',
      type: ObjectType.CAMERA,
      parentId: 'root',
      children: [],
      visible: true,
      locked: false,
      transform: {
        position: [0, 1, -10],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      components: {
        camera: {
          fov: 60,
          near: 0.1,
          far: 1000,
          orthographic: false,
        },
      },
    },
    'light-1': {
      id: 'light-1',
      name: 'Directional Light',
      type: ObjectType.LIGHT,
      parentId: 'root',
      children: [],
      visible: true,
      locked: false,
      transform: {
        position: [0, 3, 0],
        rotation: [50 * (Math.PI / 180), -30 * (Math.PI / 180), 0],
        scale: [1, 1, 1],
      },
      components: {
        light: {
          color: '#ffffff',
          intensity: 1,
          type: 'directional',
          castShadow: true,
        },
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

      // Initialize import state
      importProgress: {
        isImporting: false,
        percentage: 0,
        currentTask: '',
      },
      importErrors: [],

      // Initialize dirty state
      isDirty: false,
      currentScenePath: null,

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
          state.isDirty = true;
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
          state.isDirty = true;
        }),

      updateTransform: (id, transform) =>
        set((state) => {
          const obj = state.scene.objects[id];
          if (obj) {
            obj.transform = { ...obj.transform, ...transform };
            state.scene.updatedAt = new Date().toISOString();
            state.isDirty = true;
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
          state.isDirty = true;
        }),

      updateComponent: (id, componentKey, data) =>
        set((state) => {
          const obj = state.scene.objects[id];
          if (obj) {
            if (!obj.components) obj.components = {};
            obj.components[componentKey] = { ...obj.components[componentKey], ...data };
            state.scene.updatedAt = new Date().toISOString();
            state.isDirty = true;
          }
        }),

      loadScene: (newScene) =>
        set((state) => {
          state.scene = newScene;
          state.isDirty = false;
        }),

      // Dirty state actions
      markDirty: () =>
        set((state) => {
          state.isDirty = true;
        }),

      markClean: () =>
        set((state) => {
          state.isDirty = false;
        }),

      setScenePath: (path) =>
        set((state) => {
          state.currentScenePath = path;
        }),

      // Import actions
      setImportProgress: (progress) =>
        set((state) => {
          state.importProgress = { ...state.importProgress, ...progress };
        }),

      addImportError: (error) =>
        set((state) => {
          state.importErrors.push(error);
        }),

      clearImportState: () =>
        set((state) => {
          state.importProgress = {
            isImporting: false,
            percentage: 0,
            currentTask: '',
          };
          state.importErrors = [];
        }),
    })),
    { name: 'SceneStore' }
  )
);

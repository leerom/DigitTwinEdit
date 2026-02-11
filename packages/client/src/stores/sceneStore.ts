import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Scene, SceneObject, TransformComponent, ObjectType, MaterialSpec } from '@/types';
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
  updateObject: (id: string, data: Partial<SceneObject>) => void;
  updateMeshMaterialSpec: (id: string, spec: import('@/types').MaterialSpec) => void;
  restoreObject: (obj: SceneObject) => void;
  loadScene: (scene: Scene) => void;
  addAssetToScene: (asset: import('@digittwinedit/shared').Asset) => void;

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
            // Prevent scale modification for Main Camera
            if (obj.type === ObjectType.CAMERA && obj.name === 'Main Camera' && transform.scale) {
                // If trying to update scale, use the original scale (or force 1,1,1 if not present)
                // We'll create a new transform object without the scale property change for this specific case
                // or just ignore the scale part.
                const { scale, ...allowedTransform } = transform;
                // If only scale was being updated, allowedTransform might be empty, but that's fine.
                // However, we want to ensure scale remains [1,1,1] or whatever it was.
                // Actually, if it's the Main Camera, we can just enforce scale to be [1,1,1] always if it was somehow changed before?
                // But the requirement says "read only, default 1". So we just ignore incoming scale changes.
                obj.transform = { ...obj.transform, ...allowedTransform };
            } else {
                 obj.transform = { ...obj.transform, ...transform };
            }
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

      updateObject: (id, data) =>
          set((state) => {
              const obj = state.scene.objects[id];
              if (obj) {
                  // Only update shallow properties of the object itself (not nested components/transform unless specific logic added)
                  // For safety, let's merge `data` into `obj` but be careful about type safety if needed.
                  // SceneObject has specific keys.
                  Object.assign(obj, data);
                  state.scene.updatedAt = new Date().toISOString();
                  state.isDirty = true;
              }
          }),

      updateMeshMaterialSpec: (id, spec) =>
        set((state) => {
          const obj = state.scene.objects[id];
          const mesh = obj?.components?.mesh;
          if (!mesh) return;

          mesh.material = spec;
          state.scene.updatedAt = new Date().toISOString();
          state.isDirty = true;
        }),

      restoreObject: (obj) =>
        set((state) => {
          state.scene.objects[obj.id] = obj;

          // If parent exists, ensure child is in parent's children list
          if (obj.parentId && state.scene.objects[obj.parentId]) {
            const parent = state.scene.objects[obj.parentId];
            if (!parent.children.includes(obj.id)) {
              parent.children.push(obj.id);
            }
          }

          state.scene.updatedAt = new Date().toISOString();
          state.isDirty = true;
        }),

      loadScene: (newScene) =>
        set((state) => {
          state.scene = newScene;
          state.isDirty = false;
        }),

      addAssetToScene: (asset) =>
        set((state) => {
          // 只支持模型资产
          if (asset.type !== 'model') {
            throw new Error('Only model assets can be added to scene');
          }

          const id = uuidv4();
          const name = asset.name.replace(/\.[^/.]+$/, ''); // 移除文件扩展名

          const newObject: SceneObject = {
            id,
            name,
            type: ObjectType.MESH,
            parentId: state.scene.root,
            children: [],
            visible: true,
            locked: false,
            transform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            },
            components: {
              model: {
                path: asset.file_path,
              },
            },
          };

          state.scene.objects[id] = newObject;

          // 添加到根对象的子对象列表
          if (state.scene.objects[state.scene.root]) {
            state.scene.objects[state.scene.root].children.push(id);
          }

          state.scene.updatedAt = new Date().toISOString();
          state.isDirty = true;
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

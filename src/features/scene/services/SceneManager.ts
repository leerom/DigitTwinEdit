import { v4 as uuidv4 } from 'uuid';
import { saveAs } from 'file-saver';
import {
  Scene,
  SceneObject,
  ObjectType,
  CameraComponent,
  LightComponent
} from '@/types';
import { useSceneStore } from '@/stores/sceneStore';

export class SceneManager {
  /**
   * Creates a new scene with default objects (Camera, Light)
   */
  static createNewScene(name: string = 'New Scene'): Scene {
    const rootId = 'root';
    const cameraId = uuidv4();
    const lightId = uuidv4();
    const now = new Date().toISOString();

    const rootObject: SceneObject = {
      id: rootId,
      name: 'Root',
      type: ObjectType.GROUP,
      parentId: null,
      children: [cameraId, lightId],
      visible: true,
      locked: true,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    };

    const mainCamera: SceneObject = {
      id: cameraId,
      name: 'Main Camera',
      type: ObjectType.CAMERA,
      parentId: rootId,
      children: [],
      visible: true,
      locked: false,
      transform: {
        position: [0, 1, -10],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      components: {
        camera: this.createDefaultCameraComponent(),
      },
    };

    const directionalLight: SceneObject = {
      id: lightId,
      name: 'Directional Light',
      type: ObjectType.LIGHT,
      parentId: rootId,
      children: [],
      visible: true,
      locked: false,
      transform: {
        position: [0, 3, 0],
        rotation: [50 * (Math.PI / 180), -30 * (Math.PI / 180), 0],
        scale: [1, 1, 1],
      },
      components: {
        light: this.createDefaultLightComponent(),
      },
    };

    const scene: Scene = {
      id: uuidv4(),
      name,
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      root: rootId,
      objects: {
        [rootId]: rootObject,
        [cameraId]: mainCamera,
        [lightId]: directionalLight,
      },
      assets: {},
      settings: {
        environment: 'default',
        gridVisible: true,
        backgroundColor: '#1a1a1a',
      },
    };

    return scene;
  }

  /**
   * Saves the scene to a JSON file
   */
  static saveSceneToFile(scene: Scene): void {
    const sceneJson = JSON.stringify(scene, null, 2);
    const blob = new Blob([sceneJson], { type: 'application/json' });
    saveAs(blob, `${scene.name}.json`);
  }

  /**
   * Checks if there are unsaved changes in the store
   */
  static checkUnsavedChanges(): boolean {
    return useSceneStore.getState().isDirty;
  }

  private static createDefaultCameraComponent(): CameraComponent {
    return {
      fov: 60,
      near: 0.1,
      far: 1000,
      orthographic: false,
    };
  }

  private static createDefaultLightComponent(): LightComponent {
    return {
      color: '#ffffff',
      intensity: 1,
      type: 'directional',
      castShadow: true,
    };
  }

  /**
   * Creates a new mesh object with specified geometry
   */
  static createMesh(name: string, geometryType: 'box' | 'sphere' | 'plane' | 'cylinder' | 'torus' | 'capsule' = 'box'): SceneObject {
      const id = uuidv4();
      return {
        id,
        name,
        type: ObjectType.MESH,
        parentId: null,
        children: [],
        visible: true,
        locked: false,
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        components: {
          mesh: {
            assetId: 'default',
            materialId: 'default',
            geometry: geometryType,
            castShadow: true,
            receiveShadow: true,
          }
        }
      };
  }
}

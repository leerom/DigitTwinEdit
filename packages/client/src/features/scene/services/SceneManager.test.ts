import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SceneManager } from './SceneManager';
import { useSceneStore } from '@/stores/sceneStore';
import { ObjectType } from '@/types';

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

// Mock zustand store
vi.mock('@/stores/sceneStore', () => ({
  useSceneStore: {
    getState: vi.fn(),
  },
}));

describe('SceneManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNewScene', () => {
    it('should create a scene with correct default structure', () => {
      const sceneName = 'Test Scene';
      const scene = SceneManager.createNewScene(sceneName);

      expect(scene.name).toBe(sceneName);
      expect(scene.objects.root).toBeDefined();
      expect(scene.root).toBe('root');

      // Check for Main Camera
      const cameras = Object.values(scene.objects).filter(obj => obj.type === ObjectType.CAMERA);
      expect(cameras).toHaveLength(1);
      const mainCamera = cameras[0];
      expect(mainCamera.name).toBe('Main Camera');
      expect(mainCamera.components?.camera).toBeDefined();

      // Check for Directional Light
      const lights = Object.values(scene.objects).filter(obj => obj.type === ObjectType.LIGHT);
      expect(lights).toHaveLength(1);
      const mainLight = lights[0];
      expect(mainLight.name).toBe('Directional Light');
      expect(mainLight.components?.light).toBeDefined();
      expect(mainLight.components?.light?.type).toBe('directional');

      // Verify hierarchy
      expect(scene.objects.root.children).toContain(mainCamera.id);
      expect(scene.objects.root.children).toContain(mainLight.id);
    });
  });

  describe('checkUnsavedChanges', () => {
    it('should return true when store is dirty', () => {
      (useSceneStore.getState as any).mockReturnValue({ isDirty: true });
      expect(SceneManager.checkUnsavedChanges()).toBe(true);
    });

    it('should return false when store is clean', () => {
      (useSceneStore.getState as any).mockReturnValue({ isDirty: false });
      expect(SceneManager.checkUnsavedChanges()).toBe(false);
    });
  });

  describe('saveSceneToFile', () => {
    it('should save scene to file using file-saver', async () => {
      const { saveAs } = await import('file-saver');
      const scene = SceneManager.createNewScene('Save Test');

      SceneManager.saveSceneToFile(scene);

      expect(saveAs).toHaveBeenCalled();
      const [blob, filename] = (saveAs as any).mock.calls[0];
      expect(blob instanceof Blob).toBe(true);
      expect(filename).toBe('Save Test.json');
    });
  });

  describe('createMesh', () => {
    it('should create mesh with default MeshStandardMaterial spec', () => {
      const obj = SceneManager.createMesh('Cube', 'box');
      expect(obj.components?.mesh?.material?.type).toBe('MeshStandardMaterial');
    });
  });

  describe('createLight', () => {
    it('ambient: type=LIGHT, light.type=ambient, no castShadow', () => {
      const obj = SceneManager.createLight('Ambient Light', 'ambient');
      expect(obj.type).toBe(ObjectType.LIGHT);
      expect(obj.components?.light?.type).toBe('ambient');
      expect(obj.components?.light?.intensity).toBe(0.5);
      expect(obj.components?.light?.castShadow).toBeUndefined();
    });

    it('hemisphere: has groundColor, no castShadow', () => {
      const obj = SceneManager.createLight('Hemisphere Light', 'hemisphere');
      expect(obj.components?.light?.type).toBe('hemisphere');
      expect(obj.components?.light?.groundColor).toBe('#444444');
      expect(obj.components?.light?.castShadow).toBeUndefined();
    });

    it('point: has range, decay, no castShadow by default', () => {
      const obj = SceneManager.createLight('Point Light', 'point');
      expect(obj.components?.light?.type).toBe('point');
      expect(obj.components?.light?.range).toBe(0);
      expect(obj.components?.light?.decay).toBe(2);
      expect(obj.components?.light?.castShadow).toBe(false);
    });

    it('spot: has angle, penumbra, decay', () => {
      const obj = SceneManager.createLight('Spot Light', 'spot');
      expect(obj.components?.light?.type).toBe('spot');
      expect(obj.components?.light?.angle).toBeCloseTo(Math.PI / 6);
      expect(obj.components?.light?.penumbra).toBe(0.1);
      expect(obj.components?.light?.range).toBe(10);
      expect(obj.components?.light?.decay).toBe(2);
      expect(obj.components?.light?.castShadow).toBe(false);
    });

    it('directional: has castShadow=true and shadow defaults', () => {
      const obj = SceneManager.createLight('Directional Light', 'directional');
      expect(obj.components?.light?.castShadow).toBe(true);
      expect(obj.components?.light?.shadowMapSize).toBe(1024);
      expect(obj.components?.light?.shadowCameraSize).toBe(10);
    });

    it('returned object has required SceneObject fields', () => {
      const obj = SceneManager.createLight('Test', 'point');
      expect(obj.id).toBeTruthy();
      expect(obj.parentId).toBeNull();
      expect(obj.children).toEqual([]);
      expect(obj.transform.position).toEqual([0, 3, 0]);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { SceneFormatConverter } from './SceneFormatConverter';
import { ExternalSceneFile } from '../types';
import { ObjectType } from '../../../types';

describe('SceneFormatConverter', () => {
  const converter = new SceneFormatConverter();

  describe('convert', () => {
    it('should convert a simple external scene to internal Scene format', () => {
      const externalScene: ExternalSceneFile = {
        scene: { name: 'Test Scene' },
        viewer: {
          background: '#000000',
          environment: '/path/to/env.hdr',
        },
        objects: [
          {
            name: 'Test Object',
            type: 'MESH',
            position: [1, 2, 3],
            rotation: [0, 0, 0, 'XYZ'],
            scale: [1, 1, 1],
            visible: true,
            userData: {
              locked: false,
              fileInfo: {
                type: 'GLB',
                url: '/models/test.glb',
              },
            },
          },
        ],
      };

      const result = converter.convert(externalScene);

      // Verify basic scene properties
      expect(result.name).toBe('Test Scene');
      expect(result.version).toBe('1.0.0');
      expect(result.root).toBe('root');

      // Verify root object exists
      expect(result.objects['root']).toBeDefined();
      expect(result.objects['root'].name).toBe('Root');
      expect(result.objects['root'].type).toBe(ObjectType.GROUP);
      expect(result.objects['root'].children).toHaveLength(1);

      // Verify converted object
      const childId = result.objects['root'].children[0];
      const childObj = result.objects[childId];

      expect(childObj.name).toBe('Test Object');
      expect(childObj.type).toBe(ObjectType.MESH);
      expect(childObj.transform.position).toEqual([1, 2, 3]);
      expect(childObj.transform.rotation).toEqual([0, 0, 0]);
      expect(childObj.transform.scale).toEqual([1, 1, 1]);
      expect(childObj.visible).toBe(true);
      expect(childObj.locked).toBe(false);
      expect(childObj.parentId).toBe('root');

      // Verify components
      expect(childObj.components?.model).toBeDefined();
      expect(childObj.components?.model.type).toBe('GLB');
      expect(childObj.components?.model.url).toBe('/models/test.glb');
      expect(childObj.components?.model.loadState).toBe('pending');
    });

    it('should handle nested children objects', () => {
      const externalScene: ExternalSceneFile = {
        objects: [
          {
            name: 'Parent',
            type: 'GROUP',
            children: [
              {
                name: 'Child 1',
                type: 'MESH',
              },
              {
                name: 'Child 2',
                type: 'MESH',
              },
            ],
          },
        ],
      };

      const result = converter.convert(externalScene);

      // Get parent object
      const parentId = result.objects['root'].children[0];
      const parent = result.objects[parentId];

      expect(parent.name).toBe('Parent');
      expect(parent.children).toHaveLength(2);

      // Verify children
      const child1 = result.objects[parent.children[0]];
      const child2 = result.objects[parent.children[1]];

      expect(child1.name).toBe('Child 1');
      expect(child1.parentId).toBe(parentId);
      expect(child2.name).toBe('Child 2');
      expect(child2.parentId).toBe(parentId);
    });

    it('should handle locked objects', () => {
      const externalScene: ExternalSceneFile = {
        objects: [
          {
            name: 'Locked Object',
            userData: {
              locked: true,
            },
          },
        ],
      };

      const result = converter.convert(externalScene);

      const objId = result.objects['root'].children[0];
      const obj = result.objects[objId];

      expect(obj.locked).toBe(true);
    });

    it('should convert settings correctly', () => {
      const externalScene: ExternalSceneFile = {
        viewer: {
          background: '#ff0000',
          environment: '/env/studio.hdr',
        },
        objects: [],
      };

      const result = converter.convert(externalScene);

      expect(result.settings.backgroundColor).toBe('#ff0000');
      expect(result.settings.environment).toBe('/env/studio.hdr');
      expect(result.settings.gridVisible).toBe(true);
    });

    it('should extract assets from objects', () => {
      const externalScene: ExternalSceneFile = {
        objects: [
          {
            name: 'Model 1',
            userData: {
              fileInfo: {
                type: 'GLB',
                url: '/models/model1.glb',
              },
            },
          },
          {
            name: 'Model 2',
            userData: {
              fileInfo: {
                type: 'GLTF',
                url: '/models/model2.gltf',
              },
            },
          },
        ],
      };

      const result = converter.convert(externalScene);

      const assetIds = Object.keys(result.assets);
      expect(assetIds).toHaveLength(2);

      const assetValues = Object.values(result.assets);
      expect(assetValues[0].path).toMatch(/\/models\/model[12]\.gl(b|tf)/);
      expect(assetValues[1].path).toMatch(/\/models\/model[12]\.gl(b|tf)/);
    });

    it('should use default values for missing fields', () => {
      const externalScene: ExternalSceneFile = {
        objects: [
          {
            // Minimal object with no optional fields
          },
        ],
      };

      const result = converter.convert(externalScene);

      const objId = result.objects['root'].children[0];
      const obj = result.objects[objId];

      expect(obj.name).toBe('Unnamed');
      expect(obj.type).toBe(ObjectType.GROUP);
      expect(obj.visible).toBe(true);
      expect(obj.locked).toBe(false);
      expect(obj.transform.position).toEqual([0, 0, 0]);
      expect(obj.transform.rotation).toEqual([0, 0, 0]);
      expect(obj.transform.scale).toEqual([1, 1, 1]);
    });

    it('should handle empty external scene', () => {
      const externalScene: ExternalSceneFile = {};

      const result = converter.convert(externalScene);

      expect(result.name).toBe('Imported Scene');
      expect(result.objects['root']).toBeDefined();
      expect(result.objects['root'].children).toHaveLength(0);
      expect(Object.keys(result.assets)).toHaveLength(0);
    });
  });
});

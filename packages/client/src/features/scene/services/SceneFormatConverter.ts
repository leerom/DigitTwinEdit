import { v4 as uuidv4 } from 'uuid';
import {
  Scene,
  SceneObject,
  ObjectType,
  SceneSettings,
  AssetReference,
  AssetType,
  Vector3,
} from '../../../types';
import { ExternalSceneFile, ExternalSceneObject } from '../types';

/**
 * 场景格式转换器
 * 将外部JSON格式转换为编辑器内部Scene格式
 */
export class SceneFormatConverter {
  /**
   * 转换外部场景JSON为内部Scene格式
   */
  convert(externalScene: ExternalSceneFile): Scene {
    const sceneId = uuidv4();
    const rootId = 'root';

    // 1. 转换对象数组为Record,构建层级树
    const { objects, root } = this.convertObjects(
      externalScene.objects || [],
      rootId
    );

    // 2. 转换场景设置
    const settings = this.convertSettings(externalScene);

    // 3. 提取资产引用
    const assets = this.extractAssets(externalScene.objects || []);

    return {
      id: sceneId,
      name: externalScene.scene?.name || 'Imported Scene',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      root: rootId,
      objects,
      assets,
      settings,
    };
  }

  /**
   * 转换外部对象数组为内部objects Record
   */
  private convertObjects(
    externalObjects: ExternalSceneObject[],
    rootId: string
  ): { objects: Record<string, SceneObject>; root: string } {
    const objects: Record<string, SceneObject> = {};

    // 创建root对象
    objects[rootId] = {
      id: rootId,
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
    };

    // 递归转换每个外部对象
    externalObjects.forEach((extObj) => {
      const id = this.convertObjectRecursive(extObj, rootId, objects);
      objects[rootId].children.push(id);
    });

    return { objects, root: rootId };
  }

  /**
   * 递归转换单个外部对象及其子对象
   */
  private convertObjectRecursive(
    extObj: ExternalSceneObject,
    parentId: string,
    objects: Record<string, SceneObject>
  ): string {
    const id = uuidv4();

    const sceneObj: SceneObject = {
      id,
      name: extObj.name || 'Unnamed',
      type: this.mapObjectType(extObj.type),
      parentId,
      children: [],
      visible: extObj.visible !== false,
      locked: extObj.userData?.locked || false,
      transform: {
        position: extObj.position || [0, 0, 0],
        rotation: this.extractRotation(extObj.rotation),
        scale: extObj.scale || [1, 1, 1],
      },
      components: this.convertComponents(extObj),
    };

    objects[id] = sceneObj;

    // 递归处理子对象
    if (extObj.children && extObj.children.length > 0) {
      extObj.children.forEach((child) => {
        const childId = this.convertObjectRecursive(child, id, objects);
        sceneObj.children.push(childId);
      });
    }

    return id;
  }

  /**
   * 映射外部对象类型到内部ObjectType
   */
  private mapObjectType(externalType?: string): ObjectType {
    if (!externalType) return ObjectType.GROUP;

    const typeMap: Record<string, ObjectType> = {
      '3DTILES': ObjectType.MESH,
      'MESH': ObjectType.MESH,
      'GROUP': ObjectType.GROUP,
      'LIGHT': ObjectType.LIGHT,
      'CAMERA': ObjectType.CAMERA,
    };

    return typeMap[externalType.toUpperCase()] || ObjectType.MESH;
  }

  /**
   * 提取旋转值(处理带单位的旋转格式)
   */
  private extractRotation(
    rotation?: [number, number, number, string] | [number, number, number]
  ): Vector3 {
    if (!rotation) return [0, 0, 0];

    // 如果是四元素格式,取前三个值
    if (rotation.length >= 3) {
      return [rotation[0], rotation[1], rotation[2]];
    }

    return [0, 0, 0];
  }

  /**
   * 转换外部对象的userData为组件数据
   */
  private convertComponents(extObj: ExternalSceneObject) {
    const components: any = {};

    // 转换fileInfo为模型组件
    if (extObj.userData?.fileInfo) {
      components.model = {
        type: extObj.userData.fileInfo.type,
        url: extObj.userData.fileInfo.url,
        loadState: 'pending' as const,
      };
    }

    // 保留其他userData
    if (extObj.userData) {
      const { fileInfo, locked, ...otherData } = extObj.userData;
      if (Object.keys(otherData).length > 0) {
        components.metadata = otherData;
      }
    }

    return Object.keys(components).length > 0 ? components : undefined;
  }

  /**
   * 转换外部viewer配置为内部settings
   */
  private convertSettings(externalScene: ExternalSceneFile): SceneSettings {
    const viewer = externalScene.viewer || {};

    return {
      environment: viewer.environment || 'default',
      gridVisible: true,
      backgroundColor: viewer.background || '#1a1a1a',
    };
  }

  /**
   * 从外部对象中提取资产引用
   */
  private extractAssets(
    externalObjects: ExternalSceneObject[]
  ): Record<string, AssetReference> {
    const assets: Record<string, AssetReference> = {};

    const extractFromObject = (obj: ExternalSceneObject) => {
      if (obj.userData?.fileInfo?.url) {
        const assetId = uuidv4();
        assets[assetId] = {
          id: assetId,
          name: obj.name || 'Asset',
          type: 'model',
          path: obj.userData.fileInfo.url,
        };
      }

      // 递归处理子对象
      if (obj.children) {
        obj.children.forEach(extractFromObject);
      }
    };

    externalObjects.forEach(extractFromObject);
    return assets;
  }
}

import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import type { MaterialAsset } from '@digittwinedit/shared';

/**
 * 材质序列化器 - 将Three.js材质序列化为JSON，反之亦然
 */
export class MaterialSerializer {
  /**
   * 序列化Three.js材质为JSON
   */
  static serialize(material: THREE.Material): MaterialAsset {
    const type = material.type;
    const properties: Record<string, unknown> = {};
    const textureReferences: Record<string, number> = {};

    // 通用属性
    properties.name = material.name;
    properties.transparent = material.transparent;
    properties.opacity = material.opacity;
    properties.side = material.side;
    properties.depthTest = material.depthTest;
    properties.depthWrite = material.depthWrite;
    properties.visible = material.visible;

    // 根据材质类型提取特定属性
    if (material instanceof THREE.MeshStandardMaterial) {
      properties.color = '#' + material.color.getHexString();
      properties.metalness = material.metalness;
      properties.roughness = material.roughness;
      properties.emissive = '#' + material.emissive.getHexString();
      properties.emissiveIntensity = material.emissiveIntensity;

      // 提取贴图引用
      if (material.map && (material.map as any).userData?.assetId) {
        textureReferences.map = (material.map as any).userData.assetId;
      }
      if (material.normalMap && (material.normalMap as any).userData?.assetId) {
        textureReferences.normalMap = (material.normalMap as any).userData.assetId;
      }
      if (material.roughnessMap && (material.roughnessMap as any).userData?.assetId) {
        textureReferences.roughnessMap = (material.roughnessMap as any).userData.assetId;
      }
      if (material.metalnessMap && (material.metalnessMap as any).userData?.assetId) {
        textureReferences.metalnessMap = (material.metalnessMap as any).userData.assetId;
      }
      if (material.emissiveMap && (material.emissiveMap as any).userData?.assetId) {
        textureReferences.emissiveMap = (material.emissiveMap as any).userData.assetId;
      }
      if (material.aoMap && (material.aoMap as any).userData?.assetId) {
        textureReferences.aoMap = (material.aoMap as any).userData.assetId;
      }
    } else if (material instanceof THREE.MeshBasicMaterial) {
      properties.color = '#' + material.color.getHexString();

      if (material.map && (material.map as any).userData?.assetId) {
        textureReferences.map = (material.map as any).userData.assetId;
      }
    } else if (material instanceof THREE.MeshPhongMaterial) {
      properties.color = '#' + material.color.getHexString();
      properties.emissive = '#' + material.emissive.getHexString();
      properties.specular = '#' + material.specular.getHexString();
      properties.shininess = material.shininess;

      if (material.map && (material.map as any).userData?.assetId) {
        textureReferences.map = (material.map as any).userData.assetId;
      }
      if (material.normalMap && (material.normalMap as any).userData?.assetId) {
        textureReferences.normalMap = (material.normalMap as any).userData.assetId;
      }
    }

    return {
      id: uuidv4(),
      name: material.name || 'Material',
      type,
      properties,
      textureReferences: Object.keys(textureReferences).length > 0 ? textureReferences : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * 反序列化JSON为Three.js材质
   * @param data 材质数据
   * @param getAssetUrl 获取资产URL的函数
   */
  static async deserialize(
    data: MaterialAsset,
    getAssetUrl: (assetId: number) => string
  ): Promise<THREE.Material> {
    let material: THREE.Material;

    switch (data.type) {
      case 'MeshStandardMaterial':
        material = new THREE.MeshStandardMaterial();
        this.applyStandardProperties(material as THREE.MeshStandardMaterial, data.properties);
        break;

      case 'MeshBasicMaterial':
        material = new THREE.MeshBasicMaterial();
        this.applyBasicProperties(material as THREE.MeshBasicMaterial, data.properties);
        break;

      case 'MeshPhongMaterial':
        material = new THREE.MeshPhongMaterial();
        this.applyPhongProperties(material as THREE.MeshPhongMaterial, data.properties);
        break;

      case 'MeshPhysicalMaterial':
        material = new THREE.MeshPhysicalMaterial();
        this.applyStandardProperties(material as THREE.MeshPhysicalMaterial, data.properties);
        break;

      default:
        material = new THREE.MeshStandardMaterial();
        this.applyStandardProperties(material as THREE.MeshStandardMaterial, data.properties);
    }

    // 应用通用属性
    material.name = data.name;

    // 加载贴图
    if (data.textureReferences) {
      await this.loadTextures(material, data.textureReferences, getAssetUrl);
    }

    return material;
  }

  /**
   * 应用MeshStandardMaterial属性
   */
  private static applyStandardProperties(material: THREE.MeshStandardMaterial, props: Record<string, unknown>) {
    if (props.color) material.color.set(props.color as string);
    if (typeof props.metalness === 'number') material.metalness = props.metalness;
    if (typeof props.roughness === 'number') material.roughness = props.roughness;
    if (props.emissive) material.emissive.set(props.emissive as string);
    if (typeof props.emissiveIntensity === 'number') material.emissiveIntensity = props.emissiveIntensity;
    if (typeof props.transparent === 'boolean') material.transparent = props.transparent;
    if (typeof props.opacity === 'number') material.opacity = props.opacity;
    if (typeof props.side === 'number') material.side = props.side as THREE.Side;
  }

  /**
   * 应用MeshBasicMaterial属性
   */
  private static applyBasicProperties(material: THREE.MeshBasicMaterial, props: Record<string, unknown>) {
    if (props.color) material.color.set(props.color as string);
    if (typeof props.transparent === 'boolean') material.transparent = props.transparent;
    if (typeof props.opacity === 'number') material.opacity = props.opacity;
    if (typeof props.side === 'number') material.side = props.side as THREE.Side;
  }

  /**
   * 应用MeshPhongMaterial属性
   */
  private static applyPhongProperties(material: THREE.MeshPhongMaterial, props: Record<string, unknown>) {
    if (props.color) material.color.set(props.color as string);
    if (props.emissive) material.emissive.set(props.emissive as string);
    if (props.specular) material.specular.set(props.specular as string);
    if (typeof props.shininess === 'number') material.shininess = props.shininess;
    if (typeof props.transparent === 'boolean') material.transparent = props.transparent;
    if (typeof props.opacity === 'number') material.opacity = props.opacity;
    if (typeof props.side === 'number') material.side = props.side as THREE.Side;
  }

  /**
   * 加载贴图
   */
  private static async loadTextures(
    material: THREE.Material,
    textureRefs: Record<string, number>,
    getAssetUrl: (assetId: number) => string
  ): Promise<void> {
    const textureLoader = new THREE.TextureLoader();

    const texturePromises = Object.entries(textureRefs).map(async ([textureType, assetId]) => {
      try {
        const url = getAssetUrl(assetId);
        const texture = await textureLoader.loadAsync(url);
        (texture as any).userData = { assetId };

        // 应用贴图到材质
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
          switch (textureType) {
            case 'map':
              material.map = texture;
              break;
            case 'normalMap':
              material.normalMap = texture;
              break;
            case 'roughnessMap':
              material.roughnessMap = texture;
              break;
            case 'metalnessMap':
              material.metalnessMap = texture;
              break;
            case 'emissiveMap':
              material.emissiveMap = texture;
              break;
            case 'aoMap':
              material.aoMap = texture;
              break;
          }
        } else if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshPhongMaterial) {
          if (textureType === 'map') {
            material.map = texture;
          } else if (textureType === 'normalMap' && material instanceof THREE.MeshPhongMaterial) {
            material.normalMap = texture;
          }
        }
      } catch (error) {
        console.error(`Failed to load texture ${textureType} (asset ${assetId}):`, error);
      }
    });

    await Promise.all(texturePromises);
    material.needsUpdate = true;
  }
}

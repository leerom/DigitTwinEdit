import { Scene } from '@digittwinedit/shared';
import { materialsApi } from '../api/assets.js';
import { MaterialSerializer } from './MaterialSerializer.js';
import { useSceneStore } from '../stores/sceneStore.js';
import { useAssetStore } from '../stores/assetStore.js';
import * as THREE from 'three';

/**
 * 场景资产集成服务
 * 负责在场景保存/加载时处理资产和材质的序列化
 */
export class SceneAssetIntegration {
  /**
   * 准备场景以供保存 - 提取并上传材质
   * @param scene 场景数据
   * @param projectId 项目ID
   * @param materialCache 材质缓存（从Three.js对象中获取）
   */
  static async prepareSceneForSave(
    scene: Scene,
    projectId: number,
    materialCache: Map<string, THREE.Material>
  ): Promise<Scene> {
    const processedScene = { ...scene };
    const materialReferences: Record<string, any> = {};

    // 遍历场景对象，提取并上传材质
    for (const [objectId, sceneObject] of Object.entries(processedScene.objects)) {
      const meshComponent = sceneObject.components?.mesh;
      if (!meshComponent || !meshComponent.materialId) continue;

      const materialId = meshComponent.materialId;

      // 检查是否已经处理过该材质
      if (materialReferences[materialId]) {
        continue;
      }

      // 从缓存中获取Three.js材质
      const threeMaterial = materialCache.get(materialId);
      if (!threeMaterial) {
        console.warn(`Material ${materialId} not found in cache`);
        continue;
      }

      try {
        // 序列化材质
        const materialData = MaterialSerializer.serialize(threeMaterial);
        materialData.id = materialId; // 保持一致的ID

        // 上传材质到服务器
        const assetResponse = await materialsApi.createMaterial(projectId, materialData);

        // 记录材质引用
        materialReferences[materialId] = {
          id: materialId,
          name: materialData.name,
          path: `/api/materials/${assetResponse.id}`,
          materialDbId: assetResponse.id,
        };
      } catch (error) {
        console.error(`Failed to upload material ${materialId}:`, error);
      }
    }

    // 添加材质引用到场景
    processedScene.materials = materialReferences;

    return processedScene;
  }

  /**
   * 从服务器加载场景并恢复资产引用
   * @param sceneData 场景数据
   */
  static async loadSceneWithAssets(sceneData: Scene): Promise<Scene> {
    const { getAssetUrl } = useAssetStore.getState();
    const loadedScene = { ...sceneData };

    // 处理资产引用
    if (loadedScene.assets) {
      for (const [assetRefId, assetRef] of Object.entries(loadedScene.assets)) {
        if (assetRef.assetDbId) {
          // 更新资产URL
          assetRef.path = getAssetUrl(assetRef.assetDbId);
        }
      }
    }

    // 处理材质引用（加载材质数据）
    if (loadedScene.materials) {
      for (const [materialRefId, materialRef] of Object.entries(loadedScene.materials)) {
        if (materialRef.materialDbId) {
          try {
            // 从服务器加载材质数据
            const materialData = await materialsApi.getMaterial(materialRef.materialDbId);

            // 反序列化为Three.js材质
            const threeMaterial = await MaterialSerializer.deserialize(materialData, getAssetUrl);

            // 缓存材质以便场景渲染使用
            // 注意：这里需要一个全局材质缓存机制
            // 暂时通过更新场景对象中的material属性来传递
            for (const obj of Object.values(loadedScene.objects)) {
              if (obj.components?.mesh?.materialId === materialRefId) {
                // 将材质序列化数据存储在mesh组件中
                obj.components.mesh.material = {
                  type: materialData.type as any,
                  props: materialData.properties,
                };
              }
            }
          } catch (error) {
            console.error(`Failed to load material ${materialRefId}:`, error);
          }
        }
      }
    }

    return loadedScene;
  }

  /**
   * 从场景中收集所有使用的资产ID
   */
  static collectUsedAssets(scene: Scene): {
    models: Set<number>;
    textures: Set<number>;
    materials: Set<number>;
  } {
    const models = new Set<number>();
    const textures = new Set<number>();
    const materials = new Set<number>();

    // 收集模型资产
    for (const assetRef of Object.values(scene.assets || {})) {
      if (assetRef.assetDbId && assetRef.type === 'model') {
        models.add(assetRef.assetDbId);
      }
    }

    // 收集材质和纹理资产
    for (const materialRef of Object.values(scene.materials || {})) {
      if (materialRef.materialDbId) {
        materials.add(materialRef.materialDbId);
      }
    }

    return { models, textures, materials };
  }

  /**
   * 验证场景资产完整性
   */
  static async validateSceneAssets(scene: Scene): Promise<{
    valid: boolean;
    missingAssets: { type: string; id: number }[];
  }> {
    const missingAssets: { type: string; id: number }[] = [];
    const { assets } = useAssetStore.getState();

    // 检查模型资产
    for (const assetRef of Object.values(scene.assets || {})) {
      if (assetRef.assetDbId) {
        const exists = assets.some((a) => a.id === assetRef.assetDbId);
        if (!exists) {
          missingAssets.push({ type: 'asset', id: assetRef.assetDbId });
        }
      }
    }

    // 检查材质资产
    for (const materialRef of Object.values(scene.materials || {})) {
      if (materialRef.materialDbId) {
        const exists = assets.some((a) => a.id === materialRef.materialDbId);
        if (!exists) {
          missingAssets.push({ type: 'material', id: materialRef.materialDbId });
        }
      }
    }

    return {
      valid: missingAssets.length === 0,
      missingAssets,
    };
  }
}

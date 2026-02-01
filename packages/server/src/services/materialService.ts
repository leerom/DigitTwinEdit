import { AssetModel, type AssetRow } from '../models/Asset.js';
import { fileStorage } from '../utils/fileStorage.js';

export interface MaterialAsset {
  id: string;
  name: string;
  type: string; // MaterialType from three.js
  properties: Record<string, unknown>;
  textureReferences?: Record<string, number>; // texture assetId references
  created_at?: string;
  updated_at?: string;
}

export class MaterialService {
  /**
   * 创建材质描述文件
   */
  async createMaterial(
    projectId: number,
    materialData: MaterialAsset
  ): Promise<AssetRow> {
    // 序列化材质为JSON
    const materialJson = JSON.stringify(materialData, null, 2);
    const buffer = Buffer.from(materialJson, 'utf-8');

    // 生成文件名
    const filename = `${materialData.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.mat.json`;

    // 保存材质文件
    const relativePath = await fileStorage.saveFile(
      projectId,
      'materials',
      filename,
      buffer
    );

    // 创建资产记录
    const asset = await AssetModel.create({
      project_id: projectId,
      name: materialData.name,
      type: 'material',
      file_path: relativePath,
      file_size: buffer.length,
      mime_type: 'application/json',
      metadata: {
        materialType: materialData.type,
        textureCount: Object.keys(materialData.textureReferences || {}).length,
        hasTextures: !!materialData.textureReferences && Object.keys(materialData.textureReferences).length > 0
      }
    });

    return asset;
  }

  /**
   * 获取材质
   */
  async getMaterial(materialId: number): Promise<MaterialAsset> {
    const asset = await AssetModel.findById(materialId);
    if (!asset || asset.type !== 'material') {
      throw new Error('Material not found');
    }

    // 读取材质文件
    const buffer = await fileStorage.readFile(asset.file_path);
    const materialData = JSON.parse(buffer.toString('utf-8')) as MaterialAsset;

    return materialData;
  }

  /**
   * 更新材质
   */
  async updateMaterial(
    materialId: number,
    materialData: Partial<MaterialAsset>
  ): Promise<void> {
    const asset = await AssetModel.findById(materialId);
    if (!asset || asset.type !== 'material') {
      throw new Error('Material not found');
    }

    // 读取现有材质
    const existingBuffer = await fileStorage.readFile(asset.file_path);
    const existingData = JSON.parse(existingBuffer.toString('utf-8')) as MaterialAsset;

    // 合并更新
    const updatedData: MaterialAsset = {
      ...existingData,
      ...materialData,
      updated_at: new Date().toISOString()
    };

    // 保存更新后的材质
    const buffer = Buffer.from(JSON.stringify(updatedData, null, 2), 'utf-8');
    await fileStorage.deleteFile(asset.file_path);
    await fileStorage.saveFile(
      asset.project_id,
      'materials',
      asset.file_path.split('/').pop()!,
      buffer
    );

    // 更新元数据
    await AssetModel.update(materialId, {
      metadata: {
        ...asset.metadata,
        materialType: updatedData.type,
        textureCount: Object.keys(updatedData.textureReferences || {}).length,
        hasTextures: !!updatedData.textureReferences && Object.keys(updatedData.textureReferences).length > 0
      }
    });
  }

  /**
   * 删除材质
   */
  async deleteMaterial(materialId: number): Promise<void> {
    const asset = await AssetModel.findById(materialId);
    if (!asset || asset.type !== 'material') {
      throw new Error('Material not found');
    }

    // 删除文件
    await fileStorage.deleteFile(asset.file_path);

    // 删除数据库记录
    await AssetModel.delete(materialId);
  }

  /**
   * 获取材质引用的所有纹理资产
   */
  async getMaterialTextures(materialId: number): Promise<AssetRow[]> {
    const materialData = await this.getMaterial(materialId);
    const textureIds = Object.values(materialData.textureReferences || {});

    if (textureIds.length === 0) {
      return [];
    }

    // 查询所有纹理资产
    const textures: AssetRow[] = [];
    for (const textureId of textureIds) {
      const texture = await AssetModel.findById(textureId);
      if (texture && texture.type === 'texture') {
        textures.push(texture);
      }
    }

    return textures;
  }

  /**
   * 验证材质引用的纹理是否都存在
   */
  async validateMaterialTextures(materialData: MaterialAsset): Promise<{
    valid: boolean;
    missingTextures: number[];
  }> {
    const textureIds = Object.values(materialData.textureReferences || {});
    const missingTextures: number[] = [];

    for (const textureId of textureIds) {
      const texture = await AssetModel.findById(textureId);
      if (!texture || texture.type !== 'texture') {
        missingTextures.push(textureId);
      }
    }

    return {
      valid: missingTextures.length === 0,
      missingTextures
    };
  }

  /**
   * 批量创建材质
   */
  async createMaterialBatch(
    projectId: number,
    materials: MaterialAsset[]
  ): Promise<AssetRow[]> {
    const createdAssets: AssetRow[] = [];

    for (const materialData of materials) {
      try {
        const asset = await this.createMaterial(projectId, materialData);
        createdAssets.push(asset);
      } catch (error) {
        console.error(`Failed to create material ${materialData.name}:`, error);
      }
    }

    return createdAssets;
  }
}

export const materialService = new MaterialService();

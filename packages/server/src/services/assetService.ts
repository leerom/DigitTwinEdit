import { AssetModel, type CreateAssetData, type AssetRow, type AssetType } from '../models/Asset.js';
import { fileStorage } from '../utils/fileStorage.js';

// 尝试导入sharp，如果失败则使用null
let sharp: any = null;
try {
  sharp = (await import('sharp')).default;
} catch (error) {
  console.warn('Sharp module not available. Thumbnail generation will be disabled.');
}

export class AssetService {
  /**
   * 上传资产文件
   */
  async uploadAsset(
    projectId: number,
    file: Express.Multer.File,
    type: AssetType
  ): Promise<AssetRow> {
    // 生成唯一文件名
    const uniqueFilename = fileStorage.generateUniqueFilename(file.originalname);

    // 确定文件类型目录
    const fileType = type === 'model' ? 'models' : type === 'material' ? 'materials' : 'textures';

    // 保存文件
    const relativePath = await fileStorage.saveFile(
      projectId,
      fileType,
      uniqueFilename,
      file.buffer
    );

    // 创建资产记录
    const assetData: CreateAssetData = {
      project_id: projectId,
      name: file.originalname,
      type,
      file_path: relativePath,
      file_size: file.size,
      mime_type: file.mimetype,
      metadata: this.extractMetadata(file, type)
    };

    const asset = await AssetModel.create(assetData);

    // 异步生成缩略图（不阻塞响应）
    if (type === 'model' || type === 'texture') {
      this.generateThumbnail(asset.id, file.buffer, type).catch(err => {
        console.error(`Failed to generate thumbnail for asset ${asset.id}:`, err);
      });
    }

    return asset;
  }

  /**
   * 获取项目的所有资产
   */
  async getProjectAssets(projectId: number, type?: AssetType): Promise<AssetRow[]> {
    return AssetModel.findByProject(projectId, type);
  }

  /**
   * 获取单个资产
   */
  async getAsset(assetId: number): Promise<AssetRow | null> {
    return AssetModel.findById(assetId);
  }

  /**
   * 删除资产
   */
  async deleteAsset(assetId: number): Promise<void> {
    const asset = await AssetModel.findById(assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    // 删除文件
    try {
      await fileStorage.deleteFile(asset.file_path);

      // 删除缩略图
      if (asset.thumbnail_path) {
        await fileStorage.deleteFile(asset.thumbnail_path);
      }
    } catch (error) {
      console.error(`Failed to delete asset files:`, error);
    }

    // 删除数据库记录
    await AssetModel.delete(assetId);
  }

  /**
   * 下载资产文件
   */
  async downloadAsset(assetId: number): Promise<{ buffer: Buffer; asset: AssetRow }> {
    const asset = await AssetModel.findById(assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    const buffer = await fileStorage.readFile(asset.file_path);
    return { buffer, asset };
  }

  /**
   * 生成缩略图
   */
  async generateThumbnail(
    assetId: number,
    fileBuffer: Buffer,
    type: AssetType
  ): Promise<string | null> {
    // 如果sharp不可用，跳过缩略图生成
    if (!sharp) {
      console.warn('Sharp not available, skipping thumbnail generation');
      return null;
    }

    try {
      let thumbnailBuffer: Buffer;

      if (type === 'texture') {
        // 对于贴图，直接调整大小
        thumbnailBuffer = await sharp(fileBuffer)
          .resize(256, 256, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();
      } else if (type === 'model') {
        // 对于模型，暂时返回null，后续可以集成3D渲染
        // TODO: 实现3D模型缩略图生成
        return null;
      } else {
        return null;
      }

      // 保存缩略图
      const thumbnailPath = await fileStorage.saveThumbnail(assetId, thumbnailBuffer);

      // 更新资产记录
      await AssetModel.update(assetId, { thumbnail_path: thumbnailPath });

      return thumbnailPath;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return null;
    }
  }

  /**
   * 提取文件元数据
   */
  private extractMetadata(file: Express.Multer.File, type: AssetType): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      originalName: file.originalname,
      uploadedAt: new Date().toISOString()
    };

    // 根据类型提取特定元数据
    if (type === 'model') {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      metadata.format = ext;
    } else if (type === 'texture') {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      metadata.format = ext;
    }

    return metadata;
  }

  /**
   * 获取项目资产统计
   */
  async getProjectStats(projectId: number) {
    return AssetModel.getProjectStats(projectId);
  }

  /**
   * 更新资产元数据
   */
  async updateAssetMetadata(
    assetId: number,
    metadata: Record<string, unknown>
  ): Promise<AssetRow | null> {
    return AssetModel.update(assetId, { metadata });
  }

  /**
   * 重命名资产
   */
  async renameAsset(assetId: number, newName: string): Promise<AssetRow | null> {
    return AssetModel.update(assetId, { name: newName });
  }
}

export const assetService = new AssetService();

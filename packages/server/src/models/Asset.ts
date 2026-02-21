import { queryOne, queryMany, query } from '../config/database.js';

export type AssetType = 'model' | 'material' | 'texture';

export interface AssetRow {
  id: number;
  project_id: number;
  name: string;
  type: AssetType;
  file_path: string;
  file_size: number;
  mime_type: string;
  thumbnail_path?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAssetData {
  project_id: number;
  name: string;
  type: AssetType;
  file_path: string;
  file_size: number;
  mime_type: string;
  thumbnail_path?: string;
  metadata?: Record<string, unknown>;
}

export class AssetModel {
  // 根据ID查找资产
  static async findById(id: number): Promise<AssetRow | null> {
    return queryOne<AssetRow>(
      'SELECT * FROM assets WHERE id = $1',
      [id]
    );
  }

  // 查找项目的所有资产
  static async findByProject(projectId: number, type?: AssetType): Promise<AssetRow[]> {
    if (type) {
      return queryMany<AssetRow>(
        'SELECT * FROM assets WHERE project_id = $1 AND type = $2 ORDER BY created_at DESC',
        [projectId, type]
      );
    }
    return queryMany<AssetRow>(
      'SELECT * FROM assets WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
  }

  // 创建资产
  static async create(data: CreateAssetData): Promise<AssetRow> {
    const result = await queryOne<AssetRow>(
      `INSERT INTO assets (
        project_id, name, type, file_path, file_size, mime_type, thumbnail_path, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.project_id,
        data.name,
        data.type,
        data.file_path,
        data.file_size,
        data.mime_type,
        data.thumbnail_path || null,
        JSON.stringify(data.metadata || {})
      ]
    );
    if (!result) {
      throw new Error('Failed to create asset');
    }
    return result;
  }

  // 更新资产
  static async update(
    id: number,
    updates: Partial<Pick<AssetRow, 'name' | 'thumbnail_path' | 'metadata' | 'file_size' | 'mime_type'>>
  ): Promise<AssetRow | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.thumbnail_path !== undefined) {
      fields.push(`thumbnail_path = $${paramIndex++}`);
      values.push(updates.thumbnail_path);
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.file_size !== undefined) {
      fields.push(`file_size = $${paramIndex++}`);
      values.push(updates.file_size);
    }
    if (updates.mime_type !== undefined) {
      fields.push(`mime_type = $${paramIndex++}`);
      values.push(updates.mime_type);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const sql = `UPDATE assets SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    return queryOne<AssetRow>(sql, values);
  }

  // 删除资产
  static async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM assets WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // 检查资产是否属于项目
  static async belongsToProject(assetId: number, projectId: number): Promise<boolean> {
    const asset = await this.findById(assetId);
    return asset?.project_id === projectId;
  }

  // 根据文件路径查找资产
  static async findByFilePath(filePath: string): Promise<AssetRow | null> {
    return queryOne<AssetRow>(
      'SELECT * FROM assets WHERE file_path = $1',
      [filePath]
    );
  }

  // 获取项目资产统计
  static async getProjectStats(projectId: number): Promise<{
    total: number;
    models: number;
    materials: number;
    textures: number;
    totalSize: number;
  }> {
    const result = await queryOne<{
      total: string;
      models: string;
      materials: string;
      textures: string;
      total_size: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE type = 'model') as models,
        COUNT(*) FILTER (WHERE type = 'material') as materials,
        COUNT(*) FILTER (WHERE type = 'texture') as textures,
        COALESCE(SUM(file_size), 0) as total_size
       FROM assets
       WHERE project_id = $1`,
      [projectId]
    );

    return {
      total: parseInt(result?.total || '0', 10),
      models: parseInt(result?.models || '0', 10),
      materials: parseInt(result?.materials || '0', 10),
      textures: parseInt(result?.textures || '0', 10),
      totalSize: parseInt(result?.total_size || '0', 10)
    };
  }
}

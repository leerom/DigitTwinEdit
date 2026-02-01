import { queryOne, queryMany, query } from '../config/database.js';
import type { Scene, SceneRecord } from '@digittwinedit/shared';

export interface SceneRow {
  id: number;
  project_id: number;
  name: string;
  data: Scene;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class SceneModel {
  // 根据ID查找场景
  static async findById(id: number): Promise<SceneRow | null> {
    return queryOne<SceneRow>(
      'SELECT * FROM scenes WHERE id = $1',
      [id]
    );
  }

  // 查找项目的所有场景
  static async findByProjectId(projectId: number): Promise<SceneRow[]> {
    return queryMany<SceneRow>(
      'SELECT * FROM scenes WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );
  }

  // 查找项目的活动场景
  static async findActiveScene(projectId: number): Promise<SceneRow | null> {
    return queryOne<SceneRow>(
      'SELECT * FROM scenes WHERE project_id = $1 AND is_active = true',
      [projectId]
    );
  }

  // 创建场景
  static async create(
    projectId: number,
    name: string,
    data: Scene
  ): Promise<SceneRow> {
    const result = await queryOne<SceneRow>(
      `INSERT INTO scenes (project_id, name, data, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [projectId, name, JSON.stringify(data), false]
    );
    if (!result) {
      throw new Error('Failed to create scene');
    }
    return result;
  }

  // 更新场景
  static async update(
    id: number,
    updates: Partial<Pick<SceneRow, 'name' | 'data'>>
  ): Promise<SceneRow | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.data !== undefined) {
      fields.push(`data = $${paramIndex++}`);
      values.push(JSON.stringify(updates.data));
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const sql = `UPDATE scenes SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    return queryOne<SceneRow>(sql, values);
  }

  // 设置活动场景
  static async setActive(id: number, projectId: number): Promise<SceneRow | null> {
    // 先取消所有场景的活动状态
    await query(
      'UPDATE scenes SET is_active = false WHERE project_id = $1',
      [projectId]
    );

    // 设置新的活动场景
    return queryOne<SceneRow>(
      'UPDATE scenes SET is_active = true WHERE id = $1 AND project_id = $2 RETURNING *',
      [id, projectId]
    );
  }

  // 删除场景
  static async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM scenes WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // 检查场景是否属于项目
  static async belongsToProject(sceneId: number, projectId: number): Promise<boolean> {
    const scene = await this.findById(sceneId);
    return scene?.project_id === projectId;
  }

  // 转换为响应格式(不包含data)
  static toListResponse(scene: SceneRow) {
    return {
      id: scene.id,
      project_id: scene.project_id,
      name: scene.name,
      is_active: scene.is_active,
      created_at: scene.created_at.toISOString(),
      updated_at: scene.updated_at.toISOString(),
    };
  }

  // 转换为响应格式(包含data)
  static toDetailResponse(scene: SceneRow) {
    return {
      ...this.toListResponse(scene),
      data: scene.data,
    };
  }
}

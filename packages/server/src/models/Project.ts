import { queryOne, queryMany, query } from '../config/database.js';
import type { Project } from '@digittwinedit/shared';

export interface ProjectRow {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  thumbnail: string | null;
  created_at: Date;
  updated_at: Date;
}

export class ProjectModel {
  // 根据ID查找项目
  static async findById(id: number): Promise<ProjectRow | null> {
    return queryOne<ProjectRow>(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );
  }

  // 查找用户的所有项目
  static async findByOwnerId(ownerId: number): Promise<ProjectRow[]> {
    return queryMany<ProjectRow>(
      'SELECT * FROM projects WHERE owner_id = $1 ORDER BY updated_at DESC',
      [ownerId]
    );
  }

  // 创建项目
  static async create(
    name: string,
    ownerId: number,
    description?: string,
    thumbnail?: string
  ): Promise<ProjectRow> {
    const result = await queryOne<ProjectRow>(
      `INSERT INTO projects (name, owner_id, description, thumbnail)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, ownerId, description || null, thumbnail || null]
    );
    if (!result) {
      throw new Error('Failed to create project');
    }
    return result;
  }

  // 更新项目
  static async update(
    id: number,
    updates: Partial<Pick<ProjectRow, 'name' | 'description' | 'thumbnail'>>
  ): Promise<ProjectRow | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.thumbnail !== undefined) {
      fields.push(`thumbnail = $${paramIndex++}`);
      values.push(updates.thumbnail);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const sql = `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    return queryOne<ProjectRow>(sql, values);
  }

  // 删除项目
  static async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM projects WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // 检查项目所有权
  static async isOwner(projectId: number, userId: number): Promise<boolean> {
    const project = await this.findById(projectId);
    return project?.owner_id === userId;
  }

  // 获取项目场景数量
  static async getSceneCount(projectId: number): Promise<number> {
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM scenes WHERE project_id = $1',
      [projectId]
    );
    return parseInt(result?.count || '0', 10);
  }

  // 转换为响应格式
  static toResponse(project: ProjectRow): Project {
    return {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      owner_id: project.owner_id,
      thumbnail: project.thumbnail || undefined,
      created_at: project.created_at,
      updated_at: project.updated_at,
    };
  }
}

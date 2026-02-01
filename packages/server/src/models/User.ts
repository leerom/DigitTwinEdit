import { queryOne, queryMany, query } from '../config/database.js';
import type { User } from '@digittwinedit/shared';

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  email: string | null;
  created_at: Date;
  updated_at: Date;
}

export class UserModel {
  // 根据用户名查找用户
  static async findByUsername(username: string): Promise<UserRow | null> {
    return queryOne<UserRow>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
  }

  // 根据ID查找用户
  static async findById(id: number): Promise<UserRow | null> {
    return queryOne<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
  }

  // 创建用户
  static async create(username: string, passwordHash: string, email?: string): Promise<UserRow> {
    const result = await queryOne<UserRow>(
      `INSERT INTO users (username, password_hash, email)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [username, passwordHash, email || null]
    );
    if (!result) {
      throw new Error('Failed to create user');
    }
    return result;
  }

  // 更新用户
  static async update(id: number, updates: Partial<Pick<UserRow, 'email'>>): Promise<UserRow | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    return queryOne<UserRow>(sql, values);
  }

  // 删除用户
  static async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // 转换为响应格式(移除敏感信息)
  static toResponse(user: UserRow): User {
    return {
      id: user.id,
      username: user.username,
      email: user.email || undefined,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}

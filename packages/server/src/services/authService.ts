import { UserModel, type UserRow } from '../models/User.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import type { UserResponse } from '@digittwinedit/shared';

export class AuthService {
  // 用户注册
  static async register(
    username: string,
    password: string,
    email?: string
  ): Promise<UserResponse> {
    // 检查用户名是否已存在
    const existingUser = await UserModel.findByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // 哈希密码
    const passwordHash = await hashPassword(password);

    // 创建用户
    const user = await UserModel.create(username, passwordHash, email);

    return {
      id: user.id,
      username: user.username,
      email: user.email || undefined,
    };
  }

  // 用户登录
  static async login(username: string, password: string): Promise<UserResponse> {
    // 查找用户
    const user = await UserModel.findByUsername(username);
    if (!user) {
      throw new Error('Invalid username or password');
    }

    // 验证密码
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email || undefined,
    };
  }

  // 根据ID获取用户
  static async getUserById(id: number): Promise<UserResponse | null> {
    const user = await UserModel.findById(id);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email || undefined,
    };
  }
}

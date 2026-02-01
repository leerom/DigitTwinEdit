import { z } from 'zod';

// 用户注册验证
export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().email('Invalid email').optional(),
});

// 用户登录验证
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

// 项目创建验证
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
});

// 项目更新验证
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
});

// 场景创建验证
export const createSceneSchema = z.object({
  name: z.string().min(1, 'Scene name is required').max(100),
  data: z.any().optional(), // Scene数据结构复杂，这里简化处理
});

// 场景更新验证
export const updateSceneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  data: z.any().optional(),
});

// 辅助函数：验证数据
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

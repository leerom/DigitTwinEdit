import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// 哈希密码
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// 验证密码
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 验证密码强度
export function isPasswordStrong(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long' };
  }

  // 可以添加更多密码强度规则
  // - 至少一个大写字母
  // - 至少一个小写字母
  // - 至少一个数字
  // 这里保持简单，只验证长度

  return { valid: true };
}

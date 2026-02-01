import type { Request, Response, NextFunction } from 'express';

// 扩展 Express Session 类型
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

// 认证中间件
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Please login to access this resource',
    });
  }

  next();
}

// 可选认证中间件(用于可选登录的路由)
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // 如果有用户ID，不做任何操作
  // 如果没有，也继续执行
  next();
}

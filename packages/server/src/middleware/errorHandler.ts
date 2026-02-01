import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// 错误处理中间件
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  // Zod 验证错误
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.errors.map(e => e.message).join(', '),
      details: err.errors,
    });
  }

  // 数据库错误
  if (err.message.includes('duplicate key value') || err.message.includes('unique constraint')) {
    return res.status(409).json({
      success: false,
      error: 'Conflict',
      message: 'Resource already exists',
    });
  }

  // 其他错误
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
}

// 404 处理
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
}

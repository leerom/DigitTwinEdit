import { Router, type Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { validate, registerSchema, loginSchema } from '../utils/validation.js';
import { requireAuth } from '../middleware/auth.js';

const router: Router = Router();

// POST /api/auth/register - 用户注册
router.post('/register', async (req: Request, res: Response, next) => {
  try {
    const { username, password, email } = validate(registerSchema, req.body);

    const user = await AuthService.register(username, password, email);

    // 自动登录
    req.session.userId = user.id;

    res.status(201).json({
      success: true,
      user,
      message: 'User registered successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login - 用户登录
router.post('/login', async (req: Request, res: Response, next) => {
  try {
    const { username, password, rememberMe } = validate(loginSchema, req.body);

    const user = await AuthService.login(username, password);

    // 设置session
    req.session.userId = user.id;

    // 如果勾选"记住我"，延长cookie过期时间
    if (rememberMe && req.session.cookie) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
    }

    res.json({
      success: true,
      user,
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout - 登出
router.post('/logout', (req: Request, res: Response, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }

    res.clearCookie('connect.sid'); // 默认的session cookie名称
    res.json({
      success: true,
      message: 'Logout successful',
    });
  });
});

// GET /api/auth/me - 获取当前用户信息
router.get('/me', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const user = await AuthService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found',
      });
    }

    res.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/check - 检查认证状态(不需要登录)
router.get('/check', async (req: Request, res: Response, next) => {
  try {
    if (!req.session.userId) {
      return res.json({
        authenticated: false,
        user: null,
      });
    }

    const user = await AuthService.getUserById(req.session.userId);

    res.json({
      authenticated: !!user,
      user: user || null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

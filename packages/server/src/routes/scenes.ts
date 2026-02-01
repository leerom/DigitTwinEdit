import { Router, type Request, Response } from 'express';
import { SceneService } from '../services/sceneService.js';
import { validate, createSceneSchema, updateSceneSchema } from '../utils/validation.js';
import { requireAuth } from '../middleware/auth.js';

const router: Router = Router({ mergeParams: true }); // 允许访问父路由参数

// 所有场景路由都需要认证
router.use(requireAuth);

// GET /api/projects/:projectId/scenes - 获取项目的所有场景
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(req.params.projectId, 10);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid project ID',
      });
    }

    const scenes = await SceneService.getProjectScenes(projectId, userId);

    res.json({
      success: true,
      scenes,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:projectId/scenes/active - 获取活动场景
router.get('/active', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(req.params.projectId, 10);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid project ID',
      });
    }

    const scene = await SceneService.getActiveScene(projectId, userId);

    if (!scene) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'No active scene found',
      });
    }

    res.json({
      success: true,
      scene,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:projectId/scenes - 创建新场景
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(req.params.projectId, 10);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid project ID',
      });
    }

    const { name, data } = validate(createSceneSchema, req.body);

    const scene = await SceneService.createScene(projectId, userId, name, data);

    res.status(201).json({
      success: true,
      scene,
      message: 'Scene created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:projectId/scenes/:id - 获取场景详情
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(req.params.projectId, 10);
    const sceneId = parseInt(req.params.id, 10);

    if (isNaN(projectId) || isNaN(sceneId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid project ID or scene ID',
      });
    }

    const scene = await SceneService.getSceneDetail(projectId, sceneId, userId);

    res.json({
      success: true,
      scene,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:projectId/scenes/:id - 更新场景数据
router.put('/:id', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(req.params.projectId, 10);
    const sceneId = parseInt(req.params.id, 10);

    if (isNaN(projectId) || isNaN(sceneId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid project ID or scene ID',
      });
    }

    const updates = validate(updateSceneSchema, req.body);
    const scene = await SceneService.updateScene(projectId, sceneId, userId, updates);

    res.json({
      success: true,
      scene,
      message: 'Scene updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:projectId/scenes/:id/activate - 设置为活动场景
router.put('/:id/activate', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(req.params.projectId, 10);
    const sceneId = parseInt(req.params.id, 10);

    if (isNaN(projectId) || isNaN(sceneId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid project ID or scene ID',
      });
    }

    const scene = await SceneService.setActiveScene(projectId, sceneId, userId);

    res.json({
      success: true,
      scene,
      message: 'Scene activated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:projectId/scenes/:id - 删除场景
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(req.params.projectId, 10);
    const sceneId = parseInt(req.params.id, 10);

    if (isNaN(projectId) || isNaN(sceneId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid project ID or scene ID',
      });
    }

    await SceneService.deleteScene(projectId, sceneId, userId);

    res.json({
      success: true,
      message: 'Scene deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

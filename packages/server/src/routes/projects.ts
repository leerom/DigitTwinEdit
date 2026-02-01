import { Router, type Request, Response } from 'express';
import { ProjectService } from '../services/projectService.js';
import { validate, createProjectSchema, updateProjectSchema } from '../utils/validation.js';
import { requireAuth } from '../middleware/auth.js';

const router: Router = Router();

// 所有项目路由都需要认证
router.use(requireAuth);

// GET /api/projects - 获取当前用户的项目列表
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const projects = await ProjectService.getUserProjects(userId);

    res.json({
      success: true,
      projects,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects - 创建新项目
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const { name, description, thumbnail } = validate(createProjectSchema, req.body);

    const project = await ProjectService.createProject(userId, name, description, thumbnail);

    res.status(201).json({
      success: true,
      project,
      message: 'Project created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id - 获取项目详情(包含场景列表)
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(req.params.id, 10);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid project ID',
      });
    }

    const project = await ProjectService.getProjectWithScenes(projectId, userId);

    res.json({
      success: true,
      project,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:id - 更新项目信息
router.put('/:id', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(req.params.id, 10);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid project ID',
      });
    }

    const updates = validate(updateProjectSchema, req.body);
    const project = await ProjectService.updateProject(projectId, userId, updates);

    res.json({
      success: true,
      project,
      message: 'Project updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id - 删除项目
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(req.params.id, 10);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid project ID',
      });
    }

    await ProjectService.deleteProject(projectId, userId);

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router, type Request, Response } from 'express';
import { assetService } from '../services/assetService.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import { ProjectModel } from '../models/Project.js';
import { AssetModel } from '../models/Asset.js';

const router: Router = Router();

// 所有资产路由都需要认证
router.use(requireAuth);

// POST /api/projects/:projectId/assets/upload - 上传资产
router.post(
  '/projects/:projectId/assets/upload',
  uploadSingle,
  async (req: Request, res: Response, next) => {
    try {
      const userId = req.session.userId!;
      const projectId = parseInt(req.params.projectId, 10);

      if (isNaN(projectId)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid project ID'
        });
      }

      // 验证项目所有权
      const isOwner = await ProjectModel.isOwner(projectId, userId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to upload assets to this project'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'No file uploaded'
        });
      }

      const type = req.body.type as 'model' | 'texture' | 'material';
      if (!type || !['model', 'texture', 'material'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid asset type. Must be "model", "texture", or "material"'
        });
      }

      const asset = await assetService.uploadAsset(projectId, req.file, type);

      res.status(201).json({
        success: true,
        asset,
        message: 'Asset uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/projects/:projectId/assets - 获取项目资产列表
router.get('/projects/:projectId/assets', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(req.params.projectId, 10);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid project ID'
      });
    }

    // 验证项目所有权
    const isOwner = await ProjectModel.isOwner(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this project'
      });
    }

    const type = req.query.type as 'model' | 'texture' | 'material' | undefined;
    const assets = await assetService.getProjectAssets(projectId, type);

    res.json({
      success: true,
      assets
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:projectId/assets/stats - 获取项目资产统计
router.get('/projects/:projectId/assets/stats', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const projectId = parseInt(req.params.projectId, 10);

    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid project ID'
      });
    }

    // 验证项目所有权
    const isOwner = await ProjectModel.isOwner(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this project'
      });
    }

    const stats = await assetService.getProjectStats(projectId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/assets/:id/download - 下载资产文件
router.get('/assets/:id/download', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const assetId = parseInt(req.params.id, 10);

    if (isNaN(assetId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid asset ID'
      });
    }

    // 获取资产
    const asset = await AssetModel.findById(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Asset not found'
      });
    }

    // 验证权限
    const isOwner = await ProjectModel.isOwner(asset.project_id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this asset'
      });
    }

    const { buffer } = await assetService.downloadAsset(assetId);

    // 设置响应头
    res.setHeader('Content-Type', asset.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${asset.name}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/assets/:id - 删除资产
router.delete('/assets/:id', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const assetId = parseInt(req.params.id, 10);

    if (isNaN(assetId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid asset ID'
      });
    }

    // 获取资产
    const asset = await AssetModel.findById(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Asset not found'
      });
    }

    // 验证权限
    const isOwner = await ProjectModel.isOwner(asset.project_id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to delete this asset'
      });
    }

    await assetService.deleteAsset(assetId);

    res.json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/assets/:id - 更新资产元数据
router.put('/assets/:id', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const assetId = parseInt(req.params.id, 10);

    if (isNaN(assetId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid asset ID'
      });
    }

    // 获取资产
    const asset = await AssetModel.findById(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Asset not found'
      });
    }

    // 验证权限
    const isOwner = await ProjectModel.isOwner(asset.project_id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to update this asset'
      });
    }

    const { name, metadata } = req.body;
    const updates: any = {};

    if (name) updates.name = name;
    if (metadata) updates.metadata = metadata;

    const updatedAsset = await AssetModel.update(assetId, updates);

    res.json({
      success: true,
      asset: updatedAsset,
      message: 'Asset updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/assets/:id/thumbnail - 生成缩略图
router.post('/assets/:id/thumbnail', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const assetId = parseInt(req.params.id, 10);

    if (isNaN(assetId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid asset ID'
      });
    }

    // 获取资产
    const asset = await AssetModel.findById(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Asset not found'
      });
    }

    // 验证权限
    const isOwner = await ProjectModel.isOwner(asset.project_id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to generate thumbnail for this asset'
      });
    }

    // 下载文件并生成缩略图
    const { buffer } = await assetService.downloadAsset(assetId);
    const thumbnailPath = await assetService.generateThumbnail(assetId, buffer, asset.type);

    res.json({
      success: true,
      thumbnailPath,
      message: 'Thumbnail generated successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

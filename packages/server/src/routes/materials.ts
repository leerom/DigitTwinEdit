import { Router, type Request, Response } from 'express';
import { materialService } from '../services/materialService.js';
import { requireAuth } from '../middleware/auth.js';
import { ProjectModel } from '../models/Project.js';
import { AssetModel } from '../models/Asset.js';

const router: Router = Router();

// 所有材质路由都需要认证
router.use(requireAuth);

// POST /api/projects/:projectId/materials - 创建材质
router.post('/projects/:projectId/materials', async (req: Request, res: Response, next) => {
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
        message: 'You do not have permission to create materials in this project'
      });
    }

    const materialData = req.body;

    // 验证必需字段
    if (!materialData.name || !materialData.type) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Material name and type are required'
      });
    }

    // 验证材质引用的纹理
    if (materialData.textureReferences) {
      const validation = await materialService.validateMaterialTextures(materialData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Some referenced textures do not exist',
          missingTextures: validation.missingTextures
        });
      }
    }

    const asset = await materialService.createMaterial(projectId, materialData);

    res.status(201).json({
      success: true,
      asset,
      message: 'Material created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/materials/:id - 获取材质
router.get('/materials/:id', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const materialId = parseInt(req.params.id, 10);

    if (isNaN(materialId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid material ID'
      });
    }

    // 获取资产
    const asset = await AssetModel.findById(materialId);
    if (!asset || asset.type !== 'material') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Material not found'
      });
    }

    // 验证权限
    const isOwner = await ProjectModel.isOwner(asset.project_id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this material'
      });
    }

    const materialData = await materialService.getMaterial(materialId);

    res.json({
      success: true,
      material: materialData
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/materials/:id - 更新材质
router.put('/materials/:id', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const materialId = parseInt(req.params.id, 10);

    if (isNaN(materialId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid material ID'
      });
    }

    // 获取资产
    const asset = await AssetModel.findById(materialId);
    if (!asset || asset.type !== 'material') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Material not found'
      });
    }

    // 验证权限
    const isOwner = await ProjectModel.isOwner(asset.project_id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to update this material'
      });
    }

    const updates = req.body;

    // 验证材质引用的纹理
    if (updates.textureReferences) {
      const currentMaterial = await materialService.getMaterial(materialId);
      const updatedMaterial = { ...currentMaterial, ...updates };
      const validation = await materialService.validateMaterialTextures(updatedMaterial);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Some referenced textures do not exist',
          missingTextures: validation.missingTextures
        });
      }
    }

    await materialService.updateMaterial(materialId, updates);

    res.json({
      success: true,
      message: 'Material updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/materials/:id - 删除材质
router.delete('/materials/:id', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const materialId = parseInt(req.params.id, 10);

    if (isNaN(materialId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid material ID'
      });
    }

    // 获取资产
    const asset = await AssetModel.findById(materialId);
    if (!asset || asset.type !== 'material') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Material not found'
      });
    }

    // 验证权限
    const isOwner = await ProjectModel.isOwner(asset.project_id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to delete this material'
      });
    }

    await materialService.deleteMaterial(materialId);

    res.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/materials/:id/textures - 获取材质引用的纹理
router.get('/materials/:id/textures', async (req: Request, res: Response, next) => {
  try {
    const userId = req.session.userId!;
    const materialId = parseInt(req.params.id, 10);

    if (isNaN(materialId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid material ID'
      });
    }

    // 获取资产
    const asset = await AssetModel.findById(materialId);
    if (!asset || asset.type !== 'material') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Material not found'
      });
    }

    // 验证权限
    const isOwner = await ProjectModel.isOwner(asset.project_id, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this material'
      });
    }

    const textures = await materialService.getMaterialTextures(materialId);

    res.json({
      success: true,
      textures
    });
  } catch (error) {
    next(error);
  }
});

export default router;

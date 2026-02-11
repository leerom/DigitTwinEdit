import { SceneModel } from '../models/Scene.js';
import { ProjectModel } from '../models/Project.js';
import type { Scene, SceneResponse, SceneWithDataResponse } from '@digittwinedit/shared';

export class SceneService {
  // 获取项目的所有场景
  static async getProjectScenes(projectId: number, userId: number): Promise<SceneResponse[]> {
    // 检查项目所有权
    const isOwner = await ProjectModel.isOwner(projectId, userId);
    if (!isOwner) {
      throw new Error('Access denied');
    }

    const scenes = await SceneModel.findByProjectId(projectId);

    return scenes.map((scene) => SceneModel.toListResponse(scene));
  }

  // 获取场景详情
  static async getSceneDetail(
    projectId: number,
    sceneId: number,
    userId: number
  ): Promise<SceneWithDataResponse> {
    // 检查项目所有权
    const isOwner = await ProjectModel.isOwner(projectId, userId);
    if (!isOwner) {
      throw new Error('Access denied');
    }

    // 检查场景是否属于项目
    const belongsToProject = await SceneModel.belongsToProject(sceneId, projectId);
    if (!belongsToProject) {
      throw new Error('Scene not found in project');
    }

    const scene = await SceneModel.findById(sceneId);
    if (!scene) {
      throw new Error('Scene not found');
    }

    return SceneModel.toDetailResponse(scene);
  }

  // 创建场景
  static async createScene(
    projectId: number,
    userId: number,
    name: string,
    data?: Scene
  ): Promise<SceneWithDataResponse> {
    // 检查项目所有权
    const isOwner = await ProjectModel.isOwner(projectId, userId);
    if (!isOwner) {
      throw new Error('Access denied');
    }

    // 如果没有提供数据，创建带有默认相机和光源的场景
    const sceneData: Scene = data || {
      id: `scene_${Date.now()}`,
      name,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      root: 'root',
      objects: {
        root: {
          id: 'root',
          name: 'Root',
          type: 'Group' as any,
          parentId: null,
          children: ['camera_default', 'light_default'],
          visible: true,
          locked: true,
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
        },
        camera_default: {
          id: 'camera_default',
          name: 'Main Camera',
          type: 'Camera' as any,
          parentId: 'root',
          children: [],
          visible: true,
          locked: false,
          transform: {
            position: [0, 1, -10],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          components: {
            camera: {
              fov: 60,
              near: 0.1,
              far: 1000,
              orthographic: false,
            },
          },
        },
        light_default: {
          id: 'light_default',
          name: 'Directional Light',
          type: 'Light' as any,
          parentId: 'root',
          children: [],
          visible: true,
          locked: false,
          transform: {
            position: [0, 3, 0],
            rotation: [50 * (Math.PI / 180), -30 * (Math.PI / 180), 0],
            scale: [1, 1, 1],
          },
          components: {
            light: {
              color: '#ffffff',
              intensity: 1,
              type: 'directional',
              castShadow: true,
            },
          },
        },
      },
      assets: {},
      settings: {
        environment: 'default',
        gridVisible: true,
        backgroundColor: '#1a1a1a',
      },
    };

    // 创建场景
    const scene = await SceneModel.create(projectId, name, sceneData);

    // 自动激活新创建的场景
    const activatedScene = await SceneModel.setActive(scene.id, projectId);
    if (!activatedScene) {
      throw new Error('Failed to activate scene');
    }

    return SceneModel.toDetailResponse(activatedScene);
  }

  // 更新场景
  static async updateScene(
    projectId: number,
    sceneId: number,
    userId: number,
    updates: { name?: string; data?: Scene }
  ): Promise<SceneWithDataResponse> {
    // 检查项目所有权
    const isOwner = await ProjectModel.isOwner(projectId, userId);
    if (!isOwner) {
      throw new Error('Access denied');
    }

    // 检查场景是否属于项目
    const belongsToProject = await SceneModel.belongsToProject(sceneId, projectId);
    if (!belongsToProject) {
      throw new Error('Scene not found in project');
    }

    // 如果更新了data，确保updatedAt字段更新
    if (updates.data) {
      updates.data.updatedAt = new Date().toISOString();
    }

    const scene = await SceneModel.update(sceneId, updates);
    if (!scene) {
      throw new Error('Scene not found');
    }

    return SceneModel.toDetailResponse(scene);
  }

  // 删除场景
  static async deleteScene(
    projectId: number,
    sceneId: number,
    userId: number
  ): Promise<void> {
    // 检查项目所有权
    const isOwner = await ProjectModel.isOwner(projectId, userId);
    if (!isOwner) {
      throw new Error('Access denied');
    }

    // 检查场景是否属于项目
    const belongsToProject = await SceneModel.belongsToProject(sceneId, projectId);
    if (!belongsToProject) {
      throw new Error('Scene not found in project');
    }

    const deleted = await SceneModel.delete(sceneId);
    if (!deleted) {
      throw new Error('Failed to delete scene');
    }
  }

  // 设置活动场景
  static async setActiveScene(
    projectId: number,
    sceneId: number,
    userId: number
  ): Promise<SceneResponse> {
    // 检查项目所有权
    const isOwner = await ProjectModel.isOwner(projectId, userId);
    if (!isOwner) {
      throw new Error('Access denied');
    }

    // 检查场景是否属于项目
    const belongsToProject = await SceneModel.belongsToProject(sceneId, projectId);
    if (!belongsToProject) {
      throw new Error('Scene not found in project');
    }

    const scene = await SceneModel.setActive(sceneId, projectId);
    if (!scene) {
      throw new Error('Failed to set active scene');
    }

    return SceneModel.toListResponse(scene);
  }

  // 获取活动场景
  static async getActiveScene(
    projectId: number,
    userId: number
  ): Promise<SceneWithDataResponse | null> {
    // 检查项目所有权
    const isOwner = await ProjectModel.isOwner(projectId, userId);
    if (!isOwner) {
      throw new Error('Access denied');
    }

    const scene = await SceneModel.findActiveScene(projectId);
    if (!scene) {
      return null;
    }

    return SceneModel.toDetailResponse(scene);
  }
}

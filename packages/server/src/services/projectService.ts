import { ProjectModel } from '../models/Project.js';
import { SceneModel } from '../models/Scene.js';
import type { ProjectResponse, ProjectWithScenesResponse } from '@digittwinedit/shared';

export class ProjectService {
  // 获取用户的所有项目
  static async getUserProjects(userId: number): Promise<ProjectResponse[]> {
    const projects = await ProjectModel.findByOwnerId(userId);

    return Promise.all(
      projects.map(async (project) => {
        const sceneCount = await ProjectModel.getSceneCount(project.id);
        return {
          id: project.id,
          name: project.name,
          description: project.description || undefined,
          thumbnail: project.thumbnail || undefined,
          created_at: project.created_at.toISOString(),
          updated_at: project.updated_at.toISOString(),
          scene_count: sceneCount,
        };
      })
    );
  }

  // 获取项目详情(包含场景列表)
  static async getProjectWithScenes(
    projectId: number,
    userId: number
  ): Promise<ProjectWithScenesResponse> {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // 检查所有权
    if (project.owner_id !== userId) {
      throw new Error('Access denied');
    }

    // 获取场景列表
    const scenes = await SceneModel.findByProjectId(projectId);

    return {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      thumbnail: project.thumbnail || undefined,
      created_at: project.created_at.toISOString(),
      updated_at: project.updated_at.toISOString(),
      scenes: scenes.map((scene) => ({
        id: scene.id,
        name: scene.name,
        is_active: scene.is_active,
        updated_at: scene.updated_at.toISOString(),
      })),
    };
  }

  // 创建项目
  static async createProject(
    userId: number,
    name: string,
    description?: string,
    thumbnail?: string
  ): Promise<ProjectResponse> {
    const project = await ProjectModel.create(name, userId, description, thumbnail);

    return {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      thumbnail: project.thumbnail || undefined,
      created_at: project.created_at.toISOString(),
      updated_at: project.updated_at.toISOString(),
      scene_count: 0,
    };
  }

  // 更新项目
  static async updateProject(
    projectId: number,
    userId: number,
    updates: { name?: string; description?: string; thumbnail?: string }
  ): Promise<ProjectResponse> {
    // 检查所有权
    const isOwner = await ProjectModel.isOwner(projectId, userId);
    if (!isOwner) {
      throw new Error('Access denied');
    }

    const project = await ProjectModel.update(projectId, updates);
    if (!project) {
      throw new Error('Project not found');
    }

    const sceneCount = await ProjectModel.getSceneCount(projectId);

    return {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      thumbnail: project.thumbnail || undefined,
      created_at: project.created_at.toISOString(),
      updated_at: project.updated_at.toISOString(),
      scene_count: sceneCount,
    };
  }

  // 删除项目
  static async deleteProject(projectId: number, userId: number): Promise<void> {
    // 检查所有权
    const isOwner = await ProjectModel.isOwner(projectId, userId);
    if (!isOwner) {
      throw new Error('Access denied');
    }

    const deleted = await ProjectModel.delete(projectId);
    if (!deleted) {
      throw new Error('Failed to delete project');
    }
  }
}

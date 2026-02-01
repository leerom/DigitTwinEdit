import { apiClient } from '../config/api.js';
import type {
  SceneResponse,
  SceneWithDataResponse,
  CreateSceneRequest,
  UpdateSceneRequest,
} from '@digittwinedit/shared';

export const sceneApi = {
  // 获取项目的所有场景
  async getScenes(projectId: number): Promise<{ scenes: SceneResponse[] }> {
    return apiClient.get(`/projects/${projectId}/scenes`);
  },

  // 获取活动场景
  async getActiveScene(projectId: number): Promise<{ scene: SceneWithDataResponse }> {
    return apiClient.get(`/projects/${projectId}/scenes/active`);
  },

  // 创建场景
  async createScene(
    projectId: number,
    data: CreateSceneRequest
  ): Promise<{ scene: SceneWithDataResponse }> {
    return apiClient.post(`/projects/${projectId}/scenes`, data);
  },

  // 获取场景详情
  async getScene(projectId: number, sceneId: number): Promise<{ scene: SceneWithDataResponse }> {
    return apiClient.get(`/projects/${projectId}/scenes/${sceneId}`);
  },

  // 更新场景
  async updateScene(
    projectId: number,
    sceneId: number,
    data: UpdateSceneRequest
  ): Promise<{ scene: SceneWithDataResponse }> {
    return apiClient.put(`/projects/${projectId}/scenes/${sceneId}`, data);
  },

  // 删除场景
  async deleteScene(projectId: number, sceneId: number): Promise<void> {
    return apiClient.delete(`/projects/${projectId}/scenes/${sceneId}`);
  },

  // 激活场景
  async activateScene(projectId: number, sceneId: number): Promise<{ scene: SceneResponse }> {
    return apiClient.put(`/projects/${projectId}/scenes/${sceneId}/activate`);
  },
};

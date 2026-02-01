import { apiClient } from '../../config/api';
import type {
  ScenesResponse,
  SceneResponseWrapped,
  CreateSceneRequest,
  UpdateSceneRequest,
} from '@digittwinedit/shared';

export const sceneApi = {
  // 获取项目的所有场景
  getScenes: async (projectId: number): Promise<ScenesResponse> => {
    return apiClient.get(`/projects/${projectId}/scenes`);
  },

  // 获取活动场景
  getActiveScene: async (projectId: number): Promise<SceneResponseWrapped> => {
    return apiClient.get(`/projects/${projectId}/scenes/active`);
  },

  // 获取场景详情
  getScene: async (projectId: number, sceneId: number): Promise<SceneResponseWrapped> => {
    return apiClient.get(`/projects/${projectId}/scenes/${sceneId}`);
  },

  // 创建场景
  createScene: async (projectId: number, data: CreateSceneRequest): Promise<SceneResponseWrapped> => {
    return apiClient.post(`/projects/${projectId}/scenes`, data);
  },

  // 更新场景
  updateScene: async (projectId: number, sceneId: number, data: UpdateSceneRequest): Promise<SceneResponseWrapped> => {
    return apiClient.put(`/projects/${projectId}/scenes/${sceneId}`, data);
  },

  // 激活场景
  activateScene: async (projectId: number, sceneId: number): Promise<SceneResponseWrapped> => {
    return apiClient.put(`/projects/${projectId}/scenes/${sceneId}/activate`);
  },

  // 删除场景
  deleteScene: async (projectId: number, sceneId: number): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`/projects/${projectId}/scenes/${sceneId}`);
  },
};

import { apiClient } from '../../config/api';
import type {
  ProjectsResponse,
  ProjectResponseWrapped,
  ProjectWithScenesResponseWrapped,
  CreateProjectRequest,
  UpdateProjectRequest,
} from '@digittwinedit/shared';

export const projectApi = {
  // 获取项目列表
  getProjects: async (): Promise<ProjectsResponse> => {
    return apiClient.get('/projects');
  },

  // 获取项目详情
  getProject: async (projectId: number): Promise<ProjectWithScenesResponseWrapped> => {
    return apiClient.get(`/projects/${projectId}`);
  },

  // 创建项目
  createProject: async (data: CreateProjectRequest): Promise<ProjectResponseWrapped> => {
    return apiClient.post('/projects', data);
  },

  // 更新项目
  updateProject: async (projectId: number, data: UpdateProjectRequest): Promise<ProjectResponseWrapped> => {
    return apiClient.put(`/projects/${projectId}`, data);
  },

  // 删除项目
  deleteProject: async (projectId: number): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`/projects/${projectId}`);
  },
};

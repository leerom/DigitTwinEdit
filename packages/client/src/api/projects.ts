import { apiClient } from '../config/api.js';
import type {
  ProjectResponse,
  ProjectWithScenesResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
} from '@digittwinedit/shared';

export const projectApi = {
  // 获取所有项目
  async getProjects(): Promise<{ projects: ProjectResponse[] }> {
    return apiClient.get('/projects');
  },

  // 创建项目
  async createProject(data: CreateProjectRequest): Promise<{ project: ProjectResponse }> {
    return apiClient.post('/projects', data);
  },

  // 获取项目详情
  async getProject(id: number): Promise<{ project: ProjectWithScenesResponse }> {
    return apiClient.get(`/projects/${id}`);
  },

  // 更新项目
  async updateProject(
    id: number,
    data: UpdateProjectRequest
  ): Promise<{ project: ProjectResponse }> {
    return apiClient.put(`/projects/${id}`, data);
  },

  // 删除项目
  async deleteProject(id: number): Promise<void> {
    return apiClient.delete(`/projects/${id}`);
  },
};

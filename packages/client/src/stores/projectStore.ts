import { create } from 'zustand';
import { projectApi } from '../services/api/projectApi';
import { sceneApi } from '../services/api/sceneApi';
import type {
  ProjectResponse,
  ProjectWithScenesResponse,
  SceneResponse,
  Scene,
} from '@digittwinedit/shared';

interface ProjectState {
  // 项目相关
  projects: ProjectResponse[];
  currentProject: ProjectWithScenesResponse | null;

  // 场景相关
  scenes: Array<{
    id: number;
    name: string;
    is_active: boolean;
    updated_at: string;
  }>;
  currentScene: Scene | null;
  currentSceneId: number | null;

  // 状态
  isLoading: boolean;
  error: string | null;

  // 项目操作
  loadProjects: () => Promise<void>;
  loadProject: (projectId: number) => Promise<void>;
  createProject: (name: string, description?: string) => Promise<ProjectResponse>;
  updateProject: (projectId: number, updates: { name?: string; description?: string; thumbnail?: string }) => Promise<void>;
  deleteProject: (projectId: number) => Promise<void>;

  // 场景操作
  loadActiveScene: (projectId: number) => Promise<void>;
  createScene: (name: string) => Promise<void>;
  switchScene: (sceneId: number) => Promise<void>;
  updateScene: (sceneData: Scene) => Promise<void>;
  autoSaveScene: (sceneData: Scene) => Promise<void>;
  deleteScene: (sceneId: number) => Promise<void>;

  // 工具方法
  clearError: () => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  scenes: [],
  currentScene: null,
  currentSceneId: null,
  isLoading: false,
  error: null,

  // 加载项目列表
  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectApi.getProjects();
      set({ projects: response.projects, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load projects';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // 加载项目详情
  loadProject: async (projectId: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectApi.getProject(projectId);
      set({
        currentProject: response.project,
        scenes: response.project.scenes,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load project';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // 创建项目
  createProject: async (name: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectApi.createProject({ name, description });
      set((state) => ({
        projects: [...state.projects, response.project],
        isLoading: false,
      }));
      return response.project;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // 更新项目
  updateProject: async (projectId: number, updates) => {
    try {
      const response = await projectApi.updateProject(projectId, updates);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === projectId ? response.project : p)),
        currentProject: state.currentProject?.id === projectId
          ? { ...state.currentProject, ...response.project }
          : state.currentProject,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update project';
      set({ error: errorMessage });
      throw error;
    }
  },

  // 删除项目
  deleteProject: async (projectId: number) => {
    try {
      await projectApi.deleteProject(projectId);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete project';
      set({ error: errorMessage });
      throw error;
    }
  },

  // 加载活动场景
  loadActiveScene: async (projectId: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sceneApi.getActiveScene(projectId);
      set({
        currentScene: response.scene.data,
        currentSceneId: response.scene.id,
        isLoading: false,
      });

      // 同步到 sceneStore
      const { useSceneStore } = await import('./sceneStore');
      useSceneStore.getState().loadScene(response.scene.data);
    } catch (error) {
      // 如果没有活动场景，创建一个默认场景
      console.log('No active scene, creating default scene');
      await get().createScene('默认场景');
    }
  },

  // 创建场景
  createScene: async (name: string) => {
    const { currentProject } = get();
    if (!currentProject) {
      throw new Error('No active project');
    }

    set({ isLoading: true, error: null });
    try {
      const response = await sceneApi.createScene(currentProject.id, { name });

      // 更新场景列表
      const scenesResponse = await sceneApi.getScenes(currentProject.id);

      set({
        scenes: scenesResponse.scenes,
        currentScene: response.scene.data,
        currentSceneId: response.scene.id,
        isLoading: false,
      });

      // 同步到 sceneStore
      const { useSceneStore } = await import('./sceneStore');
      useSceneStore.getState().loadScene(response.scene.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create scene';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // 切换场景
  switchScene: async (sceneId: number) => {
    const { currentProject } = get();
    if (!currentProject) {
      throw new Error('No active project');
    }

    set({ isLoading: true, error: null });
    try {
      // 激活场景
      await sceneApi.activateScene(currentProject.id, sceneId);

      // 加载场景数据
      const response = await sceneApi.getScene(currentProject.id, sceneId);

      set({
        currentScene: response.scene.data,
        currentSceneId: sceneId,
        isLoading: false,
      });

      // 同步到 sceneStore
      const { useSceneStore } = await import('./sceneStore');
      useSceneStore.getState().loadScene(response.scene.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch scene';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // 更新场景
  updateScene: async (sceneData: Scene) => {
    const { currentProject, currentSceneId } = get();
    if (!currentProject || !currentSceneId) {
      throw new Error('No active project or scene');
    }

    try {
      await sceneApi.updateScene(currentProject.id, currentSceneId, { data: sceneData });
      set({ currentScene: sceneData });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update scene';
      set({ error: errorMessage });
      throw error;
    }
  },

  // 自动保存场景(带防抖)
  autoSaveScene: async (sceneData: Scene) => {
    const { currentProject, currentSceneId } = get();
    if (!currentProject || !currentSceneId) {
      return; // 静默失败
    }

    try {
      await sceneApi.updateScene(currentProject.id, currentSceneId, { data: sceneData });
      console.log('✅ Scene auto-saved');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      // 自动保存失败不抛出错误，只记录日志
    }
  },

  // 删除场景
  deleteScene: async (sceneId: number) => {
    const { currentProject } = get();
    if (!currentProject) {
      throw new Error('No active project');
    }

    try {
      await sceneApi.deleteScene(currentProject.id, sceneId);

      // 重新加载场景列表
      const response = await sceneApi.getScenes(currentProject.id);
      set({ scenes: response.scenes });

      // 如果删除的是当前场景，切换到第一个场景
      const state = get();
      if (state.currentSceneId === sceneId && response.scenes.length > 0) {
        await get().switchScene(response.scenes[0].id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete scene';
      set({ error: errorMessage });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    projects: [],
    currentProject: null,
    scenes: [],
    currentScene: null,
    currentSceneId: null,
    error: null,
  }),
}));

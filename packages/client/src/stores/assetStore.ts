import { create } from 'zustand';
import type { Asset, AssetStats, UploadProgress } from '@digittwinedit/shared';
import { assetsApi } from '../api/assets.js';

interface AssetState {
  // 状态
  assets: Asset[];
  isLoading: boolean;
  uploadProgress: Record<string, UploadProgress>;
  error: string | null;
  stats: AssetStats | null;

  // 操作
  loadAssets: (projectId: number, type?: string) => Promise<void>;
  uploadAsset: (projectId: number, file: File, type: 'model' | 'texture') => Promise<Asset>;
  deleteAsset: (assetId: number) => Promise<void>;
  updateAsset: (assetId: number, updates: { name?: string; metadata?: Record<string, unknown> }) => Promise<void>;
  getAssetUrl: (assetId: number) => string;
  loadStats: (projectId: number) => Promise<void>;
  clearAssets: () => void;
  clearError: () => void;
}

export const useAssetStore = create<AssetState>((set, get) => ({
  // 初始状态
  assets: [],
  isLoading: false,
  uploadProgress: {},
  error: null,
  stats: null,

  // 加载资产列表
  loadAssets: async (projectId: number, type?: string) => {
    set({ isLoading: true, error: null });
    try {
      const assets = await assetsApi.getProjectAssets(projectId, type);
      set({ assets, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load assets',
        isLoading: false
      });
      throw error;
    }
  },

  // 上传资产
  uploadAsset: async (projectId: number, file: File, type: 'model' | 'texture') => {
    set({ error: null });
    try {
      const asset = await assetsApi.uploadAsset(
        projectId,
        file,
        type,
        (progressEvent) => {
          if (progressEvent.total) {
            const percent = (progressEvent.loaded / progressEvent.total) * 100;
            set((state) => ({
              uploadProgress: {
                ...state.uploadProgress,
                [file.name]: {
                  percent,
                  loaded: progressEvent.loaded,
                  total: progressEvent.total,
                },
              },
            }));
          }
        }
      );

      // 移除上传进度
      set((state) => {
        const newProgress = { ...state.uploadProgress };
        delete newProgress[file.name];
        return { uploadProgress: newProgress };
      });

      // 刷新资产列表
      await get().loadAssets(projectId);

      return asset;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to upload asset' });

      // 移除上传进度
      set((state) => {
        const newProgress = { ...state.uploadProgress };
        delete newProgress[file.name];
        return { uploadProgress: newProgress };
      });

      throw error;
    }
  },

  // 删除资产
  deleteAsset: async (assetId: number) => {
    set({ error: null });
    try {
      await assetsApi.deleteAsset(assetId);
      set((state) => ({
        assets: state.assets.filter((a) => a.id !== assetId),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete asset' });
      throw error;
    }
  },

  // 更新资产
  updateAsset: async (assetId: number, updates: { name?: string; metadata?: Record<string, unknown> }) => {
    set({ error: null });
    try {
      const updatedAsset = await assetsApi.updateAsset(assetId, updates);
      set((state) => ({
        assets: state.assets.map((a) => (a.id === assetId ? updatedAsset : a)),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update asset' });
      throw error;
    }
  },

  // 获取资产URL
  getAssetUrl: (assetId: number) => {
    return assetsApi.getAssetDownloadUrl(assetId);
  },

  // 加载统计信息
  loadStats: async (projectId: number) => {
    try {
      const stats = await assetsApi.getProjectStats(projectId);
      set({ stats });
    } catch (error) {
      console.error('Failed to load asset stats:', error);
    }
  },

  // 清空资产列表
  clearAssets: () => {
    set({ assets: [], uploadProgress: {}, error: null, stats: null });
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));

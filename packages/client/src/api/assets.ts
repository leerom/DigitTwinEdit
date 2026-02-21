import { apiClient, API_BASE_URL } from '../config/api.js';
import type { Asset, AssetStats, MaterialAsset } from '@digittwinedit/shared';
import axios from 'axios';

export const assetsApi = {
  // 上传资产
  async uploadAsset(
    projectId: number,
    file: File,
    type: 'model' | 'texture' | 'material',
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    // 使用独立的axios实例处理文件上传，避免JSON拦截器影响
    const response = await axios.post(
      `${API_BASE_URL}/projects/${projectId}/assets/upload`,
      formData,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
      }
    );

    return response.data.asset;
  },

  // 获取项目资产列表
  async getProjectAssets(projectId: number, type?: string): Promise<Asset[]> {
    const params = type ? { type } : {};
    const response: any = await apiClient.get(`/projects/${projectId}/assets`, { params });
    return response.assets;
  },

  // 获取项目资产统计
  async getProjectStats(projectId: number): Promise<AssetStats> {
    const response: any = await apiClient.get(`/projects/${projectId}/assets/stats`);
    return response.stats;
  },

  // 下载资产
  getAssetDownloadUrl(assetId: number): string {
    return `${API_BASE_URL}/assets/${assetId}/download`;
  },

  // 删除资产
  async deleteAsset(assetId: number): Promise<void> {
    await apiClient.delete(`/assets/${assetId}`);
  },

  // 替换资产文件（用于重新导入，保持 asset.id 不变）
  async replaceAssetFile(
    assetId: number,
    file: File,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.put(
      `${API_BASE_URL}/assets/${assetId}/file`,
      formData,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
      }
    );

    return response.data.asset;
  },

  // 更新资产
  async updateAsset(
    assetId: number,
    updates: { name?: string; metadata?: Record<string, unknown> }
  ): Promise<Asset> {
    const response: any = await apiClient.put(`/assets/${assetId}`, updates);
    return response.asset;
  },

  // 生成缩略图
  async generateThumbnail(assetId: number): Promise<string> {
    const response: any = await apiClient.post(`/assets/${assetId}/thumbnail`);
    return response.thumbnailPath;
  },
};

export const materialsApi = {
  // 创建材质
  async createMaterial(projectId: number, materialData: MaterialAsset): Promise<Asset> {
    const response: any = await apiClient.post(`/projects/${projectId}/materials`, materialData);
    return response.asset;
  },

  // 获取材质
  async getMaterial(materialId: number): Promise<MaterialAsset> {
    const response: any = await apiClient.get(`/materials/${materialId}`);
    return response.material;
  },

  // 更新材质
  async updateMaterial(materialId: number, updates: Partial<MaterialAsset>): Promise<void> {
    await apiClient.put(`/materials/${materialId}`, updates);
  },

  // 删除材质
  async deleteMaterial(materialId: number): Promise<void> {
    await apiClient.delete(`/materials/${materialId}`);
  },

  // 获取材质引用的纹理
  async getMaterialTextures(materialId: number): Promise<Asset[]> {
    const response: any = await apiClient.get(`/materials/${materialId}/textures`);
    return response.textures;
  },
};

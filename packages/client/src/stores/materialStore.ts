import { create } from 'zustand';
import type { Asset } from '@digittwinedit/shared';
import type { MaterialSpec, MaterialType } from '@/types';
import { materialsApi, assetsApi } from '@/api/assets';
import { useSceneStore } from './sceneStore';

interface MaterialState {
  materials: Asset[];
  isLoading: boolean;
  saveError: string | null;
  selectedMaterialId: number | null;
  previewSpec: MaterialSpec | null;

  loadMaterials: (projectId: number) => Promise<void>;
  createMaterial: (projectId: number, name: string, type: MaterialType) => Promise<Asset>;
  duplicateMaterial: (materialId: number, projectId: number) => Promise<Asset>;
  renameMaterial: (materialId: number, name: string) => Promise<void>;
  deleteMaterial: (materialId: number) => Promise<void>;
  updateMaterialSpec: (materialId: number, spec: MaterialSpec) => Promise<void>;
  selectMaterial: (id: number | null) => void;
  clearSaveError: () => void;
  setPreviewSpec: (spec: MaterialSpec | null) => void;
}

export const useMaterialStore = create<MaterialState>((set, get) => ({
  materials: [],
  isLoading: false,
  saveError: null,
  selectedMaterialId: null,
  previewSpec: null,

  loadMaterials: async (projectId) => {
    set({ isLoading: true });
    try {
      const materials = await assetsApi.getProjectAssets(projectId, 'material');
      set({ materials, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createMaterial: async (projectId, name, type) => {
    const asset = await materialsApi.createMaterial(projectId, {
      id: '',
      name,
      type,
      properties: {},
    });
    await get().loadMaterials(projectId);
    set({ selectedMaterialId: asset.id });
    return asset;
  },

  duplicateMaterial: async (materialId, projectId) => {
    const source = await materialsApi.getMaterial(materialId);
    const asset = await materialsApi.createMaterial(projectId, {
      ...source,
      id: '',
      name: `${source.name} 副本`,
    });
    await get().loadMaterials(projectId);
    return asset;
  },

  renameMaterial: async (materialId, name) => {
    await materialsApi.updateMaterial(materialId, { name } as any);
    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === materialId ? { ...m, name } : m
      ),
    }));
  },

  deleteMaterial: async (materialId) => {
    await materialsApi.deleteMaterial(materialId);
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== materialId),
      selectedMaterialId:
        state.selectedMaterialId === materialId ? null : state.selectedMaterialId,
    }));
    useSceneStore.getState().clearMaterialAssetRefs(materialId);
  },

  updateMaterialSpec: async (materialId, spec) => {
    try {
      await materialsApi.updateMaterial(materialId, {
        type: spec.type,
        properties: spec.props,
      } as any);
      set({ saveError: null });
    } catch {
      set({ saveError: '保存失败，请重试' });
    }
  },

  selectMaterial: (id) => set({ selectedMaterialId: id }),

  clearSaveError: () => set({ saveError: null }),

  setPreviewSpec: (spec) => set({ previewSpec: spec }),
}));

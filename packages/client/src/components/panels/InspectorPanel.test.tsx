import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InspectorPanel } from './InspectorPanel';

const editorStoreState = {
  activeId: null,
  selectedIds: [],
  activeSubNodePath: null,
};

const sceneStoreState = {
  scene: {
    objects: {},
    settings: { environment: { mode: 'default', assetId: null }, gridVisible: true, backgroundColor: '#000' },
  },
  updateObject: vi.fn(),
};

const assetStoreState = {
  selectedAssetId: null,
  selectedNodePath: null,
  assets: [],
};

const materialStoreState = {
  selectedMaterialId: null,
  materials: [],
  setPreviewSpec: vi.fn(),
};

vi.mock('../../stores/editorStore', () => ({
  useEditorStore: (selector: any) => selector(editorStoreState),
}));

vi.mock('../../stores/sceneStore', () => ({
  useSceneStore: (selector: any) => selector(sceneStoreState),
}));

vi.mock('../../stores/assetStore', () => ({
  useAssetStore: (selector: any) => selector(assetStoreState),
}));

vi.mock('../../stores/materialStore', () => ({
  useMaterialStore: (selector: any) => selector(materialStoreState),
}));

vi.mock('../inspector/TransformProp', () => ({ TransformProp: () => <div>TransformProp</div> }));
vi.mock('../inspector/MaterialProp', () => ({ MaterialProp: () => <div>MaterialProp</div> }));
vi.mock('../inspector/TwinDataProp', () => ({ TwinDataProp: () => <div>TwinDataProp</div> }));
vi.mock('../inspector/specific/CameraProp', () => ({ CameraProp: () => <div>CameraProp</div> }));
vi.mock('../inspector/specific/LightProp', () => ({ LightProp: () => <div>LightProp</div> }));
vi.mock('../inspector/specific/MeshProp', () => ({ MeshProp: () => <div>MeshProp</div> }));
vi.mock('../inspector/ModelImportProp', () => ({ ModelImportProp: () => null }));
vi.mock('../inspector/TextureImportProp', () => ({ TextureImportProp: () => null }));
vi.mock('../inspector/ModelPreview', () => ({ ModelPreview: () => null }));
vi.mock('../inspector/SubNodeInspector', () => ({ SubNodeInspector: () => null }));
vi.mock('../inspector/MaterialAssetProp', () => ({ MaterialAssetProp: () => null }));
vi.mock('../inspector/MaterialPreview', () => ({ MaterialPreview: () => null }));
vi.mock('../../api/assets', () => ({
  assetsApi: {
    getAssetDownloadUrl: (id: number) => `/api/assets/${id}/download`,
  },
}));

describe('InspectorPanel IBL integration', () => {
  beforeEach(() => {
    editorStoreState.activeId = null;
    editorStoreState.selectedIds = [];
    editorStoreState.activeSubNodePath = null;
    sceneStoreState.scene.objects = {};
    assetStoreState.selectedAssetId = null;
    assetStoreState.selectedNodePath = null;
    assetStoreState.assets = [];
    materialStoreState.selectedMaterialId = null;
    materialStoreState.materials = [];
  });

  it('shows scene environment controls when no object or asset is selected', () => {
    render(<InspectorPanel />);

    expect(screen.getByText('场景环境 (Environment)')).toBeInTheDocument();
  });

  it('shows IBL import settings when the selected asset is an IBL runtime texture', () => {
    assetStoreState.selectedAssetId = 10;
    assetStoreState.assets = [
      {
        id: 10,
        project_id: 1,
        name: 'studio.ktx2',
        type: 'texture',
        file_path: '/uploads/studio.ktx2',
        file_size: 1024,
        mime_type: 'image/ktx2',
        metadata: {
          usage: 'ibl',
          format: 'ktx2',
          sourceEnvironmentAssetId: 11,
          previewAssetId: 12,
          originalFormat: 'hdr',
          originalDimensions: { width: 2048, height: 1024 },
          runtimeDimensions: { width: 1024, height: 512 },
          convertSettings: {
            maxWidth: 1024,
            compressionMode: 'UASTC',
            generateMipmaps: true,
          },
        },
        created_at: '',
        updated_at: '',
      },
    ] as any;

    render(<InspectorPanel />);

    expect(screen.getByText('环境导入设置')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新导入' })).toBeInTheDocument();
  });
});
